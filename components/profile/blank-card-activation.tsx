"use client"

// Activation d'une carte vierge (adresse imprimee du type mahu-noom-j-6-jeudi-1478) :
// le visiteur qui scanne la carte tombe directement sur ce formulaire, comme
// ActivationCarte.html dans la premiere version. Le compte est cree sur
// l'adresse de la carte ; Mahu confirme ensuite chaque activation par e-mail.

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Check, Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { PHONE_PREFIXES, fullPhone } from "@/lib/lead-contact"

const input =
  "w-full p-3 rounded-xl bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"

const SOCIALS = [
  { type: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/votre-profil" },
  { type: "instagram", label: "Instagram", placeholder: "@votre-compte" },
  { type: "facebook", label: "Facebook", placeholder: "https://facebook.com/votre-profil" },
  { type: "tiktok", label: "TikTok", placeholder: "@votre-compte" },
  { type: "website", label: "Site web", placeholder: "https://votre-site.com" },
] as const

function socialUrl(type: string, value: string): string {
  const v = value.trim()
  if (!v || /^https?:\/\//i.test(v)) return v
  const handle = v.replace(/^@/, "")
  if (type === "instagram") return `https://instagram.com/${handle}`
  if (type === "tiktok") return `https://www.tiktok.com/@${handle}`
  if (type === "facebook") return `https://facebook.com/${handle}`
  if (type === "linkedin") return `https://linkedin.com/in/${handle}`
  return `https://${v}`
}

export function BlankCardActivation({ slug, accentColor = "#007AFF" }: { slug: string; accentColor?: string }) {
  const { hydrateFromToken } = useAuth()
  const [step, setStep] = useState(1)
  const [f, setF] = useState({
    prenom: "",
    nom: "",
    profession: "",
    compagnie: "",
    prefix: "221",
    telephone: "",
    email: "",
    password: "",
    confirm: "",
    leadCapture: true,
  })
  const [socials, setSocials] = useState<Record<string, string>>({})
  const [whatsappSame, setWhatsappSame] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  const set = (k: keyof typeof f, v: string | boolean) => {
    setF({ ...f, [k]: v })
    setError("")
  }
  const address = `${typeof window !== "undefined" ? window.location.host : "call.mahu.cards"}/p/${slug}`

  const next = () => {
    if (step === 1) {
      if (!f.prenom.trim() || !f.nom.trim() || !f.profession.trim() || !f.email.trim()) {
        setError("Prenom, nom, poste et e-mail sont obligatoires.")
        return
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) {
        setError("Adresse e-mail invalide.")
        return
      }
    }
    setError("")
    setStep(step + 1)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (f.password.length < 6) return setError("Le mot de passe doit contenir au moins 6 caracteres.")
    if (f.password !== f.confirm) return setError("Les mots de passe ne correspondent pas.")
    setLoading(true)
    setError("")
    const phone = f.telephone.trim() ? "+" + fullPhone(f.prefix, f.telephone) : ""
    const links: { type: string; url: string }[] = SOCIALS.filter((s) => socials[s.type]?.trim()).map((s) => ({
      type: s.type,
      url: socialUrl(s.type, socials[s.type]),
    }))
    if (phone && whatsappSame) links.unshift({ type: "whatsapp", url: phone })
    const result = (await api.activateBlankCard({
      profileUrl: slug,
      nomComplet: `${f.prenom.trim()} ${f.nom.trim()}`,
      profession: f.profession.trim(),
      compagnie: f.compagnie.trim(),
      telephone: phone,
      email: f.email.trim().toLowerCase(),
      password: f.password,
      leadCapture: f.leadCapture ? "OUI" : "NON",
      liensSociaux: links,
    })) as { success: boolean; token?: string; role?: string; error?: string }
    setLoading(false)
    if (!result.success || !result.token) {
      setError(result.error || "L'activation n'a pas abouti. Reessayez.")
      return
    }
    hydrateFromToken(result.token, result.role || "Entreprise")
    setDone(true)
  }

  if (done) {
    return (
      <Shell>
        <div className="w-16 h-16 mx-auto rounded-full bg-green-500/15 flex items-center justify-center">
          <Check className="w-8 h-8 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Votre carte est activee !</h1>
        <p className="text-muted-foreground text-sm">
          Votre profil est en ligne sur <span className="font-mono text-foreground break-all">{address}</span>. Ajoutez
          maintenant votre photo et vos services.
        </p>
        <div className="space-y-3">
          <Button asChild className="w-full py-5" style={{ backgroundColor: accentColor }}>
            <Link href="/dashboard/profile">Completer mon profil</Link>
          </Button>
          <Button variant="outline" className="w-full py-5" onClick={() => window.location.reload()}>
            Voir ma carte
          </Button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: accentColor }}>
          Activation de votre carte Mahu
        </p>
        <h1 className="text-2xl font-bold text-foreground">Bienvenue !</h1>
        <p className="text-sm text-muted-foreground">
          Cette carte n&apos;est pas encore activee. Remplissez ce formulaire : elle affichera votre profil.
        </p>
        <p className="font-mono text-xs text-foreground break-all bg-muted/40 rounded-lg px-3 py-2 mt-2">{address}</p>
      </div>

      <div className="flex gap-2" aria-label={`Etape ${step} sur 3`}>
        {["Identite", "Reseaux", "Compte"].map((label, i) => (
          <div key={label} className="flex-1 text-left">
            <div
              className="h-1.5 rounded-full"
              style={{ backgroundColor: i < step ? accentColor : "rgba(128,128,128,.25)" }}
            />
            <span className={`text-xs ${i + 1 === step ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              {i + 1}. {label}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={step === 3 ? submit : (e) => (e.preventDefault(), next())} className="space-y-3 text-left">
        {step === 1 && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <input className={input} placeholder="Prenom *" autoComplete="given-name" value={f.prenom} onChange={(e) => set("prenom", e.target.value)} />
              <input className={input} placeholder="Nom *" autoComplete="family-name" value={f.nom} onChange={(e) => set("nom", e.target.value)} />
            </div>
            <input className={input} placeholder="Poste / Profession *" value={f.profession} onChange={(e) => set("profession", e.target.value)} />
            <input className={input} placeholder="Entreprise (optionnel)" autoComplete="organization" value={f.compagnie} onChange={(e) => set("compagnie", e.target.value)} />
            <div className="flex gap-2">
              <select
                aria-label="Pays"
                className="w-32 shrink-0 p-3 rounded-xl bg-muted/30 border border-border/50 text-foreground text-sm"
                value={f.prefix}
                onChange={(e) => set("prefix", e.target.value)}
              >
                {PHONE_PREFIXES.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.label}
                  </option>
                ))}
              </select>
              <input className={`${input} min-w-0 flex-1`} type="tel" inputMode="tel" placeholder="Telephone (optionnel)" autoComplete="tel-national" value={f.telephone} onChange={(e) => set("telephone", e.target.value)} />
            </div>
            <input className={input} type="email" placeholder="E-mail *" autoComplete="email" value={f.email} onChange={(e) => set("email", e.target.value)} />
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-sm text-muted-foreground">Tout est optionnel : vous pourrez completer plus tard.</p>
            {f.telephone.trim() && (
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={whatsappSame} onChange={(e) => setWhatsappSame(e.target.checked)} />
                Bouton WhatsApp avec mon numero (+{fullPhone(f.prefix, f.telephone)})
              </label>
            )}
            {SOCIALS.map((s) => (
              <label key={s.type} className="block">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <input
                  className={input}
                  placeholder={s.placeholder}
                  value={socials[s.type] || ""}
                  onChange={(e) => setSocials({ ...socials, [s.type]: e.target.value })}
                />
              </label>
            ))}
          </>
        )}

        {step === 3 && (
          <>
            <div className="relative">
              <input
                className={`${input} pr-12`}
                type={showPassword ? "text" : "password"}
                placeholder="Mot de passe (6 caracteres minimum)"
                autoComplete="new-password"
                value={f.password}
                onChange={(e) => set("password", e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <input className={input} type={showPassword ? "text" : "password"} placeholder="Confirmer le mot de passe" autoComplete="new-password" value={f.confirm} onChange={(e) => set("confirm", e.target.value)} />
            <label className="flex items-start gap-2 text-sm text-foreground">
              <input type="checkbox" className="mt-1" checked={f.leadCapture} onChange={(e) => set("leadCapture", e.target.checked)} />
              <span>
                Formulaire de contact sur ma carte
                <span className="block text-xs text-muted-foreground">Les personnes rencontrees vous laissent leur WhatsApp ou leurs reseaux.</span>
              </span>
            </label>
          </>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2 pt-1">
          {step > 1 && (
            <Button type="button" variant="outline" className="py-5" onClick={() => setStep(step - 1)} disabled={loading}>
              Retour
            </Button>
          )}
          <Button type="submit" className="flex-1 py-5" style={{ backgroundColor: accentColor }} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : step === 3 ? "Activer ma carte" : "Suivant"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Deja un compte ?{" "}
          <Link href="/login" className="underline">
            Connectez-vous
          </Link>
        </p>
      </form>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-border/50 bg-card/60 p-6 sm:p-8 text-center space-y-5"
      >
        {children}
      </motion.div>
    </div>
  )
}
