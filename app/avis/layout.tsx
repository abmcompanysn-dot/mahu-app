import { Suspense } from "react"

// Page d'avis client liee depuis les emails de l'admin (Emailing clients) :
// chaque lien est personnel, rien a indexer.
export const metadata = {
  title: "Votre avis - Mahu",
  robots: { index: false, follow: false },
}

export default function AvisLayout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>
}
