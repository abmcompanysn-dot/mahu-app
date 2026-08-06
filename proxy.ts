import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// L'espace admin (/admin/*) n'est joignable QUE via ce sous-domaine dedie -
// sur tout autre domaine (ai.mahu.cards, previews, etc.) ces routes renvoient
// un simple 404, comme si elles n'existaient pas. Meme deploiement Next.js,
// juste un deuxieme enregistrement DNS (CNAME/A) pointant vers le meme
// serveur - voir la note de deploiement donnee a l'utilisateur.
const ADMIN_HOST = "mahu.mahu.cards"

// Sur ai.mahu.cards, le mode IA est l'experience d'accueil : la racine ("/")
// affiche directement /ai, mais le reste du site (dashboard, profils publics,
// pages legales) reste joignable normalement sur ce meme sous-domaine.
const AI_HOST = "ai.mahu.cards"

function isDevHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".local")
}

export function proxy(request: NextRequest) {
  // request.nextUrl.hostname is unreliable when self-hosted behind a
  // reverse proxy (Caddy/Cloudflare Tunnel here) - it reflects the address
  // Next.js's own server is bound to, not the client's Host header. Read
  // the real Host header directly instead (strip the port, if any).
  const hostname = (request.headers.get("host") || request.nextUrl.hostname).split(":")[0]
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
      // Built from the known-good external host, not request.url (which
      // carries the same unreliable localhost-based origin as nextUrl).
      return NextResponse.redirect(new URL("/admin/login", `https://${ADMIN_HOST}`))
    }
    return NextResponse.next()
  }

  // Sur tout autre domaine, l'espace admin n'existe pas.
  if (isAdminPath) {
    return new NextResponse("Not found", { status: 404 })
  }

  if (hostname === AI_HOST && pathname === "/") {
    // A redirect, not a rewrite: self-hosted Next.js serves the statically
    // cached "/" HTML regardless of an x-middleware-rewrite target when both
    // routes are fully static (confirmed via x-nextjs-cache: HIT even with
    // the rewrite header present) - a real client round-trip avoids that.
    return NextResponse.redirect(new URL("/ai", `https://${AI_HOST}`))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
}
