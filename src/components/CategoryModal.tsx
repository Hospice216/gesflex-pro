import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { AlertTriangle } from "lucide-react"

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  category?: any
}

export function CategoryModal({ isOpen, onClose, onSuccess, category }: CategoryModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  
  const [formData, setFormData] = useState({
    name: "",
    description: ""
  })

  useEffect(() => {
    if (isOpen && category) {
      setFormData({
        name: category.name || "",
        description: category.description || ""
      })
    } else if (isOpen) {
      setFormData({
        name: "",
        description: ""
      })
    }
    setValidationErrors({})
  }, [isOpen, category])

  // ✅ SOLUTION : Fonction de validation des données
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    // Validation du nom
    if (!formData.name.trim()) {
      errors.name = "Le nom de la catégorie est obligatoire"
    } else if (formData.name.trim().length < 2) {
      errors.name = "Le nom doit contenir au moins 2 caractères"
    } else if (formData.name.trim().length > 50) {
      errors.name = "Le nom ne peut pas dépasser 50 caractères"
    }

    // Validation de la description
    if (formData.description && formData.description.length > 200) {
      errors.description = "La description ne peut pas dépasser 200 caractères"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // ✅ SOLUTION : Vérification de l'unicité du nom
  const checkNameUniqueness = async (name: string, excludeId?: string): Promise<boolean> => {
    try {
      let query = supabase
        .from('categories')
        .select('id')
        .eq('name', name.trim())

      if (excludeId) {
        query = query.neq('id', excludeId)
      }

      const { data, error } = await query

      if (error) throw error
      return (data || []).length === 0
    } catch (error) {
      console.error('Error checking name uniqueness:', error)
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // ✅ SOLUTION : Validation du formulaire avant soumission
    if (!validateForm()) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez corriger les erreurs dans le formulaire",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // ✅ SOLUTION : Vérification de l'unicité du nom
      const isNameUnique = await checkNameUniqueness(formData.name, category?.id)
      if (!isNameUnique) {
        setValidationErrors(prev => ({ ...prev, name: "Ce nom de catégorie existe déjà" }))
        toast({
          title: "Erreur",
          description: "Ce nom de catégorie existe déjà, veuillez en choisir un autre",
          variant: "destructive",
        })
        return
      }

      const categoryData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null
      }

      if (category) {
        const { error } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', category.id)

        if (error) throw error

        toast({
          title: "Succès",
          description: "Catégorie modifiée avec succès",
        })
      } else {
        const { error } = await supabase
          .from('categories')
          .insert([categoryData])

        if (error) throw error

        toast({
          title: "Succès",
          description: "Catégorie créée avec succès",
        })
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error saving category:', error)
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue lors de l'enregistrement",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // ✅ SOLUTION : Fonction de fermeture avec réinitialisation
  const handleClose = () => {
    setValidationErrors({})
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {category ? "Modifier la catégorie" : "Nouvelle catégorie"}
          </DialogTitle>
          <DialogDescription>
            {category ? "Modifiez les informations de la catégorie" : "Ajoutez une nouvelle catégorie de produits"}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de la catégorie *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={validationErrors.name ? "border-destructive" : ""}
              placeholder="Ex: Électronique, Vêtements..."
            />
            {validationErrors.name && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {validationErrors.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className={validationErrors.description ? "border-destructive" : ""}
              placeholder="Description optionnelle de la catégorie..."
            />
            {validationErrors.description && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {validationErrors.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {formData.description.length}/200 caractères
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement..." : (category ? "Modifier" : "Créer")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}