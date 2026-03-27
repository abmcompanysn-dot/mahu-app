"use client"

import { motion } from "framer-motion"
import { useState } from "react"
import { Check } from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface ShareOption {
  icon: LucideIcon
  label: string
  action: string
}

interface ShareCardProps {
  options: ShareOption[]
}

export function ShareCard({ options }: ShareCardProps) {
  const [copiedLink, setCopiedLink] = useState(false)

  const handleAction = (action: string) => {
    switch (action) {
      case "copy":
        navigator.clipboard.writeText("https://mahu.cards/jean-dupont")
        setCopiedLink(true)
        setTimeout(() => setCopiedLink(false), 2000)
        break
      case "email":
        window.location.href = "mailto:?subject=Ma carte Mahu&body=Découvrez ma carte de visite digitale : https://mahu.cards/jean-dupont"
        break
      case "share":
        if (navigator.share) {
          navigator.share({
            title: "Ma carte Mahu",
            url: "https://mahu.cards/jean-dupont",
          })
        }
        break
      case "qr":
        // Open QR modal
        break
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="p-6 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm"
    >
      <h3 className="text-lg font-semibold text-foreground mb-4">Partager votre carte</h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {options.map((option, index) => (
          <motion.button
            key={option.action}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + index * 0.1 }}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleAction(option.action)}
            className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all"
          >
            {option.action === "copy" && copiedLink ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="p-2 rounded-lg bg-emerald-500/20"
              >
                <Check className="w-5 h-5 text-emerald-500" />
              </motion.div>
            ) : (
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <option.icon className="w-5 h-5 text-primary" />
              </div>
            )}
            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              {option.action === "copy" && copiedLink ? "Copie !" : option.label}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Quick link display */}
      <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-muted/30 border border-border/50">
        <span className="flex-1 text-sm text-muted-foreground truncate">
          mahu.cards/jean-dupont
        </span>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleAction("copy")}
          className="px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
        >
          {copiedLink ? "Copie !" : "Copier"}
        </motion.button>
      </div>
    </motion.div>
  )
}
