// lib.dom.d.ts n'inclut pas (encore) les types de la Web Speech API.
// Declarations minimales pour couvrir l'usage de app/ai/page.tsx.
export {}

declare global {
  interface SpeechRecognitionResultItem {
    transcript: string
  }

  interface SpeechRecognitionResult {
    0: SpeechRecognitionResultItem
    isFinal: boolean
  }

  interface SpeechRecognitionEvent extends Event {
    results: ArrayLike<SpeechRecognitionResult>
  }

  interface SpeechRecognition extends EventTarget {
    lang: string
    continuous: boolean
    interimResults: boolean
    start(): void
    stop(): void
    onresult: ((event: SpeechRecognitionEvent) => void) | null
    onerror: ((event: Event) => void) | null
    onend: (() => void) | null
  }

  interface Window {
    SpeechRecognition?: new () => SpeechRecognition
    webkitSpeechRecognition?: new () => SpeechRecognition
  }
}
