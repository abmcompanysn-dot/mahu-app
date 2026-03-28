"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight, Sparkles, Linkedin, Mail, Phone, Globe, MapPin, Eye, Users, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden py-20 lg:py-0">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/50 to-background z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,122,255,0.15),transparent_50%)]" />
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
      <div className="container mx-auto px-6 relative z-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left - Text */}
          <div className="text-center lg:text-left">
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
              className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight mb-6 text-balance"
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
              className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-10 text-pretty"
            >
              Creez et partagez votre carte de visite numerique NFC. 
              Moderne, ecologique, et toujours a jour. Un simple geste suffit.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
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

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1 }}
              className="mt-12 grid grid-cols-3 gap-8 max-w-md mx-auto lg:mx-0"
            >
              {[
                { value: "10K+", label: "Utilisateurs" },
                { value: "50K+", label: "Cartes partagees" },
                { value: "99%", label: "Satisfaction" },
              ].map((stat, i) => (
                <div key={i} className="text-center lg:text-left">
                  <p className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right - Device Previews */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="relative hidden lg:block"
          >
            {/* Dashboard Preview (Desktop) */}
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -left-10 top-10 w-[400px] rounded-2xl bg-card/80 border border-border/50 backdrop-blur-xl shadow-2xl overflow-hidden"
            >
              {/* Dashboard Header */}
              <div className="p-4 border-b border-border/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <span className="text-primary font-bold text-sm">M</span>
                  </div>
                  <span className="font-semibold text-foreground text-sm">Dashboard</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
              </div>
              {/* Dashboard Content */}
              <div className="p-4 space-y-3">
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: Eye, value: "1,234", label: "Vues" },
                    { icon: Users, value: "89", label: "Contacts" },
                    { icon: TrendingUp, value: "+24%", label: "Ce mois" },
                  ].map((stat, i) => (
                    <div key={i} className="p-2 rounded-xl bg-muted/30 border border-border/30">
                      <stat.icon className="w-4 h-4 text-primary mb-1" />
                      <p className="text-sm font-semibold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
                {/* Chart placeholder */}
                <div className="h-20 rounded-xl bg-muted/20 border border-border/30 flex items-end justify-around px-2 pb-2">
                  {[40, 65, 45, 80, 55, 70, 60].map((h, i) => (
                    <div
                      key={i}
                      className="w-4 rounded-t bg-primary/40"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Phone Preview */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="relative z-10 ml-auto w-[280px]"
            >
              {/* Phone Frame */}
              <div className="relative rounded-[3rem] bg-card border-4 border-secondary shadow-2xl overflow-hidden">
                {/* Dynamic Island */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-20" />
                
                {/* Screen Content */}
                <div className="pt-14 pb-6 px-4 min-h-[500px] bg-gradient-to-b from-primary/10 to-background">
                  {/* Cover */}
                  <div className="h-24 rounded-xl bg-gradient-to-r from-primary/30 to-primary/10 mb-[-40px] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent" />
                  </div>
                  
                  {/* Profile */}
                  <div className="relative text-center">
                    <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 border-4 border-background flex items-center justify-center mb-3">
                      <span className="text-2xl font-bold text-primary">JD</span>
                    </div>
                    <h3 className="text-lg font-bold text-foreground">Jean Dupont</h3>
                    <p className="text-sm text-muted-foreground">CEO & Fondateur</p>
                    <p className="text-xs text-muted-foreground">Mahu Technologies</p>
                    <div className="flex items-center justify-center gap-1 mt-2 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span>Paris, France</span>
                    </div>
                  </div>

                  {/* Social Links */}
                  <div className="mt-6 grid grid-cols-2 gap-2">
                    {[
                      { icon: Linkedin, label: "LinkedIn", color: "bg-blue-500/10 text-blue-400" },
                      { icon: Mail, label: "Email", color: "bg-primary/10 text-primary" },
                      { icon: Phone, label: "Telephone", color: "bg-green-500/10 text-green-400" },
                      { icon: Globe, label: "Site web", color: "bg-purple-500/10 text-purple-400" },
                    ].map((link, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-xl border border-border/30 flex items-center gap-2 ${link.color}`}
                      >
                        <link.icon className="w-4 h-4" />
                        <span className="text-xs font-medium">{link.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* QR Code hint */}
                  <div className="mt-4 p-3 rounded-xl bg-muted/30 border border-border/30 text-center">
                    <p className="text-xs text-muted-foreground">Scanner pour sauvegarder</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Floating elements */}
            <motion.div
              animate={{ y: [0, -8, 0], rotate: [0, 5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -right-5 top-1/2 w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center shadow-lg"
            >
              <Sparkles className="w-8 h-8 text-primary" />
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 hidden md:block"
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
