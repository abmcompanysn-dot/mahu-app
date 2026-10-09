"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Download, Loader2, RotateCcw, Send, Star, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { adminApi, type OutreachCampaign, type OutreachRecipient, type OutreachStats } from "@/lib/admin-api"

const RECIPIENT_LABELS: Record<OutreachRecipient["status"], string> = {
  en_attente: "En attente",
  envoye: "Envoye",
  echec: "Echec",
  desinscrit: "Desinscrit",
}

type Filter = "tous" | "avis" | OutreachRecipient["status"]

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex" aria-label={`${n}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`w-4 h-4 ${i <= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </span>
  )
}

function csvCell(v: string | number | undefined) {
  const s = String(v ?? "")
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export default function AdminEmailingCampaignPage() {
  const { id } = useParams<{ id: string }>()
  const { token } = useAdminAuth()
  const router = useRouter()
  const [data, setData] = useState<{
    campaign: OutreachCampaign
    recipients: OutreachRecipient[]
    stats: OutreachStats
    running: boolean
  } | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState<Filter>("tous")

  const load = useCallback(() => {
    if (!token || !id) return
    adminApi
      .getOutreachCampaign(token, id)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement"))
  }, [token, id])

  useEffect(load, [load])

  // Rafraichit pendant l'envoi pour suivre la progression.
  const sending = data?.campaign.status === "envoi"
  useEffect(() => {
    if (!sending) return
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [sending, load])

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setError("")
    try {
      await fn()
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setBusy(false)
    }
  }

  if (!data) {
    return (
      <div className="p-10 flex justify-center">
        {error ? <p className="text-sm text-destructive">{error}</p> : <Loader2 className="w-6 h-6 animate-spin" />}
      </div>
    )
  }

  const { campaign: c, recipients, stats: s } = data
  const done = s.sent + s.failed + s.unsubscribed
  const shown = recipients.filter((r) =>
    filter === "tous" ? true : filter === "avis" ? (r.rating ?? 0) > 0 : r.status === filter
  )
  const feedbacks = recipients.filter((r) => (r.rating ?? 0) > 0)

  const exportCsv = () => {
    const lines = [
      ["email", "prenom", "nom", "statut", "note", "commentaire", "date avis"].join(";"),
      ...recipients.map((r) =>
        [r.email, r.firstName, r.lastName, RECIPIENT_LABELS[r.status], r.rating || "", r.comment, r.feedbackAt ? new Date(r.feedbackAt).toLocaleString("fr-FR") : ""]
          .map(csvCell)
          .join(";")
      ),
    ]
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `avis-${c.subject.slice(0, 30).replace(/[^\w-]+/g, "-")}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <Link href="/admin/emailing" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Campagnes
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{c.subject}</h1>
          <p className="text-sm text-muted-foreground">
            De {c.senderName} &lt;{c.senderEmail}&gt; &middot; creee le {new Date(c.createdAt).toLocaleString("fr-FR")}
          </p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
          {[
            ["Envoyes", `${s.sent}/${c.total}`],
            ["En attente", s.pending],
            ["Echecs", s.failed],
            ["Desinscrits", s.unsubscribed],
            ["Avis", s.feedbacks > 0 ? `${s.feedbacks} - ${s.avgRating.toFixed(1)}/5` : "0"],
          ].map(([label, value]) => (
            <Card key={label as string}>
              <CardContent className="pt-5">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {sending && (
          <div className="rounded-md border p-4 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours : {done}/{c.total}
            </div>
            <div className="mt-2 h-2 rounded bg-muted">
              <div className="h-2 rounded bg-primary" style={{ width: `${(done / Math.max(c.total, 1)) * 100}%` }} />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {(c.status === "brouillon" || (s.pending > 0 && !data.running)) && (
            <Button disabled={busy} onClick={() => act(() => adminApi.sendOutreachCampaign(token!, c._id))}>
              <Send className="w-4 h-4 mr-2" /> {c.status === "brouillon" ? "Lancer l'envoi" : "Reprendre l'envoi"}
            </Button>
          )}
          {s.failed > 0 && !sending && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                act(async () => {
                  await adminApi.retryOutreachFailed(token!, c._id)
                  await adminApi.sendOutreachCampaign(token!, c._id)
                })
              }
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Renvoyer les {s.failed} echec(s)
            </Button>
          )}
          <Button variant="outline" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-2" /> Exporter CSV
          </Button>
          {c.status === "brouillon" && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                if (!window.confirm("Supprimer ce brouillon ?")) return
                act(async () => {
                  await adminApi.deleteOutreachCampaign(token!, c._id)
                  router.push("/admin/emailing")
                })
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Supprimer
            </Button>
          )}
        </div>

        {feedbacks.some((r) => r.comment) && (
          <Card>
            <CardHeader>
              <CardTitle>Commentaires</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {feedbacks
                .filter((r) => r.comment)
                .map((r) => (
                  <div key={r._id} className="border-b pb-3 last:border-0">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Stars n={r.rating!} />
                      <span className="font-medium">{`${r.firstName} ${r.lastName}`.trim() || r.email}</span>
                      <a href={`mailto:${r.email}`} className="text-xs text-primary hover:underline">
                        {r.email}
                      </a>
                    </div>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{r.comment}</p>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle>Destinataires</CardTitle>
            <div className="flex flex-wrap gap-1">
              {(["tous", "avis", "envoye", "en_attente", "echec", "desinscrit"] as Filter[]).map((f) => (
                <Button key={f} size="sm" variant={filter === f ? "default" : "ghost"} onClick={() => setFilter(f)}>
                  {f === "tous" ? "Tous" : f === "avis" ? "Avec avis" : RECIPIENT_LABELS[f]}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Commentaire</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((r) => (
                  <TableRow key={r._id}>
                    <TableCell>
                      <div className="font-medium">{`${r.firstName} ${r.lastName}`.trim() || "-"}</div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className={r.status === "echec" ? "text-destructive" : ""}>{RECIPIENT_LABELS[r.status]}</span>
                      {r.error && <div className="text-xs text-muted-foreground max-w-xs truncate" title={r.error}>{r.error}</div>}
                    </TableCell>
                    <TableCell>{r.rating ? <Stars n={r.rating} /> : "-"}</TableCell>
                    <TableCell className="text-sm max-w-sm whitespace-pre-wrap">{r.comment || "-"}</TableCell>
                  </TableRow>
                ))}
                {shown.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Aucun destinataire
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
