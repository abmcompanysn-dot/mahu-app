// Polices des modeles de portfolio (components/portfolio/templates.tsx).
export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link
        rel="stylesheet"
        precedence="default"
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=Fraunces:opsz,wght@9..144,700;9..144,800&family=Sora:wght@600;700;800&family=Space+Mono:wght@400;700&display=swap"
      />
      {children}
    </>
  )
}
