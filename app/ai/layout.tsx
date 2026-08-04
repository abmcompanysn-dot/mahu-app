export default function AiLayout({ children }: { children: React.ReactNode }) {
  // Volontairement hors de app/dashboard/layout.tsx : AI MAHU est une
  // experience plein ecran independante (style ChatGPT/Claude/Gemini),
  // pas une page parmi d'autres dans le dashboard carte de visite.
  return <div className="h-screen w-screen overflow-hidden bg-background">{children}</div>
}
