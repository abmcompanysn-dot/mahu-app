"use client"

import { motion } from "framer-motion"
import { useState } from "react"
import { Check, QrCode, X } from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface ShareOption {
  icon: LucideIcon
  label: string
  action: string
}

interface ShareCardProps {
  options: ShareOption[]
  username?: string
}

export function ShareCard({ options, username = "" }: ShareCardProps) {
  const [copiedLink, setCopiedLink] = useState(false)
  const [showQR, setShowQR] = useState(false)

  const profileUrl = `https://mahu.cards/p/${username}`

  const handleAction = (action: string) => {
    switch (action) {
      case "copy":
        navigator.clipboard.writeText(profileUrl)
        setCopiedLink(true)
        setTimeout(() => setCopiedLink(false), 2000)
        break
      case "email":
        window.location.href = `mailto:?subject=Ma carte Mahu&body=Decouvrez ma carte de visite digitale : ${profileUrl}`
        break
      case "share":
        if (navigator.share) {
          navigator.share({
            title: "Ma carte Mahu",
            url: profileUrl,
          })
        }
        break
      case "qr":
        setShowQR(true)
        break
    }
  }

  return (
    <>
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
            mahu.cards/p/{username}
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

      {/* QR Modal */}
      {showQR && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowQR(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-card border border-border rounded-2xl p-6 max-w-sm w-full"
          >
            <button
              onClick={() => setShowQR(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
            
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <QrCode className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Votre QR Code</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Scannez ce code pour acceder a votre carte de visite
              </p>
              
              {/* QR Code */}
              <div className="bg-white p-4 rounded-xl mx-auto w-fit mb-4">
                <svg viewBox="0 0 41 41" className="w-48 h-48">
                  <rect fill="white" width="41" height="41"/>
                  <path d="M0,0h7v7H0V0zm1,1v5h5v-5H1zm1,1h3v3H2V2zm32,0h7v7h-7V0zm1,1v5h5v-5h-5zm1,1h3v3h-3V2zM0,34h7v7H0v-7zm1,1v5h5v-5H1zm1,1h3v3H2v-3zM8,0h1v2H8V0zm2,0h3v1h-3V0zm5,0h1v2h-1V0zm2,0h1v1h1v1h-1v1h-1V2h-1V1h1V0zm4,0h1v1h-1V0zm2,0h5v1h-1v1h-3V1h-1V0zm6,0h1v3h-1V0zm-20,1h1v1h1v1H9V2h1V1zm4,0h1v2h-1V1zm10,0h2v1h-2V1zM8,2h1v1H8V2zm4,0h1v2h1v1h-2V4h-1V3h1V2zm4,0h1v1h-1V2zm8,0h1v1h-1V2zm-16,1h1v2h1V4h1v1h-2V4h-1V3zm4,0h1v1h-1V3zm2,0h1v1h-1V3zm12,0h1v1h-1V3zm-14,1h1v1h-1V4zm4,0h1v2h-1V4zm5,0h1v1h-1V4zm4,0h1v1h-1V4zm-9,1h1v1h-1V5zm5,0h2v1h-2V5zm5,0h1v1h-1V5zM8,6h1v1H8V6zm2,0h1v1h-1V6zm5,0h1v1h-1V6zm3,0h1v1h-1V6zm3,0h1v1h-1V6zm4,0h1v2h2v1h-1v1h-1V9h-1V6zm-17,1h1v1H8V7zm4,0h1v1h-1V7zm4,0h1v1h-1V7zm2,0h2v1h-2V7zm7,0h1v1h-1V7zM0,8h1v1H0V8zm2,0h2v1H2V8zm3,0h2v1H5V8zm5,0h1v2h2V9h1v1h-1v1h-1v-1h-2v1H8v1H7V8h1v1h2V8zm7,0h1v1h-1V8zm2,0h1v2h-1V8zm2,0h1v1h1v1h-2V8zm6,0h1v2h-1V8zm-22,1h1v1H7V9zm6,0h1v1h-1V9zm5,0h1v1h-1V9zm2,0h1v1h-1V9zm2,0h1v1h-1V9zm6,0h4v1h-1v1h-1v-1h-2V9zM0,10h1v1h1v1H0v-2zm3,0h2v1H3v-1zm8,0h1v1h-1v-1zm4,0h2v1h-2v-1zm8,0h1v1h-1v-1zm-15,1h1v3h-1v-3zm4,0h1v1h-1v-1zm3,0h1v1h-1v-1zm6,0h1v1h-1v-1zm6,0h1v1h-1v-1zm-20,1h1v1h-1v-1zm2,0h1v1h-1v-1zm6,0h1v1h-1v-1zm3,0h1v1h-1v-1zm10,0h1v1h-1v-1zM0,13h2v1H0v-1zm3,0h1v1H3v-1zm5,0h1v1H8v-1zm5,0h2v1h-2v-1zm4,0h1v1h-1v-1zm10,0h1v1h-1v-1zm-25,1h1v1H7v-1zm2,0h1v1H9v-1zm4,0h2v1h-2v-1zm6,0h1v1h-1v-1zm2,0h2v2h-1v-1h-1v-1zm4,0h1v2h1v1h-2v-3zm5,0h1v3h-1v-3zM0,15h1v2H0v-2zm2,0h3v1H2v-1zm5,0h3v2h1v-1h1v3h-1v-1h-1v1H9v-1H8v-2H7v-1zm8,0h1v3h-1v-3zm3,0h1v1h1v1h-2v-2zm3,0h1v1h-1v-1zm2,0h1v1h-1v-1zM2,16h2v1H2v-1zm11,0h1v1h-1v-1zm4,0h1v1h-1v-1zm10,0h1v1h-1v-1zm-19,1h1v1H8v-1zm3,0h1v1h-1v-1zm2,0h1v1h-1v-1zm6,0h1v1h-1v-1zm4,0h1v1h-1v-1zM0,18h1v1H0v-1zm2,0h1v1H2v-1zm5,0h1v1H7v-1zm4,0h2v1h-2v-1zm4,0h1v1h-1v-1zm3,0h1v1h-1v-1zm2,0h1v2h-1v-2zm4,0h1v1h-1v-1zm-18,1h1v1H8v-1zm5,0h1v1h-1v-1zm9,0h1v1h-1v-1zm-15,1h3v1h1v1H9v-1H7v-1zm6,0h1v1h-1v-1zm5,0h1v1h-1v-1zm2,0h1v1h-1v-1zm5,0h1v1h-1v-1zM0,21h3v1H0v-1zm5,0h1v2h1v-1h1v2H7v1H6v2H5v-1H4v-1h1v-1H4v-2h1zm5,0h2v1h-2v-1zm5,0h1v2h-1v-2zm2,0h1v1h1v1h-1v1h-1v1h1v2h-1v-1h-1v-1h1v-1h-1v1h-1v-2h2v-1zm10,0h1v1h-1v-1zm-25,1h1v1H2v-1zm6,0h1v1h1v1H9v1H8v-3zm8,0h1v1h-1v-1zm3,0h1v3h-2v-1h1v-2zm3,0h1v2h-1v-2zm3,0h1v1h-1v-1zm-18,1h1v1H7v-1zm19,0h1v1h-1v-1zm-24,1h1v2H2v-2zm4,0h1v2H6v-2zm2,0h1v2H8v-2zm5,0h1v1h-1v-1zm2,0h1v2h-1v-2zm9,0h2v1h-2v-1zm-23,1h1v2H3v-2zm6,0h1v1H9v-1zm2,0h1v1h-1v-1zm3,0h1v1h-1v-1zm4,0h1v1h-1v-1zm5,0h2v1h-2v-1zm-13,1h2v1h-2v-1zm12,0h1v1h-1v-1zM0,27h1v1H0v-1zm4,0h1v1H4v-1zm2,0h1v1H6v-1zm4,0h1v1h-1v-1zm3,0h1v1h-1v-1zm2,0h2v1h-2v-1zm3,0h1v1h-1v-1zm2,0h1v2h-1v-2zm4,0h1v3h-1v-3zm4,0h2v2h-2v-2zm-27,1h1v1H3v-1zm4,0h1v1H7v-1zm5,0h1v1h-1v-1zm3,0h1v1h1v1h-2v-2zm10,0h1v1h-1v-1zM0,29h1v1H0v-1zm5,0h2v1H5v-1zm3,0h2v1H8v-1zm5,0h1v2h-1v-2zm3,0h1v2h-1v-2zm6,0h1v1h-1v-1zm3,0h1v1h-1v-1zm-17,1h2v1h1v3h-1v-1h-1v-2h-1v-1zm5,0h1v1h-1v-1zm8,0h1v2h-1v-2zm5,0h1v1h-1v-1zM8,31h4v1H8v-1zm10,0h1v1h-1v-1zm6,0h1v3h1v-1h1v2h-3v-4zM0,32h1v2h1v-1h2v1H3v2H2v-1H1v1H0v-4zm4,0h1v1H4v-1zm5,0h1v1H9v-1zm4,0h2v1h-2v-1zm4,0h1v1h-1v-1zm4,0h1v1h-1v-1zm3,0h1v1h-1v-1zm3,0h1v1h-1v-1zM8,33h2v1h1v-1h2v1h-1v1h2v1h-2v2h-1v-1H9v1H8v-4zm6,0h1v1h-1v-1zm5,0h1v1h-1v-1zm8,0h1v1h-1v-1zm-24,1h1v1H3v-1zm3,0h1v1H6v-1zm9,0h1v2h-1v-2zm2,0h1v1h-1v-1zm2,0h1v1h-1v-1zm2,0h1v2h-1v-2zm4,0h1v1h-1v-1zM4,35h1v1H4v-1zm9,0h1v1h-1v-1zm4,0h1v1h-1v-1zm4,0h1v2h1v1h-1v1h-1v-4zm2,0h1v1h-1v-1zm4,0h1v1h-1v-1zm-19,1h1v1H8v-1zm3,0h1v1h-1v-1zm4,0h1v1h-1v-1zm12,0h1v1h-1v-1zM0,37h2v1H0v-1zm4,0h4v1H4v-1zm5,0h1v2H9v-2zm4,0h1v1h-1v-1zm2,0h1v1h-1v-1zm2,0h1v1h-1v-1zm6,0h1v1h-1v-1zm5,0h1v1h1v1h-2v-2zm-25,1h1v3H8v-3zm3,0h2v1h-2v-1zm3,0h1v1h-1v-1zm5,0h1v1h-1v-1zm10,0h1v1h-1v-1zM0,39h1v2H0v-2zm2,0h3v1H2v-1zm10,0h1v1h-1v-1zm2,0h2v2h-2v-2zm6,0h1v1h-1v-1zm6,0h1v2h-1v-2zm-24,1h1v1H2v-1zm7,0h1v1H9v-1zm2,0h1v1h-1v-1zm5,0h1v1h-1v-1zm2,0h1v1h-1v-1zm5,0h1v1h-1v-1zm2,0h1v1h-1v-1z" fill="black"/>
                </svg>
              </div>
              
              <p className="text-sm text-muted-foreground">
                mahu.cards/p/{username}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  )
}
