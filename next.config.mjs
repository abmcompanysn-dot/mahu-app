import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare"

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig

// Donne acces aux bindings Cloudflare (wrangler.jsonc) pendant `next dev` -
// sans effet sur le build/deploiement Workers lui-meme, voir
// https://opennext.js.org/cloudflare/get-started
initOpenNextCloudflareForDev()
