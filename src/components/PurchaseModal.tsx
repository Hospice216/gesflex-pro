import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelect } from "@/components/SearchableSelect"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Store, Supplier, Product, Purchase } from "@/integrations/supabase/types"
import { handleSupabaseError } from "@/lib/utils/supabase-helpers"
import { isValidAmount } from "@/lib/utils/financial-calculations"

interface PurchaseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  purchase?: Purchase
}

export function PurchaseModal({ isOpen, onClose, onSuccess, purchase }: PurchaseModalProps) {
  
  const { user, userProfile } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [stores, setStores] = useState<Store[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  
  const [formData, setFormData] = useState({
    store_id: "",
    supplier_id: "",
    product_id: "",
    quantity: "",
    unit_price: ""
  })

  useEffect(() => {
    if (isOpen) {
      loadStores()
      loadSuppliers()
      loadProducts()
      
      if (purchase) {
        setFormData({
          store_id: purchase.store_id || "",
          supplier_id: purchase.supplier_id || "",
          product_id: purchase.product_id || "",
          quantity: purchase.quantity?.toString() || "",
          unit_price: purchase.unit_price?.toString() || ""
        })
      } else {
        setFormData({
          store_id: "",
          supplier_id: "",
          product_id: "",
          quantity: "",
          unit_price: ""
        })
      }
    }
  }, [isOpen, purchase])

  const loadStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setStores(data || [])
    } catch (error) {
      console.error('Error loading stores:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les magasins",
        variant: "destructive",
      })
    }
  }

  const loadSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setSuppliers(data || [])
    } catch (error) {
      console.error('Error loading suppliers:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les fournisseurs",
        variant: "destructive",
      })
    }
  }

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, units(name, symbol)')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error loading products:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les produits",
        variant: "destructive",
      })
    }
  }

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId)
    setSelectedProduct(product || null)
    setFormData(prev => ({ ...prev, product_id: productId }))
  }

  const calculateTotalAmount = () => {
    const quantity = parseFloat(formData.quantity) || 0
    const unitPrice = parseFloat(formData.unit_price) || 0
    return quantity * unitPrice
  }

  const validateForm = () => {
    if (!formData.store_id) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un magasin",
        variant: "destructive",
      })
      return false
    }
    
    if (!formData.supplier_id) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fournisseur",
        variant: "destructive",
      })
      return false
    }
    
    if (!formData.product_id) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un produit",
        variant: "destructive",
      })
      return false
    }
    
    if (!formData.quantity || parseInt(formData.quantity) <= 0) {
      toast({
        title: "Erreur",
        description: "La quantité doit être supérieure à 0",
        variant: "destructive",
      })
      return false
    }
    
    if (!formData.unit_price || !isValidAmount(parseFloat(formData.unit_price))) {
      toast({
        title: "Erreur",
        description: "Le prix unitaire doit être valide",
        variant: "destructive",
      })
      return false
    }
    
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !userProfile) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour créer un achat",
        variant: "destructive",
      })
      return
    }
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)

    try {
      const totalAmount = calculateTotalAmount()
      
      const purchaseData = {
        store_id: formData.store_id,
        supplier_id: formData.supplier_id,
        product_id: formData.product_id,
        quantity: parseInt(formData.quantity),
        unit_price: parseFloat(formData.unit_price),
        total_amount: totalAmount,
        created_by: userProfile.id
      }

      if (purchase) {
        const { error } = await supabase
          .from('purchases')
          .update(purchaseData)
          .eq('id', purchase.id)

        if (error) throw error

        toast({
          title: "Succès",
          description: "Achat modifié avec succès",
        })
      } else {
        const { error } = await supabase
          .from('purchases')
          .insert([purchaseData])

        if (error) throw error

        toast({
          title: "Succès",
          description: "Achat créé avec succès",
        })
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error saving purchase:', error)
      const errorMessage = handleSupabaseError(error, 'save purchase')
      toast({
        title: "Erreur",
        description: errorMessage.error,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {purchase ? "Modifier l'achat" : "Nouvel achat"}
          </DialogTitle>
          <DialogDescription>
            {purchase ? "Modifiez les informations de l'achat" : "Créez une nouvelle commande fournisseur"}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="store">Magasin *</Label>
              <SearchableSelect
                value={formData.store_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, store_id: value }))}
                options={stores.map(s => ({ value: s.id, label: s.name }))}
                placeholder="Sélectionner un magasin"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="supplier">Fournisseur *</Label>
              <SearchableSelect
                value={formData.supplier_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, supplier_id: value }))}
                options={suppliers.map(s => ({ value: s.id, label: s.name }))}
                placeholder="Sélectionner un fournisseur"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="product">Produit *</Label>
            <SearchableSelect
              value={formData.product_id}
              onValueChange={handleProductChange}
              options={products.map(p => ({ value: p.id, label: `${p.name} - ${p.sku}` }))}
              placeholder="Sélectionner un produit"
            />
            {selectedProduct && (
              <p className="text-sm text-muted-foreground">
                Unité: {selectedProduct.units?.name} ({selectedProduct.units?.symbol})
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantité *</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                required
                min="1"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="unit_price">Prix unitaire (XOF) *</Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                value={formData.unit_price}
                onChange={(e) => setFormData(prev => ({ ...prev, unit_price: e.target.value }))}
                required
                min="0"
              />
            </div>
          </div>

          {formData.quantity && formData.unit_price && (
            <div className="bg-muted p-4 rounded-md">
              <p className="text-sm font-medium">
                Montant total: {calculateTotalAmount().toLocaleString()} XOF
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement..." : (purchase ? "Modifier" : "Créer")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

