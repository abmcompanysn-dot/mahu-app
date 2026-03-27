"use client"

import { motion } from "framer-motion"
import { Eye, Download, MousePointer, UserPlus } from "lucide-react"

const iconMap: Record<string, typeof Eye> = {
  view: Eye,
  download: Download,
  click: MousePointer,
  contact: UserPlus,
  Lien: Eye,
  QR: MousePointer,
  NFC: Download,
}

const colorMap: Record<string, { text: string; bg: string }> = {
  view: { text: "text-primary", bg: "bg-primary/10" },
  download: { text: "text-emerald-500", bg: "bg-emerald-500/10" },
  click: { text: "text-amber-500", bg: "bg-amber-500/10" },
  contact: { text: "text-cyan-500", bg: "bg-cyan-500/10" },
  Lien: { text: "text-primary", bg: "bg-primary/10" },
  QR: { text: "text-amber-500", bg: "bg-amber-500/10" },
  NFC: { text: "text-emerald-500", bg: "bg-emerald-500/10" },
}

interface ActivityItem {
  date: string
  source: string
}

interface RecentActivityProps {
  activities?: ActivityItem[]
}

export function RecentActivity({ activities }: RecentActivityProps) {
  // Use provided activities or default demo data
  const displayActivities = activities && activities.length > 0 
    ? activities.slice(0, 5).map((act, idx) => ({
        id: String(idx),
        type: act.source,
        text: `Vue depuis ${act.source}`,
        time: act.date,
      }))
    : [
        { id: "1", type: "view", text: "Quelqu'un a consulte votre profil", time: "Il y a 5 min" },
        { id: "2", type: "download", text: "Contact enregistre via NFC", time: "Il y a 23 min" },
        { id: "3", type: "click", text: "Clic sur votre lien LinkedIn", time: "Il y a 1h" },
        { id: "4", type: "contact", text: "Nouveau contact ajoute a votre liste", time: "Il y a 2h" },
        { id: "5", type: "view", text: "10 nouvelles vues de votre carte", time: "Il y a 3h" },
      ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="p-6 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Activite recente</h3>
        <button className="text-sm text-primary hover:text-primary/80 transition-colors">
          Voir tout
        </button>
      </div>

      <div className="space-y-3">
        {displayActivities.map((activity, index) => {
          const Icon = iconMap[activity.type] || Eye
          const colors = colorMap[activity.type] || colorMap.view
          
          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              whileHover={{ x: 4 }}
              className="group flex items-center gap-4 p-3 rounded-xl hover:bg-muted/30 transition-all cursor-pointer"
            >
              <div className={`p-2.5 rounded-xl ${colors.bg} group-hover:scale-110 transition-transform`}>
                <Icon className={`w-4 h-4 ${colors.text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {activity.text}
                </p>
                <p className="text-xs text-muted-foreground">{activity.time}</p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
