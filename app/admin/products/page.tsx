"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { adminApi, type ProductInput } from "@/lib/admin-api"
import { formatXof, PRODUCT_CATEGORY_LABELS, type Product, type ProductCategory } from "@/lib/shop-api"

const EMPTY_PRODUCT: ProductInput = {
  name: "",
  description: "",
  priceXof: 0,
  priceIsFrom: false,
  depositXof: 0,
  category: "carte_nfc",
  material: "",
  imageUrl: "",
  features: [],
  active: true,
  sortOrder: 0,
}

export default function AdminProductsPage() {
  const { token } = useAdminAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ProductInput | null>(null)
  const [featuresText, setFeaturesText] = useState("")
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await adminApi.listProducts(token)
      setProducts(res.products)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement")
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const openEditor = (product?: Product) => {
    setError("")
    if (product) {
      const { _id, slug: _slug, ...input } = product
      setEditingId(_id)
      setForm(input)
      setFeaturesText(product.features.join("\n"))
    } else {
      setEditingId(null)
      setForm({ ...EMPTY_PRODUCT, sortOrder: products.length })
      setFeaturesText("")
    }
  }

  const save = async () => {
    if (!token || !form) return
    setSaving(true)
    setError("")
    const data: ProductInput = {
      ...form,
      features: featuresText
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean),
    }
    try {
      if (editingId) {
        await adminApi.updateProduct(token, editingId, data)
      } else {
        await adminApi.createProduct(token, data)
      }
      setForm(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (product: Product) => {
    if (!token || !confirm(`Supprimer "${product.name}" ?`)) return
    setError("")
    try {
      await adminApi.deleteProduct(token, product._id)
      setProducts((prev) => prev.filter((p) => p._id !== product._id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    }
  }

  const toggleActive = async (product: Product, active: boolean) => {
    if (!token) return
    const { _id, slug: _slug, ...input } = product
    try {
      await adminApi.updateProduct(token, _id, { ...input, active })
      setProducts((prev) => prev.map((p) => (p._id === _id ? { ...p, active } : p)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    }
  }

  return (
    <div className="p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">Catalogue</h1>
          <Button onClick={() => openEditor()}>
            <Plus className="w-4 h-4" />
            Nouveau produit
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Les produits actifs sont proposes a l&apos;inscription. Sans acompte propre, un produit utilise
          l&apos;acompte par defaut de la page Tarifs (jamais plus que son prix).
        </p>

        {error && !form && <p className="text-sm text-destructive">{error}</p>}

        <Card>
          <CardHeader>
            <CardTitle>{products.length} produit(s)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead className="text-right">Prix</TableHead>
                      <TableHead className="text-right">Acompte</TableHead>
                      <TableHead>Actif</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((p) => (
                      <TableRow key={p._id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {p.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.imageUrl} alt="" className="w-10 h-10 rounded object-cover bg-muted" />
                            ) : (
                              <div className="w-10 h-10 rounded bg-muted" />
                            )}
                            <div>
                              <div className="font-medium">{p.name}</div>
                              <div className="text-xs text-muted-foreground line-clamp-1">{p.description}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {PRODUCT_CATEGORY_LABELS[p.category] ?? p.category}
                          {p.material && <div className="text-xs text-muted-foreground">{p.material}</div>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap">
                          {p.priceIsFrom ? "des " : ""}
                          {formatXof(p.priceXof)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap text-sm">
                          {p.depositXof ? formatXof(p.depositXof) : <span className="text-muted-foreground">par defaut</span>}
                        </TableCell>
                        <TableCell>
                          <Switch checked={p.active} onCheckedChange={(v) => toggleActive(p, v)} />
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button variant="ghost" size="icon" onClick={() => openEditor(p)} aria-label="Modifier">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => remove(p)} aria-label="Supprimer">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!form} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="p-name">Nom</Label>
                <Input id="p-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-desc">Description</Label>
                <Textarea
                  id="p-desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="p-price">Prix (FCFA)</Label>
                  <Input
                    id="p-price"
                    type="number"
                    min={0}
                    value={form.priceXof || ""}
                    onChange={(e) => setForm({ ...form, priceXof: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Version / support</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm({ ...form, category: v as ProductCategory })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRODUCT_CATEGORY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-deposit">Acompte a l&apos;inscription (FCFA)</Label>
                <Input
                  id="p-deposit"
                  type="number"
                  min={0}
                  value={form.depositXof || ""}
                  onChange={(e) => setForm({ ...form, depositXof: Number(e.target.value) })}
                  placeholder="Vide = acompte par defaut (page Tarifs)"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="p-from"
                  checked={form.priceIsFrom}
                  onCheckedChange={(v) => setForm({ ...form, priceIsFrom: v })}
                />
                <Label htmlFor="p-from">Afficher « des » devant le prix</Label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="p-mat">Matiere</Label>
                  <Input
                    id="p-mat"
                    value={form.material}
                    onChange={(e) => setForm({ ...form, material: e.target.value })}
                    placeholder="PVC, metal, bois..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-order">Ordre d&apos;affichage</Label>
                  <Input
                    id="p-order"
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-img">URL de l&apos;image</Label>
                <Input
                  id="p-img"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-feat">Caracteristiques (une par ligne)</Label>
                <Textarea id="p-feat" rows={4} value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="p-active" checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                <Label htmlFor="p-active">Propose a l&apos;inscription</Label>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>
              Annuler
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
