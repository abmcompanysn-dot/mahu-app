"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { api, type DashboardData, type Profile } from "@/lib/api"

interface UserData {
  id: string
  email: string
  firstName?: string
  lastName?: string
  username?: string
}

interface AuthState {
  token: string | null
  role: string | null
  isLoading: boolean
  isAuthenticated: boolean
  dashboardData: DashboardData | null
  user: UserData | null
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

    if (result.success && result.token) {
      localStorage.setItem("mahu_token", result.token)
      localStorage.setItem("mahu_role", result.role || "Entreprise")
      
      setState({
        token: result.token,
        role: result.role || "Entreprise",
        isLoading: false,
        isAuthenticated: true,
        dashboardData: null,
        user: { id: result.token, email },
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
        user: { id: result.token, email },
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

  // Fetch Dashboard Data
  const fetchDashboardData = useCallback(async () => {
    const token = state.token || localStorage.getItem("mahu_token")
    if (!token) return null

    const result = await api.getDashboardData(token)
    
    if (result.success && result.profile) {
      const dashboardData: DashboardData = {
        profile: result.profile,
        profileUrl: result.profileUrl || "",
        stats: result.stats || { views: 0, viewsTrend: "+0%", leads: 0, leadsTrend: "+0%", shares: 0 },
        recentActivity: result.recentActivity || [],
        leads: result.leads || [],
        documents: result.documents || [],
        employees: result.employees,
        enterpriseInfo: result.enterpriseInfo,
      }
      
      setState((s) => ({ ...s, dashboardData }))
      return dashboardData
    }
    
    return null
  }, [state.token])

  // Save Profile
  const saveProfile = useCallback(async (data: Partial<Profile>) => {
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
