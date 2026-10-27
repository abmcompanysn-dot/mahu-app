import Link from "next/link"
import { notFound } from "next/navigation"
import { PortfolioRender } from "@/components/portfolio/templates"
import { PORTFOLIO_PRICE, PORTFOLIO_TEMPLATES, SAMPLE_PORTFOLIO, type PortfolioTemplate } from "@/lib/portfolio"

// Demonstration gratuite de chaque modele, avec un portfolio d'exemple.
export function generateStaticParams() {
  return PORTFOLIO_TEMPLATES.map((t) => ({ template: t.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ template: string }> }) {
  const { template } = await params
  const t = PORTFOLIO_TEMPLATES.find((x) => x.id === template)
  return { title: t ? `Modèle ${t.name} · Portfolio Mahu` : "Portfolio Mahu" }
}

export default async function TemplateDemoPage({ params }: { params: Promise<{ template: string }> }) {
  const { template } = await params
  const t = PORTFOLIO_TEMPLATES.find((x) => x.id === template)
  if (!t) notFound()
  return (
    <>
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-[#07090f] px-4 py-3 text-center text-sm text-white">
        <span>Exemple · modèle <b>{t.name}</b></span>
        <span className="hidden text-white/40 sm:inline">|</span>
        <span className="flex gap-1">
          {PORTFOLIO_TEMPLATES.map((x) => (
            <Link key={x.id} href={`/portfolio/modeles/${x.id}`} className={`rounded-full px-3 py-1 ${x.id === t.id ? "bg-white text-black" : "bg-white/10"}`}>{x.name}</Link>
          ))}
        </span>
        <Link href="/register?product=portfolio-etudiant" className="rounded-full bg-[#d4af37] px-4 py-1.5 font-bold text-black">Le mien pour {PORTFOLIO_PRICE}</Link>
      </div>
      <PortfolioRender view={{ ...SAMPLE_PORTFOLIO, template: t.id as PortfolioTemplate }} />
    </>
  )
}
