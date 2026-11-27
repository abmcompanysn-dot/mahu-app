// Configuration Cloudinary
const CLOUDINARY_CLOUD_NAME = 'dl3cdiz6k'
const CLOUDINARY_UPLOAD_PRESET = 'mahucards'

export interface CloudinaryUploadResult {
  success: boolean
  url?: string
  error?: string
}

// Jeton de la personne connectee : admin sur /admin, client ailleurs.
function currentToken(): string | null {
  if (typeof window === 'undefined') return null
  const admin = window.location.pathname.startsWith('/admin') ? localStorage.getItem('mahu_admin_token') : null
  return admin || localStorage.getItem('mahu_token')
}

// Champs a joindre au fichier. Le serveur signe l'envoi pour une personne
// connectee (le preset Cloudinary peut alors refuser les envois anonymes).
// Tant que le secret Cloudinary n'est pas configure cote serveur, on envoie
// comme avant avec le preset non signe.
async function uploadFields(): Promise<Record<string, string>> {
  const token = currentToken()
  if (token) {
    try {
      const res = await fetch('/api/appscript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getUploadSignature', token }),
      })
      const data = await res.json()
      if (data?.signed && data.params) return data.params as Record<string, string>
    } catch {
      // repli sur le preset non signe ci-dessous
    }
  }
  return { upload_preset: CLOUDINARY_UPLOAD_PRESET }
}

async function upload(kind: 'image' | 'video', file: File | string): Promise<CloudinaryUploadResult> {
  try {
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${kind}/upload`

    const formData = new FormData()
    formData.append('file', file)
    for (const [key, value] of Object.entries(await uploadFields())) {
      formData.append(key, value)
    }

    const response = await fetch(url, {
      method: 'POST',
      body: formData
    })

    const result = await response.json()

    if (result.secure_url) {
      return {
        success: true,
        url: result.secure_url
      }
    }
    return {
      success: false,
      error: result.error?.message || 'Erreur lors de l\'upload'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur de connexion'
    }
  }
}

/**
 * Upload une image vers Cloudinary
 * @param file - Le fichier image a uploader
 * @returns L'URL securisee de l'image uploadee
 */
export async function uploadToCloudinary(file: File): Promise<CloudinaryUploadResult> {
  return upload('image', file)
}

/**
 * Upload une video vers Cloudinary (pour publication multi-reseaux - voir
 * connectors-api.ts publishVideo).
 * @param file - Le fichier video a uploader
 * @returns L'URL securisee de la video uploadee
 */
export async function uploadVideoToCloudinary(file: File): Promise<CloudinaryUploadResult> {
  return upload('video', file)
}

/**
 * Upload une image en base64 vers Cloudinary
 * @param base64 - L'image en base64 (avec ou sans prefix data:image)
 * @returns L'URL securisee de l'image uploadee
 */
export async function uploadBase64ToCloudinary(base64: string): Promise<CloudinaryUploadResult> {
  return upload('image', base64)
}
