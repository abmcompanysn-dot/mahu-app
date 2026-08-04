// Configuration Cloudinary
const CLOUDINARY_CLOUD_NAME = 'dl3cdiz6k'
const CLOUDINARY_UPLOAD_PRESET = 'mahucards'

export interface CloudinaryUploadResult {
  success: boolean
  url?: string
  error?: string
}

/**
 * Upload une image vers Cloudinary
 * @param file - Le fichier image a uploader
 * @returns L'URL securisee de l'image uploadee
 */
export async function uploadToCloudinary(file: File): Promise<CloudinaryUploadResult> {
  try {
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`
    
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

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
    } else {
      return {
        success: false,
        error: result.error?.message || 'Erreur lors de l\'upload'
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur de connexion'
    }
  }
}

/**
 * Upload une video vers Cloudinary (pour publication multi-reseaux - voir
 * connectors-api.ts publishVideo). Suppose que le preset non-signe existant
 * autorise aussi resource_type "video" (a verifier sur le dashboard
 * Cloudinary si l'upload echoue avec une erreur de type de ressource).
 * @param file - Le fichier video a uploader
 * @returns L'URL securisee de la video uploadee
 */
export async function uploadVideoToCloudinary(file: File): Promise<CloudinaryUploadResult> {
  try {
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`

    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

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
    } else {
      return {
        success: false,
        error: result.error?.message || 'Erreur lors de l\'upload'
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur de connexion'
    }
  }
}

/**
 * Upload une image en base64 vers Cloudinary
 * @param base64 - L'image en base64 (avec ou sans prefix data:image)
 * @returns L'URL securisee de l'image uploadee
 */
export async function uploadBase64ToCloudinary(base64: string): Promise<CloudinaryUploadResult> {
  try {
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`
    
    const formData = new FormData()
    formData.append('file', base64)
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

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
    } else {
      return {
        success: false,
        error: result.error?.message || 'Erreur lors de l\'upload'
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur de connexion'
    }
  }
}
