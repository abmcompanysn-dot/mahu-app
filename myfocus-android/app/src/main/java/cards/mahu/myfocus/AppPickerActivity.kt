package cards.mahu.myfocus

import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.CheckedTextView
import android.widget.LinearLayout
import android.widget.ListView

/** Choix des applis bloquees pendant la concentration. */
class AppPickerActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val prefs = Prefs(this)
        val apps = launchableApps(packageManager, packageName)
        val selected = prefs.blockedPackages.ifEmpty { Prefs.DEFAULT_BLOCKED }.toMutableSet()

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Ui.BG)
            setPadding(Ui.dp(this@AppPickerActivity, 18), Ui.dp(this@AppPickerActivity, 24), Ui.dp(this@AppPickerActivity, 18), Ui.dp(this@AppPickerActivity, 18))
        }
        setContentView(root)
        root.addView(Ui.title(this, "Applis a bloquer"))
        root.addView(Ui.body(this, "Coche les applis qui te font perdre du temps. Elles seront bloquees pendant la journee."))

        val list = ListView(this).apply {
            choiceMode = ListView.CHOICE_MODE_MULTIPLE
            divider = null
            layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f)
        }
        list.adapter = object : ArrayAdapter<InstalledApp>(this, android.R.layout.simple_list_item_multiple_choice, apps) {
            override fun getView(position: Int, convertView: View?, parent: ViewGroup): View {
                val v = super.getView(position, convertView, parent) as CheckedTextView
                v.text = apps[position].label
                v.setTextColor(Color.WHITE)
                v.textSize = 17f
                return v
            }
        }
        apps.forEachIndexed { i, app -> list.setItemChecked(i, app.packageName in selected) }
        list.setOnItemClickListener { _, _, position, _ ->
            val pkg = apps[position].packageName
            if (list.isItemChecked(position)) selected.add(pkg) else selected.remove(pkg)
        }
        root.addView(list)

        root.addView(Ui.button(this, "Enregistrer") {
            // On ne garde que les applis installees (les paquets par defaut absents sont retires).
            val installed = apps.map { it.packageName }.toSet()
            prefs.blockedPackages = selected.filter { it in installed }.toSet()
            setResult(RESULT_OK)
            finish()
        })
    }
}
