import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, RefreshCw } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { Sale, Product } from "@/integrations/supabase/types"
import { handleSupabaseError } from "@/lib/utils/supabase-helpers"

interface ReturnExchangeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface SaleData extends Sale {
  sale_items: {
    id: string
    product_id: string
    quantity: number
    unit_price: number
    products: {
      id: string
      name: string
      sku: string
    }
  }[]
}

export default function ReturnExchangeModal({ open, onOpenChange, onSuccess }: ReturnExchangeModalProps) {
  const { user, userProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [saleCode, setSaleCode] = useState("")
  const [saleData, setSaleData] = useState<SaleData | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [formData, setFormData] = useState({
    returned_product_id: "",
    returned_quantity: 1,
    product_condition: "good",
    new_product_id: "",
    new_quantity: 1,
    reason: ""
  })
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      fetchProducts()
      resetForm()
    }
  }, [open])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, current_sale_price")
        .eq("is_active", true)
        .order("name")

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Erreur chargement produits:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les produits",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setSaleCode("")
    setSaleData(null)
    setFormData({
      returned_product_id: "",
      returned_quantity: 1,
      product_condition: "good",
      new_product_id: "",
      new_quantity: 1,
      reason: ""
    })
  }

  const searchSale = async () => {
    if (!saleCode.trim()) {
      toast({
        title: "Code requis",
        description: "Veuillez saisir un code de vente",
        variant: "destructive",
      })
      return
    }

    setSearchLoading(true)

    try {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          sale_items (
            id,
            product_id,
            quantity,
            unit_price,
            products (
              id,
              name,
              sku
            )
          )
        `)
        .eq("sale_code", saleCode.trim())
        .single()

      if (error) throw error

      if (data) {
        setSaleData(data as SaleData)
        toast({
          title: "Vente trouvée",
          description: `Vente ${data.sale_code} trouvée`,
        })
      } else {
        toast({
          title: "Vente non trouvée",
          description: "Aucune vente avec ce code",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Erreur recherche vente:', error)
      const errorMessage = handleSupabaseError(error)
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setSearchLoading(false)
    }
  }

  const generateReturnCode = () => {
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.random().toString(36).substring(2, 5).toUpperCase()
    return `RET${timestamp}${random}`
  }

  const calculatePriceDifference = () => {
    if (!formData.new_product_id || !formData.returned_product_id) return 0

    const returnedProduct = saleData?.sale_items.find(item => item.product_id === formData.returned_product_id)
    const newProduct = products.find(p => p.id === formData.new_product_id)

    if (!returnedProduct || !newProduct) return 0

    const returnedValue = returnedProduct.unit_price * formData.returned_quantity
    const newValue = newProduct.current_sale_price * formData.new_quantity

    return newValue - returnedValue
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!saleData || !formData.returned_product_id || !formData.reason) {
      toast({
        title: "Données manquantes",
        description: "Veuillez remplir tous les champs requis",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const returnCode = generateReturnCode()
      const priceDifference = calculatePriceDifference()

      const { error } = await supabase
        .from("returns_exchanges")
        .insert({
          return_code: returnCode,
          sale_id: saleData.id,
          original_sale_code: saleData.sale_code,
          returned_product_id: formData.returned_product_id,
          returned_quantity: formData.returned_quantity,
          product_condition: formData.product_condition as any,
          new_product_id: formData.new_product_id || null,
          new_quantity: formData.new_quantity || 0,
          price_difference: priceDifference,
          reason: formData.reason,
          processed_by: (await supabase.auth.getUser()).data.user?.id
        })

      if (error) throw error

      toast({
        title: "Retour/Échange enregistré",
        description: `Code: ${returnCode}`,
      })

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Erreur création retour/échange:', error)
      const errorMessage = handleSupabaseError(error)
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedReturnedItem = saleData?.sale_items.find(item => item.product_id === formData.returned_product_id)
  const selectedNewProduct = products.find(p => p.id === formData.new_product_id)
  const priceDifference = calculatePriceDifference()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Nouveau Retour/Échange
          </DialogTitle>
          <DialogDescription>
            Traiter un retour ou un échange de produit
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Recherche de vente */}
          <Card>
            <CardHeader>
              <CardTitle>1. Rechercher la vente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="sale_code">Code de vente</Label>
                  <Input
                    id="sale_code"
                    value={saleCode}
                    onChange={(e) => setSaleCode(e.target.value)}
                    placeholder="Ex: VTE123456"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="button" onClick={searchSale} disabled={searchLoading}>
                    {searchLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="mr-2 h-4 w-4" />
                    )}
                    Rechercher
                  </Button>
                </div>
              </div>

              {saleData && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Informations de la vente</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Code:</strong> {saleData.sale_code}</p>
                      <p><strong>Date:</strong> {new Date(saleData.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p><strong>Client:</strong> {saleData.customer_name || "Client anonyme"}</p>
                      <p><strong>Email:</strong> {saleData.customer_email || "Non renseigné"}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {saleData && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Produit à retourner */}
              <Card>
                <CardHeader>
                  <CardTitle>2. Produit à retourner</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Produit</Label>
                      <Select value={formData.returned_product_id} onValueChange={(value) => setFormData(prev => ({ ...prev, returned_product_id: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          {saleData.sale_items.map((item) => (
                            <SelectItem key={item.id} value={item.product_id}>
                              {item.products.name} - {item.products.sku} (Qté: {item.quantity})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Quantité à retourner</Label>
                      <Input
                        type="number"
                        min="1"
                        max={selectedReturnedItem?.quantity || 1}
                        value={formData.returned_quantity}
                        onChange={(e) => setFormData(prev => ({ ...prev, returned_quantity: parseInt(e.target.value) || 1 }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>État du produit</Label>
                      <Select value={formData.product_condition} onValueChange={(value) => setFormData(prev => ({ ...prev, product_condition: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="good">Bon état</SelectItem>
                          <SelectItem value="damaged">Endommagé</SelectItem>
                          <SelectItem value="defective">Défectueux</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Échange (optionnel) */}
              <Card>
                <CardHeader>
                  <CardTitle>3. Échange (optionnel)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nouveau produit</Label>
                      <Select value={formData.new_product_id} onValueChange={(value) => setFormData(prev => ({ ...prev, new_product_id: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Aucun échange" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - {product.sku} ({product.current_sale_price}€)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Quantité</Label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.new_quantity}
                        onChange={(e) => setFormData(prev => ({ ...prev, new_quantity: parseInt(e.target.value) || 1 }))}
                        disabled={!formData.new_product_id}
                      />
                    </div>
                  </div>

                  {formData.new_product_id && selectedNewProduct && selectedReturnedItem && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Calcul de la différence</h4>
                      <div className="text-sm space-y-1">
                        <p>Valeur retournée: {(selectedReturnedItem.unit_price * formData.returned_quantity).toFixed(2)}€</p>
                        <p>Valeur nouveau produit: {(selectedNewProduct.current_sale_price * formData.new_quantity).toFixed(2)}€</p>
                        <p className={`font-medium ${priceDifference >= 0 ? 'text-warning' : 'text-success'}`}>
                          Différence: {priceDifference >= 0 ? '+' : ''}{priceDifference.toFixed(2)}€
                          {priceDifference > 0 && " (à payer)"}
                          {priceDifference < 0 && " (à rembourser)"}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Raison */}
              <div className="space-y-2">
                <Label htmlFor="reason">Raison du retour/échange *</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Expliquez la raison du retour ou de l'échange..."
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}