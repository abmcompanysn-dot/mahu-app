"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Megaphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { adminApi, type Announcement } from "@/lib/admin-api"

export default function AdminAnnouncementsPage() {
  const { token } = useAdminAuth()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await adminApi.listAnnouncements(token)
      setAnnouncements(res.announcements)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement")
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !title.trim() || !body.trim()) return
    setSubmitting(true)
    setError("")
    try {
      await adminApi.createAnnouncement(token, { title, body })
      setTitle("")
      setBody("")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 md:p-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Annonces</h1>

        <Card>
          <CardHeader>
            <CardTitle>Nouvelle annonce</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre" required />
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message" required rows={3} />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publier"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <Card key={a._id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Megaphone className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <div>
                        <h3 className="font-semibold text-foreground">{a.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{a.body}</p>
                      </div>
                    </div>
                    <Badge variant={a.active ? "default" : "secondary"}>{a.active ? "Active" : "Inactive"}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {announcements.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune annonce pour le moment.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
