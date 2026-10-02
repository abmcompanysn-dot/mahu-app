package cards.mahu.myfocus

import android.content.Intent
import android.content.pm.PackageManager

/** Appli installee qu'on peut choisir de bloquer. */
data class InstalledApp(val packageName: String, val label: String)

fun appLabel(pm: PackageManager, pkg: String): String? = try {
    @Suppress("DEPRECATION")
    pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString()
} catch (e: PackageManager.NameNotFoundException) {
    null
}

/** Applis visibles dans le lanceur (hors MyFocus), triees par nom. */
fun launchableApps(pm: PackageManager, ownPackage: String): List<InstalledApp> {
    val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
    @Suppress("DEPRECATION")
    return pm.queryIntentActivities(intent, 0)
        .map { it.activityInfo.packageName }
        .distinct()
        .filter { it != ownPackage }
        .mapNotNull { pkg -> appLabel(pm, pkg)?.let { InstalledApp(pkg, it) } }
        .sortedBy { it.label.lowercase() }
}
