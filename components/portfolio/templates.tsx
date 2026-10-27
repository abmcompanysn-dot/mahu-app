/* eslint-disable @next/next/no-img-element */
import { videoEmbed, type PortfolioItem, type PortfolioView } from "@/lib/portfolio"
import { MotionTemplate } from "@/components/portfolio/motion-template"

// Les 5 modeles de portfolio etudiant. Ils ne recoivent que des donnees (pas
// d'etat) : la meme vue sert a la page publique, aux demos et a l'apercu de
// l'editeur. Polices chargees par app/portfolio/layout.tsx.

const F = {
  serif: "'Fraunces', Georgia, serif",
  sans: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
  display: "'Sora', 'Segoe UI', system-ui, sans-serif",
  mono: "'Space Mono', ui-monospace, Consolas, monospace",
}

const LINK_LABEL: Record<string, string> = {
  linkedin: "LinkedIn", github: "GitHub", website: "Site web", instagram: "Instagram", twitter: "X",
  facebook: "Facebook", youtube: "YouTube", tiktok: "TikTok", whatsapp: "WhatsApp", behance: "Behance", snapchat: "Snapchat",
}

function contactList(v: PortfolioView) {
  const out: Array<{ label: string; href: string }> = []
  if (v.email) out.push({ label: v.email, href: `mailto:${v.email}` })
  if (v.phone) out.push({ label: v.phone, href: `tel:${v.phone.replace(/\s/g, "")}` })
  for (const l of v.links) out.push({ label: LINK_LABEL[l.type] || l.type, href: l.url })
  return out
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "M"
}

function Avatar({ v, className, ring }: { v: PortfolioView; className: string; ring?: string }) {
  return v.photo ? (
    <img src={v.photo} alt={v.name} className={`${className} object-cover`} style={ring ? { boxShadow: ring } : undefined} />
  ) : (
    <div className={`${className} flex items-center justify-center font-bold`} style={ring ? { boxShadow: ring } : undefined}>
      {initials(v.name)}
    </div>
  )
}

// Video de realisation si le projet en a une, sinon son image.
function ProjectMedia({ p, className }: { p: PortfolioItem; className: string }) {
  const video = videoEmbed(p.videoUrl)
  if (video?.kind === "iframe") {
    return (
      <div className={`${className} relative bg-black`}>
        <iframe src={video.src} title={p.title} loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen className="absolute inset-0 h-full w-full border-0" />
      </div>
    )
  }
  if (video) return <video src={video.src} poster={p.imageUrl || undefined} controls playsInline preload="metadata" className={`${className} bg-black object-cover`} />
  return p.imageUrl ? <img src={p.imageUrl} alt="" className={`${className} object-cover`} /> : null
}

function studies(v: PortfolioView) {
  return [v.level, v.field, v.school].filter(Boolean).join(" · ")
}

function Timeline({ items, dot, muted }: { items: PortfolioItem[]; dot: string; muted: string }) {
  return (
    <ul className="space-y-5">
      {items.map((it, i) => (
        <li key={i} className="grid grid-cols-[14px_minmax(0,1fr)] gap-3">
          <span className="mt-2 h-2.5 w-2.5 rounded-full" style={{ background: dot }} />
          <div className="min-w-0">
            <p className="font-semibold">{it.title}</p>
            {(it.org || it.period) && <p className="text-sm" style={{ color: muted }}>{[it.org, it.period].filter(Boolean).join(" · ")}</p>}
            {it.description && <p className="mt-1 text-sm leading-relaxed" style={{ color: muted }}>{it.description}</p>}
          </div>
        </li>
      ))}
    </ul>
  )
}

// ---------------------------------------------------------------- Eclat

function Eclat({ v }: { v: PortfolioView }) {
  const ink = "#16181d", muted = "#5d6270", accent = "#1d4ed8"
  return (
    <div className="min-h-screen bg-[#f7f5f0]" style={{ fontFamily: F.sans, color: ink }}>
      <div className="mx-auto max-w-5xl px-5 py-12 sm:py-20">
        <header className="grid items-center gap-8 sm:grid-cols-[minmax(0,1fr)_200px]">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>{studies(v)}</p>
            <h1 className="mt-4 text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-7xl" style={{ fontFamily: F.serif }}>{v.name}</h1>
            {v.title && <p className="mt-4 text-2xl font-bold" style={{ color: accent }}>{v.title}</p>}
            {v.headline && <p className="mt-5 max-w-xl text-xl leading-snug" style={{ color: muted }}>{v.headline}</p>}
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {contactList(v).map((c) => <a key={c.href} href={c.href} className="font-semibold underline decoration-2 underline-offset-4" style={{ textDecorationColor: accent }}>{c.label}</a>)}
              {v.cvUrl && <a href={v.cvUrl} className="font-semibold" style={{ color: accent }}>Télécharger mon CV →</a>}
            </div>
          </div>
          <Avatar v={v} className="h-40 w-40 rounded-full bg-[#e7e2d8] text-4xl sm:h-[200px] sm:w-[200px]" />
        </header>

        {v.about && <p className="mt-14 max-w-3xl border-l-4 pl-5 text-lg leading-relaxed" style={{ borderColor: accent }}>{v.about}</p>}

        {v.projects.length > 0 && (
          <section className="mt-16">
            <h2 className="text-3xl font-extrabold" style={{ fontFamily: F.serif }}>Projets</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {v.projects.map((p, i) => (
                <article key={i} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                  <ProjectMedia p={p} className="aspect-[16/10] w-full" />
                  <div className="p-5">
                    <h3 className="text-lg font-bold">{p.title}</h3>
                    {p.description && <p className="mt-2 text-sm leading-relaxed" style={{ color: muted }}>{p.description}</p>}
                    {p.link && <a href={p.link} className="mt-3 inline-block text-sm font-semibold" style={{ color: accent }}>Voir le projet →</a>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="mt-16 grid gap-12 sm:grid-cols-2">
          {v.experiences.length > 0 && <section><h2 className="mb-5 text-2xl font-extrabold" style={{ fontFamily: F.serif }}>Expériences</h2><Timeline items={v.experiences} dot={accent} muted={muted} /></section>}
          {v.education.length > 0 && <section><h2 className="mb-5 text-2xl font-extrabold" style={{ fontFamily: F.serif }}>Formation</h2><Timeline items={v.education} dot={accent} muted={muted} /></section>}
        </div>

        {(v.skills.length > 0 || v.languages.length > 0) && (
          <section className="mt-16 grid gap-10 sm:grid-cols-2">
            {v.skills.length > 0 && <div><h2 className="mb-4 text-2xl font-extrabold" style={{ fontFamily: F.serif }}>Compétences</h2><div className="flex flex-wrap gap-2">{v.skills.map((s) => <span key={s} className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold ring-1 ring-black/10">{s}</span>)}</div></div>}
            {v.languages.length > 0 && <div><h2 className="mb-4 text-2xl font-extrabold" style={{ fontFamily: F.serif }}>Langues</h2><p className="text-lg" style={{ color: muted }}>{v.languages.join(" · ")}</p></div>}
          </section>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Nuit

function Nuit({ v }: { v: PortfolioView }) {
  const gold = "#d4af37", muted = "#a3a9b8"
  return (
    <div className="min-h-screen bg-[#07090f] text-white" style={{ fontFamily: F.sans }}>
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.16),transparent_60%)]" />
      <div className="relative mx-auto max-w-3xl px-5 py-14 text-center sm:py-20">
        <Avatar v={v} className="mx-auto h-32 w-32 rounded-full bg-[#1a1f2b] text-3xl text-[#d4af37]" ring={`0 0 0 3px #07090f, 0 0 0 5px ${gold}`} />
        <h1 className="mt-7 text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ fontFamily: F.display }}>{v.name}</h1>
        {v.title && <p className="mt-2 text-xl font-bold" style={{ color: gold }}>{v.title}</p>}
        {v.headline && <p className="mx-auto mt-3 max-w-xl text-lg" style={{ color: muted }}>{v.headline}</p>}
        <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: gold }}>{studies(v)}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          {contactList(v).map((c) => <a key={c.href} href={c.href} className="rounded-full border border-white/15 px-4 py-2 text-sm hover:border-[#d4af37]">{c.label}</a>)}
          {v.cvUrl && <a href={v.cvUrl} className="rounded-full px-4 py-2 text-sm font-bold text-black" style={{ background: gold }}>Mon CV</a>}
        </div>
      </div>
      <div className="relative mx-auto max-w-3xl space-y-14 px-5 pb-20">
        {v.about && <p className="text-center text-lg leading-relaxed text-white/85">{v.about}</p>}
        {v.projects.length > 0 && (
          <section>
            <h2 className="mb-6 text-center text-xs font-bold uppercase tracking-[0.3em]" style={{ color: gold }}>Projets</h2>
            <div className="space-y-4">
              {v.projects.map((p, i) => (
                <article key={i} className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-[180px_minmax(0,1fr)]">
                  {p.imageUrl || p.videoUrl ? <ProjectMedia p={p} className="aspect-[4/3] w-full overflow-hidden rounded-xl" /> : <div className="hidden sm:block" />}
                  <div className="min-w-0 text-left">
                    <h3 className="text-lg font-bold" style={{ fontFamily: F.display }}>{p.title}</h3>
                    {p.description && <p className="mt-1.5 text-sm leading-relaxed" style={{ color: muted }}>{p.description}</p>}
                    {p.link && <a href={p.link} className="mt-2 inline-block text-sm font-semibold" style={{ color: gold }}>Voir le projet →</a>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
        <div className="grid gap-12 text-left sm:grid-cols-2">
          {v.experiences.length > 0 && <section><h2 className="mb-5 text-xs font-bold uppercase tracking-[0.3em]" style={{ color: gold }}>Expériences</h2><Timeline items={v.experiences} dot={gold} muted={muted} /></section>}
          {v.education.length > 0 && <section><h2 className="mb-5 text-xs font-bold uppercase tracking-[0.3em]" style={{ color: gold }}>Formation</h2><Timeline items={v.education} dot={gold} muted={muted} /></section>}
        </div>
        {v.skills.length > 0 && (
          <section className="text-center">
            <h2 className="mb-5 text-xs font-bold uppercase tracking-[0.3em]" style={{ color: gold }}>Compétences</h2>
            <div className="flex flex-wrap justify-center gap-2">{v.skills.map((s) => <span key={s} className="rounded-full bg-white/[0.06] px-4 py-1.5 text-sm">{s}</span>)}</div>
            {v.languages.length > 0 && <p className="mt-6 text-sm" style={{ color: muted }}>Langues : {v.languages.join(" · ")}</p>}
          </section>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Campus

function Campus({ v }: { v: PortfolioView }) {
  const ink = "#1b1530", muted = "#5c5675"
  const tints = ["#ffe1d6", "#dff3e4", "#e3e7ff", "#fff1c9"]
  return (
    <div className="min-h-screen bg-[#fffaf5]" style={{ fontFamily: F.sans, color: ink }}>
      <header className="bg-[linear-gradient(120deg,#ff7a59,#ff4f8b_55%,#7b5cff)] px-5 pb-24 pt-12 text-white sm:pt-16">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <Avatar v={v} className="h-28 w-28 shrink-0 rounded-[28px] bg-white/25 text-3xl" ring="0 0 0 5px rgba(255,255,255,0.45)" />
          <div className="min-w-0">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ fontFamily: F.display }}>{v.name}</h1>
            {v.title && <p className="mt-1 text-xl font-bold">{v.title}</p>}
            {v.headline && <p className="mt-2 text-lg text-white/90">{v.headline}</p>}
            <p className="mt-3 inline-block rounded-full bg-white/20 px-4 py-1 text-sm font-semibold">{studies(v)}</p>
          </div>
        </div>
      </header>
      <div className="mx-auto -mt-16 max-w-4xl space-y-6 px-5 pb-16">
        <div className="rounded-3xl bg-white p-6 shadow-lg shadow-black/5">
          {v.about && <p className="text-lg leading-relaxed">{v.about}</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            {contactList(v).map((c) => <a key={c.href} href={c.href} className="rounded-full bg-[#f2edff] px-4 py-2 text-sm font-semibold text-[#5b3fd6]">{c.label}</a>)}
            {v.cvUrl && <a href={v.cvUrl} className="rounded-full bg-[#ff4f8b] px-4 py-2 text-sm font-bold text-white">Mon CV</a>}
          </div>
        </div>
        {v.projects.length > 0 && (
          <section>
            <h2 className="mb-4 mt-10 text-2xl font-extrabold" style={{ fontFamily: F.display }}>Mes projets</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {v.projects.map((p, i) => (
                <article key={i} className="overflow-hidden rounded-3xl" style={{ background: tints[i % tints.length] }}>
                  <ProjectMedia p={p} className="aspect-[16/9] w-full" />
                  <div className="p-5">
                    <h3 className="text-lg font-bold">{p.title}</h3>
                    {p.description && <p className="mt-1.5 text-sm leading-relaxed" style={{ color: muted }}>{p.description}</p>}
                    {p.link && <a href={p.link} className="mt-3 inline-block rounded-full bg-white px-3 py-1 text-sm font-semibold">Voir →</a>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {v.experiences.length > 0 && <section className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="mb-5 text-xl font-extrabold" style={{ fontFamily: F.display }}>Expériences</h2><Timeline items={v.experiences} dot="#ff4f8b" muted={muted} /></section>}
          {v.education.length > 0 && <section className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="mb-5 text-xl font-extrabold" style={{ fontFamily: F.display }}>Formation</h2><Timeline items={v.education} dot="#7b5cff" muted={muted} /></section>}
        </div>
        {(v.skills.length > 0 || v.languages.length > 0) && (
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-extrabold" style={{ fontFamily: F.display }}>Ce que je sais faire</h2>
            <div className="flex flex-wrap gap-2">{v.skills.map((s, i) => <span key={s} className="rounded-full px-4 py-1.5 text-sm font-semibold" style={{ background: tints[i % tints.length] }}>{s}</span>)}</div>
            {v.languages.length > 0 && <p className="mt-4 text-sm" style={{ color: muted }}>Langues : {v.languages.join(" · ")}</p>}
          </section>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Atelier

function Atelier({ v }: { v: PortfolioView }) {
  const green = "#3ddc97", muted = "#8b96a8"
  const Label = ({ children }: { children: string }) => <h2 className="mb-4 text-sm" style={{ fontFamily: F.mono, color: green }}>{`// ${children}`}</h2>
  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3]" style={{ fontFamily: F.sans }}>
      <div className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
        <header className="rounded-2xl border border-white/10 bg-[#161b22] p-6">
          <div className="flex gap-1.5 pb-5"><span className="h-3 w-3 rounded-full bg-[#ff5f57]" /><span className="h-3 w-3 rounded-full bg-[#febc2e]" /><span className="h-3 w-3 rounded-full bg-[#28c840]" /></div>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <Avatar v={v} className="h-24 w-24 shrink-0 rounded-xl bg-[#21262d] text-2xl" />
            <div className="min-w-0">
              <p className="text-sm" style={{ fontFamily: F.mono, color: green }}>$ whoami</p>
              <h1 className="mt-1 text-4xl font-bold tracking-tight sm:text-5xl" style={{ fontFamily: F.mono }}>{v.name}</h1>
              {v.title && <p className="mt-1 font-bold" style={{ fontFamily: F.mono, color: green }}>{v.title}</p>}
              {v.headline && <p className="mt-2" style={{ color: muted }}>{v.headline}</p>}
              <p className="mt-2 text-sm" style={{ fontFamily: F.mono }}>{studies(v)}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 text-sm" style={{ fontFamily: F.mono }}>
            {contactList(v).map((c) => <a key={c.href} href={c.href} className="rounded-md border border-white/10 px-3 py-1.5 hover:border-[#3ddc97]">{c.label}</a>)}
            {v.cvUrl && <a href={v.cvUrl} className="rounded-md px-3 py-1.5 font-bold text-black" style={{ background: green }}>cv.pdf</a>}
          </div>
        </header>
        {v.about && <section className="mt-10"><Label>a propos</Label><p className="max-w-3xl leading-relaxed text-[#c9d1d9]">{v.about}</p></section>}
        {v.skills.length > 0 && <section className="mt-10"><Label>stack</Label><div className="flex flex-wrap gap-2" style={{ fontFamily: F.mono }}>{v.skills.map((s) => <span key={s} className="rounded-md bg-[#3ddc97]/10 px-3 py-1 text-sm" style={{ color: green }}>{s}</span>)}</div></section>}
        {v.projects.length > 0 && (
          <section className="mt-10">
            <Label>projets</Label>
            <div className="grid gap-4 sm:grid-cols-3">
              {v.projects.map((p, i) => (
                <article key={i} className="flex flex-col rounded-xl border border-white/10 bg-[#161b22] p-4">
                  <ProjectMedia p={p} className="mb-3 aspect-[16/10] w-full overflow-hidden rounded-lg" />
                  <h3 className="font-bold" style={{ fontFamily: F.mono }}>{p.title}</h3>
                  {p.description && <p className="mt-1.5 text-sm leading-relaxed" style={{ color: muted }}>{p.description}</p>}
                  {p.link && <a href={p.link} className="mt-auto pt-3 text-sm" style={{ fontFamily: F.mono, color: green }}>→ voir</a>}
                </article>
              ))}
            </div>
          </section>
        )}
        <div className="mt-10 grid gap-10 sm:grid-cols-2">
          {v.experiences.length > 0 && <section><Label>experiences</Label><Timeline items={v.experiences} dot={green} muted={muted} /></section>}
          {v.education.length > 0 && <section><Label>formation</Label><Timeline items={v.education} dot={green} muted={muted} /></section>}
        </div>
        {v.languages.length > 0 && <p className="mt-10 text-sm" style={{ fontFamily: F.mono, color: muted }}>{`langues = [${v.languages.map((l) => `"${l}"`).join(", ")}]`}</p>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Plan

// Mecanique, mecatronique, procedes de fabrication : style plan technique
// (fond bleu quadrille, cadre et cartouche, fiches techniques reperees).
function Plan({ v }: { v: PortfolioView }) {
  const line = "rgba(214,232,255,0.9)", soft = "rgba(214,232,255,0.45)", text = "#d6e8ff", muted = "#9fb6d4", orange = "#ff9f43"
  const grid = {
    backgroundColor: "#0b2d52",
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.09) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
    backgroundSize: "100px 100px, 100px 100px, 20px 20px, 20px 20px",
  }
  const axis = (dir: string) => `repeating-linear-gradient(to ${dir}, ${soft} 0 10px, transparent 10px 14px, ${soft} 14px 16px, transparent 16px 20px)`
  const Label = ({ n, children }: { n: string; children: string }) => (
    <h2 className="mb-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.25em]" style={{ fontFamily: F.mono, color: orange }}>
      <span className="border px-1.5 py-0.5" style={{ borderColor: orange }}>{n}</span>
      {children}
      <span className="h-px flex-1" style={{ background: "rgba(255,159,67,0.4)" }} />
    </h2>
  )
  const cartouche = ([["Filière", v.field], ["Niveau", v.level], ["Établissement", v.school], ["Lieu", v.location]] as Array<[string, string]>).filter((r) => r[1])
  return (
    <div className="min-h-screen p-3 text-white sm:p-6" style={{ ...grid, fontFamily: F.sans }}>
      <div className="mx-auto max-w-5xl border-2 p-1.5" style={{ borderColor: line }}>
        <div className="border px-5 py-10 sm:px-10 sm:py-14" style={{ borderColor: soft }}>
          <header className="grid gap-8 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
            {/* photo avec axes de symetrie, comme un percage cote */}
            <div className="relative mx-auto h-40 w-40 sm:h-44 sm:w-44">
              <span className="absolute -top-3.5 left-1/2 h-[calc(100%+28px)] w-px -translate-x-1/2" style={{ background: axis("bottom") }} />
              <span className="absolute -left-3.5 top-1/2 h-px w-[calc(100%+28px)] -translate-y-1/2" style={{ background: axis("right") }} />
              <Avatar v={v} className="relative h-full w-full rounded-full bg-[#123b68] text-4xl" ring={`0 0 0 6px #0b2d52, 0 0 0 7px ${soft}`} />
              <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px]" style={{ fontFamily: F.mono, color: muted }}>VUE DE FACE · ÉCH. 1:1</span>
            </div>
            <div className="min-w-0 pt-4 sm:pt-0">
              <p className="text-xs uppercase tracking-[0.3em]" style={{ fontFamily: F.mono, color: orange }}>Dossier technique</p>
              <h1 className="mt-3 text-4xl font-extrabold uppercase leading-none tracking-tight sm:text-6xl" style={{ fontFamily: F.display }}>{v.name}</h1>
              {v.title && <p className="mt-3 text-xl font-bold uppercase tracking-wide" style={{ color: orange }}>{v.title}</p>}
              {v.headline && <p className="mt-4 max-w-2xl text-lg leading-snug" style={{ color: text }}>{v.headline}</p>}
              <div className="mt-5 flex flex-wrap gap-2 text-xs" style={{ fontFamily: F.mono }}>
                {contactList(v).map((c) => <a key={c.href} href={c.href} className="border px-3 py-1.5 hover:bg-white/10" style={{ borderColor: soft }}>{c.label}</a>)}
                {v.cvUrl && <a href={v.cvUrl} className="px-3 py-1.5 font-bold text-black" style={{ background: orange }}>CV.PDF ↓</a>}
              </div>
            </div>
          </header>

          {cartouche.length > 0 && (
            <dl className="mt-12 grid grid-cols-2 border text-sm sm:ml-auto sm:max-w-xl" style={{ borderColor: line, fontFamily: F.mono }}>
              {cartouche.map(([k, val], i) => (
                <div key={k} className={`px-3 py-2 ${i % 2 === 0 ? "border-r" : ""} ${i < cartouche.length - 2 ? "border-b" : ""}`} style={{ borderColor: soft }}>
                  <dt className="text-[10px] uppercase tracking-widest" style={{ color: muted }}>{k}</dt>
                  <dd className="mt-0.5 font-bold">{val}</dd>
                </div>
              ))}
            </dl>
          )}

          {v.about && <section className="mt-14"><Label n="A">Note de présentation</Label><p className="max-w-3xl text-lg leading-relaxed" style={{ color: text }}>{v.about}</p></section>}

          {v.projects.length > 0 && (
            <section className="mt-14">
              <Label n="B">Réalisations</Label>
              <div className="grid gap-8">
                {v.projects.map((p, i) => {
                  const rep = String(i + 1).padStart(2, "0")
                  const tools = (p.tools || "").split(",").map((t) => t.trim()).filter(Boolean)
                  return (
                    <article key={i} className="grid border sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]" style={{ borderColor: line }}>
                      <div className="relative border-b sm:border-b-0 sm:border-r" style={{ borderColor: line }}>
                        {p.imageUrl || p.videoUrl ? (
                          <ProjectMedia p={p} className="aspect-[16/10] w-full" />
                        ) : (
                          <div className="flex aspect-[16/10] w-full items-center justify-center text-6xl font-black" style={{ fontFamily: F.mono, color: "rgba(214,232,255,0.25)" }}>{rep}</div>
                        )}
                        <span className="pointer-events-none absolute left-2 top-2 px-2 py-0.5 text-[10px] font-bold text-black" style={{ background: orange, fontFamily: F.mono }}>REP. {rep}</span>
                      </div>
                      <div className="flex flex-col p-5">
                        <h3 className="text-xl font-bold leading-snug" style={{ fontFamily: F.display }}>{p.title}</h3>
                        {p.description && <p className="mt-2 text-sm leading-relaxed" style={{ color: text }}>{p.description}</p>}
                        {tools.length > 0 && (
                          <div className="mt-4 border-t pt-3" style={{ borderColor: soft }}>
                            <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: F.mono, color: muted }}>Moyens mis en œuvre</p>
                            <ul className="mt-2 flex flex-wrap gap-1.5">
                              {tools.map((t) => <li key={t} className="border px-2 py-0.5 text-xs" style={{ borderColor: soft, fontFamily: F.mono }}>{t}</li>)}
                            </ul>
                          </div>
                        )}
                        {p.link && <a href={p.link} className="mt-auto pt-4 text-sm font-bold" style={{ fontFamily: F.mono, color: orange }}>Voir le dossier →</a>}
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          )}

          {v.skills.length > 0 && (
            <section className="mt-14">
              <Label n="C">Machines, logiciels et procédés</Label>
              <ul className="grid grid-cols-2 gap-px border sm:grid-cols-4" style={{ borderColor: line, background: soft }}>
                {v.skills.map((s) => (
                  <li key={s} className="flex items-center gap-2 bg-[#0b2d52] px-3 py-3 text-sm font-semibold">
                    <span className="h-2 w-2 shrink-0" style={{ background: orange }} />
                    {s}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mt-14 grid gap-12 sm:grid-cols-2">
            {v.experiences.length > 0 && <section><Label n="D">Stages et atelier</Label><Timeline items={v.experiences} dot={orange} muted={muted} /></section>}
            {v.education.length > 0 && <section><Label n="E">Formation</Label><Timeline items={v.education} dot={orange} muted={muted} /></section>}
          </div>

          {v.languages.length > 0 && <p className="mt-12 text-sm" style={{ fontFamily: F.mono, color: muted }}>LANGUES : {v.languages.join(" · ").toUpperCase()}</p>}
          <p className="mt-10 text-right text-[10px] tracking-widest" style={{ fontFamily: F.mono, color: muted }}>FOLIO 01/01</p>
        </div>
      </div>
    </div>
  )
}

export function PortfolioRender({ view }: { view: PortfolioView }) {
  switch (view.template) {
    case "nuit": return <Nuit v={view} />
    case "campus": return <Campus v={view} />
    case "atelier": return <Atelier v={view} />
    case "plan": return <Plan v={view} />
    case "motion": return <MotionTemplate v={view} />
    default: return <Eclat v={view} />
  }
}

/** Bandeau "Cree avec Mahu" au bas des portfolios publics. */
export function MadeWithMahu() {
  return (
    <div className="bg-[#07090f] px-5 py-4 text-center text-sm text-white/70" style={{ fontFamily: F.sans }}>
      Portfolio créé avec <a href="/etudiants" className="font-semibold text-white underline underline-offset-4">Mahu</a> · Crée le tien pour 3 500 FCFA
    </div>
  )
}
