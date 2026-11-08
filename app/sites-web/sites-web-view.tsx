"use client"

// Page /sites-web : offre de creation de sites web cle en main (domaine + hebergement + e-mail pro)
// pour le Canada et la France, en francais et en anglais. Realisations reprises du portfolio de
// l'equipe MAHU (call.mahu.cards/portfolio/support520). Les devis arrivent comme contacts du
// profil support520 (tableau de bord + e-mail), via handleLeadCapture.
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Globe, Server, Mail, Smartphone, MessageCircle, Search, Check, ArrowRight, Loader2,
  ExternalLink, ShieldCheck, Clock, CreditCard, ChevronDown,
} from "lucide-react"
import { api } from "@/lib/api"

type Lang = "fr" | "en"
type Country = "CA" | "FR"

// Prix et liens a ajuster ici.
// Offre d'ouverture : les forfaits ci-dessous jusqu'a OPENING_END, ensuite le tarif standard
// (a appliquer reellement apres cette date : un « prix normal » jamais pratique est interdit
// en France comme au Canada).
const PRICES: Record<Country, { essentiel: string; pro: string; shop: string; standard: string; renew: string; tld: string }> = {
  CA: { essentiel: "299 $ CA", pro: "399 $ CA", shop: "30 $ CA", standard: "800 $ CA", renew: "99 $ CA / an", tld: ".ca ou .com" },
  FR: { essentiel: "279 €", pro: "379 €", shop: "29 €", standard: "800 €", renew: "79 € / an", tld: ".fr ou .com" },
}
const OPENING_END = { fr: "31 décembre 2026", en: "December 31, 2026" }

// Entreprises accompagnees et resultats verifies (Bilan Mahu 2026 du 9 octobre 2026, facture
// MAHU-MIAD FAC-2026-10-001). Pas de chiffre de ventes MIAD : les gains d'aout-octobre etaient
// des commandes de test (rapport du 6 novembre 2026).
const CLIENTS: { name: string; where: string; link?: string }[] = [
  { name: "MIAD Market", where: "Canada · Sénégal", link: "https://miadmarket.ca" },
  { name: "MIAD Talent", where: "Canada · Sénégal", link: "https://miadtalent.com" },
  { name: "JEL DEM · Labo HYFLEX", where: "Sénégal", link: "https://jeldem.abmcy.com" },
  { name: "ALBIS", where: "Chine → Sénégal" },
  { name: "21 entreprises Mahu", where: "Sénégal · Bénin · Burkina Faso", link: "https://call.mahu.cards" },
]
const PAYMENT_LINK = "" // lien PayPal ou Stripe : vide = envoye avec le devis
const LEAD_PROFILE = "support520"
const WHATSAPP = "https://wa.me/221769047999"

const PROJECTS: { title: string; fr: string; en: string; link: string; img: string; tags: string }[] = [
  { title: "MIAD Market", fr: "Plateforme e-commerce : catalogue, commandes, paiement, livraison, vendeurs.", en: "E-commerce platform: catalogue, orders, payment, delivery, sellers.", link: "https://miadmarket.com", img: "https://res.cloudinary.com/dl3cdiz6k/image/upload/v1793137124/zsitklp8tbafbc9e9syx.jpg", tags: "E-commerce" },
  { title: "Diarra", fr: "Marketplace de formations et de fichiers numériques, paiement en ligne.", en: "Marketplace for courses and digital files, online payment.", link: "https://diarra.app", img: "https://res.cloudinary.com/dl3cdiz6k/image/upload/v1793137120/cbfd0flywhemcc0d5jx3.jpg", tags: "Marketplace" },
  { title: "MIAD Talent", fr: "Recrutement de talents entre le Sénégal et le Canada, profils vidéo.", en: "Talent recruitment between Senegal and Canada, video profiles.", link: "https://miadtalent.com", img: "https://res.cloudinary.com/dl3cdiz6k/image/upload/v1793140145/mg9oplvj0jo251fvhw3e.jpg", tags: "Recrutement" },
  { title: "Mahu Cards", fr: "Cartes de visite NFC : profils, formulaire de contact, espace entreprise.", en: "NFC business cards: profiles, contact form, business space.", link: "https://call.mahu.cards", img: "https://res.cloudinary.com/dl3cdiz6k/image/upload/v1793137122/zoth6ydecrz8jh6muwnj.jpg", tags: "SaaS" },
  { title: "ABMedu", fr: "Plateforme e-learning : catalogue de cours, formateurs, paiement.", en: "E-learning platform: course catalogue, trainers, payment.", link: "https://abmedu.abmcy.com", img: "https://res.cloudinary.com/dl3cdiz6k/image/upload/v1793140304/abgwjm0dxqm9boyc9fmw.jpg", tags: "E-learning" },
  { title: "Mon Véhicule SN", fr: "Marketplace automobile : recherche avancée, fiches, réservations.", en: "Car marketplace: advanced search, listings, bookings.", link: "https://monvehicule.abmcy.com", img: "https://res.cloudinary.com/dl3cdiz6k/image/upload/v1793139204/ucd8oxidqqu3dbizpod4.jpg", tags: "Marketplace" },
  { title: "ABM EduPilote", fr: "Gestion universitaire : 4 portails, présences par QR code.", en: "University management: 4 portals, QR code attendance.", link: "https://abmedupilote.abmcy.com", img: "https://res.cloudinary.com/dl3cdiz6k/image/upload/v1793139199/nw9nit1locotw6hcoi60.jpg", tags: "Plateforme métier" },
  { title: "Bureau BRVM", fr: "Assistant d'investissement en bourse avec scores et signaux.", en: "Stock investment assistant with scores and signals.", link: "https://brvm.abmcy.com", img: "https://res.cloudinary.com/dl3cdiz6k/image/upload/v1793137128/g3hshege6k02vukano6k.jpg", tags: "Finance · IA" },
  { title: "Offre étudiants Mahu", fr: "Page de vente animée, portfolios et CV en ligne, paiement mobile.", en: "Animated sales page, online portfolios and résumés, mobile payment.", link: "https://call.mahu.cards/etudiants", img: "https://res.cloudinary.com/dl3cdiz6k/image/upload/v1793140062/fowh0aick3o5w1rcqetw.jpg", tags: "Landing page" },
]

const T = {
  fr: {
    kicker: "Création de sites web · Canada & France",
    h1a: "Votre site web professionnel,",
    h1b: "clé en main.",
    sub: "Nom de domaine, hébergement et adresse e-mail pro inclus. Vous nous parlez de votre activité, on s'occupe de tout : en ligne 7 jours après la prise de contact.",
    ctaQuote: "Demander un devis gratuit",
    ctaWa: "Écrire sur WhatsApp",
    country: "Votre pays",
    trust: ["En ligne en 7 jours", "Vous restez propriétaire du domaine", "Paiement sécurisé"],
    inclTitle: "Tout est inclus",
    inclSub: "Pas de frais cachés la première année : un seul prix pour un site prêt à recevoir vos clients.",
    incl: [
      { t: "Nom de domaine", d: (tld: string) => `votreentreprise${tld === ".fr ou .com" ? ".fr" : ".ca"} ou .com, à votre nom, 1 an inclus.` },
      { t: "Hébergement rapide + HTTPS", d: () => "Hébergé sur un réseau mondial, cadenas de sécurité, 1 an inclus." },
      { t: "E-mail professionnel", d: () => "vous@votreentreprise.com, utilisable sur téléphone, Gmail ou Outlook." },
      { t: "Pensé pour le téléphone", d: () => "Rapide et lisible sur mobile, tablette et ordinateur." },
      { t: "Contact en un clic", d: () => "Formulaire, bouton WhatsApp, appel et Google Maps." },
      { t: "Visible sur Google", d: () => "Référencement de base, fiche partagée sur les réseaux, Google Business." },
    ],
    opening: (std: string, end: string) => `Offre d'ouverture jusqu'au ${end}. Ensuite, création à partir de ${std}.`,
    openingBadge: "Offre d'ouverture",
    trustTitle: "Ils nous ont fait confiance",
    resultsTitle: "Des résultats mesurés, pas des promesses",
    resultsSub: "Chiffres réels de nos plateformes en production.",
    caseTitle: "Projet phare · MIAD Market (Canada)",
    caseText: "Marketplace bilingue français / anglais livrée sur miadmarket.ca et miadmarket.com : paiement par carte et mobile money dans environ 19 pays, livraison DHL, catalogue Facebook / Instagram et suivi des conversions Meta.",
    plansTitle: "Trois formules, un prix clair",
    plansSub: "Sites vitrines : création + première année de domaine, d'hébergement et d'e-mail. Boutique : un abonnement mensuel.",
    once: "une seule fois",
    popular: "Le plus choisi",
    essentiel: { name: "Essentiel", for: "Pour se lancer : artisans, indépendants, consultants.", feats: ["Site d'une page (sections : accueil, services, à propos, contact)", "Nom de domaine + hébergement + HTTPS (1 an)", "1 adresse e-mail pro", "Formulaire de contact + WhatsApp", "Référencement Google de base", "1 série de corrections", "En ligne 7 jours après la prise de contact"] },
    pro: { name: "Pro", for: "Pour les PME, restaurants, salons, cabinets, commerces.", feats: ["Jusqu'à 5 pages (services, galerie, équipe, tarifs…)", "Nom de domaine + hébergement + HTTPS (1 an)", "Jusqu'à 5 adresses e-mail pro", "Formulaire, WhatsApp, Google Maps, réseaux sociaux", "Site en français et en anglais", "Référencement Google + fiche Google Business", "2 séries de corrections", "En ligne 7 jours après la prise de contact"] },
    shop: { name: "Boutique en ligne", for: "Pour vendre vos produits en ligne, sans frais de création.", feats: ["Boutique prête : jusqu'à 50 produits, photos, prix, stock", "Panier et paiement par carte en ligne", "Commandes reçues par e-mail et WhatsApp", "Sur votreboutique.mahu.cards (ou votre domaine)", "Hébergement, HTTPS et mises à jour compris", "Sans engagement, annulable chaque mois", "En ligne 7 jours après la prise de contact"] },
    perMonth: "par mois",
    shopBadge: "Nouveau",
    choose: "Choisir ce forfait",
    renew: (r: string) => `Sites vitrines, à partir de la 2e année : renouvellement domaine + hébergement + e-mail ${r}. Sans engagement.`,
    workTitle: "Nos réalisations",
    workSub: "Sites et plateformes conçus et mis en ligne par l'équipe MAHU.",
    seeAll: "Voir tout le portfolio de l'équipe",
    visit: "Voir le site",
    stepsTitle: "Comment ça se passe",
    steps: [
      { t: "Devis en 24 h", d: "Vous décrivez votre activité, on vous propose le forfait adapté." },
      { t: "Acompte de 50 %", d: "Paiement sécurisé en ligne par carte. Le reste à la mise en ligne." },
      { t: "Maquette et contenu", d: "On rédige et on met en forme ; vous validez ou demandez des corrections." },
      { t: "En ligne en 7 jours", d: "Au plus tard 7 jours après la prise de contact : domaine, e-mail et site activés, et tous vos accès." },
    ],
    faqTitle: "Questions fréquentes",
    faq: [
      { q: "Le nom de domaine m'appartient-il ?", a: "Oui. Il est enregistré à votre nom ou à celui de votre entreprise. Vous pouvez le garder même si vous changez de prestataire." },
      { q: "Que se passe-t-il après la première année ?", a: (r: string) => `Le domaine, l'hébergement et l'e-mail se renouvellent pour ${r}, sans engagement. Vous pouvez arrêter quand vous voulez.` },
      { q: "Vous êtes à Dakar : comment travaille-t-on ensemble ?", a: "Tout se fait à distance : appel vidéo, WhatsApp et e-mail. Nous avons des partenaires et des clients au Canada, et nous adaptons nos horaires à votre fuseau." },
      { q: "Je n'ai pas de textes ni de photos.", a: "Pas de problème : on rédige les textes à partir d'un court échange, et on utilise des photos libres de droits si vous n'en avez pas." },
      { q: "Je pourrai modifier mon site ensuite ?", a: "Les petites modifications du premier mois sont offertes. Ensuite, on les fait pour vous à petit prix, ou on vous forme pour les faire vous-même." },
      { q: "Comment payer ?", a: "Par carte bancaire en ligne (paiement sécurisé). Le lien de paiement de l'acompte vous est envoyé avec le devis." },
    ],
    formTitle: "Demandez votre devis gratuit",
    formSub: "Réponse sous 24 h, par e-mail ou WhatsApp.",
    fName: "Votre nom",
    fContact: "E-mail ou WhatsApp",
    fCompany: "Entreprise et activité",
    fCompanyPh: "Ex. Salon Belle Allure, coiffure à Montréal",
    fPlan: "Forfait",
    fUnsure: "Je ne sais pas encore",
    fMsg: "Votre projet (facultatif)",
    fMsgPh: "Ce que vous voulez sur le site, un site que vous aimez, une date…",
    send: "Envoyer ma demande",
    sent: "Merci ! Votre demande est envoyée. Nous vous répondons sous 24 h.",
    err: "L'envoi n'a pas marché. Écrivez-nous sur WhatsApp ou à contact@mahu.cards.",
    payNow: "Payer l'acompte en ligne",
    powered: "Propulsé par",
  },
  en: {
    kicker: "Website design · Canada & France",
    h1a: "Your professional website,",
    h1b: "done for you.",
    sub: "Domain name, hosting and professional email included. Tell us about your business, we handle the rest: live 7 days after first contact.",
    ctaQuote: "Get a free quote",
    ctaWa: "Message us on WhatsApp",
    country: "Your country",
    trust: ["Live in 7 days", "You own your domain", "Secure payment"],
    inclTitle: "Everything included",
    inclSub: "No hidden fees in year one: one price for a website ready to welcome your customers.",
    incl: [
      { t: "Domain name", d: (tld: string) => `yourbusiness${tld === ".fr ou .com" ? ".fr" : ".ca"} or .com, in your name, 1 year included.` },
      { t: "Fast hosting + HTTPS", d: () => "Hosted on a global network, security padlock, 1 year included." },
      { t: "Professional email", d: () => "you@yourbusiness.com, works on your phone, Gmail or Outlook." },
      { t: "Mobile-first", d: () => "Fast and easy to read on phones, tablets and computers." },
      { t: "One-tap contact", d: () => "Contact form, WhatsApp button, call and Google Maps." },
      { t: "Found on Google", d: () => "Basic SEO, social sharing preview, Google Business." },
    ],
    opening: (std: string, end: string) => `Launch offer until ${end}. After that, websites start at ${std}.`,
    openingBadge: "Launch offer",
    trustTitle: "They trusted us",
    resultsTitle: "Measured results, not promises",
    resultsSub: "Real figures from our platforms in production.",
    caseTitle: "Flagship project · MIAD Market (Canada)",
    caseText: "Bilingual French / English marketplace launched on miadmarket.ca and miadmarket.com: card and mobile money payments in about 19 countries, DHL shipping, Facebook / Instagram catalogue and Meta conversion tracking.",
    plansTitle: "Three offers, one clear price",
    plansSub: "Websites: design + first year of domain, hosting and email. Online shop: a monthly subscription.",
    once: "one-time",
    popular: "Most popular",
    essentiel: { name: "Essential", for: "To get started: trades, freelancers, consultants.", feats: ["One-page website (home, services, about, contact)", "Domain + hosting + HTTPS (1 year)", "1 professional email address", "Contact form + WhatsApp", "Basic Google SEO", "1 round of revisions", "Live 7 days after first contact"] },
    pro: { name: "Pro", for: "For small businesses, restaurants, salons, firms, shops.", feats: ["Up to 5 pages (services, gallery, team, pricing…)", "Domain + hosting + HTTPS (1 year)", "Up to 5 professional email addresses", "Form, WhatsApp, Google Maps, social media", "Website in English and French", "Google SEO + Google Business profile", "2 rounds of revisions", "Live 7 days after first contact"] },
    shop: { name: "Online shop", for: "Sell your products online, no setup fee.", feats: ["Ready-made shop: up to 50 products, photos, prices, stock", "Cart and online card payment", "Orders received by email and WhatsApp", "On yourshop.mahu.cards (or your own domain)", "Hosting, HTTPS and updates included", "No commitment, cancel any month", "Live 7 days after first contact"] },
    perMonth: "per month",
    shopBadge: "New",
    choose: "Choose this plan",
    renew: (r: string) => `Websites, from year 2: domain + hosting + email renewal ${r}. No commitment.`,
    workTitle: "Our work",
    workSub: "Websites and platforms designed and launched by the MAHU team.",
    seeAll: "See the team's full portfolio",
    visit: "Visit site",
    stepsTitle: "How it works",
    steps: [
      { t: "Quote within 24 h", d: "Describe your business, we suggest the right plan." },
      { t: "50% deposit", d: "Secure online card payment. The rest when your site goes live." },
      { t: "Design and content", d: "We write and design; you approve or ask for changes." },
      { t: "Live in 7 days", d: "At most 7 days after first contact: domain, email and website live, with all your access." },
    ],
    faqTitle: "Frequently asked questions",
    faq: [
      { q: "Do I own the domain name?", a: "Yes. It is registered in your name or your company's. You keep it even if you change providers." },
      { q: "What happens after the first year?", a: (r: string) => `Domain, hosting and email renew for ${r}, no commitment. You can stop anytime.` },
      { q: "You are based in Dakar: how do we work together?", a: "Everything is remote: video calls, WhatsApp and email. We have partners and clients in Canada and adapt to your time zone." },
      { q: "I don't have texts or photos.", a: "No problem: we write the copy after a short call, and use royalty-free photos if you have none." },
      { q: "Can I update my website later?", a: "Small changes in the first month are free. After that we make them for you at a small fee, or train you to do them yourself." },
      { q: "How do I pay?", a: "By card online (secure payment). The deposit payment link is sent with your quote." },
    ],
    formTitle: "Get your free quote",
    formSub: "Reply within 24 h, by email or WhatsApp.",
    fName: "Your name",
    fContact: "Email or WhatsApp",
    fCompany: "Business and activity",
    fCompanyPh: "E.g. Belle Allure Salon, hairdresser in Toronto",
    fPlan: "Plan",
    fUnsure: "Not sure yet",
    fMsg: "Your project (optional)",
    fMsgPh: "What you want on the site, a site you like, a deadline…",
    send: "Send my request",
    sent: "Thank you! Your request has been sent. We will reply within 24 h.",
    err: "Sending failed. Message us on WhatsApp or at contact@mahu.cards.",
    payNow: "Pay the deposit online",
    powered: "Powered by",
  },
}

// Chiffres reels par plateforme. Source indiquee pour chacun ; ne rien ajouter sans source.
const STATS: { name: string; period: { fr: string; en: string }; items: { n: string; fr: string; en: string }[] }[] = [
  {
    name: "Mahu Cards",
    period: { fr: "déc. 2025 – oct. 2026", en: "Dec 2025 – Oct 2026" },
    items: [
      { n: "29", fr: "clients, dont 21 entreprises", en: "clients, 21 of them businesses" },
      { n: "584", fr: "visites réelles des profils clients", en: "real visits to client profiles" },
      { n: "59", fr: "prospects captés pour nos clients", en: "leads captured for our clients" },
    ],
  },
  // Source : Bilan Mahu 2026 (9 oct. 2026) ci-dessus ; MIAD : liste des boutiques Dokan (71 vendeurs),
  // presentation MIAD du 17 oct. 2026 (867 produits enrichis), bilan technique du 20 sept. 2026 (~19 pays).
  {
    name: "MIAD Market",
    period: { fr: "Canada · Sénégal · 2026", en: "Canada · Senegal · 2026" },
    items: [
      { n: "71", fr: "boutiques vendeurs sur la plateforme", en: "seller shops on the platform" },
      { n: "867", fr: "produits repris et enrichis (FR / EN)", en: "products migrated and enriched (FR / EN)" },
      { n: "~19", fr: "pays payables en mobile money, plus la carte", en: "countries paying by mobile money, plus cards" },
    ],
  },
]

const INCL_ICONS = [Globe, Server, Mail, Smartphone, MessageCircle, Search]

export function SitesWebView() {
  const [lang, setLang] = useState<Lang>("fr")
  const [country, setCountry] = useState<Country>("CA")
  const t = T[lang]
  const p = PRICES[country]

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-[#0b1020]">
      {/* Barre du haut */}
      <header className="sticky top-0 z-30 border-b border-black/5 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-black tracking-tight">
            <img src="/icons/icon-192.png" alt="" className="h-7 w-7 rounded-lg" />
            MAHU <span className="hidden font-semibold text-[#0a6cff] sm:inline">Web</span>
          </Link>
          <div className="flex items-center gap-2">
            <Toggle value={lang} onChange={(v) => setLang(v as Lang)} options={[{ v: "fr", l: "FR" }, { v: "en", l: "EN" }]} />
            <a href="#devis" className="hidden rounded-full bg-[#0a6cff] px-4 py-2 text-sm font-bold text-white hover:bg-[#0058d6] sm:inline-flex">
              {t.ctaQuote}
            </a>
          </div>
        </div>
      </header>

      {/* Accroche */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_85%_0%,rgba(10,108,255,.16),transparent_70%),radial-gradient(40%_40%_at_0%_100%,rgba(155,47,214,.10),transparent_70%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_.9fr] lg:py-20">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#0a6cff]">{t.kicker}</p>
            <h1 className="mt-4 text-4xl font-black leading-[1.02] tracking-tight sm:text-6xl">
              {t.h1a}
              <br />
              <span className="text-[#0a6cff]">{t.h1b}</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#4a5063]">{t.sub}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-[#4a5063]">{t.country} :</span>
              <Toggle value={country} onChange={(v) => setCountry(v as Country)} options={[{ v: "CA", l: "Canada" }, { v: "FR", l: "France" }]} />
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#devis" className="inline-flex items-center gap-2 rounded-full bg-[#0a6cff] px-6 py-3.5 font-bold text-white shadow-lg shadow-[#0a6cff]/25 hover:bg-[#0058d6]">
                {t.ctaQuote} <ArrowRight className="h-4 w-4" />
              </a>
              <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-6 py-3.5 font-bold hover:border-[#25D366] hover:text-[#128C4B]">
                <MessageCircle className="h-4 w-4" /> {t.ctaWa}
              </a>
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-[#4a5063]">
              {[Clock, Globe, ShieldCheck].map((Icon, i) => (
                <li key={i} className="flex items-center gap-1.5"><Icon className="h-4 w-4 text-[#0a6cff]" />{t.trust[i]}</li>
              ))}
            </ul>
          </div>
          {/* Apercu : navigateur avec un vrai projet */}
          <div className="relative">
            <div className="rounded-2xl border border-black/10 bg-white shadow-2xl shadow-black/10">
              <div className="flex items-center gap-1.5 border-b border-black/5 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-3 flex-1 truncate rounded-md bg-[#f1f3f7] px-3 py-1 text-xs text-[#5a6075]">https://votreentreprise{country === "CA" ? ".ca" : ".fr"}</span>
              </div>
              <img src={PROJECTS[0].img} alt="MIAD Market" className="aspect-[16/10] w-full rounded-b-2xl object-cover object-top" />
            </div>
            <div className="absolute -bottom-5 -left-3 flex items-center gap-3 rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-xl sm:-left-6">
              <div className="rounded-xl bg-[#0a6cff]/10 p-2 text-[#0a6cff]"><Mail className="h-5 w-5" /></div>
              <div className="text-sm"><b className="block">contact@votreentreprise{country === "CA" ? ".ca" : ".fr"}</b><span className="text-[#5a6075]">{t.incl[2].t}</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Ils nous ont fait confiance */}
      <section className="border-y border-black/5 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <p className="text-center text-xs font-extrabold uppercase tracking-[.18em] text-[#8a90a2]">{t.trustTitle}</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {CLIENTS.map((c) => {
              const inner = (
                <span className="flex flex-col items-center text-center">
                  <span className="text-lg font-black tracking-tight text-[#0b1020]">{c.name}</span>
                  <span className="text-xs font-semibold text-[#8a90a2]">{c.where}</span>
                </span>
              )
              return c.link ? (
                <a key={c.name} href={c.link} target="_blank" rel="noopener noreferrer" className="opacity-80 transition-opacity hover:opacity-100">{inner}</a>
              ) : (
                <span key={c.name} className="opacity-80">{inner}</span>
              )
            })}
          </div>
        </div>
      </section>

      {/* Resultats (chiffres verifies : voir STATS) */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{t.resultsTitle}</h2>
        <p className="mt-2 text-[#4a5063]">{t.resultsSub}</p>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {STATS.map((g) => (
            <div key={g.name} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-black">{g.name}</h3>
                <span className="text-[11px] font-semibold text-[#8a90a2]">{g.period[lang]}</span>
              </div>
              <dl className="mt-3 space-y-3">
                {g.items.map((it) => (
                  <div key={it.fr}>
                    <dt className="text-3xl font-black tracking-tight text-[#0a6cff]">{it.n}</dt>
                    <dd className="text-sm leading-snug text-[#5a6075]">{lang === "fr" ? it.fr : it.en}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
        <a href="https://miadmarket.ca" target="_blank" rel="noopener noreferrer" className="mt-4 flex flex-col gap-4 overflow-hidden rounded-2xl bg-[#0b1020] text-white sm:flex-row">
          <img src={PROJECTS[0].img} alt="MIAD Market" loading="lazy" className="aspect-[16/10] w-full object-cover object-top sm:w-72" />
          <div className="p-5 sm:py-6 sm:pr-6 sm:pl-0">
            <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#7cc4ff]">{t.caseTitle}</p>
            <p className="mt-2 leading-relaxed text-white/80">{t.caseText}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[#7cc4ff]">miadmarket.ca <ArrowRight className="h-3.5 w-3.5" /></span>
          </div>
        </a>
      </section>

      {/* Inclus */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{t.inclTitle}</h2>
        <p className="mt-2 max-w-2xl text-[#4a5063]">{t.inclSub}</p>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {t.incl.map((it, i) => {
            const Icon = INCL_ICONS[i]
            return (
              <div key={it.t} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                <div className="inline-flex rounded-xl bg-[#0a6cff]/10 p-2.5 text-[#0a6cff]"><Icon className="h-5 w-5" /></div>
                <h3 className="mt-3 font-bold">{it.t}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[#5a6075]">{it.d(p.tld)}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Forfaits */}
      <section id="forfaits" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{t.plansTitle}</h2>
            <p className="mt-2 text-[#4a5063]">{t.plansSub}</p>
          </div>
          <Toggle value={country} onChange={(v) => setCountry(v as Country)} options={[{ v: "CA", l: "Canada" }, { v: "FR", l: "France" }]} />
        </div>
        <div className="mt-6 rounded-2xl border border-[#f0561a]/25 bg-[#fff4ee] px-5 py-3 text-sm font-bold text-[#b8410f]">
          {t.opening(p.standard, OPENING_END[lang])}
        </div>
        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Plan badge={t.openingBadge} name={t.essentiel.name} audience={t.essentiel.for} price={p.essentiel} once={t.once} feats={t.essentiel.feats} cta={t.choose} plan="Essentiel" />
          <Plan badge={t.openingBadge} name={t.pro.name} audience={t.pro.for} price={p.pro} once={t.once} feats={t.pro.feats} cta={t.choose} plan="Pro" highlight={t.popular} />
          <Plan badge={t.shopBadge} name={t.shop.name} audience={t.shop.for} price={p.shop} once={t.perMonth} feats={t.shop.feats} cta={t.choose} plan="Boutique" />
        </div>
        <p className="mt-4 text-sm text-[#5a6075]">{t.renew(p.renew)}</p>
      </section>

      {/* Realisations */}
      <section className="bg-[#0b1020] py-16 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{t.workTitle}</h2>
              <p className="mt-2 text-white/65">{t.workSub}</p>
            </div>
            <a href="/portfolio/support520" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#7cc4ff] hover:underline">
              {t.seeAll} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PROJECTS.map((pr) => (
              <a key={pr.title} href={pr.link} target="_blank" rel="noopener noreferrer" className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[.04] hover:border-[#7cc4ff]/50">
                <div className="overflow-hidden">
                  <img src={pr.img} alt={pr.title} loading="lazy" className="aspect-[16/10] w-full object-cover object-top transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold">{pr.title}</h3>
                    <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/70">{pr.tags}</span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/65">{lang === "fr" ? pr.fr : pr.en}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#7cc4ff]">{t.visit} <ArrowRight className="h-3.5 w-3.5" /></span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Etapes */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{t.stepsTitle}</h2>
        <ol className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.steps.map((s, i) => (
            <li key={s.t} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <span className="text-sm font-black text-[#0a6cff]">0{i + 1}</span>
              <h3 className="mt-2 font-bold">{s.t}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[#5a6075]">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Devis */}
      <section id="devis" className="scroll-mt-16 mx-auto max-w-6xl px-4 pb-14 sm:px-6">
        <div className="grid gap-8 rounded-3xl bg-gradient-to-br from-[#0047d6] to-[#00a6ff] p-6 text-white sm:p-10 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <h2 className="text-3xl font-black tracking-tight">{t.formTitle}</h2>
            <p className="mt-2 text-white/80">{t.formSub}</p>
            <div className="mt-6 space-y-3 text-sm">
              <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-bold hover:underline"><MessageCircle className="h-4 w-4" /> WhatsApp +221 76 904 79 99</a>
              <a href="mailto:contact@mahu.cards" className="flex items-center gap-2 font-bold hover:underline"><Mail className="h-4 w-4" /> contact@mahu.cards</a>
              {PAYMENT_LINK && (
                <a href={PAYMENT_LINK} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-bold text-[#0047d6]"><CreditCard className="h-4 w-4" /> {t.payNow}</a>
              )}
            </div>
          </div>
          <QuoteForm t={t} country={country} />
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <h2 className="text-3xl font-black tracking-tight">{t.faqTitle}</h2>
        <div className="mt-6 divide-y divide-black/5 rounded-2xl border border-black/5 bg-white">
          {t.faq.map((f) => (
            <details key={f.q} className="group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
                {f.q}
                <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-[#5a6075]">{typeof f.a === "function" ? f.a(p.renew) : f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="border-t border-black/5 py-8 text-center text-sm text-[#5a6075]">
        {t.powered} <b className="font-black tracking-wider text-[#0b1020]">ABMCY · MAHU</b> · contact@mahu.cards
      </footer>
    </div>
  )
}

function Toggle({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div className="inline-flex rounded-full border border-black/10 bg-white p-1">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          aria-pressed={value === o.v}
          className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors ${value === o.v ? "bg-[#0b1020] text-white" : "text-[#5a6075] hover:text-[#0b1020]"}`}
        >
          {o.l}
        </button>
      ))}
    </div>
  )
}

function Plan({ badge, name, audience, price, once, feats, cta, plan, highlight }: { badge: string; name: string; audience: string; price: string; once: string; feats: string[]; cta: string; plan: string; highlight?: string }) {
  return (
    <div className={`relative flex flex-col rounded-3xl bg-white p-6 sm:p-8 ${highlight ? "border-2 border-[#0a6cff] shadow-xl shadow-[#0a6cff]/10" : "border border-black/5 shadow-sm"}`}>
      {highlight && <span className="absolute -top-3 left-6 rounded-full bg-[#0a6cff] px-3 py-1 text-xs font-bold text-white">{highlight}</span>}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-black">{name}</h3>
        <span className="rounded-full bg-[#fff4ee] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#b8410f]">{badge}</span>
      </div>
      <p className="mt-1 text-sm text-[#5a6075]">{audience}</p>
      <div className="mt-5 flex items-baseline gap-2">
        <span className="text-4xl font-black tracking-tight">{price}</span>
        <span className="text-sm font-semibold text-[#8a90a2]">{once}</span>
      </div>
      <ul className="mt-6 flex-1 space-y-2.5">
        {feats.map((f) => (
          <li key={f} className="flex gap-2.5 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0a6cff]" />{f}</li>
        ))}
      </ul>
      <a
        href={`#devis`}
        onClick={() => window.dispatchEvent(new CustomEvent("mahu-web-plan", { detail: plan }))}
        className={`mt-7 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 font-bold ${highlight ? "bg-[#0a6cff] text-white hover:bg-[#0058d6]" : "bg-[#0b1020] text-white hover:bg-black"}`}
      >
        {cta} <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  )
}

function QuoteForm({ t, country }: { t: (typeof T)["fr"]; country: Country }) {
  const [name, setName] = useState("")
  const [contact, setContact] = useState("")
  const [company, setCompany] = useState("")
  const [plan, setPlan] = useState("")
  const [msg, setMsg] = useState("")
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle")

  // Le bouton « Choisir ce forfait » preremplit le forfait.
  useEffect(() => {
    const on = (e: Event) => setPlan(String((e as CustomEvent).detail || ""))
    window.addEventListener("mahu-web-plan", on)
    return () => window.removeEventListener("mahu-web-plan", on)
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !contact.trim()) return
    setState("sending")
    try {
      const message = [
        `[Devis site web · ${country === "CA" ? "Canada" : "France"} · Forfait ${plan || "à définir"}]`,
        company.trim() && `Entreprise : ${company.trim()}`,
        msg.trim(),
      ].filter(Boolean).join("\n")
      const res = await api.handleLeadCapture({ profileUrl: LEAD_PROFILE, name: name.trim(), contact: contact.trim(), message })
      setState(res && (res as { success?: boolean }).success === false ? "error" : "sent")
    } catch {
      setState("error")
    }
  }

  if (state === "sent") {
    return <div className="flex items-center rounded-2xl bg-white/15 p-6 text-lg font-bold">{t.sent}</div>
  }
  const input = "w-full rounded-xl border border-white/25 bg-white/95 px-4 py-3 text-[#0b1020] placeholder:text-[#8a90a2] focus:outline-none focus:ring-2 focus:ring-white"
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold">{t.fName}<input required value={name} onChange={(e) => setName(e.target.value)} className={`${input} mt-1`} autoComplete="name" /></label>
      <label className="text-sm font-semibold">{t.fContact}<input required value={contact} onChange={(e) => setContact(e.target.value)} className={`${input} mt-1`} autoComplete="email" /></label>
      <label className="text-sm font-semibold sm:col-span-2">{t.fCompany}<input value={company} onChange={(e) => setCompany(e.target.value)} placeholder={t.fCompanyPh} className={`${input} mt-1`} /></label>
      <label className="text-sm font-semibold sm:col-span-2">{t.fPlan}
        <select value={plan} onChange={(e) => setPlan(e.target.value)} className={`${input} mt-1`}>
          <option value="">{t.fUnsure}</option>
          <option value="Essentiel">{t.essentiel.name}</option>
          <option value="Pro">{t.pro.name}</option>
          <option value="Boutique">{t.shop.name}</option>
        </select>
      </label>
      <label className="text-sm font-semibold sm:col-span-2">{t.fMsg}<textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={t.fMsgPh} rows={3} className={`${input} mt-1 resize-none`} /></label>
      <button type="submit" disabled={state === "sending"} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0b1020] px-6 py-3.5 font-bold text-white hover:bg-black disabled:opacity-60 sm:col-span-2">
        {state === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} {t.send}
      </button>
      {state === "error" && <p className="text-sm font-semibold text-white sm:col-span-2">{t.err}</p>}
    </form>
  )
}
