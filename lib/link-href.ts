// Liens du profil (Liens_Sociaux_JSON) : un client peut taper un simple numero pour WhatsApp
// ou Telephone, ou une adresse pour Email. On en fait ici le vrai lien cliquable :
//   whatsapp "+221 77 123 45 67" -> https://wa.me/221771234567
//   phone    "+221 71 095 64 64" -> tel:+221710956464
//   email    "moi@exemple.com"   -> mailto:moi@exemple.com
// Un numero senegalais a 9 chiffres sans indicatif (77..., 78..., 33...) recoit +221.

const NUMBER_TYPES = new Set(["whatsapp", "phone"])

export function isNumberLink(type: string): boolean {
  return NUMBER_TYPES.has((type || "").toLowerCase())
}

function internationalDigits(raw: string): string | null {
  let d = raw.replace(/[^\d+]/g, "")
  if (d.startsWith("00")) d = "+" + d.slice(2)
  const plain = d.replace(/^\+/, "")
  if (!/^\d{6,15}$/.test(plain)) return null
  if (!d.startsWith("+") && plain.length === 9 && /^[73]/.test(plain)) return "221" + plain
  return plain
}

export function linkHref(type: string, raw: string): string {
  const url = (raw || "").trim()
  if (!url) return ""
  if (/^(https?:|mailto:|tel:)/i.test(url)) return url
  // tout autre schema (javascript:, data:...) n'est jamais un lien de profil
  if (/^[a-z][a-z0-9+.-]*:/i.test(url) && !/^[\w.-]+:\d/.test(url)) return "#"
  const t = (type || "").toLowerCase()
  if (isNumberLink(t)) {
    const d = internationalDigits(url)
    if (d) return t === "whatsapp" ? `https://wa.me/${d}` : `tel:+${d}`
  }
  if (t === "email" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url)) return `mailto:${url}`
  if (/^[\w-]+(\.[\w-]+)+(\/|$)/.test(url)) return `https://${url}`
  return url
}

