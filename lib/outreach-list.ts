// Lecture de la liste de clients pour l'Emailing admin : fichier Excel
// (.xlsx), CSV (virgule ou point-virgule) ou texte colle. Les colonnes sont
// reconnues par leur titre (email, prenom, nom) ; sans titre, la colonne qui
// contient des "@" est l'email et la suivante le nom.

export interface OutreachRecipientInput {
  email: string
  firstName: string
  lastName: string
}

type Cell = string | number | boolean | Date | null | undefined

const EMAIL_RE = /[^\s<>"',;]+@[^\s<>"',;]+\.[a-z]{2,}/i

function norm(v: Cell): string {
  if (v === null || v === undefined) return ""
  return String(v).trim()
}

function header(v: Cell): string {
  return norm(v)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
}

function parseDelimited(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] || ""
  const delim = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ";" : firstLine.includes("\t") ? "\t" : ","
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') {
        quoted = false
      } else {
        cell += ch
      }
    } else if (ch === '"') {
      quoted = true
    } else if (ch === delim) {
      row.push(cell)
      cell = ""
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
    } else {
      cell += ch
    }
  }
  row.push(cell)
  rows.push(row)
  return rows.filter((r) => r.some((c) => c.trim() !== ""))
}

export function rowsToRecipients(rows: Cell[][]): OutreachRecipientInput[] {
  if (rows.length === 0) return []
  const first = rows[0].map(header)
  let emailCol = first.findIndex((h) => /e-?mail|courriel|adresse/.test(h))
  let firstCol = first.findIndex((h) => /prenom|first/.test(h))
  let lastCol = first.findIndex((h, i) => i !== firstCol && /^nom|last|name|client/.test(h))
  let body = rows

  if (emailCol >= 0 && !EMAIL_RE.test(norm(rows[0][emailCol]))) {
    body = rows.slice(1)
  } else {
    // Pas de ligne de titres : la colonne email est celle qui contient des "@".
    emailCol = rows[0].findIndex((c) => EMAIL_RE.test(norm(c)))
    firstCol = -1
    lastCol = emailCol === 0 ? 1 : 0
  }
  if (emailCol < 0) return []

  const out: OutreachRecipientInput[] = []
  for (const r of body) {
    const match = norm(r[emailCol]).match(EMAIL_RE)
    if (!match) continue
    let firstName = firstCol >= 0 ? norm(r[firstCol]) : ""
    let lastName = lastCol >= 0 && lastCol !== emailCol ? norm(r[lastCol]) : ""
    if (!firstName && lastName.includes(" ")) {
      // "Awa Diop" dans une seule colonne : prenom = premier mot.
      const [f, ...rest] = lastName.split(/\s+/)
      firstName = f
      lastName = rest.join(" ")
    } else if (!firstName && lastName) {
      firstName = lastName
      lastName = ""
    }
    out.push({ email: match[0].toLowerCase(), firstName, lastName })
  }
  return out
}

export function parseRecipientText(text: string): OutreachRecipientInput[] {
  return rowsToRecipients(parseDelimited(text))
}

export async function parseRecipientFile(file: File): Promise<OutreachRecipientInput[]> {
  if (/\.xlsx$/i.test(file.name)) {
    const { readSheet } = await import("read-excel-file/browser")
    const rows = (await readSheet(file)) as Cell[][]
    return rowsToRecipients(rows)
  }
  if (/\.xls$/i.test(file.name)) {
    throw new Error("Ancien format .xls : dans Excel, faites Fichier > Enregistrer sous > .xlsx ou .csv")
  }
  return parseRecipientText(await file.text())
}
