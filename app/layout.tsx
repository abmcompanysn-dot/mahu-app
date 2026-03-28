import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import Script from 'next/script'
import { AuthProvider } from '@/contexts/auth-context'
import './globals.css'

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Mahu - Votre Carte de Visite Numérique',
  description: 'Créez et partagez votre carte de visite numérique NFC, moderne et écologique. Gérez vos contacts et analysez vos performances.',
  keywords: 'carte de visite numérique, carte de visite NFC, networking, Mahu, carte de visite connectée, profil numérique, gestion de contacts',
  authors: [{ name: 'Mahu' }],
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://mahu.cards/',
    title: 'Mahu - Votre Carte de Visite Numérique',
    description: 'Créez et partagez votre carte de visite numérique NFC, moderne et écologique.',
    siteName: 'Mahu',
  },
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
        <Script
          id="theme-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'light') {
                    document.documentElement.classList.remove('dark');
                  } else {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <AuthProvider>
          {children}
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
