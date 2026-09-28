"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { adminApi, type ProspectRow } from "@/lib/admin-api"

// Messages laisses via le formulaire "Entrons en contact" des profils publics.
// Chaque message est aussi envoye par email au detenteur de la carte.
export default function AdminContactsPage() {
  const { token } = useAdminAuth()
  const [rows, setRows] = useState<ProspectRow[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!token) return
    adminApi
      .listProspects(token)
      .then((res) => setRows(res.prospects))
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement"))
      .finally(() => setLoading(false))
  }, [token])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      [r.nom, r.contact, r.message, r.ownerEmail, r.ownerSlug].some((v) => v?.toLowerCase().includes(q))
    )
  }, [rows, search])

  return (
    <div className="p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Messages de contact</h1>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, contact, detenteur..."
            className="pl-9"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Card>
          <CardHeader>
            <CardTitle>{visible.length} message(s)</CardTitle>
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
                      <TableHead>Visiteur</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Detenteur de la carte</TableHead>
                      <TableHead>Canal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.map((r) => (
                      <TableRow key={r._id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {new Date(r.dateCapture).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{r.nom}</div>
                          <div className="text-xs text-muted-foreground">{r.contact}</div>
                        </TableCell>
                        <TableCell className="text-sm max-w-xs whitespace-pre-wrap">
                          {r.message || <span className="text-muted-foreground">-</span>}
                          {r.noteEtoiles ? <div className="text-xs text-muted-foreground">{r.noteEtoiles}/5</div> : null}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{r.ownerEmail || "-"}</div>
                          {r.ownerSlug && (
                            <a
                              href={`/p/${r.ownerSlug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-primary hover:underline"
                            >
                              /p/{r.ownerSlug}
                            </a>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{r.canal}</TableCell>
                      </TableRow>
                    ))}
                    {visible.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Aucun message
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
