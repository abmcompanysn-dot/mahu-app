"use client"

import { Suspense, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  Mail,
  Lock,
  KeyRound,
  ShoppingBag,
  User,
  Phone,
  MapPin,
} from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import { shopApi, formatXof, PRODUCT_CATEGORY_LABELS, type Product } from "@/lib/shop-api"

type Mode = "code" | "order"

const inputClass =
  "w-full pl-12 pr-4 py-3.5 rounded-xl bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-muted-foreground mb-2">{label}</label>
      <div className="relative">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        {children}
      </div>
    </div>
  )
}

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { register } = useAuth()
  const [mode, setMode] = useState<Mode>(searchParams.get("code") ? "code" : "order")
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    cardCode: searchParams.get("code") || "",
    clientName: "",
    phone: "",
    deliveryAddress: "",
  })
  const [products, setProducts] = useState<Product[]>([])
  const [depositXof, setDepositXof] = useState(10000)
  const [productId, setProductId] = useState("")
  const [productsError, setProductsError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(searchParams.get("cancelled") ? "Paiement annule. Vous pouvez reessayer." : "")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    shopApi
      .listProducts()
      .then((res) => {
        setProducts(res.products)
        setDepositXof(res.depositXof)
      })
      .catch(() => setProductsError("Impossible de charger les cartes. Rechargez la page."))
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError("")
  }

  const validatePasswords = () => {
    if (formData.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caracteres")
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas")
      return false
    }
    return true
  }

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validatePasswords()) return
    setLoading(true)
    setError("")
    try {
      const result = await register(
        formData.email.toLowerCase().trim(),
        formData.password,
        formData.cardCode.toUpperCase().trim()
      )
      if (result.success) {
        setSuccess(true)
        setTimeout(() => router.push("/onboarding"), 1500)
      } else {
        setError(result.error || "Erreur lors de l'inscription")
      }
    } catch {
      setError("Erreur de connexion au serveur")
    }
    setLoading(false)
  }

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productId) {
      setError("Choisissez votre carte")
      return
    }
    if (!validatePasswords()) return
    setLoading(true)
    setError("")
    try {
      const { checkoutUrl } = await shopApi.createDepositCheckout({
        productId,
        clientName: formData.clientName,
        email: formData.email.toLowerCase().trim(),
        phone: formData.phone,
        deliveryAddress: formData.deliveryAddress,
        password: formData.password,
      })
      window.location.href = checkoutUrl
      return
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion au serveur")
    }
    setLoading(false)
  }

  const selectedProduct = products.find((p) => p._id === productId)
  const deposit = selectedProduct ? Math.min(selectedProduct.priceXof, depositXof) : depositXof

  const passwordFields = (
    <>
      <Field icon={Lock} label="Mot de passe">
        <input
          type={showPassword ? "text" : "password"}
          name="password"
          required
          value={formData.password}
          onChange={handleChange}
          className={cn(inputClass, "pr-12")}
          placeholder="Minimum 6 caracteres"
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        >
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </Field>
      <Field icon={Lock} label="Confirmer le mot de passe">
        <input
          type={showPassword ? "text" : "password"}
          name="confirmPassword"
          required
          value={formData.confirmPassword}
          onChange={handleChange}
          className={inputClass}
          placeholder="Repetez votre mot de passe"
          autoComplete="new-password"
        />
      </Field>
    </>
  )

  const emailField = (
    <Field icon={Mail} label="Adresse email">
      <input
        type="email"
        name="email"
        required
        value={formData.email}
        onChange={handleChange}
        className={inputClass}
        placeholder="email@exemple.com"
        autoComplete="email"
      />
    </Field>
  )

  const errorBox = error && (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-destructive/10 border border-destructive/20"
    >
      <p className="text-destructive text-sm text-center">{error}</p>
    </motion.div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,122,255,0.15),transparent_50%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-xl"
      >
        <div className="rounded-3xl bg-card/50 border border-border/50 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <Link
              href="/"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Accueil</span>
            </Link>
            <span className="text-2xl font-bold text-foreground">Mahu</span>
          </div>

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10"
              >
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Compte cree !</h2>
                <p className="text-muted-foreground">Configuration de votre profil...</p>
              </motion.div>
            ) : (
              <motion.div key="register" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-2xl font-bold text-foreground mb-2">Creer un compte</h1>
                <p className="text-muted-foreground mb-6">
                  Commandez votre carte avec un acompte de {formatXof(depositXof)}, ou activez celle que vous avez deja.
                </p>

                <div className="grid grid-cols-2 gap-2 p-1 mb-6 rounded-xl bg-muted/30 border border-border/50">
                  {(
                    [
                      { key: "order", label: "Commander ma carte", icon: ShoppingBag },
                      { key: "code", label: "J'ai un code", icon: KeyRound },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => {
                        setMode(tab.key)
                        setError("")
                      }}
                      className={cn(
                        "flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        mode === tab.key
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {mode === "code" ? (
                  <form onSubmit={handleCodeSubmit} className="space-y-4">
                    <Field icon={KeyRound} label="Code de la carte">
                      <input
                        type="text"
                        name="cardCode"
                        required
                        value={formData.cardCode}
                        onChange={handleChange}
                        className={cn(inputClass, "uppercase tracking-wider")}
                        placeholder="Code imprime sur votre carte"
                        autoComplete="off"
                      />
                    </Field>
                    {emailField}
                    {passwordFields}
                    {errorBox}
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full py-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-lg mt-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Creation...
                        </>
                      ) : (
                        "Activer ma carte"
                      )}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleOrderSubmit} className="space-y-4">
                    <div>
                      <p className="block text-sm font-medium text-muted-foreground mb-2">Choisissez votre carte</p>
                      {productsError && <p className="text-sm text-destructive">{productsError}</p>}
                      {!productsError && products.length === 0 && (
                        <div className="flex justify-center py-6">
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
                        {products.map((p) => (
                          <button
                            key={p._id}
                            type="button"
                            onClick={() => {
                              setProductId(p._id)
                              setError("")
                            }}
                            className={cn(
                              "flex gap-3 p-3 rounded-xl border text-left transition-colors",
                              productId === p._id
                                ? "border-primary bg-primary/10"
                                : "border-border/50 bg-muted/20 hover:border-primary/40"
                            )}
                          >
                            {p.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.imageUrl}
                                alt=""
                                loading="lazy"
                                className="w-14 h-14 rounded-lg object-cover bg-muted shrink-0"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-lg bg-muted shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground leading-tight">{p.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {PRODUCT_CATEGORY_LABELS[p.category] ?? p.category}
                              </p>
                              <p className="text-sm font-semibold text-foreground mt-1">
                                {p.priceIsFrom ? "Des " : ""}
                                {formatXof(p.priceXof)}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <Field icon={User} label="Nom complet">
                      <input
                        type="text"
                        name="clientName"
                        required
                        value={formData.clientName}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="Prenom Nom"
                        autoComplete="name"
                      />
                    </Field>
                    <Field icon={Phone} label="Telephone">
                      <input
                        type="tel"
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="+221 ..."
                        autoComplete="tel"
                      />
                    </Field>
                    <Field icon={MapPin} label="Adresse de livraison">
                      <input
                        type="text"
                        name="deliveryAddress"
                        value={formData.deliveryAddress}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="Quartier, ville"
                        autoComplete="street-address"
                      />
                    </Field>
                    {emailField}
                    {passwordFields}

                    {selectedProduct && (
                      <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Acompte a payer maintenant</span>
                          <span className="font-semibold text-foreground">{formatXof(deposit)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Reste a la livraison</span>
                          <span className="text-foreground">
                            {selectedProduct.priceIsFrom ? "des " : ""}
                            {formatXof(selectedProduct.priceXof - deposit)}
                          </span>
                        </div>
                      </div>
                    )}

                    {errorBox}
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full py-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-lg mt-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Redirection vers PayDunya...
                        </>
                      ) : (
                        `Payer l'acompte (${formatXof(deposit)})`
                      )}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      Paiement securise PayDunya (Wave, Orange Money, carte bancaire). Votre compte est cree des la
                      confirmation du paiement.
                    </p>
                  </form>
                )}

                <p className="text-center text-muted-foreground mt-6">
                  Deja un compte ?{" "}
                  <Link href="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
                    Se connecter
                  </Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          En creant un compte, vous acceptez nos{" "}
          <Link href="/conditions-utilisation" className="text-foreground hover:text-primary transition-colors">
            Conditions
          </Link>{" "}
          et{" "}
          <Link href="/confidentialite" className="text-foreground hover:text-primary transition-colors">
            Politique de confidentialite
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
