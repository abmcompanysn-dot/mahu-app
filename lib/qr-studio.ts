import QRCode from "qrcode"
import { jsPDF } from "jspdf"

// Studio QR (admin) : QR codes personnalises pour les cartes MAHU - logo au centre,
// couleurs, forme des points et des « yeux », cadre et legende. Le QR est dessine en
// SVG vectoriel (net a toute taille, pour l'imprimeur) ; PNG et planche PDF A4 en
// sont tires. Avec un logo, la correction d'erreurs passe a H (30 %) et le logo est
// limite a 30 % du cote : le QR reste lisible (verifie en le relisant quand le
// navigateur sait le faire, voir verifyQr).

export type DotShape = "square" | "rounded" | "dots"
export type EyeShape = "square" | "rounded"
export type FrameStyle = "none" | "gold" | "color"

export interface QrStyle {
  fg: string
  bg: string
  dots: DotShape
  eyes: EyeShape
  /** Donnee image (data:...) du logo, ou "" sans logo. */
  logo: string
  /** Cote de la case du logo, en fraction du cote du QR (0,10 a 0,30). */
  logoSize: number
  frame: FrameStyle
  frameColor: string
  /** Texte sous le QR (ex. SCANNEZ-MOI), vide = pas de legende. */
  caption: string
}

export const DEFAULT_STYLE: QrStyle = {
  fg: "#0b1220",
  bg: "#ffffff",
  dots: "rounded",
  // coins carres : testes lisibles avec toutes les formes de points et un logo jusqu'a 30 % ;
  // des coins arrondis empechent certains lecteurs de reperer le QR (teste le 21/11/2026)
  eyes: "square",
  logo: "",
  logoSize: 0.22,
  frame: "none",
  frameColor: "#c9a24a",
  caption: "",
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

function inFinder(r: number, c: number, n: number) {
  return (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7)
}

/** SVG complet du QR code (viewBox en « modules » : 1 unite = 1 point du QR). */
export function buildQrSvg(text: string, style: QrStyle): string {
  const s = { ...DEFAULT_STYLE, ...style }
  const logoSize = Math.min(0.3, Math.max(0.1, s.logoSize))
  const qr = QRCode.create(text || " ", { errorCorrectionLevel: s.logo ? "H" : "M" })
  const n = qr.modules.size
  const data = qr.modules.data
  const quiet = 4 // marge blanche de la norme QR
  const size = n + 2 * quiet

  // zone du logo : on n'y dessine pas de points (case nette autour du logo)
  const box = s.logo ? Math.ceil(n * logoSize) | 1 : 0
  const b0 = Math.floor((n - box) / 2)
  const inLogo = (r: number, c: number) => box > 0 && r >= b0 - 1 && r <= b0 + box && c >= b0 - 1 && c <= b0 + box

  let dots = ""
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!data[r * n + c] || inFinder(r, c, n) || inLogo(r, c)) continue
      const x = c + quiet
      const y = r + quiet
      if (s.dots === "dots") dots += `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.5"/>`
      else if (s.dots === "rounded") dots += `<rect x="${x + 0.02}" y="${y + 0.02}" width="0.96" height="0.96" rx="0.26"/>`
      else dots += `<rect x="${x}" y="${y}" width="1.02" height="1.02"/>`
    }
  }

  const eye = (r: number, c: number) => {
    const x = c + quiet
    const y = r + quiet
    // arrondi modere : des coins trop ronds empechent certains lecteurs de trouver le QR
    const ro = s.eyes === "rounded" ? 1.3 : 0
    const ri = s.eyes === "rounded" ? 0.7 : 0
    return (
      `<path fill-rule="evenodd" d="${roundRect(x, y, 7, 7, ro)} ${roundRect(x + 1, y + 1, 5, 5, Math.max(0, ro - 0.8))}"/>` +
      `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="${ri}"/>`
    )
  }
  const eyes = eye(0, 0) + eye(0, n - 7) + eye(n - 7, 0)

  let logo = ""
  if (s.logo) {
    const t = box + 1.2
    const tx = b0 + quiet + box / 2 - t / 2
    logo =
      `<rect x="${tx}" y="${tx}" width="${t}" height="${t}" rx="${t * 0.22}" fill="${s.bg}"/>` +
      `<image href="${s.logo}" x="${tx + t * 0.1}" y="${tx + t * 0.1}" width="${t * 0.8}" height="${t * 0.8}" preserveAspectRatio="xMidYMid meet"/>`
  }

  // cadre et legende autour du QR
  const pad = s.frame === "none" ? 0 : 2.2
  const capH = s.caption ? 5.2 : 0
  const W = size + 2 * pad
  const H = size + 2 * pad + capH
  const fc = s.frame === "gold" ? "url(#qrs-gold)" : s.frameColor
  let frame = ""
  if (s.frame !== "none") {
    frame =
      `<rect x="0.4" y="0.4" width="${W - 0.8}" height="${H - 0.8}" rx="3.2" fill="${s.bg}" stroke="${fc}" stroke-width="0.8"/>` +
      `<rect x="1.4" y="1.4" width="${W - 2.8}" height="${H - 2.8}" rx="2.4" fill="none" stroke="${fc}" stroke-width="0.25" opacity="0.7"/>`
  }
  const caption = s.caption
    ? `<text x="${W / 2}" y="${H - pad - 1.6}" text-anchor="middle" font-family="Montserrat, Arial, sans-serif" font-weight="800" font-size="2.6" letter-spacing="0.35" fill="${s.frame === "gold" ? "#8a6421" : s.fg}">${esc(s.caption)}</text>`
    : ""

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" shape-rendering="geometricPrecision">` +
    `<defs><linearGradient id="qrs-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a87a2a"/><stop offset=".5" stop-color="#f0d895"/><stop offset="1" stop-color="#b98c38"/></linearGradient></defs>` +
    `<rect width="${W}" height="${H}" fill="${s.frame === "none" ? s.bg : "none"}"/>` +
    frame +
    `<g transform="translate(${pad} ${pad})"><rect width="${size}" height="${size}" fill="${s.bg}"/><g fill="${s.fg}">${dots}${eyes}</g>${logo}</g>` +
    caption +
    `</svg>`
  )
}

function roundRect(x: number, y: number, w: number, h: number, r: number) {
  if (!r) return `M${x} ${y}h${w}v${h}h${-w}z`
  return `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`
}

/** Rend le SVG en PNG (largeur en pixels) dans le navigateur. */
export async function svgToPng(svg: string, width = 2000): Promise<Blob> {
  const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)
  const ratio = vb ? Number(vb[2]) / Number(vb[1]) : 1
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }))
  try {
    const img = new Image()
    img.decoding = "async"
    await new Promise<void>((ok, ko) => {
      img.onload = () => ok()
      img.onerror = () => ko(new Error("Rendu du QR impossible"))
      img.src = url
    })
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = Math.round(width * ratio)
    const ctx = canvas.getContext("2d")!
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((ok, ko) => canvas.toBlob((b) => (b ? ok(b) : ko(new Error("PNG vide"))), "image/png"))
  } finally {
    URL.revokeObjectURL(url)
  }
}

type Detector = { detect: (src: ImageBitmapSource) => Promise<{ rawValue: string }[]> }

/**
 * Relit le QR (API BarcodeDetector, presente sur Chrome Android / macOS / ChromeOS).
 * true = lu et identique, false = illisible, null = le navigateur ne sait pas verifier.
 */
export async function verifyQr(svg: string, expected: string): Promise<boolean | null> {
  const BD = (globalThis as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector
  if (!BD) return null
  try {
    const formats = await (BD as unknown as { getSupportedFormats?: () => Promise<string[]> }).getSupportedFormats?.()
    if (formats && !formats.includes("qr_code")) return null
    const bmp = await createImageBitmap(await svgToPng(svg, 600))
    const found = await new BD({ formats: ["qr_code"] }).detect(bmp)
    return found.some((f) => f.rawValue === expected)
  } catch {
    return null
  }
}

export function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export interface QrItem {
  /** Adresse encodee dans le QR. */
  url: string
  /** Texte imprime sous le QR sur la planche (code de la carte, nom...). */
  label: string
}

/** Planche PDF A4 : QR codes de `sizeMm` mm avec leur etiquette, reperes de coupe legers. */
export async function downloadQrSheet(items: QrItem[], style: QrStyle, sizeMm = 40, name = "qr-codes.pdf") {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true })
  const margin = 12
  const gap = 8
  const cellH = sizeMm + 7
  const cols = Math.max(1, Math.floor((210 - 2 * margin + gap) / (sizeMm + gap)))
  const rows = Math.max(1, Math.floor((297 - 2 * margin + gap) / (cellH + gap)))
  const perPage = cols * rows
  const x0 = (210 - (cols * sizeMm + (cols - 1) * gap)) / 2
  for (let i = 0; i < items.length; i++) {
    if (i > 0 && i % perPage === 0) doc.addPage()
    const k = i % perPage
    const x = x0 + (k % cols) * (sizeMm + gap)
    const y = margin + Math.floor(k / cols) * (cellH + gap)
    const svg = buildQrSvg(items[i].url, style)
    const png = await svgToPng(svg, 900)
    const dataUrl: string = await new Promise((ok) => {
      const r = new FileReader()
      r.onload = () => ok(String(r.result))
      r.readAsDataURL(png)
    })
    const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)!
    const h = (sizeMm * Number(vb[2])) / Number(vb[1])
    doc.addImage(dataUrl, "PNG", x, y, sizeMm, h)
    if (items[i].label) {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
      doc.setTextColor(60, 60, 60)
      doc.text(items[i].label, x + sizeMm / 2, y + h + 4, { align: "center" })
    }
  }
  doc.save(name)
}

export function downloadNfcCsv(items: QrItem[], name: string) {
  const rows = [["code", "lien a ecrire dans la puce"], ...items.map((i) => [i.label, i.url])]
  const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(";")).join("\r\n")
  downloadBlob(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }), name)
}
