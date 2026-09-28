import type { MetadataRoute } from "next"
import { headers } from "next/headers"

// Genere a chaque requete a partir du domaine appele, pour rester correct si
// le site change de domaine (ai.mahu.cards, call.mahu.cards...).
export const dynamic = "force-dynamic"

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host") || "ai.mahu.cards"
  const origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/p/"],
      disallow: ["/admin", "/dashboard", "/api/", "/onboarding", "/ai", "/c/", "/register/paiement", "/reset-password", "/dev-login", "/enterprise-portal"],
    },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  }
}
