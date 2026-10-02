package cards.mahu.myfocus

import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/** Regles de concentration : verrouillage, deverrouillage par la carte, suivi. */
object Focus {

    /** Verrouille = configure et en dehors d'un deverrouillage par la carte. */
    fun isLocked(p: Prefs, now: Long = System.currentTimeMillis()): Boolean =
        p.onboarded && p.cardHash != null && now >= p.unlockedUntil

    /** Prochaine occurrence de [hour]:00 apres maintenant (aujourd'hui ou demain). */
    fun nextRelockAt(hour: Int, now: Long = System.currentTimeMillis()): Long {
        val c = Calendar.getInstance().apply {
            timeInMillis = now
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        if (c.timeInMillis <= now) c.add(Calendar.DAY_OF_YEAR, 1)
        return c.timeInMillis
    }

    /** Empreinte de l'identifiant (UID) de la puce : seule cette carte deverrouille. */
    fun hashCardId(id: ByteArray): String {
        val md = MessageDigest.getInstance("SHA-256")
        md.update("mahu-myfocus-v1:".toByteArray())
        md.update(id)
        return md.digest().joinToString("") { "%02x".format(it) }
    }

    /** Deverrouille jusqu'a l'heure de reverrouillage et note la journee. */
    fun unlockWithCard(p: Prefs) {
        val now = System.currentTimeMillis()
        p.unlockedUntil = nextRelockAt(p.relockHour, now)
        p.failedScans = 0
        val key = "unlock_" + dayKey(now)
        if (p.getInt(key) < 0) {
            val c = Calendar.getInstance()
            p.putInt(key, c.get(Calendar.HOUR_OF_DAY) * 60 + c.get(Calendar.MINUTE))
        }
    }

    fun lockNow(p: Prefs) {
        p.unlockedUntil = 0L
    }

    // --- Suivi -------------------------------------------------------------

    fun dayKey(time: Long, offsetDays: Int = 0): String {
        val c = Calendar.getInstance().apply {
            timeInMillis = time
            add(Calendar.DAY_OF_YEAR, offsetDays)
        }
        return SimpleDateFormat("yyyyMMdd", Locale.US).format(c.time)
    }

    fun recordBlocked(p: Prefs) = p.increment("blocked_" + dayKey(System.currentTimeMillis()))

    fun blockedToday(p: Prefs): Int = p.count("blocked_" + dayKey(System.currentTimeMillis()))

    fun blockedLast7Days(p: Prefs): Int {
        val now = System.currentTimeMillis()
        return (0 downTo -6).sumOf { p.count("blocked_" + dayKey(now, it)) }
    }

    /**
     * Journee reussie = premier deverrouillage du jour apres l'heure objectif
     * (ou aucun deverrouillage). Serie = jours reussis consecutifs avant aujourd'hui.
     */
    fun streakDays(p: Prefs, installedAt: Long): Int {
        val now = System.currentTimeMillis()
        var streak = 0
        for (offset in -1 downTo -365) {
            val day = dayKey(now, offset)
            if (day < dayKey(installedAt)) break
            val firstUnlock = p.getInt("unlock_$day")
            val ok = firstUnlock < 0 || firstUnlock >= p.dayGoalHour * 60
            if (!ok) break
            streak++
        }
        return streak
    }

    fun formatHour(hour: Int) = "%02d:00".format(hour)

    fun formatTime(time: Long): String =
        SimpleDateFormat("HH:mm", Locale.FRANCE).format(time)
}
