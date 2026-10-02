package cards.mahu.myfocus

import android.content.Context
import android.os.Build
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import kotlin.concurrent.thread

/**
 * Serveur Mahu (backend Go, handlers/myfocus.go) : enregistrement du telephone,
 * verification de l'email d'alerte, alertes d'intrusion signees (HMAC-SHA256).
 */
object Api {

    class ApiException(message: String) : Exception(message)

    private fun post(path: String, body: String, signature: String? = null): JSONObject {
        val conn = URL(BuildConfig.API_BASE + path).openConnection() as HttpURLConnection
        try {
            conn.requestMethod = "POST"
            conn.connectTimeout = 15_000
            conn.readTimeout = 20_000
            conn.doOutput = true
            conn.setRequestProperty("Content-Type", "application/json")
            if (signature != null) conn.setRequestProperty("X-MyFocus-Signature", signature)
            conn.outputStream.use { it.write(body.toByteArray()) }
            val code = conn.responseCode
            val text = (if (code in 200..299) conn.inputStream else conn.errorStream)
                ?.bufferedReader()?.use { it.readText() } ?: ""
            val json = runCatching { JSONObject(text) }.getOrElse { JSONObject() }
            if (code !in 200..299) {
                throw ApiException(json.optString("error").ifBlank { "Erreur serveur ($code)" })
            }
            return json
        } finally {
            conn.disconnect()
        }
    }

    /** Bloquant : a appeler hors du thread principal. Envoie un code par email. */
    fun register(p: Prefs, email: String) {
        val body = JSONObject()
            .put("email", email)
            .put("deviceName", "${Build.MANUFACTURER} ${Build.MODEL}".trim())
            .toString()
        val res = post("/register", body)
        p.alertEmail = email
        p.deviceId = res.getString("deviceId")
        p.deviceSecret = res.getString("secret")
        p.emailVerified = false
    }

    /** Bloquant : valide le code recu par email. */
    fun verify(p: Prefs, code: String) {
        val id = p.deviceId ?: throw ApiException("Demandez d'abord un code.")
        post("/verify", JSONObject().put("deviceId", id).put("code", code).toString())
        p.emailVerified = true
    }

    /**
     * Envoie une alerte en arriere-plan. Sans reseau, elle est gardee et
     * renvoyee plus tard (flushPending) - avec son heure d'origine.
     */
    fun alert(context: Context, type: String, failures: Int = 0) {
        val p = Prefs(context)
        val id = p.deviceId ?: return
        val body = JSONObject()
            .put("deviceId", id)
            .put("type", type)
            .put("failures", failures)
            .put("sentAt", System.currentTimeMillis())
            .toString()
        thread(name = "myfocus-alert") { sendSigned(p, body) }
    }

    /** Renvoie une alerte restee en attente (appele a chaque ouverture de l'appli / blocage). */
    fun flushPending(context: Context) {
        val p = Prefs(context)
        val pending = p.pendingAlert ?: return
        // Le serveur refuse une alerte de plus de 10 min : on la re-date en gardant le type.
        val json = runCatching { JSONObject(pending) }.getOrNull() ?: run { p.pendingAlert = null; return }
        json.put("sentAt", System.currentTimeMillis())
        thread(name = "myfocus-alert-retry") { sendSigned(p, json.toString()) }
    }

    private fun sendSigned(p: Prefs, body: String) {
        val secret = p.deviceSecret ?: return
        try {
            post("/alert", body, sign(secret, body))
            p.pendingAlert = null
        } catch (e: ApiException) {
            // Refus du serveur (signature, appareil supprime) : inutile de reessayer.
            p.pendingAlert = null
        } catch (e: Exception) {
            p.pendingAlert = body // pas de reseau : on reessaiera
        }
    }

    private fun sign(secret: String, body: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(secret.toByteArray(), "HmacSHA256"))
        return mac.doFinal(body.toByteArray()).joinToString("") { "%02x".format(it) }
    }
}
