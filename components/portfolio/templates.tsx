/* eslint-disable @next/next/no-img-element */
import type { PortfolioItem, PortfolioView } from "@/lib/portfolio"

// Les 4 modeles de portfolio etudiant. Ils ne recoivent que des donnees (pas
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
  facebook: "Facebook", youtube: "YouTube", tiktok: "TikTok", whatsapp: "WhatsApp", behance: "Behance",
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
                  {p.imageUrl && <img src={p.imageUrl} alt="" className="aspect-[16/10] w-full object-cover" />}
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
                  {p.imageUrl ? <img src={p.imageUrl} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" /> : <div className="hidden sm:block" />}
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
                  {p.imageUrl && <img src={p.imageUrl} alt="" className="aspect-[16/9] w-full object-cover" />}
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
                  {p.imageUrl && <img src={p.imageUrl} alt="" className="mb-3 aspect-[16/10] w-full rounded-lg object-cover" />}
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

export function PortfolioRender({ view }: { view: PortfolioView }) {
  switch (view.template) {
    case "nuit": return <Nuit v={view} />
    case "campus": return <Campus v={view} />
    case "atelier": return <Atelier v={view} />
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
