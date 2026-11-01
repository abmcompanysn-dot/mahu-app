"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, ChevronLeft, ChevronRight, Copy, Download, FileText, Lightbulb, Share2 } from "lucide-react"

type KitImage = { label: string; src: string }
type KitDay = {
  date: string
  title: string
  theme: string
  images: KitImage[]
  caption: string
  hashtags: string
  channels: string[]
  tip: string
  attachment?: KitImage
}
type KitPlan = { title: string; month: string; days: KitDay[] }

// Date du jour a Dakar (UTC toute l'annee).
function todayDakar(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDay(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Repli pour les navigateurs sans acces au presse-papiers.
    const area = document.createElement("textarea")
    area.value = text
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand("copy")
    area.remove()
    return ok
  }
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        if (await copyText(text)) {
          setDone(true)
          setTimeout(() => setDone(false), 1800)
        }
      }}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${
        done ? "bg-emerald-500 text-white" : "bg-[#007AFF] text-white hover:bg-[#0a84ff]"
      }`}
    >
      {done ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {done ? "Copié !" : label}
    </button>
  )
}

function ImageCard({ image, title }: { image: KitImage; title: string }) {
  const [canShare, setCanShare] = useState(false)
  const name = image.src.split("/").pop() || "mahu.jpg"
  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.canShare === "function")
  }, [])

  // Sur telephone : partage direct vers WhatsApp, Instagram, Facebook...
  const share = async () => {
    try {
      const blob = await (await fetch(image.src)).blob()
      const file = new File([blob], name, { type: blob.type || "image/jpeg" })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title })
        return
      }
    } catch {
      // Partage annule ou impossible : le telechargement reste disponible.
    }
    window.open(image.src, "_blank")
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.src} alt={title} className="w-full rounded-xl bg-black/40" loading="lazy" />
      <p className="mt-3 text-xs font-semibold text-white/60">{image.label}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <a
          href={image.src}
          download={name}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-sm font-bold hover:bg-white/15"
        >
          <Download className="w-4 h-4" /> Télécharger
        </a>
        <button
          type="button"
          onClick={share}
          disabled={!canShare}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-sm font-bold hover:bg-white/15 disabled:opacity-40"
        >
          <Share2 className="w-4 h-4" /> Partager
        </button>
      </div>
    </div>
  )
}

export default function KitView() {
  const [plan, setPlan] = useState<KitPlan | null>(null)
  const [error, setError] = useState(false)
  const [date, setDate] = useState<string>("")
  const [done, setDone] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch("/kit/plan.json", { cache: "no-store" })
      .then((r) => r.json())
      .then((p: KitPlan) => {
        setPlan(p)
        const wanted = new URLSearchParams(window.location.search).get("jour") || todayDakar()
        const dates = p.days.map((d) => d.date)
        setDate(dates.includes(wanted) ? wanted : wanted < dates[0] ? dates[0] : dates[dates.length - 1])
      })
      .catch(() => setError(true))
  }, [])

  const index = plan ? plan.days.findIndex((d) => d.date === date) : -1
  const day = plan && index >= 0 ? plan.days[index] : null

  // Cases « publie sur » memorisees dans ce navigateur, par jour.
  useEffect(() => {
    if (!date) return
    try {
      setDone(JSON.parse(localStorage.getItem(`mahu-kit-${date}`) || "{}"))
    } catch {
      setDone({})
    }
  }, [date])

  const toggle = (channel: string) => {
    const next = { ...done, [channel]: !done[channel] }
    setDone(next)
    try {
      localStorage.setItem(`mahu-kit-${date}`, JSON.stringify(next))
    } catch {
      // Stockage indisponible : la case reste cochee jusqu'au rechargement.
    }
  }

  const go = (d: string) => {
    setDate(d)
    window.history.replaceState(null, "", `/kit?jour=${d}`)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const fullText = useMemo(() => (day ? `${day.caption}\n\n${day.hashtags}` : ""), [day])

  if (error) {
    return <div className="min-h-screen bg-[#0a0a0a] text-white p-8">Le kit est indisponible pour le moment.</div>
  }
  if (!plan || !day) {
    return <div className="min-h-screen bg-[#0a0a0a] text-white/60 p-8">Chargement du kit…</div>
  }

  const today = todayDakar()
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <div className="flex items-center justify-between gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/kit/logo.png" alt="Mahu" className="h-6 w-auto" />
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7cc4ff]">Kit de communication</span>
        </div>

        <div className="mt-6 flex gap-1.5 overflow-x-auto pb-2 -mx-4 px-4">
          {plan.days.map((d) => {
            const n = Number(d.date.slice(8))
            const active = d.date === date
            return (
              <button
                key={d.date}
                type="button"
                onClick={() => go(d.date)}
                className={`shrink-0 w-10 h-10 rounded-xl text-sm font-bold ${
                  active
                    ? "bg-[#007AFF] text-white"
                    : d.date === today
                      ? "bg-white/15 text-white ring-1 ring-[#7cc4ff]"
                      : "bg-white/[0.06] text-white/70 hover:bg-white/10"
                }`}
                aria-label={formatDay(d.date)}
              >
                {n}
              </button>
            )
          })}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={index <= 0}
            onClick={() => go(plan.days[index - 1].date)}
            className="p-2 rounded-xl bg-white/[0.06] disabled:opacity-30"
            aria-label="Jour précédent"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold capitalize text-white/60">
              {formatDay(day.date)} {day.date === today && <span className="text-[#7cc4ff]">· aujourd&apos;hui</span>}
            </p>
            <p className="text-xs text-white/40 mt-0.5">{day.theme}</p>
          </div>
          <button
            type="button"
            disabled={index >= plan.days.length - 1}
            onClick={() => go(plan.days[index + 1].date)}
            className="p-2 rounded-xl bg-white/[0.06] disabled:opacity-30"
            aria-label="Jour suivant"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <h1 className="mt-5 text-3xl sm:text-4xl font-black leading-tight tracking-tight">{day.title}</h1>

        <h2 className="mt-8 text-sm font-bold uppercase tracking-[0.14em] text-white/50">1 · L&apos;image</h2>
        <div className={`mt-3 grid gap-3 ${day.images.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {day.images.map((img) => (
            <ImageCard key={img.src} image={img} title={day.title} />
          ))}
        </div>
        {day.attachment && (
          <a
            href={day.attachment.src}
            download
            className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 hover:bg-white/[0.07]"
          >
            <FileText className="w-6 h-6 text-[#7cc4ff]" />
            <span className="font-bold">{day.attachment.label}</span>
            <Download className="w-4 h-4 ml-auto text-white/60" />
          </a>
        )}

        <h2 className="mt-8 text-sm font-bold uppercase tracking-[0.14em] text-white/50">2 · Le texte</h2>
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-white/90">{day.caption}</p>
          <p className="mt-4 text-sm font-semibold text-[#7cc4ff]">{day.hashtags}</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <CopyButton text={fullText} label="Tout copier" />
            <CopyButton text={day.caption} label="Copier le texte" />
            <CopyButton text={day.hashtags} label="Copier les hashtags" />
          </div>
        </div>

        {day.tip && (
          <div className="mt-4 flex gap-3 rounded-2xl bg-[#f5b301]/10 border border-[#f5b301]/25 p-4 text-sm text-white/85">
            <Lightbulb className="w-5 h-5 shrink-0 text-[#f5b301]" />
            <p>{day.tip}</p>
          </div>
        )}

        <h2 className="mt-8 text-sm font-bold uppercase tracking-[0.14em] text-white/50">3 · Où publier</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {day.channels.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggle(c)}
              className={`flex items-center gap-3 rounded-xl border p-3.5 text-left text-sm font-semibold ${
                done[c] ? "border-emerald-500/50 bg-emerald-500/10 text-white" : "border-white/10 bg-white/[0.04] text-white/80"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-md flex items-center justify-center ${done[c] ? "bg-emerald-500" : "border border-white/30"}`}
              >
                {done[c] && <Check className="w-3.5 h-3.5" />}
              </span>
              {c}
              <span className="ml-auto text-xs text-white/40">{done[c] ? "Publié" : "À faire"}</span>
            </button>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-white/35">
          Chaque matin à 7 h, un email vous rappelle la publication du jour. · call.mahu.cards
        </p>
      </div>
    </div>
  )
}
