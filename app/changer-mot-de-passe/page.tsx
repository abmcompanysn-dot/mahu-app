"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, Lock, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { MUST_CHANGE_PASSWORD_KEY } from "@/contexts/auth-context"

// Premiere connexion d'un compte livre avec le mot de passe provisoire
// (mahu1234@, guide glisse avec la carte) : le client choisit le sien avant
// d'acceder au tableau de bord (voir legacyChangePassword cote backend).
export default function ChangePasswordPage() {
  const router = useRouter()
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!localStorage.getItem("mahu_token")) router.replace("/login")
  }, [router])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (next.length < 8) return setError("Le nouveau mot de passe doit contenir au moins 8 caractères.")
    if (next !== confirm) return setError("Les deux mots de passe ne correspondent pas.")
    const token = localStorage.getItem("mahu_token")
    if (!token) return router.replace("/login")
    setLoading(true)
    try {
      const res = await api.changePassword(token, current, next)
      if (res.success) {
        localStorage.removeItem(MUST_CHANGE_PASSWORD_KEY)
        router.replace("/dashboard")
        return
      }
      setError(res.error || "Le mot de passe n'a pas pu être changé.")
    } catch {
      setError("Erreur de connexion au serveur.")
    }
    setLoading(false)
  }

  const type = show ? "text" : "password"
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-border/50 bg-card/60 p-8 space-y-5">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/15 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Choisissez votre mot de passe</h1>
          <p className="text-sm text-muted-foreground">
            Vous vous êtes connecté avec le mot de passe provisoire. Pour protéger votre compte, choisissez-en un
            personnel.
          </p>
        </div>

        <div className="space-y-3">
          <Input type={type} required value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Mot de passe provisoire (mahu1234@)" autoComplete="current-password" />
          <Input type={type} required value={next} onChange={(e) => setNext(e.target.value)} placeholder="Nouveau mot de passe (8 caractères minimum)" autoComplete="new-password" />
          <Input type={type} required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirmez le nouveau mot de passe" autoComplete="new-password" />
          <button type="button" onClick={() => setShow(!show)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {show ? "Masquer" : "Afficher"} les mots de passe
          </button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full py-5">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
          Enregistrer mon mot de passe
        </Button>
      </form>
    </div>
  )
}
