import { defineCloudflareConfig } from "@opennextjs/cloudflare"
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache"

// Cette app n'utilise aucune ISR (pas de generateStaticParams/revalidate/
// unstable_cache nulle part), donc ce cache R2 sert surtout au cache de
// build interne d'OpenNext lui-meme. Le bucket (voir wrangler.jsonc) a deja
// ete cree et peuple par le premier deploiement reussi - garde le meme
// override pour rester coherent avec ce qui tourne deja en prod.
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
})
