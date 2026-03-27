"use client"

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"

// Types bases sur la reponse AppScript
export interface AppScriptUser {
  ID_Unique: string
  Email: string
  Role: string
  URL_Profil: string
  URL_Profil_2?: string
  URL_Profil_3?: string
  Onboarding_Status: string
}

export interface AppScriptProfile {
  ID_Utilisateur: string
  Email: string
  Nom_Complet: string
  Telephone: string
  Profession: string
  Compagnie: string
  Location: string
  URL_Photo: string
  URL_Couverture: string
  Liens_Sociaux_JSON: string
  Lead_Capture_Actif: string
  Services_JSON: string
  Mise_En_Page?: string
  Couleur_Theme?: string
  Cacher_Marque?: string
  Langue?: string
}

export interface AppScriptDashboardData {
  user: AppScriptUser
  profile: AppScriptProfile
  prospects: Array<{ id: string; date: string; nom: string; contact: string; note: string }>
  documents: Array<{ id: string; type: string; name: string; url: string; date: string }>
  appUrl: string
  stats: { labels: string[]; data: number[] }
  totalViews: number
  totalProspects: number
  team: Array<{ id: string; name: string; email: string; url: string; leads: number }>
  onboardingStatus: string
  enterprise: { Name: string; Phone: string; Address: string }
  lastOrder: { date: string; product: string; status: string } | null
  error?: string
}

interface AuthContextValue {
  token: string | null
  role: string | null
  isLoading: boolean
  isAuthenticated: boolean
  dashboardData: AppScriptDashboardData | null
  user: AppScriptUser | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; newUser?: boolean }>
  register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  fetchDashboardData: () => Promise<AppScriptDashboardData | null>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [dashboardData, setDashboardData] = useState<AppScriptDashboardData | null>(null)
  const [user, setUser] = useState<AppScriptUser | null>(null)

  // Load auth on mount
  useEffect(() => {
    const loadAuth = () => {
      try {
        const savedToken = localStorage.getItem("mahu_token")
        const savedRole = localStorage.getItem("mahu_role")
        
        if (savedToken) {
          setToken(savedToken)
          setRole(savedRole)
          setIsAuthenticated(true)
        }
      } catch {
        // Ignore
      }
      setIsLoading(false)
    }

    loadAuth()
  }, [])

  // Fetch dashboard data when authenticated
  const fetchDashboardData = useCallback(async (): Promise<AppScriptDashboardData | null> => {
    const currentToken = token || localStorage.getItem("mahu_token")
    if (!currentToken) return null

    try {
      const result = await api.getDashboardData(currentToken) as unknown as AppScriptDashboardData
      
      console.log("[v0] Dashboard data received:", result)
      
      if (result.error) {
        console.error("[v0] Dashboard error:", result.error)
        return null
      }
      
      if (result.profile) {
        setDashboardData(result)
        setUser(result.user)
        return result
      }
      
      return null
    } catch (error) {
      console.error("[v0] Error fetching dashboard:", error)
      return null
    }
  }, [token])

  // Auto-fetch dashboard when authenticated
  useEffect(() => {
    if (isAuthenticated && !dashboardData) {
      fetchDashboardData()
    }
  }, [isAuthenticated, dashboardData, fetchDashboardData])

  // Login
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)

    const result = await api.login(email, password)
    console.log("[v0] Login result:", result)

    if (result.success && result.token) {
      localStorage.setItem("mahu_token", result.token)
      localStorage.setItem("mahu_role", result.role || "Entreprise")
      
      setToken(result.token)
      setRole(result.role || "Entreprise")
      setIsAuthenticated(true)
      setIsLoading(false)
      
      return { success: true, newUser: result.newUser }
    }

    setIsLoading(false)
    return { success: false, error: result.error || "Email ou mot de passe incorrect" }
  }, [])

  // Register
  const register = useCallback(async (email: string, password: string) => {
    setIsLoading(true)

    const result = await api.register(email, password)

    if (result.success && result.token) {
      localStorage.setItem("mahu_token", result.token)
      localStorage.setItem("mahu_role", "Entreprise")
      
      setToken(result.token)
      setRole("Entreprise")
      setIsAuthenticated(true)
      setIsLoading(false)
      
      return { success: true }
    }

    setIsLoading(false)
    return { success: false, error: result.error || "Erreur lors de l'inscription" }
  }, [])

  // Logout
  const logout = useCallback(() => {
    const currentToken = localStorage.getItem("mahu_token")
    if (currentToken) {
      api.logout(currentToken)
    }
    
    localStorage.removeItem("mahu_token")
    localStorage.removeItem("mahu_role")
    
    setToken(null)
    setRole(null)
    setIsAuthenticated(false)
    setDashboardData(null)
    setUser(null)
    
    router.push("/login")
  }, [router])

  return (
    <AuthContext.Provider value={{
      token,
      role,
      isLoading,
      isAuthenticated,
      dashboardData,
      user,
      login,
      register,
      logout,
      fetchDashboardData,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
