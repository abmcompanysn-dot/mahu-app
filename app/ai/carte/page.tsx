"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Camera, Check, Copy, Loader2, ScanFace, ShieldAlert, Link2, Split, ArrowLeft } from "lucide-react"
import Link from "next/link"
import QRCode from "qrcode"
import { AiLogo } from "@/components/ai/ai-logo"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { cardApi, type BiometricCardInfo, type CardRedirectMode } from "@/lib/ai-api"
import { captureFaceDescriptor, openCamera, stopCamera } from "@/lib/face-recognition"

const REDIRECT_MODE_OPTIONS: Array<{ value: CardRedirectMode; label: string; description: string }> = [
  { value: "choice", label: "Laisser choisir", description: "La personne qui scanne voit les deux options et decide." },
  { value: "profile", label: "Profil uniquement", description: "Redirige directement vers ta carte de visite publique." },
  { value: "ai", label: "Assistant IA uniquement", description: "Lance directement la verification faciale." },
]

export default function CarteIaPage() {
  const { token, isAuthenticated } = useAuth()
  const [card, setCard] = useState<BiometricCardInfo | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profileUsername, setProfileUsername] = useState("")
  const [savingProfileLink, setSavingProfileLink] = useState(false)
  const [profileLinkSaved, setProfileLinkSaved] = useState(false)
  const [savingRedirectMode, setSavingRedirectMode] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const cardUrl = card && typeof window !== "undefined" ? `${window.location.origin}/c/${card.cardCode}` : ""

  useEffect(() => {
    if (!token) return
    cardApi
      .get(token)
      .then((data) => {
        setCard(data)
        setProfileUsername(data.profileUsername || "")
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement"))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    if (!card) return
    QRCode.toDataURL(`${window.location.origin}/c/${card.cardCode}`, { margin: 1, width: 220 }).then(setQrDataUrl)
  }, [card])

  useEffect(() => {
    return () => stopCamera(streamRef.current)
  }, [])

  const copyLink = useCallback(async () => {
    await navigator.clipboard.writeText(cardUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [cardUrl])

  const startEnrollment = useCallback(async () => {
    setError(null)
    setCapturing(true)
    try {
      const stream = await openCamera()
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch {
      setError("Impossible d'acceder a la camera. Verifie les autorisations de ton navigateur.")
      setCapturing(false)
    }
  }, [])

  const confirmEnrollment = useCallback(async () => {
    if (!token || !videoRef.current) return
    setError(null)
    try {
      const descriptor = await captureFaceDescriptor(videoRef.current)
      if (!descriptor) {
        setError("Aucun visage detecte, reessaie en te placant bien face a la camera.")
        return
      }
      const updated = await cardApi.enrollFace(token, descriptor)
      setCard(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'enregistrement")
    } finally {
      stopCamera(streamRef.current)
      streamRef.current = null
      setCapturing(false)
    }
  }, [token])

  const cancelEnrollment = useCallback(() => {
    stopCamera(streamRef.current)
    streamRef.current = null
    setCapturing(false)
  }, [])

  const saveProfileLink = useCallback(async () => {
    if (!token || !profileUsername.trim()) return
    setSavingProfileLink(true)
    setError(null)
    try {
      const updated = await cardApi.updateProfileLink(token, profileUsername.trim())
      setCard(updated)
      setProfileLinkSaved(true)
      setTimeout(() => setProfileLinkSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'enregistrement")
    } finally {
      setSavingProfileLink(false)
    }
  }, [token, profileUsername])

  const disableCard = useCallback(async () => {
    if (!token) return
    const updated = await cardApi.disable(token)
    setCard(updated)
  }, [token])

  const changeRedirectMode = useCallback(
    async (mode: CardRedirectMode) => {
      if (!token || mode === card?.redirectMode) return
      setSavingRedirectMode(true)
      setError(null)
      try {
        const updated = await cardApi.updateRedirectMode(token, mode)
        setCard(updated)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur d'enregistrement")
      } finally {
        setSavingRedirectMode(false)
      }
    },
    [token, card],
  )

  if (!isAuthenticated || loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="space-y-6 max-w-2xl mx-auto">
        <Link href="/ai" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Retour au chat
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center text-center sm:items-start sm:text-left">
          <AiLogo animated size="md" className="mb-3" />
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ScanFace className="w-6 h-6 text-primary" />
            Ma carte IA
          </h1>
          <p className="text-muted-foreground mt-1">
            Connecte-toi a AI MAHU depuis n&apos;importe quel telephone en scannant ton lien et en verifiant ton visage
            - sans mot de passe. C&apos;est toi qui decides de l&apos;activer.
          </p>
        </motion.div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {qrDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="QR code de ta carte IA" className="rounded-xl border border-border/50" />
            )}
            <div className="flex-1 w-full space-y-2">
              <p className="text-sm text-muted-foreground">Ton lien unique (a programmer sur une carte NFC ou a partager) :</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted/30 border border-border/50 rounded-lg px-3 py-2 truncate">
                  {cardUrl}
                </code>
                <Button variant="outline" size="icon" className="border-border/50 shrink-0" onClick={copyLink}>
                  {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm p-6 space-y-4">
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" />
              Profil Mahu lié
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Quand quelqu&apos;un scanne ta carte, il pourra aussi choisir de voir ta carte de visite Mahu publique.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={profileUsername}
              onChange={(e) => setProfileUsername(e.target.value)}
              placeholder="ton-nom-utilisateur"
              className="flex-1 text-sm bg-muted/30 border border-border/50 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            />
            <Button variant="outline" className="border-border/50 shrink-0" onClick={saveProfileLink} disabled={savingProfileLink || !profileUsername.trim()}>
              {savingProfileLink ? <Loader2 className="w-4 h-4 animate-spin" /> : profileLinkSaved ? <Check className="w-4 h-4 text-primary" /> : "Lier"}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Reconnaissance faciale</h3>
              <p className="text-sm text-muted-foreground">
                Statut : {card?.enabled ? <span className="text-primary">Activee</span> : "Desactivee"}
              </p>
            </div>
            {card?.enabled && (
              <Button variant="outline" className="border-border/50" onClick={disableCard}>
                Desactiver
              </Button>
            )}
          </div>

          {capturing ? (
            <div className="space-y-3">
              <video ref={videoRef} muted playsInline className="w-full max-w-sm rounded-xl border border-border/50" />
              <div className="flex gap-2">
                <Button onClick={confirmEnrollment}>
                  <Camera className="w-4 h-4 mr-2" />
                  Capturer mon visage
                </Button>
                <Button variant="outline" className="border-border/50" onClick={cancelEnrollment}>
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={startEnrollment}>
              <ScanFace className="w-4 h-4 mr-2" />
              {card?.enabled ? "Reenregistrer mon visage" : "Activer mon visage"}
            </Button>
          )}

          <div className="flex items-start gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Ton visage n&apos;est jamais envoye ni stocke : seule une empreinte numerique (128 nombres) calculee dans
              ton navigateur est enregistree. C&apos;est une methode de connexion pratique, sans detection de vivacite
              - garde aussi ton mot de passe habituel pour les operations sensibles.
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm p-6 space-y-4">
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Split className="w-4 h-4 text-primary" />
              Que voit-on en scannant ta carte ?
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              C&apos;est toi qui decides : profil seul, assistant IA seul, ou laisser la personne choisir entre les deux.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {REDIRECT_MODE_OPTIONS.map((option) => {
              const disabled =
                (option.value === "profile" && !card?.profileUsername) || (option.value === "ai" && !card?.enabled)
              const active = card?.redirectMode === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={disabled || savingRedirectMode}
                  onClick={() => changeRedirectMode(option.value)}
                  className={`text-left p-3 rounded-xl border transition-colors ${
                    active
                      ? "border-primary bg-primary/10"
                      : disabled
                        ? "border-border/30 bg-muted/10 text-muted-foreground/50 cursor-not-allowed"
                        : "border-border/50 bg-muted/20 hover:bg-muted/30"
                  }`}
                >
                  <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    {active && <Check className="w-3.5 h-3.5 text-primary" />}
                    {option.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                  {disabled && (
                    <p className="text-xs text-amber-500 mt-1">
                      {option.value === "profile" ? "Lie d'abord un profil ci-dessus." : "Active d'abord ton visage ci-dessus."}
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
