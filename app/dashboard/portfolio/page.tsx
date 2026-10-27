"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ExternalLink, ImagePlus, Loader2, Plus, Trash2, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/hooks/use-auth"
import { callAppScript } from "@/lib/api"
import { uploadToCloudinary, uploadVideoToCloudinary } from "@/lib/cloudinary"
import { buildCardPreviewHtml } from "@/lib/student-cards-print"
import { PORTFOLIO_PRICE, PORTFOLIO_TEMPLATES, emptyPortfolio, videoEmbed, type Portfolio, type PortfolioItem } from "@/lib/portfolio"

// Editeur du portfolio etudiant (offre a 3 500 FCFA, valable un an).
// Le contenu est le meme pour les 5 modeles : changer de modele ne perd rien.

type ListKey = "projects" | "experiences" | "education"

const LISTS: Array<{ key: ListKey; title: string; add: string; withOrg: boolean; withMedia: boolean }> = [
  { key: "projects", title: "Projets", add: "Ajouter un projet", withOrg: false, withMedia: true },
  { key: "experiences", title: "Expériences (stages, jobs, associations)", add: "Ajouter une expérience", withOrg: true, withMedia: false },
  { key: "education", title: "Formation", add: "Ajouter une formation", withOrg: true, withMedia: false },
]

export default function PortfolioEditorPage() {
  const { token, dashboardData } = useAuth()
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(false)
  const [profileUrl, setProfileUrl] = useState("")
  const [p, setP] = useState<Portfolio>(emptyPortfolio())
  const [skills, setSkills] = useState("")
  const [languages, setLanguages] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [uploading, setUploading] = useState<number | null>(null)
  const [uploadingVideo, setUploadingVideo] = useState<number | null>(null)

  useEffect(() => {
    if (!token) return
    callAppScript("getPortfolio", {}, token).then((res) => {
      const r = res as unknown as { success: boolean; active: boolean; portfolio?: Portfolio; profileUrl?: string }
      setActive(!!r.active)
      setProfileUrl(r.profileUrl || "")
      if (r.portfolio) {
        const loaded = { ...emptyPortfolio(), ...r.portfolio }
        setP(loaded)
        setSkills(loaded.skills.join(", "))
        setLanguages(loaded.languages.join(", "))
      }
      setLoading(false)
    })
  }, [token])

  const skillList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean)

  // Apercu de la carte imprimee, mis a jour pendant la saisie.
  const [cardHtml, setCardHtml] = useState("")
  const cardName = dashboardData?.profile?.Nom_Complet || ""
  useEffect(() => {
    if (!active || !profileUrl) return
    const t = setTimeout(() => {
      buildCardPreviewHtml({
        id: "apercu", name: cardName || "Ton nom", profileUrl, title: p.title, skills: skillList(skills), field: p.field,
        expiresAt: p.expiresAt || new Date().toISOString(),
      }).then(setCardHtml)
    }, 300)
    return () => clearTimeout(t)
  }, [active, profileUrl, cardName, p.title, skills, p.field, p.expiresAt])

  const set = <K extends keyof Portfolio>(k: K, v: Portfolio[K]) => setP((prev) => ({ ...prev, [k]: v }))
  const setItem = (key: ListKey, i: number, field: keyof PortfolioItem, value: string) =>
    setP((prev) => ({ ...prev, [key]: prev[key].map((it, j) => (j === i ? { ...it, [field]: value } : it)) }))
  const addItem = (key: ListKey) => setP((prev) => ({ ...prev, [key]: [...prev[key], { title: "" }] }))
  const removeItem = (key: ListKey, i: number) => setP((prev) => ({ ...prev, [key]: prev[key].filter((_, j) => j !== i) }))

  const uploadProjectImage = async (i: number, file?: File) => {
    if (!file) return
    setUploading(i)
    const res = await uploadToCloudinary(file)
    setUploading(null)
    if (res.success && res.url) setItem("projects", i, "imageUrl", res.url)
    else setMessage({ ok: false, text: res.error || "Image non envoyée, réessaie." })
  }

  // Videos de realisation : 100 Mo max, au-dela on conseille YouTube.
  const uploadProjectVideo = async (i: number, file?: File) => {
    if (!file) return
    if (file.size > 100 * 1024 * 1024) {
      setMessage({ ok: false, text: "Vidéo trop lourde (100 Mo max). Mets-la sur YouTube et colle le lien." })
      return
    }
    setUploadingVideo(i)
    const res = await uploadVideoToCloudinary(file)
    setUploadingVideo(null)
    if (res.success && res.url) setItem("projects", i, "videoUrl", res.url)
    else setMessage({ ok: false, text: res.error || "Vidéo non envoyée, réessaie." })
  }

  const save = async () => {
    if (!token) return
    setSaving(true)
    setMessage(null)
    const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean)
    const payload = { ...p, skills: split(skills), languages: split(languages) }
    const res = await callAppScript("savePortfolio", payload as unknown as Record<string, unknown>, token)
    setSaving(false)
    setMessage(res.success ? { ok: true, text: "Portfolio enregistré." } : { ok: false, text: res.error || "Erreur, réessaie." })
  }

  if (loading) {
    return <div className="flex justify-center p-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }

  if (!active) {
    return (
      <div className="mx-auto max-w-xl p-6 md:p-10">
        <div className="rounded-2xl border bg-card p-8 text-center">
          <h1 className="text-2xl font-bold">Mon portfolio</h1>
          <p className="mt-2 text-muted-foreground">
            {p.expiresAt ? "Ton portfolio a expiré." : "Tu n'as pas encore de portfolio."} L'offre étudiante comprend ton portfolio en ligne et ta
            carte digitale professionnelle, pour {PORTFOLIO_PRICE} pendant un an.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <Link href="/etudiants" className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">Découvrir l'offre étudiante</Link>
            <p className="text-sm text-muted-foreground">Déjà inscrit ? Écris-nous à contact@mahu.cards : on active l'offre directement sur ton compte.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6 md:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mon portfolio</h1>
          {p.expiresAt && <p className="text-sm text-muted-foreground">Actif jusqu'au {new Date(p.expiresAt).toLocaleDateString("fr-FR")}</p>}
        </div>
        {profileUrl && (
          <Link href={`/portfolio/${profileUrl}`} target="_blank" className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold">
            Voir mon portfolio <ExternalLink className="h-4 w-4" />
          </Link>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">Modèle</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PORTFOLIO_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => set("template", t.id)}
              className={`rounded-xl border p-4 text-left transition ${p.template === t.id ? "border-primary bg-primary/10" : "hover:border-primary/40"}`}
            >
              <p className="font-bold">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.tagline}</p>
              <span
                role="link"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); window.open(`/portfolio/modeles/${t.id}`, "_blank") }}
                className="mt-2 inline-block text-xs text-primary"
              >
                Voir l'exemple
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="title">Ton métier</Label>
          <Input id="title" maxLength={60} value={p.title || ""} onChange={(e) => set("title", e.target.value)} placeholder="Technicien en mécatronique, Développeuse web, Comptable..." />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="headline">Ta phrase d'accroche</Label>
          <Input id="headline" maxLength={140} value={p.headline} onChange={(e) => set("headline", e.target.value)} placeholder="Étudiante en informatique, passionnée de design d'applications" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="school">École / université</Label>
          <Input id="school" value={p.school} onChange={(e) => set("school", e.target.value)} placeholder="Université Cheikh Anta Diop" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="field">Filière</Label>
          <Input id="field" value={p.field} onChange={(e) => set("field", e.target.value)} placeholder="Informatique" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="level">Niveau</Label>
          <Input id="level" value={p.level} onChange={(e) => set("level", e.target.value)} placeholder="Licence 3" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cv">Lien vers ton CV (PDF en ligne)</Label>
          <Input id="cv" value={p.cvUrl || ""} onChange={(e) => set("cvUrl", e.target.value)} placeholder="https://..." />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="about">À propos de toi</Label>
          <Textarea id="about" rows={4} maxLength={2000} value={p.about} onChange={(e) => set("about", e.target.value)} placeholder="Ce que tu aimes faire, ce que tu cherches (stage, emploi, alternance)..." />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="skills">Compétences (séparées par des virgules)</Label>
          <Input id="skills" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="React, Excel, Prise de parole" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="languages">Langues</Label>
          <Input id="languages" value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="Français, Wolof, Anglais" />
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-semibold">Ta carte professionnelle</h2>
          <p className="text-sm text-muted-foreground">
            Elle est imprimée avec ton nom{cardName ? "" : " (à renseigner dans ton profil)"}, ton métier et tes premières compétences. Le QR code ouvre ton portfolio.
          </p>
        </div>
        {cardHtml && <iframe title="Aperçu de ta carte" srcDoc={cardHtml} className="h-[440px] w-full rounded-xl border-0 sm:h-[230px]" />}
      </section>

      {LISTS.map((list) => (
        <section key={list.key} className="space-y-3">
          <h2 className="font-semibold">{list.title}</h2>
          {p[list.key].map((it, i) => (
            <div key={i} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
              <Input value={it.title} onChange={(e) => setItem(list.key, i, "title", e.target.value)} placeholder="Titre" className="sm:col-span-2" />
              {list.withOrg && (
                <>
                  <Input value={it.org || ""} onChange={(e) => setItem(list.key, i, "org", e.target.value)} placeholder="Entreprise / école" />
                  <Input value={it.period || ""} onChange={(e) => setItem(list.key, i, "period", e.target.value)} placeholder="Période (ex. 2025 – 2026)" />
                </>
              )}
              <Textarea value={it.description || ""} rows={2} onChange={(e) => setItem(list.key, i, "description", e.target.value)} placeholder="Description" className="sm:col-span-2" />
              {list.withMedia && (
                <>
                  <Input value={it.link || ""} onChange={(e) => setItem(list.key, i, "link", e.target.value)} placeholder="Lien (site, GitHub, vidéo...)" />
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
                    {uploading === i ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    {it.imageUrl ? "Changer l'image" : "Ajouter une image"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadProjectImage(i, e.target.files?.[0])} />
                  </label>
                  <Input
                    value={it.tools || ""}
                    onChange={(e) => setItem(list.key, i, "tools", e.target.value)}
                    placeholder="Outils, machines, logiciels (ex. SolidWorks, tour, Arduino)"
                    className="sm:col-span-2"
                  />
                  <Input
                    value={it.videoUrl || ""}
                    onChange={(e) => setItem(list.key, i, "videoUrl", e.target.value)}
                    placeholder="Vidéo de la réalisation (lien YouTube ou Vimeo)"
                  />
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
                    {uploadingVideo === i ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                    {uploadingVideo === i ? "Envoi de la vidéo..." : it.videoUrl ? "Changer la vidéo" : "Envoyer une vidéo"}
                    <input type="file" accept="video/*" className="hidden" onChange={(e) => uploadProjectVideo(i, e.target.files?.[0])} />
                  </label>
                  {it.videoUrl && !videoEmbed(it.videoUrl) && (
                    <p className="text-xs text-destructive sm:col-span-2">Ce lien vidéo n&apos;est pas lisible : utilise un lien YouTube, Vimeo ou envoie le fichier.</p>
                  )}
                </>
              )}
              <button type="button" onClick={() => removeItem(list.key, i)} className="inline-flex items-center gap-1 text-sm text-destructive sm:col-span-2">
                <Trash2 className="h-4 w-4" /> Retirer
              </button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => addItem(list.key)}><Plus className="mr-2 h-4 w-4" />{list.add}</Button>
        </section>
      ))}

      <div className="sticky bottom-0 flex flex-wrap items-center gap-4 border-t bg-background/95 py-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <Switch id="published" checked={p.published} onCheckedChange={(v) => set("published", v)} />
          <Label htmlFor="published">Portfolio visible en ligne</Label>
        </div>
        <Button onClick={save} disabled={saving} className="ml-auto">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enregistrer
        </Button>
        {message && <p className={`w-full text-sm ${message.ok ? "text-green-600" : "text-destructive"}`}>{message.text}</p>}
      </div>
    </div>
  )
}
