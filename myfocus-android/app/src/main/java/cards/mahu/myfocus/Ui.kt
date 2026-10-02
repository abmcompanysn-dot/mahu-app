package cards.mahu.myfocus

import android.app.Activity
import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.text.InputType
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView

/** Petits blocs d'interface communs (sans dependance externe). */
object Ui {
    const val BLUE = 0xFF007AFF.toInt()
    const val BG = 0xFF0A0A0A.toInt()
    const val CARD = 0xFF16181F.toInt()
    const val MUTED = 0xFFA0A4AE.toInt()
    const val GREEN = 0xFF22C55E.toInt()
    const val RED = 0xFFFF5A5F.toInt()

    fun dp(ctx: Context, v: Int): Int =
        TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v.toFloat(), ctx.resources.displayMetrics).toInt()

    /** Page defilante avec une colonne de contenu. Retourne la colonne. */
    fun page(activity: Activity): LinearLayout {
        val column = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(activity, 22), dp(activity, 28), dp(activity, 22), dp(activity, 28))
        }
        val scroll = ScrollView(activity).apply {
            setBackgroundColor(BG)
            isFillViewport = true
            addView(column)
        }
        activity.setContentView(scroll)
        return column
    }

    fun title(ctx: Context, text: String, size: Float = 26f) = TextView(ctx).apply {
        this.text = text
        setTextColor(Color.WHITE)
        textSize = size
        typeface = Typeface.DEFAULT_BOLD
        setPadding(0, 0, 0, dp(ctx, 8))
    }

    fun body(ctx: Context, text: String, color: Int = MUTED, size: Float = 15f) = TextView(ctx).apply {
        this.text = text
        setTextColor(color)
        textSize = size
        setLineSpacing(0f, 1.25f)
        setPadding(0, 0, 0, dp(ctx, 12))
    }

    fun button(ctx: Context, text: String, primary: Boolean = true, onClick: () -> Unit) = Button(ctx).apply {
        this.text = text
        isAllCaps = false
        textSize = 16f
        typeface = Typeface.DEFAULT_BOLD
        setTextColor(if (primary) Color.WHITE else Color.WHITE)
        background = GradientDrawable().apply {
            cornerRadius = dp(ctx, 14).toFloat()
            setColor(if (primary) BLUE else CARD)
            if (!primary) setStroke(dp(ctx, 1), 0xFF2A2E38.toInt())
        }
        setPadding(dp(ctx, 16), dp(ctx, 14), dp(ctx, 16), dp(ctx, 14))
        layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
            .apply { topMargin = dp(ctx, 10) }
        setOnClickListener { onClick() }
    }

    fun card(ctx: Context): LinearLayout = LinearLayout(ctx).apply {
        orientation = LinearLayout.VERTICAL
        background = GradientDrawable().apply {
            cornerRadius = dp(ctx, 18).toFloat()
            setColor(CARD)
        }
        setPadding(dp(ctx, 18), dp(ctx, 16), dp(ctx, 18), dp(ctx, 8))
        layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
            .apply { topMargin = dp(ctx, 14) }
    }

    fun input(ctx: Context, hint: String, type: Int = InputType.TYPE_CLASS_TEXT) = EditText(ctx).apply {
        this.hint = hint
        inputType = type
        setTextColor(Color.WHITE)
        setHintTextColor(0xFF6B7080.toInt())
        textSize = 17f
        background = GradientDrawable().apply {
            cornerRadius = dp(ctx, 12).toFloat()
            setColor(0xFF1D2029.toInt())
            setStroke(dp(ctx, 1), 0xFF2A2E38.toInt())
        }
        setPadding(dp(ctx, 14), dp(ctx, 12), dp(ctx, 14), dp(ctx, 12))
        layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
            .apply { topMargin = dp(ctx, 8) }
    }

    /** Ligne "etat" : pastille verte/rouge + texte. */
    fun status(ctx: Context, ok: Boolean, text: String) = TextView(ctx).apply {
        this.text = (if (ok) "✅  " else "⚠️  ") + text
        setTextColor(if (ok) GREEN else 0xFFFFB020.toInt())
        textSize = 15f
        typeface = Typeface.DEFAULT_BOLD
        setPadding(0, dp(ctx, 4), 0, dp(ctx, 8))
    }

    fun spacer(ctx: Context, h: Int) = View(ctx).apply {
        layoutParams = LinearLayout.LayoutParams(1, dp(ctx, h))
    }

    fun centered(view: TextView) = view.apply { gravity = Gravity.CENTER_HORIZONTAL }
}
