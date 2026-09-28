"use client"

import { useEffect, useState } from "react"
import { ExternalLink, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { adminApi, type UserDetails } from "@/lib/admin-api"
import { formatXof } from "@/lib/shop-api"
import { PUBLIC_PROFILE_URL } from "@/lib/site"

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString("fr-FR") : "-"
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-border/40 last:border-0 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right text-foreground break-all">{children || "-"}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  )
}

function parseSocialLinks(json?: string): Array<{ type?: string; url?: string; label?: string }> {
  try {
    const parsed = JSON.parse(json || "[]")
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// Fiche complete d'un utilisateur pour l'admin : compte, profil public,
// cartes, commandes, messages recus. Donnees de GET /api/admin/users/{id}/details.
export function UserDetailsDialog({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const { token } = useAdminAuth()
  const [details, setDetails] = useState<UserDetails | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!token || !userId) return
    setDetails(null)
    setError("")
    adminApi
      .getUserDetails(token, userId)
      .then(setDetails)
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement"))
  }, [token, userId])

  const u = details?.user
  const p = details?.profile
  const links = parseSocialLinks(p?.liensSociauxJson)

  return (
    <Dialog open={!!userId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{p?.nomComplet || u?.name || u?.email || "Utilisateur"}</DialogTitle>
        </DialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {!details && !error && (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {details && u && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              {p?.urlPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.urlPhoto} alt="" className="w-16 h-16 rounded-full object-cover bg-muted" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-muted" />
              )}
              <div className="space-y-1">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{u.role}</Badge>
                  <Badge variant="outline">Plan {details.plan}</Badge>
                  {u.disabled && <Badge variant="destructive">Desactive</Badge>}
                </div>
                {u.profileUrl && (
                  <a
                    href={`${PUBLIC_PROFILE_URL}/p/${u.profileUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    /p/{u.profileUrl}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-muted/30 p-3">
                <div className="text-xl font-bold tabular-nums">{details.viewCount}</div>
                <div className="text-xs text-muted-foreground">vues du profil</div>
              </div>
              <div className="rounded-lg bg-muted/30 p-3">
                <div className="text-xl font-bold tabular-nums">{details.prospectCount}</div>
                <div className="text-xs text-muted-foreground">messages recus</div>
              </div>
              <div className="rounded-lg bg-muted/30 p-3">
                <div className="text-xl font-bold tabular-nums">{details.cards.length}</div>
                <div className="text-xs text-muted-foreground">carte(s)</div>
              </div>
            </div>

            <Section title="Compte">
              <Row label="Email">{u.email}</Row>
              <Row label="Inscrit le">{formatDate(u.createdAt)}</Row>
              <Row label="Connexion">
                {[u.hasPassword && "mot de passe", ...u.providers].filter(Boolean).join(", ")}
              </Row>
              <Row label="Profil configure">{u.onboardingStatus === "COMPLETED" ? "Oui" : "Non"}</Row>
              <Row label="Acces IA">{u.aiEnabled ? "Oui" : "Non"}</Row>
            </Section>

            <Section title="Profil public">
              {p ? (
                <>
                  <Row label="Nom">{p.nomComplet}</Row>
                  <Row label="Telephone">{p.telephone}</Row>
                  <Row label="Profession">{p.profession}</Row>
                  <Row label="Entreprise">{p.compagnie}</Row>
                  <Row label="Ville">{p.location}</Row>
                  <Row label="Formulaire de contact">{p.leadCaptureActif === "OUI" ? "Visible" : "Masque"}</Row>
                  {links.length > 0 && (
                    <Row label="Reseaux">
                      {links.map((l, i) => (
                        <a key={i} href={l.url} target="_blank" rel="noreferrer" className="block text-primary hover:underline">
                          {l.label || l.type || l.url}
                        </a>
                      ))}
                    </Row>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun profil.</p>
              )}
            </Section>

            <Section title="Cartes">
              {details.cards.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune carte liee.</p>
              ) : (
                details.cards.map((c) => (
                  <Row key={c.codeCarte} label={c.codeCarte}>
                    {c.statut} - active le {formatDate(c.dateActivation)}
                    {c.vendeur ? ` - ${c.vendeur}` : ""}
                  </Row>
                ))
              )}
            </Section>

            <Section title="Commandes & paiements">
              {details.orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune commande.</p>
              ) : (
                details.orders.map((o) => (
                  <Row key={o._id} label={formatDate(o.paidAt || o.createdAt)}>
                    {o.productName} - {formatXof(o.depositXof)} ({o.paymentStatus.replace("_", " ")})
                  </Row>
                ))
              )}
            </Section>

            <Section title="Derniers messages recus">
              {details.prospects.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun message.</p>
              ) : (
                details.prospects.map((m, i) => (
                  <div key={i} className="text-sm py-1.5 border-b border-border/40 last:border-0">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">{m.nom}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(m.dateCapture)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{m.contact}</div>
                    {m.message && <p className="mt-1 whitespace-pre-wrap">{m.message}</p>}
                  </div>
                ))
              )}
            </Section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
