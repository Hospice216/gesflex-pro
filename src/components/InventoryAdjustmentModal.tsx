import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Package } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface InventoryAdjustmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  productId?: string
  storeId?: string
}

interface Product {
  id: string
  name: string
  sku: string
}

interface Store {
  id: string
  name: string
}

export default function InventoryAdjustmentModal({ 
  open, 
  onOpenChange, 
  onSuccess, 
  productId,
  storeId 
}: InventoryAdjustmentModalProps) {
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [currentStock, setCurrentStock] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    product_id: productId || "",
    store_id: storeId || "",
    adjustment_type: "set", // "set", "add", "subtract"
    quantity: 0,
    reason: ""
  })
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      fetchProducts()
      fetchStores()
      resetForm()
    }
  }, [open])

  useEffect(() => {
    if (formData.product_id && formData.store_id) {
      fetchCurrentStock()
    }
  }, [formData.product_id, formData.store_id])

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, sku")
      .order("name")

    if (error) {
      console.error('Erreur chargement produits:', error)
    } else {
      setProducts(data || [])
    }
  }

  const fetchStores = async () => {
    const { data, error } = await supabase
      .from("stores")
      .select("id, name")
      .eq("is_active", true)
      .order("name")

    if (error) {
      console.error('Erreur chargement magasins:', error)
    } else {
      setStores(data || [])
    }
  }

  const fetchCurrentStock = async () => {
    const { data, error } = await supabase
      .from("inventory")
      .select("quantity")
      .eq("product_id", formData.product_id)
      .eq("store_id", formData.store_id)
      .maybeSingle()

    if (error) {
      console.error('Erreur chargement stock:', error)
      setCurrentStock(0)
    } else {
      setCurrentStock(data?.quantity || 0)
    }
  }

  const resetForm = () => {
    setFormData({
      product_id: productId || "",
      store_id: storeId || "",
      adjustment_type: "set",
      quantity: 0,
      reason: ""
    })
    setCurrentStock(null)
  }

  const calculateNewStock = () => {
    if (currentStock === null) return 0

    switch (formData.adjustment_type) {
      case "set":
        return formData.quantity
      case "add":
        return currentStock + formData.quantity
      case "subtract":
        return Math.max(0, currentStock - formData.quantity)
      default:
        return currentStock
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.product_id || !formData.store_id || !formData.reason) {
      toast({
        title: "Données manquantes",
        description: "Veuillez remplir tous les champs requis",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const newStock = calculateNewStock()
      
      // Vérifier si l'entrée d'inventaire existe
      const { data: existing } = await supabase
        .from("inventory")
        .select("id")
        .eq("product_id", formData.product_id)
        .eq("store_id", formData.store_id)
        .maybeSingle()

      if (existing) {
        // Mettre à jour
        const { error } = await supabase
          .from("inventory")
          .update({ 
            quantity: newStock,
            updated_at: new Date().toISOString()
          })
          .eq("id", existing.id)

        if (error) throw error
      } else {
        // Créer
        const { error } = await supabase
          .from("inventory")
          .insert({
            product_id: formData.product_id,
            store_id: formData.store_id,
            quantity: newStock
          })

        if (error) throw error
      }

      // TODO: Enregistrer l'historique de l'ajustement quand la table sera créée

      toast({
        title: "Stock ajusté",
        description: `Nouveau stock: ${newStock}`,
      })

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Erreur ajustement stock:', error)
      toast({
        title: "Erreur",
        description: "Erreur lors de l'ajustement du stock",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedProduct = products.find(p => p.id === formData.product_id)
  const selectedStore = stores.find(s => s.id === formData.store_id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Ajustement de Stock
          </DialogTitle>
          <DialogDescription>
            Modifier la quantité en stock d'un produit
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Produit</Label>
            <Select 
              value={formData.product_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, product_id: value }))}
              disabled={!!productId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un produit" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} - {product.sku}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Magasin</Label>
            <Select 
              value={formData.store_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, store_id: value }))}
              disabled={!!storeId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un magasin" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {currentStock !== null && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Stock actuel:</strong> {currentStock} unités
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Type d'ajustement</Label>
            <Select 
              value={formData.adjustment_type} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, adjustment_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="set">Définir la quantité</SelectItem>
                <SelectItem value="add">Ajouter à la quantité</SelectItem>
                <SelectItem value="subtract">Retirer de la quantité</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              Quantité
              {formData.adjustment_type === "set" && " (nouvelle quantité)"}
              {formData.adjustment_type === "add" && " (à ajouter)"}
              {formData.adjustment_type === "subtract" && " (à retirer)"}
            </Label>
            <Input
              type="number"
              min="0"
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
              required
            />
          </div>

          {currentStock !== null && (
            <div className="p-3 bg-primary/5 rounded-lg">
              <p className="text-sm font-medium">
                Nouveau stock: {calculateNewStock()} unités
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Raison de l'ajustement *</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Ex: Inventaire physique, casse, vol, correction d'erreur..."
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading || currentStock === null}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ajuster le stock
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}