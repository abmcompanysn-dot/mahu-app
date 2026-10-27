// Portfolio etudiant : donnees partagees par l'editeur du tableau de bord, la
// page publique /portfolio/[profil] et les modeles de demonstration.

// "motion" : modele anime sur mesure, absent du choix public (PORTFOLIO_TEMPLATES).
export type PortfolioTemplate = "eclat" | "nuit" | "campus" | "atelier" | "plan" | "motion"

export const PORTFOLIO_TEMPLATES: Array<{ id: PortfolioTemplate; name: string; tagline: string }> = [
  { id: "eclat", name: "Éclat", tagline: "Clair et élégant, façon magazine" },
  { id: "nuit", name: "Nuit", tagline: "Noir et doré, le style Mahu" },
  { id: "campus", name: "Campus", tagline: "Coloré et vivant" },
  { id: "atelier", name: "Atelier", tagline: "Technique, pour l'informatique et l'ingénierie" },
  { id: "plan", name: "Plan", tagline: "Mécanique, mécatronique et procédés de fabrication" },
]

export const PORTFOLIO_PRICE = "3 500 FCFA"

export interface PortfolioItem {
  title: string
  org?: string
  period?: string
  description?: string
  link?: string
  imageUrl?: string
  /** Video de realisation : lien YouTube / Vimeo ou fichier (Cloudinary). */
  videoUrl?: string
  /** Outils, machines et logiciels utilises (separes par des virgules). */
  tools?: string
}

export interface Portfolio {
  template: PortfolioTemplate
  /** Metier affiche sous le nom et sur la carte imprimee (ex. « Technicien en mecatronique »). */
  title?: string
  headline: string
  about: string
  school: string
  field: string
  level: string
  skills: string[]
  languages: string[]
  projects: PortfolioItem[]
  experiences: PortfolioItem[]
  education: PortfolioItem[]
  /** Chiffres cles : title = valeur ("10+"), description = libelle. */
  highlights?: PortfolioItem[]
  /** Presence dans le monde : title = pays, org = comptes, period = vendeurs. */
  reach?: PortfolioItem[]
  cvUrl?: string
  published: boolean
  expiresAt?: string
}

/** Ce qu'affiche un modele : le portfolio + l'identite de la carte Mahu. */
export interface PortfolioView extends Portfolio {
  name: string
  photo: string
  email: string
  phone: string
  location: string
  links: Array<{ type: string; url: string }>
  profileUrl: string
}

export const emptyPortfolio = (): Portfolio => ({
  template: "eclat", title: "", headline: "", about: "", school: "", field: "", level: "",
  skills: [], languages: [], projects: [], experiences: [], education: [], cvUrl: "", published: true,
})

interface ProfileLike {
  Nom_Complet?: string
  URL_Photo?: string
  Email?: string
  Telephone?: string
  Location?: string
  Liens_Sociaux_JSON?: string
  Mode_Confidentiel?: string
}

export function toView(portfolio: Portfolio, profile: ProfileLike | null | undefined, profileUrl: string): PortfolioView {
  let links: PortfolioView["links"] = []
  try {
    links = JSON.parse(profile?.Liens_Sociaux_JSON || "[]").filter((l: { url?: string }) => l?.url)
  } catch {
    links = []
  }
  return {
    ...emptyPortfolio(),
    ...portfolio,
    name: profile?.Nom_Complet || "",
    photo: profile?.URL_Photo || "",
    email: profile?.Email || "",
    phone: profile?.Telephone || "",
    location: profile?.Location || "",
    links,
    profileUrl,
  }
}

/** Exemple de demonstration (page "modeles"), clairement presente comme tel. */
export const SAMPLE_PORTFOLIO: PortfolioView = {
  template: "eclat",
  name: "Awa Diop",
  title: "Développeuse web et mobile",
  photo: "/portfolio/demo-awa.jpg",
  headline: "Étudiante en informatique, passionnée de design d'applications",
  about:
    "Je conçois des applications simples et utiles pour les commerçants de Dakar. Je cherche un stage de fin d'études en développement web ou mobile.",
  school: "Université Cheikh Anta Diop",
  field: "Informatique",
  level: "Licence 3",
  skills: ["React", "Kotlin", "Figma", "SQL", "Gestion de projet", "Prise de parole"],
  languages: ["Français", "Wolof", "Anglais"],
  projects: [
    {
      title: "Boutik — caisse mobile pour commerçants",
      description: "Application Android pour suivre les ventes et le stock d'une boutique, même sans internet.",
      link: "https://example.com",
      imageUrl: "/portfolio/demo-projet-2.jpg",
      videoUrl: "/portfolio/demo-boutik.mp4",
    },
    {
      title: "Site de l'association des étudiants",
      description: "Refonte du site : agenda des événements, inscriptions en ligne, page des bureaux.",
      link: "https://example.com",
      imageUrl: "/portfolio/demo-projet-1.jpg",
    },
    {
      title: "Hackathon Dakar 2026 — 2e place",
      description: "Prototype d'une appli de covoiturage entre étudiants, réalisé en 48 heures en équipe de 4.",
    },
  ],
  experiences: [
    { title: "Stage développeuse web", org: "Agence digitale, Dakar", period: "Juil. – Sept. 2026", description: "Intégration de sites vitrines et maintenance de boutiques en ligne." },
    { title: "Trésorière", org: "Club informatique de l'université", period: "2025 – 2026" },
  ],
  education: [
    { title: "Licence 3 Informatique", org: "Université Cheikh Anta Diop", period: "2024 – 2027" },
    { title: "Baccalauréat S2", org: "Lycée Blaise Diagne", period: "2024" },
  ],
  cvUrl: "",
  published: true,
  email: "awa.diop@exemple.sn",
  phone: "+221 77 000 00 00",
  location: "Dakar, Sénégal",
  links: [
    { type: "linkedin", url: "https://linkedin.com" },
    { type: "website", url: "https://example.com" },
  ],
  profileUrl: "awa-diop",
}

/** Exemple du modele Plan : etudiant en mecatronique. */
export const SAMPLE_MECA: PortfolioView = {
  template: "plan",
  name: "Ibrahima Sarr",
  title: "Technicien en mécatronique",
  photo: "/portfolio/demo-ibrahima.jpg",
  headline: "Technicien en mécatronique : conception, usinage et maintenance de systèmes automatisés",
  about:
    "Je conçois des pièces en CAO, je les fabrique à l'atelier et je mets en service des systèmes automatisés. Je cherche un stage en maintenance industrielle ou en bureau d'études.",
  school: "Institut supérieur d'enseignement technique",
  field: "Mécatronique",
  level: "BTS 2e année",
  skills: ["SolidWorks", "AutoCAD", "Tournage", "Fraisage CN", "Soudure MIG / TIG", "Automates Siemens", "Pneumatique", "Lecture de plans", "Métrologie", "GMAO"],
  languages: ["Français", "Wolof", "Anglais technique"],
  projects: [
    {
      title: "Bras robotisé 4 axes pour le tri de pièces",
      description: "Conception, impression 3D des pièces, câblage et programmation. Le bras trie 12 pièces par minute selon leur couleur.",
      tools: "SolidWorks, impression 3D, Arduino, servomoteurs, capteur couleur",
      link: "https://example.com",
      imageUrl: "/portfolio/demo-meca-robot.jpg",
      videoUrl: "/portfolio/demo-meca-robot.mp4",
    },
    {
      title: "Axe de réducteur usiné au tour",
      description: "Réalisation d'après plan coté, tolérance ±0,02 mm, contrôle au micromètre et rapport de métrologie.",
      tools: "Tour conventionnel, fraiseuse CN, micromètre, cotation ISO",
      imageUrl: "/portfolio/demo-meca-tour.jpg",
    },
    {
      title: "Remise en état d'un groupe motopompe",
      description: "Diagnostic, démontage, remplacement des roulements et des joints, essais avant remise en service.",
      tools: "Extracteurs, clé dynamométrique, analyse vibratoire",
      imageUrl: "/portfolio/demo-meca-maintenance.jpg",
    },
  ],
  experiences: [
    { title: "Stage technicien de maintenance", org: "Usine agroalimentaire, Rufisque", period: "Juin – Août 2026", description: "Maintenance préventive d'une ligne d'embouteillage, suivi des interventions dans la GMAO." },
    { title: "Responsable atelier", org: "Club robotique de l'institut", period: "2025 – 2026" },
  ],
  education: [
    { title: "BTS Mécatronique", org: "Institut supérieur d'enseignement technique", period: "2025 – 2027" },
    { title: "Bac technique — génie mécanique", org: "Lycée technique", period: "2025" },
  ],
  cvUrl: "",
  published: true,
  email: "ibrahima.sarr@exemple.sn",
  phone: "+221 77 000 00 00",
  location: "Thiès, Sénégal",
  links: [{ type: "linkedin", url: "https://linkedin.com" }],
  profileUrl: "ibrahima-sarr",
}

/** Exemple a montrer pour un modele donne. */
export function sampleFor(template: PortfolioTemplate): PortfolioView {
  return template === "plan" ? SAMPLE_MECA : { ...SAMPLE_PORTFOLIO, template }
}

/** Lecteur a utiliser pour une video de projet, ou null si le lien n'est pas lisible. */
export function videoEmbed(url?: string): { kind: "iframe" | "file"; src: string } | null {
  if (!url) return null
  let u: URL
  try {
    u = new URL(url, "https://call.mahu.cards")
  } catch {
    return null
  }
  const host = u.hostname.replace(/^www\.|^m\./, "")
  const youtube = (id?: string | null) =>
    id && /^[\w-]{6,20}$/.test(id) ? { kind: "iframe" as const, src: `https://www.youtube-nocookie.com/embed/${id}?rel=0` } : null
  if (host === "youtu.be") return youtube(u.pathname.slice(1))
  if (host === "youtube.com") return youtube(u.searchParams.get("v") || u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]+)/)?.[1])
  if (host === "vimeo.com") {
    const id = u.pathname.match(/^\/(\d+)/)?.[1]
    return id ? { kind: "iframe", src: `https://player.vimeo.com/video/${id}` } : null
  }
  if (/\.(mp4|webm|mov|m4v)$/i.test(u.pathname) || host === "res.cloudinary.com") return { kind: "file", src: url.startsWith("/") ? url : u.href }
  return null
}
