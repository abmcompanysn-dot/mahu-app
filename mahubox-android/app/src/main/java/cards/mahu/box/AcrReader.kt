package cards.mahu.box

import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbEndpoint
import android.hardware.usb.UsbInterface
import android.hardware.usb.UsbManager
import android.util.Log

/**
 * Lecteur NFC USB ACS (ACR122U / ACR1252U) pilote directement en CCID, sans
 * pilote ni bibliotheque : presence de la carte, puis lecture de l'adresse
 * NDEF ecrite dedans (https://call.mahu.cards/c/CODE).
 */
class AcrReader(private val manager: UsbManager, val device: UsbDevice) {

    companion object {
        const val TAG = "MahuBox"
        const val VENDOR_ACS = 0x072F
        fun isReader(d: UsbDevice) = d.vendorId == VENDOR_ACS
    }

    enum class Presence { PRESENT, ABSENT, ERROR }

    private var conn: UsbDeviceConnection? = null
    private var iface: UsbInterface? = null
    private var epOut: UsbEndpoint? = null
    private var epIn: UsbEndpoint? = null
    private var seq = 0

    fun open(): Boolean {
        val c = manager.openDevice(device) ?: return false
        for (i in 0 until device.interfaceCount) {
            val itf = device.getInterface(i)
            var o: UsbEndpoint? = null
            var n: UsbEndpoint? = null
            for (e in 0 until itf.endpointCount) {
                val ep = itf.getEndpoint(e)
                if (ep.type != UsbConstants.USB_ENDPOINT_XFER_BULK) continue
                if (ep.direction == UsbConstants.USB_DIR_OUT) o = ep else n = ep
            }
            if (o != null && n != null && c.claimInterface(itf, true)) {
                conn = c; iface = itf; epOut = o; epIn = n
                // Pas de bip a chaque carte posee (pseudo-APDU ACS "buzzer off").
                runCatching { powerOn(); transmit(byteArrayOf(0xFF.toByte(), 0x00, 0x52, 0x00, 0x00)) }
                return true
            }
        }
        c.close()
        return false
    }

    fun close() {
        runCatching { iface?.let { conn?.releaseInterface(it) } }
        runCatching { conn?.close() }
        conn = null
    }

    /** Envoie un message CCID (en-tete 10 octets) et renvoie la reponse brute. */
    private fun ccid(type: Int, data: ByteArray = ByteArray(0), p1: Int = 0): ByteArray? {
        val c = conn ?: return null
        val out = epOut ?: return null
        val inp = epIn ?: return null
        seq = (seq + 1) and 0xFF
        val msg = ByteArray(10 + data.size)
        msg[0] = type.toByte()
        val len = data.size
        msg[1] = len.toByte(); msg[2] = (len shr 8).toByte(); msg[3] = (len shr 16).toByte(); msg[4] = (len shr 24).toByte()
        msg[5] = 0; msg[6] = seq.toByte(); msg[7] = p1.toByte()
        System.arraycopy(data, 0, msg, 10, len)
        if (c.bulkTransfer(out, msg, msg.size, 1000) < 0) return null
        val buf = ByteArray(512)
        // Le lecteur peut d'abord repondre "attente" (bStatus bit 7) : on relit.
        repeat(5) {
            val n = c.bulkTransfer(inp, buf, buf.size, 2000)
            if (n < 10) return null
            val status = buf[7].toInt() and 0xFF
            if (status and 0x80 == 0) return buf.copyOf(n)
        }
        return null
    }

    fun presence(): Presence {
        val r = ccid(0x65) ?: return Presence.ERROR // PC_to_RDR_GetSlotStatus
        return when (r[7].toInt() and 0x03) {
            0, 1 -> Presence.PRESENT
            else -> Presence.ABSENT
        }
    }

    private fun powerOn(): Boolean = ccid(0x62) != null // PC_to_RDR_IccPowerOn

    /** APDU via PC_to_RDR_XfrBlock ; renvoie les donnees si le statut est 90 00. */
    private fun transmit(apdu: ByteArray): ByteArray? {
        val r = ccid(0x6F, apdu) ?: return null
        val len = (r[1].toInt() and 0xFF) or ((r[2].toInt() and 0xFF) shl 8)
        if (len < 2 || r.size < 10 + len) return null
        val body = r.copyOfRange(10, 10 + len)
        val sw1 = body[len - 2].toInt() and 0xFF
        val sw2 = body[len - 1].toInt() and 0xFF
        return if (sw1 == 0x90 && sw2 == 0x00) body.copyOf(len - 2) else null
    }

    /**
     * Lit l'adresse ecrite dans la carte (NTAG / MIFARE Ultralight : pages
     * de 4 octets, donnees a partir de la page 4) et renvoie l'URL, ou null.
     */
    fun readUrl(): String? {
        if (!powerOn()) return null
        val mem = java.io.ByteArrayOutputStream()
        var page = 4
        while (page < 64) {
            val chunk = transmit(byteArrayOf(0xFF.toByte(), 0xB0.toByte(), 0x00, page.toByte(), 0x10)) ?: break
            mem.write(chunk)
            val parsed = Ndef.parseUri(mem.toByteArray())
            if (parsed != null) return parsed
            if (chunk.any { (it.toInt() and 0xFF) == 0xFE }) break
            page += 4
        }
        return Ndef.parseUri(mem.toByteArray()).also { if (it == null) Log.w(TAG, "aucune adresse NDEF lue") }
    }
}

/** Decodage minimal d'un enregistrement NDEF de type URI ("U"). */
object Ndef {
    private val PREFIXES = arrayOf(
        "", "http://www.", "https://www.", "http://", "https://", "tel:", "mailto:",
        "ftp://anonymous:anonymous@", "ftp://ftp.", "ftps://", "sftp://", "smb://", "nfs://", "ftp://",
        "dav://", "news:", "telnet://", "imap:", "rtsp://", "urn:", "pop:", "sip:", "sips:", "tftp:",
        "btspp://", "btl2cap://", "btgoep://", "tcpobex://", "irdaobex://", "file://", "urn:epc:id:",
        "urn:epc:tag:", "urn:epc:pat:", "urn:epc:raw:", "urn:epc:", "urn:nfc:",
    )

    fun parseUri(data: ByteArray): String? {
        var i = 0
        while (i < data.size) {
            val t = data[i].toInt() and 0xFF
            if (t == 0x00) { i++; continue }        // TLV nul
            if (t == 0xFE || i + 1 >= data.size) return null
            var len = data[i + 1].toInt() and 0xFF
            var start = i + 2
            if (len == 0xFF) {
                if (i + 3 >= data.size) return null
                len = ((data[i + 2].toInt() and 0xFF) shl 8) or (data[i + 3].toInt() and 0xFF)
                start = i + 4
            }
            if (t == 0x03) {
                if (start + len > data.size) return null // message pas encore lu en entier
                return record(data.copyOfRange(start, start + len))
            }
            i = start + len
        }
        return null
    }

    private fun record(msg: ByteArray): String? {
        if (msg.size < 3) return null
        val header = msg[0].toInt() and 0xFF
        val shortRecord = header and 0x10 != 0
        val hasId = header and 0x08 != 0
        val typeLen = msg[1].toInt() and 0xFF
        var p = 2
        val payloadLen: Int
        if (shortRecord) {
            payloadLen = msg[p].toInt() and 0xFF; p += 1
        } else {
            if (p + 4 > msg.size) return null
            payloadLen = ((msg[p].toInt() and 0xFF) shl 24) or ((msg[p + 1].toInt() and 0xFF) shl 16) or
                ((msg[p + 2].toInt() and 0xFF) shl 8) or (msg[p + 3].toInt() and 0xFF)
            p += 4
        }
        val idLen = if (hasId) (msg[p++].toInt() and 0xFF) else 0
        if (p + typeLen + idLen + payloadLen > msg.size) return null
        val type = String(msg, p, typeLen, Charsets.US_ASCII)
        p += typeLen + idLen
        if (type != "U" || payloadLen < 1) return null
        val prefix = PREFIXES.getOrElse(msg[p].toInt() and 0xFF) { "" }
        return prefix + String(msg, p + 1, payloadLen - 1, Charsets.UTF_8)
    }
}
