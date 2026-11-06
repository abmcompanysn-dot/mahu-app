"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MUST_CHANGE_PASSWORD_KEY } from "@/contexts/auth-context"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()

  // Mot de passe provisoire pas encore change : d'abord /changer-mot-de-passe.
  useEffect(() => {
    if (localStorage.getItem(MUST_CHANGE_PASSWORD_KEY)) router.replace("/changer-mot-de-passe")
  }, [router])

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar 
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        onMobileOpenChange={setMobileMenuOpen}
      />
      <div className={`min-w-0 transition-all duration-300 ${sidebarCollapsed ? "lg:ml-20" : "lg:ml-64"}`}>
        <DashboardHeader 
          onMenuClick={() => setMobileMenuOpen(true)}
        />
        <main className="min-w-0 overflow-x-clip p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
