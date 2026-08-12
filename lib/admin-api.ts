// Client pour l'espace admin, via le meme proxy /api/backend que le reste
// (voir app/api/backend/[...path]/route.ts). Le token admin est distinct du
// token utilisateur normal (type "admin" cote backend, cle localStorage separee).
import { callAppScript, type ApiResponse } from "@/lib/api"

const AUTH_BASE_URL = "/api/backend/api/auth"
const ADMIN_BASE_URL = "/api/backend/api/admin"

export interface AdminInfo {
  id: string
  email: string
  name: string
  role: "admin" | "superadmin"
}

export interface AdminStats {
  adminCount: number
  announcementCount: number
  activeAnnouncementCount: number
  userCount: number
  plans: { gratuit: number; premium: number; pro: number }
  cached: boolean
}

export interface ConsumptionByBucket {
  _id: string
  messageCount: number
  tokensIn: number
  tokensOut: number
}

export interface ConsumptionStats {
  since: string
  totals: { messageCount: number; tokensIn: number; tokensOut: number }
  byModel: ConsumptionByBucket[]
  byDay: ConsumptionByBucket[]
  activeConversationCount: number
}

export interface Payment {
  _id: string
  userId: { _id: string; email: string; name: string } | string
  plan: "premium" | "pro"
  provider?: "paydunya" | "pawapay"
  amountXof: number
  confirmedAt: string
}

export interface PaymentsResponse {
  payments: Payment[]
  revenueByPlan: Array<{ _id: string; count: number; totalXof: number }>
  totalRevenueXof: number
}

export interface BetaSignup {
  _id: string
  name: string
  email: string
  phone: string
  address: string
  country: string
  createdAt: string
}

export interface Announcement {
  _id: string
  title: string
  body: string
  active: boolean
  createdAt: string
}

export interface AdminUserRow {
  _id: string
  email: string
  name: string
  role: string
  disabled?: boolean
  plan: "gratuit" | "premium" | "pro"
  createdAt: string
}

// Champs tels que renvoyes par adminGetCardsData (contrat legacy AppScript,
// voir backend/internal/handlers/legacy_admin.go:126) - garde les memes cles.
export interface PhysicalCard {
  Code_Carte: string
  Email_Proprietaire?: string
  Date_Activation?: string
  Statut: string
  Date_Vente?: string
  Vendeur?: string
  Commentaire?: string
  Tag_URL: string
}

type ApiCardsResponse = ApiResponse & { cards: PhysicalCard[]; isSuper: boolean }
type ApiBatchResponse = ApiResponse & { batchId: string }

async function request<T>(url: string, token: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Erreur inconnue" }))
    throw new Error(error.error || `Erreur ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const adminApi = {
  login: async (email: string, password: string) => {
    const response = await fetch(`${AUTH_BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    const data = await response.json()
    if (!response.ok) {
      return { success: false as const, error: data.error || "Identifiants incorrects" }
    }
    if (data.twoFactorRequired) {
      return { success: true as const, twoFactorRequired: true as const, pendingToken: data.pendingToken as string }
    }
    return {
      success: true as const,
      twoFactorRequired: false as const,
      token: data.token as string,
      admin: data.admin as AdminInfo,
    }
  },

  verify2fa: async (pendingToken: string, code: string) => {
    const response = await fetch(`${AUTH_BASE_URL}/login/verify-2fa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pendingToken, code }),
    })
    const data = await response.json()
    if (!response.ok) {
      return { success: false as const, error: data.error || "Code invalide" }
    }
    return { success: true as const, token: data.token as string, admin: data.admin as AdminInfo }
  },

  setup2fa: (token: string) => request<{ secret: string; otpauthUrl: string }>(`${ADMIN_BASE_URL}/2fa/setup`, token, { method: "POST" }),

  confirm2fa: (token: string, code: string) =>
    request<{ success: boolean }>(`${ADMIN_BASE_URL}/2fa/confirm`, token, {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  disable2fa: (token: string) => request<{ success: boolean }>(`${ADMIN_BASE_URL}/2fa/disable`, token, { method: "POST" }),

  listUsers: (token: string, search = "") =>
    request<{ users: AdminUserRow[] }>(`${ADMIN_BASE_URL}/users?search=${encodeURIComponent(search)}`, token),

  updateUserPlan: (token: string, userId: string, plan: string) =>
    request<{ success: boolean }>(`${ADMIN_BASE_URL}/users/${userId}/plan`, token, {
      method: "PATCH",
      body: JSON.stringify({ plan }),
    }),

  setUserDisabled: (token: string, userId: string, disabled: boolean) =>
    request<{ success: boolean }>(`${ADMIN_BASE_URL}/users/${userId}/disable`, token, {
      method: "PATCH",
      body: JSON.stringify({ disabled }),
    }),

  // Cartes/revendeurs : actions legacy existantes (backend/internal/handlers/legacy_admin.go),
  // pontees pour accepter le token admin - voir checkStaffAccess cote backend. callAppScript
  // ne type pas les champs additionnels du contrat legacy - caste au retour.
  getCardsData: async (token: string) => {
    const res = await callAppScript("adminGetCardsData", {}, token)
    return res as ApiCardsResponse
  },

  generateCardCodes: async (token: string, quantity: number, prefix?: string) => {
    const res = await callAppScript("adminGenerateCardCodes", { quantity, prefix }, token)
    return res as ApiBatchResponse
  },

  assignCardLot: (token: string, codes: string, resellerEmail: string) =>
    callAppScript("adminAssignCardLot", { codes, resellerEmail }, token),

  createReseller: (token: string, data: { email: string; password: string; name: string; phone?: string }) =>
    callAppScript("adminCreateReseller", data, token),

  deactivateCard: (token: string, code: string) => callAppScript("adminDeactivateCard", { code }, token),

  broadcastMessage: (token: string, subject: string, title: string, message: string) =>
    callAppScript("adminBroadcastMessage", { subject, title, message }, token),

  getStats: (token: string) => request<AdminStats>(`${ADMIN_BASE_URL}/stats`, token),

  getConsumption: (token: string) => request<ConsumptionStats>(`${ADMIN_BASE_URL}/consumption`, token),

  getPayments: (token: string) => request<PaymentsResponse>(`${ADMIN_BASE_URL}/payments`, token),

  listAnnouncements: (token: string) =>
    request<{ announcements: Announcement[] }>(`${ADMIN_BASE_URL}/announcements`, token),

  createAnnouncement: (token: string, data: { title: string; body: string; active?: boolean }) =>
    request<{ announcement: Announcement }>(`${ADMIN_BASE_URL}/announcements`, token, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getBetaSignups: (token: string) => request<{ signups: BetaSignup[] }>(`${ADMIN_BASE_URL}/beta-signups`, token),
}
