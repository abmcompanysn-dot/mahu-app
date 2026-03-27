"use client"

import { motion } from "framer-motion"
import { Eye, MousePointer, UserPlus, TrendingUp, Share2, Link as LinkIcon, QrCode, Mail } from "lucide-react"
import { PhonePreview } from "@/components/dashboard/phone-preview"
import { StatsCard } from "@/components/dashboard/stats-card"
import { ShareCard } from "@/components/dashboard/share-card"
import { RecentActivity } from "@/components/dashboard/recent-activity"

const stats = [
  { label: "Vues totales", value: "1,247", change: "+12%", icon: Eye, color: "text-primary" },
  { label: "Clics liens", value: "423", change: "+8%", icon: MousePointer, color: "text-emerald-500" },
  { label: "Contacts generes", value: "89", change: "+23%", icon: UserPlus, color: "text-amber-500" },
  { label: "Taux conversion", value: "7.1%", change: "+2%", icon: TrendingUp, color: "text-cyan-500" },
]

const shareOptions = [
  { icon: QrCode, label: "QR Code", action: "qr" },
  { icon: LinkIcon, label: "Copier le lien", action: "copy" },
  { icon: Mail, label: "Email", action: "email" },
  { icon: Share2, label: "Partager", action: "share" },
]

export default function DashboardPage() {
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
          <h1 className="text-2xl font-bold text-foreground mb-2">Bonjour, Jean</h1>
          <p className="text-muted-foreground">
            Votre carte a ete vue 47 fois cette semaine. Continuez comme ca !
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <StatsCard key={stat.label} stat={stat} index={index} />
          ))}
        </div>

        {/* Share Options */}
        <ShareCard options={shareOptions} />

        {/* Recent Activity */}
        <RecentActivity />
      </div>

      {/* Phone Preview Sidebar */}
      <div className="lg:col-span-1">
        <div className="sticky top-24">
          <PhonePreview />
        </div>
      </div>
    </div>
  )
}
