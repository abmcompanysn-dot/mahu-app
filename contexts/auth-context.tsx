"use client"

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { signInWithGooglePopup, signInWithFacebookPopup } from "@/lib/firebase"

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
  socialLogin: (provider: "google" | "facebook") => Promise<{ success: boolean; error?: string; newUser?: boolean }>
  hydrateFromToken: (token: string, role: string) => void
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
      
      // Si on a un profil, c'est que ca a fonctionne (ignore result.error car AppScript peut le retourner)
      if (result.user || result.profile) {
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

  // Social login (Google / Facebook via Firebase)
  const socialLogin = useCallback(async (provider: "google" | "facebook") => {
    setIsLoading(true)

    try {
      const credential = provider === "google"
        ? await signInWithGooglePopup()
        : await signInWithFacebookPopup()

      const idToken = await credential.user.getIdToken()

      const response = await fetch("/api/backend/api/auth/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      })
      const result = await response.json()

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
      return { success: false, error: result.error || "Erreur de connexion" }
    } catch (error) {
      setIsLoading(false)
      const message = error instanceof Error ? error.message : "Erreur de connexion"
      return { success: false, error: message }
    }
  }, [])

  // Hydrate the session from a token obtained outside the usual login flows
  // (e.g. the biometric card verification on app/c/[cardCode]).
  const hydrateFromToken = useCallback((newToken: string, newRole: string) => {
    localStorage.setItem("mahu_token", newToken)
    localStorage.setItem("mahu_role", newRole)

    setToken(newToken)
    setRole(newRole)
    setIsAuthenticated(true)
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
      socialLogin,
      hydrateFromToken,
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
