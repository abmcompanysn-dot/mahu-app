"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { adminApi, type CardOrder } from "@/lib/admin-api"
import { formatXof } from "@/lib/shop-api"

const PAYMENT_LABELS: Record<CardOrder["paymentStatus"], string> = {
  en_attente: "En attente",
  acompte_paye: "Acompte paye",
  solde: "Solde",
}

const DELIVERY_LABELS: Record<CardOrder["deliveryStatus"], string> = {
  a_preparer: "A preparer",
  expediee: "Expediee",
  livree: "Livree",
  annulee: "Annulee",
}

export default function AdminOrdersPage() {
  const { token } = useAdminAuth()
  const [orders, setOrders] = useState<CardOrder[]>([])
  const [totals, setTotals] = useState({ paidCount: 0, depositsXof: 0, remainingXof: 0 })
  const [search, setSearch] = useState("")
  const [paymentFilter, setPaymentFilter] = useState("paid")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await adminApi.listCardOrders(token)
      setOrders(res.orders)
      setTotals(res.totals)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement")
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders.filter((o) => {
      if (paymentFilter === "paid" && o.paymentStatus === "en_attente") return false
      if (paymentFilter === "pending" && o.paymentStatus !== "en_attente") return false
      if (!q) return true
      return [o.clientName, o.email, o.phone, o.productName].some((v) => v?.toLowerCase().includes(q))
    })
  }, [orders, search, paymentFilter])

  const update = async (
    order: CardOrder,
    data: { deliveryStatus?: CardOrder["deliveryStatus"]; paymentStatus?: "acompte_paye" | "solde" }
  ) => {
    if (!token) return
    setSavingId(order._id)
    setError("")
    try {
      await adminApi.updateCardOrder(token, order._id, data)
      setOrders((prev) => prev.map((o) => (o._id === order._id ? { ...o, ...data } : o)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Commandes de cartes</h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Commandes payees</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold tabular-nums">{totals.paidCount}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Acomptes encaisses</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold tabular-nums">{formatXof(totals.depositsXof)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Reste a encaisser</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold tabular-nums">{formatXof(totals.remainingXof)}</CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom, email, telephone, produit..."
              className="pl-9"
            />
          </div>
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paid">Payees</SelectItem>
              <SelectItem value="pending">Paiement non abouti</SelectItem>
              <SelectItem value="all">Toutes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Card>
          <CardHeader>
            <CardTitle>{visible.length} commande(s)</CardTitle>
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
                      <TableHead>Client</TableHead>
                      <TableHead>Produit</TableHead>
                      <TableHead className="text-right">Acompte</TableHead>
                      <TableHead className="text-right">Reste</TableHead>
                      <TableHead>Paiement</TableHead>
                      <TableHead>Livraison</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.map((o) => {
                      const pending = o.paymentStatus === "en_attente"
                      const remaining = o.paymentStatus === "solde" ? 0 : o.productPriceXof - o.depositXof
                      return (
                        <TableRow key={o._id}>
                          <TableCell className="whitespace-nowrap text-sm">
                            {new Date(o.paidAt || o.createdAt).toLocaleDateString("fr-FR")}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{o.clientName}</div>
                            <div className="text-xs text-muted-foreground">{o.email}</div>
                            <div className="text-xs text-muted-foreground">{o.phone}</div>
                            {o.deliveryAddress && (
                              <div className="text-xs text-muted-foreground">{o.deliveryAddress}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{o.productName}</TableCell>
                          <TableCell className="text-right tabular-nums whitespace-nowrap">
                            {formatXof(o.depositXof)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums whitespace-nowrap">
                            {formatXof(remaining)}
                          </TableCell>
                          <TableCell>
                            {pending ? (
                              <Badge variant="outline">{PAYMENT_LABELS[o.paymentStatus]}</Badge>
                            ) : (
                              <Select
                                value={o.paymentStatus}
                                disabled={savingId === o._id}
                                onValueChange={(v) => update(o, { paymentStatus: v as "acompte_paye" | "solde" })}
                              >
                                <SelectTrigger size="sm" className="w-36">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="acompte_paye">{PAYMENT_LABELS.acompte_paye}</SelectItem>
                                  <SelectItem value="solde">{PAYMENT_LABELS.solde}</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell>
                            {pending ? (
                              <span className="text-xs text-muted-foreground">-</span>
                            ) : (
                              <Select
                                value={o.deliveryStatus}
                                disabled={savingId === o._id}
                                onValueChange={(v) => update(o, { deliveryStatus: v as CardOrder["deliveryStatus"] })}
                              >
                                <SelectTrigger size="sm" className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(DELIVERY_LABELS).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                      {label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {visible.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Aucune commande
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
