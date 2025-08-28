import { useState, useEffect, useMemo } from "react"
import { useCurrency } from "@/hooks/useCurrency"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Package, Filter, MoreHorizontal, RefreshCw, AlertTriangle } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ProductModal } from "@/components/ProductModal"
import { CategoryModal } from "@/components/CategoryModal"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Breadcrumb from "@/components/Breadcrumb"

export default function Products() {
  const { formatAmount } = useCurrency()
  const { toast } = useToast()
  const { userProfile } = useAuth()
  
  // ✅ SOLUTION : États séparés pour une meilleure gestion
  const [productsSearchTerm, setProductsSearchTerm] = useState("")
  const [categoriesSearchTerm, setCategoriesSearchTerm] = useState("")
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products')
  const [error, setError] = useState<string | null>(null)
  const [productsPage, setProductsPage] = useState(1)
  const [productsPageSize, setProductsPageSize] = useState<number | 'all'>(20)

  // ✅ RESTRICTION : Seuls les admins peuvent modifier et ajouter
  const canAddProduct = userProfile?.role && ['Admin', 'SuperAdmin'].includes(userProfile.role)
  const canEditProduct = userProfile?.role && ['Admin', 'SuperAdmin'].includes(userProfile.role)
  const canDeleteProduct = userProfile?.role && ['Admin', 'SuperAdmin'].includes(userProfile.role)
  const canDeleteCategory = userProfile?.role && ['Admin', 'SuperAdmin'].includes(userProfile.role)
  const canViewProducts = userProfile?.role && ['Vendeur', 'Manager', 'Admin', 'SuperAdmin'].includes(userProfile.role)

  useEffect(() => {
    if (canViewProducts) {
      loadProducts()
    }
    loadCategories()
  }, [canViewProducts])

  // ✅ SOLUTION : Fonction de chargement des produits avec gestion d'erreur robuste
  const loadProducts = async () => {
    try {
      setProductsLoading(true)
      setError(null)

      const { data, error: supabaseError } = await supabase
        .from('products')
        .select(`
          *,
          categories(name),
          units(name, symbol),
          product_stores(
            current_stock,
            min_stock,
            max_stock,
            stores(name)
          )
        `)
        .order('created_at', { ascending: false })

      if (supabaseError) {
        if (supabaseError.code === '42501') {
          setError("Vous n'avez pas les permissions pour voir les produits")
          toast({
            title: "Permission refusée",
            description: "Vous n'avez pas les permissions pour voir les produits",
            variant: "destructive",
          })
        } else {
          throw supabaseError
        }
        return
      }
      
      setProducts(data || [])
    } catch (error) {
      console.error('Error loading products:', error)
      setError("Impossible de charger les produits")
      toast({
        title: "Erreur",
        description: "Impossible de charger les produits",
        variant: "destructive",
      })
    } finally {
      setProductsLoading(false)
    }
  }

  // ✅ SOLUTION : Fonction de chargement des catégories avec gestion d'erreur
  const loadCategories = async () => {
    try {
      setCategoriesLoading(true)
      
      const { data, error: supabaseError } = await supabase
        .from('categories')
        .select('id, name, description')
        .order('name', { ascending: true })

      if (supabaseError) throw supabaseError
      setCategories(data || [])
    } catch (error) {
      console.error('Error loading categories:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les catégories',
        variant: 'destructive',
      })
    } finally {
      setCategoriesLoading(false)
    }
  }

  // ✅ SOLUTION : Fonction de suppression de catégorie améliorée
  const handleDeleteCategory = async (categoryId: string) => {
    if (!canDeleteCategory) return

    // Vérifier côté client avec les données locales
    const localCount = categoryIdToCount[categoryId] || 0
    if (localCount > 0) {
      toast({
        title: 'Suppression impossible',
        description: 'Cette catégorie contient encore des produits. Déplacez ou supprimez-les avant.',
        variant: 'destructive',
      })
      return
    }

    if (!confirm('Supprimer cette catégorie ? Cette action est irréversible.')) return

    try {
      // Double-check serveur: compter les produits encore liés
      const { count, error: countError } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', categoryId)

      if (countError) throw countError
      if ((count || 0) > 0) {
        toast({
          title: 'Suppression refusée',
          description: 'Des produits sont encore rattachés à cette catégorie.',
          variant: 'destructive',
        })
        return
      }

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId)

      if (error) throw error

      toast({ title: 'Catégorie supprimée' })
      await loadCategories()
    } catch (error) {
      console.error('Error deleting category:', error)
      toast({
        title: 'Erreur',
        description: "Impossible de supprimer la catégorie",
        variant: 'destructive',
      })
    }
  }

  // ✅ SOLUTION : Fonctions de gestion des produits avec vérification des permissions
  const handleNewProduct = () => {
    if (!canAddProduct) {
      toast({
        title: "Permission refusée",
        description: "Vous n'avez pas les permissions pour ajouter des produits",
        variant: "destructive",
      })
      return
    }
    setSelectedProduct(null)
    setProductModalOpen(true)
  }

  const handleNewCategory = () => {
    if (!canAddProduct) {
      toast({
        title: "Permission refusée",
        description: "Vous n'avez pas les permissions pour ajouter des catégories",
        variant: "destructive",
      })
      return
    }
    setCategoryModalOpen(true)
  }

  const handleEditProduct = (product: any) => {
    if (!canEditProduct) {
      toast({
        title: "Permission refusée",
        description: "Vous n'avez pas les permissions pour modifier des produits",
        variant: "destructive",
      })
      return
    }
    setSelectedProduct(product)
    setProductModalOpen(true)
  }

  // ✅ SOLUTION : Fonction de suppression de produit avec vérification des permissions
  const handleDeleteProduct = async (productId: string) => {
    if (!canDeleteProduct) {
      toast({
        title: "Permission refusée",
        description: "Vous n'avez pas les permissions pour supprimer des produits",
        variant: "destructive",
      })
      return
    }

    if (!confirm("Êtes-vous sûr de vouloir supprimer ce produit ?")) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      if (error) throw error

      toast({
        title: "Succès",
        description: "Produit supprimé avec succès",
      })
      loadProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le produit",
        variant: "destructive",
      })
    }
  }

  // ✅ SOLUTION : Filtrage séparé pour les produits et catégories
  const filteredProducts = useMemo(() => {
    const normalize = (s: any) => (s ? String(s).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase() : '')
    const tokens = normalize(productsSearchTerm).split(/\s+/).filter(Boolean)
    if (tokens.length === 0) return products
    return products.filter((product: any) => {
      const storeNames = Array.isArray(product.product_stores)
        ? product.product_stores.map((ps: any) => ps.stores?.name)
        : []
      const fields = [
        product.name,
        product.sku,
        product.categories?.name,
        product.units?.name,
        product.units?.symbol,
        ...storeNames,
      ]
      const haystack = normalize(fields.filter(Boolean).join(' '))
      return tokens.every(t => haystack.includes(t))
    })
  }, [products, productsSearchTerm])

  const productsTotalPages = productsPageSize === 'all' ? 1 : Math.max(1, Math.ceil(filteredProducts.length / (productsPageSize as number)))
  const currentProductsPage = Math.min(productsPage, productsTotalPages)
  const paginatedProducts = productsPageSize === 'all'
    ? filteredProducts
    : filteredProducts.slice(
        (currentProductsPage - 1) * (productsPageSize as number),
        currentProductsPage * (productsPageSize as number)
      )

  useEffect(() => {
    setProductsPage(1)
  }, [productsPageSize, productsSearchTerm])

  // Prépare un index nombre de produits par catégorie (incluant 0 si aucune correspondance)
  const categoryIdToCount: Record<string, number> = products.reduce((acc: Record<string, number>, p: any) => {
    if (p.category_id) {
      acc[p.category_id] = (acc[p.category_id] || 0) + 1
    }
    return acc
  }, {})

  const filteredCategories = useMemo(() => {
    const normalize = (s: any) => (s ? String(s).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase() : '')
    const tokens = normalize(categoriesSearchTerm).split(/\s+/).filter(Boolean)
    if (tokens.length === 0) return categories
    return categories.filter((c: any) => tokens.every(t => normalize(c.name).includes(t)))
  }, [categories, categoriesSearchTerm])

  // ✅ SOLUTION : Affichage d'erreur global avec possibilité de retry
  if (error && !canViewProducts) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Produits</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gérez vos produits et catégories
          </p>
        </div>
        </div>
        
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-destructive mb-2">
            Accès refusé
          </h3>
          <p className="text-destructive/80 mb-4">
            Vous n'avez pas les permissions pour accéder à cette page
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ✅ NOUVEAU : Breadcrumb */}
      <Breadcrumb 
        items={[
          { label: 'Produits', icon: undefined }
        ]} 
      />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Produits</h1>
          <p className="text-muted-foreground">
            Gérez vos produits et catégories
          </p>

        </div>
        
                  <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            {/* ✅ BOUTONS : Visibles uniquement pour les admins */}
            {(userProfile?.role === 'Admin' || userProfile?.role === 'SuperAdmin') && (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleNewCategory} 
                  className="gap-2 w-full sm:w-auto justify-center"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Nouvelle catégorie</span>
                  <span className="sm:hidden">Catégorie</span>
                </Button>
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={handleNewProduct} 
                  className="gap-2 w-full sm:w-auto justify-center"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Nouveau produit</span>
                  <span className="sm:hidden">Produit</span>
                </Button>
              </>
            )}
          </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'products' | 'categories')} className="space-y-4">
        <TabsList>
          <TabsTrigger value="products">Produits</TabsTrigger>
          <TabsTrigger value="categories">Catégories</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          {/* ✅ SOLUTION : Gestion d'erreur avec bouton de retry */}
          {error ? (
            <Card className="bg-destructive/10 border border-destructive/20">
              <CardContent className="p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-destructive mb-2">
                  Erreur de chargement
                </h3>
                <p className="text-destructive/80 mb-4">{error}</p>
                <Button onClick={loadProducts} variant="outline" className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Réessayer
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* ✅ Recherche simple alignée avec les autres pages */}
              <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative w-full sm:flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={productsSearchTerm}
                        onChange={(e) => setProductsSearchTerm(e.target.value)}
                        placeholder="Rechercher (nom, SKU, catégorie, unité, magasin)"
                        className="pl-9"
                      />
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={loadProducts}
                        disabled={productsLoading}
                        className="gap-2 w-full sm:w-auto justify-center"
                      >
                        <RefreshCw className={`w-4 h-4 ${productsLoading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Actualiser</span>
                        <span className="sm:hidden">🔄</span>
                      </Button>
                      {/* ✅ BOUTON : Visible uniquement pour les admins */}
                      {(userProfile?.role === 'Admin' || userProfile?.role === 'SuperAdmin') && (
                        <Button 
                          onClick={handleNewProduct} 
                          size="sm"
                          className="gap-2 w-full sm:w-auto justify-center"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="hidden sm:inline">Nouveau produit</span>
                          <span className="sm:hidden">Ajouter</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Products List */}
              <Card className="bg-gradient-card shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    Liste des produits
                  </CardTitle>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <CardDescription>
                      {productsLoading ? "Chargement..." : `${filteredProducts.length} produit(s) trouvé(s)`}
                    </CardDescription>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Par page</span>
                      <Select value={String(productsPageSize)} onValueChange={(v) => setProductsPageSize(v === 'all' ? 'all' : parseInt(v))}>
                        <SelectTrigger className="h-8 w-[92px]">
                          <SelectValue placeholder="20" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {productsLoading ? (
                    // ✅ SOLUTION : Skeleton loading uniforme
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {Array.from({ length: 8 }).map((_, index) => (
                        <Card key={index} className="bg-gradient-card shadow-card">
                          <CardHeader className="pb-3">
                            <div className="animate-pulse bg-gray-300 h-6 w-3/4 rounded mb-2"></div>
                            <div className="animate-pulse bg-gray-300 h-4 w-1/2 rounded"></div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="animate-pulse bg-gray-300 h-4 w-1/3 rounded"></div>
                            <div className="space-y-2">
                              <div className="animate-pulse bg-gray-300 h-4 w-full rounded"></div>
                              <div className="animate-pulse bg-gray-300 h-4 w-2/3 rounded"></div>
                            </div>
                            <div className="space-y-2">
                              <div className="animate-pulse bg-gray-300 h-4 w-1/2 rounded"></div>
                              <div className="animate-pulse bg-gray-300 h-4 w-3/4 rounded"></div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Package className="w-16 h-16 text-muted-foreground/20 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Aucun produit</h3>
                      <p className="text-muted-foreground mb-6">
                        {productsSearchTerm ? "Aucun produit ne correspond à votre recherche" : "Commencez par ajouter votre premier produit"}
                      </p>
                      {canAddProduct && (
                        <Button onClick={handleNewProduct} className="gap-2">
                          <Plus className="w-4 h-4" />
                          Ajouter un produit
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                      {paginatedProducts.map((product) => (
                        <Card key={product.id} className="bg-gradient-card shadow-card hover:shadow-elevated transition-all duration-200 transform hover:scale-[1.02]">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-lg font-semibold line-clamp-2">
                                  {product.name}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                  SKU: {product.sku}
                                </p>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>Voir détails</DropdownMenuItem>
                                  {canEditProduct && (
                                    <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                                      Modifier
                                    </DropdownMenuItem>
                                  )}
                                  {canDeleteProduct && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        className="text-destructive"
                                        onClick={() => handleDeleteProduct(product.id)}
                                      >
                                        Supprimer
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </CardHeader>
                          
                          <CardContent className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {product.categories?.name || "Non catégorisé"}
                              </Badge>
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Prix actuel</span>
                                <span className="font-semibold text-lg">
                                  {formatAmount(product.current_sale_price)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Prix minimum</span>
                                <span className="text-sm">
                                  {formatAmount(product.min_sale_price)}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Stock</span>
                                <span className="text-sm font-medium">{product.units?.name} ({product.units?.symbol})</span>
                              </div>
                              {product.product_stores && product.product_stores.length > 0 ? (
                                <div className="space-y-1">
                                  {product.product_stores.map((store: any, index: number) => (
                                    <div key={index} className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">{store.stores?.name}:</span>
                                      <span className={`font-medium ${
                                        store.current_stock <= store.min_stock ? 'text-red-500' : 'text-green-600'
                                      }`}>
                                        {store.current_stock}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-2">
                                  <span className="text-xs text-muted-foreground">Aucun stock</span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                              {product.product_stores?.some((store: any) => store.current_stock <= store.min_stock) && (
                                <Badge variant="destructive" className="text-xs">
                                  Stock faible
                                </Badge>
                              )}
                              {product.expiry_date && new Date(product.expiry_date) < new Date() && (
                                <Badge variant="destructive" className="text-xs">
                                  Expiré
                                </Badge>
                              )}
                              {product.expiry_date && new Date(product.expiry_date) > new Date() && 
                               new Date(product.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                                <Badge variant="secondary" className="text-xs">
                                  Expire bientôt
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                  {/* Pagination */}
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentProductsPage <= 1 || productsPageSize === 'all'}
                      onClick={() => setProductsPage(p => Math.max(1, p - 1))}
                    >
                      Précédent
                    </Button>
                    <span className="text-sm text-muted-foreground">Page {currentProductsPage} / {productsTotalPages}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentProductsPage >= productsTotalPages || productsPageSize === 'all'}
                      onClick={() => setProductsPage(p => Math.min(productsTotalPages, p + 1))}
                    >
                      Suivant
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          {/* ✅ SOLUTION : Recherche séparée pour les catégories */}
          <Card className="bg-gradient-card shadow-card">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full sm:flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={categoriesSearchTerm}
                    onChange={(e) => setCategoriesSearchTerm(e.target.value)}
                    placeholder="Rechercher une catégorie"
                    className="pl-9"
                  />
                </div>
                {/* ✅ BOUTON : Visible uniquement pour les admins */}
                {(userProfile?.role === 'Admin' || userProfile?.role === 'SuperAdmin') && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleNewCategory} 
                    className="gap-2 w-full sm:w-auto justify-center"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Nouvelle catégorie</span>
                    <span className="sm:hidden">Catégorie</span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Categories List */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle>Liste des catégories</CardTitle>
              <CardDescription>
                {categoriesLoading ? "Chargement..." : `${filteredCategories.length} catégorie(s)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {categoriesLoading ? (
                // ✅ SOLUTION : Skeleton loading pour le tableau des catégories
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <div className="animate-pulse bg-gray-300 h-4 w-32 rounded"></div>
                      <div className="animate-pulse bg-gray-300 h-4 w-48 rounded"></div>
                      <div className="animate-pulse bg-gray-300 h-6 w-16 rounded"></div>
                      <div className="animate-pulse bg-gray-300 h-8 w-20 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {/* ✅ MOBILE : Tableau responsive avec cartes sur mobile */}
                  <div className="block sm:hidden">
                  {/* Version mobile : Cartes */}
                  <div className="space-y-3">
                    {filteredCategories.map((c) => (
                      <Card key={c.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-sm">{c.name}</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              {c.description || 'Aucune description'}
                            </p>
                            <div className="mt-2">
                              <Badge variant="outline" className="text-xs">
                                {categoryIdToCount[c.id] || 0} produit(s)
                              </Badge>
                            </div>
                          </div>
                          <div className="ml-3">
                            {canDeleteCategory ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteCategory(c.id)}
                                disabled={(categoryIdToCount[c.id] || 0) > 0}
                                title={(categoryIdToCount[c.id] || 0) > 0 ? 'Supprimez/déplacez d\'abord les produits' : ''}
                                className="text-xs"
                              >
                                Supprimer
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
                
                {/* Version desktop : Tableau */}
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Nombre de produits</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCategories.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell className="text-muted-foreground">{c.description || '—'}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline">{categoryIdToCount[c.id] || 0}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {canDeleteCategory ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteCategory(c.id)}
                                disabled={(categoryIdToCount[c.id] || 0) > 0}
                                title={(categoryIdToCount[c.id] || 0) > 0 ? 'Supprimez/déplacez d\'abord les produits' : ''}
                              >
                                Supprimer
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                  </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ProductModal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        onSuccess={loadProducts}
        product={selectedProduct}
      />

      <CategoryModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onSuccess={() => {
          loadCategories()
        }}
      />
    </div>
  )
}