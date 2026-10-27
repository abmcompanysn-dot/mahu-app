"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { AnimatePresence, motion, useInView } from "framer-motion"
import { Headphones, MapPin, Square } from "lucide-react"
import type { PortfolioItem } from "@/lib/portfolio"

// "Mon histoire" du modele Motion : un chapitre par etape (period = annee,
// org = lieu). Au defilement, l'annee, le lieu et la progression suivent le
// lecteur, la couleur d'ambiance change a chaque chapitre. Le bouton
// "Ecouter mon histoire" lance une musique africaine generee en direct et une
// voix douce qui lit chaque chapitre quand on y arrive.

const COLORS = ["#3b82f6", "#8b5cf6", "#14b8a6", "#f5c451", "#f97316", "#22c55e"]
const EASE = [0.22, 1, 0.36, 1] as const

// ------------------------------------------------------------ etat "ecoute"

let listening = false
const listeners = new Set<() => void>()
function setListening(on: boolean) {
  listening = on
  listeners.forEach((l) => l())
}
function useListening() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => listening,
    () => false
  )
}

// ------------------------------------------------------------ voix

function frenchVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis?.getVoices() || []
  const fr = voices.filter((v) => v.lang.toLowerCase().startsWith("fr"))
  // voix les plus douces d'abord (neuronales Edge, Google, Apple)
  const prefer = ["Denise", "Vivienne", "Eloise", "Google", "Amélie", "Audrey", "Marie", "Thomas"]
  for (const name of prefer) {
    const v = fr.find((x) => x.name.includes(name))
    if (v) return v
  }
  return fr[0]
}

let onSpeaking: ((speaking: boolean) => void) | null = null

function speak(text: string) {
  const synth = window.speechSynthesis
  if (!synth || !text) return
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const v = frenchVoice()
  if (v) u.voice = v
  u.lang = v?.lang || "fr-FR"
  u.rate = 0.92
  u.pitch = 1.02
  u.volume = 1
  u.onstart = () => onSpeaking?.(true)
  u.onend = () => onSpeaking?.(false)
  u.onerror = () => onSpeaking?.(false)
  synth.speak(u)
}

// ------------------------------------------------------------ musique africaine

// Kora et balafon sur une gamme pentatonique (fa majeur), basse chaude et
// djembe doux en 6/8. Tout est synthetise : aucun fichier, aucun droit.
const KORA = [174.61, 196.0, 220.0, 261.63, 293.66, 349.23, 392.0, 440.0, 523.25]
const ROOTS = [87.31, 73.42, 65.41, 98.0] // fa, re, do, sol
const PATTERNS = [
  [0, 4, 2, 5, 3, 6],
  [1, 4, 3, 6, 4, 7],
  [0, 3, 2, 5, 4, 8],
  [2, 5, 3, 6, 5, 7],
]

function startAfricanMusic() {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new AC()
  const master = ctx.createGain()
  master.gain.value = 0
  master.gain.linearRampToValueAtTime(0.32, ctx.currentTime + 2.5)
  const echo = ctx.createDelay()
  echo.delayTime.value = 0.33
  const fb = ctx.createGain()
  fb.gain.value = 0.25
  echo.connect(fb).connect(echo)
  echo.connect(master)
  master.connect(ctx.destination)

  // bruit pour djembe et shaker
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const data = noise.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

  const pluck = (freq: number, t: number, vol: number, decay: number, type: OscillatorType = "triangle") => {
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006)
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay)
    const f = ctx.createBiquadFilter()
    f.type = "lowpass"
    f.frequency.setValueAtTime(3200, t)
    f.frequency.exponentialRampToValueAtTime(700, t + decay)
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.value = freq
    o.connect(f).connect(g)
    g.connect(master)
    g.connect(echo)
    o.start(t)
    o.stop(t + decay + 0.05)
  }

  const drum = (t: number, kind: "bass" | "tone" | "slap" | "shaker") => {
    if (kind === "bass" || kind === "tone") {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      const base = kind === "bass" ? 95 : 180
      o.frequency.setValueAtTime(base, t)
      o.frequency.exponentialRampToValueAtTime(base * 0.55, t + 0.2)
      g.gain.setValueAtTime(kind === "bass" ? 0.5 : 0.22, t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28)
      o.connect(g).connect(master)
      o.start(t)
      o.stop(t + 0.3)
      return
    }
    const src = ctx.createBufferSource()
    src.buffer = noise
    const f = ctx.createBiquadFilter()
    f.type = kind === "slap" ? "bandpass" : "highpass"
    f.frequency.value = kind === "slap" ? 2200 : 7000
    const g = ctx.createGain()
    const vol = kind === "slap" ? 0.18 : 0.035
    const dur = kind === "slap" ? 0.09 : 0.05
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(f).connect(g).connect(master)
    src.start(t)
    src.stop(t + dur + 0.02)
  }

  const eighth = 60 / 96 / 2 // 6/8 a 96 noires
  let next = ctx.currentTime + 0.1
  let step = 0
  const schedule = () => {
    while (next < ctx.currentTime + 0.35) {
      const bar = Math.floor(step / 6)
      const pos = step % 6
      const chord = Math.floor(bar / 2) % ROOTS.length
      const pattern = PATTERNS[chord]
      // kora : ostinato
      pluck(KORA[pattern[pos]], next, 0.11, 1.4)
      // balafon : notes aiguës legeres sur certains temps
      if ((pos === 2 || pos === 5) && Math.random() < 0.55) pluck(KORA[5 + Math.floor(Math.random() * 4)] * 2, next + eighth / 2, 0.05, 0.3, "sine")
      // basse
      if (pos === 0 || pos === 3) pluck(ROOTS[chord], next, 0.22, 1.1, "sine")
      // djembe 6/8
      if (pos === 0) drum(next, "bass")
      if (pos === 2) drum(next, "tone")
      if (pos === 3 || pos === 5) drum(next, "slap")
      drum(next, "shaker")
      next += eighth
      step++
    }
  }
  schedule()
  const timer = window.setInterval(schedule, 100)

  // la musique baisse quand la voix parle
  const duck = (speaking: boolean) => {
    master.gain.cancelScheduledValues(ctx.currentTime)
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime)
    master.gain.linearRampToValueAtTime(speaking ? 0.1 : 0.32, ctx.currentTime + 0.6)
  }

  return {
    duck,
    stop: () => {
      window.clearInterval(timer)
      master.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime)
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1)
      window.setTimeout(() => ctx.close(), 1200)
    },
  }
}

// ------------------------------------------------------------ chapitres

function chapterText(it: PortfolioItem) {
  return [it.period, it.title, it.description].filter(Boolean).join(". ").replace(/\s*·\s*/g, ", ")
}

function Chapter({ item, i, onActive }: { item: PortfolioItem; i: number; onActive: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.55 })
  useEffect(() => {
    if (inView) onActive(i)
  }, [inView, i, onActive])
  const color = COLORS[i % COLORS.length]
  return (
    <div ref={ref} className="flex min-h-[78vh] items-center py-10 lg:min-h-[85vh]">
      <motion.div
        initial={{ opacity: 0, y: 60, filter: "blur(6px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ amount: 0.4 }}
        transition={{ duration: 0.9, ease: EASE }}
      >
        <p className="mb-3 bg-clip-text text-6xl font-extrabold text-transparent lg:hidden" style={{ fontFamily: "'Sora', sans-serif", backgroundImage: `linear-gradient(120deg, ${color}, #fff)` }}>
          {item.period}
        </p>
        <p className="text-sm uppercase tracking-[0.3em] text-white/45" style={{ fontFamily: "'Space Mono', monospace" }}>
          Chapitre {String(i + 1).padStart(2, "0")}
        </p>
        <h3 className="mt-3 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl" style={{ fontFamily: "'Sora', sans-serif" }}>
          {item.title}
        </h3>
        {item.org && (
          <p className="mt-3 flex items-center gap-2 text-white/55 lg:hidden"><MapPin className="h-4 w-4" style={{ color }} />{item.org}</p>
        )}
        {item.description && <p className="mt-6 max-w-xl text-xl leading-relaxed text-white/75">{item.description}</p>}
        <motion.span
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: 0.3, ease: EASE }}
          className="mt-8 block h-1 w-40 origin-left rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
        />
      </motion.div>
    </div>
  )
}

export function StorySection({ items, index }: { items: PortfolioItem[]; index: string }) {
  const [active, setActive] = useState(0)
  const on = useListening()
  const spoken = useRef(-1)
  const item = items[active] || items[0]
  const color = COLORS[active % COLORS.length]
  const progress = (active + 1) / items.length
  const R = 54
  const C = 2 * Math.PI * R

  // la voix lit le chapitre affiche (une fois par chapitre, tant que l'ecoute est active)
  useEffect(() => {
    if (!on) {
      spoken.current = -1
      return
    }
    if (spoken.current === active || !items[active]) return
    spoken.current = active
    speak(chapterText(items[active]))
  }, [on, active, items])

  return (
    <section className="relative">
      <motion.div
        aria-hidden
        animate={{ background: `radial-gradient(ellipse at 30% 50%, ${color}26, transparent 60%)` }}
        transition={{ duration: 1.2 }}
        className="pointer-events-none absolute inset-0"
      />
      <div className="relative mx-auto max-w-6xl px-5 pt-16">
        <div className="flex items-end gap-4">
          <span className="text-sm text-white/40" style={{ fontFamily: "'Space Mono', monospace" }}>{index}</span>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl" style={{ fontFamily: "'Sora', sans-serif" }}>Mon histoire</h2>
          <span className="mb-3 h-px flex-1 bg-gradient-to-r from-white/25 to-transparent" />
        </div>
      </div>

      {/* telephone : barre fixe annee + progression pendant toute la section */}
      <div className="sticky top-0 z-20 mt-6 border-b border-white/10 bg-[#06070b]/80 px-5 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <AnimatePresence mode="wait">
            <motion.span key={item?.period} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} className="text-lg font-extrabold" style={{ color, fontFamily: "'Sora', sans-serif" }}>
              {item?.period}
            </motion.span>
          </AnimatePresence>
          <div className="flex gap-1.5">
            {items.map((_, i) => (
              <motion.span key={i} animate={{ width: i === active ? 22 : 7, background: i <= active ? COLORS[i % COLORS.length] : "rgba(255,255,255,0.18)" }} className="h-1.5 rounded-full" />
            ))}
          </div>
        </div>
      </div>

      <div className="relative mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="hidden lg:block">
          <div className="sticky top-24 flex h-[70vh] flex-col justify-center">
            <div className="relative h-40 w-40">
              <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
                <circle cx="64" cy="64" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                <motion.circle
                  cx="64" cy="64" r={R} fill="none" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={C}
                  animate={{ strokeDashoffset: C * (1 - progress), stroke: color }}
                  transition={{ duration: 0.8, ease: EASE }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-3xl font-extrabold" style={{ fontFamily: "'Sora', sans-serif" }}>
                {active + 1}<span className="text-base text-white/40">/{items.length}</span>
              </span>
            </div>
            <div className="mt-8 text-7xl font-extrabold tracking-tighter xl:text-8xl" style={{ fontFamily: "'Sora', sans-serif" }}>
              <AnimatePresence mode="wait">
                <motion.p key={item?.period} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }} transition={{ duration: 0.5, ease: EASE }} style={{ color }}>
                  {item?.period}
                </motion.p>
              </AnimatePresence>
            </div>
            <AnimatePresence mode="wait">
              <motion.p key={item?.org} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="mt-6 flex items-center gap-2 text-lg text-white/70">
                <MapPin className="h-5 w-5" style={{ color }} />
                {item?.org}
              </motion.p>
            </AnimatePresence>
            <div className="mt-10 flex gap-2">
              {items.map((_, i) => (
                <motion.span key={i} animate={{ width: i === active ? 40 : 10, background: i <= active ? COLORS[i % COLORS.length] : "rgba(255,255,255,0.15)" }} transition={{ duration: 0.5 }} className="h-2.5 rounded-full" />
              ))}
            </div>
          </div>
        </div>
        <div>
          {items.map((it, i) => <Chapter key={i} item={it} i={i} onActive={setActive} />)}
        </div>
      </div>
    </section>
  )
}

// ------------------------------------------------------------ bouton d'ecoute

export function StoryPlayerButton({ intro }: { intro: string }) {
  const on = useListening()
  const music = useRef<ReturnType<typeof startAfricanMusic> | null>(null)

  useEffect(() => {
    // charge les voix (Chrome les fournit apres un premier evenement)
    window.speechSynthesis?.getVoices()
    return () => {
      music.current?.stop()
      window.speechSynthesis?.cancel()
      setListening(false)
    }
  }, [])

  const toggle = () => {
    if (on) {
      music.current?.stop()
      music.current = null
      onSpeaking = null
      window.speechSynthesis?.cancel()
      setListening(false)
      return
    }
    try {
      music.current = startAfricanMusic()
      onSpeaking = (s) => music.current?.duck(s)
    } catch {
      music.current = null
    }
    setListening(true)
    speak(intro)
  }

  return (
    <motion.button
      type="button"
      onClick={toggle}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.8 }}
      aria-pressed={on}
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-white/15 bg-[#0d1220]/90 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl hover:bg-[#141b2e] sm:bottom-6 sm:right-6"
    >
      {on ? <Square className="h-4 w-4 fill-current" /> : <Headphones className="h-4 w-4" />}
      {on ? "Arrêter" : "Écouter mon histoire"}
      {on ? (
        <span className="flex h-3.5 items-end gap-0.5">
          {[0, 1, 2, 3].map((b) => (
            <motion.span key={b} animate={{ height: [4, 14, 6, 11, 4] }} transition={{ duration: 1, repeat: Infinity, delay: b * 0.15 }} className="w-0.5 rounded-full bg-[#f5c451]" />
          ))}
        </span>
      ) : (
        <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#f5c451] opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[#f5c451]" /></span>
      )}
    </motion.button>
  )
}
