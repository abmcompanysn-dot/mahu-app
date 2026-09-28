import type { MetadataRoute } from "next"
import { headers } from "next/headers"

export const dynamic = "force-dynamic"

const PUBLIC_PAGES = ["", "/register", "/login", "/faq", "/livraison", "/documentation", "/conditions-utilisation", "/confidentialite"]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get("host") || "ai.mahu.cards"
  const origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`

  return PUBLIC_PAGES.map((path) => ({
    url: `${origin}${path}`,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.5,
  }))
}
