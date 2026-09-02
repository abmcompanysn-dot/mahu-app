import { initializeApp, getApps, type FirebaseApp, type FirebaseOptions } from "firebase/app"
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  type Auth,
  type UserCredential,
} from "firebase/auth"

// Valeurs de repli codees en dur (identiques a celles du dashboard Firebase
// du projet mahu-2026) - ces cles sont publiques par design (voir
// .env.example), donc aucun risque a les committer. Sert de filet de
// securite : sur Cloudflare Workers Builds, les NEXT_PUBLIC_* doivent etre
// injectees a la fois dans "Runtime variables and secrets" ET "Build
// variables and secrets" (deux sections distinctes de Settings) pour etre
// inlinees dans le bundle client - un oubli de l'une des deux fait planter
// l'appli avec auth/invalid-api-key sans que le code source soit en cause.
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBNv1pkcRmVGSG3hsTBDiFOQL_HBYfibE0",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "mahu-2026.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mahu-2026",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "mahu-2026.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "920266508704",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:920266508704:web:79ea14f780845286313cc5",
}

// Initialise a la demande plutot qu'au chargement du module : un projet sans
// cles Firebase configurees ne doit pas faire planter tout le reste de l'app
// (voir contexts/auth-context.tsx, importe depuis le layout racine).
let firebaseApp: FirebaseApp | null = null
let firebaseAuthInstance: Auth | null = null

function getFirebaseAuth(): Auth {
  if (!firebaseAuthInstance) {
    firebaseApp = getApps()[0] ?? initializeApp(firebaseConfig)
    firebaseAuthInstance = getAuth(firebaseApp)
  }
  return firebaseAuthInstance
}

export async function signInWithGooglePopup(): Promise<UserCredential> {
  return signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider())
}

export async function signInWithFacebookPopup(): Promise<UserCredential> {
  return signInWithPopup(getFirebaseAuth(), new FacebookAuthProvider())
}
