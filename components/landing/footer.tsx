"use client"

import { motion } from "framer-motion"
import Link from "next/link"

const footerLinks = {
  products: {
    title: "Produits & Services",
    links: [
      { label: "Commander ma Smart Card", href: "/register" },
      { label: "Se connecter", href: "/login" },
    ],
  },
  resources: {
    title: "Aide",
    links: [
      { label: "Documentation", href: "/documentation" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  info: {
    title: "Informations",
    links: [
      { label: "Contact", href: "mailto:contact@mahu.cards" },
      { label: "Conditions d'utilisation", href: "/conditions-utilisation" },
      { label: "Politique de confidentialite", href: "/confidentialite" },
      { label: "Livraison", href: "/livraison" },
    ],
  },
}

export function Footer() {
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
          
        </div>
      </div>
    </footer>
  )
}
