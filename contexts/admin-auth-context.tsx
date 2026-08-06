"use client"

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react"
import { adminApi, type AdminInfo } from "@/lib/admin-api"

interface AdminAuthContextValue {
  token: string | null
  admin: AdminInfo | null
  isLoading: boolean
  isAuthenticated: boolean
  twoFactorPending: boolean
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string; twoFactorRequired?: boolean }>
  verify2fa: (code: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [admin, setAdmin] = useState<AdminInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingToken, setPendingToken] = useState<string | null>(null)

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem("mahu_admin_token")
      const savedAdmin = localStorage.getItem("mahu_admin_info")
      if (savedToken) {
        setToken(savedToken)
        setAdmin(savedAdmin ? JSON.parse(savedAdmin) : null)
      }
    } catch {
      // Ignore
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const result = await adminApi.login(email, password)
    if (!result.success) {
      return { success: false, error: result.error }
    }
    if (result.twoFactorRequired) {
      setPendingToken(result.pendingToken)
      return { success: true, twoFactorRequired: true }
    }
    localStorage.setItem("mahu_admin_token", result.token)
    localStorage.setItem("mahu_admin_info", JSON.stringify(result.admin))
    setToken(result.token)
    setAdmin(result.admin)
    return { success: true }
  }, [])

  const verify2fa = useCallback(
    async (code: string) => {
      if (!pendingToken) {
        return { success: false, error: "Session de connexion expiree, recommencez." }
      }
      const result = await adminApi.verify2fa(pendingToken, code)
      if (!result.success) {
        return { success: false, error: result.error }
      }
      localStorage.setItem("mahu_admin_token", result.token)
      localStorage.setItem("mahu_admin_info", JSON.stringify(result.admin))
      setToken(result.token)
      setAdmin(result.admin)
      setPendingToken(null)
      return { success: true }
    },
    [pendingToken]
  )

  const logout = useCallback(() => {
    localStorage.removeItem("mahu_admin_token")
    localStorage.removeItem("mahu_admin_info")
    setToken(null)
    setAdmin(null)
    setPendingToken(null)
  }, [])

  return (
    <AdminAuthContext.Provider
      value={{
        token,
        admin,
        isLoading,
        isAuthenticated: !!token,
        twoFactorPending: !!pendingToken,
        login,
        verify2fa,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider")
  }
  return context
}
