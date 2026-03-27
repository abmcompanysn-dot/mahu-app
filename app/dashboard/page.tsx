"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Eye, MousePointer, UserPlus, TrendingUp, Share2, Link as LinkIcon, QrCode, Mail, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { PhonePreview } from "@/components/dashboard/phone-preview"
import { StatsCard } from "@/components/dashboard/stats-card"
import { ShareCard } from "@/components/dashboard/share-card"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { useAuth, type AppScriptDashboardData } from "@/hooks/use-auth"

const shareOptions = [
  { icon: QrCode, label: "QR Code", action: "qr" },
  { icon: LinkIcon, label: "Copier le lien", action: "copy" },
  { icon: Mail, label: "Email", action: "email" },
  { icon: Share2, label: "Partager", action: "share" },
]

export default function DashboardPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated, fetchDashboardData, dashboardData } = useAuth()
  const [data, setData] = useState<AppScriptDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    async function loadData() {
      if (!isAuthenticated) return
      
      setIsLoading(true)
      try {
        const result = await fetchDashboardData()
        if (result) {
          setData(result)
        }
      } catch (error) {
        console.error("[v0] Error loading dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (isAuthenticated && !authLoading) {
      loadData()
    }
  }, [isAuthenticated, authLoading, fetchDashboardData])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  // Extraire les donnees du format AppScript
  const profile = data?.profile
  const user = data?.user
  const totalViews = data?.totalViews || 0
  const totalProspects = data?.totalProspects || 0
  const statsData = data?.stats // { labels: [...], data: [...] }
  
  // Calculer les stats depuis les donnees AppScript
  const nfcViews = statsData?.data?.[0] || 0
  const qrViews = statsData?.data?.[1] || 0
  const linkViews = statsData?.data?.[2] || 0
  const totalClicks = nfcViews + qrViews + linkViews
  
  const conversionRate = totalViews > 0 ? ((totalProspects / totalViews) * 100).toFixed(1) : "0"

  const statsDisplay = [
    { 
      label: "Vues totales", 
      value: totalViews.toLocaleString(), 
      change: "+12%", 
      icon: Eye, 
      color: "text-primary" 
    },
    { 
      label: "Clics liens", 
      value: totalClicks.toLocaleString(), 
      change: "+8%", 
      icon: MousePointer, 
      color: "text-emerald-500" 
    },
    { 
      label: "Contacts generes", 
      value: totalProspects.toLocaleString(), 
      change: "+15%", 
      icon: UserPlus, 
      color: "text-amber-500" 
    },
    { 
      label: "Taux conversion", 
      value: `${conversionRate}%`, 
      change: "+2%", 
      icon: TrendingUp, 
      color: "text-cyan-500" 
    },
  ]

  // Nom d'affichage
  const displayName = profile?.Nom_Complet?.split(' ')[0] || user?.Email?.split('@')[0] || "Utilisateur"
  const profileUrl = user?.URL_Profil || ""

  // Transformer le profil pour PhonePreview
  const phoneProfile = profile ? {
    firstName: profile.Nom_Complet?.split(' ')[0] || '',
    lastName: profile.Nom_Complet?.split(' ').slice(1).join(' ') || '',
    title: profile.Profession || '',
    company: profile.Compagnie || '',
    bio: '',
    location: profile.Location || '',
    username: profileUrl,
    profilePicture: profile.URL_Photo || '',
    coverImage: profile.URL_Couverture || '',
    socialLinks: (() => {
      try {
        return JSON.parse(profile.Liens_Sociaux_JSON || '[]')
      } catch {
        return []
      }
    })(),
  } : null

  // Transformer les prospects en activites
  const activities = data?.prospects?.map((p, idx) => ({
    id: String(idx),
    type: 'lead',
    text: `Nouveau contact: ${p.nom}`,
    time: p.date,
    timestamp: p.date,
  })) || []

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20"
        >
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Bonjour, {displayName}
          </h1>
          <p className="text-muted-foreground">
            {totalViews > 0 
              ? `Votre carte a ete vue ${totalViews} fois. Continuez comme ca !`
              : "Partagez votre carte pour commencer a recevoir des vues !"}
          </p>
        </motion.div>

        {/* Stats Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statsDisplay.map((stat, index) => (
              <StatsCard key={stat.label} stat={stat} index={index} />
            ))}
          </div>
        )}

        {/* Share Options */}
        <ShareCard options={shareOptions} username={profileUrl} />

        {/* Recent Activity */}
        <RecentActivity activities={activities} />
      </div>

      {/* Phone Preview Sidebar */}
      <div className="lg:col-span-1">
        <div className="sticky top-24">
          <PhonePreview profile={phoneProfile} />
        </div>
      </div>
    </div>
  )
}
