"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Monitor, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { adminApi, type CloudPC } from "@/lib/admin-api"

// Mahu Cloud PC - "l'ordinateur le plus fin au monde". Chaque ligne est un
// bureau Linux sur le serveur, ouvert par le scan de la carte + code secret.
// La carte NFC doit contenir l'adresse https://call.mahu.cards/c/<CODE>.
export default function AdminCloudPCPage() {
  const { token } = useAdminAuth()
  const [pcs, setPcs] = useState<CloudPC[]>([])
  const [maxRunning, setMaxRunning] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [form, setForm] = useState({ cardCode: "", ownerName: "", ownerEmail: "", pin: "", months: 12 })

  const load = useCallback(() => {
    if (!token) return
    adminApi
      .listCloudPCs(token)
      .then((res) => {
        setPcs(res.pcs)
        setMaxRunning(res.maxRunning)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement"))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(load, [load])

  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id)
    setError("")
    try {
      await fn()
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setBusy(null)
    }
  }

  const create = () =>
    act("new", async () => {
      await adminApi.createCloudPC(token!, { ...form, months: Number(form.months) || 12 })
      setForm({ cardCode: "", ownerName: "", ownerEmail: "", pin: "", months: 12 })
    })

  const running = pcs.filter((p) => p.running).length

  return (
    <div className="p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Monitor className="w-6 h-6" /> Cloud PC
          </h1>
          <p className="text-sm text-muted-foreground">
            L&apos;ordinateur le plus fin au monde. {running}/{maxRunning} allumé(s) en ce moment (limite du serveur actuel).
          </p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}

        <Card>
          <CardHeader>
            <CardTitle>Nouvel ordinateur</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-1">
                <Label>Code de la carte</Label>
                <Input value={form.cardCode} onChange={(e) => setForm({ ...form, cardCode: e.target.value.toUpperCase() })} placeholder="PC-0001" />
              </div>
              <div className="space-y-1">
                <Label>Nom du client</Label>
                <Input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Email (alertes)</Label>
                <Input type="email" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Code secret (4-8 chiffres)</Label>
                <Input inputMode="numeric" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "").slice(0, 8) })} />
              </div>
              <div className="space-y-1">
                <Label>Durée (mois)</Label>
                <Input type="number" min={1} max={36} value={form.months} onChange={(e) => setForm({ ...form, months: Number(e.target.value) })} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Programme la carte NFC avec <code>https://call.mahu.cards/c/{form.cardCode || "CODE"}</code>. Donne le code secret au client
              en main propre : il n&apos;est plus jamais affiché.
            </p>
            <Button onClick={create} disabled={busy === "new" || !form.cardCode || !form.ownerName || !form.ownerEmail || form.pin.length < 4}>
              {busy === "new" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Créer l&apos;ordinateur
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{pcs.length} ordinateur(s)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Carte</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>État</TableHead>
                    <TableHead>Expire le</TableHead>
                    <TableHead>Dernière connexion</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pcs.map((pc) => (
                    <TableRow key={pc._id}>
                      <TableCell className="font-mono text-sm">{pc.cardCode}</TableCell>
                      <TableCell>
                        <div className="font-medium">{pc.ownerName}</div>
                        <div className="text-xs text-muted-foreground">{pc.ownerEmail}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {pc.status === "suspendu" ? (
                          <span className="text-destructive">Suspendu</span>
                        ) : pc.running ? (
                          <span className="text-green-600">Allumé</span>
                        ) : (
                          "Éteint"
                        )}
                        {pc.lockedUntil && new Date(pc.lockedUntil) > new Date() && <div className="text-xs text-destructive">Bloqué (codes faux)</div>}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{new Date(pc.expiresAt).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {pc.lastLoginAt ? new Date(pc.lastLoginAt).toLocaleString("fr-FR") : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {pc.running && (
                            <Button size="sm" variant="outline" disabled={busy === pc._id} onClick={() => act(pc._id, () => adminApi.stopCloudPC(token!, pc._id))}>
                              Éteindre
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy === pc._id}
                            onClick={() => {
                              const pin = window.prompt("Nouveau code secret (4 à 8 chiffres)")
                              if (pin) act(pc._id, () => adminApi.updateCloudPC(token!, pc._id, { pin }))
                            }}
                          >
                            Nouveau code
                          </Button>
                          <Button size="sm" variant="outline" disabled={busy === pc._id} onClick={() => act(pc._id, () => adminApi.updateCloudPC(token!, pc._id, { extendMonths: 12 }))}>
                            +12 mois
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy === pc._id}
                            onClick={() =>
                              act(pc._id, () => adminApi.updateCloudPC(token!, pc._id, { status: pc.status === "actif" ? "suspendu" : "actif" }))
                            }
                          >
                            {pc.status === "actif" ? "Suspendre" : "Réactiver"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            disabled={busy === pc._id}
                            onClick={() => {
                              if (window.confirm(`Supprimer l'ordinateur ${pc.cardCode} ET tous ses fichiers ? C'est définitif.`))
                                act(pc._id, () => adminApi.deleteCloudPC(token!, pc._id))
                            }}
                          >
                            Supprimer
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pcs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Aucun ordinateur pour l&apos;instant
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
