// Portfolio etudiant : donnees partagees par l'editeur du tableau de bord, la
// page publique /portfolio/[profil] et les modeles de demonstration.

export type PortfolioTemplate = "eclat" | "nuit" | "campus" | "atelier"

export const PORTFOLIO_TEMPLATES: Array<{ id: PortfolioTemplate; name: string; tagline: string }> = [
  { id: "eclat", name: "Éclat", tagline: "Clair et élégant, façon magazine" },
  { id: "nuit", name: "Nuit", tagline: "Noir et doré, le style Mahu" },
  { id: "campus", name: "Campus", tagline: "Coloré et vivant" },
  { id: "atelier", name: "Atelier", tagline: "Technique, pour l'informatique et l'ingénierie" },
]

export const PORTFOLIO_PRICE = "3 500 FCFA"

export interface PortfolioItem {
  title: string
  org?: string
  period?: string
  description?: string
  link?: string
  imageUrl?: string
}

export interface Portfolio {
  template: PortfolioTemplate
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
  template: "eclat", headline: "", about: "", school: "", field: "", level: "",
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
