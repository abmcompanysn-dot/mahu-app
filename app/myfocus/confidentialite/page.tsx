import Link from "next/link"

// Politique de confidentialite de l'appli Android MyFocus (lien depuis
// l'ecran de consentement de l'appli : myfocus.mahu.cards/confidentialite).
export const metadata = {
  title: "Confidentialite - MyFocus",
  description: "Quelles donnees MyFocus utilise, pourquoi, et ce qui n'est jamais collecte.",
}

const sections: Array<{ title: string; items: string[] }> = [
  {
    title: "Service d'accessibilite (blocage des applis)",
    items: [
      "MyFocus utilise l'API d'accessibilite d'Android uniquement pour savoir QUELLE appli s'ouvre (son nom de paquet, par ex. com.instagram.android), afin d'afficher l'ecran de concentration devant les applis que vous avez choisi de bloquer.",
      "MyFocus ne lit pas le contenu de l'ecran, ne voit pas ce que vous tapez, ni vos messages, mots de passe ou navigation. Le service est configure pour ne pas pouvoir acceder au contenu des fenetres.",
      "La liste des applis ouvertes n'est ni enregistree en detail ni envoyee : seul un compteur de tentatives bloquees par jour est garde sur le telephone, pour votre suivi.",
    ],
  },
  {
    title: "Carte NFC",
    items: [
      "Lors de l'enregistrement, MyFocus lit l'identifiant (UID) de la puce de votre carte et n'en garde qu'une empreinte chiffree (SHA-256), sur le telephone uniquement.",
      "Cet identifiant n'est jamais envoye au serveur.",
    ],
  },
  {
    title: "Donnees envoyees au serveur Mahu",
    items: [
      "L'adresse email d'alerte que vous saisissez, pour vous envoyer le code de verification puis les alertes.",
      "Le modele du telephone (par ex. \"Samsung SM-A155F\"), pour vous dire quel appareil a declenche une alerte.",
      "Lors d'une alerte : son type (badges incorrects ou protection coupee), le nombre d'essais et l'heure.",
      "Rien d'autre : ni vos applis, ni votre position, ni vos contacts, ni votre activite.",
    ],
  },
  {
    title: "Autorisations demandees",
    items: [
      "NFC : lire votre carte-cle.",
      "Internet : envoyer les alertes.",
      "Accessibilite : detecter l'ouverture d'une appli bloquee (voir plus haut).",
      "Ignorer l'optimisation de la batterie : eviter qu'Android arrete la protection.",
    ],
  },
  {
    title: "Conservation et suppression",
    items: [
      "Les reglages et le suivi restent sur le telephone et sont supprimes en desinstallant l'appli.",
      "L'email d'alerte et l'historique des alertes sont conserves tant que l'appareil est enregistre. Pour les supprimer, ecrivez a contact@mahu.cards.",
      "Les donnees ne sont jamais vendues ni partagees avec des tiers. Les emails sont envoyes via notre prestataire d'envoi (Resend).",
    ],
  },
]

export default function MyFocusPrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-3xl mx-auto px-5 py-14">
        <Link href="/myfocus" className="text-sm text-white/60 hover:text-white">
          &larr; MyFocus
        </Link>
        <h1 className="mt-6 text-3xl font-bold">Politique de confidentialite de MyFocus</h1>
        <p className="mt-2 text-sm text-white/50">Derniere mise a jour : 2 octobre 2026 &middot; MAHU DIGITAL SYSTEM, Dakar, Senegal</p>

        {sections.map((s) => (
          <section key={s.title} className="mt-10">
            <h2 className="text-xl font-bold">{s.title}</h2>
            <ul className="mt-3 space-y-2 list-disc pl-5 text-white/80">
              {s.items.map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ul>
          </section>
        ))}

        <p className="mt-12 text-sm text-white/60">
          Questions : <a href="mailto:contact@mahu.cards" className="text-[#7cc4ff]">contact@mahu.cards</a>. Voir aussi la{" "}
          <a href="https://call.mahu.cards/confidentialite" className="text-[#7cc4ff]">politique de confidentialite generale de Mahu</a>.
        </p>
      </div>
    </div>
  )
}
