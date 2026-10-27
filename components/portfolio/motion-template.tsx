"use client"

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react"
import { animate, motion, useInView, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion"
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react"
import { videoEmbed, type PortfolioItem, type PortfolioView } from "@/lib/portfolio"

// Modele "Motion" : portfolio anime sur mesure (fond vivant, nom qui
// s'assemble, compteurs, captures en parallaxe, frise qui se dessine).
// Polices chargees par app/portfolio/layout.tsx.

const F = {
  display: "'Sora', 'Segoe UI', system-ui, sans-serif",
  sans: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
  mono: "'Space Mono', ui-monospace, Consolas, monospace",
}
const EASE = [0.22, 1, 0.36, 1] as const
const BLUE = "#3b82f6"
const GOLD = "#f5c451"

const LINK_LABEL: Record<string, string> = {
  linkedin: "LinkedIn", github: "GitHub", website: "Site web", instagram: "Instagram", twitter: "X",
  facebook: "Facebook", youtube: "YouTube", tiktok: "TikTok", whatsapp: "WhatsApp", behance: "Behance",
}

function host(url?: string) {
  if (!url) return ""
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.8, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function SectionTitle({ index, children }: { index: string; children: string }) {
  return (
    <Reveal>
      <div className="mb-10 flex items-end gap-4">
        <span className="text-sm text-white/40" style={{ fontFamily: F.mono }}>{index}</span>
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl" style={{ fontFamily: F.display }}>{children}</h2>
        <span className="mb-3 h-px flex-1 bg-gradient-to-r from-white/25 to-transparent" />
      </div>
    </Reveal>
  )
}

// ------------------------------------------------------------ hero

function SplitName({ name }: { name: string }) {
  return (
    <h1 className="text-[13vw] font-extrabold leading-[0.9] tracking-tighter sm:text-7xl lg:text-8xl" style={{ fontFamily: F.display }}>
      {name.split(" ").map((word, w) => (
        <span key={w} className="mr-[0.22em] inline-block whitespace-nowrap">
          {word.split("").map((ch, i) => (
            <motion.span
              key={i}
              initial={{ y: "110%", opacity: 0, rotate: 8 }}
              animate={{ y: "0%", opacity: 1, rotate: 0 }}
              transition={{ duration: 0.9, delay: 0.25 + (w * 6 + i) * 0.04, ease: EASE }}
              className="inline-block"
            >
              {ch}
            </motion.span>
          ))}
        </span>
      ))}
    </h1>
  )
}

function Hero({ v }: { v: PortfolioView }) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] })
  const y = useTransform(scrollYProgress, [0, 1], [0, 160])
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0])
  const contacts = [
    v.email && { icon: Mail, label: v.email, href: `mailto:${v.email}` },
    v.phone && { icon: Phone, label: v.phone, href: `tel:${v.phone.replace(/\s/g, "")}` },
    v.location && { icon: MapPin, label: v.location, href: "" },
  ].filter(Boolean) as Array<{ icon: typeof Mail; label: string; href: string }>

  return (
    <section ref={ref} className="relative flex min-h-[100svh] items-center overflow-hidden">
      {/* fond vivant */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-[-10%] h-[640px] w-[640px] rounded-full blur-[130px] [animation:mo-drift_16s_ease-in-out_infinite]" style={{ background: `${BLUE}55` }} />
        <div className="absolute -right-32 bottom-[-20%] h-[560px] w-[560px] rounded-full blur-[130px] [animation:mo-drift_20s_ease-in-out_infinite_reverse]" style={{ background: `${GOLD}33` }} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_75%)]" />
      </div>

      <motion.div style={reduce ? undefined : { y, opacity: fade }} className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-5 py-20 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-white/80"
            style={{ fontFamily: F.mono }}
          >
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" /></span>
            Disponible pour vos projets
          </motion.p>
          <SplitName name={v.name || "Portfolio"} />
          {v.title && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.9, ease: EASE }}
              className="mt-6 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl"
              style={{ fontFamily: F.display, backgroundImage: `linear-gradient(90deg, ${BLUE}, #a78bfa, ${GOLD})` }}
            >
              {v.title}
            </motion.p>
          )}
          {v.headline && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1, duration: 0.8 }} className="mt-4 max-w-2xl text-lg text-white/65">
              {v.headline}
            </motion.p>
          )}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3, duration: 0.7, ease: EASE }} className="mt-8 flex flex-wrap gap-3">
            {v.email && (
              <a href={`mailto:${v.email}`} className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-black transition-transform hover:scale-[1.04]">
                Me contacter <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            )}
            {v.cvUrl && (
              <a href={v.cvUrl} className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 font-bold hover:bg-white/10">
                Télécharger mon CV
              </a>
            )}
            {v.links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white/80 hover:bg-white/10">
                {LINK_LABEL[l.type] || l.type} <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            ))}
          </motion.div>
          {contacts.length > 0 && (
            <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/55">
              {contacts.map((c) => (
                <li key={c.label} className="flex items-center gap-2">
                  <c.icon className="h-4 w-4" />
                  {c.href ? <a href={c.href} className="hover:text-white">{c.label}</a> : c.label}
                </li>
              ))}
            </motion.ul>
          )}
        </div>

        {/* photo avec anneau tournant */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1.1, delay: 0.3, ease: EASE }}
          className="relative order-first mx-auto h-40 w-40 sm:h-60 sm:w-60 lg:order-none lg:h-72 lg:w-72"
        >
          <div className="absolute -inset-3 rounded-full [animation:mo-spin_8s_linear_infinite]" style={{ background: `conic-gradient(from 0deg, ${BLUE}, transparent 30%, ${GOLD} 55%, transparent 80%, ${BLUE})` }} />
          <div className="absolute -inset-1 rounded-full bg-[#06070b]" />
          {v.photo ? (
            <img src={v.photo} alt={v.name} className="relative h-full w-full rounded-full object-cover" />
          ) : (
            <div className="relative flex h-full w-full items-center justify-center rounded-full bg-white/10 text-6xl font-extrabold" style={{ fontFamily: F.display }}>
              {v.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("")}
            </div>
          )}
          {[v.field, v.level].filter(Boolean).length > 0 && (
            <motion.span
              animate={reduce ? undefined : { y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/15 bg-[#0d1220]/90 px-4 py-2 text-xs font-bold backdrop-blur"
              style={{ fontFamily: F.mono }}
            >
              {[v.field, v.level].filter(Boolean).join(" · ")}
            </motion.span>
          )}
        </motion.div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 sm:block">
        <div className="flex h-10 w-6 justify-center rounded-full border border-white/25 pt-2">
          <span className="h-2 w-1 rounded-full bg-white/70 [animation:mo-scroll_1.8s_ease-in-out_infinite]" />
        </div>
      </motion.div>
    </section>
  )
}

// ------------------------------------------------------------ bandeau et chiffres

function SkillsMarquee({ skills }: { skills: string[] }) {
  if (skills.length === 0) return null
  const row = [...skills, ...skills]
  return (
    <div className="relative overflow-hidden border-y border-white/10 bg-white/[0.02] py-5 [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
      <div className="flex w-max gap-8 [animation:mo-marquee_45s_linear_infinite]">
        {row.map((s, i) => (
          <span key={i} className="flex items-center gap-8 whitespace-nowrap text-xl font-bold text-white/70" style={{ fontFamily: F.display }}>
            {s}
            <span className="h-2 w-2 rotate-45" style={{ background: i % 2 ? GOLD : BLUE }} />
          </span>
        ))}
      </div>
    </div>
  )
}

function Counter({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const m = value.match(/^(\D*)(\d+)(.*)$/)
  const target = m ? Number(m[2]) : 0
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!inView || !m) return
    const c = animate(0, target, { duration: 1.6, ease: EASE, onUpdate: (x) => setN(Math.round(x)) })
    return () => c.stop()
  }, [inView]) // eslint-disable-line react-hooks/exhaustive-deps
  return <span ref={ref}>{m ? `${m[1]}${n}${m[3]}` : value}</span>
}

function Highlights({ items }: { items: PortfolioItem[] }) {
  if (items.length === 0) return null
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {items.map((h, i) => (
          <Reveal key={i} delay={i * 0.1}>
            <div className="group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-white/25">
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-60" style={{ background: i % 2 ? GOLD : BLUE }} />
              <p className="relative text-5xl font-extrabold tracking-tight sm:text-6xl" style={{ fontFamily: F.display }}>
                <Counter value={h.title} />
              </p>
              <p className="relative mt-2 text-sm text-white/60">{h.description}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

// ------------------------------------------------------------ projets

function Media({ p }: { p: PortfolioItem }) {
  const video = videoEmbed(p.videoUrl)
  if (video?.kind === "iframe") return <iframe src={video.src} title={p.title} loading="lazy" allowFullScreen className="h-full w-full border-0" />
  if (video) return <video src={video.src} poster={p.imageUrl || undefined} controls playsInline preload="metadata" className="h-full w-full object-cover" />
  if (p.imageUrl) return <img src={p.imageUrl} alt={p.title} loading="lazy" className="h-full w-full object-cover object-top" />
  return null
}

function ProjectCard({ p, i }: { p: PortfolioItem; i: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })
  const y = useSpring(useTransform(scrollYProgress, [0, 1], [60, -60]), { stiffness: 80, damping: 20 })
  const tilt = useTransform(scrollYProgress, [0, 0.5, 1], [i % 2 ? -4 : 4, 0, i % 2 ? 3 : -3])
  const hasMedia = !!(p.imageUrl || p.videoUrl)
  const tools = (p.tools || "").split(",").map((t) => t.trim()).filter(Boolean)
  const flip = i % 2 === 1

  return (
    <div ref={ref} className={`grid items-center gap-8 lg:gap-14 ${hasMedia ? "lg:grid-cols-2" : ""}`}>
      {hasMedia && (
        <motion.div style={reduce ? undefined : { y, rotate: tilt }} className={flip ? "lg:order-2" : ""}>
          <div className="overflow-hidden rounded-2xl border border-white/15 bg-[#0d1220] shadow-[0_40px_100px_-30px_rgba(59,130,246,0.45)]">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              {host(p.link) && <span className="ml-3 truncate rounded-md bg-white/5 px-3 py-0.5 text-xs text-white/50" style={{ fontFamily: F.mono }}>{host(p.link)}</span>}
            </div>
            <div className="aspect-[16/10] overflow-hidden"><Media p={p} /></div>
          </div>
        </motion.div>
      )}
      <Reveal className={flip ? "lg:order-1" : ""}>
        <span className="text-6xl font-extrabold text-white/10 sm:text-7xl" style={{ fontFamily: F.display }}>{String(i + 1).padStart(2, "0")}</span>
        <h3 className="-mt-4 text-2xl font-extrabold leading-tight sm:text-3xl" style={{ fontFamily: F.display }}>{p.title}</h3>
        {(p.org || p.period) && <p className="mt-2 text-sm text-white/45" style={{ fontFamily: F.mono }}>{[p.org, p.period].filter(Boolean).join(" · ")}</p>}
        {p.description && <p className="mt-4 text-lg leading-relaxed text-white/70">{p.description}</p>}
        {tools.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2">
            {tools.map((t) => (
              <li key={t} className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-white/80" style={{ fontFamily: F.mono }}>{t}</li>
            ))}
          </ul>
        )}
        {p.link && (
          <a href={p.link} target="_blank" rel="noopener noreferrer" className="group mt-6 inline-flex items-center gap-2 font-bold" style={{ color: i % 2 ? GOLD : BLUE }}>
            Voir {host(p.link) || "le projet"} <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        )}
      </Reveal>
    </div>
  )
}

// ------------------------------------------------------------ parcours

function Timeline({ items, color }: { items: PortfolioItem[]; color: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 50%"] })
  const scaleY = useSpring(scrollYProgress, { stiffness: 90, damping: 25 })
  return (
    <div ref={ref} className="relative pl-8">
      <div className="absolute bottom-0 left-[7px] top-0 w-px bg-white/10" />
      <motion.div style={{ scaleY, background: color }} className="absolute bottom-0 left-[7px] top-0 w-px origin-top" />
      <ul className="space-y-10">
        {items.map((it, i) => (
          <Reveal key={i} delay={i * 0.05}>
            <li className="relative">
              <span className="absolute -left-8 top-1.5 h-[15px] w-[15px] rounded-full border-2 bg-[#06070b]" style={{ borderColor: color }} />
              {it.period && <p className="text-xs uppercase tracking-widest text-white/45" style={{ fontFamily: F.mono }}>{it.period}</p>}
              <p className="mt-1 text-xl font-bold" style={{ fontFamily: F.display }}>{it.title}</p>
              {it.org && <p className="text-white/55">{it.org}</p>}
              {it.description && <p className="mt-2 leading-relaxed text-white/70">{it.description}</p>}
            </li>
          </Reveal>
        ))}
      </ul>
    </div>
  )
}

// ------------------------------------------------------------ page

const KEYFRAMES = `
@keyframes mo-drift { 0%,100% { transform: translate(0,0) scale(1) } 50% { transform: translate(70px,50px) scale(1.15) } }
@keyframes mo-spin { to { transform: rotate(360deg) } }
@keyframes mo-marquee { to { transform: translateX(-50%) } }
@keyframes mo-scroll { 0% { transform: translateY(0); opacity: 1 } 80% { transform: translateY(14px); opacity: 0 } 100% { opacity: 0 } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important } }
`

export function MotionTemplate({ v }: { v: PortfolioView }) {
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })
  const highlights = v.highlights || []
  let n = 0
  const idx = () => String(++n).padStart(2, "0")

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#06070b] text-white" style={{ fontFamily: F.sans }}>
      <style>{KEYFRAMES}</style>
      <motion.div style={{ scaleX: progress, background: `linear-gradient(90deg, ${BLUE}, ${GOLD})` }} className="fixed inset-x-0 top-0 z-50 h-1 origin-left" />

      <Hero v={v} />
      <SkillsMarquee skills={v.skills} />
      <Highlights items={highlights} />

      {v.about && (
        <section className="mx-auto max-w-6xl px-5 py-16">
          <SectionTitle index={idx()}>À propos</SectionTitle>
          <Reveal>
            <p className="max-w-4xl text-xl font-medium leading-relaxed text-white/80 sm:text-3xl" style={{ fontFamily: F.display }}>{v.about}</p>
          </Reveal>
        </section>
      )}

      {v.projects.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-16">
          <SectionTitle index={idx()}>Réalisations</SectionTitle>
          <div className="space-y-28">
            {v.projects.map((p, i) => <ProjectCard key={i} p={p} i={i} />)}
          </div>
        </section>
      )}

      {(v.experiences.length > 0 || v.education.length > 0) && (
        <section className="mx-auto max-w-6xl px-5 py-16">
          <SectionTitle index={idx()}>Parcours</SectionTitle>
          <div className="grid gap-16 lg:grid-cols-2">
            {v.experiences.length > 0 && (
              <div>
                <h3 className="mb-8 text-sm uppercase tracking-[0.25em] text-white/50" style={{ fontFamily: F.mono }}>Expériences</h3>
                <Timeline items={v.experiences} color={BLUE} />
              </div>
            )}
            {v.education.length > 0 && (
              <div>
                <h3 className="mb-8 text-sm uppercase tracking-[0.25em] text-white/50" style={{ fontFamily: F.mono }}>Formation</h3>
                <Timeline items={v.education} color={GOLD} />
              </div>
            )}
          </div>
        </section>
      )}

      {v.skills.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-16">
          <SectionTitle index={idx()}>Compétences</SectionTitle>
          <div className="flex flex-wrap gap-3">
            {v.skills.map((s, i) => (
              <motion.span
                key={s}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.03 }}
                whileHover={{ y: -4 }}
                className="rounded-2xl border border-white/12 bg-white/[0.04] px-5 py-3 font-semibold"
              >
                {s}
              </motion.span>
            ))}
          </div>
          {v.languages.length > 0 && <p className="mt-8 text-white/55" style={{ fontFamily: F.mono }}>Langues : {v.languages.join(" · ")}</p>}
        </section>
      )}

      <section className="mx-auto max-w-6xl px-5 pb-24 pt-10">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 p-10 text-center sm:p-16" style={{ background: `radial-gradient(ellipse at 30% 0%, ${BLUE}40, transparent 60%), radial-gradient(ellipse at 80% 100%, ${GOLD}30, transparent 60%), #0b0e17` }}>
            <h2 className="text-4xl font-extrabold tracking-tight sm:text-6xl" style={{ fontFamily: F.display }}>Travaillons ensemble.</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/65">Un projet hardware, une plateforme web ou une idée à lancer ? Écrivez-moi.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href="#contact" className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-bold text-black transition-transform hover:scale-[1.04]">
                Laisser mes coordonnées <ArrowUpRight className="h-5 w-5" />
              </a>
              {v.email && (
                <a href={`mailto:${v.email}`} className="inline-flex items-center gap-2 rounded-full border border-white/20 px-8 py-4 text-lg font-bold hover:bg-white/10">
                  {v.email}
                </a>
              )}
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  )
}
