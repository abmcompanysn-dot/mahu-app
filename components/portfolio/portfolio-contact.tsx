"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Loader2, Send } from "lucide-react"
import { api } from "@/lib/api"

// Portfolio public : compte la visite (une fois par session) et propose au
// visiteur de laisser ses coordonnees. Le contact arrive dans les Contacts
// du proprietaire (canal "Portfolio") avec un email de notification.

export function PortfolioViewTracker({ profileUrl }: { profileUrl: string }) {
  useEffect(() => {
    const key = `mahu_pf_view_${profileUrl}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, "1")
    } catch {
      // stockage indisponible : on compte quand meme
    }
    api.trackView(profileUrl, "Portfolio").catch(() => {})
  }, [profileUrl])
  return null
}

export function PortfolioContactForm({ profileUrl, ownerName }: { profileUrl: string; ownerName: string }) {
  const [name, setName] = useState("")
  const [contact, setContact] = useState("")
  const [message, setMessage] = useState("")
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle")

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !contact.trim()) return
    setState("sending")
    try {
      const res = await api.handleLeadCapture({ profileUrl, name: name.trim(), contact: contact.trim(), message: message.trim(), source: "Portfolio" })
      setState(res.success === false ? "error" : "sent")
    } catch {
      setState("error")
    }
  }

  const first = ownerName.split(/\s+/)[0] || ownerName
  return (
    <section id="contact" className="bg-[#06070b] px-5 py-16 text-white" style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-10">
        {state === "sent" ? (
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-400" />
            <p className="mt-4 text-xl font-bold">Merci, c&apos;est envoyé !</p>
            <p className="mt-1 text-white/60">{first} a bien reçu tes coordonnées.</p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-extrabold sm:text-3xl" style={{ fontFamily: "'Sora', sans-serif" }}>Laisse tes coordonnées à {first}</h2>
            <p className="mt-2 text-white/60">Pour un stage, un projet ou une collaboration : {first} te recontacte.</p>
            <form onSubmit={submit} className="mt-6 grid gap-3 sm:grid-cols-2">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ton nom"
                maxLength={80}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none placeholder:text-white/35 focus:border-white/40"
              />
              <input
                required
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Email ou téléphone"
                maxLength={120}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none placeholder:text-white/35 focus:border-white/40"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ton message (facultatif)"
                rows={3}
                maxLength={1000}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none placeholder:text-white/35 focus:border-white/40 sm:col-span-2"
              />
              <button
                type="submit"
                disabled={state === "sending"}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-black transition-transform hover:scale-[1.02] disabled:opacity-60 sm:col-span-2"
              >
                {state === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Envoyer
              </button>
              {state === "error" && <p className="text-sm text-red-400 sm:col-span-2">Envoi impossible, réessaie dans un instant.</p>}
            </form>
          </>
        )}
      </div>
    </section>
  )
}
