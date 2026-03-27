"use client"

import { motion } from "framer-motion"
import { Linkedin, Mail, Phone, Globe, MapPin } from "lucide-react"

const socialLinks = [
  { icon: Linkedin, label: "LinkedIn", color: "#0077B5" },
  { icon: Mail, label: "Email", color: "#EA4335" },
  { icon: Phone, label: "Telephone", color: "#25D366" },
  { icon: Globe, label: "Site web", color: "#007AFF" },
]

export function PhonePreview() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      {/* Phone Frame */}
      <div className="relative mx-auto w-full max-w-[280px]">
        {/* Outer frame with realistic iPhone styling */}
        <div className="relative bg-[#1c1c1e] rounded-[45px] p-3 shadow-2xl">
          {/* Inner bezel */}
          <div className="relative bg-[#000] rounded-[38px] overflow-hidden">
            {/* Dynamic Island */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-7 bg-black rounded-full z-20" />
            
            {/* Screen content */}
            <div className="relative h-[520px] bg-background overflow-hidden">
              {/* Cover Image */}
              <div className="relative h-32 bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(0,122,255,0.3),transparent_50%)]" />
              </div>

              {/* Profile Section */}
              <div className="relative px-5 -mt-12">
                {/* Profile Picture */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border-4 border-background flex items-center justify-center mx-auto"
                >
                  <span className="text-2xl font-bold text-primary">JD</span>
                </motion.div>

                {/* Name & Title */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-center mt-3"
                >
                  <h3 className="text-lg font-bold text-foreground">Jean Dupont</h3>
                  <p className="text-sm text-muted-foreground">CEO & Fondateur</p>
                  <p className="text-xs text-primary mt-1">Mahu Technologies</p>
                </motion.div>

                {/* Bio */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-xs text-muted-foreground text-center mt-3 leading-relaxed"
                >
                  Passione par l&apos;innovation et le networking digital. Transformons ensemble vos connexions professionnelles.
                </motion.p>

                {/* Location */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.55 }}
                  className="flex items-center justify-center gap-1 mt-2 text-xs text-muted-foreground"
                >
                  <MapPin className="w-3 h-3" />
                  <span>Paris, France</span>
                </motion.div>
              </div>

              {/* Social Links */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="px-5 mt-5"
              >
                <div className="grid grid-cols-2 gap-2">
                  {socialLinks.map((link, index) => (
                    <motion.button
                      key={link.label}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.7 + index * 0.1 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 hover:border-primary/30 transition-all"
                    >
                      <link.icon className="w-4 h-4" style={{ color: link.color }} />
                      <span className="text-xs font-medium text-foreground">{link.label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Save Contact Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="px-5 mt-4"
              >
                <button className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors">
                  Enregistrer le contact
                </button>
              </motion.div>

              {/* QR Section */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="absolute bottom-0 left-0 right-0 px-5 py-4 bg-muted/30 backdrop-blur-sm border-t border-border/50"
              >
                <div className="flex items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-white p-1">
                    {/* Simple QR placeholder */}
                    <div className="w-full h-full grid grid-cols-5 gap-0.5">
                      {Array.from({ length: 25 }).map((_, i) => (
                        <div
                          key={i}
                          className={`${Math.random() > 0.5 ? "bg-black" : "bg-white"}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-medium text-foreground">Scanner pour sauvegarder</p>
                    <p className="text-xs text-muted-foreground">mahu.cards/jean-dupont</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Home indicator */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 bg-white/20 rounded-full" />
          </div>
        </div>

        {/* Reflection effect */}
        <div className="absolute -inset-4 bg-gradient-to-b from-primary/5 via-transparent to-transparent rounded-[55px] -z-10 blur-xl" />
      </div>

      {/* Label */}
      <p className="text-center text-sm text-muted-foreground mt-4">
        Apercu de votre carte
      </p>
    </motion.div>
  )
}
