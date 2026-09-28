"use client"

import { useEffect, useState } from "react"

// Domaine sur lequel l'app est servie (ai.mahu.cards, call.mahu.cards...) :
// les liens de profil/QR suivent le domaine courant au lieu d'etre figes.
// NEXT_PUBLIC_SITE_URL ne sert que pour le premier rendu serveur.
const FALLBACK_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || ""

export function useSiteOrigin() {
  const [origin, setOrigin] = useState(FALLBACK_ORIGIN)

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  return { origin, host: origin.replace(/^https?:\/\//, "") }
}
