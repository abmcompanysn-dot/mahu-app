"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"

// Placeholder brand names - in production, these would be actual logos
const brands = [
  { name: "TechCorp", letters: "TC" },
  { name: "InnovateCo", letters: "IC" },
  { name: "FutureLabs", letters: "FL" },
  { name: "DigitalFirst", letters: "DF" },
  { name: "CloudNine", letters: "C9" },
  { name: "DataDriven", letters: "DD" },
  { name: "SmartSolutions", letters: "SS" },
  { name: "NextGen", letters: "NG" },
  { name: "PrimeTech", letters: "PT" },
]

function BrandLogo({ brand }: { brand: typeof brands[0] }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, opacity: 1 }}
      className="flex-shrink-0 flex items-center gap-3 px-6 opacity-50 hover:opacity-100 transition-opacity cursor-pointer group"
    >
      <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center border border-border/50 group-hover:border-primary/30 group-hover:bg-primary/10 transition-all">
        <span className="text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors">
          {brand.letters}
        </span>
      </div>
      <span className="text-lg font-medium text-muted-foreground group-hover:text-foreground transition-colors">
        {brand.name}
      </span>
    </motion.div>
  )
}

export function LogoScroller() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  const duplicatedBrands = [...brands, ...brands]

  return (
    <section className="py-20 overflow-hidden" ref={ref}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          Approuve par les marques du monde entier
        </h2>
      </motion.div>

      <div className="relative">
        {/* Gradient masks */}
        <div className="absolute left-0 top-0 bottom-0 w-40 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-40 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        
        {/* Scrolling container */}
        <motion.div
          className="flex gap-8"
          animate={{
            x: [0, -1500],
          }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 25,
              ease: "linear",
            },
          }}
        >
          {duplicatedBrands.map((brand, index) => (
            <BrandLogo key={`${brand.name}-${index}`} brand={brand} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
