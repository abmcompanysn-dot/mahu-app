"use client"

import { useRef, useState } from "react"
import { ImagePlus, Loader2, Plus, Save, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { adminApi, type UserDetails } from "@/lib/admin-api"
import { isNumberLink, linkHref } from "@/lib/link-href"
import { uploadToCloudinary } from "@/lib/cloudinary"

type Profile = NonNullable<UserDetails["profile"]>
type Link = { type: string; url: string; label: string }

const LINK_TYPES: Array<[string, string]> = [
  ["whatsapp", "WhatsApp"], ["instagram", "Instagram"], ["facebook", "Facebook"], ["tiktok", "TikTok"],
  ["linkedin", "LinkedIn"], ["twitter", "X (Twitter)"], ["youtube", "YouTube"], ["snapchat", "Snapchat"],
  ["telegram", "Telegram"], ["threads", "Threads"], ["pinterest", "Pinterest"], ["github", "GitHub"], ["website", "Site web"],
  ["phone", "Telephone (appel)"], ["email", "Email"],
]

const PLACEHOLDER: Record<string, string> = {
  whatsapp: "+221 77 123 45 67", phone: "+221 77 123 45 67", email: "contact@exemple.com",
}

const TEXT_FIELDS: Array<[keyof Profile, string, string]> = [
  ["nomComplet", "Nom_Complet", "Nom affiche"],
  ["profession", "Profession", "Profession"],
  ["compagnie", "Compagnie", "Entreprise"],
  ["location", "Location", "Ville / adresse"],
  ["telephone", "Telephone", "Telephone"],
  ["emailPublic", "Email_Public", "Email affiche (vide = email du compte)"],
  ["couleurTheme", "Couleur_Theme", "Couleur du profil (ex. #2E9E3E)"],
]

function parseLinks(json?: string): Link[] {
  try {
    const parsed = JSON.parse(json || "[]")
    if (!Array.isArray(parsed)) return []
    return parsed.map((l) => ({ type: String(l?.type || "website"), url: String(l?.url || ""), label: String(l?.label || "") }))
  } catch {
    return []
  }
}

// Editeur admin du profil public d'un client (PATCH /api/admin/users/{id}/profile) :
// textes, reseaux (nom affiche compris), photo et couverture. N'envoie que ce qui a change.
export function UserProfileEditor({
  token,
  userId,
  profile,
  onSaved,
  slug,
}: {
  token: string
  userId: string
  profile: Profile
  onSaved: (p: Profile) => void
  // Profil en plus du client (multi-profils) ; absent = profil principal
  slug?: string
}) {
  const initialLinks = parseLinks(profile.liensSociauxJson)
  const [texts, setTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(TEXT_FIELDS.map(([k]) => [k, String(profile[k] ?? "")])),
  )
  const [links, setLinks] = useState<Link[]>(initialLinks)
  const [photo, setPhoto] = useState(profile.urlPhoto || "")
  const [cover, setCover] = useState(profile.urlCouverture || "")
  const [state, setState] = useState<"idle" | "saving" | "uploading" | "done" | "error">("idle")
  const [message, setMessage] = useState("")
  const photoInput = useRef<HTMLInputElement>(null)
  const coverInput = useRef<HTMLInputElement>(null)

  const setLink = (i: number, patch: Partial<Link>) => setLinks((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)))

  const upload = async (file: File | undefined, set: (url: string) => void) => {
    if (!file) return
    setState("uploading")
    setMessage("")
    const res = await uploadToCloudinary(file)
    if (res.success && res.url) {
      set(res.url)
      setState("idle")
    } else {
      setState("error")
      setMessage(res.error || "Envoi de l'image impossible")
    }
  }

  const save = async () => {
    const fields: Record<string, string> = {}
    for (const [k, apiKey] of TEXT_FIELDS) {
      if ((texts[k] ?? "") !== String(profile[k] ?? "")) fields[apiKey] = texts[k] ?? ""
    }
    // un numero tape (WhatsApp / telephone) devient wa.me/... ou tel:+..., une adresse email devient mailto:
    const cleanLinks = links.filter((l) => l.url.trim()).map((l) => ({ ...l, url: linkHref(l.type, l.url) }))
    if (JSON.stringify(cleanLinks) !== JSON.stringify(initialLinks)) fields.Liens_Sociaux_JSON = JSON.stringify(cleanLinks)
    if (photo !== (profile.urlPhoto || "")) fields.URL_Photo = photo
    if (cover !== (profile.urlCouverture || "")) fields.URL_Couverture = cover
    if (Object.keys(fields).length === 0) {
      setState("done")
      setMessage("Aucun changement.")
      return
    }
    setState("saving")
    setMessage("")
    try {
      await adminApi.updateUserProfile(token, userId, fields, slug)
      setState("done")
      setMessage("Profil mis a jour : visible tout de suite sur la carte du client.")
      onSaved({
        ...profile,
        ...(Object.fromEntries(TEXT_FIELDS.map(([k]) => [k, texts[k] ?? ""])) as Partial<Profile>),
        liensSociauxJson: JSON.stringify(cleanLinks),
        urlPhoto: photo,
        urlCouverture: cover,
      })
    } catch (err) {
      setState("error")
      setMessage(err instanceof Error ? err.message : "Echec de l'enregistrement")
    }
  }

  const busy = state === "saving" || state === "uploading"

  return (
    <div className="space-y-4 rounded-lg border border-border/60 p-4">
      <div className="grid sm:grid-cols-2 gap-3">
        {TEXT_FIELDS.map(([k, , label]) => (
          <label key={k} className="space-y-1 text-xs text-muted-foreground">
            {label}
            <Input value={texts[k] ?? ""} onChange={(e) => setTexts((t) => ({ ...t, [k]: e.target.value }))} />
          </label>
        ))}
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground">
          Reseaux et numeros - laisser « Nom affiche » vide pour afficher le nom du reseau (ex. « Instagram »)
        </div>
        {links.map((l, i) => (
          <div key={i} className="grid grid-cols-[7.5rem_1fr_9rem_auto] gap-2 items-center">
            <select
              value={l.type}
              onChange={(e) => setLink(i, { type: e.target.value })}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              {LINK_TYPES.some(([v]) => v === l.type) ? null : <option value={l.type}>{l.type}</option>}
              {LINK_TYPES.map(([v, name]) => (
                <option key={v} value={v}>{name}</option>
              ))}
            </select>
            <Input placeholder={PLACEHOLDER[l.type] || "https://..."} inputMode={isNumberLink(l.type) ? "tel" : undefined} value={l.url} onChange={(e) => setLink(i, { url: e.target.value })} />
            <Input placeholder="Nom affiche" value={l.label} onChange={(e) => setLink(i, { label: e.target.value })} />
            <Button type="button" size="icon" variant="ghost" onClick={() => setLinks((ls) => ls.filter((_, j) => j !== i))} aria-label="Supprimer le lien">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={() => setLinks((ls) => [...ls, { type: "website", url: "", label: "" }])}>
          <Plus className="w-4 h-4 mr-1" /> Ajouter un lien
        </Button>
        <Button type="button" size="sm" variant="outline" className="ml-2" onClick={() => setLinks((ls) => [...ls, { type: "whatsapp", url: "", label: "" }])}>
          <Plus className="w-4 h-4 mr-1" /> Numero WhatsApp
        </Button>
        <Button type="button" size="sm" variant="outline" className="ml-2" onClick={() => setLinks((ls) => [...ls, { type: "phone", url: "", label: "" }])}>
          <Plus className="w-4 h-4 mr-1" /> Numero d&apos;appel
        </Button>
        <div className="text-[11px] text-muted-foreground">
          Pour un numero, tapez-le simplement (ex. +221 71 095 64 64) : WhatsApp ouvre la discussion, « Numero d&apos;appel » lance l&apos;appel.
          Nom affiche conseille : « Numero commercial », « Bureau »...
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {([["Photo de profil", photo, setPhoto, photoInput], ["Couverture", cover, setCover, coverInput]] as const).map(
          ([label, url, set, ref]) => (
            <div key={label} className="space-y-1 text-xs text-muted-foreground">
              {label}
              <div className="flex items-center gap-2">
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="" className="h-12 w-20 rounded object-cover bg-muted" />
                ) : (
                  <div className="h-12 w-20 rounded bg-muted" />
                )}
                <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0], set)} />
                <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => ref.current?.click()}>
                  <ImagePlus className="w-4 h-4 mr-1" /> Changer
                </Button>
              </div>
            </div>
          ),
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" disabled={busy} onClick={save}>
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Enregistrer le profil
        </Button>
        {message && <span className={`text-xs ${state === "error" ? "text-destructive" : "text-emerald-500"}`}>{message}</span>}
      </div>
    </div>
  )
}
