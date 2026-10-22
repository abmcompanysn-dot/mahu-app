import Link from "next/link"
import { BellRing, Building2, GraduationCap, HardDrive, KeyRound, Monitor, Nfc, ShieldCheck, Store, Wifi } from "lucide-react"

// Page produit Mahu Cloud PC - "l'ordinateur le plus fin au monde".
// Lancement en test prive (places limitees par la capacite des serveurs).
export const metadata = {
  title: "L'ordinateur le plus fin au monde - Mahu Cloud PC",
  description:
    "Ton ordinateur tient dans ta carte Mahu. Scanne-la sur n'importe quel appareil, tape ton code : ton bureau, tes fichiers, ta session. Des 200 000 FCFA par an.",
}

const RESERVE = "mailto:contact@mahu.cards?subject=Mahu%20Cloud%20PC%20-%20r%C3%A9server%20ma%20place"

const steps = [
  { icon: Nfc, title: "Scanne ta carte", text: "Sur un téléphone, une tablette, le PC d'une salle info ou d'un cybercafé." },
  { icon: KeyRound, title: "Tape ton code", text: "Ton code secret. Sans lui, la carte ne sert à rien à celui qui la trouve." },
  { icon: Monitor, title: "Ton ordinateur s'ouvre", text: "Ton bureau, tes fichiers, là où tu les as laissés. Ferme l'onglet pour partir." },
]

const included = [
  { icon: Monitor, title: "Un bureau complet", text: "Un vrai ordinateur (Linux) avec navigateur web, dans ton navigateur. Rien à installer." },
  { icon: HardDrive, title: "Tes fichiers gardés", text: "5 Go d'espace personnel. Rien ne reste sur l'appareil que tu empruntes." },
  { icon: BellRing, title: "Alerte à chaque connexion", text: "Un email à chaque ouverture, et blocage automatique après 5 codes faux." },
  { icon: ShieldCheck, title: "Carte perdue ? Rien de perdu", text: "On bloque la carte, on t'en donne une nouvelle : ton ordinateur et tes fichiers t'attendent." },
]

const who = [
  { icon: GraduationCap, title: "Étudiants", text: "Un ordinateur complet sans acheter de laptop : depuis ton téléphone et un clavier, ou la salle info." },
  { icon: Building2, title: "Entreprises", text: "Le poste de travail de chaque employé, partout. Un employé part ? On bloque la carte." },
  { icon: Store, title: "Cybercafés & agents terrain", text: "Chacun retrouve son environnement sur n'importe quelle machine, sans y laisser ses données." },
]

const faq = [
  {
    q: "Windows ou Linux ?",
    a: "Linux pour le lancement (navigateur, documents, cours en ligne). Windows arrive ensuite, sur demande.",
  },
  {
    q: "Quelle connexion faut-il ?",
    a: "Une connexion stable, 4G ou wifi. Parfait pour le web, les documents et les cours. Ce n'est pas fait pour les jeux vidéo ni le montage vidéo.",
  },
  {
    q: "Pourquoi des places limitées ?",
    a: "Chaque ordinateur tourne sur nos serveurs. Nous ouvrons les places au rythme de nos serveurs, pour que chacun ait un ordinateur rapide.",
  },
]

export default function OrdinateurPage() {
  return (
    <div className="min-h-screen bg-[#05070d] text-white">
      <div className="max-w-4xl mx-auto px-5 py-14 sm:py-20">
        <div className="flex items-center gap-2 text-white/60">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" className="w-9 h-9 rounded-xl" />
          <span className="font-bold text-white">Mahu</span> Cloud PC
        </div>

        <div className="mt-14 grid gap-10 sm:grid-cols-[1.2fr_1fr] sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5ac8fa]">Nouveau</p>
            <h1 className="mt-3 text-4xl sm:text-6xl font-black leading-[1.05] tracking-tight">
              L&apos;ordinateur le plus fin au monde.
            </h1>
            <p className="mt-5 text-lg text-white/70">
              Ton ordinateur tient dans ta carte Mahu. Scanne-la sur n&apos;importe quel appareil, tape ton code : ton
              bureau, tes fichiers, ta session.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:items-center">
              <a href={RESERVE} className="inline-flex justify-center rounded-2xl bg-[#007AFF] px-6 py-4 text-lg font-bold hover:bg-[#0a84ff]">
                Réserver ma place
              </a>
              <span className="text-white/60">
                Dès <b className="text-white">200 000 FCFA</b> / an
              </span>
            </div>
            <p className="mt-3 text-sm text-white/40">Lancement en test privé : places limitées.</p>
          </div>

          {/* La carte, epaisseur d'un ordinateur */}
          <div className="relative mx-auto w-full max-w-xs aspect-[1.586] rounded-3xl bg-gradient-to-br from-[#11182b] to-[#0a0f1c] border border-white/10 shadow-[0_30px_80px_rgba(0,122,255,0.35)] p-6 flex flex-col justify-between rotate-[-6deg]">
            <div className="flex items-center justify-between">
              <span className="font-black tracking-tight">MAHU</span>
              <Nfc className="w-6 h-6 text-[#5ac8fa]" />
            </div>
            <div>
              <Monitor className="w-7 h-7 text-[#5ac8fa]" />
              <p className="mt-2 text-xs text-white/50">0,8 mm · ton ordinateur complet</p>
            </div>
          </div>
        </div>

        <h2 className="mt-24 text-2xl font-bold">Comment ça marche</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center gap-2 text-[#5ac8fa]">
                <s.icon className="w-5 h-5" />
                <span className="text-sm font-semibold">Étape {i + 1}</span>
              </div>
              <h3 className="mt-3 font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-white/70">{s.text}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-20 text-2xl font-bold">Ce que tu as</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {included.map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 flex gap-4">
              <f.icon className="w-6 h-6 shrink-0 text-[#5ac8fa]" />
              <div>
                <h3 className="font-bold">{f.title}</h3>
                <p className="mt-1 text-sm text-white/70">{f.text}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="mt-20 text-2xl font-bold">Pour qui</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {who.map((w) => (
            <div key={w.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <w.icon className="w-6 h-6 text-[#5ac8fa]" />
              <h3 className="mt-3 font-bold">{w.title}</h3>
              <p className="mt-1 text-sm text-white/70">{w.text}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-20 text-2xl font-bold">Questions</h2>
        <div className="mt-6 space-y-3">
          {faq.map((f) => (
            <div key={f.q} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <h3 className="font-bold flex items-center gap-2">
                {f.q === "Quelle connexion faut-il ?" && <Wifi className="w-4 h-4 text-[#5ac8fa]" />}
                {f.q}
              </h3>
              <p className="mt-1 text-sm text-white/70">{f.a}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-3xl bg-gradient-to-br from-[#007AFF] to-[#0a3f8f] p-8 text-center">
          <h2 className="text-3xl font-black">Ton ordinateur, dans ta poche.</h2>
          <p className="mt-2 text-white/80">Dès 200 000 FCFA par an. Places limitées pour le lancement.</p>
          <a href={RESERVE} className="mt-6 inline-flex rounded-2xl bg-white px-6 py-3 font-bold text-[#0a3f8f] hover:bg-white/90">
            Réserver ma place
          </a>
        </div>

        <footer className="mt-16 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/40">
          <Link href="/" className="hover:text-white">mahu.cards</Link>
          <a href="mailto:contact@mahu.cards" className="hover:text-white">contact@mahu.cards</a>
          <span>&copy; 2026 MAHU DIGITAL SYSTEM</span>
        </footer>
      </div>
    </div>
  )
}
