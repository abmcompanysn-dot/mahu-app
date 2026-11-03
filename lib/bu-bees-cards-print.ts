import QRCode from "qrcode"

// Planches d'impression des cartes MAHU Bu Bees (edition Teranga), une carte
// differente par client : son nom au recto et le QR code de SA carte
// (call.mahu.cards/c/CODE). Une carte neuve scannee ouvre l'inscription avec
// le code deja rempli : le client s'active sur place.
// - "a4"  : feuilles A4 paysage de 9 cartes (3 x 3) avec reperes de coupe,
//   recto puis verso. Le verso est le meme pour tous, donc l'ordre des cartes
//   n'a pas d'importance au retournement.
// - "pvc" : une page = une carte 85,6 x 54 mm (recto puis verso), pour les
//   imprimantes a cartes PVC (Evolis, Zebra...).
// Dessin identique a assets/carte-bu-bees (recto/verso de reference).

export interface BuBeesCard {
  /** Vide pour une carte de lot sans nom. */
  name: string
  code: string
}

export type BuBeesFormat = "a4" | "pvc"

const SITE = "https://call.mahu.cards"
const CARD_W = 85.6
const CARD_H = 54
const COLS = 3
const ROWS = 3
const PAGE_W = 297
const PAGE_H = 210
const LEFT = (PAGE_W - COLS * CARD_W) / 2
const TOP = (PAGE_H - ROWS * CARD_H) / 2
const PER_SHEET = COLS * ROWS

const GREEN = "#00853F"
const YELLOW = "#FDEF42"
const RED = "#E31B23"

const STAR = (color: string) =>
  `<svg viewBox="0 0 100 95" xmlns="http://www.w3.org/2000/svg"><path fill="${color}" d="M50 0 61.8 36.3H100L69.1 58.8 80.9 95 50 72.6 19.1 95 30.9 58.8 0 36.3H38.2Z"/></svg>`
const NFC = `<svg viewBox="0 0 40 48" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"><path d="M6 14c4 6 4 14 0 20"/><path d="M15 8c7 9 7 23 0 32"/><path d="M24 2c10 12 10 32 0 44"/></svg>`

const esc = (s = "") => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string)

export const cardUrl = (code: string) => `${SITE}/c/${encodeURIComponent(code)}`

// Les cotes viennent de la planche de reference (91,6 x 60 mm avec 3 mm de
// fond perdu) ramenees a la carte finie : decor a -3 mm, contenu a 0.
function recto(c: BuBeesCard, qrSvg: string, logo: string) {
  return `<div class="card">
    <div class="bg"></div><div class="guil"></div>
    <div class="band"><i style="background:${GREEN}"></i><i style="background:${YELLOW};flex:1.5"></i><i style="background:${RED}"></i></div>
    <div class="bname">BU<span>${STAR("#06301b")}</span>BEES</div>
    <img class="logo" src="${logo}" alt="MAHU" />
    <div class="nfc">${NFC}</div>
    <div class="qr">${qrSvg}</div>
    <div class="qrl">Scannez · Touchez</div>
    <div class="holder"><small>Smart Card · Édition Teranga</small>${c.name ? `<b>${esc(c.name)}</b>` : ""}</div>
    <div class="code">${esc(c.code)}</div>
  </div>`
}

function verso(logo: string) {
  return `<div class="card">
    <div class="bg"></div><div class="guil"></div>
    <div class="stripe"><i style="background:${GREEN}"></i><i style="background:${YELLOW}"></i><i style="background:${RED}"></i></div>
    <div class="big">SÉNÉGAL <em>REK</em></div>
    <div class="sub"><span>${STAR(YELLOW)}</span>Tech bi MAHU</div>
    <div class="vnfc">${NFC}</div>
    <div class="txt">Laal ma ak sa téléphone, mu won la sama profil, sama nimero ak sama réseaux, ci benn saa.</div>
    <div class="foot"><img src="${logo}" alt="MAHU" /><span>call.mahu.cards</span></div>
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

function a4Sheet(cards: string[], label: string) {
  const placed = cards
    .map((card, k) => {
      const col = k % COLS, row = Math.floor(k / COLS)
      return `<div class="slot" style="left:${LEFT + col * CARD_W}mm;top:${TOP + row * CARD_H}mm">${card}</div>`
    })
    .join("")
  return `<section class="sheet">${cropMarks()}${placed}<p class="label">${esc(label)}</p></section>`
}

const CSS = (format: BuBeesFormat) => `
@page { size: ${format === "a4" ? "A4 landscape" : `${CARD_W}mm ${CARD_H}mm`}; margin: 0 }
* { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact }
body { background: #e5e5e5; font-family: Inter, 'Segoe UI', sans-serif }
.toolbar { position: sticky; top: 0; z-index: 5; display: flex; gap: 12px; align-items: center; justify-content: center; padding: 12px; background: #03110a; color: #fff; font-size: 14px }
.toolbar button { background: ${YELLOW}; color: #06301b; border: 0; border-radius: 999px; padding: 10px 22px; font-weight: 800; font-size: 15px; cursor: pointer }
.sheet { position: relative; width: ${PAGE_W}mm; height: ${PAGE_H}mm; margin: 10mm auto; background: #fff; overflow: hidden; break-after: page }
.pvc { position: relative; width: ${CARD_W}mm; height: ${CARD_H}mm; margin: 6mm auto; overflow: hidden; break-after: page }
.cm { position: absolute; background: #000 }
.cm.v { width: 0.2mm } .cm.h { height: 0.2mm }
.label { position: absolute; left: ${LEFT}mm; bottom: 6mm; font-size: 2.6mm; color: #777 }
.slot { position: absolute; width: ${CARD_W}mm; height: ${CARD_H}mm }
.card { position: relative; width: ${CARD_W}mm; height: ${CARD_H}mm; overflow: hidden; color: #fff }
.bg { position: absolute; inset: 0; background:
  radial-gradient(70mm 50mm at 80% 0%, rgba(0,133,63,.55), transparent 70%),
  radial-gradient(60mm 45mm at 0% 100%, rgba(227,27,35,.28), transparent 70%),
  linear-gradient(150deg, #06301b 0%, #041d11 55%, #020d08 100%) }
.guil { position: absolute; inset: 0; opacity: .13; mix-blend-mode: screen; background:
  repeating-radial-gradient(circle at 110% 50%, transparent 0 1.1mm, rgba(253,239,66,.9) 1.1mm 1.25mm),
  repeating-radial-gradient(circle at -20% 120%, transparent 0 1.6mm, rgba(255,255,255,.6) 1.6mm 1.7mm) }
.band, .bname { position: absolute; left: -23mm; top: 12.3mm; width: 140mm; height: 17mm; transform: rotate(-15deg) }
.band { display: flex; flex-direction: column; box-shadow: 0 1.2mm 3mm rgba(0,0,0,.45) }
.band i, .stripe i { display: block; flex: 1 }
.bname { display: flex; align-items: center; gap: 2mm; padding-left: 33mm; font-family: Anton, sans-serif; font-size: 7.6mm; letter-spacing: .8mm; color: #06301b }
.bname svg { width: 4.8mm; height: 4.6mm; margin: 0 .3mm; display: block }
.logo { position: absolute; left: 6.5mm; top: 6mm; height: 4.6mm }
.nfc { position: absolute; left: 31mm; top: 5.6mm; width: 3.8mm; height: 5.2mm }
.nfc svg, .vnfc svg { display: block; width: 100%; height: 100% }
.qr { position: absolute; right: 5.5mm; top: 6mm; width: 28mm; height: 28mm; background: #fff; border-radius: 2.2mm; padding: 2.2mm; box-shadow: 0 1mm 3mm rgba(0,0,0,.5) }
.qr svg { display: block; width: 100%; height: 100% }
.qrl { position: absolute; right: 5.5mm; top: 35.6mm; width: 28mm; text-align: center; font-size: 1.75mm; font-weight: 800; letter-spacing: .3mm; text-transform: uppercase }
.holder { position: absolute; left: 6.5mm; bottom: 5.6mm; max-width: 46mm }
.holder small { display: block; font-size: 1.65mm; font-weight: 800; letter-spacing: .4mm; color: ${YELLOW}; text-transform: uppercase }
.holder b { display: block; margin-top: .9mm; font-size: 3.4mm; font-weight: 700; letter-spacing: .4mm; line-height: 1.1; text-transform: uppercase; overflow-wrap: anywhere }
.holder b.long { font-size: 2.7mm; letter-spacing: .25mm }
.code { position: absolute; right: 5.5mm; bottom: 5.6mm; width: 28mm; text-align: center; font-size: 1.7mm; font-weight: 700; letter-spacing: .3mm; color: rgba(255,255,255,.65) }
.stripe { position: absolute; left: -3mm; right: -3mm; top: 4mm; height: 9mm; display: flex; flex-direction: column }
.big { position: absolute; left: 6.5mm; top: 18.5mm; font-family: Anton, sans-serif; font-size: 11.5mm; line-height: 1; letter-spacing: .3mm }
.big em { font-style: normal; color: ${YELLOW} }
.sub { position: absolute; left: 6.5mm; top: 32.4mm; display: flex; align-items: center; gap: 1.6mm; font-size: 4mm; font-weight: 800; letter-spacing: .2mm }
.sub svg { width: 3.4mm; height: 3.2mm; display: block }
.vnfc { position: absolute; right: 7mm; top: 20mm; width: 6mm; height: 8mm; opacity: .9 }
.txt { position: absolute; left: 6.5mm; top: 39mm; width: 52mm; font-size: 1.95mm; line-height: 1.45; color: rgba(255,255,255,.75) }
.foot { position: absolute; right: 6.5mm; bottom: 5mm; display: flex; flex-direction: column; align-items: flex-end; gap: 1mm; font-size: 1.7mm; font-weight: 600; letter-spacing: .25mm; color: rgba(255,255,255,.6) }
.foot img { height: 3mm }
@media print { body { background: #fff } .toolbar { display: none } .sheet, .pvc { margin: 0 } }
`

/** Document HTML a imprimer : planches A4 (9 cartes) ou une carte par page (PVC). */
export async function buildBuBeesCardsHtml(cards: BuBeesCard[], format: BuBeesFormat, origin: string): Promise<string> {
  const logo = `${origin}/bu-bees/logo.png`
  const qrs = await Promise.all(
    cards.map((c) => QRCode.toString(cardUrl(c.code), { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0b1a12", light: "#ffffff" } }))
  )
  const rectos = cards.map((c, i) => recto(c, qrs[i], logo).replace("<b>", c.name.length > 22 ? '<b class="long">' : "<b>"))
  const back = verso(logo)

  let pages: string[]
  let summary: string
  if (format === "a4") {
    pages = []
    for (let s = 0; s < rectos.length; s += PER_SHEET) {
      const chunk = rectos.slice(s, s + PER_SHEET)
      const n = s / PER_SHEET + 1
      pages.push(a4Sheet(chunk, `Feuille ${n} · RECTO · ${chunk.length} carte(s) 85,6 x 54 mm`))
      pages.push(a4Sheet(chunk.map(() => back), `Feuille ${n} · VERSO (retourner la feuille)`))
    }
    summary = `${cards.length} carte(s) · ${pages.length} page(s) A4 paysage (recto + verso, 9 cartes par feuille)`
  } else {
    pages = rectos.flatMap((r) => [`<section class="pvc">${r}</section>`, `<section class="pvc">${back}</section>`])
    summary = `${cards.length} carte(s) · ${pages.length} page(s) 85,6 x 54 mm (recto puis verso)`
  }

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8" /><title>Cartes MAHU Bu Bees</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@600;700;800&family=Anton&display=swap" rel="stylesheet" />
<style>${CSS(format)}</style></head><body>
<div class="toolbar"><span>${summary}</span><button onclick="window.print()">Imprimer / Enregistrer en PDF</button></div>
${pages.join("\n")}
</body></html>`
}
