// Catalogue boutique + inscription par acompte PayDunya, via le proxy
// /api/backend (voir backend/internal/handlers/shop.go).
const SHOP_BASE_URL = "/api/backend/api/shop"

export type ProductCategory = "carte_nfc" | "porte_cle_rfid" | "carte_rfid" | "web_card"

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  carte_nfc: "Carte NFC",
  porte_cle_rfid: "Porte-cle RFID",
  carte_rfid: "Carte RFID",
  web_card: "Web Card (site web)",
}

export interface Product {
  _id: string
  slug: string
  name: string
  description: string
  priceXof: number
  priceIsFrom: boolean
  // Catalogue public : acompte reellement demande. Admin : acompte propre au produit (0 = acompte par defaut).
  depositXof: number
  category: ProductCategory
  material: string
  imageUrl: string
  features: string[]
  active: boolean
  sortOrder: number
}

export interface DepositOrderStatus {
  paymentStatus: "en_attente" | "acompte_paye" | "solde"
  email: string
  productName: string
  depositXof: number
  remainingXof: number
}

export function formatXof(amount: number) {
  return `${amount.toLocaleString("fr-FR")} FCFA`
}

async function parse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.error || `Erreur ${response.status}`)
  }
  return data as T
}

export const shopApi = {
  listProducts: async () =>
    parse<{ products: Product[]; depositXof: number }>(await fetch(`${SHOP_BASE_URL}/products`)),

  createDepositCheckout: async (data: {
    productId: string
    clientName: string
    email: string
    phone: string
    deliveryAddress: string
    password: string
  }) =>
    parse<{ checkoutUrl: string; reference: string }>(
      await fetch(`${SHOP_BASE_URL}/deposit-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Le retour PayDunya revient sur le domaine courant (ai.mahu.cards, call.mahu.cards...).
        body: JSON.stringify({ ...data, origin: window.location.origin }),
      })
    ),

  checkCode: async (code: string) =>
    parse<{ valid: boolean; priceXof?: number }>(
      await fetch(`${SHOP_BASE_URL}/check-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
    ),

  createCodeCheckout: async (data: {
    cardCode: string
    clientName: string
    email: string
    phone: string
    password: string
  }) =>
    parse<{ checkoutUrl: string; reference: string }>(
      await fetch(`${SHOP_BASE_URL}/code-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, origin: window.location.origin }),
      })
    ),

  getOrderStatus: async (reference: string) =>
    parse<DepositOrderStatus>(await fetch(`${SHOP_BASE_URL}/orders/${encodeURIComponent(reference)}`)),
}
