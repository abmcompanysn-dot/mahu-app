// Configuration pour Google AppScript - v6 (production ready, no cache)
// Toutes les requetes passent par le proxy /api/appscript pour eviter CORS
// Ne jamais appeler APPSCRIPT_URL directement depuis le client
const API_PROXY_URL = "/api/appscript"

// Types supplementaires pour la compatibilite
export interface UserProfile {
  firstName?: string
  lastName?: string
  title?: string
  company?: string
  bio?: string
  location?: string
  username?: string
  profilePicture?: string
  socialLinks?: Array<{ type: string; label: string; url: string }>
}

export interface UserStats {
  totalViews?: number
  viewsChange?: string
  totalClicks?: number
  clicksChange?: string
  contactsGenerated?: number
  contactsChange?: string
  conversionRate?: string
  conversionChange?: string
  weeklyViews?: number
}

export interface Activity {
  id: string
  type: string
  text: string
  time: string
  timestamp: string
}

// Types pour l'API
export interface User {
  ID_Unique: string
  Email: string
  Role: string
  URL_Profil: string
  Onboarding_Status: string
}

export interface Profile {
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
  Mise_En_Page: string
  Couleur_Theme: string
  Cacher_Marque: string
  Langue: string
}

export interface SocialLink {
  type: string
  url: string
  label?: string
}

export interface Contact {
  id: string
  name: string
  email: string
  phone?: string
  message?: string
  date: string
}

export interface DashboardData {
  profile: Profile
  profileUrl: string
  stats: {
    views: number
    viewsTrend: string
    leads: number
    leadsTrend: string
    shares: number
  }
  recentActivity: Array<{
    date: string
    source: string
  }>
  leads: Contact[]
  documents: Array<{
    ID_Document: string
    Type: string
    Nom: string
    URL: string
  }>
  employees?: Array<{
    email: string
    name: string
    profileUrl: string
  }>
  enterpriseInfo?: {
    companyName: string
    logo: string
  }
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  error?: string
  token?: string
  newUser?: boolean
  role?: string
  // For getDashboardData response
  profile?: Profile
  profileUrl?: string
  stats?: DashboardData['stats']
  recentActivity?: DashboardData['recentActivity']
  leads?: Contact[]
  documents?: DashboardData['documents']
  employees?: DashboardData['employees']
  enterpriseInfo?: DashboardData['enterpriseInfo']
  data?: T
}

// Fonction helper pour appeler l'API AppScript via le proxy Next.js
export async function callAppScript<T = unknown>(
  action: string,
  data: Record<string, unknown> = {},
  token?: string
): Promise<ApiResponse<T>> {
  try {
    const payload: Record<string, unknown> = {
      action,
      ...data,
    }
    
    if (token) {
      payload.token = token
    }

    const response = await fetch(API_PROXY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json()
    return result as ApiResponse<T>
  } catch (error) {
    console.error("[v0] Erreur API:", error)
    return { success: false, error: "Erreur de connexion au serveur" }
  }
}

// Fonction pour les requetes GET (getProfileData) via le proxy
export async function callAppScriptGet<T = unknown>(
  action: string,
  params: Record<string, string> = {}
): Promise<T> {
  try {
    const url = new URL(API_PROXY_URL, window.location.origin)
    url.searchParams.append('action', action)
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })

    const response = await fetch(url.toString(), {
      method: "GET",
    })

    const result = await response.json()
    return result as T
  } catch (error) {
    console.error("[v0] Erreur API GET:", error)
    throw error
  }
}

// API Functions adaptees au code AppScript fourni
export const api = {
  // Auth
  login: (email: string, password: string) =>
    callAppScript("loginUser", { email, password }),
  
  register: (email: string, password: string, enterpriseId?: string) =>
    callAppScript("registerUser", { email, password, enterpriseId }),
  
  forgotPassword: (email: string) =>
    callAppScript("forgotPassword", { email }),
  
  resetPassword: (token: string, newPassword: string) =>
    callAppScript("resetPassword", { token, newPassword }),
  
  logout: (token: string) =>
    callAppScript("logout", {}, token),
  
  // Dashboard
  getDashboardData: (token: string) =>
    callAppScript<DashboardData>("getDashboardData", {}, token),
  
  // Profile
  saveProfile: (token: string, data: Partial<Profile>) =>
    callAppScript("saveProfile", data, token),
  
  saveProfileImage: (token: string, data: { imageBase64: string; type: 'photo' | 'cover' }) =>
    callAppScript("saveProfileImage", { 
      imageType: data.type === 'photo' ? 'picture' : 'cover',
      imageUrl: data.imageBase64
    }, token),
  
  getPublicProfile: (profileUrl: string) =>
    callAppScriptGet<Profile & { error?: string }>("getProfileData", { user: profileUrl }),
  
  // Contacts / Leads
  handleLeadCapture: (data: { profileUrl: string; name: string; contact: string; message?: string }) =>
    callAppScript("handleLeadCapture", data),
  
  exportLeadsAsCSV: (token: string) =>
    callAppScript("exportLeadsAsCSV", {}, token),
  
  // Documents
  saveDocument: (token: string, data: { type: string; name: string; url: string }) =>
    callAppScript("saveDocument", data, token),
  
  deleteDocument: (token: string, docId: string) =>
    callAppScript("deleteDocument", { docId }, token),
  
  // Analytics
  trackView: (profileUrl: string, source: string = 'Lien') =>
    callAppScript("trackView", { profileUrl, source }),
  
  // Module state
  setModuleState: (token: string, moduleName: string, isEnabled: boolean) =>
    callAppScript("setModuleState", { moduleName, isEnabled }, token),
  
  // Onboarding
  updateOnboardingData: (token: string, data: Record<string, unknown>) =>
    callAppScript("updateOnboardingData", data, token),
  
  // NFC
  linkNfcCard: (token: string, nfcId: string) =>
    callAppScript("linkNfcCard", { nfcId }, token),
  
  // Enterprise
  createEmployee: (token: string, data: { email: string; password: string; name: string }) =>
    callAppScript("createEmployee", data, token),
  
  deleteEmployee: (token: string, email: string) =>
    callAppScript("deleteEmployee", { email }, token),
  
  saveEnterpriseInfo: (token: string, data: { companyName: string; logo?: string }) =>
    callAppScript("saveEnterpriseInfo", data, token),
  
  // Support
  contactSupport: (token: string | null, data: { email: string; sujet: string; message: string; telephone?: string }) =>
    token ? callAppScript("contactSupport", data, token) : callAppScript("contactSupport", data),
  
  // Affiliate Program
  getAffiliateData: (token: string) =>
    callAppScript<{
      stats: {
        totalReferrals: number
        activeReferrals: number
        totalEarnings: number
        pendingEarnings: number
        paidEarnings: number
        conversionRate: number
        referralCode: string
        referralLink: string
      }
      referrals: Array<{
        id: string
        email: string
        date: string
        status: "pending" | "active" | "paid"
        commission: number
      }>
    }>("getAffiliateData", {}, token),
  
  requestWithdrawal: (token: string, data: { amount: number; paydunyaPhone: string; method: string }) =>
    callAppScript("requestWithdrawal", data, token),
  
  // PayDunya Integration
  initPayment: (token: string, data: { amount: number; description: string; returnUrl: string }) =>
    callAppScript<{ paymentUrl: string; token: string }>("initPayDunyaPayment", data, token),
  
  verifyPayment: (token: string, paymentToken: string) =>
    callAppScript("verifyPayDunyaPayment", { paymentToken }, token),
}

// Alias pour compatibilite avec les composants existants
export const mahuApi = {
  login: api.login,
  register: api.register,
  resetPassword: (email: string) => api.forgotPassword(email),
  
  getProfile: async (userId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('mahu_token') : null
    if (!token) return { success: false, data: null }
    const result = await api.getDashboardData(token)
    if (result.success && result.profile) {
      const profile = result.profile
      return {
        success: true,
        data: {
          firstName: profile.Nom_Complet?.split(' ')[0] || '',
          lastName: profile.Nom_Complet?.split(' ').slice(1).join(' ') || '',
          title: profile.Profession,
          company: profile.Compagnie,
          bio: '',
          location: profile.Location,
          username: result.profileUrl,
          profilePicture: profile.URL_Photo,
          socialLinks: JSON.parse(profile.Liens_Sociaux_JSON || '[]'),
        } as UserProfile
      }
    }
    return { success: false, data: null }
  },
  
  getStats: async (userId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('mahu_token') : null
    if (!token) return { success: false, data: null }
    const result = await api.getDashboardData(token)
    if (result.success && result.stats) {
      return {
        success: true,
        data: {
          totalViews: result.stats.views || 0,
          viewsChange: result.stats.viewsTrend || '+0%',
          totalClicks: 0,
          clicksChange: '+0%',
          contactsGenerated: result.stats.leads || 0,
          contactsChange: result.stats.leadsTrend || '+0%',
          conversionRate: '0%',
          conversionChange: '+0%',
          weeklyViews: result.stats.views || 0,
        } as UserStats
      }
    }
    return { success: false, data: null }
  },
  
  getActivities: async (userId: string, limit: number = 5) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('mahu_token') : null
    if (!token) return { success: false, data: [] }
    const result = await api.getDashboardData(token)
    if (result.success && result.recentActivity) {
      const activities: Activity[] = result.recentActivity.slice(0, limit).map((act, idx) => ({
        id: String(idx),
        type: 'view',
        text: `Vue depuis ${act.source}`,
        time: act.date,
        timestamp: act.date,
      }))
      return { success: true, data: activities }
    }
    return { success: false, data: [] }
  },
}
