"use client"

import { useEffect, useState } from "react"
import { Loader2, MessageSquareText } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/hooks/use-auth"
import { api } from "@/lib/api"

// Interrupteur du formulaire "Entrons en contact" de la carte publique.
// Enregistre tout de suite, sans passer par le bouton Sauvegarder : les
// messages laisses arrivent par email et dans Contacts.
export function LeadCaptureToggle() {
  const { token, dashboardData, fetchDashboardData } = useAuth()
  const current = dashboardData?.profile?.Lead_Capture_Actif === "OUI"
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
      const result = await api.saveProfile(token, { Lead_Capture_Actif: value ? "OUI" : "NON" })
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
        <MessageSquareText className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <label htmlFor="lead-capture" className="font-medium text-foreground cursor-pointer">
          Formulaire de contact sur ma carte
        </label>
        <p className="text-sm text-muted-foreground">
          {enabled
            ? "Visible : les visiteurs peuvent vous laisser leurs coordonnees. Vous les recevez par email et dans Contacts."
            : "Masque : les visiteurs voient seulement un bouton Contact pour l'ouvrir."}
        </p>
        {error && <p className="text-sm text-destructive mt-1">{error}</p>}
      </div>
      <div className="flex items-center gap-2 pt-1">
        {saving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        <Switch id="lead-capture" checked={enabled} disabled={saving || !dashboardData} onCheckedChange={toggle} />
      </div>
    </div>
  )
}
