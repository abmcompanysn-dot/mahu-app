import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata = {
  title: "Politique de confidentialité - Mahu",
  description: "Comment Mahu collecte, utilise et protège vos données personnelles.",
}

export default function ConfidentialitePage() {
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

        <h1 className="text-3xl font-bold mb-2">Politique de confidentialité</h1>
        <p className="text-sm text-muted-foreground mb-12">Dernière mise à jour : 31 juillet 2026</p>

        <div className="prose prose-invert prose-sm max-w-none prose-headings:font-semibold prose-headings:mt-10 prose-headings:mb-3 prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground prose-strong:text-foreground">
          <p>
            Mahu Digital System (« Mahu », « nous ») édite l&apos;application Mahu, une carte de visite
            numérique NFC avec gestion de contacts et fonctionnalités d&apos;intelligence artificielle.
            Cette page explique quelles données nous collectons, pourquoi, et comment vous pouvez les
            contrôler.
          </p>
          <p>
            <strong>Éditeur :</strong> Mahu Digital System — Médina Rue 13 Angle 12, Dakar, Sénégal —
            NINEA 012834182 — RCCM SN.DKR.2026.A.6465.
          </p>

          <h2>1. Données que nous collectons</h2>
          <h3>1.1 Compte et profil</h3>
          <ul>
            <li>Email et mot de passe (le mot de passe est stocké sous forme hachée, jamais en clair).</li>
            <li>Informations de profil que vous renseignez : nom, poste, entreprise, téléphone, localisation, photo, image de couverture, liens sociaux.</li>
            <li>Si vous vous connectez via Google ou Facebook : votre nom, email et photo tels que fournis par ces services.</li>
          </ul>

          <h3>1.2 Reconnaissance faciale (carte IA biométrique, optionnelle)</h3>
          <p>
            Si vous activez la connexion par reconnaissance faciale sur votre carte physique, votre visage
            est analysé <strong>directement dans votre navigateur</strong> : seul un descripteur mathématique
            (128 nombres, non réversible en image) quitte votre appareil et est stocké de façon chiffrée.
            Aucune photo ou vidéo de votre visage n&apos;est jamais envoyée à nos serveurs. Vous pouvez
            désactiver cette fonctionnalité à tout moment depuis votre tableau de bord.
          </p>

          <h3>1.3 Paiements</h3>
          <p>
            Les paiements d&apos;abonnement sont traités par nos prestataires PayDunya et PawaPay. Nous ne
            recevons et ne stockons jamais vos numéros de carte bancaire ou identifiants mobile money — nous
            recevons uniquement une confirmation de paiement et son montant.
          </p>

          <h3>1.4 Connecteurs tiers (Gmail, Facebook, Instagram, YouTube, TikTok, LinkedIn)</h3>
          <p>
            Si vous choisissez de connecter un compte tiers depuis votre tableau de bord, nous stockons un
            jeton d&apos;accès (OAuth) chiffré, limité aux actions que vous avez explicitement autorisées
            (par exemple : envoyer un email depuis votre Gmail, publier une vidéo sur votre Page Facebook).
            Nous n&apos;accédons jamais à vos autres données sur ces plateformes. Vous pouvez déconnecter
            n&apos;importe quel connecteur à tout moment, ce qui supprime immédiatement le jeton associé.
          </p>

          <h3>1.5 Données d&apos;usage</h3>
          <ul>
            <li>Statistiques de vues de votre carte (source : NFC, QR code, lien direct).</li>
            <li>Coordonnées des prospects qui vous contactent via votre carte publique.</li>
            <li>Journaux techniques (adresse IP, type de navigateur) à des fins de sécurité et de débogage.</li>
          </ul>

          <h3>1.6 Mode IA</h3>
          <p>
            Si vous utilisez le mode IA, le contenu de vos messages (texte, images, vidéos que vous
            fournissez) est transmis au fournisseur de modèle que vous sélectionnez (Groq, OpenAI, Anthropic
            ou Alibaba Cloud selon le modèle choisi) pour générer une réponse. Ce contenu n&apos;est pas
            utilisé par Mahu à d&apos;autres fins.
          </p>

          <h2>2. Pourquoi nous utilisons ces données</h2>
          <ul>
            <li>Fournir et maintenir votre carte de visite numérique et votre tableau de bord.</li>
            <li>Vous authentifier et sécuriser votre compte.</li>
            <li>Traiter vos abonnements et paiements.</li>
            <li>Vous envoyer les emails nécessaires au service (bienvenue, réinitialisation de mot de passe, notification de prospect).</li>
            <li>Exécuter les actions que vous demandez via un connecteur tiers.</li>
            <li>Améliorer le produit et assurer sa sécurité.</li>
          </ul>

          <h2>3. Avec qui nous partageons des données</h2>
          <p>Nous ne vendons jamais vos données. Elles sont partagées uniquement avec :</p>
          <ul>
            <li><strong>Hébergement et infrastructure :</strong> MongoDB, Redis, Cloudinary (stockage d&apos;images/vidéos), Firebase (authentification).</li>
            <li><strong>Paiement :</strong> PayDunya, PawaPay.</li>
            <li><strong>Intelligence artificielle :</strong> Groq, OpenAI, Anthropic, Alibaba Cloud — uniquement si vous utilisez le mode IA.</li>
            <li><strong>Connecteurs que vous activez :</strong> Google, Meta (Facebook/Instagram), TikTok, LinkedIn — uniquement pour les actions que vous demandez explicitement.</li>
            <li>Les autorités compétentes, si la loi l&apos;exige.</li>
          </ul>

          <h2>4. Conservation des données</h2>
          <p>
            Vos données sont conservées tant que votre compte est actif. Si vous supprimez votre compte,
            vos données personnelles sont supprimées sous un délai raisonnable, sauf obligation légale de
            conservation (facturation, par exemple).
          </p>

          <h2>5. Vos droits</h2>
          <p>Conformément à la loi sénégalaise n° 2008-12 du 25 janvier 2008 sur la protection des données à caractère personnel, vous disposez d&apos;un droit d&apos;accès, de rectification, de suppression et d&apos;opposition sur vos données. Vous pouvez exercer ces droits :</p>
          <ul>
            <li>Directement depuis votre tableau de bord (modification du profil, déconnexion des connecteurs, suppression de compte).</li>
            <li>En nous contactant à l&apos;adresse indiquée ci-dessous.</li>
          </ul>
          <p>
            Vous pouvez également introduire une réclamation auprès de la Commission de protection des
            données personnelles du Sénégal (CDP).
          </p>

          <h2>6. Sécurité</h2>
          <p>
            Les mots de passe sont hachés, les communications chiffrées (HTTPS), et l&apos;accès aux
            données sensibles (jetons de connecteurs, descripteurs biométriques) est restreint et chiffré.
            Aucun système n&apos;étant infaillible, nous vous encourageons à utiliser un mot de passe fort
            et unique.
          </p>

          <h2>7. Modifications</h2>
          <p>
            Nous pouvons mettre à jour cette politique. Toute modification substantielle vous sera
            communiquée par email ou notification dans l&apos;application.
          </p>

          <h2>8. Contact</h2>
          <p>
            Pour toute question relative à vos données personnelles :{" "}
            <a href="mailto:contact@mahu.cards">contact@mahu.cards</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
