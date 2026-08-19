"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { adminApi, type LitellmHealth } from "@/lib/admin-api"

export default function AdminLitellmPage() {
  const { token } = useAdminAuth()
  const [health, setHealth] = useState<LitellmHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(
    (refresh: boolean) => {
      if (!token) return
      if (refresh) setRefreshing(true)
      adminApi
        .getLitellmHealth(token, refresh)
        .then(setHealth)
        .catch((err) => setError(err instanceof Error ? err.message : "Erreur"))
        .finally(() => {
          setLoading(false)
          setRefreshing(false)
        })
    },
    [token],
  )

  useEffect(() => {
    load(false)
  }, [load])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const usedByAppUnhealthy = health?.unhealthy.filter((e) => e.usedByApp) ?? []
  const otherUnhealthy = health?.unhealthy.filter((e) => !e.usedByApp) ?? []

  return (
    <div className="p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Etat LiteLLM</h1>
            <p className="text-sm text-muted-foreground">
              {health ? `Verifie a ${new Date(health.checkedAt).toLocaleTimeString("fr-FR")}` : "-"} - teste chaque
              modele contre son vrai fournisseur (quota, cle, disponibilite)
            </p>
          </div>
          <Button onClick={() => load(true)} disabled={refreshing} variant="outline" size="sm">
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Verification complete (~40s)
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Modeles operationnels
              </CardDescription>
              <CardTitle className="text-2xl">{health?.healthyCount ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" /> Modeles en panne
              </CardDescription>
              <CardTitle className="text-2xl">{health?.unhealthyCount ?? 0}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Utilises par l'app, actuellement en panne</CardTitle>
            <CardDescription>
              Ces modeles sont dans un plan (Gratuit/Premium/Pro) ou une fonctionnalite active - une panne ici casse
              une vraie conversation utilisateur.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usedByAppUnhealthy.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun - tous les modeles utilises par l'app repondent.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Modele</TableHead>
                    <TableHead>Erreur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usedByAppUnhealthy.map((e) => (
                    <TableRow key={e.model}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">{e.model}</TableCell>
                      <TableCell className="text-sm text-destructive">{e.error}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {otherUnhealthy.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Autres modeles declares <Badge variant="secondary">pas encore branches a l'app</Badge>
              </CardTitle>
              <CardDescription>
                Presents dans la configuration LiteLLM pour de futures fonctionnalites (edition video, audio temps
                reel, recherche vectorielle...) - aucune conversation en cours ne passe par eux.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Modele</TableHead>
                    <TableHead>Erreur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {otherUnhealthy.map((e) => (
                    <TableRow key={e.model}>
                      <TableCell className="font-mono text-xs whitespace-nowrap text-muted-foreground">
                        {e.model}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.error}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
