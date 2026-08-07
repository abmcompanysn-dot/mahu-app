import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata = {
  title: "Documentation - Mahu",
  description: "Guide complet, etape par etape, pour utiliser toutes les fonctionnalites de Mahu.",
}

const SECTIONS = [
  { id: "carte", label: "Votre carte de visite numerique" },
  { id: "tableau-de-bord", label: "Tableau de bord" },
  { id: "mode-ia", label: "Mode IA (AI MAHU)" },
  { id: "connecteurs", label: "Connecteurs & publication" },
  { id: "biometrie", label: "Carte biometrique (visage)" },
  { id: "abonnement", label: "Abonnement & paiement" },
  { id: "app", label: "Installer l'application" },
  { id: "aide", label: "Besoin d'aide ?" },
]

export default function DocumentationPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour a l&apos;accueil
        </Link>

        <h1 className="text-3xl font-bold mb-2">Documentation</h1>
        <p className="text-muted-foreground mb-12 max-w-2xl">
          Le guide complet, etape par etape, pour tirer le meilleur parti de votre carte de visite
          numerique, du tableau de bord et du mode IA.
        </p>

        <div className="grid lg:grid-cols-[220px_1fr] gap-10">
          {/* Sommaire - colonne collante sur desktop */}
          <nav className="lg:sticky lg:top-10 lg:self-start">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Sommaire
            </p>
            <ul className="space-y-2 text-sm">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="text-muted-foreground hover:text-foreground transition-colors">
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contenu */}
          <div className="space-y-16 min-w-0">
            <section id="carte" className="scroll-mt-20">
              <h2 className="text-xl font-semibold mb-4">1. Votre carte de visite numerique</h2>
              <div className="space-y-3 text-muted-foreground leading-relaxed">
                <p>
                  <strong className="text-foreground">Etape 1 - Creer votre compte.</strong> Inscrivez-vous
                  sur la page d&apos;inscription avec votre email, ou via Google/Facebook. Completez ensuite
                  votre profil (nom, poste, entreprise, photo, telephone, liens sociaux) depuis
                  l&apos;onboarding ou votre tableau de bord.
                </p>
                <p>
                  <strong className="text-foreground">Etape 2 - Partager votre carte.</strong> Chaque profil
                  dispose d&apos;un lien public (<code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded">ai.mahu.cards/p/votre-identifiant</code>).
                  Partagez-le directement, via QR code, ou en approchant votre carte physique NFC d&apos;un
                  telephone compatible (aucune application requise du cote de la personne qui scanne).
                </p>
                <p>
                  <strong className="text-foreground">Etape 3 - Recevoir des contacts.</strong> Les personnes
                  qui consultent votre carte peuvent vous laisser leurs coordonnees directement depuis la
                  page publique - elles apparaissent automatiquement dans vos <em>Contacts</em>.
                </p>
              </div>
            </section>

            <section id="tableau-de-bord" className="scroll-mt-20">
              <h2 className="text-xl font-semibold mb-4">2. Tableau de bord</h2>
              <div className="space-y-3 text-muted-foreground leading-relaxed">
                <p>
                  <strong className="text-foreground">Profil</strong> - modifiez vos informations, photo,
                  image de couverture et liens sociaux a tout moment ; les changements sont visibles
                  immediatement sur votre carte publique.
                </p>
                <p>
                  <strong className="text-foreground">Contacts</strong> - retrouvez toutes les personnes qui
                  vous ont contacte via votre carte, et envoyez-leur un email directement (voir le
                  connecteur Gmail ci-dessous).
                </p>
                <p>
                  <strong className="text-foreground">Entreprise</strong> - si vous gerez plusieurs cartes
                  pour une equipe, gerez-les depuis l&apos;espace entreprise.
                </p>
                <p>
                  <strong className="text-foreground">Abonnement</strong> - suivez votre plan actuel, vos
                  credits IA restants, et mettez a niveau votre abonnement.
                </p>
              </div>
            </section>

            <section id="mode-ia" className="scroll-mt-20">
              <h2 className="text-xl font-semibold mb-4">3. Mode IA (AI MAHU)</h2>
              <div className="space-y-3 text-muted-foreground leading-relaxed">
                <p>
                  Accessible depuis <em>AI MAHU</em> dans le tableau de bord. Chaque action consomme des
                  credits (visibles en haut de l&apos;interface) selon votre plan.
                </p>
                <p>
                  <strong className="text-foreground">Discuter</strong> - choisissez un modele (plusieurs
                  disponibles selon votre plan) et ecrivez votre message. Vous pouvez joindre une image aux
                  modeles qui la lisent, dicter votre message a la voix, et faire lire les reponses a voix
                  haute.
                </p>
                <p>
                  <strong className="text-foreground">Generer une image</strong> - cliquez sur l&apos;icone
                  image dans le composer, decrivez l&apos;image souhaitee, puis choisissez le fournisseur
                  (Qwen ou ChatGPT).
                </p>
                <p>
                  <strong className="text-foreground">Modifier une image</strong> - cliquez sur l&apos;icone
                  edition, joignez une image existante, puis decrivez la modification a apporter.
                </p>
                <p>
                  <strong className="text-foreground">Generer une video</strong> - cliquez sur l&apos;icone
                  video, decrivez la scene (100 credits, jusqu&apos;a 15 secondes). Une fois la video prete,
                  vous pouvez ajouter une voix off en tapant un texte : il est converti en parole et
                  fusionne automatiquement sur la video (5 credits).
                </p>
              </div>
            </section>

            <section id="connecteurs" className="scroll-mt-20">
              <h2 className="text-xl font-semibold mb-4">4. Connecteurs & publication</h2>
              <div className="space-y-3 text-muted-foreground leading-relaxed">
                <p>
                  Depuis <em>Parametres</em>, connectez vos propres comptes Gmail, Facebook (avec Instagram
                  lie automatiquement), YouTube, TikTok ou LinkedIn. Mahu ne peut agir sur ces comptes que
                  pour les actions que vous demandez explicitement, et vous pouvez deconnecter un
                  connecteur a tout moment.
                </p>
                <p>
                  <strong className="text-foreground">Publier une video partout en une fois</strong> -
                  toujours depuis Parametres, deposez une video, choisissez les reseaux connectes sur
                  lesquels la publier, et lancez la publication simultanee.
                </p>
              </div>
            </section>

            <section id="biometrie" className="scroll-mt-20">
              <h2 className="text-xl font-semibold mb-4">5. Carte biometrique (reconnaissance faciale)</h2>
              <div className="space-y-3 text-muted-foreground leading-relaxed">
                <p>
                  Fonctionnalite optionnelle : elle permet d&apos;activer votre carte physique par
                  reconnaissance faciale plutot que par simple approche NFC. L&apos;analyse du visage se
                  fait directement dans votre navigateur - aucune photo n&apos;est envoyee a nos serveurs,
                  seul un identifiant mathematique chiffre l&apos;est. Voir notre{" "}
                  <Link href="/confidentialite" className="text-primary hover:underline">
                    politique de confidentialite
                  </Link>{" "}
                  pour le detail.
                </p>
              </div>
            </section>

            <section id="abonnement" className="scroll-mt-20">
              <h2 className="text-xl font-semibold mb-4">6. Abonnement & paiement</h2>
              <div className="space-y-3 text-muted-foreground leading-relaxed">
                <p>
                  Depuis <em>Abonnement</em>, choisissez votre plan et payez avec PayDunya ou PawaPay
                  (Orange Money, Wave, Free Money et autres operateurs mobile money selon votre pays). Votre
                  solde de credits IA est mis a jour automatiquement des la confirmation du paiement.
                </p>
              </div>
            </section>

            <section id="app" className="scroll-mt-20">
              <h2 className="text-xl font-semibold mb-4">7. Installer l&apos;application</h2>
              <div className="space-y-3 text-muted-foreground leading-relaxed">
                <p>
                  Mahu peut s&apos;installer comme une application native depuis votre navigateur : sur
                  mobile, utilisez &laquo; Ajouter a l&apos;ecran d&apos;accueil &raquo; ; sur ordinateur,
                  cliquez sur l&apos;icone d&apos;installation dans la barre d&apos;adresse. L&apos;app
                  fonctionne ensuite hors-ligne pour les pages deja consultees.
                </p>
              </div>
            </section>

            <section id="aide" className="scroll-mt-20">
              <h2 className="text-xl font-semibold mb-4">8. Besoin d&apos;aide ?</h2>
              <p className="text-muted-foreground leading-relaxed">
                Ecrivez-nous a{" "}
                <a href="mailto:contact@mahu.cards" className="text-primary hover:underline">
                  contact@mahu.cards
                </a>{" "}
                ou utilisez le formulaire de support depuis votre tableau de bord.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
