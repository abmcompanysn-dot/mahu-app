"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { adminApi, type ConsumptionStats } from "@/lib/admin-api"

export default function AdminConsumptionPage() {
  const { token } = useAdminAuth()
  const [stats, setStats] = useState<ConsumptionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!token) return
    adminApi
      .getConsumption(token)
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur"))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Consommation IA</h1>
        <p className="text-sm text-muted-foreground">Depuis {stats ? new Date(stats.since).toLocaleDateString("fr-FR") : "-"}</p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Messages</CardDescription>
              <CardTitle className="text-2xl">{stats?.totals.messageCount ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Tokens entrants</CardDescription>
              <CardTitle className="text-2xl">{stats?.totals.tokensIn.toLocaleString("fr-FR") ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Tokens sortants</CardDescription>
              <CardTitle className="text-2xl">{stats?.totals.tokensOut.toLocaleString("fr-FR") ?? 0}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Messages par jour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.byDay ?? []}>
                  <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="messageCount" fill="var(--color-primary, #6366f1)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Par modele</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modele</TableHead>
                  <TableHead className="text-right">Messages</TableHead>
                  <TableHead className="text-right">Tokens in</TableHead>
                  <TableHead className="text-right">Tokens out</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats?.byModel.map((m) => (
                  <TableRow key={m._id}>
                    <TableCell>{m._id || "inconnu"}</TableCell>
                    <TableCell className="text-right">{m.messageCount}</TableCell>
                    <TableCell className="text-right">{m.tokensIn.toLocaleString("fr-FR")}</TableCell>
                    <TableCell className="text-right">{m.tokensOut.toLocaleString("fr-FR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
