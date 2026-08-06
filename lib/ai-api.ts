// Client pour le Mode IA (backend Node/Mongo), via le proxy /api/backend deja
// utilise pour les autres routes protegees par JWT (voir app/api/backend/[...path]/route.ts).
const AI_BASE_URL = "/api/backend/api/ai"
const BILLING_BASE_URL = "/api/backend/api/billing"
const AUTH_BASE_URL = "/api/backend/api/auth"

export interface AiConversation {
  _id: string
  title: string
  modelName: string
  createdAt: string
  updatedAt: string
}

export interface AiMessage {
  _id: string
  conversationId: string
  role: "user" | "assistant"
  content: string
  imageDataUrl?: string
  modelName: string
  createdAt: string
}

export interface AiModelsResponse {
  plan: "gratuit" | "premium" | "pro"
  creditBalance: number
  models: string[]
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

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const aiApi = {
  getModels: (token: string) => request<AiModelsResponse>(`${AI_BASE_URL}/models`, token),

  listConversations: (token: string) =>
    request<{ conversations: AiConversation[] }>(`${AI_BASE_URL}/conversations`, token),

  createConversation: (token: string, model: string) =>
    request<{ conversation: AiConversation }>(`${AI_BASE_URL}/conversations`, token, {
      method: "POST",
      body: JSON.stringify({ model }),
    }),

  deleteConversation: (token: string, id: string) =>
    request<void>(`${AI_BASE_URL}/conversations/${id}`, token, { method: "DELETE" }),

  listMessages: (token: string, conversationId: string) =>
    request<{ messages: AiMessage[] }>(`${AI_BASE_URL}/conversations/${conversationId}/messages`, token),

  sendMessage: (token: string, conversationId: string, content: string, imageDataUrl?: string) =>
    request<{ userMessage: AiMessage; assistantMessage: AiMessage; creditBalance: number; modelUsed: string }>(
      `${AI_BASE_URL}/conversations/${conversationId}/messages`,
      token,
      { method: "POST", body: JSON.stringify({ content, imageDataUrl }) },
    ),

  generateImage: (token: string, conversationId: string, prompt: string, provider: "qwen" | "openai" = "qwen") =>
    request<{ userMessage: AiMessage; assistantMessage: AiMessage; creditBalance: number; modelUsed: string }>(
      `${AI_BASE_URL}/conversations/${conversationId}/generate-image`,
      token,
      { method: "POST", body: JSON.stringify({ prompt, provider }) },
    ),

  editImage: (token: string, conversationId: string, prompt: string, imageDataUrl: string) =>
    request<{ userMessage: AiMessage; assistantMessage: AiMessage; creditBalance: number; modelUsed: string }>(
      `${AI_BASE_URL}/conversations/${conversationId}/edit-image`,
      token,
      { method: "POST", body: JSON.stringify({ prompt, imageDataUrl }) },
    ),

  speak: (token: string, text: string) =>
    request<{ audioDataUrl: string; creditBalance: number }>(`${AI_BASE_URL}/speak`, token, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  transcribe: async (token: string, audioBlob: Blob): Promise<{ text: string; creditBalance: number }> => {
    const formData = new FormData()
    formData.append("audio", audioBlob, "recording.webm")
    const response = await fetch(`${AI_BASE_URL}/transcribe`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Erreur inconnue" }))
      throw new Error(error.error || `Erreur ${response.status}`)
    }
    return response.json()
  },

  submitVideo: (token: string, prompt: string) =>
    request<{ jobId: string; status: string; creditBalance: number }>(`${AI_BASE_URL}/video`, token, {
      method: "POST",
      body: JSON.stringify({ prompt }),
    }),

  getVideoJob: (token: string, jobId: string) =>
    request<{ status: string; videoUrl?: string; error?: string }>(`${AI_BASE_URL}/video/${jobId}`, token),

  // Utilitaire generique texte -> vecteur, pas rattache a une fonctionnalite
  // de recherche precise (voir la note dans ai_embed.go cote backend).
  embed: (token: string, text: string) =>
    request<{ embedding: number[]; creditBalance: number }>(`${AI_BASE_URL}/embed`, token, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
}

export const billingApi = {
  checkout: (token: string, plan: "premium" | "pro") =>
    request<{ checkoutUrl: string }>(`${BILLING_BASE_URL}/checkout`, token, {
      method: "POST",
      body: JSON.stringify({ plan }),
    }),

  checkoutPawaPay: (token: string, plan: "premium" | "pro") =>
    request<{ checkoutUrl: string }>(`${BILLING_BASE_URL}/checkout-pawapay`, token, {
      method: "POST",
      body: JSON.stringify({ plan }),
    }),
}

export type CardRedirectMode = "choice" | "profile" | "ai"

export interface BiometricCardInfo {
  cardCode: string
  enabled: boolean
  profileUsername: string
  redirectMode: CardRedirectMode
}

export const cardApi = {
  get: (token: string) => request<BiometricCardInfo>(`${AI_BASE_URL}/card`, token),

  enrollFace: (token: string, descriptor: number[]) =>
    request<BiometricCardInfo>(`${AI_BASE_URL}/card/enroll-face`, token, {
      method: "POST",
      body: JSON.stringify({ descriptor }),
    }),

  disable: (token: string) => request<BiometricCardInfo>(`${AI_BASE_URL}/card/disable`, token, { method: "POST" }),

  updateProfileLink: (token: string, profileUsername: string) =>
    request<BiometricCardInfo>(`${AI_BASE_URL}/card/profile-link`, token, {
      method: "PATCH",
      body: JSON.stringify({ profileUsername }),
    }),

  updateRedirectMode: (token: string, redirectMode: CardRedirectMode) =>
    request<BiometricCardInfo>(`${AI_BASE_URL}/card/redirect-mode`, token, {
      method: "PATCH",
      body: JSON.stringify({ redirectMode }),
    }),
}

// Pas de token : c'est justement ce qui permet d'en obtenir un (voir app/c/[cardCode]/page.tsx).
export async function verifyFace(
  cardCode: string,
  descriptor: number[],
): Promise<{ success: boolean; token?: string; role?: string; error?: string }> {
  const response = await fetch(`${AUTH_BASE_URL}/face-verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cardCode, descriptor }),
  })
  return response.json()
}

// Pas de token non plus : appele depuis app/c/[cardCode]/page.tsx avant toute connexion,
// pour savoir si un bouton "Voir le profil" peut s'afficher et si le proprietaire
// de la carte a choisi de sauter l'ecran de choix.
export async function getCardPublicInfo(
  cardCode: string,
): Promise<{ profileUsername: string | null; redirectMode: CardRedirectMode }> {
  const response = await fetch(`${AUTH_BASE_URL}/card-info/${cardCode}`)
  return response.json()
}
