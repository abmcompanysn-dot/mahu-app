"use client"

import { Header } from "@/components/landing/header"
import { Hero } from "@/components/landing/hero"
import { ComputerHero, ComputerModels } from "@/components/landing/computer-hero"
import { PhoneShowcase } from "@/components/landing/phone-showcase"
import { CardShowcase } from "@/components/landing/card-showcase"
import { AiShowcase } from "@/components/landing/ai-showcase"
import { AboutSection } from "@/components/landing/about-section"
import { TechnologySection } from "@/components/landing/technology-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { DashboardDemo } from "@/components/landing/dashboard-demo"
import { GuideSection } from "@/components/landing/guide-section"
import { Footer } from "@/components/landing/footer"
import { SupportModal } from "@/components/landing/support-modal"
import { useState } from "react"

export default function Home() {
  const [supportModalOpen, setSupportModalOpen] = useState(false)

  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      <Header onSupportClick={() => setSupportModalOpen(true)} />
      <ComputerHero />
      <ComputerModels />
      <Hero />
      <PhoneShowcase />
      <CardShowcase />
      <AiShowcase />
      <AboutSection />
      <TechnologySection />
      <FeaturesSection />
      <DashboardDemo />
      <GuideSection />
      <Footer />
      <SupportModal 
        open={supportModalOpen} 
        onOpenChange={setSupportModalOpen} 
      />
    </main>
  )
}
