import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Product, Category, Unit } from "@/integrations/supabase/types"
import { handleSupabaseError, validateData, sanitizeData } from "@/lib/utils/supabase-helpers"
import { isValidAmount } from "@/lib/utils/financial-calculations"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Dice6, AlertTriangle } from "lucide-react"
import { format } from "date-fns"

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  product?: Product
}

export function ProductModal({ isOpen, onClose, onSuccess, product }: ProductModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [expirationDate, setExpirationDate] = useState<Date>()
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sku: "",
    category_id: "",
    unit_id: "",
    current_sale_price: "",
    min_sale_price: "",
    alert_stock: "10",
    tax_rate: "0",
    expiration_date: ""
  })

  useEffect(() => {
    if (isOpen) {
      loadCategories()
      loadUnits()
      resetForm()
      if (product) {
        setFormData({
          name: product.name || "",
          description: product.description || "",
          sku: product.sku || "",
          category_id: product.category_id || "",
          unit_id: product.unit_id || "",
          current_sale_price: product.current_sale_price?.toString() || "",
          min_sale_price: product.min_sale_price?.toString() || "",
          alert_stock: product.alert_stock?.toString() || "10",
          tax_rate: product.tax_rate?.toString() || "0",
          expiration_date: product.expiry_date || ""
        })
        if (product.expiry_date) {
          setExpirationDate(new Date(product.expiry_date))
        }
      } else {
        generateSKU()
      }
    }
  }, [isOpen, product])

  // ✅ SOLUTION : Fonction de réinitialisation du formulaire
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      sku: "",
      category_id: "",
      unit_id: "",
      current_sale_price: "",
      min_sale_price: "",
      alert_stock: "10",
      tax_rate: "0",
      expiration_date: ""
    })
    setExpirationDate(undefined)
    setValidationErrors({})
  }

  // ✅ SOLUTION : Fonction de validation des données
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    // Validation des champs requis
    if (!formData.name.trim()) {
      errors.name = "Le nom du produit est obligatoire"
    } else if (formData.name.trim().length < 2) {
      errors.name = "Le nom doit contenir au moins 2 caractères"
    }

    if (!formData.sku.trim()) {
      errors.sku = "Le SKU est obligatoire"
    } else if (formData.sku.trim().length < 3) {
      errors.sku = "Le SKU doit contenir au moins 3 caractères"
    }

    if (!formData.category_id) {
      errors.category_id = "La catégorie est obligatoire"
    }

    if (!formData.unit_id) {
      errors.unit_id = "L'unité est obligatoire"
    }

    // Validation des prix
    const currentPrice = parseFloat(formData.current_sale_price)
    const minPrice = parseFloat(formData.min_sale_price)

    if (!isValidAmount(currentPrice) || currentPrice <= 0) {
      errors.current_sale_price = "Le prix actuel doit être supérieur à 0"
    }

    if (!isValidAmount(minPrice) || minPrice <= 0) {
      errors.min_sale_price = "Le prix minimum doit être supérieur à 0"
    }

    if (currentPrice < minPrice) {
      errors.current_sale_price = "Le prix actuel ne peut pas être inférieur au prix minimum"
    }

    if (currentPrice > minPrice * 3) {
      errors.current_sale_price = "Le prix actuel ne peut pas dépasser 3x le prix minimum"
    }

    // Validation du stock d'alerte
    const alertStock = parseInt(formData.alert_stock)
    if (alertStock < 0) {
      errors.alert_stock = "Le stock d'alerte ne peut pas être négatif"
    }

    // Validation du taux de taxe
    const taxRate = parseFloat(formData.tax_rate)
    if (taxRate < 0 || taxRate > 100) {
      errors.tax_rate = "Le taux de taxe doit être entre 0 et 100"
    }

    // Validation de la date d'expiration
    if (expirationDate && expirationDate < new Date()) {
      errors.expiration_date = "La date d'expiration ne peut pas être dans le passé"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error loading categories:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les catégories",
        variant: "destructive",
      })
    }
  }

  const loadUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setUnits(data || [])
    } catch (error) {
      console.error('Error loading units:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les unités",
        variant: "destructive",
      })
    }
  }

  const generateSKU = () => {
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    setFormData(prev => ({ ...prev, sku: `PRD-${timestamp}${random}` }))
  }

  // ✅ SOLUTION : Vérification de l'unicité du SKU
  const checkSKUUniqueness = async (sku: string, excludeId?: string): Promise<boolean> => {
    try {
      let query = supabase
        .from('products')
        .select('id')
        .eq('sku', sku)

      if (excludeId) {
        query = query.neq('id', excludeId)
      }

      const { data, error } = await query

      if (error) throw error
      return (data || []).length === 0
    } catch (error) {
      console.error('Error checking SKU uniqueness:', error)
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
      // ✅ SOLUTION : Vérification de l'unicité du SKU
      const isSKUUnique = await checkSKUUniqueness(formData.sku, product?.id)
      if (!isSKUUnique) {
        setValidationErrors(prev => ({ ...prev, sku: "Ce SKU existe déjà" }))
        toast({
          title: "Erreur",
          description: "Ce SKU existe déjà, veuillez en choisir un autre",
          variant: "destructive",
        })
        return
      }

      const currentPrice = parseFloat(formData.current_sale_price)
      const minPrice = parseFloat(formData.min_sale_price)
      const alertStock = parseInt(formData.alert_stock)
      const taxRate = parseFloat(formData.tax_rate)

      const productData = sanitizeData({
        ...formData,
        current_sale_price: currentPrice,
        min_sale_price: minPrice,
        alert_stock: alertStock,
        tax_rate: taxRate,
        expiration_date: expirationDate ? format(expirationDate, 'yyyy-MM-dd') : null,
        category_id: formData.category_id || null,
        unit_id: formData.unit_id || null
      })

      if (product) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id)

        if (error) {
          const errorResult = handleSupabaseError(error, 'update product')
          throw new Error(errorResult.error)
        }

        toast({
          title: "Succès",
          description: "Produit modifié avec succès",
        })
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData])

        if (error) {
          const errorResult = handleSupabaseError(error, 'insert product')
          throw new Error(errorResult.error)
        }

        toast({
          title: "Succès",
          description: "Produit créé avec succès",
        })
      }

      onSuccess()
      onClose()
      resetForm()
    } catch (error) {
      console.error('Error saving product:', error)
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
    resetForm()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? "Modifier le produit" : "Nouveau produit"}
          </DialogTitle>
          <DialogDescription>
            {product ? "Modifiez les informations du produit" : "Ajoutez un nouveau produit à votre catalogue"}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du produit *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={validationErrors.name ? "border-destructive" : ""}
              />
              {validationErrors.name && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {validationErrors.name}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Catégorie *</Label>
              <Select value={formData.category_id} onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}>
                <SelectTrigger className={validationErrors.category_id ? "border-destructive" : ""}>
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.category_id && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {validationErrors.category_id}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU *</Label>
              <div className="flex gap-2">
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                  className={validationErrors.sku ? "border-destructive" : ""}
                />
                <Button type="button" variant="outline" size="icon" onClick={generateSKU}>
                  <Dice6 className="w-4 h-4" />
                </Button>
              </div>
              {validationErrors.sku && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {validationErrors.sku}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="unit">Unité *</Label>
              <Select value={formData.unit_id} onValueChange={(value) => setFormData(prev => ({ ...prev, unit_id: value }))}>
                <SelectTrigger className={validationErrors.unit_id ? "border-destructive" : ""}>
                  <SelectValue placeholder="Sélectionner une unité" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name} ({unit.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.unit_id && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {validationErrors.unit_id}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="current_price">Prix actuel (XOF) *</Label>
              <Input
                id="current_price"
                type="number"
                step="0.01"
                value={formData.current_sale_price}
                onChange={(e) => setFormData(prev => ({ ...prev, current_sale_price: e.target.value }))}
                className={validationErrors.current_sale_price ? "border-destructive" : ""}
              />
              {validationErrors.current_sale_price && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {validationErrors.current_sale_price}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="min_price">Prix minimum (XOF) *</Label>
              <Input
                id="min_price"
                type="number"
                step="0.01"
                value={formData.min_sale_price}
                onChange={(e) => setFormData(prev => ({ ...prev, min_sale_price: e.target.value }))}
                className={validationErrors.min_sale_price ? "border-destructive" : ""}
              />
              {validationErrors.min_sale_price && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {validationErrors.min_sale_price}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="alert_stock">Stock d'alerte</Label>
              <Input
                id="alert_stock"
                type="number"
                value={formData.alert_stock}
                onChange={(e) => setFormData(prev => ({ ...prev, alert_stock: e.target.value }))}
                className={validationErrors.alert_stock ? "border-destructive" : ""}
              />
              {validationErrors.alert_stock && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {validationErrors.alert_stock}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tax_rate">Taux de taxe (%)</Label>
              <Input
                id="tax_rate"
                type="number"
                step="0.01"
                value={formData.tax_rate}
                onChange={(e) => setFormData(prev => ({ ...prev, tax_rate: e.target.value }))}
                className={validationErrors.tax_rate ? "border-destructive" : ""}
              />
              {validationErrors.tax_rate && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {validationErrors.tax_rate}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Date d'expiration (optionnelle)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${validationErrors.expiration_date ? "border-destructive" : ""}`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expirationDate ? format(expirationDate, "dd/MM/yyyy") : "Sélectionner une date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={expirationDate}
                  onSelect={setExpirationDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {validationErrors.expiration_date && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {validationErrors.expiration_date}
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
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement..." : (product ? "Modifier" : "Créer")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}