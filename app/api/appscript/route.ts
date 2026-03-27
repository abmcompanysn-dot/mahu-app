import { NextRequest, NextResponse } from "next/server"

// URL de votre Web App Google AppScript DEPLOYEE
const APPSCRIPT_URL = "https://script.google.com/macros/s/AKfycbzUcADa5RmJRqTk4rWO1Hw6dXLanAly1iWM-iA2CyTNJRETDVecAp32hEXi-pl-isWJew/exec"

// Mode demo desactive - utilise le vrai backend AppScript
const DEMO_MODE = false

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const action = body.action
    

    
    // Construire les parametres pour AppScript
    // AppScript attend les donnees dans e.parameter, donc on utilise URLSearchParams
    const formData = new URLSearchParams()
    formData.append('action', action)
    
    // Ajouter le token si present
    if (body.token) {
      formData.append('token', body.token)
    }
    
    // Construire le payload avec toutes les autres donnees
    const payload: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(body)) {
      if (key !== 'action' && key !== 'token') {
        payload[key] = value
      }
    }
    
    // Ajouter le payload en JSON si non vide
    if (Object.keys(payload).length > 0) {
      formData.append('payload', JSON.stringify(payload))
    }



    const response = await fetch(APPSCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
      redirect: "follow", // Important pour suivre les redirections Google
    })

    const text = await response.text()
    
    // Verifier si c'est une page de connexion Google (erreur)
    if (text.includes("<!doctype html>") || text.includes("accounts.google.com") || text.includes("<!DOCTYPE html>")) {
  
      return NextResponse.json({
        success: false,
        error: "Le serveur AppScript n'est pas accessible. Verifiez que le script est deploye correctement.",
        debug: text.substring(0, 200)
      })
    }
    
    // Parser la reponse JSON
    let data
    try {
      data = JSON.parse(text)
    } catch (parseError) {

      return NextResponse.json({
        success: false,
        error: "Reponse invalide du serveur",
        raw: text.substring(0, 200)
      })
    }

    return NextResponse.json(data)
  } catch (error) {

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
    

    
    // Construire l'URL avec les parametres
    const url = new URL(APPSCRIPT_URL)
    url.searchParams.set("action", action)
    if (user) url.searchParams.set("user", user)
    
    // Copier tous les autres parametres
    searchParams.forEach((value, key) => {
      if (key !== "action" && key !== "user") {
        url.searchParams.set(key, value)
      }
    })
    

    
    const response = await fetch(url.toString(), {
      method: "GET",
      redirect: "follow",
    })
    
    const text = await response.text()
    
    if (text.includes("<!doctype html>") || text.includes("<!DOCTYPE html>")) {
      return NextResponse.json({
        success: false,
        error: "Le serveur AppScript n'est pas accessible",
        debug: text.substring(0, 200)
      })
    }
    
    let data
    try {
      data = JSON.parse(text)
    } catch {
      return NextResponse.json({
        success: false,
        error: "Reponse invalide du serveur",
        raw: text.substring(0, 200)
      })
    }

    return NextResponse.json(data)
  } catch (error) {

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    )
  }
}
