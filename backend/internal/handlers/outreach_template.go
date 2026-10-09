package handlers

import (
	"fmt"
	"html"
	"strings"
)

// Mise en page HTML des emails de l'Emailing clients : tableaux et styles en
// ligne (seule mise en page fiable dans Gmail, Outlook et les applis mobiles),
// largeur 600 px qui se resserre sur telephone.

type outreachEmail struct {
	Subject     string
	Body        string // texte deja personnalise, paragraphes separes par une ligne vide
	SenderName  string
	SenderEmail string
	AskFeedback bool
	FeedbackURL string
	UnsubURL    string
	LogoURL     string
}

func initials(name string) string {
	out := ""
	for _, w := range strings.Fields(name) {
		out += strings.ToUpper(string([]rune(w)[0]))
		if len([]rune(out)) == 2 {
			break
		}
	}
	if out == "" {
		return "M"
	}
	return out
}

func renderOutreachHTML(e outreachEmail) string {
	esc := html.EscapeString
	var b strings.Builder

	paras := []string{}
	for _, p := range strings.Split(strings.ReplaceAll(e.Body, "\r\n", "\n"), "\n\n") {
		if strings.TrimSpace(p) != "" {
			paras = append(paras, strings.TrimSpace(p))
		}
	}
	preheader := ""
	if len(paras) > 1 {
		preheader = paras[1]
	} else if len(paras) == 1 {
		preheader = paras[0]
	}
	if r := []rune(preheader); len(r) > 110 {
		preheader = string(r[:110]) + "..."
	}

	b.WriteString(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">`)
	fmt.Fprintf(&b, `<title>%s</title>`, esc(e.Subject))
	b.WriteString(`<style>
@media only screen and (max-width:620px){
 .px{padding-left:22px!important;padding-right:22px!important}
 .star a{width:44px!important;height:50px!important}
 .h1{font-size:20px!important}
}
a{text-decoration:none}
</style></head>`)
	b.WriteString(`<body style="margin:0;padding:0;background-color:#eef2f7;-webkit-text-size-adjust:100%;">`)
	fmt.Fprintf(&b, `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">%s&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>`, esc(preheader))

	b.WriteString(`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#eef2f7;"><tr><td align="center" style="padding:28px 12px 36px;">`)
	b.WriteString(`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">`)

	// En-tete : logo + nom
	fmt.Fprintf(&b, `<tr><td style="padding:0 6px 18px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
<td style="vertical-align:middle;"><img src="%s" width="38" height="38" alt="Mahu" style="display:block;border:0;border-radius:10px;"></td>
<td style="vertical-align:middle;padding-left:10px;font-size:19px;font-weight:800;color:#0b1726;letter-spacing:-0.3px;">Mahu</td>
</tr></table></td></tr>`, esc(e.LogoURL))

	// Carte principale
	b.WriteString(`<tr><td style="background-color:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 2px 10px rgba(15,35,65,0.06);">`)
	b.WriteString(`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="height:5px;line-height:5px;font-size:0;background-color:#007AFF;background-image:linear-gradient(90deg,#007AFF,#5ac8fa);">&nbsp;</td></tr></table>`)
	b.WriteString(`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td class="px" style="padding:34px 40px 8px;">`)

	for i, p := range paras {
		text := strings.ReplaceAll(esc(p), "\n", "<br>")
		if i == 0 {
			fmt.Fprintf(&b, `<p class="h1" style="margin:0 0 18px;font-size:22px;line-height:1.35;font-weight:700;color:#0b1726;">%s</p>`, text)
		} else {
			fmt.Fprintf(&b, `<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#3b4a5c;">%s</p>`, text)
		}
	}
	b.WriteString(`</td></tr>`)

	if e.AskFeedback {
		b.WriteString(`<tr><td class="px" style="padding:12px 40px 6px;">`)
		b.WriteString(`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f8fc;border:1px solid #e3ebf4;border-radius:16px;"><tr><td align="center" style="padding:26px 14px 22px;">`)
		b.WriteString(`<p style="margin:0;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#007AFF;">Votre avis compte</p>`)
		b.WriteString(`<p style="margin:8px 0 18px;font-size:18px;line-height:1.4;font-weight:700;color:#0b1726;">Quelle note donnez-vous &agrave; Mahu&nbsp;?</p>`)
		b.WriteString(`<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>`)
		for n := 1; n <= 5; n++ {
			fmt.Fprintf(&b, `<td class="star" style="padding:0 4px;"><a href="%s?note=%d" style="display:block;width:52px;height:58px;background-color:#ffffff;border:1px solid #d6e1ee;border-radius:12px;text-align:center;text-decoration:none;">
<span style="display:block;padding-top:7px;font-size:24px;line-height:26px;color:#f5b301;">&#9733;</span>
<span style="display:block;font-size:13px;line-height:18px;font-weight:700;color:#52637a;">%d</span></a></td>`, esc(e.FeedbackURL), n, n)
		}
		b.WriteString(`</tr></table>`)
		b.WriteString(`<table role="presentation" width="292" cellspacing="0" cellpadding="0" border="0" style="margin-top:8px;"><tr>
<td align="left" style="font-size:11px;color:#8a99ad;">Pas satisfait</td><td align="right" style="font-size:11px;color:#8a99ad;">Tr&egrave;s satisfait</td></tr></table>`)
		// Bouton (table "bulletproof" pour Outlook)
		fmt.Fprintf(&b, `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:22px;"><tr><td align="center" style="border-radius:12px;background-color:#007AFF;">
<a href="%s" style="display:inline-block;padding:14px 30px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">Donner mon avis</a></td></tr></table>`, esc(e.FeedbackURL))
		b.WriteString(`<p style="margin:14px 0 0;font-size:13px;line-height:1.5;color:#6b7c93;">Moins d'une minute &middot; ou r&eacute;pondez simplement &agrave; cet email.</p>`)
		b.WriteString(`</td></tr></table></td></tr>`)
	}

	// Signature
	fmt.Fprintf(&b, `<tr><td class="px" style="padding:26px 40px 34px;">
<table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #edf1f6;"><tr><td style="padding-top:22px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
<td style="vertical-align:middle;"><div style="width:46px;height:46px;border-radius:23px;background-color:#0b1726;color:#ffffff;font-size:16px;font-weight:700;line-height:46px;text-align:center;">%s</div></td>
<td style="vertical-align:middle;padding-left:14px;">
<p style="margin:0;font-size:16px;font-weight:700;color:#0b1726;">%s</p>
<p style="margin:2px 0 0;font-size:13px;color:#6b7c93;">&Eacute;quipe Mahu &middot; <a href="mailto:%s" style="color:#007AFF;text-decoration:none;">%s</a></p>
</td></tr></table></td></tr></table></td></tr>`, esc(initials(e.SenderName)), esc(e.SenderName), esc(e.SenderEmail), esc(e.SenderEmail))

	b.WriteString(`</table></td></tr>`)

	// Pied de page
	fmt.Fprintf(&b, `<tr><td align="center" style="padding:24px 18px 0;font-size:12px;line-height:1.7;color:#8a99ad;">
<a href="https://mahu.cards" style="color:#52637a;font-weight:700;text-decoration:none;">mahu.cards</a> &middot; La carte de visite intelligente<br>
MAHU DIGITAL SYSTEM &middot; Medina Rue 13 Angle 12, Dakar, S&eacute;n&eacute;gal<br>
Vous recevez cet email en tant que client Mahu. <a href="%s" style="color:#8a99ad;text-decoration:underline;">Se d&eacute;sinscrire</a>
</td></tr>`, esc(e.UnsubURL))

	b.WriteString(`</table></td></tr></table></body></html>`)
	return b.String()
}
