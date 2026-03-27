import { NextRequest, NextResponse } from "next/server"

// URL de votre Web App Google AppScript
// Note: Utilisez l'URL /exec (deploye) au lieu de /dev pour la production
const APPSCRIPT_URL = process.env.APPSCRIPT_URL || "https://script.google.com/macros/s/AKfycbwkdog99cVkYOENGz-JnGOFNEGUWZ5H3TC_BsPg4tyA/exec"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log("[v0] Proxy AppScript - Action:", body.action)
    
    const response = await fetch(APPSCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    // Google AppScript peut retourner du texte ou du JSON
    const text = await response.text()
    
    console.log("[v0] Reponse AppScript brute:", text.substring(0, 200))
    
    let data
    try {
      data = JSON.parse(text)
    } catch {
      // Si ce n'est pas du JSON, retourner le texte comme erreur
      console.error("[v0] Reponse non-JSON:", text)
      return NextResponse.json(
        { success: false, error: "Reponse invalide du serveur", raw: text },
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
    const username = searchParams.get("username")
    
    console.log("[v0] Proxy AppScript GET - Action:", action, "Username:", username)
    
    // Construire l'URL avec les parametres
    const url = new URL(APPSCRIPT_URL)
    if (action) url.searchParams.set("action", action)
    if (username) url.searchParams.set("username", username)
    
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    const text = await response.text()
    
    console.log("[v0] Reponse AppScript GET brute:", text.substring(0, 200))
    
    let data
    try {
      data = JSON.parse(text)
    } catch {
      console.error("[v0] Reponse GET non-JSON:", text)
      return NextResponse.json(
        { success: false, error: "Reponse invalide du serveur", raw: text },
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
