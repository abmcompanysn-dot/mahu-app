"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { adminApi, type EnterpriseRequest } from "@/lib/admin-api"

// Demandes envoyees depuis la page Entreprise du dashboard (offre sur mesure,
// installee chez le client - pas de forfait en libre-service).
export default function AdminEnterpriseRequestsPage() {
  const { token } = useAdminAuth()
  const [requests, setRequests] = useState<EnterpriseRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    adminApi
      .listEnterpriseRequests(token)
      .then((res) => setRequests(res.requests))
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement"))
      .finally(() => setLoading(false))
  }, [token])

  const setHandled = async (req: EnterpriseRequest, handled: boolean) => {
    if (!token) return
    const status = handled ? "traite" : "nouveau"
    setSavingId(req._id)
    try {
      await adminApi.updateEnterpriseRequest(token, req._id, status)
      setRequests((prev) => prev.map((r) => (r._id === req._id ? { ...r, status } : r)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setSavingId(null)
    }
  }

  const pending = requests.filter((r) => r.status === "nouveau").length

  return (
    <div className="p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Demandes entreprise</h1>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Card>
          <CardHeader>
            <CardTitle>
              {requests.length} demande(s) - {pending} a traiter
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Entreprise</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Effectif</TableHead>
                      <TableHead>Besoin</TableHead>
                      <TableHead>Traitee</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((r) => (
                      <TableRow key={r._id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                        </TableCell>
                        <TableCell className="font-medium">{r.company}</TableCell>
                        <TableCell>
                          <div>{r.contactName}</div>
                          <a href={`mailto:${r.email}`} className="text-xs text-primary hover:underline">
                            {r.email}
                          </a>
                          <div className="text-xs text-muted-foreground">{r.phone}</div>
                        </TableCell>
                        <TableCell className="text-sm">{r.employeeCount || "-"}</TableCell>
                        <TableCell className="text-sm max-w-sm whitespace-pre-wrap">{r.message || "-"}</TableCell>
                        <TableCell>
                          <Switch
                            checked={r.status === "traite"}
                            disabled={savingId === r._id}
                            onCheckedChange={(v) => setHandled(r, v)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {requests.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Aucune demande
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
