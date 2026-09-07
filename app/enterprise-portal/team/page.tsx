"use client"

import { useCallback, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Loader2, Plus, Trash2, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/use-auth"
import { api } from "@/lib/api"

interface TeamCard {
  ID_Unique: string
  Email: string
  Nom_Complet?: string
  Onboarding_Status?: string
}

export default function EnterprisePortalTeamPage() {
  const { token } = useAuth()
  const [cards, setCards] = useState<TeamCard[] | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", password: "" })
  const [submitting, setSubmitting] = useState(false)
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadTeam = useCallback(async () => {
    if (!token) return
    try {
      const res = await api.getTeamCards(token)
      const data = res as unknown as { success?: boolean; cards?: TeamCard[] }
      setCards(data.cards || [])
    } catch {
      setCards([])
    }
  }, [token])

  useEffect(() => {
    loadTeam()
  }, [loadTeam])

  const handleAddEmployee = async () => {
    if (!token || !form.email || !form.password) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await api.createEmployee(token, form)
      const data = res as unknown as { success?: boolean; error?: string }
      if (!data.success) {
        setError(data.error || "Erreur lors de la creation de l'employe.")
        return
      }
      setForm({ name: "", email: "", password: "" })
      setShowForm(false)
      await loadTeam()
    } catch {
      setError("Erreur lors de la creation de l'employe.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (email: string) => {
    if (!token) return
    setDeletingEmail(email)
    try {
      await api.deleteEmployee(token, email)
      await loadTeam()
    } finally {
      setDeletingEmail(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Equipe</h1>
          <p className="text-muted-foreground mt-1">Gerez les collaborateurs de votre organisation.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} className="gap-2">
          <Plus className="w-4 h-4" />
          Ajouter un employe
        </Button>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-card/50 border border-border/50 space-y-4"
        >
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nom</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Jean Dupont"
                className="h-11 bg-muted/50 border-border/50 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email *</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="jean@entreprise.com"
                className="h-11 bg-muted/50 border-border/50 rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Mot de passe *</label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Mot de passe temporaire"
                className="h-11 bg-muted/50 border-border/50 rounded-xl"
                required
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button
              onClick={handleAddEmployee}
              disabled={submitting || !form.email || !form.password}
              className="gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Creer
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              Annuler
            </Button>
          </div>
        </motion.div>
      )}

      <div className="rounded-2xl border border-border/50 bg-card/50 overflow-hidden">
        {cards === null ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : cards.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">Aucun employe pour le moment.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-left text-muted-foreground">
                <th className="px-6 py-3 font-medium">Nom</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => (
                <tr key={card.ID_Unique} className="border-b border-border/30 last:border-0">
                  <td className="px-6 py-3 text-foreground">{card.Nom_Complet || "—"}</td>
                  <td className="px-6 py-3 text-muted-foreground">{card.Email}</td>
                  <td className="px-6 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(card.Email)}
                      disabled={deletingEmail === card.Email}
                      className="text-destructive hover:text-destructive gap-2"
                    >
                      {deletingEmail === card.Email ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Retirer
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
