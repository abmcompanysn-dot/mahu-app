import { NextRequest, NextResponse } from "next/server"

// Ce proxy pointait auparavant directement sur le Web App Google Apps
// Script. Toute la logique metier a ete migree vers le backend Go/Mongo
// (voir backend/internal/handlers/legacy_*.go) qui expose la meme action
// "action + token + payload" sur /api/legacy - lib/api.ts n'a donc besoin
// d'aucun changement, seul ce fichier a change de destination.
const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:4000"
const SERVICE_API_KEY = process.env.BACKEND_API_KEY || ""

export async function POST(request: NextRequest) {
  if (!SERVICE_API_KEY) {
    return NextResponse.json(
      { success: false, error: "BACKEND_API_KEY n'est pas configure sur le serveur Next.js" },
      { status: 500 },
    )
  }

  try {
    const body = await request.text()

    const response = await fetch(new URL("/api/legacy", BACKEND_URL), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": SERVICE_API_KEY,
      },
      body,
      cache: "no-store",
    })

    const data = await response.json().catch(() => null)
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Backend injoignable" },
      { status: 502 },
    )
  }
}

export async function GET(request: NextRequest) {
  if (!SERVICE_API_KEY) {
    return NextResponse.json(
      { success: false, error: "BACKEND_API_KEY n'est pas configure sur le serveur Next.js" },
      { status: 500 },
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const url = new URL("/api/legacy", BACKEND_URL)
    searchParams.forEach((value, key) => {
      url.searchParams.set(key, value)
    })

    const response = await fetch(url, {
      method: "GET",
      headers: { "x-api-key": SERVICE_API_KEY },
      cache: "no-store",
    })

    const data = await response.json().catch(() => null)
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Backend injoignable" },
      { status: 502 },
    )
  }
}
