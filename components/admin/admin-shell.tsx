"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { BarChart3, Loader2, Megaphone, Shield, Sparkles, Users, Wallet, IdCard } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAdminAuth } from "@/contexts/admin-auth-context"

const NAV_ITEMS = [
  { href: "/admin", label: "Paiements", icon: Wallet },
  { href: "/admin/users", label: "Utilisateurs", icon: Users },
  { href: "/admin/announcements", label: "Annonces", icon: Megaphone },
  { href: "/admin/cards", label: "Cartes & revendeurs", icon: IdCard },
  { href: "/admin/consumption", label: "Consommation IA", icon: BarChart3 },
  { href: "/admin/beta", label: "Beta carte IA", icon: Sparkles },
  { href: "/admin/security", label: "Securite", icon: Shield },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAdminAuth()

  const isLoginPage = pathname === "/admin/login"

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isLoginPage) {
      router.replace("/admin/login")
    }
  }, [isLoading, isAuthenticated, isLoginPage, router])

  if (isLoginPage) {
    return <>{children}</>
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 md:px-6 flex items-center gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
      {children}
    </div>
  )
}
