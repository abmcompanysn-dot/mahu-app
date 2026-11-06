import type { Metadata } from "next"
import { GuideView } from "./guide-view"

export const metadata: Metadata = {
  title: "Guide MAHU : NFC, QR code et documents",
  description:
    "Quel téléphone lit la carte MAHU, comment activer le NFC sur iPhone et Android, scanner le QR code, et tous nos guides, catalogue et fiches à télécharger.",
}

export default function GuidePage() {
  return <GuideView />
}
