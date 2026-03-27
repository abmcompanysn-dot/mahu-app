"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  User, Briefcase, Link as LinkIcon, Palette, 
  Camera, Save, Loader2, Plus, Trash2, 
  Linkedin, Twitter, Instagram, Globe, Github, Mail, Phone
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PhonePreview } from "@/components/dashboard/phone-preview"

const tabs = [
  { id: "info", label: "Informations", icon: User },
  { id: "links", label: "Liens sociaux", icon: LinkIcon },
  { id: "style", label: "Apparence", icon: Palette },
]

const socialPlatforms = [
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, placeholder: "linkedin.com/in/username" },
  { id: "twitter", label: "Twitter", icon: Twitter, placeholder: "twitter.com/username" },
  { id: "instagram", label: "Instagram", icon: Instagram, placeholder: "instagram.com/username" },
  { id: "github", label: "GitHub", icon: Github, placeholder: "github.com/username" },
  { id: "website", label: "Site web", icon: Globe, placeholder: "votre-site.com" },
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
]

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("info")
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "Jean",
    lastName: "Dupont",
    title: "CEO & Fondateur",
    company: "Mahu Technologies",
    bio: "Passionne par l'innovation et le networking digital.",
    location: "Paris, France",
    profileUrl: "jean-dupont",
  })
  const [socialLinks, setSocialLinks] = useState([
    { platform: "linkedin", url: "linkedin.com/in/jeandupont" },
    { platform: "email", url: "jean@mahu.cards" },
  ])
  const [selectedColor, setSelectedColor] = useState("#007AFF")

  const handleSave = async () => {
    setSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setSaving(false)
  }

  const addSocialLink = () => {
    setSocialLinks([...socialLinks, { platform: "website", url: "" }])
  }

  const removeSocialLink = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index))
  }

  const updateSocialLink = (index: number, field: "platform" | "url", value: string) => {
    const updated = [...socialLinks]
    updated[index][field] = value
    setSocialLinks(updated)
  }

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
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Sauvegarder
          </Button>
        </motion.div>

        {/* Profile Images */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4">Images du profil</h3>
          
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Profile Picture */}
            <div className="text-center">
              <div className="relative inline-block">
                <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center border-4 border-background">
                  <span className="text-3xl font-bold text-primary">JD</span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground shadow-lg"
                >
                  <Camera className="w-4 h-4" />
                </motion.button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Photo de profil</p>
            </div>

            {/* Cover Image */}
            <div className="flex-1">
              <div className="relative h-24 rounded-xl bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 overflow-hidden">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="absolute top-2 right-2 p-2 rounded-lg bg-black/50 text-white"
                >
                  <Camera className="w-4 h-4" />
                </motion.button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Image de couverture</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm"
        >
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6 p-1 rounded-xl bg-muted/30">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === "info" && (
              <motion.div
                key="info"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Prenom</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border/50 text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Nom</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border/50 text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Poste</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border/50 text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Entreprise</label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border/50 text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Bio</label>
                  <textarea
                    rows={3}
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border/50 text-foreground focus:outline-none focus:border-primary/50 transition-colors resize-none"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Localisation</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border/50 text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">URL personnalisee</label>
                    <div className="flex">
                      <span className="px-4 py-3 rounded-l-xl bg-muted/50 border border-r-0 border-border/50 text-muted-foreground text-sm">
                        mahu.cards/
                      </span>
                      <input
                        type="text"
                        value={formData.profileUrl}
                        onChange={(e) => setFormData({ ...formData, profileUrl: e.target.value })}
                        className="flex-1 px-4 py-3 rounded-r-xl bg-muted/30 border border-border/50 text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "links" && (
              <motion.div
                key="links"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {socialLinks.map((link, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <select
                      value={link.platform}
                      onChange={(e) => updateSocialLink(index, "platform", e.target.value)}
                      className="px-4 py-3 rounded-xl bg-muted/30 border border-border/50 text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                    >
                      {socialPlatforms.map((p) => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={link.url}
                      onChange={(e) => updateSocialLink(index, "url", e.target.value)}
                      placeholder={socialPlatforms.find((p) => p.id === link.platform)?.placeholder}
                      className="flex-1 px-4 py-3 rounded-xl bg-muted/30 border border-border/50 text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                    />
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => removeSocialLink(index)}
                      className="p-3 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </motion.div>
                ))}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={addSocialLink}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-border/50 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter un lien
                </motion.button>
              </motion.div>
            )}

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
                            ? "ring-2 ring-offset-2 ring-offset-background ring-primary" 
                            : ""
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-4">Theme du profil</label>
                  <div className="grid grid-cols-2 gap-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="p-4 rounded-xl bg-[#0a0a0a] border-2 border-primary/50 text-white text-center"
                    >
                      <span className="text-sm font-medium">Mode sombre</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="p-4 rounded-xl bg-white border-2 border-border/50 text-black text-center"
                    >
                      <span className="text-sm font-medium">Mode clair</span>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Phone Preview */}
      <div className="lg:col-span-1">
        <div className="sticky top-24">
          <PhonePreview />
        </div>
      </div>
    </div>
  )
}
