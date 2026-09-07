"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Building2, ChevronRight, IdCard, Loader2, Users } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { api } from "@/lib/api"

interface TeamCard {
  ID_Unique: string
  Email: string
  Nom_Complet?: string
}

export default function EnterprisePortalOverviewPage() {
  const { token } = useAuth()
  const [cards, setCards] = useState<TeamCard[] | null>(null)

  useEffect(() => {
    if (!token) return
    api.getTeamCards(token).then((res) => {
      const data = res as unknown as { success?: boolean; cards?: TeamCard[] }
      setCards(data.cards || [])
    }).catch(() => setCards([]))
  }, [token])

  const modules = [
    {
      href: "/enterprise-portal/team",
      icon: Users,
      title: "Equipe",
      description: "Ajoutez ou retirez des collaborateurs de votre organisation.",
    },
    {
      href: "/enterprise-portal/cards",
      icon: IdCard,
      title: "Cartes",
      description: "Consultez les cartes numeriques de toute votre equipe.",
    },
    {
      href: "/enterprise-portal/settings",
      icon: Building2,
      title: "Entreprise",
      description: "Nom, telephone et adresse de votre organisation.",
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Back-office entreprise</h1>
        <p className="text-muted-foreground mt-1">
          {cards === null ? (
            <span className="inline-flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Chargement de votre equipe...</span>
          ) : (
            `${cards.length} membre${cards.length > 1 ? "s" : ""} dans votre equipe.`
          )}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {modules.map((module, index) => (
          <motion.div
            key={module.href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link
              href={module.href}
              className="block h-full p-6 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm hover:border-primary/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <module.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-1">
                {module.title}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </h3>
              <p className="text-muted-foreground text-sm">{module.description}</p>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
