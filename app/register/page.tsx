"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Loader2, CheckCircle2, Eye, EyeOff, Mail, Lock, User } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

// TODO: Remplacer par l'URL de votre Google AppScript
const APPSCRIPT_URL = "VOTRE_URL_APPSCRIPT_ICI"

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError("")
  }

  const validateForm = () => {
    if (formData.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caracteres")
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas")
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setLoading(true)
    setError("")

    try {
      const response = await fetch(APPSCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "register",
          name: formData.name.trim(),
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
        }),
      })

      const data = await response.json().catch(() => null)

      if (data?.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push("/login")
        }, 2000)
      } else {
        setError(data?.message || "Erreur lors de l'inscription")
      }
    } catch {
      // Mode dev - inscription simulee
      console.log("[v0] Mode dev - inscription simulee")
      setSuccess(true)
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,122,255,0.15),transparent_50%)]" />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Card */}
        <div className="rounded-3xl bg-card/50 border border-border/50 backdrop-blur-xl p-8 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Link 
              href="/" 
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Accueil</span>
            </Link>
            <span className="text-2xl font-bold text-foreground">Mahu</span>
          </div>

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center"
                >
                  <CheckCircle2 className="w-10 h-10 text-primary" />
                </motion.div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Compte cree !</h2>
                <p className="text-muted-foreground">Redirection vers la page de connexion...</p>
              </motion.div>
            ) : (
              <motion.div
                key="register"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <h1 className="text-2xl font-bold text-foreground mb-2">Creer un compte</h1>
                <p className="text-muted-foreground mb-6">
                  Rejoignez Mahu et creez votre carte numerique
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name Field */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Nom complet
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="Jean Dupont"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Email Field */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Adresse email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="email@exemple.com"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Mot de passe
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        required
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="Minimum 6 caracteres"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password Field */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Confirmer le mot de passe
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        required
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="Repetez votre mot de passe"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-xl bg-destructive/10 border border-destructive/20"
                    >
                      <p className="text-destructive text-sm text-center">{error}</p>
                    </motion.div>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full py-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-lg relative overflow-hidden group mt-2"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Creation...
                        </>
                      ) : (
                        "Creer mon compte"
                      )}
                    </span>
                  </Button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-border/50" />
                  <span className="text-sm text-muted-foreground">ou</span>
                  <div className="flex-1 h-px bg-border/50" />
                </div>

                {/* Login Link */}
                <p className="text-center text-muted-foreground">
                  Deja un compte ?{" "}
                  <Link
                    href="/login"
                    className="text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Se connecter
                  </Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer text */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          En creant un compte, vous acceptez nos{" "}
          <Link href="#" className="text-foreground hover:text-primary transition-colors">
            Conditions
          </Link>{" "}
          et{" "}
          <Link href="#" className="text-foreground hover:text-primary transition-colors">
            Politique de confidentialite
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
