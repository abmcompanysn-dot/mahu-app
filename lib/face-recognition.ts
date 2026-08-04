// Charge face-api.js et calcule les descripteurs de visage uniquement cote
// client (jamais au chargement du module - voir lib/firebase.ts pour la meme
// regle appliquee a Firebase). Le visage brut ne quitte jamais le navigateur,
// seul le descripteur (128 nombres) est envoye au backend.
//
// Les poids sont auto-heberges dans public/models (recuperes depuis le repo
// officiel justadudewhohacks/face-api.js) plutot que charges depuis un CDN
// tiers : un fork comme @vladmandic/face-api publie des manifests au format
// legerement different, que cette version de face-api.js charge sans erreur
// mais interprete mal - resultat, aucun visage n'est jamais detecte.
const MODELS_URL = "/models"

let modelsLoaded = false

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return
  const faceapi = await import("face-api.js")
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
  ])
  modelsLoaded = true
}

export async function captureFaceDescriptor(videoEl: HTMLVideoElement): Promise<number[] | null> {
  const faceapi = await import("face-api.js")
  await loadFaceModels()

  const detection = await faceapi
    .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor()

  if (!detection) return null
  return Array.from(detection.descriptor)
}

export async function openCamera(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
}

export function stopCamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop())
}
