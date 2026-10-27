import { cache } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { MadeWithMahu, PortfolioRender } from "@/components/portfolio/templates"
import { toView, type Portfolio } from "@/lib/portfolio"

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:4000"
const SERVICE_API_KEY = process.env.BACKEND_API_KEY || ""

interface PublicPortfolio {
  portfolio?: Portfolio
  profile?: Record<string, string>
  profileUrl?: string
  error?: string
  expired?: boolean
}

// Portfolio public d'un etudiant, rendu cote serveur (meme principe que /p/[username]).
const getPortfolio = cache(async (username: string): Promise<PublicPortfolio> => {
  if (!SERVICE_API_KEY) return { error: "Service indisponible" }
  try {
    // POST : en GET, /api/legacy ne sert que getProfileData.
    const res = await fetch(new URL("/api/legacy", BACKEND_URL), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": SERVICE_API_KEY },
      body: JSON.stringify({ action: "getPortfolioPublic", user: username }),
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    })
    return (await res.json()) as PublicPortfolio
  } catch {
    return { error: "Service indisponible" }
  }
})

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params
  const data = await getPortfolio(username)
  const name = data.profile?.Nom_Complet
  if (!data.portfolio || !name) return { title: "Portfolio Mahu" }
  return {
    title: `${name} · Portfolio`,
    description: data.portfolio.headline || [data.portfolio.level, data.portfolio.field, data.portfolio.school].filter(Boolean).join(" · "),
    // Apercu du lien : la photo de l'etudiant, sinon l'image "Portfolio etudiant".
    openGraph: { title: `${name} · Portfolio`, images: [data.profile?.URL_Photo || "/og-portfolio.png"] },
    twitter: { card: "summary_large_image", images: [data.profile?.URL_Photo || "/og-portfolio.png"] },
  }
}

export default async function PortfolioPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const data = await getPortfolio(username)
  if (!data.portfolio) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#07090f] px-5 text-center text-white">
        <p className="text-xl font-bold">{data.expired ? "Ce portfolio a expiré." : "Portfolio introuvable."}</p>
        <Link href="/etudiants" className="rounded-full bg-white px-5 py-2.5 font-semibold text-black">Créer mon portfolio Mahu</Link>
      </div>
    )
  }
  return (
    <>
      <PortfolioRender view={toView(data.portfolio, data.profile, data.profileUrl || username)} />
      <MadeWithMahu />
    </>
  )
}
