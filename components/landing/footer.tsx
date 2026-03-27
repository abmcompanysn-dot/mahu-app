"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Facebook, Twitter, Instagram, Linkedin, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

const footerLinks = {
  products: {
    title: "Produits & Services",
    links: [
      { label: "Solutions Entreprises", href: "#" },
      { label: "Cartes Individuelles", href: "#" },
      { label: "API", href: "#" },
    ],
  },
  resources: {
    title: "Blog & Guides",
    links: [
      { label: "Guide NFC", href: "#" },
      { label: "Cas d'usage", href: "#" },
      { label: "Tutoriels", href: "#" },
    ],
  },
  info: {
    title: "Informations",
    links: [
      { label: "Contact", href: "#" },
      { label: "FAQ", href: "#" },
      { label: "Conditions d'utilisation", href: "#" },
      { label: "Politique de confidentialite", href: "#" },
      { label: "Livraison", href: "#" },
    ],
  },
}

const socialLinks = [
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
]

export function Footer() {
  const [email, setEmail] = useState("")
  const [subscribed, setSubscribed] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubscribed(true)
    setEmail("")
    setTimeout(() => setSubscribed(false), 3000)
  }

  return (
    <footer className="relative pt-20 pb-10 border-t border-border/50">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="container mx-auto px-6 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-16">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-block mb-4">
              <motion.span
                whileHover={{ scale: 1.05 }}
                className="text-3xl font-bold text-foreground"
              >
                Mahu
              </motion.span>
            </Link>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Des cartes de visite intelligentes qui revolutionnent vos echanges professionnels.
            </p>
            
            {/* Newsletter */}
            <div className="max-w-sm">
              <p className="text-sm text-muted-foreground mb-3">
                Recevez nos dernieres astuces networking et mises a jour.
              </p>
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Votre email"
                  required
                  className="flex-1 px-4 py-2 rounded-xl bg-muted/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="rounded-xl bg-primary hover:bg-primary/90"
                  disabled={subscribed}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
              {subscribed && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-primary mt-2"
                >
                  Merci de votre inscription !
                </motion.p>
              )}
            </div>
          </div>

          {/* Links columns */}
          {Object.entries(footerLinks).map(([key, section]) => (
            <div key={key}>
              <h4 className="font-semibold text-foreground mb-4">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                    >
                      <motion.span
                        whileHover={{ x: 3 }}
                        transition={{ duration: 0.2 }}
                        className="inline-block"
                      >
                        {link.label}
                      </motion.span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom section */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-border/50">
          <p className="text-sm text-muted-foreground mb-4 md:mb-0">
            &copy; 2026 Mahu. Tous droits reserves.
          </p>
          
          {/* Social links */}
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => (
              <motion.a
                key={social.label}
                href={social.href}
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors"
                aria-label={social.label}
              >
                <social.icon className="w-5 h-5" />
              </motion.a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
