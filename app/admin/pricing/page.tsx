"use client"

import { useEffect, useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { adminApi, type ResellerPriceRow } from "@/lib/admin-api"
import { formatXof } from "@/lib/shop-api"

// Prix d'inscription/activation - voir backend/internal/handlers/pricing.go.
// Ordre de priorite : prix du revendeur > prix global pour les codes ;
// acompte du produit > acompte par defaut pour les commandes.
export default function AdminPricingPage() {
  const { token } = useAdminAuth()
  const [deposit, setDeposit] = useState("")
  const [codePrice, setCodePrice] = useState("")
  const [resellers, setResellers] = useState<ResellerPriceRow[]>([])
  const [resellerDrafts, setResellerDrafts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savingReseller, setSavingReseller] = useState<string | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!token) return
    adminApi
      .getPricing(token)
      .then((res) => {
        setDeposit(String(res.pricing.defaultDepositXof))
        setCodePrice(String(res.pricing.codeActivationPriceXof))
        setResellers(res.resellers)
        setResellerDrafts(
          Object.fromEntries(res.resellers.map((r) => [r.email, r.activationPriceXof == null ? "" : String(r.activationPriceXof)]))
        )
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement"))
      .finally(() => setLoading(false))
  }, [token])

  const saveGlobal = async () => {
    if (!token) return
    setSaving(true)
    setSaved(false)
    setError("")
    try {
      await adminApi.updatePricing(token, {
        defaultDepositXof: Number(deposit),
        codeActivationPriceXof: Number(codePrice || 0),
      })
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setSaving(false)
    }
  }

  const saveReseller = async (email: string) => {
    if (!token) return
    const draft = (resellerDrafts[email] ?? "").trim()
    const price = draft === "" ? null : Number(draft)
    setSavingReseller(email)
    setError("")
    try {
      await adminApi.updateResellerPrice(token, email, price)
      setResellers((prev) => prev.map((r) => (r.email === email ? { ...r, activationPriceXof: price } : r)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setSavingReseller(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const globalCode = Number(codePrice || 0)

  return (
    <div className="p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Tarifs</h1>
        {error && <p className="text-sm text-destructive">{error}</p>}

        <Card>
          <CardHeader>
            <CardTitle>Prix globaux</CardTitle>
            <CardDescription>S&apos;appliquent quand un produit ou un revendeur n&apos;a pas son propre prix.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deposit">Acompte par defaut a la commande (FCFA)</Label>
                <Input id="deposit" type="number" min={100} value={deposit} onChange={(e) => setDeposit(e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  Paye via PayDunya en choisissant une carte a l&apos;inscription. Chaque produit peut avoir le sien
                  (page Catalogue).
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="code-price">Prix d&apos;activation avec un code (FCFA)</Label>
                <Input
                  id="code-price"
                  type="number"
                  min={0}
                  value={codePrice}
                  onChange={(e) => setCodePrice(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  0 = activation gratuite. Un revendeur peut avoir son propre prix (ci-dessous).
                </p>
              </div>
            </div>
            <Button onClick={saveGlobal} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
              Enregistrer
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prix d&apos;activation par revendeur</CardTitle>
            <CardDescription>
              Pour les codes des lots assignes a ce revendeur. Laisser vide = prix global (
              {globalCode > 0 ? formatXof(globalCode) : "gratuit"}).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Revendeur</TableHead>
                    <TableHead className="text-right">Cartes</TableHead>
                    <TableHead>Prix d&apos;activation (FCFA)</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resellers.map((r) => {
                    const draft = resellerDrafts[r.email] ?? ""
                    const current = r.activationPriceXof == null ? "" : String(r.activationPriceXof)
                    return (
                      <TableRow key={r.email}>
                        <TableCell>
                          <div className="font-medium">{r.nomEntreprise || r.email}</div>
                          <div className="text-xs text-muted-foreground">{r.email}</div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{r.totalCartes}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            className="w-36"
                            placeholder="prix global"
                            value={draft}
                            onChange={(e) => setResellerDrafts({ ...resellerDrafts, [r.email]: e.target.value })}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={draft.trim() === current || savingReseller === r.email}
                            onClick={() => saveReseller(r.email)}
                          >
                            {savingReseller === r.email && <Loader2 className="w-4 h-4 animate-spin" />}
                            Enregistrer
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {resellers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Aucun revendeur (creez-en depuis Cartes &amp; revendeurs)
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
