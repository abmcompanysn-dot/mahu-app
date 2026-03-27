// Configuration pour Google AppScript
// URL de votre Web App Google AppScript
export const APPSCRIPT_URL = process.env.NEXT_PUBLIC_APPSCRIPT_URL || "https://script.google.com/macros/s/AKfycbwkdog99cVkYOENGz-JnGOFNEGUWZ5H3TC_BsPg4tyA/exec"

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

// Fonction helper pour appeler l'API AppScript via FormData (comme le code original)
export async function callAppScript<T = unknown>(
  action: string,
  data: Record<string, unknown> = {},
  token?: string
): Promise<ApiResponse<T>> {
  try {
    const formData = new FormData()
    formData.append('action', action)
    
    if (token) {
      formData.append('token', token)
    }
    
    // Pour les donnees complexes, on les met dans payload
    if (Object.keys(data).length > 0) {
      formData.append('payload', JSON.stringify(data))
    }

    const response = await fetch(APPSCRIPT_URL, {
      method: "POST",
      body: formData,
    })

    const result = await response.json()
    return result as ApiResponse<T>
  } catch (error) {
    console.error("[v0] Erreur API:", error)
    return { success: false, error: "Erreur de connexion au serveur" }
  }
}

// Fonction pour les requetes GET (getProfileData)
export async function callAppScriptGet<T = unknown>(
  action: string,
  params: Record<string, string> = {}
): Promise<T> {
  try {
    const url = new URL(APPSCRIPT_URL)
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
    callAppScript("saveProfileImage", data, token),
  
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
}
