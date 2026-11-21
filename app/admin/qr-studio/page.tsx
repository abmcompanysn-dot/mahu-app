"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Download, FileDown, ImagePlus, Loader2, QrCode, ShieldQuestion, Trash2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { adminApi } from "@/lib/admin-api"
import { cardUrl } from "@/lib/bu-bees-card-pdf"
import {
  DEFAULT_STYLE,
  buildQrSvg,
  downloadBlob,
  downloadNfcCsv,
  downloadQrSheet,
  svgToPng,
  verifyQr,
  type DotShape,
  type FrameStyle,
  type QrItem,
  type QrStyle,
} from "@/lib/qr-studio"

// Studio QR : QR codes personnalises (logo au centre, couleurs, formes, cadre, legende)
// pour un lien libre, un profil MAHU, un lot de liens vierges (codes neufs, actives
// plus tard par le client) ou des codes de cartes existants. Exports PNG / SVG /
// planche PDF A4 / CSV pour programmer les puces NFC.

type Source = "lien" | "profil" | "vierges" | "codes"

const LOT_LABEL = "Studio QR"
const LOT_PREFIX = "QR"
const PROFILE_BASE = "https://call.mahu.cards/p/"

const PRESETS: { name: string; fg: string; bg: string; frame: FrameStyle; frameColor: string }[] = [
  { name: "Noir", fg: "#0b1220", bg: "#ffffff", frame: "none", frameColor: "#0b1220" },
  { name: "MAHU bleu", fg: "#0040a8", bg: "#ffffff", frame: "color", frameColor: "#0a84ff" },
  { name: "Bordeaux & or", fg: "#4a0f1c", bg: "#ffffff", frame: "gold", frameColor: "#c9a24a" },
  { name: "Vert Senegal", fg: "#00602d", bg: "#ffffff", frame: "color", frameColor: "#00853F" },
  { name: "Inverse (fond noir)", fg: "#f6e2a6", bg: "#111111", frame: "gold", frameColor: "#c9a24a" },
]

async function fileToLogo(file: File): Promise<string> {
  // le logo est reduit a 600 px (PNG) : assez net pour l'impression, et le SVG reste leger
  const src = await new Promise<string>((ok, ko) => {
    const r = new FileReader()
    r.onload = () => ok(String(r.result))
    r.onerror = () => ko(new Error("Lecture du logo impossible"))
    r.readAsDataURL(file)
  })
  const img = new Image()
  await new Promise<void>((ok, ko) => {
    img.onload = () => ok()
    img.onerror = () => ko(new Error("Image non reconnue"))
    img.src = src
  })
  const scale = Math.min(1, 600 / Math.max(img.width, img.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(img.width * scale))
  canvas.height = Math.max(1, Math.round(img.height * scale))
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL("image/png")
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "qr"

export default function QrStudioPage() {
  const { token } = useAdminAuth()
  const [source, setSource] = useState<Source>("lien")
  const [url, setUrl] = useState("https://")
  const [username, setUsername] = useState("")
  const [quantity, setQuantity] = useState(10)
  const [codesText, setCodesText] = useState("")
  const [lot, setLot] = useState<QrItem[]>([])
  const [style, setStyle] = useState<QrStyle>(DEFAULT_STYLE)
  const [sheetSize, setSheetSize] = useState(40)
  const [check, setCheck] = useState<boolean | null | "pending">(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const set = <K extends keyof QrStyle>(k: K, v: QrStyle[K]) => setStyle((s) => ({ ...s, [k]: v }))

  const items: QrItem[] = useMemo(() => {
    if (source === "lien") return url.trim().length > 8 ? [{ url: url.trim(), label: "" }] : []
    if (source === "profil") {
      const u = username.trim().replace(/^@/, "")
      return u ? [{ url: PROFILE_BASE + encodeURIComponent(u), label: u }] : []
    }
    if (source === "codes")
      return codesText
        .split(/[\s,;]+/)
        .map((c) => c.trim())
        .filter(Boolean)
        .map((c) => ({ url: cardUrl(c), label: c }))
    return lot
  }, [source, url, username, codesText, lot])

  const preview = items[0]
  const svg = useMemo(() => (preview ? buildQrSvg(preview.url, style) : ""), [preview, style])

  // relecture automatique du QR apres chaque changement (si le navigateur sait le faire)
  useEffect(() => {
    if (!svg || !preview) {
      setCheck(null)
      return
    }
    let alive = true
    setCheck("pending")
    const t = setTimeout(async () => {
      const ok = await verifyQr(svg, preview.url)
      if (alive) setCheck(ok)
    }, 350)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [svg, preview])

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError("")
    setMessage("")
    try {
      await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setBusy(false)
    }
  }

  const createLot = () =>
    run(async () => {
      if (!token) return
      const n = Math.max(1, Math.min(500, Math.floor(quantity) || 0))
      const res = await adminApi.generateCardLot(token, n, LOT_LABEL, LOT_PREFIX)
      if (!res.success || !res.codes?.length) throw new Error(res.error || "Les liens n'ont pas été créés.")
      setLot(res.codes.map((code) => ({ url: cardUrl(code), label: code })))
      setMessage(`${res.codes.length} lien(s) vierge(s) créé(s) (${res.batchId}). Ils s'activent quand le client scanne sa carte.`)
    })

  const baseName = preview ? slug(preview.label || preview.url.replace(/^https?:\/\//, "")) : "qr"

  return (
    <div className="p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <QrCode className="w-6 h-6" /> Studio QR
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            QR codes personnalisés pour les cartes : logo au centre, couleurs, formes, cadre et légende. Pour un lien, un
            profil MAHU, un lot de liens vierges ou des codes de cartes existants.
          </p>
        </div>

        {message && <p className="text-sm text-emerald-500">{message}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">1. Où mène le QR code ?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex flex-wrap gap-4">
                  {(
                    [
                      ["lien", "Lien libre"],
                      ["profil", "Profil MAHU"],
                      ["vierges", "Lot de liens vierges"],
                      ["codes", "Codes de cartes existants"],
                    ] as [Source, string][]
                  ).map(([k, label]) => (
                    <label key={k} className="flex items-center gap-2">
                      <input type="radio" checked={source === k} onChange={() => setSource(k)} />
                      {label}
                    </label>
                  ))}
                </div>
                {source === "lien" && (
                  <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.exemple.com, https://wa.me/221..." />
                )}
                {source === "profil" && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground whitespace-nowrap">call.mahu.cards/p/</span>
                    <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="nom-du-profil" />
                  </div>
                )}
                {source === "vierges" && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Input type="number" min={1} max={500} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-28" />
                      <Button onClick={createLot} disabled={busy || !token}>
                        {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <QrCode className="w-4 h-4 mr-2" />}
                        Créer les liens vierges
                      </Button>
                    </div>
                    <p className="text-muted-foreground">
                      Chaque lien a un code unique (jamais deux fois le même), enregistré comme carte « {LOT_LABEL} ». Le client
                      scanne ou touche sa carte : l&apos;activation s&apos;ouvre avec le code déjà rempli.
                    </p>
                    {lot.length > 0 && <p className="font-medium">{lot.length} lien(s) prêt(s) : {lot.slice(0, 4).map((i) => i.label).join(", ")}{lot.length > 4 ? "…" : ""}</p>}
                  </div>
                )}
                {source === "codes" && (
                  <Textarea value={codesText} onChange={(e) => setCodesText(e.target.value)} rows={5} placeholder={"Un code de carte par ligne :\nQR-AB12CD\nBB-9XK3LM"} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">2. Style</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 text-sm">
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <Button
                      key={p.name}
                      size="sm"
                      variant="outline"
                      onClick={() => setStyle((s) => ({ ...s, fg: p.fg, bg: p.bg, frame: p.frame, frameColor: p.frameColor }))}
                    >
                      <span className="inline-block w-3 h-3 rounded-full mr-2 border" style={{ background: p.fg }} />
                      {p.name}
                    </Button>
                  ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="font-medium">Logo au centre</p>
                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-2 cursor-pointer rounded-md border px-3 py-2 hover:bg-muted">
                        <ImagePlus className="w-4 h-4" /> Choisir une image
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          className="hidden"
                          onChange={async (e) => {
                            const f = e.target.files?.[0]
                            if (!f) return
                            try {
                              set("logo", await fileToLogo(f))
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Logo non chargé")
                            }
                            e.target.value = ""
                          }}
                        />
                      </label>
                      {style.logo && (
                        <Button size="sm" variant="ghost" onClick={() => set("logo", "")}>
                          <Trash2 className="w-4 h-4 mr-1" /> Retirer
                        </Button>
                      )}
                    </div>
                    {style.logo && (
                      <label className="flex items-center gap-3">
                        Taille
                        <input
                          type="range"
                          min={0.12}
                          max={0.3}
                          step={0.01}
                          value={style.logoSize}
                          onChange={(e) => set("logoSize", Number(e.target.value))}
                        />
                        <span className="text-muted-foreground">{Math.round(style.logoSize * 100)} %</span>
                      </label>
                    )}
                    <p className="text-xs text-muted-foreground">PNG transparent conseillé. Avec un logo, le QR passe en correction maximale (30 %).</p>
                  </div>

                  <div className="space-y-2">
                    <p className="font-medium">Couleurs</p>
                    <label className="flex items-center gap-3">
                      <input type="color" value={style.fg} onChange={(e) => set("fg", e.target.value)} /> Points du QR
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="color" value={style.bg} onChange={(e) => set("bg", e.target.value)} /> Fond
                    </label>
                    <p className="text-xs text-muted-foreground">Gardez des points foncés sur un fond clair pour une lecture sûre.</p>
                  </div>

                  <div className="space-y-2">
                    <p className="font-medium">Forme des points</p>
                    <div className="flex flex-wrap gap-3">
                      {(
                        [
                          ["square", "Carrés"],
                          ["rounded", "Arrondis"],
                          ["dots", "Ronds"],
                        ] as [DotShape, string][]
                      ).map(([k, l]) => (
                        <label key={k} className="flex items-center gap-2">
                          <input type="radio" checked={style.dots === k} onChange={() => set("dots", k)} /> {l}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="font-medium">Cadre</p>
                    <div className="flex flex-wrap gap-3">
                      {(
                        [
                          ["none", "Aucun"],
                          ["gold", "Doré"],
                          ["color", "Couleur"],
                        ] as [FrameStyle, string][]
                      ).map(([k, l]) => (
                        <label key={k} className="flex items-center gap-2">
                          <input type="radio" checked={style.frame === k} onChange={() => set("frame", k)} /> {l}
                        </label>
                      ))}
                    </div>
                    {style.frame === "color" && (
                      <label className="flex items-center gap-3">
                        <input type="color" value={style.frameColor} onChange={(e) => set("frameColor", e.target.value)} /> Couleur du cadre
                      </label>
                    )}
                    <p className="font-medium pt-2">Légende</p>
                    <div className="flex flex-wrap gap-2">
                      <Input value={style.caption} maxLength={28} onChange={(e) => set("caption", e.target.value)} placeholder="ex. SCANNEZ-MOI" className="w-48" />
                      {["SCANNEZ-MOI", "MON PROFIL", "CONTACTEZ-MOI"].map((c) => (
                        <Button key={c} size="sm" variant="ghost" onClick={() => set("caption", c)}>
                          {c}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 lg:sticky lg:top-6 self-start">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Aperçu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {svg ? (
                  <div className="rounded-xl border bg-[repeating-conic-gradient(#f3f4f6_0_25%,#fff_0_50%)] bg-[length:16px_16px] p-4">
                    {/* SVG construit par buildQrSvg (texte de legende echappe, logo en data URL) */}
                    <div className="mx-auto max-w-[300px]" dangerouslySetInnerHTML={{ __html: svg }} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-10 text-center">Indiquez un lien, un profil ou créez des liens vierges.</p>
                )}
                {preview && (
                  <p className="text-xs break-all text-muted-foreground">
                    {items.length > 1 ? `Aperçu du 1er sur ${items.length} : ` : ""}
                    {preview.url}
                  </p>
                )}
                {svg && (
                  <div className="text-sm flex items-center gap-2">
                    {check === "pending" && <Loader2 className="w-4 h-4 animate-spin" />}
                    {check === true && (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Lecture vérifiée : le QR se scanne.
                      </>
                    )}
                    {check === false && (
                      <>
                        <XCircle className="w-4 h-4 text-destructive" /> Lecture difficile : réduisez le logo ou foncez les points.
                      </>
                    )}
                    {check === null && (
                      <>
                        <ShieldQuestion className="w-4 h-4 text-muted-foreground" /> Testez-le avec l&apos;appareil photo de votre téléphone avant d&apos;imprimer.
                      </>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    disabled={!svg || busy}
                    onClick={() => run(async () => downloadBlob(await svgToPng(svg, 2000), `${baseName}-qr.png`))}
                  >
                    <Download className="w-4 h-4 mr-2" /> PNG HD
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!svg}
                    onClick={() => downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `${baseName}-qr.svg`)}
                  >
                    <Download className="w-4 h-4 mr-2" /> SVG (imprimeur)
                  </Button>
                </div>
                {items.length > 0 && (
                  <div className="space-y-2 border-t pt-4">
                    <p className="text-sm font-medium">Planche A4 ({items.length} QR code{items.length > 1 ? "s" : ""})</p>
                    <label className="flex items-center gap-3 text-sm">
                      Taille
                      <input type="range" min={20} max={80} step={5} value={sheetSize} onChange={(e) => setSheetSize(Number(e.target.value))} />
                      <span className="text-muted-foreground">{sheetSize} mm</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => run(async () => downloadQrSheet(items, style, sheetSize, `${baseName}-planche-A4.pdf`))}
                      >
                        <FileDown className="w-4 h-4 mr-2" /> PDF A4
                      </Button>
                      {(source === "vierges" || source === "codes") && (
                        <Button variant="outline" onClick={() => downloadNfcCsv(items, `${baseName}-puces-nfc.csv`)}>
                          <Download className="w-4 h-4 mr-2" /> CSV puces NFC
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
