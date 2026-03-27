"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { api, type User } from "@/lib/api"

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

export function useAuth() {
  const router = useRouter()
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  })

  // Charger l'utilisateur depuis localStorage au demarrage
  useEffect(() => {
    const loadUser = () => {
      try {
        const userStr = localStorage.getItem("mahu_user")
        const token = localStorage.getItem("mahu_token")
        
        if (userStr && token) {
          const user = JSON.parse(userStr) as User
          setState({
            user,
            isLoading: false,
            isAuthenticated: true,
          })
        } else {
          setState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
          })
        }
      } catch {
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        })
      }
    }

    loadUser()
  }, [])

  // Login
  const login = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, isLoading: true }))

    const result = await api.login(email, password)

    if (result.success && result.data) {
      const { user, token } = result.data
      localStorage.setItem("mahu_user", JSON.stringify(user))
      localStorage.setItem("mahu_token", token)
      
      setState({
        user,
        isLoading: false,
        isAuthenticated: true,
      })
      
      return { success: true }
    }

    setState((s) => ({ ...s, isLoading: false }))
    return { success: false, error: result.error || "Erreur de connexion" }
  }, [])

  // Register
  const register = useCallback(async (name: string, email: string, password: string) => {
    setState((s) => ({ ...s, isLoading: true }))

    const result = await api.register(name, email, password)

    setState((s) => ({ ...s, isLoading: false }))
    
    if (result.success) {
      return { success: true }
    }

    return { success: false, error: result.error || "Erreur lors de l'inscription" }
  }, [])

  // Logout
  const logout = useCallback(() => {
    localStorage.removeItem("mahu_user")
    localStorage.removeItem("mahu_token")
    
    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    })
    
    router.push("/login")
  }, [router])

  // Update user
  const updateUser = useCallback((updates: Partial<User>) => {
    setState((s) => {
      if (!s.user) return s
      
      const updatedUser = { ...s.user, ...updates }
      localStorage.setItem("mahu_user", JSON.stringify(updatedUser))
      
      return { ...s, user: updatedUser }
    })
  }, [])

  // Require auth - redirect to login if not authenticated
  const requireAuth = useCallback(() => {
    if (!state.isLoading && !state.isAuthenticated) {
      router.push("/login")
    }
  }, [state.isLoading, state.isAuthenticated, router])

  return {
    ...state,
    login,
    register,
    logout,
    updateUser,
    requireAuth,
  }
}
