"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Briefcase, Feather, Globe2 } from "lucide-react"

// Hero de la page d'accueil (mahu.cards et call.mahu.cards) : l'ordinateur
// le plus fin au monde, en precommande. Motion design en boucle : un
// ordinateur portable se ferme, s'aplatit et devient la carte Mahu.

const WORDS = ["fin.", "léger.", "simple à transporter."]
// Durees des etapes : portable ouvert, fermeture, aplatissement, carte.
const PHASES = [2200, 900, 700, 7000]

function LaptopToCard() {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setPhase((p) => (p + 1) % PHASES.length), PHASES[phase])
    return () => clearTimeout(t)
  }, [phase])

  const isCard = phase === 3

  return (
    <div className="relative mx-auto h-[300px] w-[340px] sm:h-[380px] sm:w-[440px] [perspective:1400px]">
      {/* halo */}
      <motion.div
        animate={{ opacity: isCard ? 0.9 : 0.35, scale: isCard ? 1.1 : 0.9 }}
        transition={{ duration: 1 }}
        className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(0,122,255,0.45),transparent_62%)] blur-2xl"
      />

      {/* Ordinateur portable */}
      <AnimatePresence>
        {!isCard && (
          <motion.div
            key="laptop"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={
              phase === 2
                ? { opacity: 0, scaleY: 0.08, scaleX: 0.78, transition: { duration: 0.6, ease: "easeIn" } }
                : { opacity: 1, scaleY: 1, scaleX: 1, transition: { duration: 0.6 } }
            }
            exit={{ opacity: 0 }}
          >
            <div className="[transform-style:preserve-3d]">
              {/* ecran */}
              <motion.div
                animate={{ rotateX: phase >= 1 ? -88 : 0 }}
                transition={{ duration: 0.8, ease: [0.6, 0, 0.3, 1] }}
                style={{ transformOrigin: "bottom center" }}
                className="mx-auto h-[150px] w-[240px] sm:h-[190px] sm:w-[300px] rounded-t-xl border border-white/15 bg-[#0b0f18] p-2 shadow-2xl"
              >
                <div className="h-full w-full overflow-hidden rounded-md bg-gradient-to-br from-[#0f2a52] to-[#081428]">
                  <div className="flex h-4 items-center gap-1 bg-white/10 px-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/50" />
                    <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
                    <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
                  </div>
                  <div className="relative h-full">
                    <div className="absolute left-3 top-3 h-14 w-24 rounded bg-white/90 sm:h-20 sm:w-32">
                      <div className="m-2 h-1.5 w-12 rounded bg-[#007AFF]" />
                      <div className="mx-2 mt-1.5 h-1 w-16 rounded bg-black/20" />
                      <div className="mx-2 mt-1 h-1 w-14 rounded bg-black/20" />
                    </div>
                    <div className="absolute right-3 top-8 h-12 w-20 rounded bg-white/15 sm:h-16 sm:w-28" />
                  </div>
                </div>
              </motion.div>
              {/* clavier / base */}
              <div className="mx-auto h-3 w-[290px] sm:w-[360px] rounded-b-2xl bg-gradient-to-b from-[#3a4256] to-[#1a1f2c] shadow-[0_20px_40px_rgba(0,0,0,0.6)]" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* La carte Mahu, cotee a ses vraies dimensions (format carte bancaire ISO 7810 ID-1) */}
      <AnimatePresence>{isCard && <MeasuredCard key="card" />}</AnimatePresence>
    </div>
  )
}

// Carte de face avec ses cotes (longueur, hauteur), puis basculee sur la
// tranche pour montrer l'epaisseur.
function MeasuredCard() {
  const [step, setStep] = useState(0)
  const [big, setBig] = useState(true)

  useEffect(() => {
    setBig(window.innerWidth >= 640)
    const timers = [setTimeout(() => setStep(1), 700), setTimeout(() => setStep(2), 3000)]
    return () => timers.forEach(clearTimeout)
  }, [])

  const W = big ? 320 : 250
  const H = Math.round(W / 1.586)
  const edge = step === 2

  return (
    <motion.div
      className="absolute left-1/2 top-1/2"
      style={{ width: W, height: H, marginLeft: -W / 2, marginTop: -H / 2 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
    >
      <motion.div
        className="h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        initial={{ scaleY: 0.08 }}
        animate={edge ? { scaleY: 1, rotateX: 78, rotateZ: -10, y: 10 } : { scaleY: 1, rotateX: 0, rotateZ: 0, y: 0 }}
        transition={{ duration: edge ? 1.1 : 0.7, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <div className="relative h-full w-full rounded-[18px] bg-gradient-to-br from-[#1b2233] via-[#0b0f18] to-[#141c2e] shadow-[0_0_0_1px_rgba(255,255,255,0.14),0_50px_90px_rgba(0,0,0,0.85),0_0_80px_rgba(0,122,255,0.35)]">
          <span className="absolute left-[9%] top-[15%] text-xl font-black tracking-[0.08em] text-white sm:text-2xl">MAHU</span>
          <span className="absolute bottom-[17%] left-[9%] h-8 w-11 rounded-md bg-gradient-to-br from-[#2b3550] to-[#161d2e]" />
          <span className="absolute inset-0 overflow-hidden rounded-[18px]">
            <motion.span
              className="absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,0.16)_48%,transparent_60%)]"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1.6, delay: 0.4, ease: "easeInOut" }}
            />
          </span>
          {/* tranche lumineuse */}
          <span
            className="absolute -bottom-[3px] left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#5ac8fa] to-transparent shadow-[0_0_18px_4px_rgba(90,200,250,0.8)]"
            style={{ transform: "rotateX(-90deg)", transformOrigin: "top" }}
          />
        </div>
      </motion.div>

      {/* cotes : longueur (dessous) et hauteur (a droite) */}
      <AnimatePresence>
        {step === 1 && (
          <>
            <motion.div
              key="len"
              className="absolute left-0 right-0 flex flex-col items-center"
              style={{ top: H + 18 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="relative h-px w-full bg-[#5ac8fa]"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <span className="absolute -left-px -top-1.5 h-3 w-px bg-[#5ac8fa]" />
                <span className="absolute -right-px -top-1.5 h-3 w-px bg-[#5ac8fa]" />
              </motion.div>
              <motion.span
                className="mt-2 text-sm font-bold text-[#8fd3ff]"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                85,6 mm
              </motion.span>
            </motion.div>
            <motion.div
              key="height"
              className="absolute top-0 bottom-0 flex items-center gap-2"
              style={{ left: W + 16 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="relative h-full w-px bg-[#5ac8fa]"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              >
                <span className="absolute -left-1.5 -top-px h-px w-3 bg-[#5ac8fa]" />
                <span className="absolute -bottom-px -left-1.5 h-px w-3 bg-[#5ac8fa]" />
              </motion.div>
              <motion.span
                className="whitespace-nowrap text-sm font-bold text-[#8fd3ff]"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 }}
              >
                54 mm
              </motion.span>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* epaisseur, une fois la carte sur la tranche */}
      <AnimatePresence>
        {edge && (
          <motion.div
            key="thick"
            className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center"
            style={{ top: H / 2 + 40 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            <span className="h-8 w-px bg-gradient-to-b from-[#5ac8fa] to-transparent" />
            <span className="mt-1 text-3xl font-black text-white sm:text-4xl">0,76 mm</span>
            <span className="whitespace-nowrap text-sm text-white/60">d&apos;épaisseur. Tout l&apos;ordinateur.</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function ComputerHero() {
  const [w, setW] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setW((i) => (i + 1) % WORDS.length), 2600)
    return () => clearInterval(t)
  }, [])

  return (
    <section className="relative overflow-hidden bg-[#05070d] pt-28 pb-20 text-white lg:min-h-screen lg:pt-24 lg:flex lg:items-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,rgba(0,122,255,0.18),transparent_55%)]" />
      <div className="container relative mx-auto px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 text-center lg:order-1 lg:text-left">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 rounded-full border border-[#5ac8fa]/30 bg-[#5ac8fa]/10 px-4 py-1.5 text-sm font-semibold text-[#8fd3ff]"
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#5ac8fa]" />
              Précommande ouverte
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="mt-6 text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl xl:text-7xl"
            >
              L&apos;ordinateur
              <br />
              le plus{" "}
              <span className="relative inline-block min-w-[3ch] align-bottom">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={WORDS[w]}
                    initial={{ y: "60%", opacity: 0, filter: "blur(6px)" }}
                    animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
                    exit={{ y: "-60%", opacity: 0, filter: "blur(6px)" }}
                    transition={{ duration: 0.45 }}
                    className="inline-block bg-gradient-to-r from-white to-[#5ac8fa] bg-clip-text text-transparent"
                  >
                    {WORDS[w]}
                  </motion.span>
                </AnimatePresence>
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="mx-auto mt-6 max-w-xl text-lg text-white/70 lg:mx-0"
            >
              Une carte Mahu. Ton ordinateur complet, sur n&apos;importe quel écran : au bureau, en cours, en voyage.
              Rien à porter, rien à recharger.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.45 }}
              className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start"
            >
              {[
                { icon: Feather, t: "Le plus léger" },
                { icon: Globe2, t: "Travaille partout" },
                { icon: Briefcase, t: "Le plus simple à transporter" },
              ].map(({ icon: Icon, t }) => (
                <span key={t} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-sm text-white/80">
                  <Icon className="h-4 w-4 text-[#5ac8fa]" />
                  {t}
                </span>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.6 }}
              className="mt-9 flex flex-col items-center gap-4 sm:flex-row lg:items-center"
            >
              <Link
                href="/register?product=ordinateur-essentiel"
                className="group inline-flex items-center gap-2 rounded-full bg-[#007AFF] px-8 py-4 text-lg font-bold shadow-[0_10px_40px_rgba(0,122,255,0.45)] transition hover:bg-[#0a84ff]"
              >
                Précommander
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <a href="#ordinateurs" className="text-white/70 underline-offset-4 hover:text-white hover:underline">
                Voir les 3 modèles
              </a>
            </motion.div>
            <p className="mt-4 text-white/50">
              À partir de <b className="text-white">200 000 FCFA</b> / an
            </p>
          </div>

          <div className="order-1 lg:order-2">
            <LaptopToCard />
          </div>
        </div>
      </div>
    </section>
  )
}

const MODELS = [
  { slug: "ordinateur-essentiel", name: "Essentiel", price: "200 000", cpu: "4 cœurs", ram: "8 Go", disk: "100 Go", for: "Études, bureautique, web" },
  { slug: "ordinateur-pro", name: "Pro", price: "300 000", cpu: "6 cœurs", ram: "16 Go", disk: "250 Go", for: "Travail exigeant, multitâche" },
  { slug: "ordinateur-max", name: "Max", price: "500 000", cpu: "8 cœurs", ram: "32 Go", disk: "500 Go", for: "Professionnels, gros projets" },
]

export function ComputerModels() {
  return (
    <section id="ordinateurs" className="relative bg-[#05070d] py-20 text-white">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h2 className="text-3xl font-black tracking-tight sm:text-5xl">Choisis ton ordinateur</h2>
          <p className="mt-3 text-white/60">Précommande. Places limitées pour le lancement.</p>
        </motion.div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3">
          {MODELS.map((m, i) => (
            <motion.div
              key={m.slug}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              whileHover={{ y: -6 }}
              className={`flex flex-col rounded-3xl border p-6 ${
                i === 1 ? "border-[#007AFF] bg-[#007AFF]/10 shadow-[0_0_60px_rgba(0,122,255,0.25)]" : "border-white/10 bg-white/[0.04]"
              }`}
            >
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5ac8fa]">{m.name}</p>
              <p className="mt-3 text-4xl font-black">
                {m.price}
                <span className="text-base font-semibold text-white/50"> FCFA / an</span>
              </p>
              <p className="mt-2 text-sm text-white/60">{m.for}</p>
              <ul className="mt-6 space-y-2 text-white/85">
                <li>Processeur {m.cpu}</li>
                <li>{m.ram} de mémoire</li>
                <li>{m.disk} de stockage</li>
                <li>Sur n&apos;importe quel écran</li>
              </ul>
              <Link
                href={`/register?product=${m.slug}`}
                className={`mt-8 inline-flex justify-center rounded-full px-6 py-3 font-bold transition ${
                  i === 1 ? "bg-[#007AFF] hover:bg-[#0a84ff]" : "bg-white/10 hover:bg-white/20"
                }`}
              >
                Précommander
              </Link>
            </motion.div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-white/40">
          Fonctionne avec une connexion internet (4G ou wifi). <Link href="/ordinateur" className="underline hover:text-white">En savoir plus</Link>
        </p>
      </div>
    </section>
  )
}
