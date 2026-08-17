"use client"

import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  User,
  Users,
  Building2,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"

interface SidebarProps {
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
}

const navItems = [
  { icon: LayoutDashboard, label: "Tableau de bord", href: "/dashboard" },
  { icon: User, label: "Mon Profil", href: "/dashboard/profile" },
  { icon: Sparkles, label: "AI MAHU", href: "/ai", badge: "Nouveau" },
  { icon: Users, label: "Mes Contacts", href: "/dashboard/contacts" },
  { icon: Building2, label: "Entreprise", href: "/dashboard/enterprise", badge: "Pro" },
  { icon: Settings, label: "Parametres", href: "/dashboard/settings" },
]

export function DashboardSidebar({
  collapsed,
  onCollapsedChange,
  mobileOpen,
  onMobileOpenChange
}: SidebarProps) {
  const pathname = usePathname()
  const { logout, user } = useAuth()

  const handleLogout = () => {
    logout()
  }

  // Mode IA reste cache tant qu'un admin ne l'a pas active pour ce compte
  // (rollout controle) - voir requireAiAccess cote backend.
  const visibleNavItems = navItems.filter((item) => item.href !== "/ai" || user?.Ai_Enabled)

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-6 flex items-center justify-between border-b border-border/50">
        <Link href="/" className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center"
          >
            <span className="text-lg font-bold text-primary">M</span>
          </motion.div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="text-xl font-bold text-foreground overflow-hidden whitespace-nowrap"
              >
                Mahu
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
        
        {/* Close button for mobile */}
        <button
          onClick={() => onMobileOpenChange(false)}
          className="lg:hidden p-2 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {visibleNavItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href} onClick={() => onMobileOpenChange(false)}>
              <motion.div
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative group",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full"
                  />
                )}
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="font-medium overflow-hidden whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {item.badge && !collapsed && (
                  <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded-full">
                    {item.badge}
                  </span>
                )}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border/50">
        <button onClick={handleLogout} className="w-full">
          <motion.div
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="font-medium overflow-hidden whitespace-nowrap"
                >
                  Deconnexion
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        </button>
        
        {/* Collapse button - desktop only */}
        <button
          onClick={() => onCollapsedChange(!collapsed)}
          className="hidden lg:flex w-full items-center justify-center mt-4 p-2 rounded-lg hover:bg-muted/50 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          )}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 256 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40 flex-col bg-sidebar/80 backdrop-blur-xl border-r border-border/50"
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            onClick={() => onMobileOpenChange(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-72 flex flex-col bg-sidebar/95 backdrop-blur-xl border-r border-border/50"
          >
            <SidebarContent />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}
