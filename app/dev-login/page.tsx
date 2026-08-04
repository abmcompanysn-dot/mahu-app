"use client"

import { Suspense, useEffect } from "react"
import { notFound, useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

// Page de dev uniquement : hydrate la session a partir d'un token/role passes
// en query string puis redirige vers /ai. Pratique pour tester sans repasser
// par Firebase (voir scripts/face-photo-cli.js). Indisponible en production.
function DevLoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { hydrateFromToken } = useAuth()

  useEffect(() => {
    const token = searchParams.get("token")
    const role = searchParams.get("role") || "Entreprise"
    if (!token) return
    hydrateFromToken(token, role)
    router.replace("/ai")
  }, [searchParams, hydrateFromToken, router])

  return (
    <div className="min-h-screen flex items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin" />
      Connexion...
    </div>
  )
}

export default function DevLoginPage() {
  if (process.env.NODE_ENV === "production") {
    notFound()
  }

  return (
    <Suspense fallback={null}>
      <DevLoginContent />
    </Suspense>
  )
}
