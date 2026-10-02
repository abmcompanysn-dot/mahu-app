import Link from "next/link"
import { Download, Lock, Nfc, ShieldCheck, Smartphone, BellRing, BarChart3 } from "lucide-react"

// Page publique de MyFocus (servie a la racine de myfocus.mahu.cards, voir
// proxy.ts). L'APK est dans public/myfocus/ - le remplacer a chaque version.
export const metadata = {
  title: "MyFocus - Zero scrolling avec ta carte Mahu",
  description:
    "Bloque Instagram, TikTok et les reseaux toute la journee. Ta carte Mahu, laissee a la maison, est la seule cle pour les liberer le soir.",
  openGraph: { images: [{ url: "/myfocus/icon-512.png", width: 512, height: 512 }] },
}

const APK_URL = "/myfocus/MyFocus.apk"
const APK_VERSION = "1.0.2"

const steps = [
  { icon: Nfc, title: "Ta carte devient ta cle", text: "Tu enregistres ta carte Mahu dans l'appli. Seule cette puce-la pourra deverrouiller tes applis." },
  { icon: Lock, title: "Tu la laisses a la maison", text: "Toute la journee, Instagram, TikTok et les applis que tu choisis s'ouvrent sur un ecran de concentration." },
  { icon: Smartphone, title: "Le soir, un tap", text: "De retour a la maison, tu passes ton telephone sur ta carte : tout est libre jusqu'au lendemain matin." },
]

const features = [
  { icon: BellRing, title: "Alerte d'intrusion", text: "5 badges rates ou protection coupee : un email d'urgence part aussitot (a toi ou a un parent)." },
  { icon: BarChart3, title: "Ton suivi", text: "Series de journees reussies et tentatives bloquees, jour par jour." },
  { icon: ShieldCheck, title: "Respect de ta vie privee", text: "MyFocus voit seulement le nom de l'appli ouverte. Il ne lit ni ton ecran, ni tes messages." },
]

const install = [
  "Telecharge l'appli avec le bouton ci-dessus, depuis ton telephone Android.",
  "Ouvre le fichier MyFocus.apk. Si Android le demande, autorise l'installation depuis ton navigateur (\"Sources inconnues\").",
  "Si Google Play Protect affiche \"Appli bloquee\" : touche \"Plus de details\" puis \"Installer quand meme\". MyFocus est signale par prudence car il utilise l'accessibilite, comme toutes les applis de controle parental installees hors Play Store.",
  "Ouvre MyFocus et suis la configuration : carte, applis a bloquer, horaires, email d'alerte.",
  "Active la protection dans Accessibilite (l'appli t'y emmene). Si Android affiche \"Parametre restreint\" : Parametres > Applications > MyFocus > menu ⋮ en haut > \"Autoriser les parametres restreints\", puis reessaie.",
]

export default function MyFocusPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-3xl mx-auto px-5 py-14 sm:py-20">
        <div className="flex items-center gap-3 mb-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/myfocus/icon-512.png" alt="" className="w-12 h-12 rounded-2xl" />
          <span className="text-xl font-bold">MyFocus</span>
          <span className="text-sm text-white/50">par Mahu</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black leading-tight tracking-tight">
          Zero scrolling.
          <br />
          <span className="text-[#7cc4ff]">Ta carte est la seule cle.</span>
        </h1>
        <p className="mt-5 text-lg text-white/75 max-w-xl">
          Pour les eleves, etudiants et tous ceux qui veulent se concentrer : les reseaux sociaux sont bloques toute
          la journee, et seule ta carte Mahu, restee a la maison, les libere le soir.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:items-center">
          <a
            href={APK_URL}
            download="MyFocus.apk"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#007AFF] px-6 py-4 text-lg font-bold hover:bg-[#0a84ff]"
          >
            <Download className="w-5 h-5" />
            Telecharger pour Android
          </a>
          <span className="text-sm text-white/50">Version {APK_VERSION} &middot; Android 8 ou plus &middot; NFC requis</span>
        </div>
        <p className="mt-3 text-sm text-white/50">
          iPhone : bientot. Apple n&apos;autorise le blocage d&apos;applis qu&apos;avec une autorisation speciale, que
          nous preparons.
        </p>

        <h2 className="mt-16 text-2xl font-bold">Comment ca marche</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center gap-2 text-[#7cc4ff]">
                <s.icon className="w-5 h-5" />
                <span className="text-sm font-semibold">Etape {i + 1}</span>
              </div>
              <h3 className="mt-3 font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-white/70">{s.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <f.icon className="w-5 h-5 text-[#7cc4ff]" />
              <h3 className="mt-3 font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-white/70">{f.text}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-16 text-2xl font-bold">Installation</h2>
        <ol className="mt-5 space-y-3">
          {install.map((t, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#007AFF] text-sm font-bold">
                {i + 1}
              </span>
              <span className="text-white/80">{t}</span>
            </li>
          ))}
        </ol>

        <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/70">
          Pas encore de carte Mahu ?{" "}
          <a href="https://call.mahu.cards/register" className="font-semibold text-[#7cc4ff] hover:underline">
            Commande ta Smart Card
          </a>{" "}
          (des 13 900 FCFA). N&apos;importe quelle carte ou badge NFC fonctionne aussi comme cle.
        </div>

        <footer className="mt-16 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/50">
          <Link href="/myfocus/confidentialite" className="hover:text-white">
            Politique de confidentialite
          </Link>
          <a href="mailto:contact@mahu.cards" className="hover:text-white">
            contact@mahu.cards
          </a>
          <span>&copy; 2026 MAHU DIGITAL SYSTEM</span>
        </footer>
      </div>
    </div>
  )
}
