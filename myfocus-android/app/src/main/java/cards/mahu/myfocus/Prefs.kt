package cards.mahu.myfocus

import android.content.Context
import android.content.SharedPreferences

/** Reglages et etat de MyFocus, stockes uniquement sur le telephone. */
class Prefs(context: Context) {
    private val sp: SharedPreferences =
        context.applicationContext.getSharedPreferences("myfocus", Context.MODE_PRIVATE)

    /** Empreinte (SHA-256) de l'identifiant de la carte - jamais l'identifiant en clair. */
    var cardHash: String?
        get() = sp.getString("card_hash", null)
        set(v) = sp.edit().putString("card_hash", v).apply()

    var blockedPackages: Set<String>
        get() = sp.getStringSet("blocked", null)?.toSet() ?: emptySet()
        set(v) = sp.edit().putStringSet("blocked", v).apply()

    /** Heure (0-23) a laquelle les applis se reverrouillent apres un deverrouillage. */
    var relockHour: Int
        get() = sp.getInt("relock_hour", 6)
        set(v) = sp.edit().putInt("relock_hour", v).apply()

    /** Heure (0-23) a partir de laquelle un deverrouillage compte comme "journee reussie". */
    var dayGoalHour: Int
        get() = sp.getInt("day_goal_hour", 17)
        set(v) = sp.edit().putInt("day_goal_hour", v).apply()

    /** Fin du deverrouillage en cours (epoch ms) ; 0 = verrouille. */
    var unlockedUntil: Long
        get() = sp.getLong("unlocked_until", 0L)
        set(v) = sp.edit().putLong("unlocked_until", v).apply()

    /** Badges incorrects consecutifs sur l'ecran de verrouillage. */
    var failedScans: Int
        get() = sp.getInt("failed_scans", 0)
        set(v) = sp.edit().putInt("failed_scans", v).apply()

    var consentAccepted: Boolean
        get() = sp.getBoolean("consent", false)
        set(v) = sp.edit().putBoolean("consent", v).apply()

    var onboarded: Boolean
        get() = sp.getBoolean("onboarded", false)
        set(v) = sp.edit().putBoolean("onboarded", v).apply()

    var alertEmail: String?
        get() = sp.getString("alert_email", null)
        set(v) = sp.edit().putString("alert_email", v).apply()

    var deviceId: String?
        get() = sp.getString("device_id", null)
        set(v) = sp.edit().putString("device_id", v).apply()

    var deviceSecret: String?
        get() = sp.getString("device_secret", null)
        set(v) = sp.edit().putString("device_secret", v).apply()

    var emailVerified: Boolean
        get() = sp.getBoolean("email_verified", false)
        set(v) = sp.edit().putBoolean("email_verified", v).apply()

    /** Alerte en attente d'envoi (pas de reseau au moment de l'incident). */
    var pendingAlert: String?
        get() = sp.getString("pending_alert", null)
        set(v) = sp.edit().putString("pending_alert", v).apply()

    /** Evite de renvoyer l'alerte "protection coupee" en boucle. */
    var serviceOffAlerted: Boolean
        get() = sp.getBoolean("service_off_alerted", false)
        set(v) = sp.edit().putBoolean("service_off_alerted", v).apply()

    fun getInt(key: String): Int = sp.getInt(key, -1)
    fun putInt(key: String, value: Int) = sp.edit().putInt(key, value).apply()
    fun increment(key: String) = sp.edit().putInt(key, (sp.getInt(key, 0)) + 1).apply()
    fun count(key: String): Int = sp.getInt(key, 0)

    companion object {
        /** Applis bloquees par defaut (si installees). */
        val DEFAULT_BLOCKED = setOf(
            "com.instagram.android",
            "com.zhiliaoapp.musically",      // TikTok
            "com.ss.android.ugc.trill",      // TikTok (certains pays)
            "com.facebook.katana",
            "com.facebook.lite",
            "com.snapchat.android",
            "com.twitter.android",           // X
            "com.google.android.youtube",
        )
    }
}
