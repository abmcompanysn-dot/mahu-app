"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { adminApi, type BetaSignup } from "@/lib/admin-api"

const MAX_PER_COUNTRY = 10

export default function AdminBetaPage() {
  const { token } = useAdminAuth()
  const [signups, setSignups] = useState<BetaSignup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!token) return
    adminApi
      .getBetaSignups(token)
      .then((res) => setSignups(res.signups))
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur"))
      .finally(() => setLoading(false))
  }, [token])

  const byCountry = useMemo(() => {
    const counts = new Map<string, number>()
    signups.forEach((s) => counts.set(s.country, (counts.get(s.country) ?? 0) + 1))
    return Array.from(counts.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
  }, [signups])

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
        <h1 className="text-2xl font-bold text-foreground">Beta carte IA</h1>
        <p className="text-sm text-muted-foreground">
          Liste d&apos;attente publique (ai-beta.mahu.cards) - {MAX_PER_COUNTRY} places par pays.
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Inscriptions totales</CardDescription>
              <CardTitle className="text-2xl">{signups.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Pays representes</CardDescription>
              <CardTitle className="text-2xl">{byCountry.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Pays au quota complet</CardDescription>
              <CardTitle className="text-2xl">{byCountry.filter((c) => c.count >= MAX_PER_COUNTRY).length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Inscriptions par pays</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCountry}>
                  <XAxis dataKey="country" tick={{ fontSize: 11 }} interval={0} angle={-35} textAnchor="end" height={70} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} domain={[0, MAX_PER_COUNTRY]} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--color-primary, #6366f1)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Toutes les inscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telephone</TableHead>
                  <TableHead>Adresse</TableHead>
                  <TableHead>Pays</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signups.map((s) => (
                  <TableRow key={s._id}>
                    <TableCell>{new Date(s.createdAt).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{s.email}</TableCell>
                    <TableCell>{s.phone}</TableCell>
                    <TableCell>{s.address}</TableCell>
                    <TableCell>{s.country}</TableCell>
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
