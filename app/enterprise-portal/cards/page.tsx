"use client"

import { useEffect, useState } from "react"
import { ExternalLink, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { api } from "@/lib/api"

interface TeamCard {
  ID_Unique: string
  Email: string
  Nom_Complet?: string
  Profession?: string
  URL_Profil?: string
}

export default function EnterprisePortalCardsPage() {
  const { token } = useAuth()
  const [cards, setCards] = useState<TeamCard[] | null>(null)

  useEffect(() => {
    if (!token) return
    api.getTeamCards(token).then((res) => {
      const data = res as unknown as { success?: boolean; cards?: TeamCard[] }
      setCards(data.cards || [])
    }).catch(() => setCards([]))
  }, [token])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cartes de l&apos;equipe</h1>
        <p className="text-muted-foreground mt-1">Les cartes numeriques de tous vos collaborateurs.</p>
      </div>

      {cards === null ? (
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : cards.length === 0 ? (
        <p className="p-8 text-center text-muted-foreground rounded-2xl bg-card/50 border border-border/50">
          Aucune carte pour le moment. Ajoutez des employes depuis l&apos;onglet Equipe.
        </p>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {cards.map((card) => (
            <div
              key={card.ID_Unique}
              className="p-6 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm"
            >
              <h3 className="text-lg font-semibold text-foreground">{card.Nom_Complet || card.Email}</h3>
              <p className="text-sm text-muted-foreground mb-4">{card.Profession || "—"}</p>
              {card.URL_Profil && (
                <a
                  href={`/${card.URL_Profil}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  Voir la carte
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
