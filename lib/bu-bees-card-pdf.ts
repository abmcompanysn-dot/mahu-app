import { jsPDF } from "jspdf"
import QRCode from "qrcode"

// PDF des cartes MAHU Bu Bees (edition Teranga), telecharge directement depuis
// l'admin (generateur). Une carte differente par code : le QR code ouvre
// call.mahu.cards/c/CODE ; une carte neuve scannee ouvre l'inscription avec le
// code deja rempli. Le decor fixe vient de public/bu-bees/fond-*.jpg (~430 dpi,
// genere par assets/carte-bu-bees/src/gen_fonds.py) ; le QR code, le nom et le
// code sont dessines en vectoriel par-dessus, donc nets a toute taille.
// - "pvc" : une page = une carte 85,6 x 54 mm (recto puis verso), pour les
//   imprimantes a cartes PVC (Evolis, Zebra...) ;
// - "a4"  : feuilles A4 paysage de 9 cartes (3 x 3) avec reperes de coupe,
//   recto puis verso (verso identique pour toutes : l'ordre au retournement
//   n'a pas d'importance).

export interface BuBeesCard {
  /** Vide pour une carte de lot sans nom. */
  name: string
  code: string
}

export type BuBeesFormat = "a4" | "pvc"

const W = 85.6
const H = 54
const SITE = "https://call.mahu.cards"
const YELLOW = "#FDEF42"
const QR_DARK = "#0b1a12"
// Case blanche du QR code dans le fond (cotes du dessin de reference).
const TILE = { right: 5.5, top: 6, size: 28, pad: 2.2 }
const BOTTOM = 5.6
const PT = 0.3528 // 1 pt en mm

export const cardUrl = (code: string) => `${SITE}/c/${encodeURIComponent(code)}`

let assets: { fonts: { black: string; bold: string }; recto: string; verso: string } | null = null

async function toBase64(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Impossible de charger ${url}`)
  const bytes = new Uint8Array(await res.arrayBuffer())
  let bin = ""
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

async function newDoc(format: BuBeesFormat) {
  if (!assets) {
    const [black, bold, recto, verso] = await Promise.all([
      toBase64("/fonts/Montserrat-Black.ttf"),
      toBase64("/fonts/Montserrat-Bold.ttf"),
      toBase64("/bu-bees/fond-recto.jpg"),
      toBase64("/bu-bees/fond-verso.jpg"),
    ])
    assets = { fonts: { black, bold }, recto, verso }
  }
  const doc = new jsPDF({ unit: "mm", orientation: "landscape", format: format === "pvc" ? [W, H] : "a4", compress: true })
  doc.addFileToVFS("Montserrat-Black.ttf", assets.fonts.black)
  doc.addFont("Montserrat-Black.ttf", "Montserrat", "black")
  doc.addFileToVFS("Montserrat-Bold.ttf", assets.fonts.bold)
  doc.addFont("Montserrat-Bold.ttf", "Montserrat", "bold")
  return doc
}

// Le meme alias fait que jsPDF n'integre chaque fond qu'une seule fois.
function background(doc: jsPDF, x: number, y: number, side: "recto" | "verso") {
  doc.addImage(assets![side], "JPEG", x, y, W, H, `bb-${side}`, "NONE")
}

function drawRecto(doc: jsPDF, x: number, y: number, c: BuBeesCard) {
  background(doc, x, y, "recto")

  // QR code de la carte, sur la case blanche du fond
  const qr = QRCode.create(cardUrl(c.code), { errorCorrectionLevel: "M" })
  const n = qr.modules.size
  const area = TILE.size - 2 * TILE.pad
  const cell = area / n
  const qx = x + W - TILE.right - TILE.size + TILE.pad
  const qy = y + TILE.top + TILE.pad
  doc.setFillColor(QR_DARK)
  for (let r = 0; r < n; r++) {
    for (let col = 0; col < n; col++) {
      // +0,02 mm : pas de fil blanc entre deux modules voisins a l'impression
      if (qr.modules.get(r, col)) doc.rect(qx + col * cell, qy + r * cell, cell + 0.02, cell + 0.02, "F")
    }
  }

  // code de la carte, sous le QR code (pour l'activer a la main si besoin)
  doc.setFont("Montserrat", "bold")
  doc.setFontSize(1.7 / PT)
  doc.setTextColor("#aab6af")
  doc.text(c.code, x + W - TILE.right - TILE.size / 2, y + H - BOTTOM - 0.4, { align: "center", charSpace: 0.3 })

  // nom du titulaire (2 lignes au plus), au-dessus : « Smart Card · Edition Teranga »
  let labelBase = y + H - BOTTOM - 0.4
  const name = c.name.trim().toLocaleUpperCase("fr-FR")
  if (name) {
    let size = 3.4
    doc.setFontSize(size / PT)
    let lines = doc.splitTextToSize(name, 46) as string[]
    if (lines.length > 1) {
      size = 2.7
      doc.setFontSize(size / PT)
      lines = (doc.splitTextToSize(name, 46) as string[]).slice(0, 2)
    }
    const lh = size * 1.15
    doc.setTextColor("#ffffff")
    const lastBase = y + H - BOTTOM - size * 0.22
    lines.forEach((line, i) => doc.text(line, x + 6.5, lastBase - (lines.length - 1 - i) * lh, { charSpace: size > 3 ? 0.4 : 0.25 }))
    labelBase = lastBase - (lines.length - 1) * lh - size * 0.75 - 1.1
  }
  doc.setFontSize(1.65 / PT)
  doc.setTextColor(YELLOW)
  doc.text("SMART CARD · ÉDITION TERANGA", x + 6.5, labelBase, { charSpace: 0.4 })
}

function cropMarks(doc: jsPDF, left: number, top: number) {
  doc.setDrawColor("#000000")
  doc.setLineWidth(0.2)
  const len = 6, gap = 2
  for (let i = 0; i <= 3; i++) {
    const xx = left + i * W
    doc.line(xx, top - gap - len, xx, top - gap)
    doc.line(xx, top + 3 * H + gap, xx, top + 3 * H + gap + len)
    const yy = top + i * H
    doc.line(left - gap - len, yy, left - gap, yy)
    doc.line(left + 3 * W + gap, yy, left + 3 * W + gap + len, yy)
  }
}

/** Construit le PDF des cartes (une carte differente par code). */
export async function buildBuBeesPdf(cards: BuBeesCard[], format: BuBeesFormat): Promise<jsPDF> {
  const doc = await newDoc(format)
  let first = true
  const page = () => {
    if (!first) doc.addPage()
    first = false
  }
  if (format === "pvc") {
    for (const c of cards) {
      page()
      drawRecto(doc, 0, 0, c)
      page()
      background(doc, 0, 0, "verso")
    }
    return doc
  }
  const left = (297 - 3 * W) / 2
  const top = (210 - 3 * H) / 2
  for (let s = 0; s < cards.length; s += 9) {
    const chunk = cards.slice(s, s + 9)
    const sheet = s / 9 + 1
    for (const side of ["recto", "verso"] as const) {
      page()
      chunk.forEach((c, k) => {
        const cx = left + (k % 3) * W
        const cy = top + Math.floor(k / 3) * H
        if (side === "recto") drawRecto(doc, cx, cy, c)
        else background(doc, cx, cy, "verso")
      })
      cropMarks(doc, left, top)
      doc.setFont("Montserrat", "bold")
      doc.setFontSize(7)
      doc.setTextColor("#777777")
      doc.text(
        `Feuille ${sheet} · ${side.toUpperCase()} · ${chunk.length} carte(s) 85,6 x 54 mm${side === "verso" ? " (retourner la feuille)" : ""}`,
        left,
        210 - 6
      )
    }
  }
  return doc
}

/** Telecharge directement le PDF (admin). */
export async function downloadBuBeesPdf(cards: BuBeesCard[], format: BuBeesFormat) {
  const doc = await buildBuBeesPdf(cards, format)
  const day = new Date().toISOString().slice(0, 10)
  doc.save(`mahu-bu-bees-${cards.length}-carte${cards.length > 1 ? "s" : ""}-${format === "pvc" ? "pvc" : "a4"}-${day}.pdf`)
}
