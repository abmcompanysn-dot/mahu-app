import { StudentsLanding } from "@/components/portfolio/students-landing"

// Offre etudiante : portfolio numerique + carte digitale professionnelle Mahu,
// valables un an, pour 3 500 FCFA (produit "portfolio-etudiant").
export const metadata = {
  title: "Portfolio étudiant · Mahu",
  description:
    "Ton portfolio en ligne avec les vidéos de tes réalisations et ta carte digitale professionnelle Mahu, valables un an, pour 3 500 FCFA. Réservé aux étudiants.",
}

export default function StudentsPage() {
  return <StudentsLanding />
}
