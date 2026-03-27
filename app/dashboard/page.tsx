"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Eye, MousePointer, UserPlus, TrendingUp, Share2, Link as LinkIcon, QrCode, Mail, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { PhonePreview } from "@/components/dashboard/phone-preview"
import { StatsCard } from "@/components/dashboard/stats-card"
import { ShareCard } from "@/components/dashboard/share-card"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { useAuth } from "@/hooks/use-auth"
import type { UserProfile, UserStats } from "@/lib/api"

const shareOptions = [
  { icon: QrCode, label: "QR Code", action: "qr" },
  { icon: LinkIcon, label: "Copier le lien", action: "copy" },
  { icon: Mail, label: "Email", action: "email" },
  { icon: Share2, label: "Partager", action: "share" },
]

export default function DashboardPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated, fetchDashboardData, dashboardData } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [profileUrl, setProfileUrl] = useState<string>("")

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
        const data = await fetchDashboardData()
        
        if (data) {
          setProfileUrl(data.profileUrl || "")
          
          // Transform profile data
          const profileData: UserProfile = {
            firstName: data.profile.Nom_Complet?.split(' ')[0] || '',
            lastName: data.profile.Nom_Complet?.split(' ').slice(1).join(' ') || '',
            title: data.profile.Profession,
            company: data.profile.Compagnie,
            bio: '',
            location: data.profile.Location,
            username: data.profileUrl,
            profilePicture: data.profile.URL_Photo,
            socialLinks: (() => {
              try {
                return JSON.parse(data.profile.Liens_Sociaux_JSON || '[]')
              } catch {
                return []
              }
            })(),
          }
          setProfile(profileData)
          
          // Transform stats data
          const statsData: UserStats = {
            totalViews: data.stats.views || 0,
            viewsChange: data.stats.viewsTrend || '+0%',
            totalClicks: data.stats.shares || 0,
            clicksChange: '+0%',
            contactsGenerated: data.stats.leads || 0,
            contactsChange: data.stats.leadsTrend || '+0%',
            conversionRate: data.stats.leads > 0 && data.stats.views > 0 
              ? `${((data.stats.leads / data.stats.views) * 100).toFixed(1)}%` 
              : '0%',
            conversionChange: '+0%',
            weeklyViews: data.stats.views || 0,
          }
          setStats(statsData)
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error)
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

  const statsDisplay = [
    { 
      label: "Vues totales", 
      value: stats?.totalViews?.toLocaleString() || "0", 
      change: stats?.viewsChange || "+0%", 
      icon: Eye, 
      color: "text-primary" 
    },
    { 
      label: "Clics liens", 
      value: stats?.totalClicks?.toLocaleString() || "0", 
      change: stats?.clicksChange || "+0%", 
      icon: MousePointer, 
      color: "text-emerald-500" 
    },
    { 
      label: "Contacts generes", 
      value: stats?.contactsGenerated?.toLocaleString() || "0", 
      change: stats?.contactsChange || "+0%", 
      icon: UserPlus, 
      color: "text-amber-500" 
    },
    { 
      label: "Taux conversion", 
      value: stats?.conversionRate || "0%", 
      change: stats?.conversionChange || "+0%", 
      icon: TrendingUp, 
      color: "text-cyan-500" 
    },
  ]

  const displayName = profile?.firstName || "Utilisateur"
  const weeklyViews = stats?.weeklyViews || 0

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
            {weeklyViews > 0 
              ? `Votre carte a ete vue ${weeklyViews} fois cette semaine. Continuez comme ca !`
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
        <RecentActivity activities={dashboardData?.recentActivity} />
      </div>

      {/* Phone Preview Sidebar */}
      <div className="lg:col-span-1">
        <div className="sticky top-24">
          <PhonePreview profile={profile} />
        </div>
      </div>
    </div>
  )
}
