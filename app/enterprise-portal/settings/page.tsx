"use client"

import { useEffect, useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/use-auth"
import { api } from "@/lib/api"

export default function EnterprisePortalSettingsPage() {
  const { token, dashboardData, fetchDashboardData } = useAuth()
  const [form, setForm] = useState({ name: "", phone: "", address: "" })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (dashboardData?.enterprise) {
      setForm({
        name: dashboardData.enterprise.Name || "",
        phone: dashboardData.enterprise.Phone || "",
        address: dashboardData.enterprise.Address || "",
      })
    } else {
      fetchDashboardData()
    }
  }, [dashboardData, fetchDashboardData])

  const handleSave = async () => {
    if (!token) return
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await api.saveEnterpriseInfo(token, form)
      const data = res as unknown as { success?: boolean; error?: string }
      if (!data.success) {
        setError(data.error || "Erreur lors de l'enregistrement.")
        return
      }
      setSaved(true)
    } catch {
      setError("Erreur lors de l'enregistrement.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Informations de l&apos;entreprise</h1>
        <p className="text-muted-foreground mt-1">Ces informations sont partagees avec toute votre equipe.</p>
      </div>

      <div className="p-6 rounded-2xl bg-card/50 border border-border/50 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Nom de l&apos;entreprise</label>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Mon Entreprise SARL"
            className="h-11 bg-muted/50 border-border/50 rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Telephone</label>
          <Input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="+221 77 123 45 67"
            className="h-11 bg-muted/50 border-border/50 rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Adresse</label>
          <Input
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="Dakar, Senegal"
            className="h-11 bg-muted/50 border-border/50 rounded-xl"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4" />
          ) : null}
          {saved ? "Enregistre" : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}
