"use client"

import { motion } from "framer-motion"
import { Users, Building2, CreditCard, Crown, ChevronRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

const features = [
  {
    icon: Users,
    title: "Gestion d'equipe",
    description: "Creez et gerez les cartes de tous vos collaborateurs depuis une interface centralisee.",
  },
  {
    icon: Building2,
    title: "Coherence de marque",
    description: "Appliquez automatiquement votre charte graphique a toutes les cartes de votre entreprise.",
  },
  {
    icon: CreditCard,
    title: "Facturation centralisee",
    description: "Une seule facture pour toute votre organisation, avec des prix degressifs.",
  },
]

const plans = [
  {
    name: "Starter",
    price: "29",
    period: "/mois",
    description: "Pour les petites equipes",
    features: [
      "Jusqu'a 5 utilisateurs",
      "Cartes personnalisees",
      "Statistiques de base",
      "Support email",
    ],
  },
  {
    name: "Business",
    price: "79",
    period: "/mois",
    description: "Pour les entreprises en croissance",
    popular: true,
    features: [
      "Jusqu'a 25 utilisateurs",
      "Cartes premium",
      "Statistiques avancees",
      "Support prioritaire",
      "API access",
      "Branding personnalise",
    ],
  },
  {
    name: "Enterprise",
    price: "Sur mesure",
    period: "",
    description: "Pour les grandes organisations",
    features: [
      "Utilisateurs illimites",
      "Tout Business inclus",
      "SSO & SCIM",
      "Account manager dedie",
      "SLA garanti",
      "Integration sur mesure",
    ],
  },
]

export default function EnterprisePage() {
  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-3xl mx-auto"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
          <Crown className="w-4 h-4 text-primary" />
          <span className="text-sm text-primary font-medium">Solutions Entreprise</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Equipez toute votre equipe avec Mahu
        </h1>
        <p className="text-lg text-muted-foreground">
          Deployez des cartes de visite numeriques pour tous vos collaborateurs et centralisez la gestion de votre reseau professionnel.
        </p>
      </motion.div>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid md:grid-cols-3 gap-6"
      >
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            whileHover={{ y: -5 }}
            className="p-6 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <feature.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
            <p className="text-muted-foreground">{feature.description}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Pricing */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-2xl font-bold text-foreground text-center mb-8">
          Choisissez votre plan
        </h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              whileHover={{ y: -5 }}
              className={`relative p-6 rounded-2xl backdrop-blur-sm ${
                plan.popular
                  ? "bg-primary/10 border-2 border-primary"
                  : "bg-card/50 border border-border/50"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    <Sparkles className="w-3 h-3" />
                    Populaire
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-1">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-foreground">
                    {plan.price.includes("Sur") ? "" : "€"}{plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-muted-foreground">{plan.period}</span>
                  )}
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full ${
                  plan.popular
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                    : "bg-muted/50 hover:bg-muted text-foreground"
                }`}
              >
                {plan.price.includes("Sur") ? "Nous contacter" : "Commencer"}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-center p-8 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20"
      >
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Besoin d&apos;une solution personnalisee ?
        </h3>
        <p className="text-muted-foreground mb-6">
          Notre equipe commerciale est disponible pour discuter de vos besoins specifiques.
        </p>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
          Prendre rendez-vous
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </motion.div>
    </div>
  )
}
