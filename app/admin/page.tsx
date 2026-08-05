"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, LogOut, Users, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { adminApi, type AdminStats, type PaymentsResponse } from "@/lib/admin-api"

function formatXof(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA"
}

function providerLabel(provider: string | undefined): string {
  return provider === "pawapay" ? "PawaPay" : "PayDunya"
}

export default function AdminHomePage() {
  const router = useRouter()
  const { token, admin, isLoading: authLoading, isAuthenticated, logout } = useAdminAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [payments, setPayments] = useState<PaymentsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      router.replace("/admin/login")
      return
    }
    if (!token) return

    Promise.all([adminApi.getStats(token), adminApi.getPayments(token)])
      .then(([statsRes, paymentsRes]) => {
        setStats(statsRes)
        setPayments(paymentsRes)
      })
      .catch((err) => setError(err.message || "Erreur de chargement"))
      .finally(() => setLoading(false))
  }, [authLoading, isAuthenticated, token, router])

  if (authLoading || (loading && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Administration Mahu</h1>
            {admin && <p className="text-sm text-muted-foreground">{admin.email}</p>}
          </div>
          <Button variant="outline" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" />
            Deconnexion
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <Wallet className="w-4 h-4" /> Revenu total
              </CardDescription>
              <CardTitle className="text-2xl">
                {payments ? formatXof(payments.totalRevenueXof) : "-"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <Users className="w-4 h-4" /> Utilisateurs
              </CardDescription>
              <CardTitle className="text-2xl">{stats?.userCount ?? "-"}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Repartition des plans</CardDescription>
              <CardTitle className="text-sm font-medium space-x-2">
                <span>Gratuit {stats?.plans.gratuit ?? 0}</span>
                <span>Premium {stats?.plans.premium ?? 0}</span>
                <span>Pro {stats?.plans.pro ?? 0}</span>
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Paiements recents</CardTitle>
            <CardDescription>PayDunya et PawaPay confondus, les 50 derniers</CardDescription>
          </CardHeader>
          <CardContent>
            {payments && payments.payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun paiement pour le moment.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments?.payments.map((payment) => (
                    <TableRow key={payment._id}>
                      <TableCell>
                        {new Date(payment.confirmedAt).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell>
                        {typeof payment.userId === "string" ? payment.userId : payment.userId.email}
                      </TableCell>
                      <TableCell className="capitalize">{payment.plan}</TableCell>
                      <TableCell>
                        <Badge variant={payment.provider === "pawapay" ? "secondary" : "default"}>
                          {providerLabel(payment.provider)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatXof(payment.amountXof)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
