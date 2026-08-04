import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata = {
  title: "Conditions d'utilisation - Mahu",
  description: "Conditions générales d'utilisation du service Mahu.",
}

export default function ConditionsUtilisationPage() {
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

        <h1 className="text-3xl font-bold mb-2">Conditions d&apos;utilisation</h1>
        <p className="text-sm text-muted-foreground mb-12">Dernière mise à jour : 31 juillet 2026</p>

        <div className="prose prose-invert prose-sm max-w-none prose-headings:font-semibold prose-headings:mt-10 prose-headings:mb-3 prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground prose-strong:text-foreground">
          <p>
            Les présentes conditions régissent l&apos;utilisation du service Mahu (le « Service »), édité
            par Mahu Digital System — Médina Rue 13 Angle 12, Dakar, Sénégal — NINEA 012834182 — RCCM
            SN.DKR.2026.A.6465. En créant un compte ou en utilisant le Service, vous acceptez ces
            conditions.
          </p>

          <h2>1. Description du service</h2>
          <p>
            Mahu fournit une carte de visite numérique accessible par carte NFC, QR code ou lien, un
            tableau de bord de gestion de contacts et de prospects, des connecteurs optionnels vers des
            comptes tiers (Gmail, Facebook, Instagram, YouTube, TikTok, LinkedIn), et un mode assistant IA
            optionnel.
          </p>

          <h2>2. Compte utilisateur</h2>
          <ul>
            <li>Vous devez fournir des informations exactes lors de votre inscription.</li>
            <li>Vous êtes responsable de la confidentialité de votre mot de passe et de toute activité effectuée depuis votre compte.</li>
            <li>Vous devez avoir la capacité juridique de conclure un contrat pour utiliser le Service.</li>
          </ul>

          <h2>3. Abonnements et paiement</h2>
          <ul>
            <li>Le Service propose un plan gratuit et des plans payants (Premium, Pro) avec des fonctionnalités et quotas différents.</li>
            <li>Les paiements sont traités par nos prestataires PayDunya et PawaPay. En payant, vous acceptez également leurs propres conditions d&apos;utilisation.</li>
            <li>Les abonnements sont facturés à l&apos;avance pour la période choisie. Sauf erreur de facturation avérée, les paiements ne sont pas remboursables.</li>
            <li>Nous nous réservons le droit de modifier nos tarifs, avec préavis raisonnable pour les abonnements en cours.</li>
          </ul>

          <h2>4. Connecteurs tiers</h2>
          <p>
            En connectant un compte tiers (Gmail, Facebook, Instagram, YouTube, TikTok, LinkedIn), vous
            autorisez Mahu à effectuer, en votre nom et uniquement à votre demande explicite, les actions
            proposées par le Service (par exemple : envoyer un email, publier une vidéo). Vous restez seul
            responsable du contenu que vous choisissez de publier via ces connecteurs et devez respecter
            les conditions d&apos;utilisation propres à chaque plateforme tierce. Vous pouvez révoquer
            l&apos;accès à tout moment depuis votre tableau de bord.
          </p>

          <h2>5. Mode assistant IA</h2>
          <p>
            Les réponses générées par le mode IA sont produites par des modèles tiers et peuvent contenir
            des erreurs ou inexactitudes. Elles sont fournies à titre indicatif et ne constituent pas un
            conseil professionnel (juridique, médical, financier ou autre). Vous restez responsable de
            l&apos;usage que vous faites du contenu généré.
          </p>

          <h2>6. Contenu utilisateur</h2>
          <p>
            Vous conservez la propriété du contenu que vous téléversez (photos, vidéos, informations de
            profil). Vous nous accordez le droit de l&apos;héberger et de l&apos;afficher dans le cadre du
            fonctionnement du Service. Vous garantissez disposer des droits nécessaires sur tout contenu
            que vous publiez et vous engagez à ne pas téléverser de contenu illégal, diffamatoire ou
            portant atteinte aux droits d&apos;un tiers.
          </p>

          <h2>7. Carte physique et matériel NFC</h2>
          <p>
            Les cartes physiques fournies restent la propriété de l&apos;utilisateur après livraison. Mahu
            ne garantit pas la compatibilité NFC avec tous les appareils et n&apos;est pas responsable des
            dommages liés à un usage anormal de la carte.
          </p>

          <h2>8. Résiliation</h2>
          <p>
            Vous pouvez supprimer votre compte à tout moment depuis votre tableau de bord. Nous pouvons
            suspendre ou résilier un compte en cas de violation des présentes conditions, d&apos;usage
            frauduleux, ou de non-paiement.
          </p>

          <h2>9. Limitation de responsabilité</h2>
          <p>
            Le Service est fourni « en l&apos;état ». Dans la mesure permise par la loi, Mahu ne pourra
            être tenu responsable des dommages indirects résultant de l&apos;utilisation du Service,
            d&apos;une interruption de service, ou de contenus publiés par l&apos;utilisateur via les
            connecteurs tiers.
          </p>

          <h2>10. Droit applicable</h2>
          <p>
            Les présentes conditions sont régies par le droit sénégalais. Tout litige relève de la
            compétence exclusive des juridictions de Dakar, Sénégal.
          </p>

          <h2>11. Modifications</h2>
          <p>
            Nous pouvons modifier ces conditions. Toute modification substantielle vous sera communiquée
            par email ou notification dans l&apos;application. La poursuite de l&apos;utilisation du
            Service après modification vaut acceptation.
          </p>

          <h2>12. Contact</h2>
          <p>
            Pour toute question : <a href="mailto:contact@mahu.cards">contact@mahu.cards</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
