import Link from "next/link"
import { ArrowRight, BadgeCheck, CreditCard, FolderKanban, GraduationCap, Share2 } from "lucide-react"
import { PORTFOLIO_PRICE, PORTFOLIO_TEMPLATES } from "@/lib/portfolio"

// Offre etudiante : portfolio numerique + carte digitale professionnelle Mahu,
// valables un an, pour 3 500 FCFA (produit "portfolio-etudiant").
export const metadata = {
  title: "Portfolio étudiant · Mahu",
  description: "Ton portfolio en ligne et ta carte digitale professionnelle Mahu, valables un an, pour 3 500 FCFA. Réservé aux étudiants.",
}

const ORDER = "/register?product=portfolio-etudiant"

const included = [
  { icon: FolderKanban, title: "Ton portfolio en ligne", text: "Projets, compétences, expériences, formation et CV, sur une page à ton nom." },
  { icon: CreditCard, title: "Ta carte digitale pro", text: "Ta carte de visite Mahu : un lien et un QR code à partager avec les recruteurs." },
  { icon: BadgeCheck, title: "4 modèles au choix", text: "Change de modèle quand tu veux, ton contenu suit." },
  { icon: GraduationCap, title: "Valable 1 an", text: "Un seul paiement, pas d'abonnement caché." },
]

const steps = [
  { title: "Inscris-toi et paie", text: `${PORTFOLIO_PRICE}, par Mobile Money ou carte bancaire.` },
  { title: "Choisis ton modèle", text: "Ajoute tes projets, tes compétences et ta formation depuis ton espace." },
  { title: "Partage ton lien", text: "Envoie ton portfolio et ta carte digitale aux recruteurs et aux écoles." },
]

export default function StudentsPage() {
  return (
    <main className="min-h-screen bg-[#07090f] text-white">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(212,175,55,0.18),transparent_55%)]" />
        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-16 sm:pt-24">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/40 bg-[#d4af37]/10 px-4 py-1.5 text-sm font-semibold text-[#e9cf7a]">
            <GraduationCap className="h-4 w-4" /> Réservé aux étudiants
          </p>
          <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
            Ton portfolio en ligne et ta carte digitale pro.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/70">
            Montre tes projets aux recruteurs avec une vraie page à ton nom, et partage ta carte de visite Mahu en un lien.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link href={ORDER} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#d4af37] px-7 py-4 text-lg font-bold text-black hover:bg-[#e2bf4f]">
              Je crée mon portfolio <ArrowRight className="h-5 w-5" />
            </Link>
            <p className="text-white/60">
              <b className="text-2xl text-white">{PORTFOLIO_PRICE}</b> · valable 1 an
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {included.map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <f.icon className="h-6 w-6 text-[#d4af37]" />
              <h2 className="mt-3 font-bold">{f.title}</h2>
              <p className="mt-1 text-sm text-white/65">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="modeles" className="mx-auto max-w-6xl px-5 py-12">
        <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Les modèles</h2>
        <p className="mt-2 text-white/60">Ouvre-les, ce sont de vrais portfolios d'exemple.</p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {PORTFOLIO_TEMPLATES.map((t) => (
            <Link key={t.id} href={`/portfolio/modeles/${t.id}`} className="group block">
              <div className="relative aspect-[16/11] overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                <iframe
                  src={`/portfolio/modeles/${t.id}`}
                  title={`Modèle ${t.name}`}
                  loading="lazy"
                  tabIndex={-1}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-0 top-0 h-[300%] w-[300%] origin-top-left scale-[0.3334] border-0"
                />
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold">{t.name}</h3>
                  <p className="text-sm text-white/60">{t.tagline}</p>
                </div>
                <span className="text-sm font-semibold text-[#d4af37] group-hover:underline">Voir en grand →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12">
        <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Comment ça marche</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <span className="text-sm font-bold text-[#d4af37]">Étape {i + 1}</span>
              <h3 className="mt-2 font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-white/65">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20 pt-6">
        <div className="flex flex-col items-start gap-5 rounded-3xl bg-gradient-to-br from-[#d4af37] to-[#9a7a1c] p-8 text-black sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-black">Ton avenir mérite une belle vitrine.</h2>
            <p className="mt-1 font-medium text-black/70">{PORTFOLIO_PRICE} · portfolio + carte digitale · 1 an</p>
          </div>
          <Link href={ORDER} className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 font-bold text-white">
            <Share2 className="h-4 w-4" /> Je commence
          </Link>
        </div>
      </section>
    </main>
  )
}
