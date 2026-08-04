import { initializeApp, getApps, type FirebaseApp, type FirebaseOptions } from "firebase/app"
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  type Auth,
  type UserCredential,
} from "firebase/auth"

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
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
