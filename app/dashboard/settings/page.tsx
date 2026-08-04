"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import {
  Bell, Shield, Globe, Palette, User,
  CreditCard, Download, Trash2, Plug, Video, Upload, X,
  ChevronRight, Moon, Sun, Loader2, Check, LogOut
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import {
  gmailApi, socialApi, publishApi,
  type GmailStatus, type SocialProvider, type SocialStatus, type PublishResult,
} from "@/lib/connectors-api"
import { uploadVideoToCloudinary } from "@/lib/cloudinary"

const SOCIAL_CONNECTORS: Array<{ id: SocialProvider; label: string; hint: string; autoConnected?: boolean }> = [
  { id: "facebook", label: "Facebook", hint: "Publie sur ta Page Facebook" },
  {
    id: "instagram",
    label: "Instagram",
    hint: "Connecte automatiquement si ta Page Facebook a un compte Instagram Business lie",
    autoConnected: true,
  },
  { id: "youtube", label: "YouTube", hint: "Publie une video (privee par defaut)" },
  { id: "tiktok", label: "TikTok", hint: "Publie une video (privee tant que l'app n'est pas auditee par TikTok)" },
  { id: "linkedin", label: "LinkedIn", hint: "Publie une video sur ton profil LinkedIn" },
]

const settingsSections = [
  {
    title: "Notifications",
    icon: Bell,
    settings: [
      { id: "email_notif", label: "Notifications par email", description: "Recevoir des alertes de nouveaux contacts", type: "toggle" },
      { id: "push_notif", label: "Notifications push", description: "Alertes en temps reel sur votre appareil", type: "toggle" },
      { id: "weekly_report", label: "Rapport hebdomadaire", description: "Resume de vos performances chaque semaine", type: "toggle" },
    ],
  },
  {
    title: "Securite",
    icon: Shield,
    settings: [
      { id: "2fa", label: "Authentification a deux facteurs", description: "Ajouter une couche de securite supplementaire", type: "toggle" },
      { id: "sessions", label: "Sessions actives", description: "Gerer les appareils connectes", type: "action" },
      { id: "password", label: "Changer le mot de passe", description: "Modifier votre mot de passe actuel", type: "action" },
    ],
  },
  {
    title: "Apparence",
    icon: Palette,
    settings: [
      { id: "theme", label: "Theme", description: "Choisir le mode d'affichage", type: "theme" },
      { id: "lang", label: "Langue", description: "Changer la langue de l'interface", type: "select", options: ["Francais", "English", "Espanol"] },
    ],
  },
  {
    title: "Abonnement",
    icon: CreditCard,
    settings: [
      { id: "plan", label: "Plan actuel", description: "Gratuit - Passer a Pro pour plus de fonctionnalites", type: "info" },
      { id: "billing", label: "Facturation", description: "Gerer vos moyens de paiement", type: "action" },
    ],
  },
  {
    title: "Donnees",
    icon: Download,
    settings: [
      { id: "export", label: "Exporter mes donnees", description: "Telecharger toutes vos donnees", type: "action" },
      { id: "delete", label: "Supprimer mon compte", description: "Supprimer definitivement votre compte", type: "danger" },
    ],
  },
]

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsPageInner />
    </Suspense>
  )
}

// useSearchParams() (utilise pour le retour ?gmail=connected|error) exige une
// limite Suspense autour de tout composant qui l'appelle.
function SettingsPageInner() {
  const { dashboardData, logout, token } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [toggles, setToggles] = useState<Record<string, boolean>>({
    email_notif: true,
    push_notif: true,
    weekly_report: false,
    "2fa": false,
  })
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [gmailStatus, setGmailStatus] = useState<GmailStatus | null>(null)
  const [gmailLoading, setGmailLoading] = useState(false)
  const [gmailMessage, setGmailMessage] = useState<string | null>(null)

  const [socialStatus, setSocialStatus] = useState<Partial<Record<SocialProvider, SocialStatus>>>({})
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null)
  const [socialMessage, setSocialMessage] = useState<string | null>(null)

  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoTitle, setVideoTitle] = useState("")
  const [videoCaption, setVideoCaption] = useState("")
  const [videoPlatforms, setVideoPlatforms] = useState<SocialProvider[]>([])
  const [videoStep, setVideoStep] = useState<"idle" | "uploading" | "publishing">("idle")
  const [videoResults, setVideoResults] = useState<Partial<Record<SocialProvider, PublishResult>> | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)

  const profile = dashboardData?.profile
  const user = dashboardData?.user

  const displayName = profile?.Nom_Complet || user?.Email?.split("@")[0] || "Utilisateur"
  const email = user?.Email || ""
  const initials = displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)

  useEffect(() => {
    if (!token) return
    gmailApi.getStatus(token).then(setGmailStatus).catch(() => {})
  }, [token])

  useEffect(() => {
    const gmailParam = searchParams.get("gmail")
    if (!gmailParam) return
    setGmailMessage(gmailParam === "connected" ? "Gmail connecte avec succes." : "Echec de la connexion Gmail.")
    router.replace("/dashboard/settings")
    const timeout = setTimeout(() => setGmailMessage(null), 5000)
    return () => clearTimeout(timeout)
  }, [searchParams, router])

  useEffect(() => {
    if (!token) return
    SOCIAL_CONNECTORS.forEach(({ id }) => {
      socialApi
        .getStatus(token, id)
        .then((status) => setSocialStatus((prev) => ({ ...prev, [id]: status })))
        .catch(() => {})
    })
  }, [token])

  useEffect(() => {
    for (const { id, label } of SOCIAL_CONNECTORS) {
      const param = searchParams.get(id)
      if (!param) continue
      setSocialMessage(param === "connected" ? `${label} connecte avec succes.` : `Echec de la connexion ${label}.`)
      router.replace("/dashboard/settings")
      const timeout = setTimeout(() => setSocialMessage(null), 5000)
      return () => clearTimeout(timeout)
    }
  }, [searchParams, router])

  const handleConnectSocial = async (provider: SocialProvider) => {
    if (!token) return
    setSocialLoading(provider)
    try {
      const { authUrl } = await socialApi.getAuthUrl(token, provider)
      window.location.href = authUrl
    } catch (err) {
      setSocialMessage(err instanceof Error ? err.message : "Erreur de connexion")
      setSocialLoading(null)
    }
  }

  const handleDisconnectSocial = async (provider: SocialProvider) => {
    if (!token) return
    setSocialLoading(provider)
    try {
      await socialApi.disconnect(token, provider)
      setSocialStatus((prev) => ({ ...prev, [provider]: { connected: false } }))
    } catch (err) {
      setSocialMessage(err instanceof Error ? err.message : "Erreur de deconnexion")
    } finally {
      setSocialLoading(null)
    }
  }

  const toggleVideoPlatform = (provider: SocialProvider) => {
    setVideoPlatforms((prev) =>
      prev.includes(provider) ? prev.filter((p) => p !== provider) : [...prev, provider],
    )
  }

  const handlePublishVideo = async () => {
    if (!token || !videoFile || videoPlatforms.length === 0) return
    setVideoError(null)
    setVideoResults(null)
    setVideoStep("uploading")
    try {
      const upload = await uploadVideoToCloudinary(videoFile)
      if (!upload.success || !upload.url) {
        setVideoError(upload.error || "Erreur d'upload de la video")
        setVideoStep("idle")
        return
      }
      setVideoStep("publishing")
      const { results } = await publishApi.publishVideo(token, upload.url, videoTitle, videoCaption, videoPlatforms)
      setVideoResults(results)
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : "Erreur de publication")
    } finally {
      setVideoStep("idle")
    }
  }

  const handleConnectGmail = async () => {
    if (!token) return
    setGmailLoading(true)
    try {
      const { authUrl } = await gmailApi.getAuthUrl(token)
      window.location.href = authUrl
    } catch (err) {
      setGmailMessage(err instanceof Error ? err.message : "Erreur de connexion Gmail")
      setGmailLoading(false)
    }
  }

  const handleDisconnectGmail = async () => {
    if (!token) return
    setGmailLoading(true)
    try {
      await gmailApi.disconnect(token)
      setGmailStatus({ connected: false })
    } catch (err) {
      setGmailMessage(err instanceof Error ? err.message : "Erreur de deconnexion Gmail")
    } finally {
      setGmailLoading(false)
    }
  }

  const handleToggle = (id: string) => {
    setToggles((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleSave = async () => {
    setSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setSaving(false)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  const handleLogout = () => {
    logout()
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Parametres</h1>
          <p className="text-muted-foreground">Gerez vos preferences et votre compte</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90">
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : saveSuccess ? (
            <Check className="w-4 h-4 mr-2" />
          ) : null}
          {saveSuccess ? "Sauvegarde !" : "Sauvegarder"}
        </Button>
      </motion.div>

      {/* User Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm overflow-hidden"
      >
        <div className="flex items-center gap-4 p-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-xl font-bold text-primary">{initials}</span>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground text-lg">{displayName}</h3>
            <p className="text-muted-foreground">{email}</p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="border-destructive/50 text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Deconnexion
          </Button>
        </div>
      </motion.div>

      {/* Connecteurs Mahu */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm overflow-hidden"
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50">
          <div className="p-2 rounded-lg bg-primary/10">
            <Plug className="w-5 h-5 text-primary" />
          </div>
          <h2 className="font-semibold text-foreground">Connecteurs</h2>
        </div>
        <div className="divide-y divide-border/30">
          <div className="px-6 py-4">
            {gmailMessage && (
              <p className="text-sm text-primary mb-3">{gmailMessage}</p>
            )}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">Gmail</p>
                <p className="text-sm text-muted-foreground truncate">
                  {gmailStatus?.connected
                    ? `Connecte - ${gmailStatus.email}`
                    : "Envoie des emails depuis ta propre adresse Gmail (ex: relancer un prospect)"}
                </p>
              </div>
              {gmailStatus?.connected ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDisconnectGmail}
                  disabled={gmailLoading}
                  className="border-destructive/50 text-destructive hover:bg-destructive/10"
                >
                  {gmailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Deconnecter"}
                </Button>
              ) : (
                <Button size="sm" onClick={handleConnectGmail} disabled={gmailLoading}>
                  {gmailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Connecter"}
                </Button>
              )}
            </div>
          </div>

          {socialMessage && (
            <div className="px-6 pt-4">
              <p className="text-sm text-primary">{socialMessage}</p>
            </div>
          )}
          {SOCIAL_CONNECTORS.map(({ id, label, hint, autoConnected }) => {
            const status = socialStatus[id]
            const loading = socialLoading === id
            return (
              <div key={id} className="px-6 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{label}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {status?.connected ? `Connecte - ${status.name}` : hint}
                    </p>
                  </div>
                  {status?.connected ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDisconnectSocial(id)}
                      disabled={loading}
                      className="border-destructive/50 text-destructive hover:bg-destructive/10"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Deconnecter"}
                    </Button>
                  ) : autoConnected ? null : (
                    <Button size="sm" onClick={() => handleConnectSocial(id)} disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Connecter"}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* Publier une video sur plusieurs reseaux a la fois */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.09 }}
        className="rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm overflow-hidden"
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50">
          <div className="p-2 rounded-lg bg-primary/10">
            <Video className="w-5 h-5 text-primary" />
          </div>
          <h2 className="font-semibold text-foreground">Publier une video</h2>
        </div>
        <div className="px-6 py-4 space-y-4">
          {SOCIAL_CONNECTORS.every(({ id }) => !socialStatus[id]?.connected) ? (
            <p className="text-sm text-muted-foreground">
              Connecte au moins un reseau ci-dessus pour pouvoir publier une video.
            </p>
          ) : (
            <>
              <div>
                {videoFile ? (
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/30 border border-border/50">
                    <span className="text-sm text-foreground truncate">{videoFile.name}</span>
                    <button onClick={() => setVideoFile(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed border-border/50 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors cursor-pointer">
                    <Upload className="w-4 h-4" />
                    Choisir une video
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                )}
              </div>
              <input
                type="text"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="Titre"
                className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border/50 text-foreground focus:outline-none focus:border-primary/50"
              />
              <textarea
                value={videoCaption}
                onChange={(e) => setVideoCaption(e.target.value)}
                placeholder="Description / legende"
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border/50 text-foreground resize-none focus:outline-none focus:border-primary/50"
              />
              <div className="flex flex-wrap gap-3">
                {SOCIAL_CONNECTORS.filter(({ id }) => socialStatus[id]?.connected).map(({ id, label }) => (
                  <label key={id} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={videoPlatforms.includes(id)}
                      onChange={() => toggleVideoPlatform(id)}
                      className="w-4 h-4 rounded bg-muted/50 border-border/50"
                    />
                    {label}
                  </label>
                ))}
              </div>
              {videoError && <p className="text-sm text-destructive">{videoError}</p>}
              {videoResults && (
                <div className="space-y-1">
                  {Object.entries(videoResults).map(([platform, result]) => (
                    <p key={platform} className={`text-sm ${result.success ? "text-primary" : "text-destructive"}`}>
                      {platform} : {result.success ? "publie" : result.error}
                    </p>
                  ))}
                </div>
              )}
              <Button
                onClick={handlePublishVideo}
                disabled={!videoFile || videoPlatforms.length === 0 || videoStep !== "idle"}
              >
                {videoStep === "uploading" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Envoi de la video...
                  </>
                ) : videoStep === "publishing" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Publication...
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4 mr-2" /> Publier
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </motion.div>

      {/* Settings Sections */}
      {settingsSections.map((section, sectionIndex) => (
        <motion.div
          key={section.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: (sectionIndex + 1) * 0.1 }}
          className="rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm overflow-hidden"
        >
          {/* Section Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50">
            <div className="p-2 rounded-lg bg-primary/10">
              <section.icon className="w-5 h-5 text-primary" />
            </div>
            <h2 className="font-semibold text-foreground">{section.title}</h2>
          </div>

          {/* Settings List */}
          <div className="divide-y divide-border/30">
            {section.settings.map((setting, index) => (
              <motion.div
                key={setting.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: sectionIndex * 0.1 + index * 0.05 }}
                className="flex items-center justify-between px-6 py-4 hover:bg-muted/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{setting.label}</p>
                  <p className="text-sm text-muted-foreground truncate">{setting.description}</p>
                </div>

                {/* Toggle */}
                {setting.type === "toggle" && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleToggle(setting.id)}
                    className={`relative w-12 h-7 rounded-full transition-colors ${
                      toggles[setting.id] ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <motion.div
                      initial={false}
                      animate={{ x: toggles[setting.id] ? 22 : 2 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md"
                    />
                  </motion.button>
                )}

                {/* Theme Toggle */}
                {setting.type === "theme" && (
                  <div className="flex items-center gap-2 p-1 rounded-lg bg-muted/50">
                    <button
                      onClick={() => setTheme("dark")}
                      className={`p-2 rounded-md transition-colors ${
                        theme === "dark" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Moon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setTheme("light")}
                      className={`p-2 rounded-md transition-colors ${
                        theme === "light" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Sun className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Select */}
                {setting.type === "select" && setting.options && (
                  <select className="px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-foreground text-sm">
                    {setting.options.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                )}

                {/* Action */}
                {setting.type === "action" && (
                  <motion.button
                    whileHover={{ x: 4 }}
                    className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </motion.button>
                )}

                {/* Info */}
                {setting.type === "info" && (
                  <Button size="sm" variant="outline" className="border-primary/50 text-primary hover:bg-primary/10">
                    Passer a Pro
                  </Button>
                )}

                {/* Danger */}
                {setting.type === "danger" && (
                  <Button size="sm" variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  )
}
