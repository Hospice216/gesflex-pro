import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { isValidAmount } from "@/lib/utils/financial-calculations"

interface ExpenseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface StoreOption {
  id: string
  name: string
}

export function ExpenseModal({ open, onOpenChange, onSuccess }: ExpenseModalProps) {
  const [loading, setLoading] = useState(false)
  const [stores, setStores] = useState<StoreOption[]>([])
  const [date, setDate] = useState<Date>(new Date())
  const { toast } = useToast()
  const { userProfile } = useAuth()

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    amount: '',
    description: '',
    store_id: 'all'
  })

  const expenseCategories = [
    'Loyer',
    'Électricité',
    'Eau',
    'Internet/Téléphone',
    'Assurance',
    'Maintenance',
    'Matériel',
    'Marketing',
    'Formation',
    'Transport',
    'Frais bancaires',
    'Autre'
  ]

  useEffect(() => {
    if (open) {
      fetchStores()
    }
  }, [open])

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setStores(data || [])
    } catch (error) {
      console.error('Error fetching stores:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les magasins",
        variant: "destructive"
      })
    }
  }

  const validateForm = () => {
    if (!formData.title.trim()) {
      toast({
        title: "Erreur",
        description: "Le titre est obligatoire",
        variant: "destructive"
      })
      return false
    }

    if (!formData.category) {
      toast({
        title: "Erreur",
        description: "La catégorie est obligatoire",
        variant: "destructive"
      })
      return false
    }

    if (!formData.amount || !isValidAmount(parseFloat(formData.amount))) {
      toast({
        title: "Erreur",
        description: "Le montant doit être valide",
        variant: "destructive"
      })
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!userProfile) {
      toast({
        title: "Erreur",
        description: "Utilisateur non connecté",
        variant: "destructive"
      })
      return
    }

    if (!validateForm()) {
      return
    }

    // Validation de la date
    if (date && date > new Date()) {
      toast({
        title: "Erreur",
        description: "La date de dépense ne peut pas être dans le futur",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
              const expenseData = {
          title: formData.title,
          category: formData.category,
          amount: parseFloat(formData.amount), // Utiliser la valeur validée
          description: formData.description || null,
          store_id: formData.store_id === 'all' ? null : formData.store_id,
          expense_date: date?.toISOString().split('T')[0],
          created_by: userProfile.id
        }

              const { error } = await supabase
          .from('expenses')
          .insert(expenseData)

        if (error) {
          console.error('Error inserting expense:', error)
          throw new Error(error.message || "Erreur lors de l'enregistrement de la dépense")
        }

      toast({ title: "Succès", description: "Dépense enregistrée avec succès" })
      
      setFormData({
        title: '',
        category: '',
        amount: '',
        description: '',
        store_id: 'all'
      })
      setDate(new Date())
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nouvelle Dépense</DialogTitle>
          <DialogDescription>
            Enregistrez une nouvelle dépense pour le suivi financier
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Ex: Facture électricité"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Catégorie *</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Montant *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="store">Magasin</Label>
              <Select value={formData.store_id} onValueChange={(value) => handleInputChange('store_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un magasin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les magasins</SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date de la dépense</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: fr }) : <span>Sélectionner une date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => setDate(newDate || new Date())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Description optionnelle de la dépense..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}