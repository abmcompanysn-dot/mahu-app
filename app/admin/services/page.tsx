"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Power, RefreshCw, Server } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { adminApi, type ServerService } from "@/lib/admin-api"

// Services du serveur DIARRA que l'on eteint pour economiser la memoire et
// que l'on rallume d'un clic quand on en a besoin.
const STATE: Record<ServerService["state"], { label: string; dot: string; text: string }> = {
  on: { label: "Allumé", dot: "bg-emerald-500", text: "text-emerald-600" },
  off: { label: "Éteint", dot: "bg-zinc-400", text: "text-muted-foreground" },
  starting: { label: "Démarrage…", dot: "bg-amber-500 animate-pulse", text: "text-amber-600" },
  error: { label: "Inconnu", dot: "bg-red-500", text: "text-destructive" },
}

export default function AdminServicesPage() {
  const { token } = useAdminAuth()
  const [services, setServices] = useState<ServerService[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState("")

  const load = useCallback(() => {
    if (!token) return
    adminApi
      .listServices(token)
      .then((res) => {
        setServices(res.services)
        setError("")
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement"))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(load, [load])

  // Pendant un démarrage, on rafraîchit toutes les 4 secondes.
  useEffect(() => {
    if (!services.some((s) => s.state === "starting")) return
    const id = setInterval(load, 4000)
    return () => clearInterval(id)
  }, [services, load])

  const toggle = async (s: ServerService) => {
    const on = s.state === "off" || s.state === "error"
    if (!on && !confirm(`Éteindre « ${s.label} » ?\n\n${s.description}`)) return
    setBusy(s.id)
    setError("")
    try {
      const res = await adminApi.setService(token!, s.id, on)
      setServices((list) => list.map((x) => (x.id === s.id ? { ...x, state: res.state } : x)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <Server className="h-6 w-6 shrink-0" /> Services du serveur
            </h1>
            <p className="text-sm text-muted-foreground">
              Éteignez ce qui ne sert pas pour libérer la mémoire du serveur DIARRA, et rallumez-le d&apos;un clic.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="shrink-0">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Actualiser
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}

        {loading && services.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {services.map((s) => {
              const st = STATE[s.state]
              const isOn = s.state === "on" || s.state === "starting"
              return (
                <Card key={s.id}>
                  <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold text-foreground">{s.label}</h2>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${st.text}`}>
                          <span className={`h-2 w-2 rounded-full ${st.dot}`} /> {st.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                    </div>
                    <Button
                      onClick={() => toggle(s)}
                      disabled={busy === s.id || s.state === "starting"}
                      variant={isOn ? "outline" : "default"}
                      className="w-full shrink-0 sm:w-36"
                    >
                      {busy === s.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Power className="mr-2 h-4 w-4" />}
                      {isOn ? "Éteindre" : "Allumer"}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
