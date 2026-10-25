package cards.mahu.box

import android.annotation.SuppressLint
import android.app.Activity
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebStorage
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Mahu Box : la box TV devient un poste fixe. Ecran "Pose ta carte" ->
 * lecture de la carte (lecteur USB) -> ecran du code secret puis ordinateur
 * en plein ecran. Carte retiree -> tout se ferme et s'efface aussitot.
 */
class MainActivity : Activity() {

    companion object {
        private const val ACTION_USB_PERMISSION = "cards.mahu.box.USB_PERMISSION"
        private val CODE_RE = Regex("/c/([A-Za-z0-9_-]{4,40})")
    }

    private val main = Handler(Looper.getMainLooper())
    private lateinit var usb: UsbManager
    private lateinit var web: WebView
    private lateinit var home: LinearLayout
    private lateinit var title: TextView
    private lateinit var subtitle: TextView

    @Volatile private var reader: AcrReader? = null
    @Volatile private var watching = false
    private var watcher: Thread? = null
    private var currentCode: String? = null

    private val usbReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            when (intent.action) {
                ACTION_USB_PERMISSION, UsbManager.ACTION_USB_DEVICE_ATTACHED -> connectReader()
                UsbManager.ACTION_USB_DEVICE_DETACHED -> {
                    val d = device(intent)
                    if (d != null && reader?.device?.deviceId == d.deviceId) disconnectReader()
                }
            }
        }
    }

    private fun device(intent: Intent): UsbDevice? =
        if (Build.VERSION.SDK_INT >= 33) intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
        else @Suppress("DEPRECATION") intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        usb = getSystemService(Context.USB_SERVICE) as UsbManager
        setContentView(buildUi())

        val filter = IntentFilter().apply {
            addAction(ACTION_USB_PERMISSION)
            addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED)
            addAction(UsbManager.ACTION_USB_DEVICE_DETACHED)
        }
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(usbReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        else registerReceiver(usbReceiver, filter)
    }

    override fun onResume() {
        super.onResume()
        hideSystemBars()
        connectReader()
    }

    override fun onDestroy() {
        unregisterReceiver(usbReceiver)
        disconnectReader()
        super.onDestroy()
    }

    // ---------------------------------------------------------------- ecran

    private fun dp(v: Int) = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v.toFloat(), resources.displayMetrics).toInt()

    @SuppressLint("SetJavaScriptEnabled")
    private fun buildUi(): View {
        val root = FrameLayout(this).apply { setBackgroundColor(Color.parseColor("#05070D")) }

        web = WebView(this).apply {
            visibility = View.GONE
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.setSupportZoom(false)
            settings.userAgentString = settings.userAgentString + " MahuBox/" + BuildConfig.VERSION_NAME
            isFocusable = true
            isFocusableInTouchMode = true
            webChromeClient = WebChromeClient()
            webViewClient = object : WebViewClient() {
                override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                    if (request.isForMainFrame) showHome("Pas de connexion internet", "Vérifie le câble réseau ou le wifi de la box.")
                }
            }
        }
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true)
        root.addView(web, FrameLayout.LayoutParams(-1, -1))

        home = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
        }
        val logo = ImageView(this).apply { setImageResource(R.mipmap.ic_launcher) }
        home.addView(logo, LinearLayout.LayoutParams(dp(88), dp(88)))
        val brand = TextView(this).apply {
            text = "MAHU"
            setTextColor(Color.WHITE)
            textSize = 34f
            letterSpacing = 0.12f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            setPadding(0, dp(16), 0, 0)
        }
        home.addView(brand)
        // emplacement de la carte
        val slot = FrameLayout(this).apply {
            background = GradientDrawable().apply {
                cornerRadius = dp(16).toFloat()
                setStroke(dp(2), Color.parseColor("#5AC8FA"), dp(10).toFloat(), dp(8).toFloat())
            }
        }
        home.addView(slot, LinearLayout.LayoutParams(dp(214), dp(135)).apply { topMargin = dp(36) })
        title = TextView(this).apply {
            setTextColor(Color.WHITE)
            textSize = 26f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            setPadding(0, dp(28), 0, 0)
        }
        subtitle = TextView(this).apply {
            setTextColor(Color.parseColor("#99FFFFFF"))
            textSize = 16f
            gravity = Gravity.CENTER
            setPadding(dp(24), dp(10), dp(24), 0)
        }
        home.addView(title)
        home.addView(subtitle)
        root.addView(home, FrameLayout.LayoutParams(-1, -1))
        showHome("Pose ta carte", "Ton ordinateur s'ouvre ici.")
        return root
    }

    private fun showHome(t: String, s: String) {
        title.text = t
        subtitle.text = s
        home.visibility = View.VISIBLE
        web.visibility = View.GONE
    }

    private fun hideSystemBars() {
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = (View.SYSTEM_UI_FLAG_FULLSCREEN or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_LAYOUT_STABLE)
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemBars()
    }

    // ---------------------------------------------------------------- carte

    private fun connectReader() {
        if (reader != null) return
        val d = usb.deviceList.values.firstOrNull { AcrReader.isReader(it) }
        if (d == null) {
            showHome("Branche le lecteur de carte", "Le lecteur Mahu se branche sur un port USB de la box.")
            return
        }
        if (!usb.hasPermission(d)) {
            val flags = if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0
            val pi = PendingIntent.getBroadcast(this, 0, Intent(ACTION_USB_PERMISSION).setPackage(packageName), flags)
            usb.requestPermission(d, pi)
            return
        }
        val r = AcrReader(usb, d)
        if (!r.open()) {
            showHome("Lecteur non reconnu", "Débranche puis rebranche le lecteur de carte.")
            return
        }
        reader = r
        if (currentCode == null) showHome("Pose ta carte", "Ton ordinateur s'ouvre ici.")
        startWatching()
    }

    private fun disconnectReader() {
        watching = false
        watcher?.interrupt()
        watcher = null
        reader?.close()
        reader = null
        main.post { closeSession(); showHome("Branche le lecteur de carte", "Le lecteur Mahu se branche sur un port USB de la box.") }
    }

    /** Surveille le lecteur : carte posee -> ouverture, carte retiree -> fermeture. */
    private fun startWatching() {
        if (watching) return
        watching = true
        watcher = Thread {
            var present = false
            var errors = 0
            while (watching) {
                val r = reader ?: break
                when (r.presence()) {
                    AcrReader.Presence.PRESENT -> {
                        errors = 0
                        if (!present) {
                            present = true
                            val url = r.readUrl()
                            main.post { onCardPlaced(url) }
                        }
                    }
                    AcrReader.Presence.ABSENT -> {
                        errors = 0
                        if (present) {
                            present = false
                            main.post { onCardRemoved() }
                        }
                    }
                    AcrReader.Presence.ERROR -> if (++errors > 10) main.post { disconnectReader(); connectReader() }
                }
                try { Thread.sleep(350) } catch (_: InterruptedException) { break }
            }
        }.apply { isDaemon = true; start() }
    }

    private fun onCardPlaced(url: String?) {
        val code = url?.let { CODE_RE.find(it)?.groupValues?.get(1) }
        if (code == null) {
            Log.w(AcrReader.TAG, "carte sans adresse Mahu : $url")
            showHome("Carte non reconnue", "Utilise ta carte Mahu ordinateur.")
            return
        }
        currentCode = code
        home.visibility = View.GONE
        web.visibility = View.VISIBLE
        web.loadUrl("${BuildConfig.SITE}/pc/$code?box=1")
        web.requestFocus()
    }

    private fun onCardRemoved() {
        closeSession()
        showHome("Ordinateur verrouillé", "Pose ta carte pour le rouvrir.")
        main.postDelayed({ if (currentCode == null && reader != null) showHome("Pose ta carte", "Ton ordinateur s'ouvre ici.") }, 4000)
    }

    /** Ferme l'ecran et efface tout ce que la page a pu garder sur la box. */
    private fun closeSession() {
        currentCode = null
        web.loadUrl("about:blank")
        web.clearHistory()
        web.clearCache(true)
        web.clearFormData()
        WebStorage.getInstance().deleteAllData()
        CookieManager.getInstance().removeAllCookies(null)
        CookieManager.getInstance().flush()
    }

    // ---------------------------------------------------------------- touches

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        // Ctrl + Alt + M : reglages Android (installation / wifi de la box).
        if (event.action == KeyEvent.ACTION_DOWN && event.keyCode == KeyEvent.KEYCODE_M && event.isCtrlPressed && event.isAltPressed) {
            startActivity(Intent(Settings.ACTION_SETTINGS))
            return true
        }
        // Retour ne quitte jamais la box : il est transmis a l'ordinateur.
        if (event.keyCode == KeyEvent.KEYCODE_BACK && currentCode == null) return true
        return super.dispatchKeyEvent(event)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // Bloque : la box reste sur Mahu.
    }
}
