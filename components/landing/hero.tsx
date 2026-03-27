"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Video/Gradient */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/50 to-background z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,122,255,0.15),transparent_50%)]" />
        {/* Animated gradient orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl"
        />
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 relative z-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8"
        >
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm text-primary font-medium">La nouvelle ere du networking</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 text-balance"
        >
          <span className="text-foreground">Votre identite.</span>
          <br />
          <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
            Reinventee.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 text-pretty"
        >
          Creez et partagez votre carte de visite numerique NFC. 
          Moderne, ecologique, et toujours a jour. Un simple geste suffit.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href="/login">
            <Button
              size="lg"
              className="group relative overflow-hidden bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg rounded-full"
            >
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: "-100%" }}
                whileHover={{ x: "100%" }}
                transition={{ duration: 0.6 }}
              />
              <span className="relative flex items-center gap-2">
                Commencer gratuitement
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Button>
          </Link>
          
          <Link href="#features">
            <Button
              size="lg"
              variant="outline"
              className="px-8 py-6 text-lg rounded-full border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all"
            >
              Decouvrir
            </Button>
          </Link>
        </motion.div>

        {/* Floating cards preview */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-20 relative"
        >
          <div className="relative mx-auto max-w-4xl">
            {/* Glass card mockups */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -left-4 md:left-10 top-10 w-48 md:w-64 h-28 md:h-36 rounded-2xl bg-gradient-to-br from-secondary/80 to-secondary/40 backdrop-blur-xl border border-border/50 shadow-2xl transform -rotate-12"
            >
              <div className="p-4">
                <div className="w-8 h-8 rounded-full bg-primary/30 mb-2" />
                <div className="w-24 h-2 rounded bg-foreground/20 mb-1" />
                <div className="w-16 h-2 rounded bg-foreground/10" />
              </div>
            </motion.div>
            
            <motion.div
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="relative z-10 mx-auto w-56 md:w-72 h-32 md:h-40 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur-xl border border-primary/30 shadow-2xl shadow-primary/20"
            >
              <div className="p-4 md:p-6">
                <div className="w-10 h-10 rounded-full bg-primary/40 mb-3" />
                <div className="w-32 h-3 rounded bg-foreground/30 mb-2" />
                <div className="w-20 h-2 rounded bg-foreground/15" />
              </div>
            </motion.div>
            
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -right-4 md:right-10 top-5 w-48 md:w-64 h-28 md:h-36 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 backdrop-blur-xl border border-border/50 shadow-2xl transform rotate-12"
            >
              <div className="p-4">
                <div className="w-8 h-8 rounded-full bg-foreground/20 mb-2" />
                <div className="w-24 h-2 rounded bg-foreground/20 mb-1" />
                <div className="w-16 h-2 rounded bg-foreground/10" />
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-6 h-10 rounded-full border-2 border-foreground/30 flex items-start justify-center p-2"
        >
          <motion.div
            animate={{ y: [0, 8, 0], opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1.5 h-3 bg-foreground/50 rounded-full"
          />
        </motion.div>
      </motion.div>
    </section>
  )
}
