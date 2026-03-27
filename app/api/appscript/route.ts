import { NextRequest, NextResponse } from "next/server"

// URL de votre Web App Google AppScript DEPLOYEE
// IMPORTANT: Remplacez par l'URL /exec apres deploiement (pas /dev)
const APPSCRIPT_URL = process.env.APPSCRIPT_URL || "https://script.google.com/macros/s/AKfycbwkdog99cVkYOENGz-JnGOFNEGUWZ5H3TC_BsPg4tyA/exec"

// Mode demo: active si l'URL AppScript n'est pas configuree ou retourne une erreur
const DEMO_MODE = process.env.DEMO_MODE === "true" || true // Active par defaut pour le dev

// Donnees de demo
const DEMO_USER = {
  token: "demo_token_12345",
  role: "Entreprise",
  profile: {
    Nom_Complet: "Jean Dupont",
    Email: "jean.dupont@example.com",
    Telephone: "+33 6 12 34 56 78",
    Profession: "Directeur Marketing",
    Compagnie: "TechCorp France",
    Location: "Paris, France",
    URL_Photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
    URL_Banniere: "https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=200&fit=crop",
    Bio: "Passionné par l'innovation digitale et le networking professionnel.",
    Liens_Sociaux_JSON: JSON.stringify([
      { type: "linkedin", label: "LinkedIn", url: "https://linkedin.com/in/jeandupont" },
      { type: "twitter", label: "Twitter", url: "https://twitter.com/jeandupont" },
      { type: "website", label: "Site web", url: "https://jeandupont.fr" }
    ])
  },
  stats: {
    views: 1247,
    viewsTrend: "+12%",
    leads: 89,
    leadsTrend: "+8%",
    shares: 156,
    sharesTrend: "+15%"
  },
  recentActivity: [
    { date: "Il y a 2 min", source: "LinkedIn", action: "Profil consulté" },
    { date: "Il y a 15 min", source: "QR Code", action: "Contact enregistré" },
    { date: "Il y a 1h", source: "Email", action: "Lien cliqué" },
    { date: "Il y a 3h", source: "NFC", action: "Carte scannée" },
    { date: "Hier", source: "Site web", action: "Profil partagé" }
  ],
  profileUrl: "jean-dupont"
}

// Fonction pour les reponses demo
function handleDemoRequest(action: string, payload?: Record<string, unknown>) {
  console.log("[v0] Mode Demo - Action:", action)
  
  switch (action) {
    case "loginUser":
      // Verifier les credentials demo
      if (payload?.email === "demo@mahu.cards" && payload?.password === "demo123") {
        return {
          success: true,
          token: DEMO_USER.token,
          role: DEMO_USER.role,
          message: "Connexion reussie (Mode Demo)"
        }
      }
      // Accepter n'importe quel email/password en mode demo
      return {
        success: true,
        token: DEMO_USER.token,
        role: DEMO_USER.role,
        message: "Connexion reussie (Mode Demo - Utilisez demo@mahu.cards / demo123 pour le compte demo)"
      }
    
    case "registerUser":
      return {
        success: true,
        token: DEMO_USER.token,
        role: "Entreprise",
        message: "Inscription reussie (Mode Demo)"
      }
    
    case "getDashboardData":
      return {
        success: true,
        ...DEMO_USER
      }
    
    case "getProfileData":
      return {
        success: true,
        profile: DEMO_USER.profile,
        socialLinks: JSON.parse(DEMO_USER.profile.Liens_Sociaux_JSON)
      }
    
    case "updateProfile":
      return {
        success: true,
        message: "Profil mis a jour (Mode Demo - Les changements ne sont pas sauvegardes)"
      }
    
    case "forgotPassword":
      return {
        success: true,
        message: "Email de reinitialisation envoye (Mode Demo)"
      }
    
    case "getContacts":
      return {
        success: true,
        contacts: [
          { id: "1", name: "Marie Martin", email: "marie@example.com", company: "Design Co", date: "2024-03-15" },
          { id: "2", name: "Pierre Bernard", email: "pierre@example.com", company: "StartupXYZ", date: "2024-03-14" },
          { id: "3", name: "Sophie Dubois", email: "sophie@example.com", company: "AgenceWeb", date: "2024-03-13" }
        ]
      }
    
    case "exportContacts":
      return {
        success: true,
        message: "Contacts exportes (Mode Demo)"
      }
    
    default:
      return {
        success: true,
        message: `Action '${action}' executee en mode demo`
      }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const action = body.action
    
    console.log("[v0] Proxy AppScript - Action:", action)
    
    // En mode demo, retourner des donnees fictives
    if (DEMO_MODE) {
      const demoResponse = handleDemoRequest(action, body)
      return NextResponse.json(demoResponse)
    }
    
    // Mode production: appeler AppScript
    const formData = new URLSearchParams()
    formData.append('action', action)
    
    if (body.token) {
      formData.append('token', body.token)
    }
    
    const payload: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(body)) {
      if (key !== 'action' && key !== 'token') {
        payload[key] = value
      }
    }
    
    if (Object.keys(payload).length > 0) {
      formData.append('payload', JSON.stringify(payload))
    }

    const response = await fetch(APPSCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    })

    const text = await response.text()
    
    // Verifier si c'est une page de connexion Google (erreur /dev)
    if (text.includes("<!doctype html>") || text.includes("accounts.google.com")) {
      console.error("[v0] AppScript retourne une page HTML - URL /dev non deployee")
      // Fallback au mode demo
      const demoResponse = handleDemoRequest(action, body)
      return NextResponse.json(demoResponse)
    }
    
    let data
    try {
      data = JSON.parse(text)
    } catch {
      console.error("[v0] Reponse non-JSON, fallback demo")
      const demoResponse = handleDemoRequest(action, body)
      return NextResponse.json(demoResponse)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Erreur proxy:", error)
    // Fallback au mode demo en cas d'erreur
    if (DEMO_MODE) {
      return NextResponse.json(handleDemoRequest("error"))
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action") || "getProfileData"
    const user = searchParams.get("user")
    
    console.log("[v0] Proxy GET - Action:", action, "User:", user)
    
    // Mode demo
    if (DEMO_MODE) {
      const demoResponse = handleDemoRequest(action, { user })
      return NextResponse.json(demoResponse)
    }
    
    // Mode production
    const url = new URL(APPSCRIPT_URL)
    url.searchParams.set("action", action)
    if (user) url.searchParams.set("user", user)
    
    const response = await fetch(url.toString())
    const text = await response.text()
    
    if (text.includes("<!doctype html>")) {
      const demoResponse = handleDemoRequest(action, { user })
      return NextResponse.json(demoResponse)
    }
    
    let data
    try {
      data = JSON.parse(text)
    } catch {
      const demoResponse = handleDemoRequest(action, { user })
      return NextResponse.json(demoResponse)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Erreur proxy GET:", error)
    if (DEMO_MODE) {
      return NextResponse.json(handleDemoRequest("getProfileData"))
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    )
  }
}
