"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { BookOpen, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

// Guide de demarrage (livret A5 de 8 pages glisse avec la carte), aussi
// telechargeable sur mahu.cards. Le PDF est dans public/.
const GUIDE_URL = "/guide-demarrage-mahu.pdf"

const chapters = [
  "Activer votre carte (2 minutes)",
  "Creer votre profil",
  "Partager votre carte",
  "Recevoir des contacts sur WhatsApp",
  "Se connecter et installer l'application",
]

export function GuideSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="guide" className="py-24 relative" ref={ref}>
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="flex justify-center"
          >
            <a href={GUIDE_URL} target="_blank" rel="noopener noreferrer" aria-label="Ouvrir le guide de demarrage">
              <img
                src="/guide-couverture.jpg"
                alt="Couverture du guide de demarrage Mahu"
                width={520}
                height={736}
                loading="lazy"
                className="w-full max-w-[300px] h-auto rounded-2xl shadow-2xl shadow-primary/20 transition-transform duration-300 hover:-translate-y-1"
              />
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="min-w-0"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Guide de demarrage</h2>
            <p className="text-muted-foreground text-lg mb-6">
              Tout pour bien utiliser votre carte Mahu, en 8 pages. A imprimer ou a garder sur votre telephone.
            </p>
            <ol className="space-y-2 mb-8">
              {chapters.map((c, i) => (
                <li key={c} className="flex items-center gap-3 text-foreground">
                  <span className="w-7 h-7 shrink-0 rounded-full bg-primary/15 text-primary text-sm font-semibold flex items-center justify-center">
                    {i + 1}
                  </span>
                  {c}
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <a href={GUIDE_URL} download="Guide-de-demarrage-Mahu.pdf">
                  <Download className="w-4 h-4 mr-2" />
                  Telecharger le guide (PDF)
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={GUIDE_URL} target="_blank" rel="noopener noreferrer">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Le lire en ligne
                </a>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
