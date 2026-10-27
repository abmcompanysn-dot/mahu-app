import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare"

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // En-tetes de securite sur toutes les pages. Pas de CSP complete (scripts
  // tiers : Firebase, PayDunya...) : seulement l'interdiction d'etre affiche
  // dans un cadre par un autre site que Mahu (anti clickjacking).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self' https://mahu.cards https://*.mahu.cards" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self), payment=(self)" },
        ],
      },
    ]
  },
}

export default nextConfig

// Donne acces aux bindings Cloudflare (wrangler.jsonc) pendant `next dev` -
// sans effet sur le build/deploiement Workers lui-meme, voir
// https://opennext.js.org/cloudflare/get-started
initOpenNextCloudflareForDev()
