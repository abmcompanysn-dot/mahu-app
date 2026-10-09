"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, Loader2, Send, Star, Upload } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { adminApi, type OutreachCampaign, type OutreachSender, type OutreachStats } from "@/lib/admin-api"
import { parseRecipientFile, parseRecipientText, type OutreachRecipientInput } from "@/lib/outreach-list"

// Emailing clients : envoi depuis la boite mahu.cards de Brunel ou Fanny (serveur
// mail diarra-vps), avec note en un clic et lien de desinscription dans chaque email.
const DEFAULT_SUBJECT = "{prenom}, votre avis sur votre carte Mahu ?"
const DEFAULT_BODY = `Bonjour {prenom},

Vous utilisez votre Smart Card Mahu depuis quelque temps et nous aimerions sincèrement savoir ce que vous en pensez.

Qu'est-ce qui vous plaît ? Qu'est-ce que nous devrions améliorer ? Chaque retour nous aide directement à faire évoluer la carte.

Merci pour votre confiance,`

const STATUS_LABELS: Record<OutreachCampaign["status"], string> = {
  brouillon: "Brouillon",
  envoi: "Envoi en cours",
  termine: "Termine",
}

export default function AdminEmailingPage() {
  const { token, admin } = useAdminAuth()
  const router = useRouter()
  const [senders, setSenders] = useState<OutreachSender[]>([])
  const [campaigns, setCampaigns] = useState<Array<{ campaign: OutreachCampaign; stats: OutreachStats }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [senderEmail, setSenderEmail] = useState("")
  const [subject, setSubject] = useState(DEFAULT_SUBJECT)
  const [body, setBody] = useState(DEFAULT_BODY)
  const [askFeedback, setAskFeedback] = useState(true)
  const [pasted, setPasted] = useState("")
  const [fileRecipients, setFileRecipients] = useState<OutreachRecipientInput[] | null>(null)
  const [fileName, setFileName] = useState("")
  const [testTo, setTestTo] = useState("")
  const [busy, setBusy] = useState<"" | "test" | "send">("")
  const [notice, setNotice] = useState("")
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null)

  useEffect(() => {
    if (admin?.email) setTestTo((v) => v || admin.email)
  }, [admin])

  useEffect(() => {
    if (!token) return
    Promise.all([adminApi.outreachSenders(token), adminApi.listOutreachCampaigns(token)])
      .then(([s, c]) => {
        setSenders(s.senders)
        setSenderEmail((v) => v || s.senders[0]?.email || "")
        setCampaigns(c.campaigns)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement"))
      .finally(() => setLoading(false))
  }, [token])

  const recipients = useMemo(
    () => fileRecipients ?? (pasted.trim() ? parseRecipientText(pasted) : []),
    [fileRecipients, pasted]
  )
  const draft = { senderEmail, subject, body, askFeedback }

  const onFile = async (file: File | undefined) => {
    setError("")
    if (!file) return
    try {
      const list = await parseRecipientFile(file)
      if (list.length === 0) throw new Error("Aucune adresse email trouvee dans ce fichier.")
      setFileRecipients(list)
      setFileName(file.name)
    } catch (err) {
      setFileRecipients(null)
      setFileName("")
      setError(err instanceof Error ? err.message : "Fichier illisible")
    }
  }

  const showPreview = async () => {
    if (!token) return
    setError("")
    try {
      setPreview(await adminApi.outreachPreview(token, draft))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Apercu impossible")
    }
  }

  const sendTest = async () => {
    if (!token) return
    setBusy("test")
    setError("")
    setNotice("")
    try {
      await adminApi.outreachTest(token, draft, testTo)
      setNotice(`Email de test envoye a ${testTo}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible")
    } finally {
      setBusy("")
    }
  }

  const createAndSend = async () => {
    if (!token || recipients.length === 0) return
    const sender = senders.find((s) => s.email === senderEmail)
    if (!window.confirm(`Envoyer cet email a ${recipients.length} client(s) depuis ${sender?.name} <${senderEmail}> ?`)) return
    setBusy("send")
    setError("")
    try {
      const res = await adminApi.createOutreachCampaign(token, draft, recipients)
      await adminApi.sendOutreachCampaign(token, res._id)
      router.push(`/admin/emailing/${res._id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
      setBusy("")
    }
  }

  return (
    <div className="p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Emailing clients</h1>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {notice && <p className="text-sm text-green-600">{notice}</p>}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Campagnes</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Objet</TableHead>
                      <TableHead>Expediteur</TableHead>
                      <TableHead>Envoyes</TableHead>
                      <TableHead>Avis</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map(({ campaign: c, stats: s }) => (
                      <TableRow key={c._id} className="cursor-pointer" onClick={() => router.push(`/admin/emailing/${c._id}`)}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {new Date(c.createdAt).toLocaleDateString("fr-FR")}
                        </TableCell>
                        <TableCell className="font-medium">
                          <Link href={`/admin/emailing/${c._id}`} className="hover:underline">
                            {c.subject}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm">{c.senderName}</TableCell>
                        <TableCell className="text-sm">
                          {s.sent}/{c.total}
                          {s.failed > 0 && <span className="text-destructive"> ({s.failed} echec)</span>}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {s.feedbacks > 0 ? (
                            <>
                              {s.feedbacks} &middot; {s.avgRating.toFixed(1)}{" "}
                              <Star className="inline w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            </>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{STATUS_LABELS[c.status]}</TableCell>
                      </TableRow>
                    ))}
                    {campaigns.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Aucune campagne pour l&apos;instant
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Nouvelle campagne</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {senders.length === 0 ? (
                  <p className="text-sm text-destructive">
                    Aucune boite d&apos;envoi configuree sur le backend (OUTREACH_SENDERS).
                  </p>
                ) : (
                  <div className="space-y-2">
                    <Label>Expediteur</Label>
                    <Select value={senderEmail} onValueChange={setSenderEmail}>
                      <SelectTrigger className="w-full sm:w-96">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {senders.map((s) => (
                          <SelectItem key={s.email} value={s.email}>
                            {s.name} &lt;{s.email}&gt;
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Les reponses des clients arrivent dans cette boite.</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="subject">Objet</Label>
                  <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="body">Message</Label>
                  <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} rows={12} />
                  <p className="text-xs text-muted-foreground">
                    {"{prenom}"} et {"{nom}"} sont remplaces pour chaque client. La signature (nom de l&apos;expediteur,
                    MAHU DIGITAL SYSTEM) et le lien de desinscription sont ajoutes automatiquement.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Switch id="ask" checked={askFeedback} onCheckedChange={setAskFeedback} />
                  <Label htmlFor="ask">Ajouter la note en un clic (1 a 5 etoiles + commentaire)</Label>
                </div>

                <div className="space-y-2">
                  <Label>Liste des clients</Label>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
                      <Upload className="w-4 h-4" />
                      Importer Excel ou CSV
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv,.txt"
                        className="hidden"
                        onChange={(e) => {
                          onFile(e.target.files?.[0])
                          e.target.value = ""
                        }}
                      />
                    </label>
                    {fileName && (
                      <span className="text-sm text-muted-foreground">
                        {fileName}{" "}
                        <button
                          type="button"
                          className="text-primary hover:underline"
                          onClick={() => {
                            setFileRecipients(null)
                            setFileName("")
                          }}
                        >
                          retirer
                        </button>
                      </span>
                    )}
                  </div>
                  {!fileRecipients && (
                    <Textarea
                      value={pasted}
                      onChange={(e) => setPasted(e.target.value)}
                      rows={5}
                      placeholder={"Ou collez la liste, une ligne par client :\nemail;prenom;nom\nawa.diop@gmail.com;Awa;Diop"}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    Colonnes reconnues par leur titre : email, prenom, nom (ou un seul &quot;nom complet&quot;). Les doublons,
                    adresses invalides et clients desinscrits sont retires a la creation.
                  </p>
                  {recipients.length > 0 && (
                    <div className="rounded-md border p-3 text-sm">
                      <p className="font-medium">{recipients.length} client(s) detecte(s)</p>
                      <ul className="mt-1 text-muted-foreground">
                        {recipients.slice(0, 5).map((r) => (
                          <li key={r.email}>
                            {r.email} {r.firstName && `- ${r.firstName} ${r.lastName}`}
                          </li>
                        ))}
                        {recipients.length > 5 && <li>...</li>}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-end">
                  <div className="space-y-2">
                    <Label htmlFor="testTo">Email de test</Label>
                    <Input id="testTo" value={testTo} onChange={(e) => setTestTo(e.target.value)} className="sm:w-72" />
                  </div>
                  <Button variant="outline" onClick={showPreview} disabled={!!busy || !senderEmail}>
                    <Eye className="w-4 h-4 mr-2" />
                    Apercu
                  </Button>
                  <Button variant="outline" onClick={sendTest} disabled={!!busy || !senderEmail || !testTo}>
                    {busy === "test" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    M&apos;envoyer un test
                  </Button>
                  <Button onClick={createAndSend} disabled={!!busy || !senderEmail || recipients.length === 0} className="sm:ml-auto">
                    {busy === "send" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Envoyer a {recipients.length} client(s)
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  L&apos;envoi se fait en arriere-plan, environ 15 emails par minute, pour ne pas etre classe en spam.
                </p>
              </CardContent>
            </Card>

            <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
              <DialogContent className="max-w-3xl p-0 overflow-hidden">
                <DialogHeader className="px-5 pt-5">
                  <DialogTitle className="text-base">
                    <span className="text-muted-foreground font-normal">Objet : </span>
                    {preview?.subject}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground">Exemple avec la cliente « Awa Diop ».</p>
                </DialogHeader>
                {preview && (
                  <iframe title="Apercu de l'email" srcDoc={preview.html} sandbox="" className="w-full h-[70vh] border-t bg-white" />
                )}
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  )
}
