"use client"

import { use, useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Loader2, ScanFace, ShieldCheck, UserRound } from "lucide-react"
import { AiLogo } from "@/components/ai/ai-logo"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { getCardPublicInfo, verifyFace, type CardRedirectMode } from "@/lib/ai-api"
import { captureFaceDescriptor, openCamera, stopCamera } from "@/lib/face-recognition"

type Mode = "loading" | "choice" | "ai"
type Status = "idle" | "scanning" | "verifying" | "success" | "error"

export default function CardVerificationPage({ params }: { params: Promise<{ cardCode: string }> }) {
  const { cardCode } = use(params)
  const router = useRouter()
  const { hydrateFromToken } = useAuth()
  const [mode, setMode] = useState<Mode>("loading")
  const [redirectMode, setRedirectMode] = useState<CardRedirectMode>("choice")
  const [profileUsername, setProfileUsername] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>("idle")
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    getCardPublicInfo(cardCode)
      .then((info) => {
        setProfileUsername(info.profileUsername)
        applyRedirectMode(info.redirectMode, info.profileUsername)
      })
      .catch(() => setMode("choice"))

    function applyRedirectMode(mode: CardRedirectMode, username: string | null) {
      setRedirectMode(mode)
      if (mode === "profile" && username) {
        router.replace(`/p/${username}`)
        return
      }
      // "ai" saute directement a l'ecran de verification, mais la camera a
      // toujours besoin d'un clic (geste utilisateur requis par le navigateur).
      setMode(mode === "ai" ? "ai" : "choice")
    }
  }, [cardCode, router])

  useEffect(() => {
    return () => stopCamera(streamRef.current)
  }, [])

  const startVerification = useCallback(async () => {
    setMode("ai")
    setError(null)
    setStatus("scanning")
    try {
      const stream = await openCamera()
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      // Laisse la camera se stabiliser une fraction de seconde avant la capture.
      await new Promise((resolve) => setTimeout(resolve, 800))

      const descriptor = await captureFaceDescriptor(videoRef.current!)
      stopCamera(streamRef.current)
      streamRef.current = null

      if (!descriptor) {
        setStatus("error")
        setError("Aucun visage detecte. Place-toi bien en face de la camera et reessaie.")
        return
      }

      setStatus("verifying")
      const result = await verifyFace(cardCode, descriptor)

      if (result.success && result.token && result.role) {
        hydrateFromToken(result.token, result.role)
        setStatus("success")
        router.push("/ai")
      } else {
        setStatus("error")
        setError(result.error || "Visage non reconnu.")
      }
    } catch {
      setStatus("error")
      setError("Impossible d'acceder a la camera. Verifie les autorisations de ton navigateur.")
      stopCamera(streamRef.current)
      streamRef.current = null
    }
  }, [cardCode, hydrateFromToken, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-8 text-center space-y-4"
      >
        <AiLogo animated size="md" className="mx-auto" />
        <h1 className="text-xl font-bold text-foreground">Bienvenue sur Mahu</h1>

        {mode === "loading" && (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto" />
        )}

        {mode === "choice" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Que veux-tu faire avec cette carte ?</p>

            <a
              href={profileUsername ? `/p/${profileUsername}` : undefined}
              aria-disabled={!profileUsername}
              className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-border/50 font-medium transition-colors ${
                profileUsername
                  ? "bg-muted/30 text-foreground hover:bg-muted/50"
                  : "bg-muted/10 text-muted-foreground cursor-not-allowed pointer-events-none"
              }`}
            >
              <UserRound className="w-4 h-4" />
              Voir le profil
            </a>
            {!profileUsername && (
              <p className="text-xs text-muted-foreground">Aucun profil public n&apos;est encore lie a cette carte.</p>
            )}

            <Button onClick={startVerification} className="w-full">
              <ScanFace className="w-4 h-4 mr-2" />
              Utiliser mon assistant IA
            </Button>
          </div>
        )}

        {mode === "ai" && (
          <>
            <p className="text-sm text-muted-foreground">
              Verifie ton identite pour retrouver ton assistant IA et tes conversations sur cet appareil.
            </p>

            {status === "idle" && (
              <Button onClick={startVerification} className="w-full">
                <ScanFace className="w-4 h-4 mr-2" />
                Verifier mon identite
              </Button>
            )}

            {(status === "scanning" || status === "verifying") && (
              <div className="space-y-3">
                <video ref={videoRef} muted playsInline className="w-full rounded-xl border border-border/50" />
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {status === "scanning" ? "Analyse du visage..." : "Verification en cours..."}
                </p>
              </div>
            )}

            {status === "success" && (
              <p className="text-sm text-primary flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Identite verifiee, redirection...
              </p>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            {status === "error" && (
              <Button onClick={startVerification} className="w-full">
                <ScanFace className="w-4 h-4 mr-2" />
                Reessayer
              </Button>
            )}

            {redirectMode === "choice" && (
              <button
                type="button"
                onClick={() => {
                  setMode("choice")
                  setStatus("idle")
                  setError(null)
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Retour
              </button>
            )}
          </>
        )}

        <p className="text-xs text-muted-foreground">
          Pas ta carte ?{" "}
          <a href="/login" className="text-primary hover:underline">
            Connecte-toi avec ton mot de passe
          </a>
        </p>
      </motion.div>
    </div>
  )
}
