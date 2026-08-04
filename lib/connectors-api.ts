// "Connecteurs Mahu" - integrations qu'un UTILISATEUR connecte lui-meme a
// son propre compte, dans l'esprit des Connectors de Claude (Gmail, Canva,
// ...). Meme proxy /api/backend que le reste (voir app/api/backend/[...path]/route.ts).
const CONNECTORS_BASE_URL = "/api/backend/api/connectors"

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

export interface GmailStatus {
  connected: boolean
  email?: string
}

export const gmailApi = {
  getAuthUrl: (token: string) => request<{ authUrl: string }>(`${CONNECTORS_BASE_URL}/gmail/authorize`, token),

  getStatus: (token: string) => request<GmailStatus>(`${CONNECTORS_BASE_URL}/gmail/status`, token),

  disconnect: (token: string) =>
    request<{ success: boolean }>(`${CONNECTORS_BASE_URL}/gmail/disconnect`, token, { method: "POST" }),

  sendEmail: (token: string, to: string, subject: string, body: string) =>
    request<{ success: boolean }>(`${CONNECTORS_BASE_URL}/gmail/send`, token, {
      method: "POST",
      body: JSON.stringify({ to, subject, body }),
    }),
}

export interface SocialStatus {
  connected: boolean
  name?: string
}

export type SocialProvider = "facebook" | "instagram" | "youtube" | "tiktok" | "linkedin"

export const socialApi = {
  getAuthUrl: (token: string, provider: SocialProvider) =>
    request<{ authUrl: string }>(`${CONNECTORS_BASE_URL}/${provider}/authorize`, token),

  getStatus: (token: string, provider: SocialProvider) =>
    request<SocialStatus>(`${CONNECTORS_BASE_URL}/${provider}/status`, token),

  disconnect: (token: string, provider: SocialProvider) =>
    request<{ success: boolean }>(`${CONNECTORS_BASE_URL}/${provider}/disconnect`, token, { method: "POST" }),

  publishToFacebook: (token: string, message: string) =>
    request<{ success: boolean }>(`${CONNECTORS_BASE_URL}/facebook/publish`, token, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
}

export interface PublishResult {
  success: boolean
  error?: string
}

export const publishApi = {
  // videoUrl doit deja etre hebergee publiquement (voir uploadVideoToCloudinary
  // dans lib/cloudinary.ts) - cet endpoint ne fait que la diffuser aux
  // reseaux connectes demandes, jamais de fichier brut envoye ici.
  publishVideo: (
    token: string,
    videoUrl: string,
    title: string,
    caption: string,
    platforms: SocialProvider[],
  ) =>
    request<{ results: Record<SocialProvider, PublishResult> }>(`${CONNECTORS_BASE_URL}/publish-video`, token, {
      method: "POST",
      body: JSON.stringify({ videoUrl, title, caption, platforms }),
    }),
}
