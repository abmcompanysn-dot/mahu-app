import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata = {
  title: "Livraison - Mahu",
  description: "Délais, zones et frais de livraison pour vos cartes Mahu.",
}

const zones = [
  { icon: "🏙️", zone: "Dakar", delai: "24 – 48h", detail: "Livraison express en ville, du lundi au samedi." },
  { icon: "🗺️", zone: "Intérieur du Sénégal", delai: "3 – 5 jours", detail: "Livraison sur tout le territoire national via transporteur partenaire." },
  { icon: "🌍", zone: "Afrique de l'Ouest", delai: "3 – 7 jours", detail: "Livraison disponible. Frais calculés selon le poids et la destination." },
  { icon: "✈️", zone: "International", delai: "Sur devis", detail: "Contactez-nous pour une livraison hors Afrique de l'Ouest." },
]

export default function LivraisonPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l&apos;accueil
        </Link>

        <h1 className="text-3xl font-bold mb-2">Livraison</h1>
        <p className="text-sm text-muted-foreground mb-12">
          Délais, zones et frais de livraison pour vos cartes Mahu.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {zones.map((z) => (
            <div
              key={z.zone}
              className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/30"
            >
              <div className="text-2xl mb-3">{z.icon}</div>
              <h3 className="font-semibold mb-1">{z.zone}</h3>
              <div className="text-lg font-extrabold text-primary mb-1.5">{z.delai}</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{z.detail}</p>
            </div>
          ))}
        </div>

        <div className="prose prose-invert prose-sm max-w-none prose-headings:font-semibold prose-headings:mt-10 prose-headings:mb-3 prose-p:text-muted-foreground prose-p:leading-relaxed">
          <h2>Frais de livraison</h2>
          <p>
            Les frais de livraison sont calculés au moment de la commande en fonction de votre localisation
            et du poids total de la commande. Un récapitulatif précis vous sera présenté avant confirmation
            du paiement.
          </p>

          <h2>Suivi de commande</h2>
          <p>
            Un email de confirmation avec numéro de suivi vous sera envoyé dès l&apos;expédition de votre
            commande. Vous pouvez également suivre votre colis depuis votre espace client Mahu.
          </p>

          <h2>Questions</h2>
          <p>
            Pour toute question sur la livraison, contactez-nous par email à{" "}
            <a href="mailto:contact@mahu.cards">contact@mahu.cards</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
