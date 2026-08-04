"use client"

import { useEffect } from "react"

// Enregistre le service worker cote client uniquement - jamais au chargement
// du module (voir lib/firebase.ts pour la meme regle), et n'echoue jamais
// bruyamment si le navigateur ne le supporte pas.
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js").catch(() => {})
  }, [])

  return null
}
