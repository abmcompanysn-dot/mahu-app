"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Loader2, CheckCircle2, Eye, EyeOff, Mail, Lock } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = await login(email.toLowerCase().trim(), password)

      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          if (result.newUser) {
            router.push("/onboarding")
          } else {
            router.push("/dashboard")
          }
        }, 1000)
      } else {
        setError(result.error || "Email ou mot de passe incorrect")
      }
    } catch {
      setError("Erreur de connexion au serveur")
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
          className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.1, 1, 1.1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-0 right-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl"
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
                <h2 className="text-2xl font-bold text-foreground mb-2">Connexion reussie !</h2>
                <p className="text-muted-foreground">Redirection vers votre tableau de bord...</p>
              </motion.div>
            ) : (
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <h1 className="text-2xl font-bold text-foreground mb-2">Connexion</h1>
                <p className="text-muted-foreground mb-8">
                  Connectez-vous a votre compte Mahu
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Email Field */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Adresse email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value)
                          setError("")
                        }}
                        className="w-full pl-12 pr-4 py-4 rounded-xl bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="email@exemple.com"
                        autoFocus
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
                        required
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value)
                          setError("")
                        }}
                        className="w-full pl-12 pr-12 py-4 rounded-xl bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="Votre mot de passe"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Forgot Password */}
                  <div className="text-right">
                    <Link
                      href="/forgot-password"
                      className="text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      Mot de passe oublie ?
                    </Link>
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
                    className="w-full py-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-lg relative overflow-hidden group"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Connexion...
                        </>
                      ) : (
                        "Se connecter"
                      )}
                    </span>
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-primary via-blue-400 to-primary"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 0.5 }}
                      style={{ opacity: 0.3 }}
                    />
                  </Button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-border/50" />
                  <span className="text-sm text-muted-foreground">ou</span>
                  <div className="flex-1 h-px bg-border/50" />
                </div>

                {/* Sign Up Link */}
                <p className="text-center text-muted-foreground">
                  Pas encore de compte ?{" "}
                  <Link
                    href="/register"
                    className="text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Creer un compte
                  </Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer text */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          En continuant, vous acceptez nos{" "}
          <Link href="#" className="text-foreground hover:text-primary transition-colors">
            Conditions d&apos;utilisation
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
