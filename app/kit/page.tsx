import KitView from "@/components/kit/kit-view"

// Kit de communication : la publication du jour (image, texte, hashtags) a
// copier-coller. Donnees dans public/kit/plan.json, lues aussi par l'email
// quotidien du backend (handlers/kit_daily.go) qui renvoie ici avec ?jour=.
export const metadata = {
  title: "Kit de communication - Mahu",
  description: "La publication du jour, prete a copier-coller.",
  robots: { index: false, follow: false },
}

export default function KitPage() {
  return <KitView />
}
