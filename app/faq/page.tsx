import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export const metadata = {
  title: "FAQ - Mahu",
  description: "Toutes les réponses sur la carte de visite NFC Mahu : fonctionnement, compatibilité, livraison, modification du profil, perte de carte.",
}

const faqItems = [
  {
    question: "Comment fonctionne la carte Mahu ?",
    answer:
      "La carte Mahu utilise la technologie NFC (Near Field Communication). Il suffit de l'approcher d'un smartphone compatible pour partager instantanément votre profil numérique — coordonnées, réseaux sociaux, liens et plus encore.",
  },
  {
    question: "Ai-je besoin d'une application pour l'utiliser ?",
    answer:
      "Non, aucune application n'est nécessaire ni pour vous ni pour votre interlocuteur. Tout se fait directement via le navigateur web natif du téléphone.",
  },
  {
    question: "Puis-je modifier mes informations après la commande ?",
    answer:
      "Oui, c'est l'un des grands avantages de Mahu. Vous pouvez mettre à jour votre profil (numéro, titre, réseaux sociaux, photo…) à tout moment depuis votre tableau de bord. Les modifications sont instantanées sur votre carte.",
  },
  {
    question: "La carte est-elle compatible avec tous les smartphones ?",
    answer:
      "La carte NFC fonctionne avec tous les Android depuis la version 4.4, et sur iPhone depuis l'iPhone 7 (iOS 13+). Pour les appareils non compatibles NFC, un QR code est toujours disponible sur votre profil.",
  },
  {
    question: "Quel est le délai de livraison ?",
    answer: (
      <>
        La livraison standard est de 3 à 7 jours ouvrés selon votre localisation. Une option express 48h est
        disponible pour certaines zones. Consultez notre page{" "}
        <Link href="/livraison" className="text-primary hover:underline">
          Livraison
        </Link>{" "}
        pour plus de détails.
      </>
    ),
  },
  {
    question: "Que se passe-t-il si je perds ma carte ?",
    answer:
      "Votre profil numérique reste intact et accessible même sans carte physique (via votre lien ou QR code). Vous pouvez commander une carte de remplacement à tout moment depuis votre espace client.",
  },
  {
    question: "Comment contacter le support Mahu ?",
    answer: (
      <>
        Vous pouvez nous contacter par email à{" "}
        <a href="mailto:contact@mahu.cards" className="text-primary hover:underline">
          contact@mahu.cards
        </a>
        . Nous répondons sous 24h ouvrées.
      </>
    ),
  },
]

export default function FaqPage() {
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

        <h1 className="text-3xl font-bold mb-2">Foire aux questions</h1>
        <p className="text-sm text-muted-foreground mb-12">
          Tout ce que vous devez savoir sur les cartes Mahu, la technologie NFC et votre compte.
        </p>

        <Accordion type="single" collapsible className="w-full">
          {faqItems.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-base">{item.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="text-center mt-16 pt-10 border-t border-border">
          <p className="text-muted-foreground mb-4">Vous n&apos;avez pas trouvé votre réponse ?</p>
          <a
            href="mailto:contact@mahu.cards"
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-6 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Contacter le support
          </a>
        </div>
      </div>
    </div>
  )
}
