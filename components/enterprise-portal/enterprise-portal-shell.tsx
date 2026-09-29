"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ArrowLeft, Building2, Contact, IdCard, LayoutDashboard, Loader2, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"

const NAV_ITEMS = [
  { href: "/enterprise-portal", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/enterprise-portal/team", label: "Equipe", icon: Users },
  { href: "/enterprise-portal/contacts", label: "Contacts de l'equipe", icon: Contact },
  { href: "/enterprise-portal/cards", label: "Cartes", icon: IdCard },
  { href: "/enterprise-portal/settings", label: "Entreprise", icon: Building2 },
]

export function EnterprisePortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, isLoading, role } = useAuth()

  const isAuthorized = isAuthenticated && role === "Entreprise"

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.replace("/login")
    } else if (role !== "Entreprise") {
      router.replace("/dashboard")
    }
  }, [isLoading, isAuthenticated, role, router])

  if (isLoading || !isAuthorized) {
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
          <Link
            href="/dashboard"
            className="ml-auto flex items-center gap-2 px-4 py-4 text-sm font-medium whitespace-nowrap text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Mon dashboard
          </Link>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">{children}</main>
    </div>
  )
}
