"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { 
  Bell, Shield, Globe, Palette, User,
  CreditCard, Download, Trash2, 
  ChevronRight, Moon, Sun, Loader2, Check, LogOut
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"

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
  const { dashboardData, logout } = useAuth()
  
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    email_notif: true,
    push_notif: true,
    weekly_report: false,
    "2fa": false,
  })
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const profile = dashboardData?.profile
  const user = dashboardData?.user
  
  const displayName = profile?.Nom_Complet || user?.Email?.split("@")[0] || "Utilisateur"
  const email = user?.Email || ""
  const initials = displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)

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
