import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// L'espace admin (/admin/*) n'est joignable QUE via ce sous-domaine dedie -
// sur tout autre domaine (ai.mahu.cards, previews, etc.) ces routes renvoient
// un simple 404, comme si elles n'existaient pas. Meme deploiement Next.js,
// juste un deuxieme enregistrement DNS (CNAME/A) pointant vers le meme
// serveur - voir la note de deploiement donnee a l'utilisateur.
const ADMIN_HOST = "fea5773d6a.mahu.cards"

function isDevHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".local")
}

export function middleware(request: NextRequest) {
  const hostname = request.nextUrl.hostname
  const { pathname } = request.nextUrl

  // En local (npm run dev), pas de sous-domaine dedie disponible : /admin
  // reste accessible normalement pour pouvoir developper/tester.
  if (isDevHost(hostname)) {
    return NextResponse.next()
  }

  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/")
  const isInternal =
    pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname === "/favicon.ico"

  if (hostname === ADMIN_HOST) {
    if (isInternal) return NextResponse.next()
    if (!isAdminPath) {
      return NextResponse.redirect(new URL("/admin/login", request.url))
    }
    return NextResponse.next()
  }

  // Sur tout autre domaine, l'espace admin n'existe pas.
  if (isAdminPath) {
    return new NextResponse("Not found", { status: 404 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
}
