"use client"

// Choix et recadrage d'une image avant envoi : la personne deplace l'image dans
// le cadre (rond pour la photo, bandeau pour la couverture) et regle le zoom ;
// le resultat est redessine a la taille finale (ex. 600 x 600) en JPEG, pour
// que la carte s'affiche net et vite, quelle que soit la photo de depart.

import { useCallback, useEffect, useRef, useState } from "react"
import { ImagePlus, X } from "lucide-react"

type Props = {
  label: string
  aspect: number // largeur / hauteur du cadre
  round?: boolean
  outWidth: number
  onChange: (file: File | null) => void
}

type View = { x: number; y: number; zoom: number }

export function ImageCropField({ label, aspect, round = false, outWidth, onChange }: Props) {
  const frameRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [frameW, setFrameW] = useState(0)
  const [view, setView] = useState<View>({ x: 0, y: 0, zoom: 1 })
  const [error, setError] = useState("")
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null)
  const frameH = frameW / aspect

  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setFrameW(el.clientWidth))
    ro.observe(el)
    setFrameW(el.clientWidth)
    return () => ro.disconnect()
  }, [img])

  // Taille affichee de l'image : elle couvre toujours tout le cadre.
  const shown = useCallback(
    (zoom: number) => {
      if (!img || !frameW) return { w: 0, h: 0 }
      const base = Math.max(frameW / img.naturalWidth, frameH / img.naturalHeight)
      return { w: img.naturalWidth * base * zoom, h: img.naturalHeight * base * zoom }
    },
    [img, frameW, frameH]
  )

  const clamp = useCallback(
    (v: View): View => {
      const { w, h } = shown(v.zoom)
      return { zoom: v.zoom, x: Math.min(0, Math.max(frameW - w, v.x)), y: Math.min(0, Math.max(frameH - h, v.y)) }
    },
    [shown, frameW, frameH]
  )

  // Centre l'image a l'ouverture.
  useEffect(() => {
    if (!img || !frameW) return
    const { w, h } = shown(1)
    setView({ zoom: 1, x: (frameW - w) / 2, y: (frameH - h) / 2 })
  }, [img, frameW, frameH, shown])

  const exportCrop = useCallback(
    (v: View) => {
      if (!img || !frameW) return
      const outH = Math.round(outWidth / aspect)
      const k = outWidth / frameW
      const { w, h } = shown(v.zoom)
      const canvas = document.createElement("canvas")
      canvas.width = outWidth
      canvas.height = outH
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, outWidth, outH)
      ctx.imageSmoothingQuality = "high"
      ctx.drawImage(img, v.x * k, v.y * k, w * k, h * k)
      canvas.toBlob(
        (blob) => blob && onChange(new File([blob], round ? "photo.jpg" : "couverture.jpg", { type: "image/jpeg" })),
        "image/jpeg",
        0.88
      )
    },
    [img, frameW, outWidth, aspect, shown, onChange, round]
  )

  // Le fichier final suit chaque reglage (apres un court delai).
  useEffect(() => {
    if (!img || !frameW) return
    const t = setTimeout(() => exportCrop(view), 250)
    return () => clearTimeout(t)
  }, [view, img, frameW, exportCrop])

  const pick = (file: File | undefined) => {
    setError("")
    if (!file) return
    if (!file.type.startsWith("image/")) return setError("Choisissez une image (JPG ou PNG).")
    if (file.size > 15 * 1024 * 1024) return setError("Image trop lourde (15 Mo au maximum).")
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => setImg(image)
    image.onerror = () => setError("Image illisible : essayez une photo JPG ou PNG.")
    image.src = url
  }

  const clear = () => {
    setImg(null)
    onChange(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  const { w, h } = shown(view.zoom)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        {img && (
          <button type="button" onClick={clear} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <X className="w-3 h-3" /> Retirer
          </button>
        )}
      </div>
      {img ? (
        <>
          <div className={round ? "mx-auto w-40" : "w-full"}>
            <div
              ref={frameRef}
              className={`relative w-full overflow-hidden bg-muted/40 touch-none cursor-grab active:cursor-grabbing select-none ${round ? "rounded-full" : "rounded-xl"}`}
              style={{ aspectRatio: String(aspect) }}
              onPointerDown={(e) => {
                ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
                drag.current = { px: e.clientX, py: e.clientY, x: view.x, y: view.y }
              }}
              onPointerMove={(e) => {
                if (!drag.current) return
                const d = drag.current
                setView((v) => clamp({ ...v, x: d.x + e.clientX - d.px, y: d.y + e.clientY - d.py }))
              }}
              onPointerUp={() => (drag.current = null)}
              onPointerCancel={() => (drag.current = null)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src}
                alt=""
                draggable={false}
                className="absolute max-w-none pointer-events-none"
                style={{ left: view.x, top: view.y, width: w, height: h }}
              />
            </div>
          </div>
          <label className="flex items-center gap-3 text-xs text-muted-foreground">
            Zoom
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={view.zoom}
              onChange={(e) => {
                const zoom = Number(e.target.value)
                // Zoom autour du centre du cadre.
                setView((v) => {
                  const cx = frameW / 2, cy = frameH / 2
                  const r = zoom / v.zoom
                  return clamp({ zoom, x: cx - (cx - v.x) * r, y: cy - (cy - v.y) * r })
                })
              }}
              className="flex-1"
            />
          </label>
          <p className="text-xs text-muted-foreground text-center">Faites glisser l&apos;image pour la placer.</p>
        </>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`w-full border border-dashed border-border/70 bg-muted/20 hover:bg-muted/40 transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground text-sm ${
            round ? "mx-auto w-28 h-28 rounded-full" : "rounded-xl"
          }`}
          style={round ? undefined : { aspectRatio: String(aspect) }}
        >
          <ImagePlus className="w-5 h-5" />
          {round ? "Photo" : "Ajouter une banniere"}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
