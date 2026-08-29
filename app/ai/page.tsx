"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import {
  Bot,
  Check,
  Copy,
  CreditCard,
  Download,
  Film,
  FileText,
  ImagePlus,
  Lightbulb,
  Loader2,
  Menu,
  Mic,
  MicOff,
  Music,
  Paperclip,
  Plus,
  ScanFace,
  Search,
  Send,
  Sparkles,
  Trash2,
  User as UserIcon,
  Video,
  Volume2,
  Wand2,
  X,
  LayoutDashboard,
} from "lucide-react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { AiLogo } from "@/components/ai/ai-logo"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth"
import { aiApi, type AiConversation, type AiMessage, type AiModelsResponse } from "@/lib/ai-api"

const MODEL_LABELS: Record<string, string> = {
  "llama3-70b": "Llama 3 70B (gratuit)",
  "gpt-4o-mini": "GPT-4o mini",
  "claude-haiku": "Claude Haiku",
  "gpt-4o": "GPT-4o",
  "claude-sonnet": "Claude Sonnet",
  "claude-opus": "Claude Opus",
  "qwen-plus": "Qwen Plus",
  "qwen-max": "Qwen Max",
  "qwen3-max": "Qwen3 Max",
  "qwen3.7-plus": "Qwen 3.7 Plus",
  "qwen3.5-122b-a10b": "Qwen 3.5 122B",
  "qwen-mt-flash": "Qwen MT Flash (traduction)",
  "qwen-vl-ocr": "Qwen VL OCR (vision)",
  "qwen3-vl-235b-thinking": "Qwen3 VL 235B Thinking (vision)",
}

// Groq/Llama n'accepte pas d'images en entree - les autres modeles configures le font.
const VISION_MODELS = new Set([
  "gpt-4o-mini", "gpt-4o", "claude-haiku", "claude-sonnet", "claude-opus",
  "qwen-vl-ocr", "qwen3-vl-235b-thinking",
])

const QUICK_SUGGESTIONS = [
  { icon: FileText, label: "Redige un texte", prompt: "Redige-moi un texte professionnel sur : " },
  { icon: Lightbulb, label: "Explique une idee", prompt: "Explique-moi simplement : " },
  { icon: Bot, label: "Debug du code", prompt: "Aide-moi a debugger ce code : " },
]

const MAX_IMAGE_BYTES = 4 * 1024 * 1024

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
      title="Copier"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function ImageActions({ imageUrl }: { imageUrl: string }) {
  const [copied, setCopied] = useState(false)

  const copyImage = async () => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Copie image non supportee (Safari partiel, contexte non securise...) - ignore silencieusement.
    }
  }

  return (
    <>
      <a
        href={imageUrl}
        download
        target="_blank"
        rel="noopener noreferrer"
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
        title="Telecharger"
      >
        <Download className="w-3.5 h-3.5" />
      </a>
      <button
        type="button"
        onClick={copyImage}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
        title="Copier l'image"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </>
  )
}

// Lecture audio via Qwen TTS (qwen3-tts-flash-realtime) - non verifie en
// conditions reelles, voir la note dans ai_audio.go cote backend.
function ListenButton({ token, text }: { token: string | null; text: string }) {
  const [loading, setLoading] = useState(false)
  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        if (!token || loading) return
        setLoading(true)
        try {
          const { audioDataUrl } = await aiApi.speak(token, text)
          await new Audio(audioDataUrl).play()
        } catch {
          // Lecture audio best-effort : on ignore silencieusement un echec.
        } finally {
          setLoading(false)
        }
      }}
      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground disabled:opacity-50"
      title="Ecouter"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
    </button>
  )
}

export default function AiPage() {
  const { token, isAuthenticated } = useAuth()

  const [modelsInfo, setModelsInfo] = useState<AiModelsResponse | null>(null)
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [conversations, setConversations] = useState<AiConversation[]>([])
  const [activeConversation, setActiveConversation] = useState<AiConversation | null>(null)
  const [messages, setMessages] = useState<AiMessage[]>([])
  const [input, setInput] = useState("")
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [imageGenMode, setImageGenMode] = useState(false)
  const [imageProvider, setImageProvider] = useState<"qwen" | "openai">("qwen")
  const [imageJobId, setImageJobId] = useState<string | null>(null)
  const [imageJobStatus, setImageJobStatus] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [conversationSearch, setConversationSearch] = useState("")
  const [editImageMode, setEditImageMode] = useState(false)
  const [videoMode, setVideoMode] = useState(false)
  const [videoJobId, setVideoJobId] = useState<string | null>(null)
  const [videoStatus, setVideoStatus] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [narrationText, setNarrationText] = useState("")
  const [narrationStatus, setNarrationStatus] = useState<string | null>(null)
  const [narratedVideoUrl, setNarratedVideoUrl] = useState<string | null>(null)
  const [narrationError, setNarrationError] = useState<string | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [videoHistoryOpen, setVideoHistoryOpen] = useState(false)
  const [videoHistory, setVideoHistory] = useState<Awaited<ReturnType<typeof aiApi.listVideos>>["jobs"]>([])
  const [videoHistoryLoading, setVideoHistoryLoading] = useState(false)
  const [musicMode, setMusicMode] = useState(false)
  // false = l'IA ecrit les paroles a partir du prompt seul ; true = l'utilisateur les fournit.
  const [musicOwnLyrics, setMusicOwnLyrics] = useState(false)
  const [musicLyrics, setMusicLyrics] = useState("")
  const [musicJobId, setMusicJobId] = useState<string | null>(null)
  const [musicStatus, setMusicStatus] = useState<string | null>(null)
  const [musicAudioUrl, setMusicAudioUrl] = useState<string | null>(null)
  const [musicError, setMusicError] = useState<string | null>(null)
  const [musicHistoryOpen, setMusicHistoryOpen] = useState(false)
  const [musicHistory, setMusicHistory] = useState<Awaited<ReturnType<typeof aiApi.listMusics>>["jobs"]>([])
  const [musicHistoryLoading, setMusicHistoryLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    Promise.all([aiApi.getModels(token), aiApi.listConversations(token)])
      .then(([models, { conversations }]) => {
        setModelsInfo(models)
        setSelectedModel(models.models[0] ?? "")
        setConversations(conversations)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur de chargement"))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  // Poll toutes les 4s tant que le job video n'est pas termine (SUCCEEDED/FAILED).
  useEffect(() => {
    if (!token || !videoJobId || videoStatus === "SUCCEEDED" || videoStatus === "FAILED") return
    const interval = setInterval(async () => {
      try {
        const job = await aiApi.getVideoJob(token, videoJobId)
        setVideoStatus(job.status)
        if (job.videoUrl) setVideoUrl(job.videoUrl)
        if (job.error) setVideoError(job.error)
      } catch (err) {
        setVideoError(err instanceof Error ? err.message : "Erreur de suivi de la video")
      }
    }, 4000)
    return () => clearInterval(interval)
  }, [token, videoJobId, videoStatus])

  // Idem pour la generation musicale (Fun-Music) - meme cadence de poll que la video.
  useEffect(() => {
    if (!token || !musicJobId || musicStatus === "SUCCEEDED" || musicStatus === "FAILED") return
    const interval = setInterval(async () => {
      try {
        const job = await aiApi.getMusicJob(token, musicJobId)
        setMusicStatus(job.status)
        if (job.audioUrl) setMusicAudioUrl(job.audioUrl)
        if (job.error) setMusicError(job.error)
      } catch (err) {
        setMusicError(err instanceof Error ? err.message : "Erreur de suivi de la generation musicale")
      }
    }, 4000)
    return () => clearInterval(interval)
  }, [token, musicJobId, musicStatus])

  // Idem pour la fusion de la voix off, une fois demarree (voir handleNarrate).
  useEffect(() => {
    if (!token || !videoJobId || narrationStatus === "SUCCEEDED" || narrationStatus === "FAILED" || !narrationStatus) return
    const interval = setInterval(async () => {
      try {
        const job = await aiApi.getVideoJob(token, videoJobId)
        if (job.narrationStatus) setNarrationStatus(job.narrationStatus)
        if (job.narratedVideoUrl) setNarratedVideoUrl(job.narratedVideoUrl)
        if (job.narrationError) setNarrationError(job.narrationError)
      } catch (err) {
        setNarrationError(err instanceof Error ? err.message : "Erreur de suivi de la voix off")
      }
    }, 4000)
    return () => clearInterval(interval)
  }, [token, videoJobId, narrationStatus])

  // Idem pour la generation d'image Qwen : le job resout en base directement
  // (message assistant cree cote serveur), on rafraichit juste les messages
  // de la conversation une fois SUCCEEDED pour recuperer l'image reelle.
  const checkImageJob = useCallback(async () => {
    if (!token || !imageJobId) return
    try {
      const job = await aiApi.getImageJob(token, imageJobId)
      setImageJobStatus(job.status)
      if (job.status === "SUCCEEDED" && activeConversation) {
        const { messages: refreshed } = await aiApi.listMessages(token, activeConversation._id)
        setMessages(refreshed)
        setImageJobId(null)
        setImageJobStatus(null)
      } else if (job.status === "FAILED") {
        setError(job.error || "Erreur de generation d'image")
        setMessages((prev) => prev.filter((m) => m._id !== "temp-generating-image"))
        setImageJobId(null)
        setImageJobStatus(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de suivi de la generation")
    }
  }, [token, imageJobId, activeConversation])

  useEffect(() => {
    if (!token || !imageJobId || imageJobStatus === "SUCCEEDED" || imageJobStatus === "FAILED") return
    const interval = setInterval(checkImageJob, 4000)
    return () => clearInterval(interval)
  }, [token, imageJobId, imageJobStatus, checkImageJob])

  // Les mobiles suspendent souvent les setInterval en arriere-plan (ecran
  // verrouille, onglet non actif) pendant les 1-3 minutes que prend Qwen -
  // sans ca, on revient sur l'app avec le message "generation en cours..."
  // fige indefiniment meme si le job a reussi cote serveur entre temps.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") checkImageJob()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [checkImageJob])

  // Dictee vocale via la Web Speech API (voir types/speech-recognition.d.ts).
  // Certains navigateurs (Safari desktop notamment) ne la supportent pas : on
  // masque simplement le bouton dans ce cas plutot que de planter.
  const SpeechRecognitionCtor =
    typeof window !== "undefined" ? window.SpeechRecognition ?? window.webkitSpeechRecognition : undefined

  const toggleListening = useCallback(() => {
    if (!SpeechRecognitionCtor) return

    if (listening) {
      recognitionRef.current?.stop()
      return
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = "fr-FR"
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript
      if (transcript) setInput((prev) => (prev ? `${prev} ${transcript}` : transcript))
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }, [SpeechRecognitionCtor, listening])

  const handlePickImage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("Seules les images sont acceptees (le modele ne peut pas encore analyser de video).")
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image trop lourde (max 4 Mo).")
      return
    }
    setError(null)
    const reader = new FileReader()
    reader.onload = () => setPendingImage(reader.result as string)
    reader.readAsDataURL(file)
  }, [])

  const openConversation = useCallback(
    async (conversation: AiConversation) => {
      if (!token) return
      setActiveConversation(conversation)
      setError(null)
      const { messages } = await aiApi.listMessages(token, conversation._id)
      setMessages(messages)
    },
    [token],
  )

  const startNewConversation = useCallback(() => {
    setActiveConversation(null)
    setMessages([])
    setError(null)
  }, [])

  const removeConversation = useCallback(
    async (conversation: AiConversation, event: React.MouseEvent) => {
      event.stopPropagation()
      if (!token) return
      await aiApi.deleteConversation(token, conversation._id)
      setConversations((prev) => prev.filter((c) => c._id !== conversation._id))
      if (activeConversation?._id === conversation._id) {
        setActiveConversation(null)
        setMessages([])
      }
    },
    [token, activeConversation],
  )

  const handleSend = useCallback(
    async (overrideContent?: string) => {
      const content = (overrideContent ?? input).trim()
      if (!token || (!content && !pendingImage)) return
      if (editImageMode && !pendingImage) return

      let conversation = activeConversation
      if (!conversation) {
        const model = selectedModel || modelsInfo?.models[0]
        if (!model) return
        const { conversation: created } = await aiApi.createConversation(token, model)
        setConversations((prev) => [created, ...prev])
        setActiveConversation(created)
        conversation = created
      }

      const imageToSend = pendingImage
      const generatingImage = imageGenMode
      const editingImage = editImageMode
      setInput("")
      setPendingImage(null)
      setSending(true)
      setError(null)

      setMessages((prev) => [
        ...prev,
        {
          _id: `temp-${Date.now()}`,
          conversationId: conversation!._id,
          role: "user",
          content: content || "(image jointe)",
          imageDataUrl: imageToSend ?? undefined,
          modelName: conversation!.modelName,
          createdAt: new Date().toISOString(),
        },
      ])

      try {
        if (generatingImage && imageProvider === "qwen") {
          // Qwen prend 1-3 minutes - submit+poll comme la video, pas de reponse immediate.
          const result = await aiApi.submitImageJob(token, conversation._id, content)
          setMessages((prev) => [
            ...prev.filter((m) => !m._id.startsWith("temp-")),
            result.userMessage,
            {
              _id: "temp-generating-image",
              conversationId: conversation._id,
              role: "assistant",
              content: "Generation de l'image en cours (1 a 3 minutes)...",
              modelName: "wan2.6-image",
              createdAt: new Date().toISOString(),
            },
          ])
          setImageJobId(result.jobId)
          setImageJobStatus(result.status)
          return
        }

        const result = editingImage && imageToSend
          ? await aiApi.editImage(token, conversation._id, content, imageToSend)
          : generatingImage
            ? await aiApi.generateImage(token, conversation._id, content)
            : await aiApi.sendMessage(token, conversation._id, content || "(image jointe)", imageToSend ?? undefined)
        setMessages((prev) => [...prev.filter((m) => !m._id.startsWith("temp-")), result.userMessage, result.assistantMessage])
        setModelsInfo((prev) => (prev ? { ...prev, creditBalance: result.creditBalance } : prev))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur d'envoi")
      } finally {
        setSending(false)
      }
    },
    [token, input, pendingImage, imageGenMode, editImageMode, imageProvider, activeConversation, modelsInfo, selectedModel],
  )

  const handleSubmitVideo = useCallback(async () => {
    const prompt = input.trim()
    if (!token || !prompt) return
    setVideoError(null)
    setVideoUrl(null)
    setVideoStatus(null)
    setNarrationStatus(null)
    setNarratedVideoUrl(null)
    setNarrationText("")
    setNarrationError(null)
    setSending(true)
    try {
      const result = await aiApi.submitVideo(token, prompt, pendingImage ?? undefined)
      setVideoJobId(result.jobId)
      setVideoStatus(result.status)
      setModelsInfo((prev) => (prev ? { ...prev, creditBalance: result.creditBalance } : prev))
      setInput("")
      setPendingImage(null)
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : "Erreur de soumission")
    } finally {
      setSending(false)
    }
  }, [token, input, pendingImage])

  const handleNarrate = useCallback(async () => {
    const text = narrationText.trim()
    if (!token || !videoJobId || !text) return
    setNarrationError(null)
    setNarratedVideoUrl(null)
    try {
      // Merges in the background (takes over a minute) - the poll effect
      // below picks up narrationStatus/narratedVideoUrl once it's done.
      const result = await aiApi.narrateVideo(token, videoJobId, text)
      setNarrationStatus(result.narrationStatus)
      setModelsInfo((prev) => (prev ? { ...prev, creditBalance: result.creditBalance } : prev))
    } catch (err) {
      setNarrationError(err instanceof Error ? err.message : "Erreur de fusion audio")
    }
  }, [token, videoJobId, narrationText])

  const openVideoHistory = useCallback(async () => {
    setVideoHistoryOpen(true)
    setSidebarOpen(false)
    if (!token) return
    setVideoHistoryLoading(true)
    try {
      const { jobs } = await aiApi.listVideos(token)
      setVideoHistory(jobs)
    } catch {
      // Silencieux - la liste reste vide, pas critique.
    } finally {
      setVideoHistoryLoading(false)
    }
  }, [token])

  const handleSubmitMusic = useCallback(async () => {
    const prompt = input.trim()
    if (!token || !prompt) return
    if (musicOwnLyrics && !musicLyrics.trim()) return
    setMusicError(null)
    setMusicAudioUrl(null)
    setMusicStatus(null)
    setSending(true)
    try {
      const result = await aiApi.submitMusic(token, prompt, musicOwnLyrics ? musicLyrics.trim() : undefined)
      setMusicJobId(result.jobId)
      setMusicStatus(result.status)
      setModelsInfo((prev) => (prev ? { ...prev, creditBalance: result.creditBalance } : prev))
      setInput("")
      setMusicLyrics("")
    } catch (err) {
      setMusicError(err instanceof Error ? err.message : "Erreur de soumission")
    } finally {
      setSending(false)
    }
  }, [token, input, musicOwnLyrics, musicLyrics])

  const openMusicHistory = useCallback(async () => {
    setMusicHistoryOpen(true)
    setSidebarOpen(false)
    if (!token) return
    setMusicHistoryLoading(true)
    try {
      const { jobs } = await aiApi.listMusics(token)
      setMusicHistory(jobs)
    } catch {
      // Silencieux - la liste reste vide, pas critique.
    } finally {
      setMusicHistoryLoading(false)
    }
  }, [token])

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const selectedModelSupportsVision = VISION_MODELS.has(selectedModel)

  const composer = (
    <div className="border border-border/50 bg-card/50 backdrop-blur-sm rounded-3xl p-4 shadow-lg shadow-black/5 flex flex-col gap-2 focus-within:border-primary/40 transition-colors">
      {imageGenMode && (
        <div className="flex items-center gap-2 text-xs text-primary flex-wrap">
          <div className="flex items-center gap-1.5">
            <ImagePlus className="w-3.5 h-3.5" />
            Mode generation d&apos;image active (20 credits par image)
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              onClick={() => setImageProvider("qwen")}
              className={`px-2 py-0.5 rounded-full border text-[11px] transition-colors ${
                imageProvider === "qwen"
                  ? "bg-primary/15 border-primary/50 text-primary"
                  : "border-border/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              Qwen
            </button>
            <button
              type="button"
              onClick={() => setImageProvider("openai")}
              className={`px-2 py-0.5 rounded-full border text-[11px] transition-colors ${
                imageProvider === "openai"
                  ? "bg-primary/15 border-primary/50 text-primary"
                  : "border-border/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              ChatGPT
            </button>
          </div>
        </div>
      )}
      {editImageMode && (
        <div className="flex items-center gap-1.5 text-xs text-primary">
          <Wand2 className="w-3.5 h-3.5" />
          Mode edition d&apos;image active (20 credits) - joins une image puis decris la modification
        </div>
      )}
      {videoMode && (
        <div className="flex items-center gap-1.5 text-xs text-primary">
          <Video className="w-3.5 h-3.5" />
          {pendingImage
            ? "Mode image vers video active (100 credits, wan2.7-i2v) - l'image jointe sera animee"
            : "Mode generation video active (100 credits, wan2.6-t2v, texte vers video) - joins une image pour l'animer a la place"}
        </div>
      )}
      {musicMode && (
        <div className="flex items-center gap-2 text-xs text-primary flex-wrap">
          <div className="flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5" />
            Mode generation musicale active (100 credits, Fun-Music)
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              onClick={() => setMusicOwnLyrics(false)}
              className={`px-2 py-0.5 rounded-full border text-[11px] transition-colors ${
                !musicOwnLyrics
                  ? "bg-primary/15 border-primary/50 text-primary"
                  : "border-border/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              L&apos;IA ecrit les paroles
            </button>
            <button
              type="button"
              onClick={() => setMusicOwnLyrics(true)}
              className={`px-2 py-0.5 rounded-full border text-[11px] transition-colors ${
                musicOwnLyrics
                  ? "bg-primary/15 border-primary/50 text-primary"
                  : "border-border/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              Mes propres paroles
            </button>
          </div>
        </div>
      )}
      {musicMode && musicOwnLyrics && (
        <textarea
          value={musicLyrics}
          onChange={(e) => setMusicLyrics(e.target.value)}
          placeholder="Colle tes paroles ici (2000 caracteres max)..."
          rows={3}
          className="w-full resize-none bg-background/50 border border-border/50 rounded-lg text-sm placeholder:text-muted-foreground/70 outline-none px-3 py-2 focus:border-primary/40"
        />
      )}
      {pendingImage && (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pendingImage} alt="Image jointe" className="h-20 rounded-lg border border-border/50" />
          <button
            type="button"
            onClick={() => setPendingImage(null)}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
          >
            <X className="w-3 h-3" />
          </button>
          {!videoMode && !selectedModelSupportsVision && (
            <p className="text-xs text-amber-500 mt-1">Le modele selectionne ne lit pas les images.</p>
          )}
        </div>
      )}
      <textarea
        id="ai-composer-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            videoMode ? handleSubmitVideo() : musicMode ? handleSubmitMusic() : handleSend()
          }
        }}
        placeholder={
          videoMode
            ? "Decris la video a generer..."
            : musicMode
              ? musicOwnLyrics
                ? "Decris le style musical (les paroles sont au-dessus)..."
                : "Decris la chanson a generer (theme, style, ambiance)..."
              : editImageMode
                ? "Decris la modification a apporter a l'image..."
                : imageGenMode
                  ? "Decris l'image a generer..."
                  : "Ecris ton message a AI MAHU..."
        }
        rows={2}
        className="w-full resize-none bg-transparent text-foreground text-base placeholder:text-muted-foreground/70 outline-none px-1"
      />
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Select
            value={selectedModel}
            onValueChange={setSelectedModel}
            disabled={imageGenMode || editImageMode || videoMode || musicMode}
          >
            <SelectTrigger size="sm" className="border-border/50 bg-background/50 max-w-32.5 sm:max-w-none">
              <SelectValue placeholder="Modele" className="truncate" />
            </SelectTrigger>
            <SelectContent>
              {modelsInfo?.models.map((model) => (
                <SelectItem key={model} value={model}>
                  {MODEL_LABELS[model] || model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePickImage} />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="border-border/50"
            onClick={() => fileInputRef.current?.click()}
            disabled={imageGenMode}
            title={videoMode ? "Joindre une image a animer" : "Joindre une image"}
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={`border-border/50 ${imageGenMode ? "bg-primary/10 border-primary/50 text-primary" : ""}`}
            onClick={() => {
              setImageGenMode((prev) => !prev)
              setEditImageMode(false)
              setVideoMode(false)
              setMusicMode(false)
              setPendingImage(null)
            }}
            title="Generer une image"
          >
            <ImagePlus className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={`border-border/50 ${editImageMode ? "bg-primary/10 border-primary/50 text-primary" : ""}`}
            onClick={() => {
              setEditImageMode((prev) => !prev)
              setImageGenMode(false)
              setVideoMode(false)
              setMusicMode(false)
            }}
            title="Editer une image (joins-en une)"
          >
            <Wand2 className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={`border-border/50 ${videoMode ? "bg-primary/10 border-primary/50 text-primary" : ""}`}
            onClick={() => {
              setVideoMode((prev) => !prev)
              setImageGenMode(false)
              setEditImageMode(false)
              setMusicMode(false)
              setPendingImage(null)
            }}
            title="Generer une video (100 credits)"
          >
            <Video className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={`border-border/50 ${musicMode ? "bg-primary/10 border-primary/50 text-primary" : ""}`}
            onClick={() => {
              setMusicMode((prev) => !prev)
              setImageGenMode(false)
              setEditImageMode(false)
              setVideoMode(false)
              setPendingImage(null)
            }}
            title="Generer une chanson (100 credits)"
          >
            <Music className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {SpeechRecognitionCtor && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={`border-border/50 ${listening ? "text-destructive border-destructive/50" : ""}`}
              onClick={toggleListening}
              title="Dictee vocale"
            >
              {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
          )}
          <Button
            onClick={() => (videoMode ? handleSubmitVideo() : musicMode ? handleSubmitMusic() : handleSend())}
            disabled={
              sending ||
              (videoMode
                ? !input.trim()
                : musicMode
                  ? !input.trim() || (musicOwnLyrics && !musicLyrics.trim())
                  : editImageMode
                    ? !pendingImage
                    : !input.trim() && !pendingImage)
            }
            size="icon"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  )

  const videoPanel = videoJobId && (
    <div className="mb-3 rounded-xl border border-border/50 bg-card/50 p-3 text-sm space-y-3">
      {videoError ? (
        <p className="text-destructive">Erreur : {videoError}</p>
      ) : videoStatus === "SUCCEEDED" && videoUrl ? (
        <>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video src={narratedVideoUrl ?? videoUrl} controls className="w-full rounded-lg max-h-80" />
          {narrationStatus === "PENDING" || narrationStatus === "RUNNING" ? (
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Loader2 className="w-4 h-4 animate-spin" />
              Ajout de la voix off en cours... cela peut prendre 1 a 2 minutes.
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                value={narrationText}
                onChange={(e) => setNarrationText(e.target.value)}
                placeholder="Texte de la voix off a ajouter sur la video (5 credits)..."
                className="flex-1 bg-background/50 border border-border/50 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary/40"
              />
              <Button size="sm" onClick={handleNarrate} disabled={!narrationText.trim()}>
                Ajouter la voix off
              </Button>
            </div>
          )}
          {narrationError && <p className="text-destructive text-xs">Erreur : {narrationError}</p>}
          {narrationStatus === "SUCCEEDED" && narratedVideoUrl && (
            <p className="text-xs text-muted-foreground">Voix off ajoutee.</p>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Generation video en cours ({videoStatus ?? "PENDING"})... cela peut prendre plusieurs minutes.
        </div>
      )}
    </div>
  )

  const musicPanel = musicJobId && (
    <div className="mb-3 rounded-xl border border-border/50 bg-card/50 p-3 text-sm space-y-3">
      {musicError ? (
        <p className="text-destructive">Erreur : {musicError}</p>
      ) : musicStatus === "SUCCEEDED" && musicAudioUrl ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio src={musicAudioUrl} controls className="w-full" />
      ) : (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Generation musicale en cours ({musicStatus ?? "PENDING"})... cela peut prendre 2 a 3 minutes.
        </div>
      )}
    </div>
  )

  return (
    <div className="h-full p-4">
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="flex flex-col h-full lg:grid lg:grid-cols-[280px_1fr] gap-4">
          {/* Barre mobile : ouvre la sidebar en tiroir, esprit ChatGPT - la
              sidebar elle-meme reste hors du flux normal sur mobile (fixed),
              seul ce bouton occupe de la place en haut de l'ecran. */}
          <div className="flex items-center gap-2 lg:hidden">
            <Button variant="outline" size="icon" className="border-border/50" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="w-4 h-4" />
              AI MAHU
            </div>
          </div>

          {/* Overlay tiroir mobile - au-dessus du contenu, ferme au clic en dehors */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
          )}

          {/* Sidebar interne, esprit Claude : nouvelle conversation + discussions.
              Fixed + hors ecran par defaut sur mobile, en tiroir quand sidebarOpen ;
              simple colonne statique a partir de lg. */}
          <div
            className={`fixed inset-y-0 left-0 z-50 w-72 p-3 transition-transform lg:static lg:z-auto lg:w-auto lg:translate-x-0 rounded-r-2xl lg:rounded-2xl bg-card border border-border/50 backdrop-blur-sm flex flex-col overflow-hidden ${
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between gap-2 px-1 pb-3">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Sparkles className="w-4 h-4" />
                AI MAHU
              </div>
              <button className="lg:hidden text-muted-foreground hover:text-foreground" onClick={() => setSidebarOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <Button
              onClick={() => {
                startNewConversation()
                setSidebarOpen(false)
              }}
              className="mb-3 justify-start"
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle conversation
            </Button>
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={conversationSearch}
                onChange={(e) => setConversationSearch(e.target.value)}
                placeholder="Rechercher dans les discussions"
                className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-muted/30 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 transition-colors"
              />
            </div>
            <p className="px-2 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">Discussions</p>
            <div className="flex-1 overflow-y-auto space-y-1">
              {conversations
                .filter((conversation) => conversation.title.toLowerCase().includes(conversationSearch.toLowerCase()))
                .map((conversation) => (
                <button
                  key={conversation._id}
                  onClick={() => {
                    openConversation(conversation)
                    setSidebarOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between gap-2 group transition-colors ${
                    activeConversation?._id === conversation._id
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-muted/30"
                  }`}
                >
                  <span className="truncate">{conversation.title}</span>
                  <Trash2
                    className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 hover:text-destructive shrink-0"
                    onClick={(e) => removeConversation(conversation, e)}
                  />
                </button>
              ))}
              {conversations.length === 0 && (
                <p className="text-sm text-muted-foreground px-3 py-2">Aucune conversation pour l&apos;instant.</p>
              )}
            </div>
            <div className="pt-3 mt-3 border-t border-border/50 space-y-1">
              <Link
                href="/ai/carte"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
              >
                <ScanFace className="w-4 h-4" />
                Ma carte IA
              </Link>
              <button
                onClick={openVideoHistory}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
              >
                <Film className="w-4 h-4" />
                Mes videos
              </button>
              <button
                onClick={openMusicHistory}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
              >
                <Music className="w-4 h-4" />
                Mes chansons
              </button>
              <Link
                href="/dashboard/abonnement"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                {modelsInfo ? `Plan ${modelsInfo.plan} · ${modelsInfo.creditBalance} credits` : "Abonnement"}
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Retour au dashboard
              </Link>
            </div>
          </div>

          {/* Zone principale */}
          {!activeConversation && messages.length === 0 ? (
            <div className="flex-1 min-h-0 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm overflow-y-auto p-6 md:p-10">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto">
                <Link
                  href="/ai/carte"
                  className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 rounded-full border border-primary/40 bg-primary/5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  <span className="px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                    NOUVEAU
                  </span>
                  Connecte-toi avec ta carte IA, sans mot de passe
                </Link>

                <div className="mb-12">
                  <AiLogo size="md" className="mb-4" />
                  <p className="text-xs font-medium tracking-widest text-primary uppercase mb-3">made by mahu</p>
                  <h1 className="ai-hero-gradient-text text-6xl md:text-7xl font-bold mb-4 tracking-tight leading-[0.95]">
                    AI FOR
                    <br />
                    ALL
                  </h1>
                  <p className="text-muted-foreground text-lg max-w-md mb-6">
                    L&apos;intelligence artificielle pour tous. Discute, cree, redige et debug avec les meilleurs
                    modeles, directement sur AI MAHU.
                  </p>
                  <div className="flex items-center gap-4 flex-wrap">
                    <Button size="lg" onClick={() => document.getElementById("ai-composer-input")?.focus()}>
                      Commencer a discuter
                    </Button>
                    <button
                      type="button"
                      onClick={() => setShowPreviewModal(true)}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
                    >
                      Voir un aperçu
                    </button>
                  </div>
                </div>

                {showPreviewModal && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={() => setShowPreviewModal(false)}
                  >
                    <div
                      className="relative w-full max-w-sm rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-violet-500/10 p-4 shadow-2xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => setShowPreviewModal(false)}
                        className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-card border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground"
                        aria-label="Fermer l'aperçu"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-1.5 mb-4">
                        <span className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                        <span className="ml-2 text-xs text-muted-foreground">AI MAHU</span>
                      </div>
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-end">
                          <div className="bg-primary text-primary-foreground text-xs rounded-xl px-3 py-1.5 max-w-[70%]">
                            Redige-moi une annonce pour mon entreprise
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <AiLogo size="sm" />
                          <div className="bg-muted/40 text-xs rounded-xl px-3 py-1.5 text-foreground">
                            Bien sur ! Voici une proposition...
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl border border-border/50 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                        Ecris ton message a AI MAHU...
                      </div>
                    </div>
                  </div>
                )}

                {videoPanel}
                {musicPanel}
                {composer}
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  {QUICK_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion.label}
                      onClick={() => setInput(suggestion.prompt)}
                      className="flex items-center gap-2 px-3 py-2 rounded-full text-sm border border-border/50 bg-background/50 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                    >
                      <suggestion.icon className="w-3.5 h-3.5" />
                      {suggestion.label}
                    </button>
                  ))}
                </div>
                {error && <p className="text-sm text-destructive mt-4">{error}</p>}
              </motion.div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm flex flex-col overflow-hidden">
              {activeConversation && (
                <div className="px-4 py-2 border-b border-border/50 text-xs text-muted-foreground">
                  Modele : {MODEL_LABELS[activeConversation.modelName] || activeConversation.modelName}
                </div>
              )}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div key={message._id} className={`flex gap-3 group ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    {message.role === "assistant" && <AiLogo size="sm" />}
                    <div className={`max-w-[75%] flex flex-col gap-1 ${message.role === "user" ? "items-end" : "items-start"}`}>
                      {message.imageDataUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={message.imageDataUrl} alt="Image jointe" className="max-h-48 rounded-xl border border-border/50" />
                      )}
                      <div
                        className={`rounded-2xl px-4 py-2 text-sm ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground whitespace-pre-wrap"
                            : "bg-muted/40 text-foreground prose prose-sm prose-invert max-w-none prose-p:my-2 prose-headings:mt-3 prose-headings:mb-1.5 prose-pre:bg-background/60 prose-pre:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0"
                        }`}
                      >
                        {message.role === "assistant" ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                        ) : (
                          message.content
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <CopyButton text={message.content} />
                        {message.role === "assistant" && <ListenButton token={token} text={message.content} />}
                        {message.imageDataUrl && <ImageActions imageUrl={message.imageDataUrl} />}
                      </div>
                    </div>
                    {message.role === "user" && (
                      <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                        <UserIcon className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {sending && (
                  <div className="flex gap-3 justify-start">
                    <AiLogo animated size="sm" />
                    <div className="rounded-2xl px-4 py-2 bg-muted/40 flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {editImageMode
                          ? "AI MAHU modifie l'image..."
                          : imageGenMode
                            ? "AI MAHU genere l'image..."
                            : "AI MAHU reflechit..."}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce" />
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {error && <p className="px-4 text-sm text-destructive">{error}</p>}

              <div className="p-4 border-t border-border/50">
                {videoPanel}
                {musicPanel}
                {composer}
              </div>
            </div>
          )}
        </div>
      )}

      {videoHistoryOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setVideoHistoryOpen(false)}
        >
          <div
            className="bg-card border border-border/50 rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Film className="w-5 h-5 text-primary" />
                Mes videos
              </h2>
              <button
                onClick={() => setVideoHistoryOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {videoHistoryLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : videoHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Aucune video generee pour l&apos;instant.
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {videoHistory.map((job) => (
                  <div key={job._id} className="rounded-xl border border-border/50 bg-background/50 p-3 space-y-2">
                    {job.status === "SUCCEEDED" && (job.narratedVideoUrl || job.videoUrl) ? (
                      // eslint-disable-next-line jsx-a11y/media-has-caption
                      <video src={job.narratedVideoUrl ?? job.videoUrl} controls className="w-full rounded-lg max-h-48" />
                    ) : job.status === "FAILED" ? (
                      <div className="h-32 rounded-lg bg-muted/30 flex items-center justify-center text-xs text-destructive px-3 text-center">
                        Echec : {job.error || "erreur inconnue"}
                      </div>
                    ) : (
                      <div className="h-32 rounded-lg bg-muted/30 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        En cours...
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground line-clamp-2">{job.prompt}</p>
                    <p className="text-[11px] text-muted-foreground/70">
                      {new Date(job.createdAt).toLocaleString("fr-FR")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {musicHistoryOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setMusicHistoryOpen(false)}
        >
          <div
            className="bg-card border border-border/50 rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Music className="w-5 h-5 text-primary" />
                Mes chansons
              </h2>
              <button
                onClick={() => setMusicHistoryOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {musicHistoryLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : musicHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Aucune chanson generee pour l&apos;instant.
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {musicHistory.map((job) => (
                  <div key={job._id} className="rounded-xl border border-border/50 bg-background/50 p-3 space-y-2">
                    {job.status === "SUCCEEDED" && job.audioUrl ? (
                      // eslint-disable-next-line jsx-a11y/media-has-caption
                      <audio src={job.audioUrl} controls className="w-full" />
                    ) : job.status === "FAILED" ? (
                      <div className="h-16 rounded-lg bg-muted/30 flex items-center justify-center text-xs text-destructive px-3 text-center">
                        Echec : {job.error || "erreur inconnue"}
                      </div>
                    ) : (
                      <div className="h-16 rounded-lg bg-muted/30 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        En cours...
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground line-clamp-2">{job.prompt}</p>
                    <p className="text-[11px] text-muted-foreground/70">
                      {new Date(job.createdAt).toLocaleString("fr-FR")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
