"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { shopApi, formatXof, type DepositOrderStatus } from "@/lib/shop-api"

// PayDunya renvoie ici apres paiement. Le compte n'est cree qu'a la
// confirmation par le webhook, qui peut arriver quelques secondes apres :
// on interroge le statut jusqu'a ce qu'il passe a "acompte_paye".
const POLL_INTERVAL_MS = 3000
const MAX_POLLS = 40

function PaymentReturn() {
  const reference = useSearchParams().get("ref") || ""
  const [order, setOrder] = useState<DepositOrderStatus | null>(null)
  const [error, setError] = useState(reference ? "" : "Reference de commande manquante.")
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (!reference) return
    let polls = 0
    let timer: ReturnType<typeof setTimeout>
    let cancelled = false

    const poll = async () => {
      try {
        const status = await shopApi.getOrderStatus(reference)
        if (cancelled) return
        setOrder(status)
        if (status.paymentStatus !== "en_attente") return
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Erreur")
        return
      }
      polls += 1
      if (polls >= MAX_POLLS) {
        setTimedOut(true)
        return
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS)
    }
    poll()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [reference])

  const paid = order && order.paymentStatus !== "en_attente"

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md rounded-3xl bg-card/50 border border-border/50 p-8 text-center space-y-4">
        {error ? (
          <>
            <XCircle className="w-12 h-12 mx-auto text-destructive" />
            <h1 className="text-xl font-bold text-foreground">Commande introuvable</h1>
            <p className="text-muted-foreground">{error}</p>
            <Button asChild variant="outline">
              <Link href="/register">Retour a l&apos;inscription</Link>
            </Button>
          </>
        ) : paid ? (
          <>
            <CheckCircle2 className="w-12 h-12 mx-auto text-primary" />
            <h1 className="text-xl font-bold text-foreground">Acompte recu, merci !</h1>
            <p className="text-muted-foreground">
              {formatXof(order.depositXof)} payes pour <strong>{order.productName}</strong>.
              {order.remainingXof > 0 && <> Reste a regler a la livraison : {formatXof(order.remainingXof)}.</>}
            </p>
            <p className="text-muted-foreground">Votre compte est pret. Un email de confirmation vous a ete envoye.</p>
            <Button asChild className="w-full">
              <Link href={`/login?email=${encodeURIComponent(order.email)}`}>Me connecter</Link>
            </Button>
          </>
        ) : timedOut ? (
          <>
            <Clock className="w-12 h-12 mx-auto text-muted-foreground" />
            <h1 className="text-xl font-bold text-foreground">Paiement en cours de verification</h1>
            <p className="text-muted-foreground">
              La confirmation de PayDunya prend plus de temps que prevu. Vous recevrez un email des qu&apos;elle arrive,
              puis vous pourrez vous connecter.
            </p>
          </>
        ) : (
          <>
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-muted-foreground" />
            <h1 className="text-xl font-bold text-foreground">Confirmation du paiement...</h1>
            <p className="text-muted-foreground">Ne fermez pas cette page, cela prend quelques secondes.</p>
          </>
        )}
      </div>
    </div>
  )
}

export default function PaymentReturnPage() {
  return (
    <Suspense>
      <PaymentReturn />
    </Suspense>
  )
}
