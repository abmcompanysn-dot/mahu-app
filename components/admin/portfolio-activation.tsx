"use client"

import { useState } from "react"
import { GraduationCap, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { adminApi } from "@/lib/admin-api"

// Active (ou prolonge d'un an) le portfolio etudiant d'un compte existant :
// ces clients ne peuvent pas commander via l'inscription, leur email existe deja.
export function PortfolioActivation({ token }: { token: string | null }) {
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  const activate = async () => {
    if (!token || !email.trim()) return
    setBusy(true)
    setResult(null)
    const res = (await adminApi.activatePortfolio(token, email.trim())) as { success?: boolean; message?: string; error?: string }
    setBusy(false)
    setResult(res.success ? { ok: true, text: res.message || "Portfolio active." } : { ok: false, text: res.error || "Erreur." })
    if (res.success) setEmail("")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <GraduationCap className="h-5 w-5 text-primary" /> Portfolio etudiant (1 an)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Pour un client deja inscrit qui a paye les 3 500 FCFA hors ligne. Si le portfolio est encore actif, il est prolonge d&apos;un an.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && activate()}
            placeholder="email du client"
            className="sm:max-w-sm"
          />
          <Button onClick={activate} disabled={busy || !email.trim()}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Activer le portfolio 1 an
          </Button>
        </div>
        {result && <p className={`text-sm ${result.ok ? "text-green-600" : "text-destructive"}`}>{result.text}</p>}
      </CardContent>
    </Card>
  )
}
