import { useState, useEffect } from "react"
import { useCurrency } from "@/hooks/useCurrency"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Plus, Minus, X, ShoppingCart } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { checkStockAvailability } from "@/lib/utils/inventory-management"
import { Product, Store, PaymentMethod } from "@/integrations/supabase/types"
import { useAuth } from "@/contexts/AuthContext"
import { getUserAccessibleStores, canAccessStore } from "@/lib/utils/store-permissions"
import { SearchableSelect } from "@/components/SearchableSelect"

interface SaleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface CartItem {
  product: Product
  quantity: number
  unit_price: number
  total_price: number
  discount_reason?: string
}

export default function SaleModal({ open, onOpenChange, onSuccess }: SaleModalProps) {
  const { formatAmount } = useCurrency()
  const { userProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [stores, setStores] = useState<Store[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [storeProducts, setStoreProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [formData, setFormData] = useState({
    store_id: "",
    payment_method: "",
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    notes: ""
  })
  const [selectedProduct, setSelectedProduct] = useState("")
  const [productQuantity, setProductQuantity] = useState(1)
  const [customPrice, setCustomPrice] = useState("")
  const [discountReason, setDiscountReason] = useState("")
  const [taxRate, setTaxRate] = useState<number>(0)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      fetchStores()
      fetchProducts()
      resetForm()
      fetchTaxRate()
    }
  }, [open])

  const fetchTaxRate = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'sales.tax_rate')
        .maybeSingle()
      if (!error && data && data.setting_value) {
        const parsed = parseFloat(String(data.setting_value))
        if (!isNaN(parsed)) setTaxRate(parsed)
      }
    } catch (e) {
      console.warn('Impossible de charger sales.tax_rate, fallback 0%')
    }
  }

  const fetchStores = async () => {
    try {
      if (!userProfile?.id || !userProfile?.role) {
        setStores([])
        return
      }
      const accessible = await getUserAccessibleStores(userProfile.id, userProfile.role)
      setStores(accessible || [])
      // Pré-sélectionner si un seul magasin accessible
      if (accessible && accessible.length === 1) {
        setFormData(prev => ({ ...prev, store_id: accessible[0].id }))
      }
    } catch (error) {
      console.error('Erreur chargement magasins accessibles:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les magasins accessibles",
        variant: "destructive",
      })
      setStores([])
    }
  }

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, sku, current_sale_price, min_sale_price")

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les produits",
        variant: "destructive",
      })
    } else {
      setProducts(data || [])
    }
  }

  // Charger les produits disponibles pour le magasin sélectionné (filtre par stock)
  useEffect(() => {
    const loadStoreProducts = async () => {
      if (!formData.store_id) {
        setStoreProducts([])
        setSelectedProduct("")
        return
      }
      const { data, error } = await supabase
        .from('product_stores')
        .select('current_stock, products:products!inner(id, name, sku, current_sale_price, min_sale_price)')
        .eq('store_id', formData.store_id)
        .gt('current_stock', 0)

      if (error) {
        // En cas d'erreur, retomber sur la liste complète
        setStoreProducts([])
        return
      }
      const mapped: Product[] = (data || []).map((row: any) => row.products)
      setStoreProducts(mapped)
      // Réinitialiser le produit sélectionné si non disponible dans ce magasin
      if (selectedProduct && !mapped.find(p => p.id === selectedProduct)) {
        setSelectedProduct("")
      }
    }
    loadStoreProducts()
  }, [formData.store_id])

  const resetForm = () => {
    setFormData({
      store_id: "",
      payment_method: "",
      customer_name: "",
      customer_email: "",
      customer_phone: "",
      notes: ""
    })
    setCart([])
    setSelectedProduct("")
    setProductQuantity(1)
    setCustomPrice("")
    setDiscountReason("")
  }

  const addToCart = async () => {
    if (!selectedProduct || productQuantity <= 0) {
      toast({
        title: "Données manquantes",
        description: "Veuillez sélectionner un produit et une quantité",
        variant: "destructive",
      })
      return
    }

    if (!formData.store_id) {
      toast({
        title: "Magasin requis",
        description: "Veuillez sélectionner un magasin avant d'ajouter des produits",
        variant: "destructive",
      })
      return
    }

    const product = products.find(p => p.id === selectedProduct)
    if (!product) return

    const unitPrice = customPrice ? parseFloat(customPrice) : product.current_sale_price
    
    if (unitPrice < product.min_sale_price && !discountReason) {
      toast({
        title: "Prix minimum requis",
        description: "Veuillez spécifier une raison pour la réduction",
        variant: "destructive",
      })
      return
    }

    // Vérifier le stock disponible
    const stockCheck = await checkStockAvailability(
      formData.store_id,
      selectedProduct,
      productQuantity
    )

    if (!stockCheck.available) {
      toast({
        title: "Stock insuffisant",
        description: `Stock disponible: ${stockCheck.current_stock}, Quantité demandée: ${productQuantity}`,
        variant: "destructive",
      })
      return
    }

    const existingItem = cart.find(item => item.product.id === product.id && item.unit_price === unitPrice)
    
    if (existingItem) {
      const newTotalQuantity = existingItem.quantity + productQuantity
      
      // Vérifier le stock pour la quantité totale
      const totalStockCheck = await checkStockAvailability(
        formData.store_id,
        selectedProduct,
        newTotalQuantity
      )

      if (!totalStockCheck.available) {
        toast({
          title: "Stock insuffisant",
          description: `Stock disponible: ${totalStockCheck.current_stock}, Quantité totale demandée: ${newTotalQuantity}`,
          variant: "destructive",
        })
        return
      }

      setCart(cart.map(item => 
        item.product.id === product.id && item.unit_price === unitPrice
          ? { ...item, quantity: newTotalQuantity, total_price: newTotalQuantity * unitPrice }
          : item
      ))
    } else {
      setCart([...cart, {
        product,
        quantity: productQuantity,
        unit_price: unitPrice,
        total_price: productQuantity * unitPrice,
        discount_reason: unitPrice < product.current_sale_price ? discountReason : undefined
      }])
    }

    setSelectedProduct("")
    setProductQuantity(1)
    setCustomPrice("")
    setDiscountReason("")
  }

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index))
  }

  const updateCartQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(index)
      return
    }
    
    setCart(cart.map((item, i) => 
      i === index 
        ? { ...item, quantity: newQuantity, total_price: newQuantity * item.unit_price }
        : item
    ))
  }

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.total_price, 0)
  }

  const calculateTax = () => {
    return calculateSubtotal() * (taxRate / 100)
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax()
  }

  const generateSaleCode = () => {
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.random().toString(36).substring(2, 5).toUpperCase()
    return `VTE${timestamp}${random}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.store_id || !formData.payment_method || cart.length === 0) {
      toast({
        title: "Données manquantes",
        description: "Veuillez remplir tous les champs requis et ajouter des articles",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const saleCode = generateSaleCode()
      const subtotal = calculateSubtotal()
      const taxAmount = calculateTax()
      const totalAmount = calculateTotal()

      if (!userProfile?.id) {
        toast({ title: "Erreur", description: "Profil utilisateur invalide", variant: "destructive" })
        setLoading(false)
        return
      }

      // Vérifier l'accès au magasin sélectionné pour Vendeur/Manager
      const hasAccess = await canAccessStore(userProfile.id, formData.store_id, userProfile.role as string)
      if (!hasAccess) {
        toast({
          title: "Magasin non assigné",
          description: "Vous devez être assigné à ce magasin pour enregistrer une vente.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Créer la vente
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          sale_code: saleCode,
          store_id: formData.store_id,
          payment_method: formData.payment_method as any,
          customer_name: formData.customer_name || null,
          customer_email: formData.customer_email || null,
          customer_phone: formData.customer_phone || null,
          subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          notes: formData.notes || null,
          sold_by: userProfile.id
        })
        .select()
        .single()

      if (saleError) throw saleError

      // Créer les articles de vente (avec product_name et product_sku requis par le schéma)
      const saleItems = cart.map(item => ({
        sale_id: sale.id,
        product_id: item.product.id,
        product_name: item.product.name,
        product_sku: item.product.sku,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        discount_reason: item.discount_reason
      }))

      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(saleItems)

      if (itemsError) throw itemsError

      // Le stock sera décrémenté par le trigger DB après insertion des sale_items

      toast({
        title: "Vente enregistrée",
        description: `Code de vente: ${saleCode}`,
      })

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Erreur création vente:', error)
      toast({
        title: "Erreur",
        description: "Erreur lors de l'enregistrement de la vente",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedProductData = products.find(p => p.id === selectedProduct)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] sm:max-w-xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Nouvelle Vente
          </DialogTitle>
          <DialogDescription>
            Créer une nouvelle transaction de vente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="store">Magasin *</Label>
              <SearchableSelect
                value={formData.store_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, store_id: value }))}
                options={stores.map(s => ({ value: s.id, label: s.name }))}
                placeholder="Sélectionner un magasin"
                triggerClassName="h-10 sm:h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">Méthode de paiement *</Label>
              <SearchableSelect
                value={formData.payment_method}
                onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}
                options={[
                  { value: 'cash', label: 'Espèces' },
                  { value: 'card', label: 'Carte bancaire' },
                  { value: 'mobile_money', label: 'Mobile Money' },
                  { value: 'bank_transfer', label: 'Virement bancaire' },
                  { value: 'check', label: 'Chèque' },
                ]}
                placeholder="Sélectionner une méthode"
                triggerClassName="h-10 sm:h-12"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer_name">Nom du client</Label>
              <Input
                id="customer_name"
                value={formData.customer_name}
                onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                placeholder="Nom du client"
                className="h-10 sm:h-12 text-sm sm:text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_email">Email</Label>
              <Input
                id="customer_email"
                type="email"
                value={formData.customer_email}
                onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                placeholder="email@exemple.com"
                className="h-10 sm:h-12 text-sm sm:text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_phone">Téléphone</Label>
              <Input
                id="customer_phone"
                value={formData.customer_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                placeholder="Numéro de téléphone"
                className="h-10 sm:h-12 text-sm sm:text-base"
              />
            </div>
          </div>

          {/* Ajouter des articles */}
          <Card>
            <CardHeader>
              <CardTitle>Ajouter des articles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label>Produit</Label>
                  <SearchableSelect
                    value={selectedProduct}
                    onValueChange={setSelectedProduct}
                    options={(formData.store_id ? storeProducts : products).map(p => ({ value: p.id, label: `${p.name} - ${p.sku}` }))}
                    placeholder="Sélectionner"
                    triggerClassName="h-10 sm:h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Quantité</Label>
                  <Input
                    type="number"
                    min="1"
                    value={productQuantity}
                    onChange={(e) => setProductQuantity(parseInt(e.target.value) || 1)}
                    className="h-10 sm:h-12 text-sm sm:text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Prix unitaire</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={selectedProductData?.current_sale_price.toString() || "0"}
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className="h-10 sm:h-12 text-sm sm:text-base"
                  />
                  {selectedProductData && (
                    <p className="text-xs text-muted-foreground">
                      Prix normal: {formatAmount(selectedProductData.current_sale_price)} | Min: {formatAmount(selectedProductData.min_sale_price)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Raison réduction</Label>
                  <Input
                    placeholder="Si prix réduit"
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    disabled={!customPrice || parseFloat(customPrice) >= (selectedProductData?.current_sale_price || 0)}
                    className="h-10 sm:h-12 text-sm sm:text-base disabled:opacity-60"
                  />
                </div>

                <div className="flex items-end">
                  <Button 
                    type="button" 
                    onClick={addToCart}
                    disabled={!selectedProduct}
                    className="gap-2 w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Panier */}
          {cart.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Panier ({cart.length} article{cart.length > 1 ? 's' : ''})</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Desktop table */}
                <Table className="hidden sm:table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead>Prix unitaire</TableHead>
                      <TableHead>Quantité</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.product.name}</p>
                            <p className="text-sm text-muted-foreground">{item.product.sku}</p>
                            {item.discount_reason && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                {item.discount_reason}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatAmount(item.unit_price)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => updateCartQuantity(index, item.quantity - 1)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => updateCartQuantity(index, item.quantity + 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{formatAmount(item.total_price)}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Mobile cards */}
                <div className="space-y-3 sm:hidden">
                  {cart.map((item, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.product.name}</p>
                          <p className="text-xs text-muted-foreground">{item.product.sku}</p>
                          {item.discount_reason && (
                            <Badge variant="secondary" className="text-xs mt-1">{item.discount_reason}</Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">PU</div>
                          <div className="font-medium">{formatAmount(item.unit_price)}</div>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Quantité</span>
                          <div className="flex items-center gap-2 mt-1">
                            <Button type="button" variant="outline" size="sm" onClick={() => updateCartQuantity(index, item.quantity - 1)}>
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button type="button" variant="outline" size="sm" onClick={() => updateCartQuantity(index, item.quantity + 1)}>
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-muted-foreground">Total</span>
                          <div className="font-medium">{formatAmount(item.total_price)}</div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-end">
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeFromCart(index)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-2 text-right">
                  <div className="flex justify-between">
                    <span>Sous-total:</span>
                    <span>{formatAmount(calculateSubtotal())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TVA ({taxRate}%):</span>
                    <span>{formatAmount(calculateTax())}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>{formatAmount(calculateTotal())}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Notes optionnelles..."
              className="text-sm sm:text-base"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Annuler
            </Button>
            <Button type="submit" disabled={loading || cart.length === 0} className="w-full sm:w-auto">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer la vente
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
