package cards.mahu.myfocus

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.os.Bundle
import android.view.Gravity
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast

/**
 * Ecran de concentration affiche devant une appli bloquee. Seule la carte
 * enregistree le leve ; 5 badges incorrects d'affilee envoient une alerte.
 */
class LockActivity : Activity() {

    companion object {
        const val EXTRA_BLOCKED_PACKAGE = "blocked_package"
        const val MAX_FAILED_SCANS = 5
    }

    private lateinit var prefs: Prefs
    private var nfc: NfcAdapter? = null
    private lateinit var feedback: TextView
    private lateinit var appLine: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = Prefs(this)
        nfc = NfcAdapter.getDefaultAdapter(this)
        render()
        showBlockedApp(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        showBlockedApp(intent)
    }

    private fun render() {
        val col = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Ui.BG)
            setPadding(Ui.dp(this@LockActivity, 28), 0, Ui.dp(this@LockActivity, 28), 0)
        }
        setContentView(col)

        col.addView(Ui.centered(TextView(this).apply {
            text = "🔒"
            textSize = 64f
        }))
        col.addView(Ui.centered(Ui.title(this, "Concentration en cours", 28f)))
        appLine = Ui.centered(Ui.body(this, ""))
        col.addView(appLine)
        col.addView(Ui.centered(Ui.body(this,
            "Cette appli est bloquee jusqu'a ce soir. Pour la deverrouiller, " +
                "approche ta carte MyFocus du dos du telephone.", Color.WHITE, 17f)))
        feedback = Ui.centered(TextView(this).apply {
            textSize = 15f
            typeface = Typeface.DEFAULT_BOLD
            setPadding(0, Ui.dp(this@LockActivity, 8), 0, Ui.dp(this@LockActivity, 8))
        })
        col.addView(feedback)

        if (nfc?.isEnabled != true) {
            col.addView(Ui.button(this, "Activer le NFC", primary = false) {
                startActivity(Permissions.nfcSettingsIntent())
            })
        }
        col.addView(Ui.button(this, "Retour a l'accueil", primary = true) { goHome() })
        updateFeedback()
    }

    private fun showBlockedApp(intent: Intent?) {
        val pkg = intent?.getStringExtra(EXTRA_BLOCKED_PACKAGE) ?: return
        val label = appLabel(packageManager, pkg)
        appLine.text = if (label != null) "$label est bloquee pendant ta concentration." else ""
    }

    override fun onResume() {
        super.onResume()
        if (!Focus.isLocked(prefs)) {
            finish()
            return
        }
        nfc?.enableReaderMode(
            this,
            { tag -> runOnUiThread { onCardScanned(tag) } },
            NfcAdapter.FLAG_READER_NFC_A or NfcAdapter.FLAG_READER_NFC_B or
                NfcAdapter.FLAG_READER_NFC_F or NfcAdapter.FLAG_READER_NFC_V or
                NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK,
            null
        )
    }

    override fun onPause() {
        super.onPause()
        nfc?.disableReaderMode(this)
    }

    private fun onCardScanned(tag: Tag) {
        if (Focus.hashCardId(tag.id) == prefs.cardHash) {
            Focus.unlockWithCard(prefs)
            Toast.makeText(this, "Bonne soiree ! Libre jusqu'a ${Focus.formatHour(prefs.relockHour)}.", Toast.LENGTH_LONG).show()
            finish()
            return
        }
        prefs.failedScans = prefs.failedScans + 1
        if (prefs.failedScans % MAX_FAILED_SCANS == 0) {
            Api.alert(this, "failed_scans", prefs.failedScans)
        }
        updateFeedback()
    }

    private fun updateFeedback() {
        val failed = prefs.failedScans
        if (failed == 0) {
            feedback.text = ""
            return
        }
        val left = MAX_FAILED_SCANS - (failed % MAX_FAILED_SCANS)
        feedback.setTextColor(Ui.RED)
        feedback.text = if (failed % MAX_FAILED_SCANS == 0) {
            "Carte refusee. Une alerte a ete envoyee au proprietaire."
        } else {
            "Ce n'est pas la bonne carte. Encore $left essai(s) avant l'alerte."
        }
    }

    private fun goHome() {
        startActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        finish()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() = goHome()
}
