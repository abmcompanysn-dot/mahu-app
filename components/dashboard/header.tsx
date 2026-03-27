"use client"

import { motion } from "framer-motion"
import { Menu, Bell, Search } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HeaderProps {
  onMenuClick: () => void
}

export function DashboardHeader({ onMenuClick }: HeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50"
    >
      <div className="flex items-center justify-between px-4 lg:px-8 py-4">
        {/* Left side */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <Menu className="w-6 h-6 text-foreground" />
          </button>
          
          {/* Search bar */}
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/30 border border-border/50 w-64">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher..."
              className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative p-2 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
          </motion.button>

          {/* Profile */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">JD</span>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-foreground">Jean Dupont</p>
              <p className="text-xs text-muted-foreground">jean@mahu.cards</p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.header>
  )
}
