"use client"

// Page ouverte depuis l'e-mail « A confirmer : carte Mahu activee ». L'action
// demande un clic (les scanners d'e-mails ouvrent les liens tout seuls).

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Check, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"

function ReviewCard() {
  const params = useSearchParams()
  const token = params.get("token") || ""
  const decision = params.get("decision") === "refuser" ? "refuser" : "confirmer"
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [message, setMessage] = useState("")

  const run = async () => {
    setState("loading")
    const r = await api.reviewBlankCard(token, decision)
    if (r.success) {
      setState("done")
      setMessage(
        decision === "confirmer"
          ? `Activation confirmee : le compte ${r.email} reste actif (${r.profileUrl}).`
          : `Activation refusee : le compte ${r.email} est desactive et sa carte n'affiche plus de profil.`
      )
    } else {
      setState("error")
      setMessage(r.error || "Action impossible.")
    }
  }

  const confirm = decision === "confirmer"
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border/50 bg-card/60 p-8 text-center space-y-5">
        <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${confirm ? "bg-green-500/15" : "bg-destructive/15"}`}>
          {confirm ? <Check className="w-8 h-8 text-green-500" /> : <X className="w-8 h-8 text-destructive" />}
        </div>
        <h1 className="text-xl font-bold text-foreground">
          {confirm ? "Confirmer l'activation de cette carte" : "Refuser l'activation de cette carte"}
        </h1>
        {state === "done" || state === "error" ? (
          <p className={state === "error" ? "text-destructive text-sm" : "text-muted-foreground text-sm"}>{message}</p>
        ) : (
          <>
            <p className="text-muted-foreground text-sm">
              {confirm
                ? "Le compte reste actif. Sans confirmation, il est desactive 2 h apres l'activation."
                : "Le compte sera desactive tout de suite et la carte n'affichera plus de profil."}
            </p>
            <Button
              className="w-full py-5"
              variant={confirm ? "default" : "destructive"}
              onClick={run}
              disabled={!token || state === "loading"}
            >
              {state === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : confirm ? "Confirmer" : "Refuser et desactiver"}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export default function ConfirmBlankCardPage() {
  return (
    <Suspense>
      <ReviewCard />
    </Suspense>
  )
}
