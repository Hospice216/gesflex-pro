import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Badge } from "@/components/ui/badge"
import { Purchase } from "@/integrations/supabase/types"
// Removed unused helpers; validation now inserts into arrivals and backend triggers handle stock

interface ArrivalValidationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  purchase: Purchase
}

export function ArrivalValidationModal({ isOpen, onClose, onSuccess, purchase }: ArrivalValidationModalProps) {
  const { user, userProfile } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [receivedQuantity, setReceivedQuantity] = useState("")

  useEffect(() => {
    if (isOpen && purchase) {
      setReceivedQuantity("")
    }
  }, [isOpen, purchase])

  const validateForm = () => {
    if (!receivedQuantity || parseInt(receivedQuantity) <= 0) {
      toast({
        title: "Erreur",
        description: "La quantité reçue doit être supérieure à 0",
        variant: "destructive",
      })
      return false
    }
    return true
  }

  const handleValidation = async () => {
    if (!user || !userProfile) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour valider un arrivage",
        variant: "destructive",
      })
      return
    }

    // Validation supplémentaire pour userProfile.id
    if (!userProfile.id || userProfile.id === "") {
      console.error('userProfile.id is empty or null:', userProfile)
      toast({
        title: "Erreur",
        description: "Profil utilisateur invalide. Veuillez vous reconnecter.",
        variant: "destructive",
      })
      return
    }

    if (!validateForm()) {
      return
    }

    console.log('Validation avec userProfile:', {
      user: user?.id,
      userProfile: userProfile?.id,
      userProfileFull: userProfile
    })

    setLoading(true)

    try {
      const receivedQty = parseInt(receivedQuantity)
      const orderedQty = purchase.quantity

      // Insertion dans arrivals; le trigger côté DB vérifiera l'égalité et mettra à jour le stock
      const { error } = await supabase
        .from('arrivals')
        .insert({
          purchase_id: purchase.id,
          received_quantity: receivedQty,
          validated_by: userProfile.id,
          notes: null,
        })

      if (error) {
        console.error('Erreur Supabase arrivals insert:', error)
        const genericMessage = "Quantité reçue incorrecte. Veuillez vérifier le colis ou contacter l'expéditeur."
        const shouldHideDetails = true
        toast({
          title: 'Validation impossible',
          description: shouldHideDetails ? genericMessage : (error.message || genericMessage),
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Arrivage enregistré',
        description: receivedQty === orderedQty
          ? 'Quantité conforme. Stock mis à jour.'
          : `Quantité reçue (${receivedQty}) différente de la commande (${orderedQty}). Vérifiez et recommencez.`,
        variant: receivedQty === orderedQty ? 'default' : 'destructive'
      })

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error validating arrival:', error)
      toast({
        title: 'Erreur',
        description: error?.message || "Une erreur est survenue lors de la validation",
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!purchase) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Validation d'arrivage</DialogTitle>
          <DialogDescription>
            Vérifiez et validez les quantités reçues pour cet achat
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-md space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Produit:</span>
              <span className="text-sm">{purchase.products?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">SKU:</span>
              <span className="text-sm">{purchase.products?.sku}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Fournisseur:</span>
              <span className="text-sm">{purchase.suppliers?.name}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="received_quantity">Quantité reçue *</Label>
            <Input
              id="received_quantity"
              type="number"
              value={receivedQuantity}
              onChange={(e) => setReceivedQuantity(e.target.value)}
              required
              min="0"
            />
            <p className="text-xs text-muted-foreground">Le nombre commandé n'est pas affiché pour éviter d'influencer la saisie.</p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button 
            onClick={handleValidation} 
            disabled={loading || !receivedQuantity}
          >
            {loading ? "Validation..." : "Valider l'arrivage"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}