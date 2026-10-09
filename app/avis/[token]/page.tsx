"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Check, Loader2, Star } from "lucide-react"

// Avis client en un clic, depuis un email de l'Emailing admin :
//   /avis/<token>?note=4          -> la note est enregistree a l'ouverture
//   /avis/<token>?desinscription=1 -> confirmation de desinscription
// Le token (unique par client et par campagne) remplace toute connexion.

interface Info {
  firstName: string
  senderName: string
  rating?: number
  comment?: string
  unsubscribed?: boolean
  test?: boolean
}

const LABELS = ["", "Pas satisfait", "Peu satisfait", "Correct", "Satisfait", "Tres satisfait"]

async function call<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/backend/api/outreach/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || "Une erreur est survenue, reessayez.")
  return data as T
}

export default function AvisPage() {
  const { token } = useParams<{ token: string }>()
  const params = useSearchParams()
  const wantsUnsubscribe = params.get("desinscription") === "1"
  const noteParam = Number(params.get("note"))

  const [info, setInfo] = useState<Info | null>(null)
  const [error, setError] = useState("")
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState("")
  const [saving, setSaving] = useState(false)
  const [savedRating, setSavedRating] = useState(false)
  const [done, setDone] = useState(false)
  const [unsubscribed, setUnsubscribed] = useState(false)
  const autoSent = useRef(false)

  useEffect(() => {
    call<Info>(token)
      .then((i) => {
        setInfo(i)
        setComment(i.comment || "")
        setUnsubscribed(!!i.unsubscribed)
        const initial = noteParam >= 1 && noteParam <= 5 ? noteParam : i.rating || 0
        setRating(initial)
        if (i.rating) setSavedRating(true)
        // Clic sur une etoile dans l'email : la note compte tout de suite,
        // meme si le client ferme la page sans ecrire de commentaire.
        if (noteParam >= 1 && noteParam <= 5 && !wantsUnsubscribe && !autoSent.current) {
          autoSent.current = true
          call(`${token}/feedback`, { rating: noteParam, comment: i.comment || "" })
            .then(() => setSavedRating(true))
            .catch(() => undefined)
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Lien invalide"))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const submit = async () => {
    if (rating < 1) return
    setSaving(true)
    setError("")
    try {
      await call(`${token}/feedback`, { rating, comment })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setSaving(false)
    }
  }

  const unsubscribe = async () => {
    setSaving(true)
    setError("")
    try {
      await call(`${token}/unsubscribe`, {})
      setUnsubscribed(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setSaving(false)
    }
  }

  const shell = (content: React.ReactNode) => (
    <div className="min-h-screen bg-[#f5f7fa] px-4 py-12 text-[#1f2933]">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" className="h-9 w-9 rounded-xl" />
          <span className="text-lg font-bold">Mahu</span>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">{content}</div>
      </div>
    </div>
  )

  if (error && !info) {
    return shell(<p className="text-center text-sm text-red-600">{error}</p>)
  }
  if (!info) {
    return shell(
      <div className="flex justify-center py-6">
        <Loader2 className="h-6 w-6 animate-spin text-[#007AFF]" />
      </div>
    )
  }

  if (wantsUnsubscribe) {
    return shell(
      unsubscribed ? (
        <div className="text-center">
          <Check className="mx-auto h-10 w-10 text-green-600" />
          <p className="mt-3 font-semibold">C&apos;est fait.</p>
          <p className="mt-1 text-sm text-[#52606d]">Vous ne recevrez plus ces emails de notre part.</p>
        </div>
      ) : (
        <div className="text-center">
          <p className="font-semibold">Ne plus recevoir nos emails ?</p>
          <p className="mt-1 text-sm text-[#52606d]">
            Vous ne recevrez plus les messages de l&apos;equipe Mahu. Votre carte et votre profil continuent de
            fonctionner normalement.
          </p>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <button
            onClick={unsubscribe}
            disabled={saving}
            className="mt-5 w-full rounded-xl bg-[#1f2933] py-3 font-semibold text-white disabled:opacity-60"
          >
            {saving ? "..." : "Me desinscrire"}
          </button>
        </div>
      )
    )
  }

  if (done) {
    return shell(
      <div className="text-center">
        <Check className="mx-auto h-10 w-10 text-green-600" />
        <p className="mt-3 font-semibold">Merci{info.firstName ? ` ${info.firstName}` : ""} !</p>
        <p className="mt-1 text-sm text-[#52606d]">
          Votre avis a bien ete transmis a {info.senderName}. Il nous aide vraiment a ameliorer Mahu.
        </p>
      </div>
    )
  }

  const shown = hover || rating
  return shell(
    <div>
      <p className="text-center text-lg font-semibold">
        {info.firstName ? `${info.firstName}, que` : "Que"} pensez-vous de votre carte Mahu ?
      </p>
      {info.test && <p className="mt-1 text-center text-xs text-amber-600">Lien de test : rien n&apos;est enregistre.</p>}

      <div className="mt-5 flex justify-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} sur 5`}
            onMouseEnter={() => setHover(n)}
            onClick={() => setRating(n)}
            className="p-1"
          >
            <Star className={`h-10 w-10 ${n <= shown ? "fill-amber-400 text-amber-400" : "text-[#cbd2d9]"}`} />
          </button>
        ))}
      </div>
      <p className="mt-1 h-5 text-center text-sm text-[#52606d]">{LABELS[shown]}</p>
      {savedRating && rating > 0 && !hover && (
        <p className="text-center text-xs text-green-700">Note enregistree. Un commentaire nous aiderait encore plus :</p>
      )}

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={4}
        maxLength={3000}
        placeholder={
          rating && rating <= 3 ? "Qu'est-ce qui ne va pas ? Nous voulons le corriger." : "Ce qui vous plait, ce qu'on peut ameliorer..."
        }
        className="mt-4 w-full rounded-xl border border-[#d9e2ec] p-3 text-sm outline-none focus:border-[#007AFF]"
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button
        onClick={submit}
        disabled={saving || rating < 1}
        className="mt-3 w-full rounded-xl bg-[#007AFF] py-3 font-semibold text-white disabled:opacity-50"
      >
        {saving ? "Envoi..." : "Envoyer mon avis"}
      </button>
      <p className="mt-3 text-center text-xs text-[#9aa5b1]">Vous pouvez aussi repondre directement a l&apos;email.</p>
    </div>
  )
}
