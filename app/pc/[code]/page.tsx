"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Delete, Loader2, Lock, Monitor } from "lucide-react"

// Ecran ouvert par le scan d'une carte Cloud PC (/c/CODE -> /pc/CODE) :
// code secret, puis le bureau du client s'allume et s'ouvre dans le
// navigateur (Guacamole). La carte seule ne suffit jamais.

interface Info {
  ownerFirstName: string
  suspended: boolean
  expired: boolean
  locked: boolean
  running: boolean
}

const STEPS = ["Vérification du code…", "Allumage de ton ordinateur…", "Ouverture de l'écran…"]

export default function CloudPCPage() {
  const { code } = useParams<{ code: string }>()
  const [info, setInfo] = useState<Info | null>(null)
  const [error, setError] = useState("")
  const [pin, setPin] = useState("")
  const [step, setStep] = useState(-1)

  useEffect(() => {
    fetch(`/api/backend/api/pc/${encodeURIComponent(code)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || "Carte inconnue")
        setInfo(data)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Carte inconnue"))
  }, [code])

  const open = async () => {
    if (pin.length < 4 || step >= 0) return
    setError("")
    setStep(0)
    // Les etapes avancent pendant que le serveur allume le bureau.
    const t1 = setTimeout(() => setStep(1), 1200)
    const t2 = setTimeout(() => setStep(2), info?.running ? 2500 : 25000)
    try {
      const res = await fetch(`/api/backend/api/pc/${encodeURIComponent(code)}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) throw new Error(data?.error || "Une erreur est survenue, réessaie.")
      setStep(2)
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
      setPin("")
      setStep(-1)
    } finally {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }

  const press = (k: string) => {
    if (step >= 0) return
    if (k === "del") setPin((p) => p.slice(0, -1))
    else if (pin.length < 8) setPin((p) => p + k)
  }

  const blocked = info && (info.suspended || info.expired || info.locked)

  return (
    <div className="min-h-screen bg-[#05070d] text-white flex flex-col items-center px-5 py-10">
      <div className="w-full max-w-sm flex-1 flex flex-col">
        <div className="flex items-center gap-2 text-white/60 text-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" className="w-7 h-7 rounded-lg" />
          Mahu Cloud PC
        </div>

        <div className="mt-10 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#5ac8fa] flex items-center justify-center shadow-[0_0_40px_rgba(0,122,255,0.45)]">
            <Monitor className="w-8 h-8" />
          </div>
          <h1 className="mt-5 text-2xl font-black tracking-tight">L&apos;ordinateur le plus fin au monde</h1>
          <p className="mt-2 text-white/60">
            {info?.ownerFirstName ? `Bonjour ${info.ownerFirstName}, ` : ""}
            entre ton code secret pour allumer ton ordinateur.
          </p>
        </div>

        {!info && !error && (
          <div className="mt-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-white/50" />
          </div>
        )}

        {info && blocked && (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-white/80">
            <Lock className="mx-auto w-6 h-6 mb-2" />
            {info.suspended
              ? "Cet ordinateur est suspendu. Contacte Mahu."
              : info.expired
                ? "Ton abonnement a expiré. Renouvelle-le pour retrouver ton ordinateur (tes fichiers sont conservés)."
                : "Trop d'essais : réessaie dans 15 minutes."}
          </div>
        )}

        {info && !blocked && (
          <>
            <div className="mt-10 flex justify-center gap-3" aria-label={`${pin.length} chiffres saisis`}>
              {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
                <span
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full transition ${i < pin.length ? "bg-[#5ac8fa] scale-110" : "bg-white/15"}`}
                />
              ))}
            </div>
            {error && <p className="mt-4 text-center text-sm text-red-400">{error}</p>}

            {step >= 0 ? (
              <div className="mt-10 space-y-3">
                {STEPS.map((s, i) => (
                  <div key={s} className={`flex items-center gap-3 text-sm ${i <= step ? "text-white" : "text-white/30"}`}>
                    {i < step ? (
                      <span className="w-5 h-5 rounded-full bg-[#007AFF] text-[11px] flex items-center justify-center">✓</span>
                    ) : i === step ? (
                      <Loader2 className="w-5 h-5 animate-spin text-[#5ac8fa]" />
                    ) : (
                      <span className="w-5 h-5 rounded-full border border-white/20" />
                    )}
                    {s}
                  </div>
                ))}
                <p className="pt-2 text-xs text-white/40">Le premier allumage peut prendre jusqu&apos;à une minute.</p>
              </div>
            ) : (
              <div className="mt-8 grid grid-cols-3 gap-3">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((k) => (
                  <button
                    key={k}
                    onClick={() => press(k)}
                    className="h-16 rounded-2xl bg-white/[0.06] text-2xl font-semibold active:bg-white/20 hover:bg-white/10"
                  >
                    {k}
                  </button>
                ))}
                <span />
                <button onClick={() => press("0")} className="h-16 rounded-2xl bg-white/[0.06] text-2xl font-semibold active:bg-white/20 hover:bg-white/10">
                  0
                </button>
                <button onClick={() => press("del")} aria-label="Effacer" className="h-16 rounded-2xl flex items-center justify-center text-white/60 hover:bg-white/10">
                  <Delete className="w-6 h-6" />
                </button>
              </div>
            )}

            {step < 0 && (
              <button
                onClick={open}
                disabled={pin.length < 4}
                className="mt-6 w-full rounded-2xl bg-[#007AFF] py-4 text-lg font-bold disabled:opacity-40 hover:bg-[#0a84ff]"
              >
                Allumer mon ordinateur
              </button>
            )}
          </>
        )}

        {error && !info && <p className="mt-10 text-center text-white/70">{error}</p>}

        <p className="mt-auto pt-10 text-center text-xs text-white/35">
          Rien n&apos;est enregistré sur cet appareil. Ferme l&apos;onglet pour partir : ton ordinateur t&apos;attend.
        </p>
      </div>
    </div>
  )
}
