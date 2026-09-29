import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/contexts/auth-context'
import { PwaRegister } from '@/components/pwa-register'
import { InstallPrompt } from '@/components/install-prompt'
import { PUBLIC_PROFILE_URL } from '@/lib/site'
import './globals.css'

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL(PUBLIC_PROFILE_URL),
  title: 'Mahu - Votre Carte de Visite Numérique',
  description: 'Créez et partagez votre carte de visite numérique NFC, moderne et écologique. Gérez vos contacts et analysez vos performances.',
  keywords: 'carte de visite numérique, carte de visite NFC, networking, Mahu, carte de visite connectée, profil numérique, gestion de contacts',
  authors: [{ name: 'Mahu' }],
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    title: 'Mahu - Votre Carte de Visite Numérique',
    description: 'Créez et partagez votre carte de visite numérique NFC, moderne et écologique.',
    siteName: 'Mahu',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Mahu' }],
  },
  // favicon.ico est servi par app/favicon.ico ; icones d'app dans public/icons.
  icons: {
    icon: [{ url: '/icons/favicon-64.png', sizes: '64x64', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  appleWebApp: { capable: true, title: 'Mahu', statusBarStyle: 'black-translucent' },
  twitter: {
    card: 'summary_large_image',
    title: 'Mahu - Votre Carte de Visite Numérique',
    description: 'Créez et partagez votre carte de visite numérique NFC, moderne et écologique.',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a0a0a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <PwaRegister />
        <InstallPrompt />
      </body>
    </html>
  )
}
