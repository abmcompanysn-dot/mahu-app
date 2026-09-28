import { PUBLIC_PROFILE_HOST, PUBLIC_PROFILE_URL } from "@/lib/site"

// Adresse a afficher/partager pour un profil public : toujours l'adresse
// publique des profils (lib/site.ts), pas le domaine ou l'on edite.
export function useSiteOrigin() {
  return { origin: PUBLIC_PROFILE_URL, host: PUBLIC_PROFILE_HOST }
}
