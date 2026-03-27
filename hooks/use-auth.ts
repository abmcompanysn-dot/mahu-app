"use client"

import { useState, useEffect, useCallback } from "react"
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

interface AuthState {
  token: string | null
  role: string | null
  isLoading: boolean
  isAuthenticated: boolean
  dashboardData: AppScriptDashboardData | null
  user: AppScriptUser | null
}

export function useAuth() {
  const router = useRouter()
  const [state, setState] = useState<AuthState>({
    token: null,
    role: null,
    isLoading: true,
    isAuthenticated: false,
    dashboardData: null,
    user: null,
  })

  // Charger le token depuis localStorage au demarrage
  useEffect(() => {
    const loadAuth = () => {
      try {
        const token = localStorage.getItem("mahu_token")
        const role = localStorage.getItem("mahu_role")
        
        if (token) {
          setState({
            token,
            role,
            isLoading: false,
            isAuthenticated: true,
            dashboardData: null,
            user: null,
          })
        } else {
          setState({
            token: null,
            role: null,
            isLoading: false,
            isAuthenticated: false,
            dashboardData: null,
            user: null,
          })
        }
      } catch {
        setState({
          token: null,
          role: null,
          isLoading: false,
          isAuthenticated: false,
          dashboardData: null,
          user: null,
        })
      }
    }

    loadAuth()
  }, [])

  // Login
  const login = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, isLoading: true }))

    const result = await api.login(email, password)
    console.log("[v0] Login result:", result)

    if (result.success && result.token) {
      localStorage.setItem("mahu_token", result.token)
      localStorage.setItem("mahu_role", result.role || "Entreprise")
      
      setState({
        token: result.token,
        role: result.role || "Entreprise",
        isLoading: false,
        isAuthenticated: true,
        dashboardData: null,
        user: null,
      })
      
      return { success: true, newUser: result.newUser }
    }

    setState((s) => ({ ...s, isLoading: false }))
    return { success: false, error: result.error || "Email ou mot de passe incorrect" }
  }, [])

  // Register
  const register = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, isLoading: true }))

    const result = await api.register(email, password)

    if (result.success && result.token) {
      localStorage.setItem("mahu_token", result.token)
      localStorage.setItem("mahu_role", "Entreprise")
      
      setState({
        token: result.token,
        role: "Entreprise",
        isLoading: false,
        isAuthenticated: true,
        dashboardData: null,
        user: null,
      })
      
      return { success: true }
    }

    setState((s) => ({ ...s, isLoading: false }))
    return { success: false, error: result.error || "Erreur lors de l'inscription" }
  }, [])

  // Forgot Password
  const forgotPassword = useCallback(async (email: string) => {
    const result = await api.forgotPassword(email)
    return result
  }, [])

  // Reset Password
  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    const result = await api.resetPassword(token, newPassword)
    return result
  }, [])

  // Logout
  const logout = useCallback(() => {
    const token = localStorage.getItem("mahu_token")
    if (token) {
      api.logout(token)
    }
    
    localStorage.removeItem("mahu_token")
    localStorage.removeItem("mahu_role")
    
    setState({
      token: null,
      role: null,
      isLoading: false,
      isAuthenticated: false,
      dashboardData: null,
      user: null,
    })
    
    router.push("/login")
  }, [router])

  // Fetch Dashboard Data - adapte au format AppScript
  const fetchDashboardData = useCallback(async (): Promise<AppScriptDashboardData | null> => {
    const token = state.token || localStorage.getItem("mahu_token")
    if (!token) return null

    try {
      // AppScript retourne directement les donnees, pas { success: true, data: {...} }
      const result = await api.getDashboardData(token) as unknown as AppScriptDashboardData
      
      console.log("[v0] Dashboard data received:", result)
      
      if (result.error) {
        console.error("[v0] Dashboard error:", result.error)
        return null
      }
      
      if (result.profile) {
        setState((s) => ({ 
          ...s, 
          dashboardData: result,
          user: result.user,
        }))
        return result
      }
      
      return null
    } catch (error) {
      console.error("[v0] Error fetching dashboard:", error)
      return null
    }
  }, [state.token])

  // Save Profile
  const saveProfile = useCallback(async (data: Partial<AppScriptProfile>) => {
    const token = state.token || localStorage.getItem("mahu_token")
    if (!token) return { success: false, error: "Non authentifie" }

    const result = await api.saveProfile(token, data)
    
    if (result.success) {
      // Refresh dashboard data
      await fetchDashboardData()
    }
    
    return result
  }, [state.token, fetchDashboardData])

  // Require auth - redirect to login if not authenticated
  const requireAuth = useCallback(() => {
    if (!state.isLoading && !state.isAuthenticated) {
      router.push("/login")
      return false
    }
    return state.isAuthenticated
  }, [state.isLoading, state.isAuthenticated, router])

  // Get token
  const getToken = useCallback(() => {
    return state.token || localStorage.getItem("mahu_token")
  }, [state.token])

  return {
    ...state,
    login,
    register,
    forgotPassword,
    resetPassword,
    logout,
    fetchDashboardData,
    saveProfile,
    requireAuth,
    getToken,
  }
}
