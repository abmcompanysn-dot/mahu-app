"use client"

import { useEffect, useState } from "react"
import { Loader2, Lock, MessageSquareText } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/hooks/use-auth"
import { api } from "@/lib/api"

type ProfileFlag = "Lead_Capture_Actif" | "Mode_Confidentiel"

// Interrupteur OUI/NON d'un reglage du profil public. Enregistre tout de
// suite, sans passer par le bouton Sauvegarder.
function ProfileFlagToggle({
  field,
  id,
  icon: Icon,
  title,
  onText,
  offText,
}: {
  field: ProfileFlag
  id: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  onText: string
  offText: string
}) {
  const { token, dashboardData, fetchDashboardData } = useAuth()
  const profile = dashboardData?.profile as Record<string, string> | undefined
  const current = profile?.[field] === "OUI"
  const [enabled, setEnabled] = useState(current)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    setEnabled(current)
  }, [current])

  const toggle = async (value: boolean) => {
    if (!token) return
    setEnabled(value)
    setSaving(true)
    setError("")
    try {
      const result = await api.saveProfile(token, { [field]: value ? "OUI" : "NON" })
      if (!result.success) throw new Error(result.error || "Enregistrement impossible")
      fetchDashboardData()
    } catch (err) {
      setEnabled(!value)
      setError(err instanceof Error ? err.message : "Enregistrement impossible")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl bg-card/50 border border-border/50">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <label htmlFor={id} className="font-medium text-foreground cursor-pointer">
          {title}
        </label>
        <p className="text-sm text-muted-foreground">{enabled ? onText : offText}</p>
        {error && <p className="text-sm text-destructive mt-1">{error}</p>}
      </div>
      <div className="flex items-center gap-2 pt-1">
        {saving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        <Switch id={id} checked={enabled} disabled={saving || !dashboardData} onCheckedChange={toggle} />
      </div>
    </div>
  )
}

// Formulaire "Entrons en contact" de la carte publique : les messages
// arrivent par email et dans Contacts.
export function LeadCaptureToggle() {
  return (
    <ProfileFlagToggle
      field="Lead_Capture_Actif"
      id="lead-capture"
      icon={MessageSquareText}
      title="Formulaire de contact sur ma carte"
      onText="Visible : les visiteurs peuvent vous laisser leurs coordonnees. Vous les recevez par email et dans Contacts."
      offText="Masque : les visiteurs voient seulement un bouton Contact pour l'ouvrir."
    />
  )
}

// Mode confidentiel : la carte ne montre plus ni telephone, ni email, ni
// reseaux - seulement le formulaire (le serveur ne les envoie meme plus).
export function ConfidentialModeToggle() {
  return (
    <ProfileFlagToggle
      field="Mode_Confidentiel"
      id="confidential-mode"
      icon={Lock}
      title="Mode confidentiel"
      onText="Active : votre carte n'affiche que votre photo, nom et poste. On vous ecrit via le formulaire, sans voir vos coordonnees - vous choisissez qui rappeler."
      offText="Desactive : votre carte affiche vos coordonnees et vos reseaux."
    />
  )
}
