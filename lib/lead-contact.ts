// Coordonnees laissees par un visiteur dans le formulaire de contact d'une carte.
// Elles sont stockees en une seule chaine lisible ("WhatsApp : +221771234567",
// "Instagram : @awa.diop") pour rester compatibles avec les contacts deja
// enregistres, l'export et l'e-mail envoye au titulaire de la carte.

export type LeadChannel = "whatsapp" | "telephone" | "email" | "instagram" | "facebook" | "linkedin" | "tiktok"

export const LEAD_CHANNELS: { id: LeadChannel; label: string; placeholder: string }[] = [
  { id: "whatsapp", label: "WhatsApp", placeholder: "77 123 45 67" },
  { id: "telephone", label: "Telephone", placeholder: "77 123 45 67" },
  { id: "email", label: "E-mail", placeholder: "nom@exemple.com" },
  { id: "instagram", label: "Instagram", placeholder: "@votre.compte" },
  { id: "facebook", label: "Facebook", placeholder: "Nom ou lien du profil" },
  { id: "linkedin", label: "LinkedIn", placeholder: "Lien du profil LinkedIn" },
  { id: "tiktok", label: "TikTok", placeholder: "@votre.compte" },
]

// Pays de livraison et voisins les plus frequents en premier.
export const PHONE_PREFIXES = [
  { code: "221", label: "Senegal (+221)" },
  { code: "229", label: "Benin (+229)" },
  { code: "226", label: "Burkina Faso (+226)" },
  { code: "225", label: "Cote d'Ivoire (+225)" },
  { code: "223", label: "Mali (+223)" },
  { code: "228", label: "Togo (+228)" },
  { code: "227", label: "Niger (+227)" },
  { code: "224", label: "Guinee (+224)" },
  { code: "237", label: "Cameroun (+237)" },
  { code: "33", label: "France (+33)" },
]

const LABELS: Record<LeadChannel, string> = {
  whatsapp: "WhatsApp",
  telephone: "Telephone",
  email: "E-mail",
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
}

// Numero complet en chiffres, indicatif compris. Un numero saisi avec "+" ou
// "00" garde son propre indicatif ; sinon le zero national est retire.
export function fullPhone(prefix: string, raw: string): string {
  const trimmed = raw.trim()
  const digits = trimmed.replace(/\D/g, "")
  if (trimmed.startsWith("+")) return digits
  if (digits.startsWith("00")) return digits.slice(2)
  return prefix + digits.replace(/^0+/, "")
}

// Valide la saisie et renvoie la chaine a enregistrer, ou un message d'erreur.
export function formatLeadContact(
  channel: LeadChannel,
  value: string,
  prefix: string
): { contact: string } | { error: string } {
  const v = value.trim()
  if (!v) return { error: "Indiquez comment vous joindre." }
  if (channel === "whatsapp" || channel === "telephone") {
    const n = fullPhone(prefix, v)
    if (n.length < 8 || n.length > 15) return { error: "Numero incomplet : verifiez le pays et le numero." }
    return { contact: `${LABELS[channel]} : +${n}` }
  }
  if (channel === "email") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return { error: "Adresse e-mail invalide." }
    return { contact: `${LABELS.email} : ${v}` }
  }
  if ((channel === "instagram" || channel === "tiktok") && !v.startsWith("@") && !/^https?:\/\//i.test(v)) {
    return { contact: `${LABELS[channel]} : @${v}` }
  }
  return { contact: `${LABELS[channel]} : ${v}` }
}

export type ParsedLeadContact = { channel: LeadChannel | "autre"; value: string; href: string | null }

// Lit une chaine enregistree (nouveau format "Canal : valeur" ou ancienne
// saisie libre) et donne le lien qui permet de repondre.
export function parseLeadContact(contact: string | null | undefined): ParsedLeadContact {
  const raw = (contact || "").trim()
  const m = raw.match(/^(WhatsApp|Telephone|E-mail|Instagram|Facebook|LinkedIn|TikTok)\s*:\s*(.+)$/i)
  if (m) {
    const channel = (Object.keys(LABELS) as LeadChannel[]).find((k) => LABELS[k].toLowerCase() === m[1].toLowerCase())!
    return { channel, value: m[2].trim(), href: hrefFor(channel, m[2].trim()) }
  }
  if (raw.includes("@") && !raw.startsWith("@")) return { channel: "email", value: raw, href: `mailto:${raw}` }
  if (/^\+?[\d\s().-]{8,}$/.test(raw)) return { channel: "telephone", value: raw, href: `tel:${raw.replace(/[^\d+]/g, "")}` }
  return { channel: "autre", value: raw, href: null }
}

function hrefFor(channel: LeadChannel, value: string): string | null {
  const isUrl = /^https?:\/\//i.test(value)
  const handle = value.replace(/^@/, "")
  switch (channel) {
    case "whatsapp":
      return `https://wa.me/${value.replace(/\D/g, "")}`
    case "telephone":
      return `tel:${value.replace(/[^\d+]/g, "")}`
    case "email":
      return `mailto:${value}`
    case "instagram":
      return isUrl ? value : `https://instagram.com/${handle}`
    case "tiktok":
      return isUrl ? value : `https://www.tiktok.com/@${handle}`
    case "facebook":
      return isUrl ? value : `https://www.facebook.com/search/top?q=${encodeURIComponent(value)}`
    case "linkedin":
      return isUrl ? value : `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(value)}`
  }
}

// Numero WhatsApp pour un contact "Telephone" ou une ancienne saisie de numero.
export function whatsappHref(parsed: ParsedLeadContact): string | null {
  if (parsed.channel === "whatsapp") return parsed.href
  if (parsed.channel === "telephone") {
    let digits = parsed.value.replace(/\D/g, "")
    // Anciennes saisies sans indicatif : numero senegalais a 9 chiffres (7x).
    if (!parsed.value.trim().startsWith("+") && /^7\d{8}$/.test(digits)) digits = "221" + digits
    return digits.length >= 8 ? `https://wa.me/${digits}` : null
  }
  return null
}
