import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/dashboard",
    name: "Mahu - Smart Card",
    short_name: "Mahu",
    description:
      "Votre carte de visite NFC : partagez votre profil en un tap, recevez et triez vos contacts, suivez vos statistiques.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    lang: "fr",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Mes contacts", url: "/dashboard/contacts", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Modifier ma carte", url: "/dashboard/profile", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  }
}
