"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { LayoutDashboard, Pencil, Users } from "lucide-react"

const features = [
  {
    icon: LayoutDashboard,
    title: "Tableau de Bord Intuitif",
    description: "Suivez en temps reel les performances de votre carte : nombre de vues, clics sur vos liens, et prospects generes. Prenez des decisions basees sur des donnees concretes.",
    gradient: "from-primary/20 via-primary/10 to-transparent",
  },
  {
    icon: Pencil,
    title: "Editeur de Profil en Direct",
    description: "Un changement de numero ou de poste ? Mettez a jour votre profil en quelques clics depuis votre espace personnel. Les modifications sont appliquees instantanement sur votre carte.",
    gradient: "from-emerald-500/20 via-emerald-500/10 to-transparent",
  },
  {
    icon: Users,
    title: "Gestion d'Equipe",
    description: "Deployez et gerez les cartes de tous vos collaborateurs depuis une interface centralisee. Assurez une coherence de marque et suivez les performances de votre equipe.",
    badge: "Bientot",
    gradient: "from-amber-500/20 via-amber-500/10 to-transparent",
  },
]

export function FeaturesSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="features" className="py-24 relative" ref={ref}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background to-background pointer-events-none" />
      
      <div className="container mx-auto px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Au-dela de la Carte
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Votre carte Mahu est la porte d&apos;entree vers une plateforme de gestion puissante, concue pour les professionnels modernes.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.15 }}
            >
              <motion.div
                whileHover={{ y: -10 }}
                transition={{ duration: 0.3 }}
                className="group relative h-full"
              >
                {/* Card */}
                <div className="relative p-8 rounded-3xl bg-card/30 border border-border/30 backdrop-blur-sm h-full overflow-hidden">
                  {/* Gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-b ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  
                  {/* Content */}
                  <div className="relative z-10">
                    {feature.badge && (
                      <span className="inline-block px-3 py-1 text-xs font-medium bg-primary/20 text-primary rounded-full mb-4 border border-primary/30">
                        {feature.badge}
                      </span>
                    )}
                    
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ duration: 0.3 }}
                      className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20 group-hover:bg-primary/20 transition-colors"
                    >
                      <feature.icon className="w-7 h-7 text-primary" />
                    </motion.div>
                    
                    <h3 className="text-xl font-semibold mb-3 text-foreground">
                      {feature.title}
                    </h3>
                    
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
