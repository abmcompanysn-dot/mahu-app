"use client"

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, FileText, Gift, GraduationCap, Nfc } from "lucide-react"
import { callAppScript } from "@/lib/api"
import { PORTFOLIO_PRICE, PORTFOLIO_TEMPLATES } from "@/lib/portfolio"

// Section "Etudiants" de la page d'accueil : renvoie vers /etudiants.
// Le telephone fait defiler les captures des vrais modeles de portfolio.

const EASE = [0.22, 1, 0.36, 1] as const

export function StudentsTeaser() {
  const [i, setI] = useState(0)
  const [left, setLeft] = useState<number | null>(null)

  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % PORTFOLIO_TEMPLATES.length), 4200)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    callAppScript("getPortfolioOffer", {}).then((r) => {
      const n = (r as unknown as { freeCardsLeft?: number }).freeCardsLeft
      if (typeof n === "number") setLeft(n)
    })
  }, [])

  const tpl = PORTFOLIO_TEMPLATES[i]

  return (
    <section id="etudiants" className="relative overflow-hidden bg-[#07090f] py-20 text-white sm:py-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_75%_40%,rgba(212,175,55,0.18),transparent_55%)]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: EASE }}
        >
          <p className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/40 bg-[#d4af37]/10 px-4 py-1.5 text-sm font-semibold text-[#e9cf7a]">
            <GraduationCap className="h-4 w-4" /> Nouveau · Offre étudiants
          </p>
          <h2 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
            Ton portfolio et ton CV en ligne.
            <br />
            <span className="bg-gradient-to-r from-[#f6e3a1] via-[#d4af37] to-[#b8901f] bg-clip-text text-transparent">Ta Smart Card offerte.</span>
          </h2>
          <p className="mt-5 max-w-xl text-lg text-white/70">
            Une vraie page à ton nom pour montrer tes projets et les vidéos de tes réalisations aux recruteurs. 5 modèles, valable 1 an.
          </p>

          <ul className="mt-7 space-y-3">
            <li className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10"><FileText className="h-4 w-4" /></span>
              <span><b>Portfolio + CV en ligne</b> · {PORTFOLIO_PRICE} pour 1 an</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d4af37]/20 text-[#d4af37]"><Nfc className="h-4 w-4" /></span>
              <span><b>Smart Card V2 avec puce NFC</b> · offerte aux 100 premiers</span>
            </li>
          </ul>

          {left !== null && left > 0 && (
            <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#d4af37]/15 px-4 py-2 text-sm font-semibold text-[#f1d77e]">
              <Gift className="h-4 w-4" /> Plus que {left} Smart Card{left > 1 ? "s" : ""} offerte{left > 1 ? "s" : ""} sur 100
            </p>
          )}

          <div className="mt-8">
            <Link
              href="/etudiants"
              className="inline-flex items-center gap-2 rounded-full bg-[#d4af37] px-7 py-4 text-lg font-bold text-black transition-transform hover:scale-[1.03]"
            >
              Découvrir l&apos;offre étudiants <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50, rotate: 4 }}
          whileInView={{ opacity: 1, y: 0, rotate: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1, ease: EASE }}
          className="relative mx-auto"
        >
          <div className="absolute inset-0 -z-10 scale-110 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.3),transparent_65%)] blur-2xl" />
          <Link href={`/portfolio/modeles/${tpl.id}`} aria-label={`Voir le modèle ${tpl.name}`} className="block">
            <div className="rounded-[2.6rem] bg-gradient-to-b from-[#2a2f3a] to-[#0d1017] p-[10px] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]">
              <div className="relative h-[480px] w-[236px] overflow-hidden rounded-[2rem] bg-black sm:h-[540px] sm:w-[266px]">
                <AnimatePresence initial={false}>
                  <motion.img
                    key={tpl.id}
                    src={`/portfolio/shots/${tpl.id}.webp`}
                    alt=""
                    initial={{ opacity: 0, y: 0 }}
                    animate={{ opacity: 1, y: "-35%" }}
                    exit={{ opacity: 0 }}
                    transition={{ opacity: { duration: 0.6 }, y: { duration: 4.2, ease: "easeInOut" } }}
                    className="absolute inset-x-0 top-0 w-full"
                  />
                </AnimatePresence>
                <div className="pointer-events-none absolute left-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
              </div>
            </div>
          </Link>
          <p className="mt-4 text-center text-sm text-white/60">
            Modèle <b className="text-white">{tpl.name}</b> · {tpl.tagline}
          </p>
        </motion.div>
      </div>
    </section>
  )
}
