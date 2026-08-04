#!/usr/bin/env node
// Outil de dev : teste l'enrollement/la verification biometrique a partir
// d'un fichier photo au lieu d'une webcam - pratique pour verifier que le
// pipeline face-api.js + backend fonctionne sans repasser par le navigateur.
// Ne fait pas partie de l'app en production (necessite `canvas`, devDependency).
//
// Usage :
//   node scripts/face-photo-cli.js enroll <cheminPhoto> <jwtToken>
//   node scripts/face-photo-cli.js verify <cheminPhoto> <cardCode>
//
// Variable optionnelle : API_BASE (defaut http://localhost:3000/api/backend)
const path = require("path")
const faceapi = require("face-api.js")
const { Canvas, Image, ImageData, loadImage } = require("canvas")

faceapi.env.monkeyPatch({ Canvas, Image, ImageData })

const MODELS_DIR = path.join(__dirname, "..", "public", "models")
const API_BASE = process.env.API_BASE || "http://localhost:3000/api/backend"

async function getDescriptor(imagePath) {
  await faceapi.nets.tinyFaceDetector.loadFromDisk(MODELS_DIR)
  await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_DIR)
  await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_DIR)

  const img = await loadImage(imagePath)
  const detection = await faceapi
    .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor()

  if (!detection) {
    throw new Error(`Aucun visage detecte dans ${imagePath}`)
  }
  return Array.from(detection.descriptor)
}

function printUsage() {
  console.error("Usage:")
  console.error("  node scripts/face-photo-cli.js enroll <cheminPhoto> <jwtToken>")
  console.error("  node scripts/face-photo-cli.js verify <cheminPhoto> <cardCode>")
}

async function main() {
  const [, , mode, imagePath, arg] = process.argv
  if (!mode || !imagePath || !arg || !["enroll", "verify"].includes(mode)) {
    printUsage()
    process.exit(1)
  }

  const descriptor = await getDescriptor(imagePath)
  console.log(`Visage detecte (${descriptor.length} valeurs).`)

  const url = mode === "enroll" ? `${API_BASE}/api/ai/card/enroll-face` : `${API_BASE}/api/auth/face-verify`

  const headers = { "Content-Type": "application/json" }
  if (mode === "enroll") headers.Authorization = `Bearer ${arg}`

  const body = mode === "enroll" ? { descriptor } : { cardCode: arg, descriptor }

  const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) })
  const data = await response.json()
  console.log(`HTTP ${response.status}:`, data)
}

main().catch((err) => {
  console.error("ERREUR:", err.message)
  process.exit(1)
})
