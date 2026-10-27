"use client"

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion"
import { ArrowRight, BadgeCheck, CreditCard, Eye, Gift, FolderKanban, GraduationCap, Play, Sparkles, Video } from "lucide-react"
import { PORTFOLIO_PRICE, PORTFOLIO_TEMPLATES, type PortfolioTemplate } from "@/lib/portfolio"

// Page de vente /etudiants en motion design. Les ecrans des telephones sont
// des captures pleine page des vrais modeles (public/portfolio/shots), plus
// legeres que des iframes et animables.

const ORDER = "/register?product=portfolio-etudiant"
const GOLD = "#d4af37"
const EASE = [0.22, 1, 0.36, 1] as const

const AUDIENCES = ["recruteurs.", "écoles.", "entreprises.", "clients."]
const FIELDS = ["Informatique", "Mécanique", "Mécatronique", "Procédés de fabrication", "Marketing", "Droit", "Design", "Médecine", "Finance", "Architecture", "Communication", "Génie civil", "Gestion", "Journalisme", "Agronomie"]
const SKILLS = ["React", "Figma", "Excel", "Prise de parole", "Marketing digital", "Python"]
const CYCLE_MS = 6500
const FREE_CARDS = 100

const included = [
  { icon: FolderKanban, title: "Ton portfolio en ligne", text: "Projets, compétences, expériences, formation et CV, sur une page à ton nom." },
  { icon: Video, title: "Les vidéos de tes réalisations", text: "Ton appli, ta maquette, ton exposé : la vidéo se lit directement dans ton portfolio." },
  { icon: CreditCard, title: "Ta carte de visite numérique", text: "Ta carte Mahu en ligne : un lien et un QR code à partager. Offerte aux 100 premiers inscrits." },
  { icon: BadgeCheck, title: "5 modèles, valable 1 an", text: "Change de modèle quand tu veux, ton contenu suit. Un seul paiement." },
]

const steps = [
  { title: "Inscris-toi et paie", text: `${PORTFOLIO_PRICE}, par Mobile Money ou carte bancaire.` },
  { title: "Choisis ton modèle", text: "Ajoute tes projets, tes vidéos, tes compétences et ta formation." },
  { title: "Partage ton lien", text: "Envoie ton portfolio et ta carte digitale aux recruteurs et aux écoles." },
]

// Course de defilement d'une capture dans un ecran 9/19 (en % de la capture).
const SHOT_END: Record<PortfolioTemplate, string> = { eclat: "-67.9%", nuit: "-66.8%", campus: "-67.1%", atelier: "-65.5%", plan: "-77.7%" }

function shot(id: PortfolioTemplate) {
  return `/portfolio/shots/${id}.webp`
}

// ------------------------------------------------------------ elements

function PhoneFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-[2.6rem] bg-gradient-to-b from-[#2a2f3a] to-[#0d1017] p-[10px] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9),inset_0_0_0_1px_rgba(255,255,255,0.08)] ${className}`}>
      <div className="relative overflow-hidden rounded-[2rem] bg-black">
        {children}
        <div className="pointer-events-none absolute left-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
      </div>
    </div>
  )
}

/** Capture d'un modele qui defile de haut en bas dans l'ecran du telephone. */
function ScrollingShot({ id, play, duration }: { id: PortfolioTemplate; play: boolean; duration: number }) {
  return (
    <img
      src={shot(id)}
      alt=""
      draggable={false}
      className="block w-full select-none"
      style={play ? { animation: `mahu-shot-scroll ${duration}ms cubic-bezier(0.65,0,0.35,1) both` } : undefined}
    />
  )
}

function MahuCard({ className = "" }: { className?: string }) {
  // QR stylise : motif fixe (pas un vrai code), pour l'illustration.
  const cells = "1110111010001101011101100101110011010111001011100110101110011101"
  return (
    <div className={`relative aspect-[85.6/54] overflow-hidden rounded-2xl border border-[#d4af37]/40 bg-gradient-to-br from-[#16130a] via-[#0b0b0d] to-[#1c1606] p-4 shadow-[0_25px_60px_-15px_rgba(212,175,55,0.45)] ${className}`}>
      <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_30%,rgba(255,255,255,0.14)_45%,transparent_60%)] [animation:mahu-shine_4.5s_ease-in-out_infinite]" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <span className="text-lg font-black tracking-tight" style={{ color: GOLD }}>mahu</span>
          <div className="grid grid-cols-8 gap-[1.5px] rounded bg-white p-1">
            {cells.split("").map((c, i) => (
              <span key={i} className={`h-[3px] w-[3px] ${c === "1" ? "bg-black" : "bg-white"}`} />
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-bold text-white">Awa Diop</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">Développeuse web · Étudiante</p>
        </div>
      </div>
    </div>
  )
}

function RotatingWord() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % AUDIENCES.length), 2200)
    return () => clearInterval(t)
  }, [])
  return (
    <span className="relative inline-grid align-bottom">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={AUDIENCES[i]}
          initial={{ y: "70%", opacity: 0, filter: "blur(8px)" }}
          animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
          exit={{ y: "-70%", opacity: 0, filter: "blur(8px)" }}
          transition={{ duration: 0.55, ease: EASE }}
          className="bg-gradient-to-r from-[#f6e3a1] via-[#d4af37] to-[#b8901f] bg-clip-text text-transparent"
        >
          {AUDIENCES[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

function ShineButton({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={`group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-[#d4af37] px-7 py-4 text-lg font-bold text-black shadow-[0_10px_40px_-8px_rgba(212,175,55,0.7)] transition-transform hover:scale-[1.03] active:scale-[0.98] ${className}`}
    >
      <span className="absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.65)_50%,transparent_75%)] [animation:mahu-btn-shine_3s_ease-in-out_infinite]" />
      <span className="relative flex items-center gap-2">{children}</span>
    </Link>
  )
}

/** Lancement : carte de visite numerique Mahu (1 an) offerte aux 100 premiers. */
function FreeCards({ left, className = "" }: { left: number; className?: string }) {
  const taken = FREE_CARDS - left
  return (
    <div className={`rounded-2xl border border-[#d4af37]/35 bg-[#d4af37]/[0.08] p-4 ${className}`}>
      <p className="flex items-start gap-2 text-sm font-semibold text-[#f1d77e]">
        <Gift className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Offert aux 100 premiers inscrits : ta carte de visite numérique Mahu, pendant 1 an.</span>
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(3, (taken / FREE_CARDS) * 100)}%` }}
          transition={{ duration: 1.4, delay: 1, ease: EASE }}
          className="h-full rounded-full bg-gradient-to-r from-[#f1d77e] to-[#d4af37]"
        />
      </div>
      <p className="mt-2 text-xs text-white/60">
        Plus que <b className="text-white">{left}</b> carte{left > 1 ? "s" : ""} offerte{left > 1 ? "s" : ""} sur {FREE_CARDS}
      </p>
    </div>
  )
}

// ------------------------------------------------------------ hero

function Hero({ freeCardsLeft }: { freeCardsLeft: number }) {
  const reduce = useReducedMotion()
  const [current, setCurrent] = useState(0)
  const [toast, setToast] = useState(false)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rotY = useSpring(useTransform(mx, [-1, 1], [-14, 14]), { stiffness: 80, damping: 18 })
  const rotX = useSpring(useTransform(my, [-1, 1], [10, -10]), { stiffness: 80, damping: 18 })

  useEffect(() => {
    if (reduce) return
    const t = setInterval(() => setCurrent((c) => (c + 1) % PORTFOLIO_TEMPLATES.length), CYCLE_MS)
    return () => clearInterval(t)
  }, [reduce])

  // Notification « un recruteur a vu ton portfolio » a chaque modele.
  useEffect(() => {
    setToast(false)
    const show = setTimeout(() => setToast(true), 2600)
    const hide = setTimeout(() => setToast(false), 5600)
    return () => {
      clearTimeout(show)
      clearTimeout(hide)
    }
  }, [current])

  const tpl = PORTFOLIO_TEMPLATES[current]
  const words = "Montre ton talent aux".split(" ")

  return (
    <section
      className="relative overflow-hidden"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        mx.set(((e.clientX - r.left) / r.width) * 2 - 1)
        my.set(((e.clientY - r.top) / r.height) * 2 - 1)
      }}
      onPointerLeave={() => {
        mx.set(0)
        my.set(0)
      }}
    >
      {/* fond : aurore doree + grille */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[620px] w-[620px] rounded-full bg-[#d4af37]/20 blur-[120px] [animation:mahu-drift_14s_ease-in-out_infinite]" />
        <div className="absolute -right-40 top-40 h-[520px] w-[520px] rounded-full bg-[#3b5bdb]/20 blur-[120px] [animation:mahu-drift_18s_ease-in-out_infinite_reverse]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-14 sm:pt-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/40 bg-[#d4af37]/10 px-4 py-1.5 text-sm font-semibold text-[#e9cf7a]"
          >
            <GraduationCap className="h-4 w-4" /> Offre réservée aux étudiants
          </motion.p>

          <h1 className="mt-6 text-[2.6rem] font-black leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
            {words.map((w, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 40, rotateX: -60 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 0.8, delay: 0.1 + i * 0.08, ease: EASE }}
                className="mr-[0.25em] inline-block [transform-origin:bottom]"
              >
                {w}
              </motion.span>
            ))}
            <br />
            <RotatingWord />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55, ease: EASE }}
            className="mt-6 max-w-xl text-lg text-white/70"
          >
            Un vrai portfolio à ton nom, avec les vidéos de tes réalisations, et ta carte digitale professionnelle Mahu. Prêt en 10 minutes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7, ease: EASE }}
            className="mt-9 flex flex-col gap-5 sm:flex-row sm:items-center"
          >
            <ShineButton href={ORDER}>
              Je crée mon portfolio <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </ShineButton>
            <div className="leading-tight">
              <p className="text-3xl font-black">{PORTFOLIO_PRICE}</p>
              <p className="text-sm text-white/55">portfolio + carte numérique · 1 an</p>
            </div>
          </motion.div>

          {freeCardsLeft > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.8, ease: EASE }}>
              <FreeCards left={freeCardsLeft} className="mt-6 max-w-md" />
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mt-8 flex flex-wrap gap-2">
            {PORTFOLIO_TEMPLATES.map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setCurrent(i)}
                className={`relative overflow-hidden rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${i === current ? "border-[#d4af37] text-black" : "border-white/15 text-white/70 hover:text-white"}`}
              >
                {i === current && <motion.span layoutId="tpl-pill" className="absolute inset-0 bg-[#d4af37]" transition={{ type: "spring", stiffness: 300, damping: 30 }} />}
                <span className="relative">{t.name}</span>
              </button>
            ))}
          </motion.div>
        </div>

        {/* telephone 3D + elements flottants */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.1, delay: 0.2, ease: EASE }}
          className="relative mx-auto [perspective:1400px]"
        >
          <motion.div style={{ rotateY: reduce ? 0 : rotY, rotateX: reduce ? 0 : rotX }} className="relative [transform-style:preserve-3d]">
            <div className="absolute inset-0 -z-10 scale-110 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.35),transparent_65%)] blur-2xl" />
            <motion.div animate={reduce ? undefined : { y: [0, -12, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
              <PhoneFrame className="w-[236px] sm:w-[276px]">
                <div className="relative h-[470px] overflow-hidden [--screen-h:470px] sm:h-[550px] sm:[--screen-h:550px]">
                  <AnimatePresence initial={false}>
                    <motion.div
                      key={tpl.id}
                      initial={{ opacity: 0, scale: 1.06 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.7, ease: EASE }}
                      className="absolute inset-0"
                    >
                      <ScrollingShot id={tpl.id} play={!reduce} duration={CYCLE_MS} />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </PhoneFrame>
            </motion.div>

            {/* carte Mahu */}
            <motion.div
              initial={{ opacity: 0, x: -60, rotate: -20 }}
              animate={{ opacity: 1, x: 0, rotate: -9 }}
              transition={{ duration: 1, delay: 0.9, ease: EASE }}
              className="absolute -left-16 bottom-10 w-[170px] sm:-left-28 sm:w-[210px]"
              style={{ z: 60 }}
            >
              <motion.div animate={reduce ? undefined : { y: [0, 10, 0], rotate: [0, 2, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}>
                <MahuCard />
              </motion.div>
            </motion.div>

            {/* badge video */}
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.2, ease: EASE }}
              className="absolute -right-6 top-16 sm:-right-28"
              style={{ z: 80 }}
            >
              <motion.div
                animate={reduce ? undefined : { y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold backdrop-blur-xl"
              >
                <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-[#d4af37] text-black">
                  <span className="absolute inset-0 rounded-full bg-[#d4af37] [animation:mahu-ping_2s_ease-out_infinite]" />
                  <Play className="relative h-3.5 w-3.5 fill-current" />
                </span>
                Vidéo de ta réalisation
              </motion.div>
            </motion.div>

            {/* competences flottantes */}
            {SKILLS.slice(0, 3).map((s, i) => (
              <motion.span
                key={s}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={reduce ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1, y: [0, i % 2 ? 9 : -9, 0] }}
                transition={{ opacity: { delay: 1.4 + i * 0.15 }, scale: { delay: 1.4 + i * 0.15 }, y: { duration: 4 + i, repeat: Infinity, ease: "easeInOut" } }}
                className="absolute hidden rounded-full border border-white/10 bg-[#0f131c]/90 px-3 py-1 text-xs font-semibold text-white/85 shadow-lg backdrop-blur sm:block"
                style={{ z: 40, right: i === 1 ? "-5.5rem" : "-3.5rem", top: `${52 + i * 12}%` }}
              >
                {s}
              </motion.span>
            ))}

            {/* notification */}
            <AnimatePresence>
              {toast && (
                <motion.div
                  initial={{ opacity: 0, y: -24, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 260, damping: 22 }}
                  style={{ x: "-50%", z: 100 }}
                  className="absolute -top-6 left-1/2 z-20 flex w-[260px] items-center gap-3 rounded-2xl border border-white/10 bg-white/95 p-3 text-black shadow-2xl"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#07090f] text-[#d4af37]">
                    <Eye className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 leading-tight">
                    <p className="text-xs font-bold">Un recruteur a ouvert ton portfolio</p>
                    <p className="text-[11px] text-black/55">à l&apos;instant · modèle {tpl.name}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

// ------------------------------------------------------------ sections

function FieldsMarquee() {
  const row = [...FIELDS, ...FIELDS]
  return (
    <div className="relative overflow-hidden border-y border-white/10 bg-white/[0.02] py-5 [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
      <div className="flex w-max gap-10 [animation:mahu-marquee_40s_linear_infinite]">
        {row.map((f, i) => (
          <span key={i} className="flex items-center gap-10 whitespace-nowrap text-lg font-semibold text-white/50">
            {f} <Sparkles className="h-4 w-4 text-[#d4af37]/70" />
          </span>
        ))}
      </div>
    </div>
  )
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function Included() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <Reveal>
        <h2 className="text-3xl font-black tracking-tight sm:text-5xl">Tout ce qu&apos;il te faut pour te démarquer.</h2>
      </Reveal>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {included.map((f, i) => (
          <Reveal key={f.title} delay={i * 0.1}>
            <motion.div
              whileHover={{ y: -6 }}
              className="group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6"
            >
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#d4af37]/0 blur-2xl transition-colors duration-500 group-hover:bg-[#d4af37]/25" />
              <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d4af37]/15 text-[#d4af37]">
                <f.icon className="h-6 w-6" />
              </span>
              <h3 className="relative mt-5 text-lg font-bold">{f.title}</h3>
              <p className="relative mt-2 text-sm leading-relaxed text-white/65">{f.text}</p>
            </motion.div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function VideoShowcase() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })
  const rotate = useTransform(scrollYProgress, [0, 0.5, 1], [10, 0, -6])
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.85, 1])
  return (
    <section ref={ref} className="relative overflow-hidden py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(212,175,55,0.12),transparent_60%)]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
        <motion.div style={{ rotate, scale }} className="mx-auto w-full max-w-md">
          <div className="overflow-hidden rounded-3xl bg-white text-black shadow-[0_40px_100px_-30px_rgba(212,175,55,0.5)]">
            <div className="relative">
              <video src="/portfolio/demo-boutik.mp4" poster="/portfolio/demo-projet-2.jpg" autoPlay muted loop playsInline className="aspect-[16/10] w-full object-cover" />
              <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-red-500 [animation:mahu-blink_1.2s_ease-in-out_infinite]" /> Vidéo
              </span>
            </div>
            <div className="p-5">
              <p className="text-lg font-bold">Boutik — caisse mobile pour commerçants</p>
              <p className="mt-1 text-sm text-black/60">Application Android pour suivre les ventes et le stock, même sans internet.</p>
            </div>
          </div>
        </motion.div>
        <div>
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-full bg-[#d4af37]/15 px-3 py-1 text-sm font-semibold text-[#e9cf7a]">
              <Video className="h-4 w-4" /> Nouveau
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Montre tes réalisations en vidéo.</h2>
            <p className="mt-4 text-lg text-white/70">
              Une appli, une maquette, un exposé, un stage, un événement : envoie la vidéo depuis ton téléphone ou colle un lien YouTube. Elle se lit
              directement dans ton portfolio.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function Templates() {
  return (
    <section id="modeles" className="mx-auto max-w-6xl px-5 py-20">
      <Reveal>
        <h2 className="text-3xl font-black tracking-tight sm:text-5xl">Un modèle pour chaque filière.</h2>
        <p className="mt-3 text-white/60">Ouvre-les : ce sont de vrais portfolios, avec un exemple complet.</p>
      </Reveal>
      <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
        {PORTFOLIO_TEMPLATES.map((t, i) => (
          <Reveal key={t.id} delay={i * 0.12}>
            <Link href={`/portfolio/modeles/${t.id}`} className="group block">
              <motion.div whileHover={{ y: -10, rotate: i % 2 ? 1.5 : -1.5 }} transition={{ type: "spring", stiffness: 220, damping: 18 }}>
                <PhoneFrame className="mx-auto w-full max-w-[230px]">
                  <div className="aspect-[9/19] overflow-hidden">
                    <img
                      src={shot(t.id)}
                      alt={`Modèle ${t.name}`}
                      loading="lazy"
                      className="w-full"
                      style={{ ["--shot-end" as string]: SHOT_END[t.id], animation: `mahu-tpl-scroll 9s ${i * 1.3}s ease-in-out infinite alternate` }}
                    />
                  </div>
                </PhoneFrame>
              </motion.div>
              <div className="mt-4 text-center">
                <h3 className="text-lg font-bold">{t.name}</h3>
                <p className="text-sm text-white/55">{t.tagline}</p>
                <span className="mt-1 inline-block text-sm font-semibold text-[#d4af37] opacity-80 group-hover:opacity-100">Voir en grand →</span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function Steps() {
  const ref = useRef<HTMLOListElement>(null)
  const inView = useInView(ref, { once: true, margin: "-100px" })
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <Reveal>
        <h2 className="text-3xl font-black tracking-tight sm:text-5xl">Prêt en 3 étapes.</h2>
      </Reveal>
      <ol ref={ref} className="relative mt-12 grid gap-6 sm:grid-cols-3">
        <motion.span
          initial={{ scaleX: 0 }}
          animate={inView ? { scaleX: 1 } : undefined}
          transition={{ duration: 1.4, ease: EASE }}
          className="absolute left-0 right-0 top-6 hidden h-px origin-left bg-gradient-to-r from-[#d4af37] via-[#d4af37]/60 to-transparent sm:block"
        />
        {steps.map((s, i) => (
          <motion.li
            key={s.title}
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.7, delay: 0.3 + i * 0.25, ease: EASE }}
            className="relative"
          >
            <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-[#d4af37] bg-[#07090f] text-lg font-black text-[#d4af37] shadow-[0_0_30px_rgba(212,175,55,0.35)]">
              {i + 1}
            </span>
            <h3 className="mt-5 text-xl font-bold">{s.title}</h3>
            <p className="mt-2 text-white/65">{s.text}</p>
          </motion.li>
        ))}
      </ol>
    </section>
  )
}

function PriceCounter() {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!inView) return
    const c = animate(0, 3500, { duration: 1.6, ease: EASE, onUpdate: (v) => setN(Math.round(v / 50) * 50) })
    return () => c.stop()
  }, [inView])
  return <span ref={ref}>{n.toLocaleString("fr-FR").replace(/ /g, " ")} FCFA</span>
}

function FinalCta({ freeCardsLeft }: { freeCardsLeft: number }) {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-28 pt-6">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#f1d77e] via-[#d4af37] to-[#8f6f17] p-8 text-black sm:p-14">
          <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,0.45)_50%,transparent_65%)] [animation:mahu-shine_5s_ease-in-out_infinite]" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <h2 className="text-3xl font-black leading-tight sm:text-5xl">Ton avenir mérite une belle vitrine.</h2>
              <p className="mt-3 text-lg font-medium text-black/70">Portfolio + vidéos + carte de visite numérique, pendant 1 an.</p>
              {freeCardsLeft > 0 && (
                <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-black/10 px-4 py-1.5 text-sm font-bold">
                  <Gift className="h-4 w-4" /> Carte de visite numérique offerte · plus que {freeCardsLeft} sur {FREE_CARDS}
                </p>
              )}
              <p className="mt-6 text-5xl font-black tracking-tight sm:text-6xl">
                <PriceCounter />
              </p>
            </div>
            <Link href={ORDER} className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-8 py-4 text-lg font-bold text-white transition-transform hover:scale-[1.04]">
              Je commence <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

function StickyMobileCta({ freeCardsLeft }: { freeCardsLeft: number }) {
  const { scrollY } = useScroll()
  const [show, setShow] = useState(false)
  useEffect(() => scrollY.on("change", (v) => setShow(v > 700)), [scrollY])
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0f131c]/90 p-2.5 pl-4 shadow-2xl backdrop-blur-xl lg:hidden"
          style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="leading-tight">
            <p className="font-black">{PORTFOLIO_PRICE}</p>
            <p className="text-xs text-white/55">
              {freeCardsLeft > 0 ? `Carte numérique offerte · plus que ${freeCardsLeft}` : "portfolio + carte numérique · 1 an"}
            </p>
          </div>
          <Link href={ORDER} className="rounded-xl bg-[#d4af37] px-5 py-3 font-bold text-black">
            Je commence
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const KEYFRAMES = `
@keyframes mahu-shot-scroll { 0%, 10% { transform: translateY(0) } 88%, 100% { transform: translateY(calc(-100% + var(--screen-h))) } }
@keyframes mahu-drift { 0%, 100% { transform: translate(0, 0) scale(1) } 50% { transform: translate(60px, 40px) scale(1.12) } }
@keyframes mahu-marquee { to { transform: translateX(-50%) } }
@keyframes mahu-shine { 0%, 60% { transform: translateX(-120%) } 100% { transform: translateX(120%) } }
@keyframes mahu-btn-shine { 0%, 55% { transform: translateX(-100%) } 100% { transform: translateX(100%) } }
@keyframes mahu-ping { 0% { transform: scale(1); opacity: .7 } 100% { transform: scale(2.2); opacity: 0 } }
@keyframes mahu-blink { 50% { opacity: .2 } }
@keyframes mahu-tpl-scroll { 0%, 12% { transform: translateY(0) } 88%, 100% { transform: translateY(var(--shot-end)) } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important } }
`

export function StudentsLanding({ freeCardsLeft = 0 }: { freeCardsLeft?: number }) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#07090f] text-white">
      <style>{KEYFRAMES}</style>
      <Hero freeCardsLeft={freeCardsLeft} />
      <FieldsMarquee />
      <Included />
      <VideoShowcase />
      <Templates />
      <Steps />
      <FinalCta freeCardsLeft={freeCardsLeft} />
      <StickyMobileCta freeCardsLeft={freeCardsLeft} />
    </main>
  )
}
