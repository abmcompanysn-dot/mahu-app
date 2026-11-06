"use client"

// Page publique /guide : telephones compatibles, activer le NFC, QR code (textes partages avec le
// guide PDF : lib/guide-nfc.json), puis les documents a telecharger (guides, catalogue, fiches).
import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Download, FileText, BookOpen, Printer, Store, MessageCircle, Mail, AlertCircle } from "lucide-react"
import NFC from "@/lib/guide-nfc.json"

type Lang = "fr" | "en" | "wo"
const LANGS: { id: Lang; label: string }[] = [
  { id: "fr", label: "Français" },
  { id: "en", label: "English" },
  { id: "wo", label: "Wolof" },
]
const FILE_LANG: Record<Lang, string> = { fr: "francais", en: "anglais", wo: "wolof" }

const UI: Record<Lang, {
  back: string; hero: string; heroSub: string; docs: string; docsSub: string; open: string
  guides: { title: string; desc: string; file: (l: string) => string; icon: typeof FileText }[]
  catalogue: string; catalogueDesc: string; catalogue1: string; catalogue1Desc: string; bubees: string; bubeesDesc: string; fiche: string; flyer: string
  help: string; print: string
}> = {
  fr: {
    back: "Retour à l'accueil",
    hero: "Guide MAHU",
    heroSub: "Comment ouvrir votre carte sur chaque téléphone, et tous nos documents à télécharger.",
    docs: "Documents à télécharger",
    docsSub: "Gratuits, à imprimer ou à envoyer sur WhatsApp.",
    open: "Ouvrir le PDF",
    guides: [
      { title: "Guide de démarrage", desc: "1 feuille A4 paysage recto-verso, 12 étapes en images + la page NFC.", file: (l) => `/guide/Guide-paysage-MAHU-${l}.pdf`, icon: Printer },
      { title: "Guide détaillé", desc: "5 pages A4, une capture d'écran par étape.", file: (l) => `/guide/Guide-detaille-MAHU-${l}.pdf`, icon: BookOpen },
      { title: "Petit guide A5", desc: "À glisser avec la carte : accès et mot de passe.", file: (l) => `/guide/Guide-MAHU-A5-${l}.pdf`, icon: FileText },
    ],
    catalogue: "Catalogue MAHU 2026",
    catalogueDesc: "Toutes nos cartes et nos prix, 8 pages.",
    catalogue1: "Catalogue MAHU Tech en 1 page",
    catalogue1Desc: "Toute la gamme, images et prix, sur une seule page A4.",
    bubees: "Carte Bu Bees",
    bubeesDesc: "L'édition Teranga, en wolof et en français.",
    fiche: "Fiche A4",
    flyer: "Flyer A5",
    help: "Besoin d'aide ?",
    print: "Impression : A4 paysage, recto-verso, retournement bord court.",
  },
  en: {
    back: "Back to home",
    hero: "MAHU Guide",
    heroSub: "How to open your card on every phone, and all our documents to download.",
    docs: "Documents to download",
    docsSub: "Free, to print or to send on WhatsApp.",
    open: "Open the PDF",
    guides: [
      { title: "Getting started guide", desc: "1 A4 landscape sheet, double-sided, 12 illustrated steps + the NFC page.", file: (l) => `/guide/Guide-paysage-MAHU-${l}.pdf`, icon: Printer },
      { title: "Detailed guide", desc: "5 A4 pages, one screenshot per step.", file: (l) => `/guide/Guide-detaille-MAHU-${l}.pdf`, icon: BookOpen },
      { title: "Small A5 guide", desc: "To slip in with the card: login and password.", file: (l) => `/guide/Guide-MAHU-A5-${l}.pdf`, icon: FileText },
    ],
    catalogue: "MAHU 2026 catalogue",
    catalogueDesc: "All our cards and prices, 8 pages (in French).",
    catalogue1: "MAHU Tech one-page catalogue",
    catalogue1Desc: "The whole range, pictures and prices, on one A4 page (in French).",
    bubees: "Bu Bees card",
    bubeesDesc: "The Teranga edition, in Wolof and French.",
    fiche: "A4 sheet",
    flyer: "A5 flyer",
    help: "Need help?",
    print: "Printing: A4 landscape, double-sided, flip on short edge.",
  },
  wo: {
    back: "Dellu ci kaw",
    hero: "Guide MAHU",
    heroSub: "Naka ngay ubbee sa kàrt ci téléphone yépp, ak sunuy documents yépp ngir yeb leen.",
    docs: "Documents yu ngay yeb",
    docsSub: "Ñu ngi ci neen, ngir imprimer walla yónne ci WhatsApp.",
    open: "Ubbi PDF bi",
    guides: [
      { title: "Guide bu tàmbali", desc: "Benn xët A4 paysage recto-verso, 12 étapes ak nataal + xëtu NFC bi.", file: (l) => `/guide/Guide-paysage-MAHU-${l}.pdf`, icon: Printer },
      { title: "Guide bu yaatu", desc: "5 xët A4, benn nataal ci étape bu nekk.", file: (l) => `/guide/Guide-detaille-MAHU-${l}.pdf`, icon: BookOpen },
      { title: "Guide bu ndaw A5", desc: "Ngir boole ko ak kàrt bi : accès ak mot de passe.", file: (l) => `/guide/Guide-MAHU-A5-${l}.pdf`, icon: FileText },
    ],
    catalogue: "Catalogue MAHU 2026",
    catalogueDesc: "Sunuy kàrt yépp ak seen njëg, 8 xët.",
    catalogue1: "Catalogue MAHU Tech ci benn xët",
    catalogue1Desc: "Lépp, ak nataal yi ak njëg yi, ci benn xët A4.",
    bubees: "Kàrt Bu Bees",
    bubeesDesc: "Édition Teranga, ci wolof ak ci français.",
    fiche: "Fiche A4",
    flyer: "Flyer A5",
    help: "Soxla nga ndimbal ?",
    print: "Imprimer : A4 paysage, recto-verso, wëlbati ci wet gu gàtt gi.",
  },
}

export function GuideView() {
  const [lang, setLang] = useState<Lang>("fr")
  const n = NFC[lang]
  const t = UI[lang]
  const fl = FILE_LANG[lang]

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* En-tete */}
      <header className="relative overflow-hidden bg-[#0b1530] text-white">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#007AFF] to-[#5ac8fa]" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-12">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t.back}
          </Link>
          <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight">{t.hero}</h1>
              <p className="mt-3 text-white/70 text-lg leading-relaxed">{t.heroSub}</p>
            </div>
            <div className="flex gap-1 rounded-full bg-white/10 p-1" role="tablist" aria-label="Langue">
              {LANGS.map((l) => (
                <button
                  key={l.id}
                  role="tab"
                  aria-selected={lang === l.id}
                  onClick={() => setLang(l.id)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                    lang === l.id ? "bg-white text-[#0b1530]" : "text-white/70 hover:text-white"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-16">
        {/* NFC et QR code */}
        <section>
          <p className="text-sm font-bold uppercase tracking-wider text-primary">{n.kicker}</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight">{n.title}</h2>
          <p className="mt-3 text-muted-foreground text-lg leading-relaxed max-w-3xl">{n.intro}</p>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
            {n.blocks.map((b) => (
              <article key={b.id} className="rounded-2xl border border-border bg-card p-5 flex flex-col">
                <div className="rounded-xl bg-white border border-border/60 h-44 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/guide/nfc-${b.id}.svg`} alt="" className="h-40 w-auto" />
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <h3 className="text-2xl font-black">{b.title}</h3>
                  <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
                    {b.badge}
                  </span>
                </div>
                <ul className="mt-4 space-y-3">
                  {b.items.map((item, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed text-muted-foreground [&_b]:font-semibold [&_b]:text-foreground">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span dangerouslySetInnerHTML={{ __html: item }} />
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="mt-5 rounded-2xl bg-[#0b1530] text-white p-6 flex flex-col sm:flex-row gap-6">
            <div className="flex-1">
              <h3 className="flex items-center gap-2 font-bold text-[#8cc4ff]">
                <AlertCircle className="w-5 h-5" />
                {n.tips_title}
              </h3>
              <ul className="mt-3 grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm text-white/80">
                {n.tips.map((tip) => (
                  <li key={tip} className="flex gap-2">
                    <span className="text-[#8cc4ff]">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Documents */}
        <section>
          <h2 className="text-3xl font-black tracking-tight">{t.docs}</h2>
          <p className="mt-2 text-muted-foreground">{t.docsSub}</p>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
            {t.guides.map((g) => (
              <DocCard key={g.title} icon={g.icon} title={g.title} desc={g.desc} href={g.file(fl)} cta={t.open} />
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t.print}</p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
            <DocCard icon={Store} title={t.catalogue} desc={t.catalogueDesc} href="/kit/Catalogue-MAHU-2026.pdf" cta={t.open} />
            <DocCard icon={FileText} title={t.catalogue1} desc={t.catalogue1Desc} href="/kit/Catalogue-MAHU-Tech-2026-1-page.pdf" cta={t.open} />
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-[#00853F]/10 p-3 text-[#00853F]">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-lg">{t.bubees}</h3>
                  <p className="text-sm text-muted-foreground">{t.bubeesDesc}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <PdfChip href="/bu-bees/affiches/Fiche-Bu-Bees-A4-francais.pdf" label={`${t.fiche} · FR`} />
                <PdfChip href="/bu-bees/affiches/Fiche-Bu-Bees-A4-wolof.pdf" label={`${t.fiche} · WO`} />
                <PdfChip href="/bu-bees/affiches/Flyer-Bu-Bees-A5-recto-verso.pdf" label={t.flyer} />
                <Link href="/bu-bees" className="inline-flex items-center rounded-full border border-border px-3 py-1.5 text-sm font-medium hover:border-primary hover:text-primary transition-colors">
                  /bu-bees →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Aide */}
        <section className="rounded-2xl border border-border bg-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold">{t.help}</h2>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://wa.me/221769047999"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp 76 904 79 99
            </a>
            <a
              href="mailto:contact@mahu.cards"
              className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:border-primary hover:text-primary transition-colors"
            >
              <Mail className="w-4 h-4" />
              contact@mahu.cards
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        {n.powered} <span className="font-black tracking-wider text-foreground">ABMCY · MAHU</span>
      </footer>
    </div>
  )
}

function DocCard({ icon: Icon, title, desc, href, cta }: { icon: typeof FileText; title: string; desc: string; href: string; cta: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group rounded-2xl border border-border bg-card p-5 flex flex-col hover:border-primary/60 transition-colors"
    >
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-primary/10 p-3 text-primary">
          <Icon className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-lg">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
        </div>
      </div>
      <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
        <Download className="w-4 h-4" />
        {cta}
      </span>
    </a>
  )
}

function PdfChip({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium hover:border-primary hover:text-primary transition-colors"
    >
      <Download className="w-3.5 h-3.5" />
      {label}
    </a>
  )
}
