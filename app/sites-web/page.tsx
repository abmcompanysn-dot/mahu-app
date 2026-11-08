import type { Metadata } from "next"
import { SitesWebView } from "./sites-web-view"

export const metadata: Metadata = {
  title: "Création de site web clé en main · Canada et France | MAHU",
  description:
    "Votre site web professionnel avec nom de domaine, hébergement et adresse e-mail pro inclus. Deux forfaits, en ligne 7 jours après la prise de contact. Pour les entreprises au Canada et en France.",
  openGraph: {
    title: "Votre site web clé en main, domaine + hébergement + e-mail pro inclus",
    description: "Création de sites web pour les entreprises au Canada et en France, par l'équipe MAHU.",
  },
}

export default function SitesWebPage() {
  return <SitesWebView />
}
