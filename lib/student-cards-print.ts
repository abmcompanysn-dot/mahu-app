import QRCode from "qrcode"

// Planches d'impression des cartes etudiants : une feuille A4 paysage par
// etudiant, avec 9 exemplaires de sa carte (3 x 3) au format carte bancaire
// (85,6 x 54 mm) et reperes de coupe, recto puis verso. Pas de photo : la
// carte porte le logo Mahu, le nom, le metier, les competences et un QR code
// qui ouvre le portfolio.

export interface StudentCard {
  id: string
  name: string
  profileUrl: string
  /** Metier (champ « Ton metier » du portfolio), sinon la filiere. */
  title?: string
  skills?: string[]
  field?: string
  level?: string
  school?: string
  expiresAt: string
}

const SITE = "https://call.mahu.cards"
const CARD_W = 85.6
const CARD_H = 54
const COLS = 3
const ROWS = 3
const PAGE_W = 297
const PAGE_H = 210
const LEFT = (PAGE_W - COLS * CARD_W) / 2
const TOP = (PAGE_H - ROWS * CARD_H) / 2

export const CARDS_PER_SHEET = COLS * ROWS

// Logo Mahu en vectoriel (redessine depuis public/icons/icon-512.png).
const LOGO_MARK = `<svg class="mark-svg" viewBox="120 140 272 232" xmlns="http://www.w3.org/2000/svg" aria-label="Mahu"><path fill="currentColor" d="M152.5 207 L183.5 309.5 H126 Z M180 149 H236.5 L284.5 309.5 H227 Z M282 149 H337.5 L386.5 309.5 H329 Z"/><rect x="209" y="348" width="94" height="18" rx="9" fill="#007AFF"/></svg>`

const esc = (s = "") => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string)

function portfolioUrl(c: StudentCard) {
  return `${SITE}/portfolio/${encodeURIComponent(c.profileUrl)}`
}

// Competences imprimees : les premieres, tant qu'elles tiennent sur 2 lignes.
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

function recto(c: StudentCard, qrSvg: string) {
  const job = c.title || c.field || ""
  const skills = cardSkills(c.skills)
  return `<div class="card recto">
    <div class="deco"></div>
    <div class="brand"><span class="mark">${LOGO_MARK}</span><span class="word">mahu</span></div>
    <div class="who">
      <p class="name">${esc(c.name)}</p>
      ${job ? `<p class="job">${esc(job)}</p>` : ""}
    </div>
    ${skills.length ? `<ul class="skills">${skills.map((sk) => `<li>${esc(sk)}</li>`).join("")}</ul>` : ""}
    <div class="qr">${qrSvg}</div>
  </div>`
}

function verso(c: StudentCard) {
  const until = new Date(c.expiresAt).toLocaleDateString("fr-FR")
  return `<div class="card verso">
    <div class="deco"></div>
    <span class="big">${LOGO_MARK}</span>
    <p class="vword">mahu</p>
    <p class="line">Carte professionnelle</p>
    <p class="until">Valable jusqu'au ${esc(until)} · call.mahu.cards</p>
  </div>`
}

function cropMarks() {
  const marks: string[] = []
  const len = 6, gap = 2
  for (let i = 0; i <= COLS; i++) {
    const x = LEFT + i * CARD_W
    marks.push(`<span class="cm v" style="left:${x}mm;top:${TOP - gap - len}mm;height:${len}mm"></span>`)
    marks.push(`<span class="cm v" style="left:${x}mm;top:${TOP + ROWS * CARD_H + gap}mm;height:${len}mm"></span>`)
  }
  for (let j = 0; j <= ROWS; j++) {
    const y = TOP + j * CARD_H
    marks.push(`<span class="cm h" style="top:${y}mm;left:${LEFT - gap - len}mm;width:${len}mm"></span>`)
    marks.push(`<span class="cm h" style="top:${y}mm;left:${LEFT + COLS * CARD_W + gap}mm;width:${len}mm"></span>`)
  }
  return marks.join("")
}

function sheet(card: string, label: string) {
  const placed = Array.from({ length: CARDS_PER_SHEET }, (_, k) => {
    const col = k % COLS, row = Math.floor(k / COLS)
    return `<div class="slot" style="left:${LEFT + col * CARD_W}mm;top:${TOP + row * CARD_H}mm">${card}</div>`
  }).join("")
  return `<section class="sheet">${cropMarks()}${placed}<p class="label">${esc(label)}</p></section>`
}

const CSS = `
@page { size: A4 landscape; margin: 0 }
* { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact }
body { background: #e5e5e5; font-family: 'DM Sans', 'Segoe UI', sans-serif }
.toolbar { position: sticky; top: 0; z-index: 5; display: flex; gap: 12px; align-items: center; justify-content: center; padding: 12px; background: #0a0a0a; color: #fff; font-size: 14px }
.toolbar button { background: #007AFF; color: #fff; border: 0; border-radius: 999px; padding: 10px 22px; font-weight: 700; font-size: 15px; cursor: pointer }
.sheet { position: relative; width: ${PAGE_W}mm; height: ${PAGE_H}mm; margin: 10mm auto; background: #fff; overflow: hidden; break-after: page }
.cm { position: absolute; background: #000 }
.cm.v { width: 0.2mm } .cm.h { height: 0.2mm }
.label { position: absolute; left: ${LEFT}mm; bottom: 6mm; font-size: 2.6mm; color: #777 }
.slot { position: absolute; width: ${CARD_W}mm; height: ${CARD_H}mm }
.card { position: relative; width: 100%; height: 100%; overflow: hidden; background: #0a0a0a; color: #fff }
.mark-svg { display: block; height: 100%; width: auto }
/* bandes obliques reprenant le logo, tres discretes */
.deco { position: absolute; inset: 0; background:
  linear-gradient(73deg, transparent 58%, rgba(255,255,255,0.045) 58%, rgba(255,255,255,0.045) 70%, transparent 70%),
  linear-gradient(73deg, transparent 74%, rgba(255,255,255,0.03) 74%, rgba(255,255,255,0.03) 86%, transparent 86%),
  radial-gradient(circle at 100% 0%, rgba(0,122,255,0.30), transparent 55%) }
.recto { padding: 4.2mm 4.6mm }
.brand { position: relative; display: flex; align-items: center; gap: 1.6mm; height: 6.4mm; color: #fff }
.brand .mark { height: 6.4mm }
.word { font-family: 'Sora', sans-serif; font-weight: 800; font-size: 4.6mm; letter-spacing: -0.15mm; line-height: 1 }
.who { position: relative; margin-top: 5mm; max-width: 56mm }
.name { font-family: 'Sora', sans-serif; font-weight: 800; font-size: 5.2mm; line-height: 1.05; letter-spacing: -0.1mm }
.job { margin-top: 1.5mm; font-size: 2.7mm; font-weight: 700; color: #4da3ff; line-height: 1.2 }
.skills { position: absolute; left: 4.6mm; bottom: 4.2mm; width: 55mm; display: flex; flex-wrap: wrap; gap: 1mm; list-style: none }
.skills li { border: 0.2mm solid rgba(255,255,255,0.28); border-radius: 1mm; padding: 0.5mm 1.3mm; font-size: 1.85mm; font-weight: 700; color: rgba(255,255,255,0.88); white-space: nowrap }
.qr { position: absolute; right: 4.2mm; bottom: 4.2mm; width: 19.5mm; height: 19.5mm; padding: 1.1mm; background: #fff; border-radius: 1.4mm }
.qr svg { display: block; width: 100%; height: 100% }
.verso { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center }
.verso .big { position: relative; height: 17mm; color: #fff }
.vword { position: relative; margin-top: 2.2mm; font-family: 'Sora', sans-serif; font-weight: 800; font-size: 6.4mm; letter-spacing: -0.2mm; line-height: 1 }
.line { position: relative; margin-top: 1.6mm; font-size: 2.2mm; letter-spacing: 0.35mm; text-transform: uppercase; color: rgba(255,255,255,0.7) }
.until { position: absolute; bottom: 3.4mm; left: 0; right: 0; font-size: 1.75mm; color: rgba(255,255,255,0.5) }
@media print { body { background: #fff } .toolbar { display: none } .sheet { margin: 0 } }
`

/** Document HTML des planches : par etudiant, une page recto puis une page verso (9 cartes chacune). */
export async function buildStudentCardsHtml(cards: StudentCard[]): Promise<string> {
  const qrs = await Promise.all(cards.map((c) => QRCode.toString(portfolioUrl(c), { type: "svg", margin: 0, errorCorrectionLevel: "M" })))
  const sheets = cards.flatMap((c, i) => [
    sheet(recto(c, qrs[i]), `${c.name} · RECTO · 9 cartes 85,6 x 54 mm`),
    sheet(verso(c), `${c.name} · VERSO (retourner la feuille)`),
  ])
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8" /><title>Cartes etudiants Mahu</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&family=Sora:wght@700;800&family=Space+Mono&display=swap" rel="stylesheet" />
<style>${CSS}</style></head><body>
<div class="toolbar"><span>${cards.length} étudiant(s) · ${cards.length * 2} page(s) A4 paysage (recto + verso, 9 cartes par page)</span><button onclick="window.print()">Imprimer / Enregistrer en PDF</button></div>
${sheets.join("\n")}
</body></html>`
}

/** Apercu recto + verso d'une seule carte (espace etudiant, « Mon portfolio »). */
export async function buildCardPreviewHtml(card: StudentCard): Promise<string> {
  const qr = await QRCode.toString(portfolioUrl(card), { type: "svg", margin: 0, errorCorrectionLevel: "M" })
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8" />
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&family=Sora:wght@700;800&family=Space+Mono&display=swap" rel="stylesheet" />
<style>${CSS}
body { background: transparent; display: flex; justify-content: center }
.wrap { display: flex; flex-wrap: wrap; justify-content: center; gap: 4mm; padding: 2mm }
.wrap .slot { position: relative; border-radius: 3mm; overflow: hidden; box-shadow: 0 2mm 6mm rgba(0,0,0,0.35) }
</style></head><body><div class="wrap"><div class="slot">${recto(card, qr)}</div><div class="slot">${verso(card)}</div></div></body></html>`
}
