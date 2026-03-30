"use client"

import { motion } from "framer-motion"
import { Menu, Bell, Search, Moon, Sun } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useState, useEffect } from "react"

interface HeaderProps {
  onMenuClick: () => void
}

export function DashboardHeader({ onMenuClick }: HeaderProps) {
  const { dashboardData } = useAuth()
  const [isDark, setIsDark] = useState(true)

  // Get user data from dashboard
  const userName = dashboardData?.profile?.Nom_Complet || dashboardData?.user?.Nom_Complet || ""
  const userEmail = dashboardData?.user?.Email || ""
  
  // Get initials
  const initials = userName
    ? userName
        .split(" ")
        .map((n: string) => n[0])
        .filter(Boolean)
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?"

  useEffect(() => {
    // Check initial theme
    const isDarkMode = document.documentElement.classList.contains("dark")
    setIsDark(isDarkMode)
  }, [])

  const toggleTheme = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    document.documentElement.classList.toggle("dark", newIsDark)
    localStorage.setItem("theme", newIsDark ? "dark" : "light")
  }

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
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Theme toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className="p-2 rounded-xl hover:bg-muted/50 transition-colors"
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-muted-foreground" />
            ) : (
              <Moon className="w-5 h-5 text-muted-foreground" />
            )}
          </motion.button>

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
              <span className="text-sm font-semibold text-primary">{initials}</span>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-foreground">{userName || "Utilisateur"}</p>
              <p className="text-xs text-muted-foreground truncate max-w-[150px]">{userEmail}</p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.header>
  )
}
