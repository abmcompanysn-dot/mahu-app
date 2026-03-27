// Configuration pour Google AppScript
// IMPORTANT: Remplacez cette URL par l'URL de votre Web App Google AppScript
export const APPSCRIPT_URL = process.env.NEXT_PUBLIC_APPSCRIPT_URL || ""

// Types pour l'API
export interface User {
  id: string
  email: string
  name: string
  phone?: string
  company?: string
  title?: string
  bio?: string
  avatar?: string
  socialLinks?: SocialLink[]
  createdAt?: string
}

export interface SocialLink {
  platform: string
  url: string
  icon?: string
}

export interface Contact {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  source: string
  createdAt: string
  notes?: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
  error?: string
}

// Fonction helper pour appeler l'API AppScript
export async function callAppScript<T = unknown>(
  action: string,
  data: Record<string, unknown> = {}
): Promise<ApiResponse<T>> {
  if (!APPSCRIPT_URL) {
    console.warn("[v0] APPSCRIPT_URL non configure - mode demo")
    return { success: false, error: "API non configuree" }
  }

  try {
    const response = await fetch(APPSCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        ...data,
      }),
    })

    const result = await response.json()
    return result as ApiResponse<T>
  } catch (error) {
    console.error("[v0] Erreur API:", error)
    return { success: false, error: "Erreur de connexion" }
  }
}

// API Functions
export const api = {
  // Auth
  login: (email: string, password: string) =>
    callAppScript<{ user: User; token: string }>("login", { email, password }),
  
  register: (name: string, email: string, password: string) =>
    callAppScript<{ user: User }>("register", { name, email, password }),
  
  logout: () => callAppScript("logout"),
  
  // Profile
  getProfile: (userId: string) =>
    callAppScript<User>("getProfile", { userId }),
  
  updateProfile: (userId: string, data: Partial<User>) =>
    callAppScript<User>("updateProfile", { userId, ...data }),
  
  uploadAvatar: (userId: string, imageBase64: string) =>
    callAppScript<{ avatarUrl: string }>("uploadAvatar", { userId, imageBase64 }),
  
  // Contacts
  getContacts: (userId: string) =>
    callAppScript<Contact[]>("getContacts", { userId }),
  
  addContact: (userId: string, contact: Omit<Contact, "id" | "createdAt">) =>
    callAppScript<Contact>("addContact", { userId, ...contact }),
  
  deleteContact: (userId: string, contactId: string) =>
    callAppScript("deleteContact", { userId, contactId }),
  
  exportContacts: (userId: string, format: "csv" | "vcf") =>
    callAppScript<{ downloadUrl: string }>("exportContacts", { userId, format }),
  
  // Analytics
  getStats: (userId: string) =>
    callAppScript<{
      views: number
      shares: number
      contacts: number
      viewsChange: number
      sharesChange: number
      contactsChange: number
    }>("getStats", { userId }),
  
  trackView: (profileId: string) =>
    callAppScript("trackView", { profileId }),
  
  trackShare: (profileId: string, platform: string) =>
    callAppScript("trackShare", { profileId, platform }),
}
