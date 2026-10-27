import { GState, jsPDF } from "jspdf"
import QRCode from "qrcode"
import type { StudentCard } from "@/lib/student-cards-print"

// PDF vectoriels des cartes etudiants (telechargement direct depuis l'admin) :
// - "pvc" : une page = une carte 85,6 x 54 mm (recto puis verso), pour les
//   imprimantes a cartes PVC (Evolis, Zebra...) ;
// - "a4"  : feuille A4 paysage de 9 cartes (3 x 3) avec reperes de coupe.
// Meme dessin que l'apercu HTML (lib/student-cards-print.ts).

const W = 85.6
const H = 54
const SITE = "https://call.mahu.cards"
const BLUE = "#007AFF"
const SKY = "#4da3ff"

type Pt = [number, number]

// Logo Mahu (coordonnees du viewBox 120 140 272 232 de public/icons/icon-512.png).
const LOGO_BOX = { x: 120, y: 140, w: 272, h: 232 }
const LOGO_SHAPES: Pt[][] = [
  [[152.5, 207], [183.5, 309.5], [126, 309.5]],
  [[180, 149], [236.5, 149], [284.5, 309.5], [227, 309.5]],
  [[282, 149], [337.5, 149], [386.5, 309.5], [329, 309.5]],
]
const LOGO_BAR = { x: 209, y: 348, w: 94, h: 18 }

let fontsBase64: { black: string; bold: string } | null = null

async function toBase64(url: string) {
  const buf = await (await fetch(url)).arrayBuffer()
  let bin = ""
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

async function newDoc(format: "pvc" | "a4") {
  if (!fontsBase64) {
    const [black, bold] = await Promise.all([toBase64("/fonts/Montserrat-Black.ttf"), toBase64("/fonts/Montserrat-Bold.ttf")])
    fontsBase64 = { black, bold }
  }
  const doc = new jsPDF({ unit: "mm", orientation: "landscape", format: format === "pvc" ? [W, H] : "a4", compress: true })
  doc.addFileToVFS("Montserrat-Black.ttf", fontsBase64.black)
  doc.addFont("Montserrat-Black.ttf", "Montserrat", "black")
  doc.addFileToVFS("Montserrat-Bold.ttf", fontsBase64.bold)
  doc.addFont("Montserrat-Bold.ttf", "Montserrat", "bold")
  return doc
}

function poly(doc: jsPDF, pts: Pt[], style: "F" | "S" | "FD") {
  const deltas = pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]])
  doc.lines(deltas, pts[0][0], pts[0][1], [1, 1], style, true)
}

function opacity(doc: jsPDF, a: number) {
  doc.setGState(new GState({ opacity: a }))
}

function logo(doc: jsPDF, x: number, y: number, height: number, color: string) {
  const k = height / LOGO_BOX.h
  const at = (p: Pt): Pt => [x + (p[0] - LOGO_BOX.x) * k, y + (p[1] - LOGO_BOX.y) * k]
  doc.setFillColor(color)
  for (const shape of LOGO_SHAPES) poly(doc, shape.map(at), "F")
  const [bx, by] = at([LOGO_BAR.x, LOGO_BAR.y])
  doc.setFillColor(BLUE)
  doc.roundedRect(bx, by, LOGO_BAR.w * k, LOGO_BAR.h * k, (LOGO_BAR.h * k) / 2, (LOGO_BAR.h * k) / 2, "F")
  return (LOGO_BOX.w * k) // largeur
}

// Fond noir, halo bleu en haut a droite et bandes obliques discretes.
function background(doc: jsPDF, x: number, y: number) {
  doc.setFillColor("#0a0a0a")
  doc.rect(x, y, W, H, "F")
  // le halo et les bandes ne doivent pas deborder de la carte (planche A4)
  doc.saveGraphicsState()
  doc.rect(x, y, W, H, null)
  doc.clip()
  doc.discardPath()
  doc.setFillColor(BLUE)
  for (let r = 46; r >= 6; r -= 4) {
    opacity(doc, 0.035)
    doc.circle(x + W, y, r, "F")
  }
  doc.setFillColor("#ffffff")
  opacity(doc, 0.045)
  poly(doc, [[x + 53, y], [x + 64, y], [x + 47.5, y + H], [x + 36.5, y + H]], "F")
  opacity(doc, 0.03)
  poly(doc, [[x + 67, y], [x + 78, y], [x + 61.5, y + H], [x + 50.5, y + H]], "F")
  opacity(doc, 1)
  doc.restoreGraphicsState()
}

// Competences imprimees : les premieres, tant qu'elles tiennent sur une ligne.
function cardSkills(skills: string[] = []) {
  const out: string[] = []
  let chars = 0
  for (const sk of skills) {
    const label = sk.length > 22 ? `${sk.slice(0, 21)}…` : sk
    if (out.length >= 5 || chars + label.length > 52) break
    out.push(label)
    chars += label.length + 4
  }
  return out
}

function drawRecto(doc: jsPDF, x: number, y: number, c: StudentCard) {
  background(doc, x, y)
  const pad = 4.6
  // marque : logo + "mahu"
  const lw = logo(doc, x + pad, y + 4.2, 6.4, "#ffffff")
  doc.setFont("Montserrat", "black")
  doc.setFontSize(13)
  doc.setTextColor("#ffffff")
  doc.text("mahu", x + pad + lw + 1.6, y + 4.2 + 3.2, { baseline: "middle" })

  // nom (2 lignes max) puis metier
  doc.setFontSize(14.5)
  const nameLines = (doc.splitTextToSize(c.name || "", 56) as string[]).slice(0, 2)
  let cy = y + 17.4
  for (const line of nameLines) {
    doc.text(line, x + pad, cy, { baseline: "alphabetic" })
    cy += 5.4
  }
  const job = c.title || c.field || ""
  if (job) {
    doc.setFont("Montserrat", "bold")
    doc.setFontSize(7.6)
    doc.setTextColor(SKY)
    doc.text((doc.splitTextToSize(job, 56) as string[])[0], x + pad, cy - 1.2)
  }

  // competences en pastilles, en bas a gauche
  const skills = cardSkills(c.skills)
  if (skills.length) {
    doc.setFont("Montserrat", "bold")
    doc.setFontSize(5.2)
    let sx = x + pad
    const sy = y + H - 4.2 - 3.2
    for (const sk of skills) {
      const tw = doc.getTextWidth(sk) + 2.6
      if (sx + tw > x + pad + 55) break
      doc.setDrawColor("#ffffff")
      doc.setLineWidth(0.2)
      opacity(doc, 0.3)
      doc.roundedRect(sx, sy, tw, 3.2, 1, 1, "S")
      opacity(doc, 0.9)
      doc.setTextColor("#ffffff")
      doc.text(sk, sx + 1.3, sy + 1.6, { baseline: "middle" })
      opacity(doc, 1)
      sx += tw + 1
    }
  }

  // QR code vers le portfolio, sur fond blanc arrondi
  const size = 19.5
  const qx = x + W - 4.2 - size
  const qy = y + H - 4.2 - size
  doc.setFillColor("#ffffff")
  doc.roundedRect(qx, qy, size, size, 1.4, 1.4, "F")
  const qr = QRCode.create(`${SITE}/portfolio/${encodeURIComponent(c.profileUrl)}`, { errorCorrectionLevel: "M" })
  const n = qr.modules.size
  const cell = (size - 2.2) / n
  doc.setFillColor("#000000")
  for (let r = 0; r < n; r++) {
    for (let col = 0; col < n; col++) {
      if (qr.modules.get(r, col)) doc.rect(qx + 1.1 + col * cell, qy + 1.1 + r * cell, cell + 0.02, cell + 0.02, "F")
    }
  }
}

function drawVerso(doc: jsPDF, x: number, y: number, c: StudentCard) {
  background(doc, x, y)
  const lh = 17
  const lw = (LOGO_BOX.w * lh) / LOGO_BOX.h
  logo(doc, x + (W - lw) / 2, y + 9.5, lh, "#ffffff")
  doc.setTextColor("#ffffff")
  doc.setFont("Montserrat", "black")
  doc.setFontSize(18)
  doc.text("mahu", x + W / 2, y + 33.5, { align: "center" })
  doc.setFont("Montserrat", "bold")
  doc.setFontSize(6.2)
  opacity(doc, 0.75)
  doc.text("CARTE PROFESSIONNELLE", x + W / 2, y + 38.6, { align: "center", charSpace: 0.35 })
  opacity(doc, 0.5)
  doc.setFontSize(5)
  const until = new Date(c.expiresAt).toLocaleDateString("fr-FR")
  doc.text(`Valable jusqu'au ${until} · call.mahu.cards`, x + W / 2, y + H - 3.6, { align: "center" })
  opacity(doc, 1)
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

function slugName(cards: StudentCard[]) {
  return cards.length === 1 ? cards[0].profileUrl || "etudiant" : `${cards.length}-etudiants`
}

/** Construit le PDF des cartes (un ou plusieurs etudiants). */
export async function buildStudentCardPdf(cards: StudentCard[], format: "pvc" | "a4"): Promise<jsPDF> {
  const doc = await newDoc(format)
  let first = true
  const page = () => {
    if (!first) doc.addPage()
    first = false
  }
  for (const c of cards) {
    if (format === "pvc") {
      page()
      drawRecto(doc, 0, 0, c)
      page()
      drawVerso(doc, 0, 0, c)
      continue
    }
    const left = (297 - 3 * W) / 2
    const top = (210 - 3 * H) / 2
    for (const side of ["recto", "verso"] as const) {
      page()
      for (let k = 0; k < 9; k++) {
        const cx = left + (k % 3) * W
        const cy = top + Math.floor(k / 3) * H
        if (side === "recto") drawRecto(doc, cx, cy, c)
        else drawVerso(doc, cx, cy, c)
      }
      cropMarks(doc, left, top)
      doc.setFont("Montserrat", "bold")
      doc.setFontSize(7)
      doc.setTextColor("#777777")
      doc.text(`${c.name} · ${side.toUpperCase()} · 9 cartes 85,6 x 54 mm${side === "verso" ? " (retourner la feuille)" : ""}`, left, 210 - 6)
    }
  }
  return doc
}

/** Telecharge directement le PDF (admin). */
export async function downloadStudentCardPdf(cards: StudentCard[], format: "pvc" | "a4") {
  const doc = await buildStudentCardPdf(cards, format)
  doc.save(`mahu-carte-${slugName(cards)}-${format === "pvc" ? "pvc" : "a4-9-cartes"}.pdf`)
}
