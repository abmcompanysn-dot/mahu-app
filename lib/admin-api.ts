// Client pour l'espace admin, via le meme proxy /api/backend que le reste
// (voir app/api/backend/[...path]/route.ts). Le token admin est distinct du
// token utilisateur normal (type "admin" cote backend, cle localStorage separee).
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
  amountXof: number
  confirmedAt: string
}

export interface PaymentsResponse {
  payments: Payment[]
  revenueByPlan: Array<{ _id: string; count: number; totalXof: number }>
  totalRevenueXof: number
}

export interface Announcement {
  _id: string
  title: string
  body: string
  active: boolean
  createdAt: string
}

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
    return { success: true as const, token: data.token as string, admin: data.admin as AdminInfo }
  },

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
}
