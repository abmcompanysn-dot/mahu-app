"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

interface SocialLoginButtonsProps {
  onSuccess: (newUser?: boolean) => void
  onError: (message: string) => void
}

export function SocialLoginButtons({ onSuccess, onError }: SocialLoginButtonsProps) {
  const { socialLogin } = useAuth()
  const [loadingProvider, setLoadingProvider] = useState<"google" | "facebook" | null>(null)

  const handleClick = async (provider: "google" | "facebook") => {
    setLoadingProvider(provider)
    const result = await socialLogin(provider)
    setLoadingProvider(null)

    if (result.success) {
      onSuccess(result.newUser)
    } else {
      onError(result.error || "Erreur de connexion")
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => handleClick("google")}
        disabled={loadingProvider !== null}
        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-muted/30 border border-border/50 text-foreground hover:bg-muted/50 transition-colors disabled:opacity-60"
      >
        {loadingProvider === "google" ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
            <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29A11.96 11.96 0 0 0 0 12c0 1.94.46 3.77 1.29 5.38l3.98-3.09z" />
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
          </svg>
        )}
        <span className="text-sm font-medium">Google</span>
      </button>

      <button
        type="button"
        onClick={() => handleClick("facebook")}
        disabled={loadingProvider !== null}
        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-muted/30 border border-border/50 text-foreground hover:bg-muted/50 transition-colors disabled:opacity-60"
      >
        {loadingProvider === "facebook" ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
            <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
          </svg>
        )}
        <span className="text-sm font-medium">Facebook</span>
      </button>
    </div>
  )
}
