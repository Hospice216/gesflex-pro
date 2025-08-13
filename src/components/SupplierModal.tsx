import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface Supplier {
  id?: string
  name: string
  contact_person: string | null
  email: string | null
  phone: string | null
  address: string | null
  is_active: boolean
}

interface SupplierModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier?: Supplier | null
  onSuccess: () => void
}

export function SupplierModal({ open, onOpenChange, supplier, onSuccess }: SupplierModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Supplier>({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    is_active: true
  })
  const { toast } = useToast()

  useEffect(() => {
    if (supplier) {
      setFormData(supplier)
    } else {
      setFormData({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        is_active: true
      })
    }
  }, [supplier])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (supplier?.id) {
        const { error } = await supabase
          .from('suppliers')
          .update({
            name: formData.name,
            contact_person: formData.contact_person || null,
            email: formData.email || null,
            phone: formData.phone || null,
            address: formData.address || null,
            is_active: formData.is_active
          })
          .eq('id', supplier.id)

        if (error) throw error
        toast({ title: "Succès", description: "Fournisseur modifié avec succès" })
      } else {
        const { error } = await supabase
          .from('suppliers')
          .insert({
            name: formData.name,
            contact_person: formData.contact_person || null,
            email: formData.email || null,
            phone: formData.phone || null,
            address: formData.address || null,
            is_active: formData.is_active
          })

        if (error) throw error
        toast({ title: "Succès", description: "Fournisseur créé avec succès" })
      }

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'enregistrement",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{supplier ? 'Modifier' : 'Créer'} un fournisseur</DialogTitle>
          <DialogDescription>
            {supplier ? 'Modifiez les informations du fournisseur' : 'Créez un nouveau fournisseur'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nom du fournisseur *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="contact_person">Personne de contact</Label>
              <Input
                id="contact_person"
                value={formData.contact_person || ''}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Adresse</Label>
              <Textarea
                id="address"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Fournisseur actif</Label>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}