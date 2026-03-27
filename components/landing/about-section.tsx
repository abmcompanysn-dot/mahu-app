"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { Eye, Target, Leaf, Zap } from "lucide-react"

const aboutBlocks = [
  {
    icon: Eye,
    title: "Notre Vision",
    description: "Mahu est nee d'une idee simple : rendre le networking plus efficace, plus moderne et plus respectueux de l'environnement. Nous avons combine design et technologie pour creer un produit qui change la donne.",
    color: "from-primary/20 to-primary/5",
    iconColor: "text-primary",
  },
  {
    icon: Target,
    title: "Notre Mission",
    description: "Fournir a chaque professionnel un outil de networking puissant qui reflete son identite numerique. Simplifier le partage d'informations et creer des connexions durables grace a une technologie intuitive.",
    color: "from-emerald-500/20 to-emerald-500/5",
    iconColor: "text-emerald-500",
  },
  {
    icon: Leaf,
    title: "Notre Engagement",
    description: "Chaque carte Mahu remplace des milliers de cartes papier. Nous sommes engages pour un avenir durable ou la technologie sert la planete autant que les professionnels.",
    color: "from-amber-500/20 to-amber-500/5",
    iconColor: "text-amber-500",
  },
  {
    icon: Zap,
    title: "Notre Technologie",
    description: "Nous utilisons les dernieres avancees en matiere de NFC et de design d'experience utilisateur pour offrir une solution sans friction, instantanee et memorisable.",
    color: "from-cyan-500/20 to-cyan-500/5",
    iconColor: "text-cyan-500",
  },
]

export function AboutSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="about" className="py-24 relative" ref={ref}>
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />
      
      <div className="container mx-auto px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            A Propos de Mahu
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Nous reinventons la maniere dont les professionnels se connectent.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {aboutBlocks.map((block, index) => (
            <motion.div
              key={block.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <motion.div
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ duration: 0.3 }}
                className={`relative group p-8 rounded-3xl bg-gradient-to-br ${block.color} border border-white/5 backdrop-blur-sm h-full`}
              >
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative z-10">
                  <motion.div
                    whileHover={{ rotate: 5, scale: 1.1 }}
                    transition={{ duration: 0.3 }}
                    className={`w-14 h-14 rounded-2xl bg-background/50 backdrop-blur-sm flex items-center justify-center mb-6 border border-white/10`}
                  >
                    <block.icon className={`w-7 h-7 ${block.iconColor}`} />
                  </motion.div>
                  
                  <h3 className="text-xl font-semibold mb-3 text-foreground">
                    {block.title}
                  </h3>
                  
                  <p className="text-muted-foreground leading-relaxed">
                    {block.description}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
