import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"

interface TransferReceptionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  transfer: any
}

export function TransferReceptionModal({ isOpen, onClose, onSuccess, transfer }: TransferReceptionModalProps) {
  const { userProfile } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [receivedQuantity, setReceivedQuantity] = useState("")

  useEffect(() => {
    if (isOpen && transfer) {
      setReceivedQuantity("")
    }
  }, [isOpen, transfer])

  const handleValidate = async () => {
    if (!userProfile?.id) {
      toast({ title: "Erreur", description: "Profil invalide", variant: "destructive" })
      return
    }

    const qty = parseInt(receivedQuantity)
    if (!qty || qty <= 0) {
      toast({ title: "Erreur", description: "Quantité invalide", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('transfer_receptions')
        .insert({
          transfer_id: transfer.id,
          received_quantity: qty,
          received_by: userProfile.id,
          notes: null,
        })

      if (error) {
        const genericMessage = "Quantité reçue incorrecte. Veuillez vérifier le colis ou contacter l'expéditeur."
        toast({ title: "Validation impossible", description: genericMessage, variant: "destructive" })
        return
      }

      toast({ title: "Transfert validé", description: "Stock mis à jour pour le magasin destination." })
      onSuccess()
      onClose()
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Échec de la validation", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  if (!transfer) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Réception de transfert</DialogTitle>
          <DialogDescription>Renseignez la quantité reçue pour ce transfert</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-md space-y-2">
            <div className="flex justify-between"><span className="text-sm font-medium">Code:</span><span className="text-sm">{transfer.transfer_code}</span></div>
            <div className="flex justify-between"><span className="text-sm font-medium">Produit:</span><span className="text-sm">{transfer.products?.name || transfer.product_name}</span></div>
            {/* Intentionnellement sans affichage de la quantité envoyée pour éviter toute influence */}
          </div>
          <div className="space-y-2">
            <Label htmlFor="received_qty">Quantité reçue *</Label>
            <Input id="received_qty" type="number" value={receivedQuantity} onChange={(e) => setReceivedQuantity(e.target.value)} min="0"/>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleValidate} disabled={loading || !receivedQuantity}>{loading ? "Validation..." : "Valider"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

