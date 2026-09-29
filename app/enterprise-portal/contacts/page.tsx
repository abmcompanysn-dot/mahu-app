"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Search } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { api } from "@/lib/api"

interface TeamProspect {
  date: string
  nom: string
  contact: string
  message: string
  note: number
  canal: string
  employeeName: string
  employeeEmail: string
}

interface MemberStats {
  name: string
  email: string
  today: number
  week: number
  total: number
}

interface TeamProspectsResponse {
  success?: boolean
  error?: string
  prospects?: TeamProspect[]
  members?: MemberStats[]
  totals?: { today: number; week: number; total: number; avgRating: number; ratingCount: number }
}

function Stars({ value }: { value: number }) {
  if (!value) return null
  return (
    <span className="text-amber-500" aria-label={`${value} sur 5`}>
      {"★".repeat(value)}
      <span className="text-muted-foreground/40">{"★".repeat(5 - value)}</span>
    </span>
  )
}

// Tous les contacts ramenes par les cartes de l'entreprise (employes + la
// sienne) : qui a ete rencontre, par qui, quand, et son avis.
export default function EnterpriseContactsPage() {
  const { token } = useAuth()
  const [data, setData] = useState<TeamProspectsResponse | null>(null)
  const [search, setSearch] = useState("")
  const [member, setMember] = useState("")

  useEffect(() => {
    if (!token) return
    api
      .getTeamProspects(token)
      .then((res) => setData(res as unknown as TeamProspectsResponse))
      .catch(() => setData({ success: false, error: "Chargement impossible." }))
  }, [token])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (data?.prospects || []).filter((p) => {
      if (member && p.employeeEmail !== member) return false
      if (!q) return true
      return [p.nom, p.contact, p.message, p.employeeName].some((v) => v?.toLowerCase().includes(q))
    })
  }, [data, search, member])

  if (!data) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (data.success === false) {
    return <p className="p-8 text-destructive">{data.error || "Erreur"}</p>
  }

  const totals = data.totals || { today: 0, week: 0, total: 0, avgRating: 0, ratingCount: 0 }

  return (
    <div className="p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contacts de l&apos;equipe</h1>
          <p className="text-muted-foreground">
            Chaque personne rencontree par vos equipes, avec son nom, ses coordonnees et son avis.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Aujourd'hui", value: totals.today },
            { label: "7 derniers jours", value: totals.week },
            { label: "Au total", value: totals.total },
            {
              label: `Avis moyen (${totals.ratingCount})`,
              value: totals.ratingCount ? `${totals.avgRating.toFixed(1)} / 5` : "-",
            },
          ].map((s) => (
            <div key={s.label} className="p-5 rounded-2xl bg-card/50 border border-border/50">
              <div className="text-3xl font-bold tabular-nums text-foreground">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-card/50 border border-border/50 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border/50">
                <th className="p-4 font-medium">Membre de l&apos;equipe</th>
                <th className="p-4 font-medium text-right">Aujourd&apos;hui</th>
                <th className="p-4 font-medium text-right">7 jours</th>
                <th className="p-4 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(data.members || [])
                .slice()
                .sort((a, b) => b.week - a.week)
                .map((m) => (
                  <tr
                    key={m.email}
                    onClick={() => setMember(member === m.email ? "" : m.email)}
                    className={`border-b border-border/30 last:border-0 cursor-pointer hover:bg-muted/30 ${member === m.email ? "bg-primary/10" : ""}`}
                  >
                    <td className="p-4">
                      <div className="font-medium text-foreground">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.email}</div>
                    </td>
                    <td className="p-4 text-right tabular-nums">{m.today}</td>
                    <td className="p-4 text-right tabular-nums">{m.week}</td>
                    <td className="p-4 text-right tabular-nums">{m.total}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom, contact, avis, membre..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-muted/30 border border-border/50 text-foreground focus:outline-none focus:border-primary/50"
            />
          </div>
          {member && (
            <button onClick={() => setMember("")} className="text-sm text-primary hover:underline self-start">
              Voir toute l&apos;equipe
            </button>
          )}
        </div>

        <div className="rounded-2xl bg-card/50 border border-border/50 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border/50">
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Personne rencontree</th>
                <th className="p-4 font-medium">Avis / message</th>
                <th className="p-4 font-medium">Rencontree par</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => (
                <tr key={i} className="border-b border-border/30 last:border-0 align-top">
                  <td className="p-4 whitespace-nowrap text-muted-foreground">
                    {new Date(p.date).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-foreground">{p.nom}</div>
                    <div className="text-xs text-muted-foreground">{p.contact}</div>
                  </td>
                  <td className="p-4 max-w-sm">
                    <Stars value={p.note} />
                    {p.message && <p className="whitespace-pre-wrap text-foreground">{p.message}</p>}
                    {!p.message && !p.note && <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="p-4 text-foreground">{p.employeeName}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-muted-foreground">
                    Aucun contact pour l&apos;instant. Chaque personne qui laisse ses coordonnees sur la carte d&apos;un
                    membre de l&apos;equipe apparaitra ici.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
