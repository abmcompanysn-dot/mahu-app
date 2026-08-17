"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { adminApi, type AdminUserRow } from "@/lib/admin-api"

export default function AdminUsersPage() {
  const { token } = useAdminAuth()
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = useCallback(
    async (q: string) => {
      if (!token) return
      setLoading(true)
      try {
        const res = await adminApi.listUsers(token, q)
        setUsers(res.users)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur de chargement")
      } finally {
        setLoading(false)
      }
    },
    [token]
  )

  useEffect(() => {
    load("")
  }, [load])

  useEffect(() => {
    const timeout = setTimeout(() => load(search), 400)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const handlePlanChange = async (userId: string, plan: string) => {
    if (!token) return
    setSavingId(userId)
    try {
      await adminApi.updateUserPlan(token, userId, plan)
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, plan: plan as AdminUserRow["plan"] } : u)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setSavingId(null)
    }
  }

  const handleToggleDisabled = async (userId: string, disabled: boolean) => {
    if (!token) return
    setSavingId(userId)
    try {
      await adminApi.setUserDisabled(token, userId, disabled)
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, disabled } : u)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setSavingId(null)
    }
  }

  const handleToggleAiEnabled = async (userId: string, aiEnabled: boolean) => {
    if (!token) return
    setSavingId(userId)
    try {
      await adminApi.setUserAiEnabled(token, userId, aiEnabled)
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, aiEnabled } : u)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Utilisateurs</h1>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par email ou nom..."
            className="pl-9"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Card>
          <CardHeader>
            <CardTitle>{users.length} utilisateur(s)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Actif</TableHead>
                    <TableHead>Acces IA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u._id}>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.name || "-"}</TableCell>
                      <TableCell>{u.role}</TableCell>
                      <TableCell>
                        <Select
                          value={u.plan}
                          onValueChange={(plan) => handlePlanChange(u._id, plan)}
                          disabled={savingId === u._id}
                        >
                          <SelectTrigger size="sm" className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gratuit">Gratuit</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={!u.disabled}
                          disabled={savingId === u._id}
                          onCheckedChange={(checked) => handleToggleDisabled(u._id, !checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={!!u.aiEnabled}
                          disabled={savingId === u._id}
                          onCheckedChange={(checked) => handleToggleAiEnabled(u._id, checked)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
