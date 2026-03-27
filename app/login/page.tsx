"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [step, setStep] = useState<"email" | "code">("email")
  const [code, setCode] = useState(["", "", "", "", "", ""])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Focus first code input when switching to code step
  useEffect(() => {
    if (step === "code" && inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [step])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    
    setLoading(false)
    setStep("code")
  }

  const handleCodeChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)
    setError("")

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all digits entered
    if (value && index === 5 && newCode.every((digit) => digit !== "")) {
      handleCodeSubmit(newCode.join(""))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").slice(0, 6)
    if (/^\d+$/.test(pastedData)) {
      const newCode = pastedData.split("").concat(Array(6).fill("")).slice(0, 6)
      setCode(newCode)
      if (pastedData.length === 6) {
        handleCodeSubmit(pastedData)
      } else {
        inputRefs.current[pastedData.length]?.focus()
      }
    }
  }

  const handleCodeSubmit = async (codeString: string) => {
    setLoading(true)
    setError("")
    
    // Simulate API verification
    await new Promise((resolve) => setTimeout(resolve, 1500))
    
    // Demo: accept any 6-digit code
    if (codeString.length === 6) {
      setSuccess(true)
      setTimeout(() => {
        router.push("/dashboard")
      }, 1000)
    } else {
      setError("Code invalide. Veuillez reessayer.")
      setCode(["", "", "", "", "", ""])
      inputRefs.current[0]?.focus()
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
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Card */}
        <div className="rounded-3xl bg-card/50 border border-border/50 backdrop-blur-xl p-8 shadow-2xl">
          {/* Back button / Logo */}
          <div className="flex items-center justify-between mb-8">
            {step === "code" ? (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => {
                  setStep("email")
                  setCode(["", "", "", "", "", ""])
                  setError("")
                }}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour
              </motion.button>
            ) : (
              <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            )}
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
            ) : step === "email" ? (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h1 className="text-2xl font-bold text-foreground mb-2">Connexion</h1>
                <p className="text-muted-foreground mb-8">
                  Entrez votre email pour recevoir un code de connexion.
                </p>

                <form onSubmit={handleEmailSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Adresse email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-4 rounded-xl bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all text-lg"
                      placeholder="email@exemple.com"
                      autoFocus
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full py-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-lg"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      "Continuer"
                    )}
                  </Button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="code"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <h1 className="text-2xl font-bold text-foreground mb-2">Verification</h1>
                <p className="text-muted-foreground mb-8">
                  Entrez le code a 6 chiffres envoye a <span className="text-foreground">{email}</span>
                </p>

                {/* 6-digit code input */}
                <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
                  {code.map((digit, index) => (
                    <motion.input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold rounded-xl bg-muted/30 border ${
                        error ? "border-destructive/50" : digit ? "border-primary/50" : "border-border/50"
                      } text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all`}
                    />
                  ))}
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-destructive text-sm text-center mb-4"
                  >
                    {error}
                  </motion.p>
                )}

                {loading && (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verification en cours...</span>
                  </div>
                )}

                <div className="text-center mt-8">
                  <button
                    type="button"
                    onClick={() => {/* Resend code logic */}}
                    className="text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    Renvoyer le code
                  </button>
                </div>
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
