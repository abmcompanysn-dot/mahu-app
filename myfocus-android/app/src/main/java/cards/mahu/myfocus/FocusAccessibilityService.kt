package cards.mahu.myfocus

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.os.SystemClock
import android.util.Log
import android.view.accessibility.AccessibilityEvent

/**
 * Detecte l'ouverture d'une appli bloquee (seulement son nom de paquet) et
 * affiche l'ecran de concentration par-dessus tant que la carte n'a pas
 * deverrouille la journee. Ne lit jamais le contenu de l'ecran.
 */
class FocusAccessibilityService : AccessibilityService() {

    companion object {
        const val TAG = "MyFocus"
    }

    private var lastLaunch = 0L

    override fun onServiceConnected() {
        super.onServiceConnected()
        val p = Prefs(this)
        p.serviceOffAlerted = false
        p.diagServiceConnectedAt = System.currentTimeMillis()
        Log.i(TAG, "service connecte")
        Api.flushPending(this)
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        val pkg = event.packageName?.toString() ?: return
        if (pkg == packageName) return

        val p = Prefs(this)
        // Diagnostic visible dans l'appli : la protection recoit-elle bien les ouvertures ?
        p.diagLastPackage = pkg
        p.diagLastEventAt = System.currentTimeMillis()
        val locked = Focus.isLocked(p)
        val blocked = pkg in p.blockedPackages
        Log.i(TAG, "ouverture $pkg verrouille=$locked bloquee=$blocked")
        if (!locked || !blocked) return

        // Une appli emet plusieurs evenements a l'ouverture : un seul ecran.
        val now = SystemClock.elapsedRealtime()
        if (now - lastLaunch < 700) return
        lastLaunch = now

        Focus.recordBlocked(p)
        performGlobalAction(GLOBAL_ACTION_HOME)
        startActivity(
            Intent(this, LockActivity::class.java)
                .putExtra(LockActivity.EXTRA_BLOCKED_PACKAGE, pkg)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NO_ANIMATION)
        )
        Api.flushPending(this)
    }

    override fun onInterrupt() = Unit

    /** Le service est coupe (dans les reglages Android) pendant la concentration : alerte. */
    override fun onUnbind(intent: Intent?): Boolean {
        val p = Prefs(this)
        if (Focus.isLocked(p) && !p.serviceOffAlerted) {
            p.serviceOffAlerted = true
            Api.alert(this, "service_off")
        }
        return super.onUnbind(intent)
    }
}
