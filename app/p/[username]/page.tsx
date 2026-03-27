"use client"

import { useEffect, useState, use } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Phone, Mail, MapPin, Download, Copy, Check, Send,
  Linkedin, Twitter, Instagram, Facebook, Globe, Github,
  MessageCircle, Youtube, Music, Link2
} from "lucide-react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"

interface SocialLink {
  type: string
  url: string
  label?: string
}

interface ProfileData {
  Nom_Complet: string
  Email: string
  Telephone: string
  Profession: string
  Compagnie: string
  Location: string
  URL_Photo: string
  URL_Couverture: string
  Liens_Sociaux_JSON: string
  Lead_Capture_Actif: string
  Services_JSON: string
  Couleur_Theme: string
  Cacher_Marque: string
  error?: string
}

const socialIcons: Record<string, React.ElementType> = {
  linkedin: Linkedin,
  twitter: Twitter,
  instagram: Instagram,
  facebook: Facebook,
  github: Github,
  youtube: Youtube,
  tiktok: Music,
  whatsapp: MessageCircle,
  website: Globe,
  default: Link2,
}

function getSocialIcon(type: string) {
  return socialIcons[type.toLowerCase()] || socialIcons.default
}

export default function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const resolvedParams = use(params)
  const { username } = resolvedParams
  
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState<string | null>(null)
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [leadForm, setLeadForm] = useState({ name: "", contact: "", message: "" })
  const [leadSubmitting, setLeadSubmitting] = useState(false)
  const [leadSuccess, setLeadSuccess] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      try {
        // Track the view
        const urlParams = new URLSearchParams(window.location.search)
        const source = urlParams.get("source") || "Lien"
        api.trackView(username, source)

        // Load profile data
        const data = await api.getPublicProfile(username)
        
        if (data.error) {
          setError(data.error)
        } else {
          setProfile(data)
        }
      } catch {
        setError("Profil introuvable")
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [username])

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  const downloadVCard = () => {
    if (!profile) return

    const socialLinks = parseSocialLinks(profile.Liens_Sociaux_JSON)
    const website = socialLinks.find(l => l.type === "website")?.url || ""

    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${profile.Nom_Complet}
ORG:${profile.Compagnie}
TITLE:${profile.Profession}
TEL:${profile.Telephone}
EMAIL:${profile.Email}
ADR:;;${profile.Location};;;
URL:${website}
PHOTO;TYPE=JPEG:${profile.URL_Photo}
END:VCARD`

    const blob = new Blob([vcard], { type: "text/vcard" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${profile.Nom_Complet.replace(/\s+/g, "_")}.vcf`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLeadSubmitting(true)

    try {
      await api.handleLeadCapture({
        profileUrl: username,
        name: leadForm.name,
        contact: leadForm.contact,
        message: leadForm.message,
      })
      setLeadSuccess(true)
      setLeadForm({ name: "", contact: "", message: "" })
    } catch {
      // Silent fail
    }

    setLeadSubmitting(false)
  }

  const parseSocialLinks = (json: string): SocialLink[] => {
    try {
      return JSON.parse(json || "[]")
    } catch {
      return []
    }
  }

  const accentColor = profile?.Couleur_Theme || "#007AFF"

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${accentColor}, #dc3545)` }}>
        <div className="w-full max-w-md p-6">
          <div className="bg-card/80 backdrop-blur-xl rounded-2xl p-8 shadow-2xl animate-pulse">
            <div className="w-28 h-28 mx-auto rounded-full bg-muted mb-4" />
            <div className="h-6 bg-muted rounded w-3/4 mx-auto mb-2" />
            <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-destructive/20 flex items-center justify-center">
            <span className="text-4xl">?</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Profil introuvable</h1>
          <p className="text-muted-foreground">Ce profil n&apos;existe pas ou a ete desactive.</p>
        </div>
      </div>
    )
  }

  const socialLinks = parseSocialLinks(profile.Liens_Sociaux_JSON)
  const services = (() => {
    try {
      return JSON.parse(profile.Services_JSON || "[]")
    } catch {
      return []
    }
  })()

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 py-8"
      style={{ background: `linear-gradient(135deg, ${accentColor}, #dc3545)` }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-card/85 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden">
          {/* Cover Image */}
          {profile.URL_Couverture && (
            <div 
              className="h-36 bg-cover bg-center"
              style={{ backgroundImage: `url(${profile.URL_Couverture})` }}
            />
          )}

          {/* Profile Content */}
          <div className="p-6 -mt-16 relative">
            {/* Avatar */}
            <div className="flex justify-center">
              <div 
                className="w-28 h-28 rounded-full border-4 bg-cover bg-center"
                style={{ 
                  backgroundImage: `url(${profile.URL_Photo || "/placeholder-avatar.png"})`,
                  borderColor: accentColor
                }}
              />
            </div>

            {/* Name & Title */}
            <div className="text-center mt-4">
              <h1 className="text-2xl font-bold text-foreground">{profile.Nom_Complet}</h1>
              <p className="text-muted-foreground">
                {profile.Profession}{profile.Compagnie && ` @ ${profile.Compagnie}`}
              </p>
              {profile.Location && (
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" /> {profile.Location}
                </p>
              )}
            </div>

            {/* Contact Info - Copyable */}
            <div className="space-y-3 mt-6">
              {profile.Telephone && (
                <div className="flex items-center justify-between bg-muted/30 rounded-xl p-3">
                  <span className="text-foreground">{profile.Telephone}</span>
                  <button
                    onClick={() => copyToClipboard(profile.Telephone, "phone")}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copied === "phone" ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              )}
              {profile.Email && (
                <div className="flex items-center justify-between bg-muted/30 rounded-xl p-3">
                  <span className="text-foreground text-sm">{profile.Email}</span>
                  <button
                    onClick={() => copyToClipboard(profile.Email, "email")}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copied === "email" ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <Button
                onClick={downloadVCard}
                className="flex items-center justify-center gap-2 py-4"
                style={{ backgroundColor: accentColor }}
              >
                <Download className="w-5 h-5" />
                Enregistrer
              </Button>
              {profile.Telephone && (
                <Button
                  variant="outline"
                  onClick={() => window.location.href = `tel:${profile.Telephone}`}
                  className="flex items-center justify-center gap-2 py-4"
                >
                  <Phone className="w-5 h-5" />
                  Appeler
                </Button>
              )}
              {profile.Email && (
                <Button
                  variant="outline"
                  onClick={() => window.location.href = `mailto:${profile.Email}`}
                  className="flex items-center justify-center gap-2 py-4"
                >
                  <Mail className="w-5 h-5" />
                  Email
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setShowLeadForm(!showLeadForm)}
                className="flex items-center justify-center gap-2 py-4"
              >
                <Send className="w-5 h-5" />
                Contact
              </Button>
            </div>

            {/* Social Links */}
            {socialLinks.length > 0 && (
              <div className="mt-6 space-y-2">
                {socialLinks.map((link, idx) => {
                  const Icon = getSocialIcon(link.type)
                  return (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <Icon className="w-5 h-5" style={{ color: accentColor }} />
                      <span className="text-foreground">{link.label || link.type}</span>
                    </a>
                  )
                })}
              </div>
            )}

            {/* Services */}
            {services.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-foreground mb-3">Services</h3>
                <div className="space-y-2">
                  {services.map((service: { title: string; description?: string }, idx: number) => (
                    <div 
                      key={idx}
                      className="p-3 rounded-xl bg-muted/20"
                      style={{ borderLeft: `3px solid ${accentColor}` }}
                    >
                      <h4 className="font-medium text-foreground">{service.title}</h4>
                      {service.description && (
                        <p className="text-sm text-muted-foreground">{service.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lead Capture Form */}
            <AnimatePresence>
              {(showLeadForm || profile.Lead_Capture_Actif === "OUI") && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 overflow-hidden"
                >
                  {leadSuccess ? (
                    <div className="text-center p-6 bg-green-500/10 rounded-xl border border-green-500/20">
                      <Check className="w-12 h-12 mx-auto text-green-500 mb-2" />
                      <p className="text-foreground font-medium">Message envoye !</p>
                      <p className="text-sm text-muted-foreground">Merci pour votre interet.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleLeadSubmit} className="space-y-3">
                      <h3 className="text-lg font-semibold text-foreground">Entrons en contact</h3>
                      <input
                        type="text"
                        required
                        placeholder="Votre nom"
                        value={leadForm.name}
                        onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                        className="w-full p-3 rounded-xl bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Email ou telephone"
                        value={leadForm.contact}
                        onChange={(e) => setLeadForm({ ...leadForm, contact: e.target.value })}
                        className="w-full p-3 rounded-xl bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                      />
                      <textarea
                        placeholder="Message (optionnel)"
                        value={leadForm.message}
                        onChange={(e) => setLeadForm({ ...leadForm, message: e.target.value })}
                        className="w-full p-3 rounded-xl bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 min-h-[80px]"
                      />
                      <Button
                        type="submit"
                        disabled={leadSubmitting}
                        className="w-full py-4"
                        style={{ backgroundColor: accentColor }}
                      >
                        {leadSubmitting ? "Envoi..." : "Envoyer"}
                      </Button>
                    </form>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mahu Branding */}
            {profile.Cacher_Marque !== "OUI" && (
              <div className="mt-8 text-center">
                <a
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors opacity-60"
                >
                  <span>Cree avec</span>
                  <span className="font-bold">Mahu</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
