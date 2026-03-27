"use client"

import { motion, useInView } from "framer-motion"
import { useRef, useState } from "react"

const cardDesigns = [
  { id: 1, gradient: "from-slate-800 to-slate-900", accent: "bg-primary" },
  { id: 2, gradient: "from-zinc-800 to-zinc-900", accent: "bg-emerald-500" },
  { id: 3, gradient: "from-neutral-800 to-neutral-900", accent: "bg-amber-500" },
  { id: 4, gradient: "from-stone-800 to-stone-900", accent: "bg-rose-500" },
  { id: 5, gradient: "from-gray-800 to-gray-900", accent: "bg-cyan-500" },
]

function Card3D({ design, index }: { design: typeof cardDesigns[0]; index: number }) {
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    
    setRotateX((y - centerY) / 10)
    setRotateY((centerX - x) / 10)
  }

  const handleMouseLeave = () => {
    setRotateX(0)
    setRotateY(0)
  }

  return (
    <motion.div
      className="relative flex-shrink-0 cursor-pointer perspective-1000"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transformStyle: "preserve-3d",
      }}
      whileHover={{ scale: 1.05, z: 50 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className={`w-80 h-48 rounded-2xl bg-gradient-to-br ${design.gradient} border border-white/10 shadow-2xl overflow-hidden`}
        style={{
          rotateX: rotateX,
          rotateY: rotateY,
          transformStyle: "preserve-3d",
        }}
        transition={{ duration: 0.1 }}
      >
        {/* Card content */}
        <div className="p-6 h-full flex flex-col justify-between relative">
          {/* Shine effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            style={{
              transform: `translateX(${rotateY * 2}px) translateY(${-rotateX * 2}px)`,
            }}
          />
          
          <div className="flex items-start justify-between">
            <div className={`w-12 h-12 rounded-xl ${design.accent} flex items-center justify-center`}>
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <div className="flex gap-1">
              <div className="w-6 h-4 rounded bg-white/20" />
              <div className="w-6 h-4 rounded bg-white/10" />
            </div>
          </div>
          
          <div>
            <div className="w-32 h-3 bg-white/30 rounded mb-2" />
            <div className="w-24 h-2 bg-white/20 rounded mb-1" />
            <div className="w-40 h-2 bg-white/10 rounded" />
          </div>
        </div>

        {/* NFC indicator */}
        <div className="absolute bottom-4 right-4">
          <svg className="w-6 h-6 text-white/30" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
            <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
            <circle cx="12" cy="12" r="2"/>
          </svg>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function CardShowcase() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  const duplicatedCards = [...cardDesigns, ...cardDesigns]

  return (
    <section id="card-showcase" className="py-24 overflow-hidden" ref={ref}>
      <div className="container mx-auto px-6 mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-balance">
            Un Visage de Nos Cartes
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Decouvrez quelques-uns des designs elegants et professionnels que nous proposons.
          </p>
        </motion.div>
      </div>

      {/* Infinite scroll carousel */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10" />
        
        <motion.div
          className="flex gap-6 py-4"
          animate={{
            x: [0, -1920],
          }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 30,
              ease: "linear",
            },
          }}
          whileHover={{ animationPlayState: "paused" }}
        >
          {duplicatedCards.map((design, index) => (
            <Card3D key={`${design.id}-${index}`} design={design} index={index} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
