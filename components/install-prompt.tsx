"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Download, Share, X } from "lucide-react"

// Evenement non standard de Chrome/Edge/Android : permet d'ouvrir la fenetre
// d'installation native au clic sur notre bouton.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISS_KEY = "mahu_install_dismissed_at"
const DISMISS_DAYS = 14

// Pas de bandeau sur les cartes publiques (les visiteurs d'un profil ne
// sont pas des clients Mahu) ni dans l'admin.
const HIDDEN_PREFIXES = ["/p/", "/c/", "/admin", "/myfocus"]

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0)
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

// Barre "Installer l'application" : bouton natif sur Android / Chrome /
// Edge, instructions sur iPhone (Safari n'offre pas de bouton programmable).
export function InstallPrompt() {
  const pathname = usePathname()
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIos, setShowIos] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    const onInstalled = () => {
      setVisible(false)
      setDeferred(null)
    }
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)

    const ua = navigator.userAgent
    const isIos = /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
    if (isIos) {
      setShowIos(true)
      setVisible(true)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  if (!visible || HIDDEN_PREFIXES.some((p) => pathname?.startsWith(p))) return null

  const dismiss = () => {
    setVisible(false)
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      // stockage indisponible (navigation privee) : on masque juste pour cette visite
    }
  }

  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    setDeferred(null)
    if (outcome === "accepted") setVisible(false)
    else dismiss()
  }

  return (
    <div
      role="dialog"
      aria-label="Installer l'application Mahu"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl border border-border/60 bg-card/95 p-3 shadow-2xl backdrop-blur-xl sm:bottom-5"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Installer Mahu</p>
          {showIos && !deferred ? (
            <p className="text-xs text-muted-foreground">
              Touchez <Share className="inline h-3.5 w-3.5 -mt-0.5" aria-label="Partager" /> puis{" "}
              <span className="font-medium text-foreground">« Sur l&apos;ecran d&apos;accueil »</span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Acces direct a votre carte et vos contacts, comme une app.</p>
          )}
        </div>
        {deferred && (
          <button
            type="button"
            onClick={install}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Download className="h-4 w-4" />
            Installer
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Plus tard"
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
