"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { adminApi, type PhysicalCard } from "@/lib/admin-api"

export default function AdminCardsPage() {
  const { token } = useAdminAuth()
  const [cards, setCards] = useState<PhysicalCard[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const [quantity, setQuantity] = useState(10)
  const [prefix, setPrefix] = useState("MH")
  const [lotCodes, setLotCodes] = useState("")
  const [lotEmail, setLotEmail] = useState("")
  const [resellerEmail, setResellerEmail] = useState("")
  const [resellerPassword, setResellerPassword] = useState("")
  const [resellerName, setResellerName] = useState("")
  const [broadcastSubject, setBroadcastSubject] = useState("")
  const [broadcastTitle, setBroadcastTitle] = useState("")
  const [broadcastMessage, setBroadcastMessage] = useState("")
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await adminApi.getCardsData(token)
      if (res.success) setCards(res.cards)
      else setError(res.error || "Erreur de chargement")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement")
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const runAction = async (action: () => Promise<{ success: boolean; message?: string; error?: string }>) => {
    if (!token) return
    setBusy(true)
    setError("")
    setMessage("")
    try {
      const res = await action()
      if (res.success) {
        setMessage(res.message || "OK")
        await load()
      } else {
        setError(res.error || "Erreur")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Cartes & revendeurs</h1>

        {message && <p className="text-sm text-emerald-500">{message}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generer des codes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                placeholder="Quantite"
              />
              <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="Prefixe (MH)" />
              <Button
                size="sm"
                disabled={busy}
                onClick={() => runAction(() => adminApi.generateCardCodes(token!, quantity, prefix))}
              >
                Generer
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assigner un lot a un revendeur</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input value={lotCodes} onChange={(e) => setLotCodes(e.target.value)} placeholder="Codes (separes par des virgules)" />
              <Input value={lotEmail} onChange={(e) => setLotEmail(e.target.value)} placeholder="Email du revendeur" />
              <Button
                size="sm"
                disabled={busy}
                onClick={() => runAction(() => adminApi.assignCardLot(token!, lotCodes, lotEmail))}
              >
                Assigner
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Creer un revendeur</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input value={resellerEmail} onChange={(e) => setResellerEmail(e.target.value)} placeholder="Email" />
              <Input
                type="password"
                value={resellerPassword}
                onChange={(e) => setResellerPassword(e.target.value)}
                placeholder="Mot de passe"
              />
              <Input value={resellerName} onChange={(e) => setResellerName(e.target.value)} placeholder="Nom de l'entreprise" />
              <Button
                size="sm"
                disabled={busy}
                onClick={() =>
                  runAction(() =>
                    adminApi.createReseller(token!, {
                      email: resellerEmail,
                      password: resellerPassword,
                      name: resellerName,
                    })
                  )
                }
              >
                Creer
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Diffuser un message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input value={broadcastSubject} onChange={(e) => setBroadcastSubject(e.target.value)} placeholder="Objet de l'email" />
              <Input value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)} placeholder="Titre" />
              <Textarea value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)} placeholder="Message" rows={2} />
              <Button
                size="sm"
                disabled={busy}
                onClick={() =>
                  runAction(() => adminApi.broadcastMessage(token!, broadcastSubject, broadcastTitle, broadcastMessage))
                }
              >
                Diffuser a tous les utilisateurs
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{cards.length} carte(s)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Vendeur</TableHead>
                    <TableHead>Proprietaire</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cards.map((c) => (
                    <TableRow key={c.Code_Carte}>
                      <TableCell className="font-mono text-xs">{c.Code_Carte}</TableCell>
                      <TableCell>
                        <Badge variant={c.Statut === "Desactivee" ? "destructive" : "secondary"}>{c.Statut}</Badge>
                      </TableCell>
                      <TableCell>{c.Vendeur || "-"}</TableCell>
                      <TableCell>{c.Email_Proprietaire || "-"}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => runAction(() => adminApi.deactivateCard(token!, c.Code_Carte))}
                        >
                          Desactiver
                        </Button>
                      </TableCell>
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
