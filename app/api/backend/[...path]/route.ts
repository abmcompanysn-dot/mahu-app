import { NextRequest, NextResponse } from "next/server"

// URL interne du backend Node (VPS) - jamais exposee au navigateur.
const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:4000"
const SERVICE_API_KEY = process.env.BACKEND_API_KEY || ""

async function forward(request: NextRequest, path: string[]) {
  if (!SERVICE_API_KEY) {
    return NextResponse.json(
      { success: false, error: "BACKEND_API_KEY n'est pas configure sur le serveur Next.js" },
      { status: 500 },
    )
  }

  const targetUrl = new URL(`/${path.join("/")}`, BACKEND_URL)
  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value)
  })

  const headers: Record<string, string> = {
    "x-api-key": SERVICE_API_KEY,
  }
  const authHeader = request.headers.get("authorization")
  if (authHeader) headers["authorization"] = authHeader

  const hasBody = !["GET", "HEAD"].includes(request.method)
  if (hasBody) headers["content-type"] = "application/json"

  try {
    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers,
      body: hasBody ? await request.text() : undefined,
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

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await params).path)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await params).path)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await params).path)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await params).path)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await params).path)
}
