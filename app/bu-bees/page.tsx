import Link from "next/link"
import { Anton } from "next/font/google"
import { BarChart3, Camera, Nfc, QrCode, Scissors, Share2, ShoppingBag, Store, Truck, UserRound, Utensils, Wallet } from "lucide-react"
import type { Product } from "@/lib/shop-api"

// Page de vente de la carte MAHU Bu Bees (edition Teranga), en wolof, pour
// les entrepreneurs et commercants senegalais. Produit "carte-bu-bees".
export const metadata = {
  title: "MAHU Bu Bees · Kàrt bu bees bi ngir sa business",
  description:
    "MAHU Bu Bees : kàrt bu xelu, ci melo Teranga. Laal ko ak téléphone, kiliyaan bi gis sa nimero, sa WhatsApp ak sa boutik. Édition limitée : 8 375 FCFA ci barabu 13 900, livraison ci 24 waxtu.",
  openGraph: {
    title: "MAHU Bu Bees · Sénégal Rek, Tech bi MAHU",
    description: "Sa business, ci benn kàrt. Édition limitée : 8 375 FCFA ci barabu 13 900.",
    images: [{ url: "/bu-bees/og.jpg", width: 1200, height: 630, alt: "Carte MAHU Bu Bees" }],
  },
  twitter: { card: "summary_large_image", images: ["/bu-bees/og.jpg"] },
}

// Rendu a chaque visite : la liste des prix vient du catalogue de la boutique.
export const dynamic = "force-dynamic"

const anton = Anton({ weight: "400", subsets: ["latin"] })

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:4000"
const SERVICE_API_KEY = process.env.BACKEND_API_KEY || ""

// Catalogue public (meme source que /register), lu cote serveur.
async function getProducts(): Promise<Product[]> {
  try {
    const res = await fetch(new URL("/api/shop/products", BACKEND_URL), {
      headers: { "x-api-key": SERVICE_API_KEY },
      cache: "no-store",
    })
    if (!res.ok) return []
    const data = (await res.json()) as { products?: Product[] }
    return (data.products || []).filter((p) => p.active !== false)
  } catch {
    return []
  }
}

const fcfa = (n: number) => n.toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ")

const ORDER = "/register?product=carte-bu-bees"
const WHATSAPP = "https://wa.me/221769047999?text=" + encodeURIComponent("Salaam, bëgg naa kàrt MAHU Bu Bees bi (8 375 FCFA).")
// Promo de lancement « edition limitee » : 10 cartes a 8 375 FCFA au lieu de 13 900.
const PRICE = "8 375"
const OLD_PRICE = "13 900"
const GREEN = "#00853F"
const YELLOW = "#FDEF42"
const RED = "#E31B23"

// Ce qu'on entend tous les jours au marche : le probleme que la carte regle.
const voices = [
  "« Bindal ma sa nimero… »",
  "« Sama téléphone amul batterie, dinaa la woo. »",
  "« Carte de visite bi, dama ko réer. »",
  "« Fan lañu lay gise ci Facebook ? »",
]

const benefits = [
  { icon: Nfc, title: "Benn laal rek", text: "Kiliyaan bi laal sa kàrt ak téléphone am : sa nimero ak sa WhatsApp dugg ci téléphone bi. Bu soxla, mu woo la." },
  { icon: ShoppingBag, title: "Wone sa produits", text: "Sa produits, sa njëg ak sa nataal yi, lépp ci sa profil. Kiliyaan bi gis lépp, mu jënd." },
  { icon: Share2, title: "Sa réseaux yépp", text: "Facebook, Instagram, TikTok, WhatsApp : kiliyaan bi mën na la topp ci benn saa." },
  { icon: QrCode, title: "QR code bu mag", text: "Téléphone bu amul NFC ? Mu scanner QR code bi ci kanam kàrt bi. Ku nekk mën na ko." },
  { icon: BarChart3, title: "Xam ñi la xool", text: "Ci sa dashboard, dinga xam ñaata nit ñoo xool sa profil, ak ñaata ñoo la woo." },
  { icon: Wallet, title: "Amul papier", text: "Carte de visite papier dafay réer, dafay tooy. Bu Bees bi, benn kàrt rek, te du jeex." },
]

const steps = [
  { title: "Jënd sa kàrt", text: "8 375 FCFA ci barabu 13 900 (édition limitée). Sa tur lañuy bind ci kàrt bi, mel ni kàrtu banque." },
  { title: "Defar sa profil", text: "Sa nataal, sa nimero, sa boutik, sa produits. Danuy la dimbali, bul sonn." },
  { title: "Laal, jaay", text: "Kiliyaan bi laal kàrt bi walla mu scanner QR code bi : mu nekk sa kiliyaan." },
]

const who = [
  { icon: Store, title: "Jaaykat ci marché", text: "Sàndaga, HLM, Colobane, Tilène : sa kiliyaan yi dinañu la fekk." },
  { icon: Scissors, title: "Tailleur ak couturière", text: "Wone sa modèles yi, kiliyaan bi tànn, mu woo la." },
  { icon: Camera, title: "Coiffeuse ak salon", text: "Sa nataal yi, sa njëg yi, sa rendez-vous : lépp ci benn bërëb." },
  { icon: Utensils, title: "Traiteur ak restaurant", text: "Sa menu ak sa nimero ci téléphone kiliyaan bi, ngir mu commander." },
  { icon: Truck, title: "Livreur ak taxi", text: "Kiliyaan bi am na sa nimero ba noppi, mu mën la woo ëllëg." },
  { icon: UserRound, title: "Ku am business", text: "Boutik, atelier, service : sa business moo yokku." },
]

const faq = [
  {
    q: "Téléphone bu nekk mën na ko jàng ?",
    a: "Téléphone yu bees yi am nañu NFC : laal rek. Yu amul NFC, dañuy scanner QR code bi ci kanam kàrt bi.",
  },
  {
    q: "Su ma soppee sama nimero nag ?",
    a: "Soppi ko ci sa dashboard. Kàrt bi du soppi : kiliyaan bi dina gis sa nimero bu bees bi.",
  },
  {
    q: "Su ma réeree sama kàrt ?",
    a: "Woo nu. Sa profil du réer, mu ngi ci internet : nu def la beneen kàrt.",
  },
]

function Flag({ className = "" }: { className?: string }) {
  return (
    <div className={`flex overflow-hidden rounded ${className}`} aria-hidden>
      <i className="flex-1" style={{ background: GREEN }} />
      <i className="flex-1" style={{ background: YELLOW }} />
      <i className="flex-1" style={{ background: RED }} />
    </div>
  )
}

function Stripes({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col ${className}`} aria-hidden>
      <i className="flex-1" style={{ background: GREEN }} />
      <i className="flex-1" style={{ background: YELLOW }} />
      <i className="flex-1" style={{ background: RED }} />
    </div>
  )
}

export default async function BuBeesPage() {
  const products = await getProducts()
  return (
    <div lang="wo" className="min-h-screen overflow-x-clip bg-[#03110a] text-white">
      <Stripes className="h-2" />
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(700px 500px at 10% 0%, rgba(0,133,63,.45), transparent 70%), radial-gradient(600px 500px at 100% 40%, rgba(227,27,35,.22), transparent 70%)",
          }}
        />
        <div className="relative max-w-5xl mx-auto px-5 pt-10 pb-16 sm:pt-14 sm:pb-24">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/icon-192.png" alt="" className="w-9 h-9 rounded-xl" />
              <span className="font-bold text-white">MAHU</span> Bu Bees
            </div>
            <Flag className="h-6 w-9" />
          </div>

          <div className="mt-12 grid gap-12 md:grid-cols-[1.1fr_1fr] md:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em]" style={{ color: YELLOW }}>
                Sénégal rek · Tech bi MAHU
              </p>
              <span
                className="mt-4 inline-block rounded-full px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.2em] text-white"
                style={{ background: RED }}
              >
                Édition limitée · 10 kàrt rek
              </span>
              <h1 className={`${anton.className} mt-4 text-5xl sm:text-7xl leading-[1.02] tracking-wide`}>
                SA BUSINESS,
                <br />
                CI <span style={{ color: YELLOW }}>BENN KÀRT</span>.
              </h1>
              <p className="mt-6 text-lg text-white/75">
                MAHU Bu Bees mooy kàrt bu xelu bi, ci melo Teranga. Laal ko ak téléphone bu kiliyaan bi : mu gis sa
                nimero, sa WhatsApp, sa boutik ak sa réseaux, ci benn saa.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 sm:items-center">
                <a
                  href={ORDER}
                  className="inline-flex justify-center rounded-2xl px-7 py-4 text-lg font-extrabold text-[#06301b] shadow-[0_15px_40px_rgba(253,239,66,0.25)] hover:brightness-105"
                  style={{ background: YELLOW }}
                >
                  Jënd sa kàrt
                </a>
                <span className="text-white/70">
                  <s className="mr-2 text-white/50">{OLD_PRICE}</s>
                  <b className={`${anton.className} text-4xl tracking-wide`} style={{ color: YELLOW }}>
                    {PRICE}
                  </b>{" "}
                  FCFA
                  <span className="ml-2 rounded-md px-2 py-0.5 text-sm font-extrabold text-white" style={{ background: RED }}>
                    -40 %
                  </span>
                </span>
              </div>
              <p className="mt-4 text-white/70">
                Livraison ci 24 waxtu ·{" "}
                <a href={WHATSAPP} className="font-bold text-white underline underline-offset-4">
                  WhatsApp : 76 904 79 99
                </a>
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-md h-[300px] sm:h-[380px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/bu-bees/carte-verso.webp"
                alt="Ginnaaw kàrt MAHU Bu Bees : Sénégal Rek, Tech bi MAHU"
                className="absolute right-0 top-0 w-[78%] rounded-[18px] rotate-[8deg] shadow-[0_30px_70px_rgba(0,0,0,0.6)] ring-1 ring-white/10"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/bu-bees/carte-recto.webp"
                alt="Kanam kàrt MAHU Bu Bees ak QR code"
                className="absolute left-0 bottom-0 w-[82%] rounded-[18px] -rotate-[7deg] shadow-[0_40px_80px_rgba(0,0,0,0.7)] ring-1 ring-white/10"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/50">Li ñuy dégg ci marché bés bu nekk</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {voices.map((v) => (
              <p key={v} className="text-xl sm:text-2xl font-semibold text-white/90">
                {v}
              </p>
            ))}
          </div>
          <p className="mt-6 text-lg" style={{ color: YELLOW }}>
            Ba noppi, kiliyaan bi fàtte la. Ak Bu Bees, du la fàtte mukk.
          </p>
        </section>

        <h2 className={`${anton.className} mt-20 text-3xl sm:text-4xl tracking-wide`}>LU MU LAY JARIÑ</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b) => (
            <div key={b.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <b.icon className="w-6 h-6" style={{ color: YELLOW }} />
              <h3 className="mt-3 text-lg font-bold">{b.title}</h3>
              <p className="mt-1 text-white/70">{b.text}</p>
            </div>
          ))}
        </div>

        <h2 className={`${anton.className} mt-20 text-3xl sm:text-4xl tracking-wide`}>NAKA LAY DOXE</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <span
                className={`${anton.className} text-5xl`}
                style={{ color: [GREEN, YELLOW, RED][i] }}
              >
                {i + 1}
              </span>
              <h3 className="mt-2 text-lg font-bold">{s.title}</h3>
              <p className="mt-1 text-white/70">{s.text}</p>
            </div>
          ))}
        </div>

        <h2 className={`${anton.className} mt-20 text-3xl sm:text-4xl tracking-wide`}>ÑU KO DEFAR NGIR YAW</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {who.map((w) => (
            <div key={w.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 flex gap-4">
              <w.icon className="w-6 h-6 shrink-0" style={{ color: YELLOW }} />
              <div>
                <h3 className="font-bold">{w.title}</h3>
                <p className="mt-1 text-sm text-white/70">{w.text}</p>
              </div>
            </div>
          ))}
        </div>

        {products.length > 0 && (
          <>
            <h2 className={`${anton.className} mt-20 text-3xl sm:text-4xl tracking-wide`}>NJËG YI</h2>
            <p className="mt-2 text-white/60">Kàrt yépp ak njëg yi. Tànnal bi la neex.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => {
                const featured = p.slug === "carte-bu-bees"
                return (
                  <div
                    key={p._id}
                    className={`flex flex-col rounded-2xl border p-5 ${featured ? "border-[#FDEF42]/60 bg-[#FDEF42]/[0.07]" : "border-white/10 bg-white/[0.04]"}`}
                  >
                    {p.imageUrl && (
                      <div className="mb-4 flex h-32 items-center justify-center overflow-hidden rounded-xl bg-black/30">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.imageUrl} alt="" className="max-h-full max-w-full object-contain" loading="lazy" />
                      </div>
                    )}
                    {featured && (
                      <span className="mb-1 text-xs font-bold uppercase tracking-[0.2em]" style={{ color: YELLOW }}>
                        Bu bees
                      </span>
                    )}
                    <h3 className="font-bold leading-snug">{p.name}</h3>
                    {p.material && <p className="mt-1 text-sm text-white/50">{p.material}</p>}
                    <p className="mt-3 text-white/70">
                      {p.priceIsFrom && <span className="text-sm">Dale ci </span>}
                      {featured && p.priceXof < 13900 && <s className="mr-2 text-white/40">{OLD_PRICE}</s>}
                      <b className={`${anton.className} text-2xl tracking-wide text-white`}>{fcfa(p.priceXof)}</b> FCFA
                    </p>
                    <a
                      href={`/register?product=${encodeURIComponent(p.slug)}`}
                      className={`mt-4 inline-flex justify-center rounded-xl px-4 py-2.5 font-bold ${featured ? "text-[#06301b]" : "bg-white/10 hover:bg-white/15"}`}
                      style={featured ? { background: YELLOW } : undefined}
                    >
                      Jënd
                    </a>
                  </div>
                )
              })}
            </div>
          </>
        )}

        <h2 className={`${anton.className} mt-20 text-3xl sm:text-4xl tracking-wide`}>LAAJ YI</h2>
        <div className="mt-6 space-y-3">
          {faq.map((f) => (
            <div key={f.q} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <h3 className="font-bold">{f.q}</h3>
              <p className="mt-1 text-white/70">{f.a}</p>
            </div>
          ))}
        </div>

        <div className="relative mt-16 overflow-hidden rounded-3xl p-8 sm:p-12 text-center" style={{ background: "linear-gradient(135deg,#06301b,#00853F)" }}>
          <Stripes className="absolute left-0 right-0 top-0 h-3" />
          <p className="text-sm font-bold uppercase tracking-[0.25em]" style={{ color: YELLOW }}>
            Sénégal rek
          </p>
          <h2 className={`${anton.className} mt-3 text-4xl sm:text-5xl tracking-wide`}>TECH BI, MAHU.</h2>
          <p className="mt-3 text-white/85">Sa kàrt Bu Bees, ak sa tur ci kaw. {PRICE} FCFA ci barabu {OLD_PRICE}, livraison ci 24 waxtu. Édition limitée : 10 kàrt rek.</p>
          <a
            href={ORDER}
            className="mt-7 inline-flex rounded-2xl px-7 py-4 text-lg font-extrabold text-[#06301b] hover:brightness-105"
            style={{ background: YELLOW }}
          >
            Jënd sa kàrt Bu Bees
          </a>
        </div>

        <footer className="mt-16 pb-12 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/40">
          <Link href="/" className="hover:text-white">mahu.cards</Link>
          <a href="mailto:contact@mahu.cards" className="hover:text-white">contact@mahu.cards</a>
          <span>&copy; 2026 MAHU DIGITAL SYSTEM</span>
        </footer>
      </div>
    </div>
  )
}
