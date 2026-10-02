package cards.mahu.myfocus

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent

/**
 * Administrateur de l'appareil : Android refuse de desinstaller MyFocus tant
 * que ce role est actif. Le retirer pendant la concentration declenche une alerte.
 */
class AdminReceiver : DeviceAdminReceiver() {

    override fun onDisableRequested(context: Context, intent: Intent): CharSequence =
        "Retirer cette protection permettra de desinstaller MyFocus. Une alerte sera envoyee."

    override fun onDisabled(context: Context, intent: Intent) {
        if (Focus.isLocked(Prefs(context))) Api.alert(context, "admin_disabled")
    }
}
