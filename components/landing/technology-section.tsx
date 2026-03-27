"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { Wifi, Radio } from "lucide-react"

const technologies = [
  {
    icon: Wifi,
    title: "Technologie NFC",
    description: "Le NFC (Near Field Communication) est une technologie de communication sans fil a courte portee. En approchant simplement votre carte d'un smartphone compatible, vos informations de contact sont transferees instantanement, sans aucune application requise.",
    features: ["Sans contact", "Instantane", "Universel"],
  },
  {
    icon: Radio,
    title: "Technologie RFID",
    description: "Le RFID (Radio-Frequency Identification) est la technologie de base qui permet a la puce de votre carte de communiquer. Nos cartes utilisent une puce NFC passive qui n'a pas besoin de batterie et est activee par le champ magnetique du telephone.",
    features: ["Sans batterie", "Durable", "Securise"],
  },
]

export function TechnologySection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="technology" className="py-24 relative" ref={ref}>
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Une Technologie Intuitive
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Decouvrez les technologies qui rendent nos cartes si puissantes.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {technologies.map((tech, index) => (
            <motion.div
              key={tech.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.2 }}
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
                className="group relative p-8 rounded-3xl bg-card/50 border border-border/50 backdrop-blur-sm h-full overflow-hidden"
              >
                {/* Animated gradient background */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                />
                
                {/* Floating circles animation */}
                <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-primary/5 blur-2xl group-hover:bg-primary/10 transition-colors duration-500" />
                
                <div className="relative z-10">
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                    className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20"
                  >
                    <tech.icon className="w-8 h-8 text-primary" />
                  </motion.div>
                  
                  <h3 className="text-2xl font-semibold mb-4 text-foreground">
                    {tech.title}
                  </h3>
                  
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    {tech.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {tech.features.map((feature) => (
                      <motion.span
                        key={feature}
                        whileHover={{ scale: 1.05 }}
                        className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm border border-primary/20"
                      >
                        {feature}
                      </motion.span>
                    ))}
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
