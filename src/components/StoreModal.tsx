import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface Store {
  id?: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  is_active: boolean
}

interface StoreModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  store?: Store | null
  onSuccess: () => void
}

export function StoreModal({ open, onOpenChange, store, onSuccess }: StoreModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Store>({
    name: '',
    address: '',
    phone: '',
    email: '',
    is_active: true
  })
  const { toast } = useToast()

  useEffect(() => {
    if (store) {
      setFormData(store)
    } else {
      setFormData({
        name: '',
        address: '',
        phone: '',
        email: '',
        is_active: true
      })
    }
  }, [store])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (store?.id) {
        const { error } = await supabase
          .from('stores')
          .update({
            name: formData.name,
            address: formData.address || null,
            phone: formData.phone || null,
            email: formData.email || null,
            is_active: formData.is_active
          })
          .eq('id', store.id)

        if (error) throw error
        toast({ title: "Succès", description: "Magasin modifié avec succès" })
      } else {
        const { error } = await supabase
          .from('stores')
          .insert({
            name: formData.name,
            address: formData.address || null,
            phone: formData.phone || null,
            email: formData.email || null,
            is_active: formData.is_active
          })

        if (error) throw error
        toast({ title: "Succès", description: "Magasin créé avec succès" })
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
          <DialogTitle>{store ? 'Modifier' : 'Créer'} un magasin</DialogTitle>
          <DialogDescription>
            {store ? 'Modifiez les informations du magasin' : 'Créez un nouveau magasin'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nom du magasin *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Magasin actif</Label>
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