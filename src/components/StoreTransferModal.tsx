import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelect } from "@/components/SearchableSelect"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Package, Truck } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { Product, Store } from "@/integrations/supabase/types"
import { createStoreTransfer, checkStockAvailability } from "@/lib/utils/inventory-management"
import { handleSupabaseError } from "@/lib/utils/supabase-helpers"
import { getUserAccessibleStores, getAllStores, canCreateTransfer } from "@/lib/utils/store-permissions"

// Interface pour les magasins simplifiés retournés par les fonctions de permissions
interface SimpleStore {
  id: string
  name: string
}

interface StoreTransferModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function StoreTransferModal({ 
  open, 
  onOpenChange, 
  onSuccess 
}: StoreTransferModalProps) {
  const { toast } = useToast()
  const { user, userProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<{ id: string; name: string; sku: string }[]>([])
  const [sourceStores, setSourceStores] = useState<SimpleStore[]>([])
  const [destinationStores, setDestinationStores] = useState<SimpleStore[]>([])
  const [currentStock, setCurrentStock] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    source_store_id: "",
    destination_store_id: "",
    product_id: "",
    quantity: 0,
    notes: ""
  })

  useEffect(() => {
    if (open) {
      fetchProducts()
      fetchStores()
      resetForm()
    }
  }, [open])

  useEffect(() => {
    if (formData.source_store_id && formData.product_id) {
      fetchCurrentStock()
    }
  }, [formData.source_store_id, formData.product_id])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku")
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

  // ✅ CORRECTION : Récupération des magasins selon les permissions de l'utilisateur
  const fetchStores = async () => {
    try {
      if (!userProfile?.id || !userProfile?.role) {
        toast({
          title: "Erreur",
          description: "Informations utilisateur manquantes",
          variant: "destructive",
        })
        return
      }

      // ✅ LOGIQUE CORRIGÉE : 
      // - Magasins source : seulement les magasins assignés à l'utilisateur
      // - Magasins destination : TOUS les magasins (pour permettre les transferts inter-magasins)
      
      const [accessibleSourceStores, allDestinationStores] = await Promise.all([
        getUserAccessibleStores(userProfile.id, userProfile.role),
        getAllStores()
      ])

      setSourceStores(accessibleSourceStores)
      setDestinationStores(allDestinationStores)

      // ✅ VÉRIFICATIONS ET FEEDBACK UTILISATEUR
      if (accessibleSourceStores.length === 0) {
        toast({
          title: "Attention",
          description: "Aucun magasin source accessible. Contactez votre administrateur.",
          variant: "destructive",
        })
      }

      if (allDestinationStores.length === 0) {
        toast({
          title: "Attention",
          description: "Aucun magasin destination disponible. Contactez votre administrateur.",
          variant: "destructive",
        })
      }

      // ✅ LOG DE CONFIRMATION
      console.log(`✅ Magasins chargés - Source: ${accessibleSourceStores.length}, Destination: ${allDestinationStores.length}`)
    } catch (error) {
      console.error('Erreur chargement magasins:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des magasins",
        variant: "destructive",
      })
    }
  }

  const fetchCurrentStock = async () => {
    try {
      const { data, error } = await supabase
        .from("product_stores")
        .select("current_stock")
        .eq("product_id", formData.product_id)
        .eq("store_id", formData.source_store_id)
        .single()

      if (error) throw error
      setCurrentStock(data?.current_stock || 0)
    } catch (error) {
      console.error('Erreur chargement stock:', error)
      setCurrentStock(0)
    }
  }

  const resetForm = () => {
    setFormData({
      source_store_id: "",
      destination_store_id: "",
      product_id: "",
      quantity: 0,
      notes: ""
    })
    setCurrentStock(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // ✅ VALIDATION COMPLÈTE DES DONNÉES
    if (!formData.source_store_id || !formData.destination_store_id || !formData.product_id || formData.quantity <= 0) {
      toast({
        title: "Données manquantes",
        description: "Veuillez remplir tous les champs requis",
        variant: "destructive",
      })
      return
    }

    // ✅ VÉRIFICATION DES MAGASINS
    if (formData.source_store_id === formData.destination_store_id) {
      toast({
        title: "Magasins identiques",
        description: "Le magasin source et destination ne peuvent pas être identiques",
        variant: "destructive",
      })
      return
    }

    // ✅ VÉRIFICATION DES PERMISSIONS
    if (!userProfile?.id || !userProfile?.role) {
      toast({
        title: "Erreur",
        description: "Informations utilisateur manquantes",
        variant: "destructive",
      })
      return
    }

    // ✅ VÉRIFICATION QUE LE MAGASIN SOURCE EST ACCESSIBLE
    const sourceStoreAccessible = sourceStores.some(store => store.id === formData.source_store_id)
    if (!sourceStoreAccessible) {
      toast({
        title: "Permission refusée",
        description: "Vous n'avez pas accès au magasin source sélectionné",
        variant: "destructive",
      })
      return
    }

    // ✅ VÉRIFICATION QUE LE MAGASIN DESTINATION EXISTE
    const destinationStoreExists = destinationStores.some(store => store.id === formData.destination_store_id)
    if (!destinationStoreExists) {
      toast({
        title: "Magasin invalide",
        description: "Le magasin destination sélectionné n'existe pas",
        variant: "destructive",
      })
      return
    }

    // ✅ SÉCURITÉ : Vérifier les permissions avant de créer le transfert
    if (userProfile?.id && userProfile?.role) {
      const permissionCheck = await canCreateTransfer(
        userProfile.id,
        userProfile.role,
        formData.source_store_id,
        formData.destination_store_id
      )

      if (!permissionCheck.canCreate) {
        toast({
          title: "Permission refusée",
          description: permissionCheck.error || "Vous n'avez pas les permissions pour créer ce transfert",
          variant: "destructive",
        })
        return
      }
    }

    if (!userProfile?.id) {
      toast({
        title: "Erreur",
        description: "Profil utilisateur non disponible",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // Vérifier le stock disponible
      const stockCheck = await checkStockAvailability(
        formData.source_store_id,
        formData.product_id,
        formData.quantity
      )

      if (!stockCheck.available) {
        toast({
          title: "Stock insuffisant",
          description: `Stock disponible: ${stockCheck.current_stock}, Quantité demandée: ${formData.quantity}`,
          variant: "destructive",
        })
        return
      }

      // Créer le transfert
      const transferResult = await createStoreTransfer({
        source_store_id: formData.source_store_id,
        destination_store_id: formData.destination_store_id,
        product_id: formData.product_id,
        quantity: formData.quantity,
        notes: formData.notes,
        created_by: userProfile.id
      })

      if (!transferResult.success) {
        throw new Error(transferResult.error)
      }

      toast({
        title: "Transfert créé",
        description: `Transfert de ${formData.quantity} unités créé avec succès`,
      })

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Erreur création transfert:', error)
      toast({
        title: "Erreur",
        description: "Erreur lors de la création du transfert",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedProduct = products.find(p => p.id === formData.product_id)
  const sourceStore = sourceStores.find(s => s.id === formData.source_store_id)
  const destinationStore = destinationStores.find(s => s.id === formData.destination_store_id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Transfert entre Magasins
          </DialogTitle>
          <DialogDescription>
            Transférer des produits d'un magasin à un autre
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Magasin Source
              <span className="text-xs text-muted-foreground">(Vos magasins assignés)</span>
            </Label>
            <SearchableSelect
              value={formData.source_store_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, source_store_id: value }))}
              options={sourceStores.map(s => ({ value: s.id, label: s.name }))}
              placeholder="Sélectionner le magasin source"
            />
            {sourceStores.length === 0 && (
              <p className="text-xs text-destructive">
                Vous devez être assigné à au moins un magasin pour créer des transferts
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Magasin Destination
              <span className="text-xs text-muted-foreground">(Tous les magasins disponibles)</span>
            </Label>
            <SearchableSelect
              value={formData.destination_store_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, destination_store_id: value }))}
              options={destinationStores
                .filter(store => store.id !== formData.source_store_id)
                .map(s => ({ value: s.id, label: s.name }))}
              placeholder="Sélectionner le magasin destination"
            />
            {destinationStores.length === 0 && (
              <p className="text-xs text-destructive">
                Aucun magasin destination disponible
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Produit</Label>
            <SearchableSelect
              value={formData.product_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, product_id: value }))}
              options={products.map(p => ({ value: p.id, label: `${p.name} - ${p.sku}` }))}
              placeholder="Sélectionner un produit"
            />
          </div>

          {currentStock !== null && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Stock disponible dans {sourceStore?.name}:</strong> {currentStock} unités
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantité à transférer</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={currentStock || undefined}
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Raison du transfert, urgence, etc."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading || currentStock === null || formData.quantity > (currentStock || 0)}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer le Transfert
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}