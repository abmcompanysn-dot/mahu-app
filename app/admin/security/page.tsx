"use client"

import { useState } from "react"
import QRCode from "qrcode"
import { Loader2, ShieldCheck, ShieldOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { adminApi } from "@/lib/admin-api"

export default function AdminSecurityPage() {
  const { token, admin } = useAdminAuth()
  const [enrolling, setEnrolling] = useState(false)
  const [secret, setSecret] = useState("")
  const [qrDataUrl, setQrDataUrl] = useState("")
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const startEnrollment = async () => {
    if (!token) return
    setBusy(true)
    setError("")
    try {
      const res = await adminApi.setup2fa(token)
      setSecret(res.secret)
      const dataUrl = await QRCode.toDataURL(res.otpauthUrl, { margin: 1, width: 220 })
      setQrDataUrl(dataUrl)
      setEnrolling(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setBusy(false)
    }
  }

  const confirmEnrollment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setBusy(true)
    setError("")
    try {
      await adminApi.confirm2fa(token, code)
      setEnrolling(false)
      setMessage("2FA activee avec succes.")
      setCode("")
      setSecret("")
      setQrDataUrl("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Code invalide")
    } finally {
      setBusy(false)
    }
  }

  const disable2fa = async () => {
    if (!token) return
    setBusy(true)
    setError("")
    try {
      await adminApi.disable2fa(token)
      setMessage("2FA desactivee.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-6 md:p-10">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Securite</h1>

        {message && <p className="text-sm text-emerald-500">{message}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}

        <Card>
          <CardHeader>
            <CardTitle>Double authentification (2FA)</CardTitle>
            <CardDescription>{admin?.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!enrolling ? (
              <div className="flex flex-col gap-3">
                <Button onClick={startEnrollment} disabled={busy}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                  Activer la 2FA
                </Button>
                <Button variant="outline" onClick={disable2fa} disabled={busy}>
                  <ShieldOff className="w-4 h-4 mr-2" />
                  Desactiver la 2FA
                </Button>
              </div>
            ) : (
              <form onSubmit={confirmEnrollment} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Scannez ce QR code avec Google Authenticator, Authy, ou une app equivalente.
                </p>
                {qrDataUrl && (
                  <div className="bg-white p-4 rounded-xl mx-auto w-fit">
                    <img src={qrDataUrl} alt="QR code 2FA" width={220} height={220} />
                  </div>
                )}
                <p className="text-xs text-muted-foreground text-center break-all">
                  Cle manuelle : <span className="font-mono">{secret}</span>
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="Code a 6 chiffres"
                  className="w-full text-center text-2xl tracking-[0.5em] py-3 rounded-xl bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <Button type="submit" disabled={busy || code.length !== 6} className="w-full">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmer"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
