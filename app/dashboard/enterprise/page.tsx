"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Users, Building2, ShieldCheck, Crown, ChevronRight, CheckCircle2, Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"

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
    icon: ShieldCheck,
    title: "Vos donnees chez vous",
    description: "Le systeme est installe sur votre infrastructure : vos donnees ne sont pas gerees par Mahu.",
  },
]

export default function EnterprisePage() {
  const { role } = useAuth()

  if (role === "Entreprise") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-lg p-8 rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Crown className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Plan Entreprise actif</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Votre back-office vous attend</h1>
          <p className="text-muted-foreground mb-6">
            Gerez votre equipe, vos cartes et vos informations d&apos;entreprise depuis votre espace dedie.
          </p>
          <Link href="/enterprise-portal">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Ouvrir le back-office
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </motion.div>
      </div>
    )
  }

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
          L&apos;offre entreprise est un systeme sur mesure, installe chez vous : vos donnees restent dans votre
          entreprise et ne sont pas gerees par Mahu. Decrivez votre besoin, nous revenons vers vous avec une proposition.
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <EnterpriseContactForm />
      </motion.div>
    </div>
  )
}

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"

function EnterpriseContactForm() {
  const [form, setForm] = useState({
    company: "",
    contactName: "",
    email: "",
    phone: "",
    employeeCount: "",
    message: "",
  })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [key]: e.target.value })
    setError("")
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError("")
    try {
      const response = await fetch("/api/backend/api/enterprise-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || "Envoi impossible, reessayez.")
      }
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible, reessayez.")
    }
    setSending(false)
  }

  if (sent) {
    return (
      <div className="max-w-2xl mx-auto text-center p-8 rounded-2xl bg-card/50 border border-border/50">
        <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-primary" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Demande envoyee</h2>
        <p className="text-muted-foreground">Merci ! Notre equipe vous recontacte rapidement.</p>
      </div>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="max-w-2xl mx-auto p-6 md:p-8 rounded-2xl bg-card/50 border border-border/50 space-y-4"
    >
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-foreground mb-1">Demander une proposition</h2>
        <p className="text-muted-foreground">Reponse sous 48 h ouvrees.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <input required className={inputClass} placeholder="Nom de l'entreprise" value={form.company} onChange={set("company")} autoComplete="organization" />
        <input required className={inputClass} placeholder="Votre nom" value={form.contactName} onChange={set("contactName")} autoComplete="name" />
        <input required type="email" className={inputClass} placeholder="Email professionnel" value={form.email} onChange={set("email")} autoComplete="email" />
        <input required type="tel" className={inputClass} placeholder="Telephone" value={form.phone} onChange={set("phone")} autoComplete="tel" />
      </div>
      <select className={inputClass} value={form.employeeCount} onChange={set("employeeCount")} aria-label="Nombre de collaborateurs">
        <option value="">Nombre de collaborateurs</option>
        <option value="1-10">1 a 10</option>
        <option value="11-50">11 a 50</option>
        <option value="51-200">51 a 200</option>
        <option value="200+">Plus de 200</option>
      </select>
      <textarea
        rows={4}
        className={inputClass}
        placeholder="Decrivez votre besoin (nombre de cartes, controle d'acces, integration a vos outils...)"
        value={form.message}
        onChange={set("message")}
      />
      {error && <p className="text-sm text-destructive text-center">{error}</p>}
      <Button type="submit" disabled={sending} className="w-full py-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground">
        {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        Envoyer ma demande
      </Button>
    </form>
  )
}
