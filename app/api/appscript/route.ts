import { NextRequest, NextResponse } from "next/server"

// URL de votre Web App Google AppScript
// Note: Utilisez l'URL /exec (deploye) au lieu de /dev pour la production
const APPSCRIPT_URL = process.env.APPSCRIPT_URL || "https://script.google.com/macros/s/AKfycbwkdog99cVkYOENGz-JnGOFNEGUWZ5H3TC_BsPg4tyA/exec"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log("[v0] Proxy AppScript - Action:", body.action, "Body:", JSON.stringify(body))
    
    // AppScript attend les donnees via e.parameter, donc on utilise URLSearchParams
    // pour envoyer les donnees comme form data
    const formData = new URLSearchParams()
    formData.append('action', body.action)
    
    if (body.token) {
      formData.append('token', body.token)
    }
    
    // Les autres donnees vont dans payload en JSON
    const payload: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(body)) {
      if (key !== 'action' && key !== 'token') {
        payload[key] = value
      }
    }
    
    if (Object.keys(payload).length > 0) {
      formData.append('payload', JSON.stringify(payload))
    }

    console.log("[v0] FormData envoyé:", formData.toString())

    const response = await fetch(APPSCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    })

    // Google AppScript peut retourner du texte ou du JSON
    const text = await response.text()
    
    console.log("[v0] Reponse AppScript brute:", text.substring(0, 500))
    
    let data
    try {
      data = JSON.parse(text)
    } catch {
      // Si ce n'est pas du JSON, retourner le texte comme erreur
      console.error("[v0] Reponse non-JSON:", text)
      return NextResponse.json(
        { success: false, error: "Reponse invalide du serveur", raw: text.substring(0, 200) },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Erreur proxy AppScript:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")
    const user = searchParams.get("user") // AppScript utilise 'user' pour getProfileData
    
    console.log("[v0] Proxy AppScript GET - Action:", action, "User:", user)
    
    // Construire l'URL avec les parametres
    const url = new URL(APPSCRIPT_URL)
    if (action) url.searchParams.set("action", action)
    if (user) url.searchParams.set("user", user)
    
    // Copier tous les autres parametres
    searchParams.forEach((value, key) => {
      if (key !== 'action' && key !== 'user') {
        url.searchParams.set(key, value)
      }
    })
    
    console.log("[v0] URL GET:", url.toString())
    
    const response = await fetch(url.toString(), {
      method: "GET",
    })

    const text = await response.text()
    
    console.log("[v0] Reponse AppScript GET brute:", text.substring(0, 500))
    
    let data
    try {
      data = JSON.parse(text)
    } catch {
      console.error("[v0] Reponse GET non-JSON:", text)
      return NextResponse.json(
        { success: false, error: "Reponse invalide du serveur", raw: text.substring(0, 200) },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Erreur proxy AppScript GET:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    )
  }
}
