"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import QRCode from "qrcode"
import { Check, QrCode, X } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useSiteOrigin } from "@/hooks/use-site-origin"

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

  const { origin, host } = useSiteOrigin()
  const profileUrl = `${origin}/p/${username}`
  // Vrai QR code vers le profil (le ?source=QR Code alimente la stat "Scans").
  const [qrDataUrl, setQrDataUrl] = useState("")
  useEffect(() => {
    if (!username) return
    QRCode.toDataURL(`${profileUrl}?source=${encodeURIComponent("QR Code")}`, { margin: 1, width: 400 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""))
  }, [profileUrl, username])

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
            {host}/p/{username}
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
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrDataUrl} alt={`QR code vers ${profileUrl}`} className="w-48 h-48" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-sm text-muted-foreground">
                    Generation...
                  </div>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground mb-4">
                {host}/p/{username}
              </p>
              {qrDataUrl && (
                <a
                  href={qrDataUrl}
                  download={`qr-${username || "mahu"}.png`}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
                >
                  Telecharger le QR code
                </a>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  )
}
