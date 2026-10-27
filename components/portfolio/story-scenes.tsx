"use client"

import { motion, useReducedMotion } from "framer-motion"

// Scenes animees de "Mon histoire" (modele Motion) : une illustration par
// chapitre, avec des personnages qui bougent. Tout en SVG + framer-motion,
// sans image ni fichier externe.

const INK = "#0b0f1a"
const SKIN = "#7a4a2a"

type P = { reduce: boolean }

const loop = (duration: number, delay = 0) => ({ duration, delay, repeat: Infinity, ease: "easeInOut" as const })

// Personnage stylise. walking = jambes et bras qui se balancent.
function Person({ x, y, s = 1, shirt = "#f97316", walking = false, wave = false, reduce }: { x: number; y: number; s?: number; shirt?: string; walking?: boolean; wave?: boolean } & P) {
  const swing = reduce ? 0 : 22
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {/* jambes */}
      <motion.line x1={0} y1={0} x2={0} y2={26} stroke={INK} strokeWidth={6} strokeLinecap="round" style={{ originX: "0px", originY: "0px" }}
        animate={walking ? { rotate: [swing, -swing, swing] } : undefined} transition={loop(0.9)} />
      <motion.line x1={0} y1={0} x2={0} y2={26} stroke={INK} strokeWidth={6} strokeLinecap="round" style={{ originX: "0px", originY: "0px" }}
        animate={walking ? { rotate: [-swing, swing, -swing] } : undefined} transition={loop(0.9)} />
      {/* corps */}
      <rect x={-10} y={-34} width={20} height={36} rx={9} fill={shirt} />
      {/* bras */}
      <motion.line x1={-8} y1={-28} x2={-12} y2={-6} stroke={SKIN} strokeWidth={5} strokeLinecap="round" style={{ originX: "-8px", originY: "-28px" }}
        animate={walking ? { rotate: [-swing, swing, -swing] } : undefined} transition={loop(0.9)} />
      <motion.line x1={8} y1={-28} x2={12} y2={wave ? -50 : -6} stroke={SKIN} strokeWidth={5} strokeLinecap="round" style={{ originX: "8px", originY: "-28px" }}
        animate={walking ? { rotate: [swing, -swing, swing] } : wave && !reduce ? { rotate: [-12, 18, -12] } : undefined} transition={loop(wave ? 0.7 : 0.9)} />
      {/* tete */}
      <circle cx={0} cy={-46} r={11} fill={SKIN} />
      <path d="M-11 -48 Q0 -62 11 -48 Q6 -54 0 -54 Q-6 -54 -11 -48Z" fill={INK} />
    </g>
  )
}

function Fireflies({ color = "#fde68a", n = 10, reduce }: { color?: string; n?: number } & P) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const x = 20 + ((i * 53) % 360)
        const y = 60 + ((i * 37) % 200)
        return (
          <motion.circle key={i} cx={x} cy={y} r={2} fill={color}
            animate={reduce ? undefined : { y: [0, -30, 0], opacity: [0, 1, 0] }}
            transition={loop(3 + (i % 4), i * 0.4)} />
        )
      })}
    </>
  )
}

// 1 - Le point de depart : marche vers le soleil levant
function Depart({ reduce }: P) {
  return (
    <>
      <defs>
        <linearGradient id="sc-sky0" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="60%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      <rect width={400} height={300} fill="url(#sc-sky0)" />
      <motion.circle cx={200} cy={215} r={46} fill="#fde68a" animate={reduce ? undefined : { cy: [235, 200, 235] }} transition={loop(10)} />
      {[0, 1, 2].map((i) => (
        <motion.path key={i} d="M0 0 q6 -6 12 0 q6 -6 12 0" fill="none" stroke={INK} strokeWidth={2.2}
          initial={{ x: -40 - i * 30, y: 70 + i * 18 }}
          animate={reduce ? undefined : { x: [-40 - i * 30, 430], y: [70 + i * 18, 50 + i * 12] }}
          transition={{ duration: 12, repeat: Infinity, delay: i * 1.2, ease: "linear" }} />
      ))}
      <rect y={238} width={400} height={62} fill="#111827" />
      <motion.path d="M0 238 Q100 228 200 238 T400 238" fill="none" stroke="#fbbf24" strokeOpacity={0.4} strokeWidth={2} />
      <motion.g animate={reduce ? undefined : { x: [-60, 460] }} transition={{ duration: 14, repeat: Infinity, ease: "linear" }}>
        <Person x={0} y={212} walking shirt="#3b82f6" reduce={reduce} />
        <rect x={-18} y={-30 + 212} width={10} height={18} rx={3} fill="#7c3aed" />
      </motion.g>
    </>
  )
}

// 2 - Naissance d'ABMCY : la nuit, on code
function Abmcy({ reduce }: P) {
  const code = ["</>", "{ }", "Go", "API", "k8s", "=>"]
  return (
    <>
      <rect width={400} height={300} fill="#0b1026" />
      {Array.from({ length: 24 }, (_, i) => (
        <motion.circle key={i} cx={(i * 71) % 400} cy={(i * 29) % 150} r={1.4} fill="#fff"
          animate={reduce ? undefined : { opacity: [0.2, 1, 0.2] }} transition={loop(2 + (i % 3), i * 0.2)} />
      ))}
      <motion.circle cx={330} cy={60} r={22} fill="#e5e7eb" opacity={0.9} />
      {/* bureau */}
      <rect x={110} y={210} width={190} height={10} rx={3} fill="#6b5a48" />
      <rect x={125} y={220} width={8} height={50} fill="#4b5563" />
      <rect x={277} y={220} width={8} height={50} fill="#4b5563" />
      {/* ordinateur */}
      <motion.rect x={190} y={160} width={80} height={50} rx={5} fill="#1f2937"
        animate={reduce ? undefined : { filter: ["drop-shadow(0 0 4px #3b82f6)", "drop-shadow(0 0 16px #3b82f6)", "drop-shadow(0 0 4px #3b82f6)"] }} transition={loop(2.5)} />
      <rect x={196} y={166} width={68} height={38} rx={3} fill="#1d4ed8" opacity={0.85} />
      {[0, 1, 2, 3].map((l) => (
        <motion.rect key={l} x={202} y={172 + l * 8} height={3} rx={1.5} fill="#bfdbfe"
          animate={reduce ? { width: 40 } : { width: [0, 30 + l * 6, 30 + l * 6] }} transition={loop(2.4, l * 0.3)} />
      ))}
      {/* personnage assis qui tape */}
      <g>
        <rect x={150} y={176} width={22} height={36} rx={9} fill="#f97316" />
        <circle cx={161} cy={164} r={11} fill={SKIN} />
        <path d="M150 162 Q161 148 172 162 Q167 156 161 156 Q155 156 150 162Z" fill={INK} />
        <motion.line x1={170} y1={186} x2={194} y2={204} stroke={SKIN} strokeWidth={5} strokeLinecap="round"
          animate={reduce ? undefined : { y2: [204, 200, 204] }} transition={loop(0.35)} />
        <rect x={150} y={210} width={30} height={8} rx={3} fill={INK} />
      </g>
      {code.map((c, i) => (
        <motion.text key={c} x={200 + ((i * 23) % 70)} y={150} fill="#93c5fd" fontSize={14} fontWeight={700} fontFamily="monospace"
          animate={reduce ? undefined : { y: [150, 40], opacity: [0, 1, 0] }} transition={{ duration: 4, repeat: Infinity, delay: i * 0.7, ease: "easeOut" }}>
          {c}
        </motion.text>
      ))}
    </>
  )
}

// 3 - Mahu Cards : la carte touche le telephone, le contact apparait
function Cards({ reduce }: P) {
  return (
    <>
      <rect width={400} height={300} fill="#0f172a" />
      <circle cx={200} cy={150} r={130} fill="#3b82f6" opacity={0.12} />
      {/* telephone */}
      <rect x={225} y={70} width={92} height={170} rx={14} fill="#111827" stroke="#334155" strokeWidth={3} />
      <rect x={232} y={82} width={78} height={146} rx={8} fill="#1e293b" />
      <motion.g animate={reduce ? { opacity: 1 } : { opacity: [0, 0, 1, 1, 0] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.4, 0.5, 0.9, 1] }}>
        <circle cx={271} cy={120} r={16} fill={SKIN} />
        <rect x={248} y={145} width={46} height={6} rx={3} fill="#e2e8f0" />
        <rect x={254} y={157} width={34} height={4} rx={2} fill="#60a5fa" />
        <rect x={246} y={180} width={50} height={14} rx={7} fill="#3b82f6" />
        <path d="M265 187 l4 4 l8 -8" stroke="#fff" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      </motion.g>
      {/* carte qui approche */}
      <motion.g animate={reduce ? undefined : { x: [-40, 30, 30, -40] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.35, 0.85, 1], ease: "easeInOut" }}>
        <rect x={110} y={120} width={100} height={64} rx={8} fill="#0a0a0a" stroke="#d4af37" strokeWidth={2} />
        <text x={124} y={146} fill="#fff" fontSize={14} fontWeight={800} fontFamily="sans-serif">mahu</text>
        <rect x={180} y={160} width={20} height={14} rx={3} fill="#d4af37" />
        {/* main */}
        <ellipse cx={128} cy={190} rx={22} ry={14} fill={SKIN} />
      </motion.g>
      {/* ondes NFC */}
      {[0, 1, 2].map((i) => (
        <motion.path key={i} d="M222 130 a26 26 0 0 1 0 40" fill="none" stroke="#60a5fa" strokeWidth={3} strokeLinecap="round"
          animate={reduce ? undefined : { opacity: [0, 0, 1, 0], scale: [0.6, 0.6, 1.4, 1.8] }}
          style={{ originX: "222px", originY: "150px" }}
          transition={{ duration: 4, repeat: Infinity, delay: i * 0.15, times: [0, 0.3, 0.45, 0.7] }} />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.circle key={i} cx={240 + i * 18} cy={60} r={3} fill="#fde68a"
          animate={reduce ? undefined : { y: [0, -20, 0], opacity: [0, 1, 0] }} transition={loop(2, i * 0.3 + 1.6)} />
      ))}
    </>
  )
}

// 4 - Dakar - Montreal : un avion traverse l'ocean
function Ocean({ reduce }: P) {
  return (
    <>
      <defs>
        <linearGradient id="sc-sky3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0c4a6e" />
          <stop offset="100%" stopColor="#082f49" />
        </linearGradient>
      </defs>
      <rect width={400} height={300} fill="url(#sc-sky3)" />
      {[0, 1, 2].map((i) => (
        <motion.path key={i} d="M0 0 q12 -14 26 -4 q8 -10 20 -2 q14 -2 12 10 h-58z" fill="#e0f2fe" opacity={0.25}
          initial={{ x: 60 + i * 120, y: 60 + i * 40 }}
          animate={reduce ? undefined : { x: [60 + i * 120, -80] }} transition={{ duration: 18 + i * 4, repeat: Infinity, ease: "linear" }} />
      ))}
      <path d="M0 250 Q100 240 200 250 T400 250 V300 H0Z" fill="#0369a1" opacity={0.6} />
      {/* deux villes */}
      <circle cx={70} cy={210} r={7} fill="#f5c451" />
      <circle cx={330} cy={110} r={7} fill="#f5c451" />
      <motion.circle cx={70} cy={210} r={7} fill="none" stroke="#f5c451" animate={reduce ? undefined : { r: [7, 22], opacity: [1, 0] }} transition={loop(2)} />
      <motion.circle cx={330} cy={110} r={7} fill="none" stroke="#f5c451" animate={reduce ? undefined : { r: [7, 22], opacity: [1, 0] }} transition={loop(2, 1)} />
      <motion.path d="M70 210 Q200 20 330 110" fill="none" stroke="#f5c451" strokeWidth={2} strokeDasharray="6 6"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, ease: "easeInOut" }} />
      {/* avion le long de l'arc */}
      <motion.g
        animate={reduce ? undefined : {
          x: [70, 110, 160, 200, 245, 290, 330],
          y: [210, 135, 88, 75, 82, 96, 110],
          rotate: [-55, -35, -15, 0, 12, 20, 25],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.8 }}>
        <path d="M-14 0 L14 0 M0 -2 L-6 -12 M0 2 L-6 12 M-12 0 L-16 -5 M-12 0 L-16 5" stroke="#fff" strokeWidth={4} strokeLinecap="round" />
      </motion.g>
    </>
  )
}

// 5 - Du code a la matiere : engrenages, bras robotise, camera qui balaie
function Gear({ cx, cy, r, teeth, color, dir, reduce }: { cx: number; cy: number; r: number; teeth: number; color: string; dir: 1 | -1 } & P) {
  return (
    <motion.g style={{ originX: `${cx}px`, originY: `${cy}px` }} animate={reduce ? undefined : { rotate: dir * 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}>
      {Array.from({ length: teeth }, (_, i) => (
        <rect key={i} x={cx - 5} y={cy - r - 8} width={10} height={14} rx={2} fill={color} transform={`rotate(${(360 / teeth) * i} ${cx} ${cy})`} />
      ))}
      <circle cx={cx} cy={cy} r={r} fill={color} />
      <circle cx={cx} cy={cy} r={r * 0.35} fill="#0f172a" />
    </motion.g>
  )
}

function Atelier({ reduce }: P) {
  return (
    <>
      <rect width={400} height={300} fill="#111827" />
      <Gear cx={90} cy={110} r={36} teeth={10} color="#f97316" dir={1} reduce={reduce} />
      <Gear cx={150} cy={160} r={24} teeth={8} color="#fbbf24" dir={-1} reduce={reduce} />
      {/* etagere + camera */}
      <rect x={250} y={150} width={120} height={8} fill="#8a6a4a" />
      <rect x={250} y={200} width={120} height={8} fill="#8a6a4a" />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={258 + i * 28} y={128} width={14} height={22} rx={3} fill={["#22c55e", "#3b82f6", "#ef4444", "#a855f7"][i]} />)}
      {[0, 1, 2].map((i) => <rect key={i} x={262 + i * 34} y={178} width={16} height={22} rx={3} fill={["#f59e0b", "#14b8a6", "#ec4899"][i]} />)}
      <rect x={300} y={40} width={24} height={14} rx={3} fill="#e5e7eb" />
      <motion.path d="M312 54 L262 150 L362 150 Z" fill="#60a5fa" opacity={0.15}
        style={{ originX: "312px", originY: "54px" }}
        animate={reduce ? undefined : { rotate: [-18, 18, -18] }} transition={loop(4)} />
      {/* bras robotise */}
      <rect x={180} y={262} width={50} height={12} rx={3} fill="#475569" />
      <motion.g style={{ originX: "205px", originY: "262px" }} animate={reduce ? undefined : { rotate: [-20, 15, -20] }} transition={loop(3.2)}>
        <rect x={199} y={196} width={12} height={66} rx={6} fill="#94a3b8" />
        <motion.g style={{ originX: "205px", originY: "200px" }} animate={reduce ? undefined : { rotate: [30, -10, 30] }} transition={loop(3.2)}>
          <rect x={199} y={150} width={12} height={52} rx={6} fill="#cbd5e1" />
          <path d="M198 150 l-6 -10 M212 150 l6 -10" stroke="#f97316" strokeWidth={4} strokeLinecap="round" />
        </motion.g>
      </motion.g>
      {/* etincelles */}
      {[0, 1, 2, 3].map((i) => (
        <motion.circle key={i} cx={205} cy={140} r={2} fill="#fde68a"
          animate={reduce ? undefined : { x: [0, (i - 1.5) * 18], y: [0, -14 - i * 4], opacity: [1, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }} />
      ))}
    </>
  )
}

// 6 - Et la suite : un globe qui s'allume et des gens qui saluent
function Suite({ reduce }: P) {
  const lights = [[160, 110], [190, 95], [210, 130], [175, 140], [230, 105], [150, 125], [200, 160]]
  return (
    <>
      <defs>
        <radialGradient id="sc-glow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#1d4ed8" stopOpacity={0.7} />
          <stop offset="100%" stopColor="#020617" stopOpacity={1} />
        </radialGradient>
      </defs>
      <rect width={400} height={300} fill="url(#sc-glow)" />
      <circle cx={200} cy={125} r={70} fill="#0f2a5f" stroke="#60a5fa" strokeOpacity={0.5} />
      <ellipse cx={200} cy={125} rx={70} ry={24} fill="none" stroke="#60a5fa" strokeOpacity={0.25} />
      <ellipse cx={200} cy={125} rx={30} ry={70} fill="none" stroke="#60a5fa" strokeOpacity={0.25} />
      {lights.map(([x, y], i) => (
        <motion.circle key={i} cx={x} cy={y} r={4} fill="#f5c451"
          animate={reduce ? undefined : { scale: [0.6, 1.4, 0.6], opacity: [0.4, 1, 0.4] }} transition={loop(2, i * 0.3)} />
      ))}
      <rect y={258} width={400} height={42} fill="#0b1226" />
      <Person x={130} y={250} shirt="#22c55e" wave reduce={reduce} />
      <Person x={200} y={250} s={1.1} shirt="#3b82f6" wave reduce={reduce} />
      <Person x={270} y={250} shirt="#f97316" wave reduce={reduce} />
      <motion.path d="M200 40 c-6 -10 -20 -6 -18 6 c2 10 18 18 18 18 s16 -8 18 -18 c2 -12 -12 -16 -18 -6z" fill="#ef4444"
        style={{ originX: "200px", originY: "50px" }}
        animate={reduce ? undefined : { scale: [1, 1.25, 1] }} transition={loop(1.1)} />
    </>
  )
}

const SCENES = [Depart, Abmcy, Cards, Ocean, Atelier, Suite]

export function StoryScene({ index, className = "" }: { index: number; className?: string }) {
  const reduce = !!useReducedMotion()
  const Scene = SCENES[index % SCENES.length]
  return (
    <svg viewBox="0 0 400 300" className={`overflow-hidden rounded-3xl ${className}`} role="img" aria-hidden>
      <Scene reduce={reduce} />
      <Fireflies reduce={reduce} n={index === 5 ? 16 : 8} />
    </svg>
  )
}
