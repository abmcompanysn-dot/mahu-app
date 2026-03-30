"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { 
  Users, 
  DollarSign, 
  Copy, 
  Check,
  TrendingUp,
  Gift,
  Share2,
  CreditCard,
  Loader2,
  ExternalLink,
  Wallet,
  Award
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/use-auth"
import { api } from "@/lib/api"

interface AffiliateStats {
  totalReferrals: number
  activeReferrals: number
  totalEarnings: number
  pendingEarnings: number
  paidEarnings: number
  conversionRate: number
  referralCode: string
  referralLink: string
}

interface Referral {
  id: string
  email: string
  date: string
  status: "pending" | "active" | "paid"
  commission: number
}

export default function AffiliatePage() {
  const { token, isAuthenticated, isLoading: authLoading } = useAuth()
  const [stats, setStats] = useState<AffiliateStats | null>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [paydunyaPhone, setPaydunyaPhone] = useState("")
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [withdrawSuccess, setWithdrawSuccess] = useState(false)

  useEffect(() => {
    if (token) {
      loadAffiliateData()
    }
  }, [token])

  const loadAffiliateData = async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const result = await api.getAffiliateData(token)
      if (result.success && result.data) {
        setStats(result.data.stats)
        setReferrals(result.data.referrals || [])
      } else {
        // Demo data si pas de donnees
        setStats({
          totalReferrals: 0,
          activeReferrals: 0,
          totalEarnings: 0,
          pendingEarnings: 0,
          paidEarnings: 0,
          conversionRate: 0,
          referralCode: "MAHU" + Math.random().toString(36).substr(2, 6).toUpperCase(),
          referralLink: `${window.location.origin}/register?ref=`
        })
      }
    } catch {
      // Demo data en cas d'erreur
      setStats({
        totalReferrals: 0,
        activeReferrals: 0,
        totalEarnings: 0,
        pendingEarnings: 0,
        paidEarnings: 0,
        conversionRate: 0,
        referralCode: "MAHU" + Math.random().toString(36).substr(2, 6).toUpperCase(),
        referralLink: `${window.location.origin}/register?ref=`
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyReferralLink = () => {
    if (stats) {
      navigator.clipboard.writeText(stats.referralLink + stats.referralCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleWithdraw = async () => {
    if (!token || !withdrawAmount || !paydunyaPhone) return
    
    const amount = parseFloat(withdrawAmount)
    if (isNaN(amount) || amount <= 0) return
    if (stats && amount > stats.pendingEarnings) {
      alert("Montant superieur au solde disponible")
      return
    }

    setIsWithdrawing(true)
    try {
      const result = await api.requestWithdrawal(token, {
        amount,
        paydunyaPhone,
        method: "paydunya"
      })
      
      if (result.success) {
        setWithdrawSuccess(true)
        setWithdrawAmount("")
        setPaydunyaPhone("")
        loadAffiliateData()
        setTimeout(() => setWithdrawSuccess(false), 3000)
      } else {
        alert(result.error || "Erreur lors du retrait")
      }
    } catch {
      alert("Erreur lors du retrait")
    } finally {
      setIsWithdrawing(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Programme Affiliation</h1>
        <p className="text-muted-foreground">
          Gagnez de l&apos;argent en invitant des personnes a rejoindre Mahu
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Filleuls totaux</p>
              <p className="text-2xl font-bold text-foreground">{stats?.totalReferrals || 0}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Filleuls actifs</p>
              <p className="text-2xl font-bold text-foreground">{stats?.activeReferrals || 0}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gains en attente</p>
              <p className="text-2xl font-bold text-foreground">{stats?.pendingEarnings || 0} FCFA</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total gagne</p>
              <p className="text-2xl font-bold text-foreground">{stats?.totalEarnings || 0} FCFA</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Referral Link Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20"
      >
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Gift className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Votre lien de parrainage</h3>
            <p className="text-sm text-muted-foreground">
              Partagez ce lien et gagnez 500 FCFA pour chaque inscription validee
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Input
              value={stats ? stats.referralLink + stats.referralCode : ""}
              readOnly
              className="pr-24 h-12 bg-background/50 border-border/50 rounded-xl font-mono text-sm"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary/10 px-2 py-1 rounded text-xs font-semibold text-primary">
              {stats?.referralCode}
            </div>
          </div>
          <Button
            onClick={copyReferralLink}
            className="h-12 px-6 gap-2 bg-primary hover:bg-primary/90"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copie!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copier
              </>
            )}
          </Button>
          <Button
            variant="outline"
            className="h-12 px-6 gap-2"
            onClick={() => {
              if (navigator.share && stats) {
                navigator.share({
                  title: "Rejoignez Mahu",
                  text: "Creez votre carte de visite numerique avec Mahu!",
                  url: stats.referralLink + stats.referralCode
                })
              }
            }}
          >
            <Share2 className="w-4 h-4" />
            Partager
          </Button>
        </div>
      </motion.div>

      {/* How it works */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="p-6 rounded-2xl bg-card/50 border border-border/50"
      >
        <h3 className="text-lg font-semibold text-foreground mb-6">Comment ca marche</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Share2 className="w-7 h-7 text-primary" />
            </div>
            <h4 className="font-semibold text-foreground mb-2">1. Partagez</h4>
            <p className="text-sm text-muted-foreground">
              Partagez votre lien unique avec vos amis et contacts
            </p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-green-500" />
            </div>
            <h4 className="font-semibold text-foreground mb-2">2. Ils s&apos;inscrivent</h4>
            <p className="text-sm text-muted-foreground">
              Vos filleuls creent leur compte Mahu avec votre lien
            </p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
              <DollarSign className="w-7 h-7 text-yellow-500" />
            </div>
            <h4 className="font-semibold text-foreground mb-2">3. Gagnez</h4>
            <p className="text-sm text-muted-foreground">
              Recevez 500 FCFA pour chaque inscription validee
            </p>
          </div>
        </div>
      </motion.div>

      {/* Withdrawal Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="p-6 rounded-2xl bg-card/50 border border-border/50"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Retirer vos gains</h3>
            <p className="text-sm text-muted-foreground">Via PayDunya (Mobile Money)</p>
          </div>
        </div>

        {withdrawSuccess ? (
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
            <Check className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-green-500 font-medium">Demande de retrait envoyee!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Vous recevrez votre paiement dans les 24h
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Montant a retirer (FCFA)</label>
                <Input
                  type="number"
                  placeholder="1000"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="h-12 bg-background/50 border-border/50 rounded-xl"
                  min="500"
                  max={stats?.pendingEarnings || 0}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum: 500 FCFA | Disponible: {stats?.pendingEarnings || 0} FCFA
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Numero PayDunya / Mobile Money</label>
                <Input
                  type="tel"
                  placeholder="+225 07 XX XX XX XX"
                  value={paydunyaPhone}
                  onChange={(e) => setPaydunyaPhone(e.target.value)}
                  className="h-12 bg-background/50 border-border/50 rounded-xl"
                />
                <p className="text-xs text-muted-foreground">
                  MTN, Moov, Orange Money, Wave
                </p>
              </div>
            </div>
            <Button
              onClick={handleWithdraw}
              disabled={isWithdrawing || !withdrawAmount || !paydunyaPhone || (stats?.pendingEarnings || 0) < 500}
              className="w-full md:w-auto h-12 px-8 gap-2 bg-green-500 hover:bg-green-600"
            >
              {isWithdrawing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Wallet className="w-4 h-4" />
                  Demander le retrait
                </>
              )}
            </Button>
          </div>
        )}
      </motion.div>

      {/* Referrals List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="p-6 rounded-2xl bg-card/50 border border-border/50"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">Vos filleuls</h3>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">{referrals.length} filleuls</span>
          </div>
        </div>

        {referrals.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Aucun filleul pour le moment</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Partagez votre lien pour commencer a gagner
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {referrals.map((referral, index) => (
              <motion.div
                key={referral.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {referral.email[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{referral.email}</p>
                    <p className="text-xs text-muted-foreground">{referral.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">{referral.commission} FCFA</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    referral.status === "paid" 
                      ? "bg-green-500/10 text-green-500"
                      : referral.status === "active"
                      ? "bg-blue-500/10 text-blue-500"
                      : "bg-yellow-500/10 text-yellow-500"
                  }`}>
                    {referral.status === "paid" ? "Paye" : referral.status === "active" ? "Actif" : "En attente"}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* PayDunya Integration Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="p-6 rounded-2xl bg-muted/30 border border-border/50"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
            <ExternalLink className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">Paiements securises via PayDunya</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Tous les retraits sont traites via PayDunya, la plateforme de paiement leader en Afrique.
              Recevez vos gains directement sur votre compte Mobile Money.
            </p>
            <a
              href="https://paydunya.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              En savoir plus sur PayDunya
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
