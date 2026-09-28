import { defineCloudflareConfig } from "@opennextjs/cloudflare"
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache"

// Cette app n'utilise aucune ISR (pas de generateStaticParams/revalidate/
// unstable_cache nulle part) : les pages prerendues sont servies directement
// depuis les assets statiques du Worker, au lieu d'une lecture R2 a chaque
// requete, et enableCacheInterception les renvoie sans demarrer Next.js.
// Si une page avec `revalidate` est ajoutee un jour, revenir au cache R2
// (r2-incremental-cache) : ce cache-ci est en lecture seule.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
})
