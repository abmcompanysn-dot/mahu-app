import type { MetadataRoute } from "next"
import { headers } from "next/headers"

// Genere a chaque requete a partir du domaine appele, pour rester correct si
// le site change de domaine (ai.mahu.cards, call.mahu.cards...).
export const dynamic = "force-dynamic"

const AI_BOTS = [
  "GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "Claude-Web", "Claude-User", "Claude-SearchBot", "anthropic-ai",
  "CCBot", "Google-Extended", "Applebot-Extended", "PerplexityBot", "Perplexity-User", "Bytespider", "Amazonbot",
  "meta-externalagent", "meta-externalfetcher", "FacebookBot", "Diffbot", "cohere-ai", "cohere-training-data-crawler",
  "YouBot", "Timpibot", "ImagesiftBot", "omgili", "Google-CloudVertexBot", "AI2Bot", "PanguBot", "DuckAssistBot",
  "MistralAI-User", "Webzio-Extended", "img2dataset",
]

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host") || "ai.mahu.cards"
  const origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`

  return {
    rules: [
      // Aucun robot d'IA (entrainement ou reponses) n'est autorise.
      { userAgent: AI_BOTS, disallow: "/" },
      {
      userAgent: "*",
      allow: ["/", "/p/"],
      disallow: ["/admin", "/dashboard", "/api/", "/onboarding", "/ai", "/c/", "/pc/", "/register/paiement", "/reset-password", "/dev-login", "/enterprise-portal"],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  }
}
