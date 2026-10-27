"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CheckCircle2, Loader2, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { adminApi } from "@/lib/admin-api"
import { CARDS_PER_SHEET, buildStudentCardsHtml, type StudentCard } from "@/lib/student-cards-print"

// Cartes des etudiants (offre portfolio) : chaque etudiant paye apparait ici
// automatiquement. Une feuille A4 par etudiant = 9 exemplaires de sa carte
// (3 x 3), recto puis verso. Par defaut on coche ceux pas encore imprimes.

type Row = StudentCard & { email: string; printedAt?: string | null; freeCardRank?: number }

export default function StudentCardsPage() {
  const { token } = useAdminAuth()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showPrinted, setShowPrinted] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    const res = (await adminApi.listPortfolioCards(token)) as { success?: boolean; cards?: Row[]; error?: string }
    setLoading(false)
    if (!res.success) {
      setError(res.error || "Erreur de chargement")
      return
    }
    const cards = res.cards || []
    setRows(cards)
    setSelected(new Set(cards.filter((c) => !c.printedAt).map((c) => c.id)))
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const visible = useMemo(() => rows.filter((r) => showPrinted || !r.printedAt), [rows, showPrinted])
  const chosen = rows.filter((r) => selected.has(r.id))
  const pending = rows.filter((r) => !r.printedAt).length

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const print = async () => {
    // La fenetre s'ouvre avant l'attente (sinon le navigateur la bloque).
    const win = window.open("", "_blank")
    if (!win) {
      setError("Autorise les fenetres pop-up pour ce site, puis recommence.")
      return
    }
    win.document.write("<p style='font-family:sans-serif;padding:24px'>Preparation des planches...</p>")
    const html = await buildStudentCardsHtml(chosen)
    win.document.open()
    win.document.write(html)
    win.document.close()
  }

  const markPrinted = async () => {
    if (!token || chosen.length === 0) return
    setBusy(true)
    const res = (await adminApi.markPortfolioCardsPrinted(token, chosen.map((c) => c.id))) as { success?: boolean; updated?: number; error?: string }
    setBusy(false)
    if (!res.success) {
      setError(res.error || "Erreur")
      return
    }
    setNotice(`${res.updated ?? chosen.length} carte(s) marquee(s) imprimee(s).`)
    load()
  }

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cartes etudiants</h1>
          <p className="text-sm text-muted-foreground">
            Chaque etudiant qui paie l&apos;offre apparait ici automatiquement. Une feuille A4 paysage par etudiant : {CARDS_PER_SHEET} exemplaires de
            sa carte (3 x 3), format carte bancaire 85,6 x 54 mm, reperes de coupe, recto puis verso. Les infos viennent de son espace
            (nom, filiere, niveau, ecole) : il les modifie lui-meme dans « Mon portfolio ».
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {notice && <p className="flex items-center gap-2 text-sm text-green-600"><CheckCircle2 className="h-4 w-4" />{notice}</p>}

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
            <CardTitle className="text-base">
              {pending} a imprimer · {selected.size} selectionnee(s)
              {selected.size > 0 && <span className="font-normal text-muted-foreground"> · {selected.size * 2} page(s) a imprimer</span>}
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelected(new Set(rows.filter((r) => !r.printedAt).map((r) => r.id)))}>
                Toutes les non imprimees
              </Button>
              <Button size="sm" onClick={print} disabled={selected.size === 0}>
                <Printer className="mr-2 h-4 w-4" />Imprimer (PDF)
              </Button>
              <Button size="sm" variant="secondary" onClick={markPrinted} disabled={selected.size === 0 || busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Marquer imprimees
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <label className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={showPrinted} onChange={(e) => setShowPrinted(e.target.checked)} />
              Afficher aussi les cartes deja imprimees
            </label>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : visible.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Aucune carte a imprimer pour le moment.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Etudiant</TableHead>
                    <TableHead>Filiere</TableHead>
                    <TableHead>Carte</TableHead>
                    <TableHead>Valable jusqu'au</TableHead>
                    <TableHead>Imprimee</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((r) => (
                    <TableRow key={r.id} className="cursor-pointer" onClick={() => toggle(r.id)}>
                      <TableCell>
                        <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} onClick={(e) => e.stopPropagation()} aria-label={`Selectionner ${r.name}`} />
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{r.name || "-"}</p>
                        <p className="text-xs text-muted-foreground">{r.email}</p>
                      </TableCell>
                      <TableCell className="text-sm">{[r.field, r.level].filter(Boolean).join(" · ") || "-"}</TableCell>
                      <TableCell className="text-sm">
                        {r.freeCardRank ? (
                          <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-600">Offerte · n°{r.freeCardRank}/100</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Hors offre</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{new Date(r.expiresAt).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell className="text-sm">{r.printedAt ? new Date(r.printedAt).toLocaleDateString("fr-FR") : "Non"}</TableCell>
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
