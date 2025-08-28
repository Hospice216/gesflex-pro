import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Search, Filter, MoreHorizontal, Warehouse, AlertTriangle, CheckCircle, Package } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import InventoryAdjustmentModal from "@/components/InventoryAdjustmentModal"

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState("")
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<string>("")
  const [selectedStore, setSelectedStore] = useState<string>("")
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<{ store: string; status: string }>({ store: 'all', status: 'all' })
  const { toast } = useToast()

  useEffect(() => {
    fetchInventory()
  }, [])

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from("product_stores")
        .select(`
          *,
          products(id, name, sku, alert_stock, categories(name)),
          stores(name)
        `)
        .order("assigned_at", { ascending: false })

      if (error) throw error
      setInventory(data || [])
    } catch (error) {
      console.error('Erreur chargement inventaire:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger l'inventaire",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (item: any) => {
    const stock = item.current_stock
    const alertStock = item.products?.alert_stock || 10
    
    if (stock === 0) {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />Rupture</Badge>
    } else if (stock <= alertStock) {
      return <Badge variant="secondary" className="gap-1 bg-warning/10 text-warning"><AlertTriangle className="w-3 h-3" />Stock faible</Badge>
    } else {
      return <Badge variant="default" className="gap-1 bg-success text-success-foreground"><CheckCircle className="w-3 h-3" />Normal</Badge>
    }
  }

  const handleAdjustStock = (productId: string, storeId: string) => {
    setSelectedProduct(productId)
    setSelectedStore(storeId)
    setShowAdjustmentModal(true)
  }

  const handleNewInventory = () => {
    setSelectedProduct("")
    setSelectedStore("")
    setShowAdjustmentModal(true)
  }

  const totalProducts = inventory.length
  const lowStockItems = inventory.filter(item => item.current_stock <= (item.products?.alert_stock || 10) && item.current_stock > 0).length
  const outOfStockItems = inventory.filter(item => item.current_stock === 0).length
  const overstockItems = 0 // À implémenter selon les règles métier

  const filteredInventory = useMemo(() => {
    const normalize = (s: any) => (s ? String(s).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase() : '')
    const tokens = normalize(searchTerm).split(/\s+/).filter(Boolean)
    let data = inventory
    // apply filters
    if (filters.store !== 'all') {
      data = data.filter((it: any) => it.stores?.name === filters.store)
    }
    if (filters.status !== 'all') {
      data = data.filter((it: any) => {
        const stock = it.current_stock
        const alertStock = it.products?.alert_stock || 10
        if (filters.status === 'out') return stock === 0
        if (filters.status === 'low') return stock > 0 && stock <= alertStock
        if (filters.status === 'ok') return stock > alertStock
        return true
      })
    }
    if (tokens.length === 0) return data
    return data.filter((item: any) => {
      const fields = [item.products?.name, item.products?.sku, item.stores?.name]
      const haystack = normalize(fields.filter(Boolean).join(' '))
      return tokens.every(t => haystack.includes(t))
    })
  }, [inventory, searchTerm, filters])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Warehouse className="w-7 h-7 text-primary" />
            Inventaire
          </h1>
          <p className="text-muted-foreground">
            Gérez et suivez vos stocks en temps réel
          </p>
        </div>
        
        <Button onClick={handleNewInventory} size="touch" className="gap-2">
          <Plus className="w-4 h-4" />
          Faire un inventaire
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total produits</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Références
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock faible</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{lowStockItems}</div>
            <p className="text-xs text-muted-foreground">
              À réapprovisionner
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ruptures</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{outOfStockItems}</div>
            <p className="text-xs text-muted-foreground">
              Urgence
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Surstockage</CardTitle>
            <Package className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">{overstockItems}</div>
            <p className="text-xs text-muted-foreground">
              À écouler
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Rechercher un produit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Popover open={showFilters} onOpenChange={setShowFilters}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="touch" className="gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4" />
              Filtres
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[92vw] sm:w-80 max-h-[70vh] overflow-auto" align="end">
            <div className="space-y-4">
              <h4 className="font-medium">Filtres</h4>
              <div className="space-y-2">
                <label className="text-sm font-medium">Magasin</label>
                <Select value={filters.store} onValueChange={(value) => setFilters(prev => ({ ...prev, store: value }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Tous les magasins" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les magasins</SelectItem>
                    {Array.from(new Set(inventory.map((it: any) => it.stores?.name).filter(Boolean))).map((name: any) => (
                      <SelectItem key={String(name)} value={String(name)}>{String(name)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Statut</label>
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="out">Rupture</SelectItem>
                    <SelectItem value="low">Stock faible</SelectItem>
                    <SelectItem value="ok">Normal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 w-full">
                <Button variant="outline" size="sm" onClick={() => setFilters({ store: 'all', status: 'all' })} className="flex-1">Effacer</Button>
                <Button size="sm" onClick={() => setShowFilters(false)} className="flex-1">Appliquer</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Inventory List */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle>État des stocks</CardTitle>
          <CardDescription>Vue d'ensemble de votre inventaire</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Warehouse className="w-16 h-16 text-muted-foreground/20 mb-4" />
              <p className="text-muted-foreground mb-4">Aucun produit en stock</p>
              <Button onClick={handleNewInventory} variant="outline">
                Ajouter un stock
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Magasin</TableHead>
                  <TableHead>Stock actuel</TableHead>
                  <TableHead>Seuil d'alerte</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Dernière MAJ</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.products?.name}</TableCell>
                    <TableCell>{item.products?.sku}</TableCell>
                    <TableCell>{item.stores?.name}</TableCell>
                    <TableCell className="font-medium">{item.current_stock}</TableCell>
                    <TableCell>{item.products?.alert_stock || 10}</TableCell>
                    <TableCell>{getStatusBadge(item)}</TableCell>
                    <TableCell>{new Date(item.assigned_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleAdjustStock(item.product_id, item.store_id)}>
                            Ajuster stock
                          </DropdownMenuItem>
                          <DropdownMenuItem>Voir historique</DropdownMenuItem>
                          <DropdownMenuItem>Définir seuils</DropdownMenuItem>
                          <DropdownMenuItem>Transfert magasin</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <InventoryAdjustmentModal 
        open={showAdjustmentModal}
        onOpenChange={setShowAdjustmentModal}
        onSuccess={fetchInventory}
        productId={selectedProduct}
        storeId={selectedStore}
      />
    </div>
  )
}