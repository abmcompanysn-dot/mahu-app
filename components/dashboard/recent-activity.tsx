"use client"

import { motion } from "framer-motion"
import { Eye, Download, MousePointer, UserPlus } from "lucide-react"

const activities = [
  {
    icon: Eye,
    text: "Quelqu'un a consulte votre profil",
    time: "Il y a 5 min",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Download,
    text: "Contact enregistre via NFC",
    time: "Il y a 23 min",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    icon: MousePointer,
    text: "Clic sur votre lien LinkedIn",
    time: "Il y a 1h",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    icon: UserPlus,
    text: "Nouveau contact ajoute a votre liste",
    time: "Il y a 2h",
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
  {
    icon: Eye,
    text: "10 nouvelles vues de votre carte",
    time: "Il y a 3h",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
]

export function RecentActivity() {
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
        {activities.map((activity, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + index * 0.1 }}
            whileHover={{ x: 4 }}
            className="group flex items-center gap-4 p-3 rounded-xl hover:bg-muted/30 transition-all cursor-pointer"
          >
            <div className={`p-2.5 rounded-xl ${activity.bgColor} group-hover:scale-110 transition-transform`}>
              <activity.icon className={`w-4 h-4 ${activity.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {activity.text}
              </p>
              <p className="text-xs text-muted-foreground">{activity.time}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
