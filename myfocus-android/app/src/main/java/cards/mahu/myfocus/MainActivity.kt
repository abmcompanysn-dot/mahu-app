package cards.mahu.myfocus

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.widget.LinearLayout

/**
 * Accueil : etat de la concentration, suivi, reglages. Les reglages ne
 * s'ouvrent que lorsque la journee a ete deverrouillee avec la carte
 * (sinon il suffirait de retirer une appli de la liste pour tricher).
 */
class MainActivity : Activity() {

    private lateinit var prefs: Prefs

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = Prefs(this)
    }

    override fun onResume() {
        super.onResume()
        if (!prefs.onboarded) {
            startActivity(Intent(this, OnboardingActivity::class.java))
            finish()
            return
        }
        Api.flushPending(this)
        checkProtection()
        render()
    }

    /** Protection coupee pendant la concentration (constatee a l'ouverture) : une alerte. */
    private fun checkProtection() {
        if (Focus.isLocked(prefs) && !Permissions.accessibilityEnabled(this) && !prefs.serviceOffAlerted) {
            prefs.serviceOffAlerted = true
            Api.alert(this, "service_off")
        }
    }

    private fun installedAt(): Long =
        runCatching { packageManager.getPackageInfo(packageName, 0).firstInstallTime }.getOrDefault(System.currentTimeMillis())

    private fun render() {
        val col = Ui.page(this)
        val locked = Focus.isLocked(prefs)

        col.addView(Ui.title(this, "MyFocus", 30f))
        col.addView(Ui.body(this, "Version ${BuildConfig.VERSION_NAME}", Ui.MUTED, 12f))

        val status = Ui.card(this)
        if (locked) {
            status.addView(Ui.title(this, "🔒  Concentration en cours", 22f))
            status.addView(Ui.body(this,
                "${prefs.blockedPackages.size} appli(s) bloquee(s). Passe ton telephone sur ta carte, ce soir a la maison, pour les liberer.",
                0xFFFFFFFF.toInt(), 15f))
        } else {
            status.addView(Ui.title(this, "🔓  Temps libre", 22f))
            status.addView(Ui.body(this,
                "Tes applis sont libres jusqu'a ${Focus.formatTime(prefs.unlockedUntil)}. Elles se rebloqueront toutes seules.",
                0xFFFFFFFF.toInt(), 15f))
        }
        col.addView(status)

        if (!Permissions.accessibilityEnabled(this)) {
            val warn = Ui.card(this)
            warn.addView(Ui.status(this, false, "Protection desactivee : rien n'est bloque"))
            warn.addView(Ui.button(this, "Reactiver la protection") { startActivity(Permissions.accessibilitySettingsIntent()) })
            col.addView(warn)
        }

        col.addView(diagnostic(locked))

        // Suivi
        val stats = Ui.card(this)
        stats.addView(Ui.body(this, "TON SUIVI", Ui.BLUE, 13f))
        stats.addView(statLine("Series de journees reussies", "${Focus.streakDays(prefs, installedAt())} jour(s)"))
        stats.addView(statLine("Tentatives bloquees aujourd'hui", "${Focus.blockedToday(prefs)}"))
        stats.addView(statLine("Tentatives bloquees sur 7 jours", "${Focus.blockedLast7Days(prefs)}"))
        stats.addView(Ui.body(this,
            "Journee reussie = pas de deverrouillage avant ${Focus.formatHour(prefs.dayGoalHour)}.", Ui.MUTED, 13f))
        col.addView(stats)

        if (locked) {
            col.addView(Ui.body(this,
                "🔐 Les reglages s'ouvrent quand ta journee est deverrouillee avec ta carte.", Ui.MUTED, 14f))
            col.addView(Ui.button(this, "Deverrouiller avec ma carte") {
                startActivity(Intent(this, LockActivity::class.java))
            })
            return
        }

        // Reglages (journee deverrouillee uniquement)
        col.addView(Ui.body(this, "REGLAGES", Ui.BLUE, 13f).apply { setPadding(0, Ui.dp(this@MainActivity, 18), 0, 0) })
        col.addView(settingButton("Applis bloquees (${prefs.blockedPackages.size})", OnboardingActivity.Step.APPS))
        col.addView(settingButton("Horaires (reverrouillage ${Focus.formatHour(prefs.relockHour)})", OnboardingActivity.Step.SCHEDULE))
        col.addView(settingButton(
            if (prefs.emailVerified) "Email d'alerte : ${prefs.alertEmail}" else "Email d'alerte : non configure",
            OnboardingActivity.Step.EMAIL))
        col.addView(settingButton("Changer de carte", OnboardingActivity.Step.CARD))
        col.addView(settingButton("Autorisations", OnboardingActivity.Step.PERMISSIONS))
        col.addView(Ui.button(this, "Reprendre la concentration maintenant") {
            Focus.lockNow(prefs)
            render()
        })
    }

    /**
     * Verification en un coup d'oeil : la protection recoit-elle les
     * ouvertures d'applis, et quelles applis sont bloquees.
     */
    private fun diagnostic(locked: Boolean): LinearLayout {
        val card = Ui.card(this)
        card.addView(Ui.body(this, "VERIFICATION", Ui.BLUE, 13f))

        val a11y = Permissions.accessibilityEnabled(this)
        val lastAt = prefs.diagLastEventAt
        val receiving = a11y && lastAt > 0 && lastAt >= prefs.diagServiceConnectedAt
        card.addView(Ui.status(this, a11y, if (a11y) "Protection activee dans Android" else "Protection desactivee dans Android"))
        card.addView(
            if (receiving) {
                val label = prefs.diagLastPackage?.let { appLabel(packageManager, it) ?: it } ?: "?"
                Ui.status(this, true, "Detection OK : derniere appli vue \"$label\" a ${Focus.formatTime(lastAt)}")
            } else {
                Ui.status(this, false, "Aucune ouverture d'appli detectee pour l'instant. Ouvre une appli quelconque puis reviens ici.")
            }
        )
        val names = prefs.blockedPackages.mapNotNull { appLabel(packageManager, it) }.sorted()
        card.addView(Ui.status(this, names.isNotEmpty(),
            if (names.isEmpty()) "Aucune appli bloquee installee sur ce telephone" else "Bloquees : " + names.joinToString(", ")))
        if (locked && names.isNotEmpty()) {
            card.addView(Ui.body(this, "Test : ouvre ${names.first()}, l'ecran \"Concentration en cours\" doit apparaitre.", Ui.MUTED, 14f))
        }
        return card
    }

    private fun statLine(label: String, value: String): LinearLayout = LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL
        addView(Ui.body(this@MainActivity, label, 0xFFFFFFFF.toInt(), 15f).apply {
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        })
        addView(Ui.body(this@MainActivity, value, Ui.BLUE, 15f))
    }

    private fun settingButton(label: String, step: OnboardingActivity.Step) =
        Ui.button(this, label, primary = false) {
            startActivity(
                Intent(this, OnboardingActivity::class.java)
                    .putExtra(OnboardingActivity.EXTRA_STEP, step.name)
                    .putExtra(OnboardingActivity.EXTRA_SINGLE_STEP, true)
            )
        }
}
