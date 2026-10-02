package cards.mahu.myfocus

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.os.Build
import android.os.Bundle
import android.text.InputType
import android.widget.CheckBox
import android.widget.LinearLayout
import android.widget.Toast
import kotlin.concurrent.thread

/**
 * Configuration guidee, une etape par ecran. Chaque etape verifie qu'elle
 * est vraiment faite avant de passer a la suivante. Avec EXTRA_SINGLE_STEP,
 * n'ouvre qu'une etape (depuis les reglages) puis revient.
 */
class OnboardingActivity : Activity() {

    enum class Step { WELCOME, CONSENT, PERMISSIONS, CARD, APPS, SCHEDULE, EMAIL, DONE }

    companion object {
        const val EXTRA_STEP = "step"
        const val EXTRA_SINGLE_STEP = "single"
        const val PRIVACY_URL = "https://myfocus.mahu.cards/confidentialite"
        private const val REQ_APPS = 1
    }

    private lateinit var prefs: Prefs
    private var nfc: NfcAdapter? = null
    private var step = Step.WELCOME
    private var single = false
    private var codeRequested = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = Prefs(this)
        nfc = NfcAdapter.getDefaultAdapter(this)
        single = intent.getBooleanExtra(EXTRA_SINGLE_STEP, false)
        step = intent.getStringExtra(EXTRA_STEP)?.let { runCatching { Step.valueOf(it) }.getOrNull() }
            ?: savedInstanceState?.getString(EXTRA_STEP)?.let { Step.valueOf(it) }
            ?: if (prefs.consentAccepted) Step.PERMISSIONS else Step.WELCOME
        codeRequested = prefs.deviceId != null && !prefs.emailVerified
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putString(EXTRA_STEP, step.name)
    }

    override fun onResume() {
        super.onResume()
        render() // les autorisations ont pu changer dans les reglages Android
        updateReader()
    }

    override fun onPause() {
        super.onPause()
        nfc?.disableReaderMode(this)
    }

    private fun goTo(next: Step) {
        if (single) {
            finish()
            return
        }
        step = next
        render()
        updateReader()
    }

    private fun next() = goTo(Step.values()[step.ordinal + 1])

    private fun updateReader() {
        if (step == Step.CARD) {
            nfc?.enableReaderMode(
                this, { tag -> runOnUiThread { onCard(tag) } },
                NfcAdapter.FLAG_READER_NFC_A or NfcAdapter.FLAG_READER_NFC_B or
                    NfcAdapter.FLAG_READER_NFC_F or NfcAdapter.FLAG_READER_NFC_V or
                    NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK, null
            )
        } else {
            nfc?.disableReaderMode(this)
        }
    }

    private fun onCard(tag: Tag) {
        if (step != Step.CARD) return
        prefs.cardHash = Focus.hashCardId(tag.id)
        Toast.makeText(this, "Carte enregistree comme cle MyFocus.", Toast.LENGTH_SHORT).show()
        render()
    }

    private fun progress(col: LinearLayout) {
        if (single) return
        val n = step.ordinal
        col.addView(Ui.body(this, "Etape $n sur ${Step.DONE.ordinal}", Ui.BLUE, 13f))
    }

    private fun render() {
        val col = Ui.page(this)
        progress(col)
        when (step) {
            Step.WELCOME -> welcome(col)
            Step.CONSENT -> consent(col)
            Step.CARD -> card(col)
            Step.APPS -> apps(col)
            Step.SCHEDULE -> schedule(col)
            Step.EMAIL -> email(col)
            Step.PERMISSIONS -> permissions(col)
            Step.DONE -> done(col)
        }
    }

    private fun welcome(col: LinearLayout) {
        col.addView(Ui.title(this, "Bienvenue dans MyFocus", 30f))
        col.addView(Ui.body(this, "Version ${BuildConfig.VERSION_NAME}", Ui.MUTED, 12f))
        col.addView(Ui.body(this,
            "Zero scrolling pendant la journee.\n\n" +
                "1. Ta carte Mahu devient ta cle.\n" +
                "2. Tu la laisses a la maison.\n" +
                "3. Instagram, TikTok et les autres applis que tu choisis sont bloques toute la journee.\n" +
                "4. Le soir, tu passes ton telephone sur ta carte : tout est libre jusqu'au lendemain matin.\n\n" +
                "Si quelqu'un essaie de forcer, tu recois une alerte par email.", 0xFFFFFFFF.toInt(), 16f))
        if (!Permissions.hasNfc(this)) {
            col.addView(Ui.status(this, false, "Ce telephone n'a pas de NFC : MyFocus ne peut pas fonctionner."))
            return
        }
        col.addView(Ui.button(this, "Commencer") { next() })
    }

    private fun consent(col: LinearLayout) {
        col.addView(Ui.title(this, "Ta vie privee"))
        col.addView(Ui.body(this,
            "Pour bloquer une appli, MyFocus utilise le service d'accessibilite d'Android.\n\n" +
                "• MyFocus voit seulement le NOM de l'appli que tu ouvres, pour savoir si elle est bloquee.\n" +
                "• MyFocus ne lit pas ton ecran, tes messages ni ce que tu tapes.\n" +
                "• Rien de ce que tu fais n'est envoye : tes reglages et ton suivi restent sur ce telephone.\n" +
                "• Seules les alertes d'intrusion (type d'alerte, heure, modele du telephone) sont envoyees au serveur Mahu, pour t'envoyer l'email.\n" +
                "• L'identifiant de ta carte n'est garde que sous forme d'empreinte chiffree, sur le telephone.",
            0xFFFFFFFF.toInt(), 15f))
        col.addView(Ui.button(this, "Lire la politique de confidentialite", primary = false) {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(PRIVACY_URL)))
        })
        val box = CheckBox(this).apply {
            text = "J'ai lu et j'accepte que MyFocus utilise l'accessibilite comme decrit ci-dessus."
            setTextColor(0xFFFFFFFF.toInt())
            textSize = 15f
            isChecked = prefs.consentAccepted
            setPadding(0, Ui.dp(this@OnboardingActivity, 12), 0, Ui.dp(this@OnboardingActivity, 4))
        }
        col.addView(box)
        col.addView(Ui.button(this, "Continuer") {
            if (!box.isChecked) {
                Toast.makeText(this, "Coche la case pour continuer.", Toast.LENGTH_SHORT).show()
                return@button
            }
            prefs.consentAccepted = true
            next()
        })
    }

    private fun card(col: LinearLayout) {
        col.addView(Ui.title(this, "Ta carte, ta cle"))
        if (!Permissions.nfcEnabled(this)) {
            col.addView(Ui.status(this, false, "Le NFC est desactive"))
            col.addView(Ui.button(this, "Activer le NFC") { startActivity(Permissions.nfcSettingsIntent()) })
            return
        }
        val registered = prefs.cardHash != null
        col.addView(Ui.body(this,
            "Approche ta carte Mahu du dos du telephone (pres de l'appareil photo) et garde-la immobile une seconde.\n\n" +
                "Seule CETTE carte pourra deverrouiller tes applis. Garde-la a la maison.", 0xFFFFFFFF.toInt(), 16f))
        col.addView(if (registered) Ui.status(this, true, "Carte enregistree. Tu peux en scanner une autre pour la remplacer.")
        else Ui.status(this, false, "En attente de ta carte..."))
        if (registered) col.addView(Ui.button(this, "Continuer") { next() })
    }

    private fun apps(col: LinearLayout) {
        if (prefs.blockedPackages.isEmpty()) {
            val installed = launchableApps(packageManager, packageName).map { it.packageName }.toSet()
            prefs.blockedPackages = Prefs.DEFAULT_BLOCKED.filter { it in installed }.toSet()
        }
        col.addView(Ui.title(this, "Applis a bloquer"))
        val names = prefs.blockedPackages.mapNotNull { appLabel(packageManager, it) }.sorted()
        col.addView(Ui.body(this,
            if (names.isEmpty()) "Aucune appli choisie pour l'instant."
            else "Bloquees pendant la journee :\n" + names.joinToString("\n") { "• $it" },
            0xFFFFFFFF.toInt(), 16f))
        col.addView(Ui.button(this, "Choisir les applis", primary = false) {
            @Suppress("DEPRECATION")
            startActivityForResult(Intent(this, AppPickerActivity::class.java), REQ_APPS)
        })
        if (prefs.blockedPackages.isNotEmpty()) col.addView(Ui.button(this, "Continuer") { next() })
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        @Suppress("DEPRECATION")
        super.onActivityResult(requestCode, resultCode, data)
        render()
    }

    private fun schedule(col: LinearLayout) {
        col.addView(Ui.title(this, "Ton rythme"))
        col.addView(Ui.body(this,
            "Quand tu scannes ta carte le soir, tes applis sont libres jusqu'a l'heure de reverrouillage, " +
                "puis se bloquent toutes seules pour la journee.", 0xFFFFFFFF.toInt(), 16f))
        hourPicker(col, "Reverrouillage le matin", prefs.relockHour) { prefs.relockHour = it }
        hourPicker(col, "Journee reussie si je deverrouille apres", prefs.dayGoalHour) { prefs.dayGoalHour = it }
        col.addView(Ui.button(this, "Continuer") { next() })
    }

    private fun hourPicker(col: LinearLayout, label: String, value: Int, onChange: (Int) -> Unit) {
        val card = Ui.card(this)
        card.addView(Ui.body(this, label, Ui.MUTED, 14f))
        val valueView = Ui.title(this, Focus.formatHour(value), 28f)
        card.addView(valueView)
        val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        var current = value
        fun set(v: Int) {
            current = (v + 24) % 24
            onChange(current)
            valueView.text = Focus.formatHour(current)
        }
        row.addView(Ui.button(this, "− 1 h", primary = false) { set(current - 1) }.apply {
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply { rightMargin = Ui.dp(this@OnboardingActivity, 6) }
        })
        row.addView(Ui.button(this, "+ 1 h", primary = false) { set(current + 1) }.apply {
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply { leftMargin = Ui.dp(this@OnboardingActivity, 6) }
        })
        card.addView(row)
        card.addView(Ui.spacer(this, 8))
        col.addView(card)
    }

    private fun email(col: LinearLayout) {
        col.addView(Ui.title(this, "Alerte d'intrusion"))
        col.addView(Ui.body(this,
            "Si quelqu'un rate 5 fois le badge ou coupe la protection de MyFocus, " +
                "un email d'urgence part a cette adresse (la tienne, ou celle d'un parent).", 0xFFFFFFFF.toInt(), 16f))

        if (prefs.emailVerified) {
            col.addView(Ui.status(this, true, "Alertes envoyees a ${prefs.alertEmail}"))
            col.addView(Ui.button(this, "Continuer") { next() })
            col.addView(Ui.button(this, "Changer d'adresse", primary = false) {
                prefs.emailVerified = false
                codeRequested = false
                render()
            })
            return
        }

        val emailInput = Ui.input(this, "adresse@email.com", InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS)
        prefs.alertEmail?.let { emailInput.setText(it) }
        col.addView(emailInput)

        if (!codeRequested) {
            col.addView(Ui.button(this, "Recevoir un code par email") {
                val email = emailInput.text.toString().trim()
                if (!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
                    Toast.makeText(this, "Adresse email invalide.", Toast.LENGTH_SHORT).show()
                    return@button
                }
                runRemote({ Api.register(prefs, email) }) {
                    codeRequested = true
                    Toast.makeText(this, "Code envoye a $email", Toast.LENGTH_LONG).show()
                    render()
                }
            })
        } else {
            col.addView(Ui.body(this, "Saisis le code a 6 chiffres recu a ${prefs.alertEmail} (pense aux spams).", Ui.MUTED, 14f))
            val codeInput = Ui.input(this, "123456", InputType.TYPE_CLASS_NUMBER)
            col.addView(codeInput)
            col.addView(Ui.button(this, "Valider le code") {
                val code = codeInput.text.toString().trim()
                runRemote({ Api.verify(prefs, code) }) {
                    Toast.makeText(this, "Email confirme.", Toast.LENGTH_SHORT).show()
                    render()
                }
            })
            col.addView(Ui.button(this, "Renvoyer un code", primary = false) {
                codeRequested = false
                render()
            })
        }
        col.addView(Ui.button(this, "Plus tard (sans alertes)", primary = false) { next() })
    }

    private fun runRemote(call: () -> Unit, onSuccess: () -> Unit) {
        Toast.makeText(this, "Patiente...", Toast.LENGTH_SHORT).show()
        thread {
            val error = runCatching(call).exceptionOrNull()
            runOnUiThread {
                if (error == null) onSuccess()
                else Toast.makeText(this, error.message ?: "Pas de connexion internet.", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun permissions(col: LinearLayout) {
        col.addView(Ui.title(this, "Autorisations"))
        col.addView(Ui.body(this, "Active ces deux protections : elles sont indispensables.", 0xFFFFFFFF.toInt(), 16f))

        val a11y = Permissions.accessibilityEnabled(this)
        val card1 = Ui.card(this)
        card1.addView(Ui.status(this, a11y, "Blocage des applis (accessibilite)"))
        if (!a11y) {
            card1.addView(Ui.body(this, "Dans la page qui s'ouvre : Applis installees (ou Services telecharges) > MyFocus > Activer.", Ui.MUTED, 14f))
            card1.addView(Ui.button(this, "Activer") { startActivity(Permissions.accessibilitySettingsIntent()) })
            if (Build.VERSION.SDK_INT >= 33) {
                card1.addView(Ui.body(this,
                    "Grise ou \"Parametre restreint\" ? Android bloque ce reglage pour les applis installees hors Play Store. " +
                        "Ouvre les infos de MyFocus, touche le menu ⋮ en haut a droite, puis \"Autoriser les parametres restreints\", et reviens ici.",
                    0xFFFFB020.toInt(), 14f))
                card1.addView(Ui.button(this, "Ouvrir les infos de MyFocus", primary = false) {
                    startActivity(Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName")))
                })
            }
        }
        col.addView(card1)

        val battery = Permissions.batteryUnrestricted(this)
        val card2 = Ui.card(this)
        card2.addView(Ui.status(this, battery, "Toujours actif (pas d'economie de batterie)"))
        if (!battery) card2.addView(Ui.button(this, "Autoriser") { startActivity(Permissions.batteryIntent(this)) })
        col.addView(card2)


        if (Build.MANUFACTURER.equals("Xiaomi", true) || Build.MANUFACTURER.equals("Tecno", true) ||
            Build.MANUFACTURER.equals("Infinix", true) || Build.MANUFACTURER.equals("itel", true)) {
            col.addView(Ui.body(this,
                "Sur ${Build.MANUFACTURER}, autorise aussi le \"Demarrage automatique\" de MyFocus dans les reglages de l'appli, sinon la protection peut s'arreter.",
                0xFFFFB020.toInt(), 14f))
        }

        if (a11y && battery) col.addView(Ui.button(this, "Continuer") { next() })
    }

    private fun done(col: LinearLayout) {
        col.addView(Ui.title(this, "Tout est pret !", 30f))
        col.addView(Ui.body(this,
            "Range ta carte a la maison. Des maintenant, tes applis choisies sont bloquees.\n\n" +
                "Ce soir, passe ton telephone sur ta carte pour les liberer jusqu'a ${Focus.formatHour(prefs.relockHour)}.",
            0xFFFFFFFF.toInt(), 16f))
        col.addView(Ui.button(this, "Lancer la concentration") {
            prefs.onboarded = true
            Focus.lockNow(prefs)
            startActivity(Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP))
            finish()
        })
    }
}
