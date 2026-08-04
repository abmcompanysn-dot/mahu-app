"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Check, Loader2, Sparkles, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { aiApi, billingApi, type AiModelsResponse } from "@/lib/ai-api"

const FREE_PLAN = {
  name: "Gratuit",
  price: "0 FCFA",
  features: ["Llama 3 70B", "20 credits / jour"],
}

const PAID_PLANS: Array<{
  id: "premium" | "pro"
  name: string
  price: string
  features: string[]
  highlight?: boolean
}> = [
  {
    id: "premium",
    name: "Premium",
    price: "5 000 FCFA / mois",
    features: ["Tous les modeles Gratuit", "GPT-4o mini, Claude Haiku", "300 credits / jour"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "15 000 FCFA / mois",
    features: ["Tous les modeles Premium", "GPT-4o, Claude Sonnet", "2000 credits / jour"],
    highlight: true,
  },
]

export default function AbonnementPage() {
  const { token, isAuthenticated } = useAuth()
  const [modelsInfo, setModelsInfo] = useState<AiModelsResponse | null>(null)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    aiApi.getModels(token).then(setModelsInfo).catch(() => {})
  }, [token])

  const handleUpgrade = async (plan: "premium" | "pro", provider: "paydunya" | "pawapay") => {
    if (!token) return
    setError(null)
    setLoadingPlan(`${plan}-${provider}`)
    try {
      const { checkoutUrl } =
        provider === "pawapay" ? await billingApi.checkoutPawaPay(token, plan) : await billingApi.checkout(token, plan)
      window.location.href = checkoutUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la creation du paiement")
      setLoadingPlan(null)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-8"
      >
        <div className="relative flex items-center gap-2 text-sm font-medium text-primary">
          <Zap className="w-4 h-4" />
          AI MAHU
        </div>
        <h1 className="relative text-3xl font-bold text-foreground mt-2">Debloque plus de puissance IA</h1>
        <p className="relative text-muted-foreground mt-2 max-w-xl">
          {modelsInfo ? `Plan actuel : ${modelsInfo.plan}` : "Choisis le palier adapte a ton usage."}
        </p>
      </motion.div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl p-6 border backdrop-blur-sm flex flex-col ${
            modelsInfo?.plan === "gratuit" ? "border-primary bg-primary/5" : "border-border/50 bg-card/50"
          }`}
        >
          <h3 className="text-lg font-semibold text-foreground">{FREE_PLAN.name}</h3>
          <p className="text-2xl font-bold text-foreground my-2">{FREE_PLAN.price}</p>
          <ul className="space-y-2 flex-1 my-4">
            {FREE_PLAN.features.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-primary shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
          <Button variant="outline" disabled className="border-border/50">
            {modelsInfo?.plan === "gratuit" ? "Plan actuel" : "Inclus"}
          </Button>
        </motion.div>

        {PAID_PLANS.map((plan, index) => {
          const isCurrent = modelsInfo?.plan === plan.id
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (index + 1) * 0.1 }}
              className={`relative rounded-2xl p-6 border backdrop-blur-sm flex flex-col ${
                isCurrent
                  ? "border-primary bg-primary/5"
                  : plan.highlight
                    ? "border-primary/60 bg-gradient-to-b from-primary/10 to-card/50"
                    : "border-border/50 bg-card/50"
              }`}
            >
              {plan.highlight && !isCurrent && (
                <span className="absolute -top-3 left-6 px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                  Recommande
                </span>
              )}
              <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              <p className="text-2xl font-bold text-foreground my-2">{plan.price}</p>
              <ul className="space-y-2 flex-1 my-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <Button disabled className="w-full">
                  Plan actuel
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button
                    onClick={() => handleUpgrade(plan.id, "paydunya")}
                    disabled={loadingPlan !== null}
                    className="w-full"
                  >
                    {loadingPlan === `${plan.id}-paydunya` ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      `Passer ${plan.name} - Carte (PayDunya)`
                    )}
                  </Button>
                  <Button
                    onClick={() => handleUpgrade(plan.id, "pawapay")}
                    disabled={loadingPlan !== null}
                    variant="outline"
                    className="w-full border-border/50"
                  >
                    {loadingPlan === `${plan.id}-pawapay` ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      `Passer ${plan.name} - Mobile Money (PawaPay)`
                    )}
                  </Button>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
