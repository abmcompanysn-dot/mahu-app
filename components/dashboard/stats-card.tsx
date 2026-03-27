"use client"

import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  stat: {
    label: string
    value: string
    change: string
    icon: LucideIcon
    color: string
  }
  index: number
}

export function StatsCard({ stat, index }: StatCardProps) {
  const isPositive = stat.change.startsWith("+")

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="group p-4 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm hover:border-primary/30 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl bg-muted/50 ${stat.color} group-hover:scale-110 transition-transform`}>
          <stat.icon className="w-4 h-4" />
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
        }`}>
          {stat.change}
        </span>
      </div>
      <p className="text-2xl font-bold text-foreground mb-1">{stat.value}</p>
      <p className="text-xs text-muted-foreground">{stat.label}</p>
    </motion.div>
  )
}
