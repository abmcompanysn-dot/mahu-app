"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { adminApi, type PhysicalCard } from "@/lib/admin-api"
import { cardUrl, downloadBuBeesPdf, type BuBeesCard, type BuBeesFormat } from "@/lib/bu-bees-card-pdf"

// Generateur de cartes MAHU Bu Bees : on tape les noms des clients (marches,
// terrain), chaque nom recoit un code carte neuf, et on telecharge le PDF des
// cartes avec le nom et le QR code de chacun. Le client scanne sa carte, l'inscription
// s'ouvre avec le code deja rempli : il active sa carte sur place.
// Mode « lot sans nom » : N cartes vierges, chacune avec son code tire au
// hasard (jamais deux fois le meme, voir newCardCodes cote backend).

const LABEL = "Bu Bees"
const PREFIX = "BB"

const cardName = (c: PhysicalCard) => (c.Commentaire || "").slice(LABEL.length + 3)

function downloadCsv(cards: BuBeesCard[]) {
  // Liste pour ecrire les puces NFC (application NFC Tools : un lien par carte).
  const rows = [["code", "nom", "lien a ecrire dans la puce"], ...cards.map((c) => [c.code, c.name, cardUrl(c.code)])]
  const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(";")).join("\r\n")
  const a = document.createElement("a")
  a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }))
  a.download = `cartes-bu-bees-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function BuBeesCardsPage() {
  const { token } = useAdminAuth()
  const [mode, setMode] = useState<"lot" | "names">("lot")
  const [names, setNames] = useState("")
  const [quantity, setQuantity] = useState(10)
  const [format, setFormat] = useState<BuBeesFormat>("pvc")
  const [cards, setCards] = useState<PhysicalCard[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [lastBatch, setLastBatch] = useState<BuBeesCard[]>([])

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await adminApi.getCardsData(token)
      if (res.success) setCards(res.cards.filter((c) => (c.Commentaire || "").startsWith(`${LABEL} : `)).reverse())
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

  const list = useMemo(
    () =>
      names
        .split(/\r?\n/)
        .map((n) => n.trim().replace(/\s+/g, " "))
        .filter(Boolean),
    [names]
  )

  // Les codes sont enregistres avant le PDF : si le telechargement echoue,
  // les cartes restent dans la liste ci-dessous pour les retelecharger.
  const downloadPdf = async (toPrint: BuBeesCard[]) => {
    try {
      await downloadBuBeesPdf(toPrint, format)
      return true
    } catch (err) {
      setError(`PDF non téléchargé (${err instanceof Error ? err.message : "erreur"}). Les cartes sont enregistrées : sélectionnez-les ci-dessous pour retélécharger.`)
      return false
    }
  }

  const generate = async () => {
    if (!token || count === 0) return
    setBusy(true)
    setError("")
    setMessage("")
    try {
      const res =
        mode === "names"
          ? await adminApi.generateNamedCards(token, list, LABEL, PREFIX)
          : await adminApi.generateCardLot(token, count, LABEL, PREFIX)
      if (!res.success || !res.codes || res.codes.length !== count) {
        setError(res.error || "Les codes n'ont pas été créés.")
        return
      }
      const made = res.codes.map((code, i) => ({ name: mode === "names" ? list[i] : "", code }))
      setLastBatch(made)
      setNames("")
      if (await downloadPdf(made)) setMessage(`${made.length} carte(s) créée(s) (${res.batchId}), PDF téléchargé.`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setBusy(false)
    }
  }

  const redownload = async () => {
    setBusy(true)
    setError("")
    setMessage("")
    if (await downloadPdf(chosen)) setMessage(`PDF de ${chosen.length} carte(s) téléchargé.`)
    setBusy(false)
  }

  const count = mode === "names" ? list.length : Math.max(0, Math.min(500, Math.floor(quantity) || 0))

  const chosen: BuBeesCard[] = cards.filter((c) => selected.has(c.Code_Carte)).map((c) => ({ name: cardName(c), code: c.Code_Carte }))

  const toggle = (code: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })

  return (
    <div className="p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Générateur de cartes Bu Bees</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Un lot de cartes neuves, ou une carte au nom de chaque client : chaque carte a son propre QR code. Le client
            scanne sa carte et s&apos;inscrit avec le code déjà rempli.
          </p>
        </div>

        {message && <p className="text-sm text-emerald-500">{message}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nouvelles cartes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" checked={mode === "lot"} onChange={() => setMode("lot")} />
                Lot sans nom
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={mode === "names"} onChange={() => setMode("names")} />
                Avec le nom de chaque client
              </label>
            </div>
            {mode === "lot" ? (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-28"
                />
                <span className="text-muted-foreground">
                  cartes, chacune avec un QR code différent, tiré au hasard, jamais deux fois le même.
                </span>
              </div>
            ) : (
              <Textarea
                value={names}
                onChange={(e) => setNames(e.target.value)}
                rows={8}
                placeholder={"Un nom par ligne, tel qu'il sera imprimé :\nAwa Diop\nMamadou Fall\nBoutique Ndeye Sokhna"}
              />
            )}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="text-muted-foreground">PDF :</span>
              <label className="flex items-center gap-2">
                <input type="radio" checked={format === "a4"} onChange={() => setFormat("a4")} />
                Feuilles A4 (9 cartes par feuille, à découper)
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={format === "pvc"} onChange={() => setFormat("pvc")} />
                Imprimante à cartes PVC (une carte par page)
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={busy || count === 0} onClick={generate}>
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Créer {count || ""} carte(s) et télécharger le PDF
              </Button>
              {lastBatch.length > 0 && (
                <Button variant="outline" onClick={() => downloadCsv(lastBatch)}>
                  <Download className="w-4 h-4 mr-2" />
                  Liste pour les puces NFC (CSV)
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">{cards.length} carte(s) Bu Bees créée(s)</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={chosen.length === 0} onClick={() => downloadCsv(chosen)}>
                <Download className="w-4 h-4 mr-2" />
                CSV NFC
              </Button>
              <Button size="sm" disabled={busy || chosen.length === 0} onClick={redownload}>
                <Download className="w-4 h-4 mr-2" />
                PDF de la sélection ({chosen.length})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : cards.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune carte Bu Bees pour l&apos;instant.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        aria-label="Tout sélectionner"
                        checked={selected.size === cards.length}
                        onChange={(e) => setSelected(e.target.checked ? new Set(cards.map((c) => c.Code_Carte)) : new Set())}
                      />
                    </TableHead>
                    <TableHead>Nom imprimé</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Activée par</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cards.map((c) => (
                    <TableRow key={c.Code_Carte}>
                      <TableCell>
                        <input type="checkbox" checked={selected.has(c.Code_Carte)} onChange={() => toggle(c.Code_Carte)} />
                      </TableCell>
                      <TableCell className="font-medium">{cardName(c) || <span className="text-muted-foreground">(sans nom)</span>}</TableCell>
                      <TableCell className="font-mono text-xs">{c.Code_Carte}</TableCell>
                      <TableCell>
                        <Badge variant={c.Email_Proprietaire ? "default" : "secondary"}>
                          {c.Email_Proprietaire ? "Activée" : c.Statut}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{c.Email_Proprietaire || "-"}</TableCell>
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
