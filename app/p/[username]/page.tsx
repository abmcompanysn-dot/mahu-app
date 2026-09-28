import { cache } from "react"
import type { Metadata } from "next"
import { PublicProfileView, type ProfileData } from "@/components/profile/public-profile-view"
import { optimizedImage } from "@/lib/image"

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:4000"
const SERVICE_API_KEY = process.env.BACKEND_API_KEY || ""

// Le profil est recupere ici, cote serveur, et envoye deja rempli dans le
// HTML : le visiteur voit la carte des l'arrivee de la page au lieu
// d'attendre le chargement du JS puis un second aller-retour vers l'API.
// cache() evite un double appel entre generateMetadata et la page.
const getProfile = cache(async (username: string): Promise<ProfileData | null> => {
  if (!SERVICE_API_KEY) return null
  try {
    const url = new URL("/api/legacy", BACKEND_URL)
    url.searchParams.set("action", "getProfileData")
    url.searchParams.set("user", username)
    const response = await fetch(url, {
      headers: { "x-api-key": SERVICE_API_KEY },
      cache: "no-store",
      // Au-dela, on laisse le navigateur charger le profil lui-meme.
      signal: AbortSignal.timeout(3000),
    })
    if (!response.ok) return null
    const data = (await response.json()) as ProfileData
    return data && !data.error ? data : null
  } catch {
    return null
  }
})

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params
  const profile = await getProfile(username)
  if (!profile) return { title: "Profil Mahu" }

  const title = profile.Nom_Complet || "Profil Mahu"
  const description = [profile.Profession, profile.Compagnie, profile.Location].filter(Boolean).join(" - ")
  const image = profile.URL_Photo ? optimizedImage(profile.URL_Photo, 600) : undefined
  return {
    title: `${title} | Mahu`,
    description: description || "Carte de visite numerique Mahu",
    openGraph: { title, description, type: "profile", images: image ? [image] : undefined },
  }
}

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const profile = await getProfile(username)
  return <PublicProfileView username={username} initialProfile={profile} />
}
