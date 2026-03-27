"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  User, Briefcase, Link as LinkIcon, Palette, 
  Camera, Save, Loader2, Plus, Trash2, Check,
  Linkedin, Twitter, Instagram, Globe, Github, Mail, Phone, Facebook, Youtube, MessageCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PhonePreview } from "@/components/dashboard/phone-preview"
import { useAuth } from "@/hooks/use-auth"
import { api } from "@/lib/api"

const tabs = [
  { id: "images", label: "Images du profil", icon: Camera },
  { id: "info", label: "Informations", icon: User },
  { id: "links", label: "Liens sociaux", icon: LinkIcon },
  { id: "style", label: "Apparence", icon: Palette },
]

const socialPlatforms = [
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, placeholder: "https://linkedin.com/in/username" },
  { id: "twitter", label: "Twitter", icon: Twitter, placeholder: "https://twitter.com/username" },
  { id: "instagram", label: "Instagram", icon: Instagram, placeholder: "https://instagram.com/username" },
  { id: "facebook", label: "Facebook", icon: Facebook, placeholder: "https://facebook.com/username" },
  { id: "github", label: "GitHub", icon: Github, placeholder: "https://github.com/username" },
  { id: "youtube", label: "YouTube", icon: Youtube, placeholder: "https://youtube.com/@username" },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, placeholder: "+33612345678" },
  { id: "website", label: "Site web", icon: Globe, placeholder: "https://votre-site.com" },
  { id: "email", label: "Email", icon: Mail, placeholder: "email@exemple.com" },
  { id: "phone", label: "Telephone", icon: Phone, placeholder: "+33 6 12 34 56 78" },
]

const accentColors = [
  { name: "Bleu", value: "#007AFF" },
  { name: "Vert", value: "#34C759" },
  { name: "Violet", value: "#AF52DE" },
  { name: "Rose", value: "#FF2D55" },
  { name: "Orange", value: "#FF9500" },
  { name: "Cyan", value: "#5AC8FA" },
  { name: "Rouge", value: "#dc3545" },
  { name: "Jaune", value: "#FFCC00" },
]

interface SocialLink {
  type: string
  url: string
  label?: string
}

export default function ProfilePage() {
  const { token, dashboardData, fetchDashboardData } = useAuth()
  const [activeTab, setActiveTab] = useState("images")
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  
  const photoInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    Nom_Complet: "",
    Profession: "",
    Compagnie: "",
    Location: "",
    Telephone: "",
    URL_Profil: "",
    URL_Photo: "",
    URL_Couverture: "",
  })
  
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([])
  const [selectedColor, setSelectedColor] = useState("#007AFF")
  const [hideBranding, setHideBranding] = useState(false)

  // Load profile data
  useEffect(() => {
    if (dashboardData?.profile) {
      const profile = dashboardData.profile
      setFormData({
        Nom_Complet: profile.Nom_Complet || "",
        Profession: profile.Profession || "",
        Compagnie: profile.Compagnie || "",
        Location: profile.Location || "",
        Telephone: profile.Telephone || "",
        URL_Profil: dashboardData.user?.URL_Profil || "",
        URL_Photo: profile.URL_Photo || "",
        URL_Couverture: profile.URL_Couverture || "",
      })
      
      try {
        const links = JSON.parse(profile.Liens_Sociaux_JSON || "[]")
        setSocialLinks(links)
      } catch {
        setSocialLinks([])
      }
      
      setSelectedColor(profile.Couleur_Theme || "#007AFF")
      setHideBranding(profile.Cacher_Marque === "OUI")
    }
  }, [dashboardData])

  const handleSave = async () => {
    if (!token) return
    setSaving(true)
    setSaveSuccess(false)

    try {
      const profileData = {
        Nom_Complet: formData.Nom_Complet,
        Profession: formData.Profession,
        Compagnie: formData.Compagnie,
        Location: formData.Location,
        Telephone: formData.Telephone,
        URL_Profil: formData.URL_Profil,
        Liens_Sociaux_JSON: JSON.stringify(socialLinks),
        Couleur_Theme: selectedColor,
        Cacher_Marque: hideBranding ? "OUI" : "NON",
      }

      const result = await api.saveProfile(token, profileData)
      
      if (result.success) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
        // Refresh dashboard data
        fetchDashboardData()
      }
    } catch (error) {
      console.error("Erreur sauvegarde:", error)
    }

    setSaving(false)
  }

  const handleImageUpload = async (file: File, type: 'photo' | 'cover') => {
    if (!token || !file) return
    
    if (type === 'photo') setUploadingPhoto(true)
    else setUploadingCover(true)

    try {
      // Convert file to base64
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = reader.result as string
        
        const result = await api.saveProfileImage(token, {
          imageBase64: base64,
          type: type === 'photo' ? 'photo' : 'cover'
        })
        
        if (result.success) {
          // Refresh dashboard data to get new image URL
          fetchDashboardData()
        }
        
        if (type === 'photo') setUploadingPhoto(false)
        else setUploadingCover(false)
      }
      reader.readAsDataURL(file)
    } catch {
      if (type === 'photo') setUploadingPhoto(false)
      else setUploadingCover(false)
    }
  }

  const addSocialLink = () => {
    setSocialLinks([...socialLinks, { type: "website", url: "", label: "" }])
  }

  const removeSocialLink = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index))
  }

  const updateSocialLink = (index: number, field: keyof SocialLink, value: string) => {
    const updated = [...socialLinks]
    updated[index] = { ...updated[index], [field]: value }
    setSocialLinks(updated)
  }

  const initials = formData.Nom_Complet
    ? formData.Nom_Complet.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "?"

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Editor Section */}
      <div className="lg:col-span-2 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-foreground">Editer mon profil</h1>
            <p className="text-muted-foreground">Personnalisez votre carte de visite numerique</p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary hover:bg-primary/90"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : saveSuccess ? (
              <Check className="w-4 h-4 mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saveSuccess ? "Sauvegarde !" : "Sauvegarder"}
          </Button>
        </motion.div>

        {/* Tabs Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 p-1 rounded-xl bg-muted/30 overflow-x-auto"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </motion.div>

        {/* Tab Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm"
        >
          <AnimatePresence mode="wait">
            {/* Images Tab */}
            {activeTab === "images" && (
              <motion.div
                key="images"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <h3 className="text-lg font-semibold text-foreground">Images du profil</h3>
                
                <div className="flex flex-col sm:flex-row gap-6">
                  {/* Profile Picture */}
                  <div className="text-center">
                    <div className="relative inline-block">
                      {formData.URL_Photo ? (
                        <div 
                          className="w-28 h-28 rounded-full bg-cover bg-center border-4 border-background"
                          style={{ backgroundImage: `url(${formData.URL_Photo})` }}
                        />
                      ) : (
                        <div className="w-28 h-28 rounded-full bg-primary/20 flex items-center justify-center border-4 border-background">
                          <span className="text-3xl font-bold text-primary">{initials}</span>
                        </div>
                      )}
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleImageUpload(file, 'photo')
                        }}
                      />
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => photoInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        className="absolute bottom-0 right-0 p-2.5 rounded-full bg-primary text-primary-foreground shadow-lg disabled:opacity-50"
                      >
                        {uploadingPhoto ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                      </motion.button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">Photo de profil</p>
                    <p className="text-xs text-muted-foreground">Recommande: 400x400px</p>
                  </div>

                  {/* Cover Image */}
                  <div className="flex-1">
                    <div 
                      className="relative h-32 rounded-xl bg-cover bg-center overflow-hidden"
                      style={{ 
                        backgroundImage: formData.URL_Couverture 
                          ? `url(${formData.URL_Couverture})` 
                          : `linear-gradient(135deg, ${selectedColor}40, ${selectedColor}20)`
                      }}
                    >
                      <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleImageUpload(file, 'cover')
                        }}
                      />
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => coverInputRef.current?.click()}
                        disabled={uploadingCover}
                        className="absolute top-3 right-3 p-2.5 rounded-lg bg-black/50 text-white backdrop-blur-sm disabled:opacity-50"
                      >
                        {uploadingCover ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                      </motion.button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">Image de couverture</p>
                    <p className="text-xs text-muted-foreground">Recommande: 1200x400px</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Info Tab */}
            {activeTab === "info" && (
              <motion.div
                key="info"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Nom complet</label>
                  <input
                    type="text"
                    value={formData.Nom_Complet}
                    onChange={(e) => setFormData({ ...formData, Nom_Complet: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border/50 text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                    placeholder="Jean Dupont"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Poste / Titre</label>
                    <input
                      type="text"
                      value={formData.Profession}
                      onChange={(e) => setFormData({ ...formData, Profession: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border/50 text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                      placeholder="CEO & Fondateur"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Entreprise</label>
                    <input
                      type="text"
                      value={formData.Compagnie}
                      onChange={(e) => setFormData({ ...formData, Compagnie: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border/50 text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                      placeholder="Mahu Technologies"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Localisation</label>
                    <input
                      type="text"
                      value={formData.Location}
                      onChange={(e) => setFormData({ ...formData, Location: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border/50 text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                      placeholder="Paris, France"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Telephone</label>
                    <input
                      type="tel"
                      value={formData.Telephone}
                      onChange={(e) => setFormData({ ...formData, Telephone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border/50 text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                      placeholder="+33 6 12 34 56 78"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">URL personnalisee</label>
                  <div className="flex">
                    <span className="px-4 py-3 rounded-l-xl bg-muted/50 border border-r-0 border-border/50 text-muted-foreground text-sm">
                      mahu.cards/p/
                    </span>
                    <input
                      type="text"
                      value={formData.URL_Profil}
                      onChange={(e) => setFormData({ ...formData, URL_Profil: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      className="flex-1 px-4 py-3 rounded-r-xl bg-muted/30 border border-border/50 text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                      placeholder="jean-dupont"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Links Tab */}
            {activeTab === "links" && (
              <motion.div
                key="links"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {socialLinks.map((link, index) => {
                  const platform = socialPlatforms.find(p => p.id === link.type) || socialPlatforms[7]
                  const Icon = platform.icon
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-start gap-3"
                    >
                      <div className="p-3 rounded-xl bg-muted/30 text-muted-foreground">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <select
                          value={link.type}
                          onChange={(e) => updateSocialLink(index, "type", e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-muted/30 border border-border/50 text-foreground focus:outline-none focus:border-primary/50 transition-colors text-sm"
                        >
                          {socialPlatforms.map((p) => (
                            <option key={p.id} value={p.id}>{p.label}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={link.url}
                          onChange={(e) => updateSocialLink(index, "url", e.target.value)}
                          placeholder={platform.placeholder}
                          className="w-full px-4 py-2.5 rounded-xl bg-muted/30 border border-border/50 text-foreground focus:outline-none focus:border-primary/50 transition-colors text-sm"
                        />
                        <input
                          type="text"
                          value={link.label || ""}
                          onChange={(e) => updateSocialLink(index, "label", e.target.value)}
                          placeholder="Label personnalise (optionnel)"
                          className="w-full px-4 py-2.5 rounded-xl bg-muted/30 border border-border/50 text-foreground focus:outline-none focus:border-primary/50 transition-colors text-sm"
                        />
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => removeSocialLink(index)}
                        className="p-3 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </motion.div>
                  )
                })}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={addSocialLink}
                  className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl border-2 border-dashed border-border/50 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter un lien
                </motion.button>
              </motion.div>
            )}

            {/* Style Tab */}
            {activeTab === "style" && (
              <motion.div
                key="style"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-4">Couleur d&apos;accent</label>
                  <div className="flex flex-wrap gap-3">
                    {accentColors.map((color) => (
                      <motion.button
                        key={color.value}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setSelectedColor(color.value)}
                        className={`w-12 h-12 rounded-xl transition-all ${
                          selectedColor === color.value 
                            ? "ring-2 ring-offset-2 ring-offset-background ring-foreground" 
                            : ""
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                  <div>
                    <p className="font-medium text-foreground">Masquer la marque Mahu</p>
                    <p className="text-sm text-muted-foreground">Retirer le badge &quot;Cree avec Mahu&quot;</p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setHideBranding(!hideBranding)}
                    className={`relative w-12 h-7 rounded-full transition-colors ${
                      hideBranding ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <motion.div
                      initial={false}
                      animate={{ x: hideBranding ? 22 : 2 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md"
                    />
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Phone Preview */}
      <div className="lg:col-span-1">
        <div className="sticky top-24">
          <p className="text-sm text-muted-foreground text-center mb-4">Apercu de votre carte</p>
          <PhonePreview 
            profile={{
              ...dashboardData?.profile,
              Nom_Complet: formData.Nom_Complet,
              Profession: formData.Profession,
              Compagnie: formData.Compagnie,
              Location: formData.Location,
              URL_Photo: formData.URL_Photo,
              URL_Couverture: formData.URL_Couverture,
              Couleur_Theme: selectedColor,
              Liens_Sociaux_JSON: JSON.stringify(socialLinks),
            }}
            profileUrl={formData.URL_Profil}
          />
        </div>
      </div>
    </div>
  )
}
