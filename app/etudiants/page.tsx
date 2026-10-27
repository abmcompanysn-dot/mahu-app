import { StudentsLanding } from "@/components/portfolio/students-landing"

// Offre etudiante : portfolio numerique + carte de visite professionnelle Mahu,
// valables un an, pour 3 500 FCFA (produit "portfolio-etudiant"). Au lancement,
// la carte imprimee est offerte aux 100 premiers inscrits (compteur backend).
export const metadata = {
  title: "Portfolio étudiant · Mahu",
  description:
    "Ton portfolio en ligne avec les vidéos de tes réalisations et ta carte de visite professionnelle Mahu, valables un an, pour 3 500 FCFA. Carte imprimée offerte aux 100 premiers inscrits.",
}

// Rendu a chaque visite : le compteur doit refleter les inscriptions.
export const dynamic = "force-dynamic"

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:4000"
const SERVICE_API_KEY = process.env.BACKEND_API_KEY || ""

async function freeCardsLeft(): Promise<number> {
  if (!SERVICE_API_KEY) return 0
  try {
    // POST : en GET, /api/legacy ne sert que getProfileData.
    const res = await fetch(new URL("/api/legacy", BACKEND_URL), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": SERVICE_API_KEY },
      body: JSON.stringify({ action: "getPortfolioOffer" }),
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    })
    const data = (await res.json()) as { freeCardsLeft?: number }
    return data.freeCardsLeft ?? 0
  } catch {
    return 0
  }
}

export default async function StudentsPage() {
  return <StudentsLanding freeCardsLeft={await freeCardsLeft()} />
}
