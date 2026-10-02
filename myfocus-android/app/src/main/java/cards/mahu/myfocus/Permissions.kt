package cards.mahu.myfocus

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.nfc.NfcAdapter
import android.os.PowerManager
import android.provider.Settings

/** Etat et ouverture des autorisations dont MyFocus a besoin. */
object Permissions {

    fun hasNfc(ctx: Context) = NfcAdapter.getDefaultAdapter(ctx) != null
    fun nfcEnabled(ctx: Context) = NfcAdapter.getDefaultAdapter(ctx)?.isEnabled == true

    fun accessibilityEnabled(ctx: Context): Boolean {
        val expected = ComponentName(ctx, FocusAccessibilityService::class.java).flattenToString()
        val enabled = Settings.Secure.getString(ctx.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: return false
        return enabled.split(':').any { it.equals(expected, ignoreCase = true) }
    }

    fun batteryUnrestricted(ctx: Context): Boolean =
        (ctx.getSystemService(Context.POWER_SERVICE) as PowerManager).isIgnoringBatteryOptimizations(ctx.packageName)

    fun nfcSettingsIntent() = Intent(Settings.ACTION_NFC_SETTINGS)

    fun accessibilitySettingsIntent() = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)

    fun batteryIntent(ctx: Context) =
        Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + ctx.packageName))
}
