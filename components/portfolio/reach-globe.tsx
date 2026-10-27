"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion, useInView } from "framer-motion"
import { geoDistance, geoInterpolate, geoOrthographic, geoPath, geoGraticule10, type GeoPermissibleObjects } from "d3-geo"
import { feature } from "topojson-client"
import type { PortfolioItem } from "@/lib/portfolio"

// Globe "presence dans le monde" du modele Motion. Chaque element de reach :
// title = pays, org = nombre de comptes, period = nombre de vendeurs,
// description = precision (ex. "MIAD Market · Montreal"). Les arcs partent de
// Dakar ; Benin et Canada sont mis en avant.

type Place = { lat: number; lon: number; iso: string }

const PLACES: Record<string, Place> = {
  "Sénégal": { lat: 14.69, lon: -17.45, iso: "686" },
  "Burkina Faso": { lat: 12.37, lon: -1.53, iso: "854" },
  "Cameroun": { lat: 3.87, lon: 11.52, iso: "120" },
  "Côte d'Ivoire": { lat: 5.35, lon: -4.0, iso: "384" },
  "Bénin": { lat: 6.37, lon: 2.43, iso: "204" },
  "Congo-Brazzaville": { lat: -0.7, lon: 15.2, iso: "178" },
  "RD Congo": { lat: -2.9, lon: 23.6, iso: "180" },
  "Mali": { lat: 12.64, lon: -8.0, iso: "466" },
  "Gabon": { lat: -0.6, lon: 11.6, iso: "266" },
  "Niger": { lat: 13.51, lon: 2.11, iso: "562" },
  "Guinée": { lat: 9.64, lon: -13.58, iso: "324" },
  "Tchad": { lat: 12.13, lon: 15.06, iso: "148" },
  "Guinée-Bissau": { lat: 11.86, lon: -15.6, iso: "624" },
  "Togo": { lat: 6.13, lon: 1.22, iso: "768" },
  "Mauritanie": { lat: 18.08, lon: -15.98, iso: "478" },
  "Brésil": { lat: -15.8, lon: -47.9, iso: "076" },
  "Kenya": { lat: -1.29, lon: 36.82, iso: "404" },
  "Algérie": { lat: 36.75, lon: 3.06, iso: "012" },
  "Nigeria": { lat: 9.08, lon: 7.4, iso: "566" },
  "Canada": { lat: 45.5, lon: -73.57, iso: "124" },
  "Maroc": { lat: 33.97, lon: -6.85, iso: "504" },
  "France": { lat: 48.86, lon: 2.35, iso: "250" },
}
const HUB = PLACES["Sénégal"]
const FEATURED = new Set(["Bénin", "Canada"])
const BLUE = "#3b82f6"
const GOLD = "#f5c451"

const num = (s?: string) => Number((s || "").replace(/\D/g, "")) || 0

type CountryFeature = GeoPermissibleObjects & { id?: string | number }

function useCountries() {
  const [list, setList] = useState<CountryFeature[] | null>(null)
  useEffect(() => {
    fetch("/geo/countries-110m.json")
      .then((r) => r.json())
      .then((topo) => {
        const fc = feature(topo, topo.objects.countries) as unknown as { features: CountryFeature[] }
        setList(fc.features)
      })
      .catch(() => setList(null))
  }, [])
  return list
}

function Globe({ items }: { items: PortfolioItem[] }) {
  const countries = useCountries()
  const wrap = useRef<HTMLDivElement>(null)
  const inView = useInView(wrap, { margin: "-80px" })
  const [rot, setRot] = useState<[number, number]>([8, -12])
  const [t, setT] = useState(0)
  const drag = useRef<{ x: number; y: number; r: [number, number] } | null>(null)
  const size = 560

  const points = useMemo(
    () => items.map((it) => ({ it, p: PLACES[it.title] })).filter((x): x is { it: PortfolioItem; p: Place } => !!x.p),
    [items]
  )
  const active = useMemo(() => new Set(points.map((x) => x.p.iso)), [points])
  const max = Math.max(1, ...points.map((x) => num(x.it.org)))

  // rotation lente + horloge des arcs, seulement quand le globe est visible
  useEffect(() => {
    if (!inView) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = now - last
      last = now
      setT((x) => x + dt)
      if (!drag.current) setRot(([l, p]) => [l + dt * 0.006, p])
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView])

  const projection = geoOrthographic().scale(size / 2 - 8).translate([size / 2, size / 2]).rotate([rot[0], rot[1]]).clipAngle(90)
  const path = geoPath(projection)
  const center: [number, number] = [-rot[0], -rot[1]]
  const visible = (lon: number, lat: number) => geoDistance([lon, lat], center) < Math.PI / 2 - 0.05

  const arcs = points
    .filter((x) => x.p !== HUB)
    .map((x, i) => {
      const interp = geoInterpolate([HUB.lon, HUB.lat], [x.p.lon, x.p.lat])
      const coords = Array.from({ length: 33 }, (_, k) => interp(k / 32))
      const d = path({ type: "LineString", coordinates: coords } as GeoPermissibleObjects) || ""
      const featured = FEATURED.has(x.it.title)
      // impulsion lumineuse qui parcourt l'arc
      const phase = ((t / 2600 + i * 0.13) % 1) * 100
      return { d, featured, phase, key: x.it.title }
    })

  return (
    <div ref={wrap} className="relative mx-auto aspect-square w-full max-w-[560px] touch-none select-none">
      <div className="absolute inset-[6%] rounded-full blur-3xl" style={{ background: `radial-gradient(circle, ${BLUE}55, transparent 70%)` }} />
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="relative h-full w-full cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => {
          ;(e.target as Element).setPointerCapture?.(e.pointerId)
          drag.current = { x: e.clientX, y: e.clientY, r: rot }
        }}
        onPointerMove={(e) => {
          if (!drag.current) return
          const k = 0.35
          setRot([drag.current.r[0] + (e.clientX - drag.current.x) * k, Math.max(-60, Math.min(60, drag.current.r[1] - (e.clientY - drag.current.y) * k))])
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerLeave={() => (drag.current = null)}
      >
        <defs>
          <radialGradient id="ocean" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#13213d" />
            <stop offset="100%" stopColor="#070b16" />
          </radialGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 8} fill="url(#ocean)" stroke="rgba(255,255,255,0.12)" />
        <path d={path(geoGraticule10()) || ""} fill="none" stroke="rgba(255,255,255,0.05)" />
        {countries?.map((f, i) => {
          const on = active.has(String(f.id))
          return (
            <path
              key={i}
              d={path(f) || ""}
              fill={on ? "rgba(59,130,246,0.55)" : "rgba(255,255,255,0.08)"}
              stroke={on ? "rgba(147,197,253,0.8)" : "rgba(255,255,255,0.12)"}
              strokeWidth={on ? 0.8 : 0.4}
            />
          )
        })}
        {arcs.map((a) => (
          <g key={a.key}>
            <path d={a.d} fill="none" stroke={a.featured ? GOLD : BLUE} strokeOpacity={0.35} strokeWidth={a.featured ? 2 : 1.2} />
            <path
              d={a.d}
              fill="none"
              stroke={a.featured ? GOLD : "#93c5fd"}
              strokeWidth={a.featured ? 2.6 : 1.8}
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray="12 88"
              strokeDashoffset={100 - a.phase}
            />
          </g>
        ))}
        {points.map(({ it, p }) => {
          if (!visible(p.lon, p.lat)) return null
          const [x, y] = projection([p.lon, p.lat]) || [0, 0]
          const n = num(it.org)
          const r = 3 + (n / max) * 9
          const hub = p === HUB
          const pulse = (t / 1600 + (p.lon + 180) / 360) % 1
          return (
            <g key={it.title}>
              <circle cx={x} cy={y} r={r + pulse * 14} fill="none" stroke={hub || FEATURED.has(it.title) ? GOLD : BLUE} strokeOpacity={1 - pulse} />
              <circle cx={x} cy={y} r={r} fill={hub || FEATURED.has(it.title) ? GOLD : "#60a5fa"} stroke="#06070b" strokeWidth={1.5} />
              {(hub || n >= 20 || FEATURED.has(it.title)) && (
                <text x={x + r + 5} y={y + 4} fill="#fff" fontSize={13} fontWeight={700} style={{ paintOrder: "stroke", stroke: "#06070b", strokeWidth: 3 }}>
                  {it.title}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <p className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 text-xs text-white/40">Fais tourner le globe</p>
    </div>
  )
}

function Count({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!inView) return
    const start = performance.now()
    let raf = 0
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / 1600)
      setN(Math.round(to * (1 - Math.pow(1 - k, 3))))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [inView, to])
  return <span ref={ref}>{n}</span>
}

export function ReachSection({ items, index }: { items: PortfolioItem[]; index: string }) {
  const accounts = items.reduce((s, x) => s + num(x.org), 0)
  const sellers = items.reduce((s, x) => s + num(x.period), 0)
  const countries = items.filter((x) => PLACES[x.title]).length
  const ranked = items.filter((x) => num(x.org) > 0).sort((a, b) => num(b.org) - num(a.org))
  const top = ranked.slice(0, 8)
  const max = Math.max(1, ...top.map((x) => num(x.org)))

  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div className="mb-10 flex items-end gap-4">
        <span className="text-sm text-white/40" style={{ fontFamily: "'Space Mono', monospace" }}>{index}</span>
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl" style={{ fontFamily: "'Sora', sans-serif" }}>Présence dans le monde</h2>
        <span className="mb-3 h-px flex-1 bg-gradient-to-r from-white/25 to-transparent" />
      </div>
      <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Globe items={items} />
        <div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { v: accounts, l: "comptes" },
              { v: sellers, l: "vendeurs" },
              { v: countries, l: "pays" },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-3xl font-extrabold sm:text-4xl" style={{ fontFamily: "'Sora', sans-serif" }}><Count to={s.v} /></p>
                <p className="text-sm text-white/55">{s.l}</p>
              </div>
            ))}
          </div>
          <ul className="mt-8 space-y-3">
            {top.map((x, i) => (
              <li key={x.title}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-semibold">{x.title}</span>
                  <span className="text-white/55">{num(x.org)} comptes{num(x.period) ? ` · ${num(x.period)} vendeurs` : ""}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(num(x.org) / max) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.1, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full rounded-full"
                    style={{ background: FEATURED.has(x.title) || i === 0 ? `linear-gradient(90deg, ${GOLD}, #f59e0b)` : `linear-gradient(90deg, ${BLUE}, #93c5fd)` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          {items.filter((x) => x.description && !num(x.org)).map((x) => (
            <p key={x.title} className="mt-6 flex items-center gap-2 text-sm text-white/70">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: GOLD }} />
              <b>{x.title}</b> · {x.description}
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}
