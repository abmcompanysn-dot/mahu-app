import { Sparkles } from "lucide-react"

interface AiLogoProps {
  // true = halo anime en continu (ex: page carte, section marketing).
  // false = logo statique (l'appelant decide quand basculer, ex: pendant
  // qu'AI MAHU genere une reponse dans le chat).
  animated?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

const SIZE_CLASSES: Record<NonNullable<AiLogoProps["size"]>, string> = {
  sm: "w-8 h-8",
  md: "w-14 h-14",
  lg: "w-20 h-20",
}

const ICON_SIZE_CLASSES: Record<NonNullable<AiLogoProps["size"]>, string> = {
  sm: "w-4 h-4",
  md: "w-7 h-7",
  lg: "w-10 h-10",
}

export function AiLogo({ animated = false, size = "md", className = "" }: AiLogoProps) {
  return (
    <div
      className={`rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0 ${SIZE_CLASSES[size]} ${animated ? "ai-thinking" : ""} ${className}`}
    >
      <Sparkles className={`${ICON_SIZE_CLASSES[size]} text-primary`} />
    </div>
  )
}
