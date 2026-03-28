"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  User, 
  Building2, 
  Users, 
  MapPin, 
  Briefcase, 
  Phone,
  ArrowRight,
  ArrowLeft,
  Check,
  Smartphone,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/use-auth"
import { api } from "@/lib/api"

const steps = [
  { id: 1, title: "Informations", icon: User },
  { id: 2, title: "Type de compte", icon: Building2 },
  { id: 3, title: "Profil", icon: Briefcase },
  { id: 4, title: "Partage NFC", icon: Smartphone },
  { id: 5, title: "Termine", icon: Check },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { token, isLoading: authLoading, isAuthenticated } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    accountType: "individual",
    profession: "",
    company: "",
    location: "",
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const saveStepData = async () => {
    if (!token) return false
    
    setIsLoading(true)
    try {
      const payload: Record<string, string> = {}
      
      if (currentStep === 1) {
        payload.Nom_Complet = `${formData.firstName} ${formData.lastName}`.trim()
        payload.Telephone = formData.phone
      } else if (currentStep === 2) {
        payload.Role = formData.accountType === "team" ? "Admin" : "Particulier"
      } else if (currentStep === 3) {
        payload.Profession = formData.profession
        payload.Compagnie = formData.company
        payload.Location = formData.location
      }

      if (Object.keys(payload).length > 0) {
        await api.updateOnboardingData(token, { step: currentStep, data: payload })
      }
      return true
    } catch {
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const nextStep = async () => {
    const success = await saveStepData()
    if (success && currentStep < 5) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const finishOnboarding = async () => {
    setIsLoading(true)
    try {
      if (token) {
        await api.updateOnboardingData(token, { step: "final", data: {} })
      }
      router.push("/dashboard")
    } catch {
      router.push("/dashboard")
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-12 xl:px-24">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mb-12">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <span className="text-primary font-bold text-lg">M</span>
          </div>
          <span className="text-2xl font-bold text-foreground">Mahu</span>
        </Link>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <motion.div
                  initial={false}
                  animate={{
                    backgroundColor: currentStep >= step.id ? "var(--primary)" : "transparent",
                    borderColor: currentStep >= step.id ? "var(--primary)" : "var(--border)",
                  }}
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors ${
                    currentStep >= step.id ? "text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </motion.div>
                {index < steps.length - 1 && (
                  <div className="hidden sm:block w-12 lg:w-20 h-0.5 mx-2">
                    <motion.div
                      initial={false}
                      animate={{
                        width: currentStep > step.id ? "100%" : "0%",
                      }}
                      className="h-full bg-primary"
                      style={{ width: currentStep > step.id ? "100%" : "0%" }}
                    />
                    <div className="h-full bg-border -mt-0.5" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Creez votre compte</h1>
                <p className="text-muted-foreground">Dites-nous en plus sur vous.</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Prenom *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Jean"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        className="pl-10 h-12 bg-muted/50 border-border/50 rounded-xl"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Nom *</label>
                    <Input
                      type="text"
                      placeholder="Dupont"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange("lastName", e.target.value)}
                      className="h-12 bg-muted/50 border-border/50 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Telephone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="tel"
                      placeholder="+33 6 12 34 56 78"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      className="pl-10 h-12 bg-muted/50 border-border/50 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                En continuant, vous acceptez nos Conditions d&apos;utilisation et notre Politique de confidentialite.
              </p>
            </motion.div>
          )}

          {/* Step 2: Account Type */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Comment souhaitez-vous utiliser Mahu?</h1>
                <p className="text-muted-foreground">Cela garantit que votre compte est correctement configure.</p>
              </div>

              <div className="space-y-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleInputChange("accountType", "individual")}
                  className={`w-full p-6 rounded-2xl border-2 text-left transition-all ${
                    formData.accountType === "individual"
                      ? "border-primary bg-primary/5"
                      : "border-border/50 hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      formData.accountType === "individual" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">Pour moi-meme</h3>
                      <p className="text-muted-foreground text-sm">
                        Ideal si vous avez besoin de Mahu pour vous-meme en tant qu&apos;individu.
                      </p>
                    </div>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleInputChange("accountType", "team")}
                  className={`w-full p-6 rounded-2xl border-2 text-left transition-all ${
                    formData.accountType === "team"
                      ? "border-primary bg-primary/5"
                      : "border-border/50 hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      formData.accountType === "team" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">Pour mon equipe</h3>
                      <p className="text-muted-foreground text-sm">
                        Ideal si vous souhaitez creer des cartes d&apos;affaire numeriques pour votre equipe.
                      </p>
                    </div>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Profile Info */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Creez votre profil</h1>
                <p className="text-muted-foreground">Entrez les informations que vous voulez partager.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Profession</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="CEO, Designer, Developpeur..."
                      value={formData.profession}
                      onChange={(e) => handleInputChange("profession", e.target.value)}
                      className="pl-10 h-12 bg-muted/50 border-border/50 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Compagnie</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Nom de votre entreprise"
                      value={formData.company}
                      onChange={(e) => handleInputChange("company", e.target.value)}
                      className="pl-10 h-12 bg-muted/50 border-border/50 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Localisation</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Paris, France"
                      value={formData.location}
                      onChange={(e) => handleInputChange("location", e.target.value)}
                      className="pl-10 h-12 bg-muted/50 border-border/50 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 4: NFC Info */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 text-center"
            >
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Comment partager avec une carte Mahu</h1>
                <p className="text-muted-foreground">Tenez votre carte Mahu devant un telephone pour partager vos informations.</p>
              </div>

              <div className="relative py-12">
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="w-32 h-32 mx-auto rounded-3xl bg-primary/20 border-2 border-primary/50 flex items-center justify-center"
                >
                  <Smartphone className="w-16 h-16 text-primary" />
                </motion.div>
                <motion.div
                  animate={{
                    y: [0, -10, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border-2 border-dashed border-primary/30"
                />
              </div>

              <p className="text-muted-foreground">
                La technologie NFC permet un partage instantane sans application.
              </p>
            </motion.div>
          )}

          {/* Step 5: Complete */}
          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.6 }}
                className="w-24 h-24 mx-auto rounded-full bg-green-500/10 border-2 border-green-500/20 flex items-center justify-center"
              >
                <Check className="w-12 h-12 text-green-500" />
              </motion.div>

              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Votre profil est pret !</h1>
                <p className="text-muted-foreground">
                  Vous pouvez maintenant acceder a votre tableau de bord pour personnaliser votre profil, suivre vos statistiques et bien plus encore.
                </p>
              </div>

              <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold text-3xl">M</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/50">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={currentStep === 1 || isLoading}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Button>

          {currentStep < 5 ? (
            <Button
              onClick={nextStep}
              disabled={isLoading || (currentStep === 1 && (!formData.firstName || !formData.lastName))}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Continuer
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={finishOnboarding}
              disabled={isLoading}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Aller au tableau de bord
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:flex flex-1 bg-muted/20 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative z-10"
        >
          <div className="w-80 h-[500px] rounded-[3rem] bg-card/80 border border-border/50 backdrop-blur-xl shadow-2xl p-6 flex flex-col">
            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-primary">
                  {formData.firstName?.[0] || "M"}{formData.lastName?.[0] || ""}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {formData.firstName || "Votre"} {formData.lastName || "Nom"}
              </h3>
              <p className="text-sm text-muted-foreground">{formData.profession || "Votre profession"}</p>
              <p className="text-xs text-muted-foreground">{formData.company || "Votre entreprise"}</p>
            </div>
            
            <div className="flex-1 space-y-3">
              {["LinkedIn", "Email", "Telephone", "Site web"].map((link, i) => (
                <div key={i} className="p-3 rounded-xl bg-muted/50 border border-border/30">
                  <span className="text-sm text-muted-foreground">{link}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
