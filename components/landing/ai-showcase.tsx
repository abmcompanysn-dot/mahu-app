"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { CreditCard, MessagesSquare, ScanFace } from "lucide-react"
import { AiLogo } from "@/components/ai/ai-logo"

const aiCards = [
  {
    icon: MessagesSquare,
    title: "Chat multi-modeles",
    description: "Discute avec plusieurs IA (Llama, GPT, Claude...) depuis une seule interface, avec un historique qui te suit sur tous tes appareils.",
    gradient: "from-primary/20 via-primary/10 to-transparent",
  },
  {
    icon: CreditCard,
    title: "Abonnements flexibles",
    description: "Commence gratuitement, puis debloque plus de modeles et de credits avec les paliers Premium et Pro, payes en un clic via PayDunya.",
    gradient: "from-amber-500/20 via-amber-500/10 to-transparent",
  },
  {
    icon: ScanFace,
    title: "Connexion par carte",
    description: "Genere ta carte IA personnelle et reconnecte-toi sans mot de passe, en verifiant simplement ton visage depuis n'importe quel telephone.",
    badge: "Nouveau",
    gradient: "from-violet-500/20 via-violet-500/10 to-transparent",
  },
]

export function AiShowcase() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="ai-mode" className="py-24 relative" ref={ref}>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background to-background pointer-events-none" />

      <div className="container mx-auto px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center mb-16"
        >
          <AiLogo animated size="lg" className="mb-6" />
          <h2 className="text-3xl md:text-5xl font-bold mb-4">AI MAHU</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            L&apos;intelligence artificielle pour tous, directement integree a ta carte Mahu.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {aiCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.15 }}
            >
              <motion.div whileHover={{ y: -10 }} transition={{ duration: 0.3 }} className="group relative h-full">
                <div className="relative p-8 rounded-3xl bg-card/30 border border-border/30 backdrop-blur-sm h-full overflow-hidden">
                  <div
                    className={`absolute inset-0 bg-gradient-to-b ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                  />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <card.icon className="w-6 h-6 text-primary" />
                      </div>
                      {card.badge && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded-full">
                          {card.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">{card.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{card.description}</p>
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
