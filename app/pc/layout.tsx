import { Suspense } from "react"

// Ecran personnel ouvert par la carte : rien a indexer.
export const metadata = {
  title: "Mon ordinateur - Mahu",
  robots: { index: false, follow: false },
}

export default function PcLayout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>
}
