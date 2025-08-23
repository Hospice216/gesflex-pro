import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelect } from "@/components/SearchableSelect"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, RefreshCw } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { Sale, Product } from "@/integrations/supabase/types"
import { canAccessStore } from "@/lib/utils/store-permissions"
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
        .select("*")
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
      const errorMessage = handleSupabaseError(error, 'search sale')
      toast({
        title: "Erreur",
        description: errorMessage.error,
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

    // Validation côté client: quantité retournée ne doit pas dépasser la quantité vendue
    const returnedItem = selectedReturnedItem
    if (!returnedItem) {
      toast({ title: "Produit manquant", description: "Sélectionnez le produit à retourner", variant: "destructive" })
      return
    }
    if (formData.returned_quantity > (returnedItem.quantity || 0)) {
      toast({ title: "Quantité invalide", description: "La quantité retournée dépasse la quantité vendue", variant: "destructive" })
      return
    }

    setLoading(true)

    try {
      const returnCode = generateReturnCode()
      const priceDifference = calculatePriceDifference()

      if (!userProfile?.id || !userProfile?.role) {
        toast({ title: "Erreur", description: "Profil utilisateur invalide", variant: "destructive" })
        setLoading(false)
        return
      }

      // Vérifier l'accès au magasin de la vente d'origine (store_id dans saleData)
      const originalSale = saleData
      if (!originalSale) {
        toast({ title: "Erreur", description: "Vente d'origine introuvable", variant: "destructive" })
        setLoading(false)
        return
      }
      const { data: saleStore } = await supabase.from('sales').select('store_id').eq('id', originalSale.id).single()
      const hasAccess = saleStore?.store_id
        ? await canAccessStore(userProfile.id, saleStore.store_id, userProfile.role)
        : false
      if (!hasAccess) {
        toast({
          title: "Magasin non assigné",
          description: "Vous devez être assigné au magasin de la vente pour traiter un retour/échange.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Validation côté client: en cas d'échange, vérifier le stock disponible dans le magasin de la vente
      if (formData.new_product_id) {
        const { data: psData, error: psError } = await supabase
          .from('product_stores')
          .select('current_stock')
          .eq('product_id', formData.new_product_id)
          .eq('store_id', saleStore.store_id)
          .limit(1)
        if (psError) {
          // Ne pas bloquer si la ligne n'existe pas; on traitera comme stock 0
          console.warn('Erreur lecture stock échange:', psError)
        }
        const currentStock = psData && psData.length > 0 ? (psData[0] as any).current_stock as number : 0
        if (currentStock < formData.new_quantity) {
          toast({
            title: 'Stock insuffisant',
            description: "Stock insuffisant pour le produit d'échange dans ce magasin",
            variant: 'destructive',
          })
          setLoading(false)
          return
        }
      }

      // 1) Créer l'en-tête de retour
      const { data: createdReturn, error: returnError } = await supabase
        .from('returns')
        .insert({
          return_code: returnCode,
          original_sale_id: saleData.id,
          customer_name: saleData.customer_name || 'Client anonyme',
          customer_email: saleData.customer_email || null,
          customer_phone: saleData.customer_phone || null,
          return_reason: formData.reason,
          return_status: 'pending',
          processed_by: userProfile.id,
          processed_at: null,
        })
        .select()
        .single()

      if (returnError) throw returnError

      // 2) Créer la ligne du retour
      const exchangeProduct = selectedNewProduct
      const exchangeUnitPrice = exchangeProduct ? exchangeProduct.current_sale_price : null
      const exchangeTotalPrice = exchangeProduct ? (exchangeUnitPrice as number) * formData.new_quantity : null

      const { error: returnItemError } = await supabase
        .from('return_items')
        .insert({
          return_id: createdReturn.id,
          original_sale_item_id: returnedItem?.id as string,
          product_id: returnedItem?.product_id as string,
          product_name: returnedItem?.products?.name as string,
          product_sku: returnedItem?.products?.sku as string,
          returned_quantity: formData.returned_quantity,
          original_unit_price: returnedItem?.unit_price as number,
          original_total_price: (returnedItem?.unit_price as number) * formData.returned_quantity,
          exchange_product_id: formData.new_product_id || null,
          exchange_quantity: formData.new_product_id ? formData.new_quantity : null,
          exchange_unit_price: exchangeUnitPrice,
          exchange_total_price: exchangeTotalPrice,
          price_difference: priceDifference,
        })

      if (returnItemError) throw returnItemError

      toast({
        title: "Retour/Échange enregistré",
        description: `Code: ${returnCode}`,
      })

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Erreur création retour/échange:', error)
      const result = handleSupabaseError(error, 'create return/exchange')
      toast({
        title: "Erreur",
        description: result.error,
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
      <DialogContent className="w-[92vw] max-w-md sm:max-w-xl md:max-w-3xl max-h-[90vh] overflow-y-auto">
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
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <Label htmlFor="sale_code">Code de vente</Label>
                  <Input
                    id="sale_code"
                    value={saleCode}
                    onChange={(e) => setSaleCode(e.target.value)}
                    placeholder="Ex: VTE123456"
                    className="h-10 sm:h-12 text-sm sm:text-base"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="button" onClick={searchSale} disabled={searchLoading} className="w-full sm:w-auto">
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
                      <SearchableSelect
                        value={formData.returned_product_id}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, returned_product_id: value }))}
                        options={saleData.sale_items.map(item => ({ value: item.product_id, label: `${item.products.name} - ${item.products.sku} (Qté: ${item.quantity})` }))}
                        placeholder="Sélectionner"
                        triggerClassName="h-10 sm:h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Quantité à retourner</Label>
                      <Input
                        type="number"
                        min="1"
                        max={selectedReturnedItem?.quantity || 1}
                        value={formData.returned_quantity}
                        onChange={(e) => setFormData(prev => ({ ...prev, returned_quantity: parseInt(e.target.value) || 1 }))}
                        className="h-10 sm:h-12 text-sm sm:text-base"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>État du produit</Label>
                      <Select value={formData.product_condition} onValueChange={(value) => setFormData(prev => ({ ...prev, product_condition: value }))}>
                        <SelectTrigger className="h-10 sm:h-12">
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
                      <SearchableSelect
                        value={formData.new_product_id}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, new_product_id: value }))}
                        options={products.map(p => ({ value: p.id, label: `${p.name} - ${p.sku} (${p.current_sale_price}€)` }))}
                        placeholder="Aucun échange"
                        triggerClassName="h-10 sm:h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Quantité</Label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.new_quantity}
                        onChange={(e) => setFormData(prev => ({ ...prev, new_quantity: parseInt(e.target.value) || 1 }))}
                        disabled={!formData.new_product_id}
                        className="h-10 sm:h-12 text-sm sm:text-base disabled:opacity-60"
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
                  className="text-sm sm:text-base"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                  Annuler
                </Button>
                <Button type="submit" disabled={loading} className="w-full sm:w-auto">
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