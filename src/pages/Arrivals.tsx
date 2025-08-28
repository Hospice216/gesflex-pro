import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Search, Filter, MoreHorizontal, Package, CheckCircle, Clock, AlertCircle, X, RefreshCw, AlertTriangle, Download } from "lucide-react"
import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrivalValidationModal } from "@/components/ArrivalValidationModal"
import { TransferReceptionModal } from "@/components/TransferReceptionModal"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { useAuth } from "@/contexts/AuthContext"

export default function Arrivals() {
  const { toast } = useToast()
  const { userProfile } = useAuth()
  const isManager = userProfile?.role === 'Manager'
  const [searchTerm, setSearchTerm] = useState("")
  const [pendingItems, setPendingItems] = useState<any[]>([])
  const [historyItems, setHistoryItems] = useState<any[]>([])
  const [pendingLoading, setPendingLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [validationModalOpen, setValidationModalOpen] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null)
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [selectedTransfer, setSelectedTransfer] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    supplier: "all",
    store: "all",
    dateRange: null,
    status: "all",
    type: "all" as 'all' | 'Achat' | 'Transfert'
  })
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  // Pagination & tri (historique)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyPageSize, setHistoryPageSize] = useState<number | 'all'>(20)
  const [historySort, setHistorySort] = useState<'date_desc' | 'date_asc'>('date_desc')

  // ✅ SOLUTION : Vérification des permissions
  const canViewArrivals = userProfile?.role && ['Vendeur', 'Manager', 'Admin', 'SuperAdmin'].includes(userProfile.role)
  const canValidateArrivals = userProfile?.role && ['Manager', 'Admin', 'SuperAdmin'].includes(userProfile.role)

  useEffect(() => {
    if (canViewArrivals) {
      loadArrivals()
    }
  }, [canViewArrivals])

  // ✅ SOLUTION : Fonction de chargement optimisée avec requêtes parallèles
  const loadArrivals = async () => {
    try {
      setError(null)
      setPendingLoading(true)
      setHistoryLoading(true)

      // ✅ SOLUTION : Requêtes parallèles pour améliorer les performances
      const [
        { data: pendingPurchases, error: pendingPurchasesError },
        { data: pendingTransfers, error: pendingTransfersError },
        { data: validatedArrivals, error: validatedArrivalsError },
        { data: receivedTransfers, error: receivedTransfersError }
      ] = await Promise.all([
        supabase
          .from('purchases')
          .select(`*, suppliers(name), products(name, sku), stores(name)`)
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
        
        supabase
          .from('store_transfers')
          .select('*, product:products(name, sku)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
        
        supabase.from('arrivals').select('purchase_id'),
        
        supabase.from('transfer_receptions').select('transfer_id')
      ])

      // ✅ SOLUTION : Gestion d'erreur unifiée
      if (pendingPurchasesError) throw pendingPurchasesError
      if (pendingTransfersError) throw pendingTransfersError
      if (validatedArrivalsError) throw validatedArrivalsError
      if (receivedTransfersError) throw receivedTransfersError

      // ✅ SOLUTION : Filtrage des données déjà traitées
      const validatedPurchaseIds = new Set((validatedArrivals || []).map((a: any) => a.purchase_id))
      const receivedTransferIds = new Set((receivedTransfers || []).map((r: any) => r.transfer_id))

      const pendingPurchasesFiltered = (pendingPurchases || []).filter(p => !validatedPurchaseIds.has(p.id))
      const pendingTransfersFiltered = (pendingTransfers || []).filter(t => !receivedTransferIds.has(t.id))

      const pendingUnified = [
        ...pendingPurchasesFiltered.map(p => ({ type: 'Achat', ...p })),
        ...pendingTransfersFiltered.map(t => ({ type: 'Transfert', ...t })),
      ]

      setPendingItems(pendingUnified)
      setPendingLoading(false)

      // ✅ SOLUTION : Chargement de l'historique en parallèle
      const [
        { data: historyArrivals, error: historyArrivalsError },
        { data: historyReceptions, error: historyReceptionsError }
      ] = await Promise.all([
        supabase
          .from('arrivals')
          .select(`*, purchases(*, suppliers(name), products(name, sku), stores(name))`)
          .order('created_at', { ascending: false })
          .limit(100),
        
        supabase
          .from('transfer_receptions')
          .select(`*, store_transfers(*, product:products(name, sku))`)
          .order('received_at', { ascending: false })
          .limit(100)
      ])

      if (historyArrivalsError) throw historyArrivalsError
      if (historyReceptionsError) throw historyReceptionsError

      const historyUnified = [
        ...(historyArrivals || []).map(a => ({ type: 'Achat', ...a })),
        ...(historyReceptions || []).map(r => ({ type: 'Transfert', ...r })),
      ]

      setHistoryItems(historyUnified)
      setHistoryLoading(false)
    } catch (error) {
      console.error('Error loading arrivals:', error)
      setError("Impossible de charger les arrivages")
      toast({
        title: "Erreur",
        description: "Impossible de charger les arrivages",
        variant: "destructive",
      })
      setPendingLoading(false)
      setHistoryLoading(false)
    }
  }

  // ✅ SOLUTION : Fonction de gestion d'erreur avec retry
  const handleRetry = () => {
    setError(null)
    loadArrivals()
  }

  const getStatusBadge = (isValidated: boolean, hasDiscrepancy?: boolean) => {
    if (isValidated) {
      return <Badge variant="default" className="gap-1 bg-success text-success-foreground">
        <CheckCircle className="w-3 h-3" />Validé
      </Badge>
    } else if (hasDiscrepancy) {
      return <Badge variant="destructive" className="gap-1">
        <AlertCircle className="w-3 h-3" />Erreur
      </Badge>
    } else {
      return <Badge variant="secondary" className="gap-1">
        <Clock className="w-3 h-3" />En attente
      </Badge>
    }
  }

  // ✅ SOLUTION : Fonction de validation avec vérification des permissions
  const handleValidateArrival = (purchase: any) => {
    if (!canValidateArrivals) {
      toast({
        title: "Permission refusée",
        description: "Vous n'avez pas les permissions pour valider les arrivages",
        variant: "destructive",
      })
      return
    }
    setSelectedPurchase(purchase)
    setValidationModalOpen(true)
  }

  const clearFilters = () => {
    setFilters({
      supplier: "all",
      store: "all",
      dateRange: null,
      status: "all",
      type: "all"
    })
  }

  // ✅ SOLUTION : Fonction de filtrage optimisée
  const getFilteredItems = (items: any[]) => {
    const normalize = (s: any) => (s ? String(s).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase() : '')
    const tokens = normalize(searchTerm).split(/\s+/).filter(Boolean)
    let filtered = items.filter(item => {
      if (tokens.length === 0) return true
      if (item.type === 'Achat') {
        const p = item
        const hay = normalize([
          p.purchases?.suppliers?.name,
          p.purchases?.products?.name,
          p.purchases?.products?.sku,
          p.suppliers?.name,
          p.products?.name,
          p.products?.sku,
        ].filter(Boolean).join(' '))
        return tokens.every(t => hay.includes(t))
      } else {
        const t = item
        const hay = normalize([t.transfer_code, t.product_name].filter(Boolean).join(' '))
        return tokens.every(tok => hay.includes(tok))
      }
    })

    // Filtre par type (achat/transfert)
    if (filters.type && filters.type !== "all") {
      filtered = filtered.filter(item => item.type === filters.type)
    }

    // Filtre par fournisseur
    if (filters.supplier && filters.supplier !== "all") {
      filtered = filtered.filter(item => 
        item.type === 'Achat' && 
        (item.suppliers?.name === filters.supplier || item.purchases?.suppliers?.name === filters.supplier)
      )
    }

    // Filtre par magasin
    if (filters.store && filters.store !== "all") {
      filtered = filtered.filter(item => 
        item.type === 'Achat' && 
        (item.stores?.name === filters.store || item.purchases?.stores?.name === filters.store)
      )
    }

    // Filtre par date
    if (filters.dateRange?.from) {
      filtered = filtered.filter(item => {
        const d = new Date(item.created_at || item.received_at)
        return d >= filters.dateRange.from
      })
    }

    if (filters.dateRange?.to) {
      filtered = filtered.filter(item => {
        const d = new Date(item.created_at || item.received_at)
        return d <= filters.dateRange.to
      })
    }

    // Filtre par statut (pour l'historique)
    if (filters.status && filters.status !== "all") {
      filtered = filtered.filter(item => {
        if (item.type === 'Achat') {
          const qty = item.received_quantity ?? item.purchases?.quantity ?? item.quantity
          const ordered = item.purchases?.quantity ?? item.quantity
          const hasDiscrepancy = qty !== ordered
          if (filters.status === 'discrepancy') return hasDiscrepancy
          if (filters.status === 'perfect') return !hasDiscrepancy
          return true
        }
        return true
      })
    }

    return filtered
  }

  const filteredPending = getFilteredItems(pendingItems)
  const filteredValidated = getFilteredItems(historyItems)
  // Tri
  const sortedValidated = [...filteredValidated].sort((a, b) => {
    const da = new Date(a.received_at || a.created_at).getTime()
    const db = new Date(b.received_at || b.created_at).getTime()
    return historySort === 'date_desc' ? db - da : da - db
  })
  // Pagination
  const historyTotalPages = historyPageSize === 'all' ? 1 : Math.max(1, Math.ceil(sortedValidated.length / historyPageSize))
  const currentHistoryPage = Math.min(historyPage, historyTotalPages)
  const paginatedValidated = historyPageSize === 'all'
    ? sortedValidated
    : sortedValidated.slice(
        (currentHistoryPage - 1) * (historyPageSize as number),
        currentHistoryPage * (historyPageSize as number)
      )

  useEffect(() => {
    setHistoryPage(1)
  }, [historyPageSize, filters])

  // ✅ SOLUTION : Options uniques optimisées
  const uniqueSuppliers = [...new Set(
    pendingItems
      .filter(i => i.type === 'Achat')
      .map(p => p.suppliers?.name || p.purchases?.suppliers?.name)
      .filter(Boolean)
  )]
  
  const uniqueStores = [...new Set(
    pendingItems
      .filter(i => i.type === 'Achat')
      .map(p => p.stores?.name || p.purchases?.stores?.name)
      .filter(Boolean)
  )]

  // Export CSV de l'historique filtré
  const exportHistoryCSV = () => {
    const rows = filteredValidated
    const headers = [
      'Type',
      ...(userProfile?.role === 'Manager' ? [] : ['Fournisseur']),
      'Produit', 'Quantité', 'Date'
    ]
    const csv = [headers.join(',')].concat(
      rows.map(item => {
        const fournisseur = item.type==='Achat' ? (item.purchases?.suppliers?.name || '') : ''
        const produit = item.type==='Achat' ? (item.purchases?.products?.name || '') : (item.product_name || item.products?.name || '')
        const qty = item.received_quantity ?? ''
        const d = new Date(item.received_at || item.created_at).toLocaleDateString()
        const cols = [item.type, ...(userProfile?.role === 'Manager' ? [] : [fournisseur]), produit, qty, d]
        return cols.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
      })
    ).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `arrivages_historique_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Export PDF (impression HTML)
  const exportHistoryPDF = () => {
    const w = window.open('', '_blank')
    if (!w) return
    const rows = filteredValidated
    const showSupplier = userProfile?.role !== 'Manager'
    const tableHeaders = `
      <tr>
        <th style="text-align:left;padding:6px">Type</th>
        ${showSupplier ? '<th style="text-align:left;padding:6px">Fournisseur</th>' : ''}
        <th style="text-align:left;padding:6px">Produit</th>
        <th style="text-align:right;padding:6px">Quantité</th>
        <th style="text-align:left;padding:6px">Date</th>
      </tr>`
    const tableRows = rows.map(item => {
      const fournisseur = item.type==='Achat' ? (item.purchases?.suppliers?.name || '') : ''
      const produit = item.type==='Achat' ? (item.purchases?.products?.name || '') : (item.product_name || item.products?.name || '')
      const qty = item.received_quantity ?? ''
      const d = new Date(item.received_at || item.created_at).toLocaleDateString()
      return `
        <tr>
          <td style="padding:6px">${item.type}</td>
          ${showSupplier ? `<td style=\"padding:6px\">${fournisseur}</td>` : ''}
          <td style="padding:6px">${produit}</td>
          <td style="padding:6px;text-align:right">${qty}</td>
          <td style="padding:6px">${d}</td>
        </tr>`
    }).join('')
    w.document.write(`
      <html><head><title>Historique des arrivages</title></head>
      <body>
        <h3>Historique des arrivages</h3>
        <table style="width:100%;border-collapse:collapse" border="1">${tableHeaders}${tableRows}</table>
      </body></html>`)
    w.document.close()
    w.focus()
    w.print()
  }

  // ✅ SOLUTION : Affichage d'erreur avec possibilité de retry
  if (error && !canViewArrivals) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Package className="w-7 h-7 text-primary" />
              Arrivages
            </h1>
            <p className="text-muted-foreground">
              Gérez les arrivages de marchandises en magasin
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Package className="w-7 h-7 text-primary" />
            Arrivages
          </h1>
          <p className="text-muted-foreground">
            Gérez les arrivages de marchandises en magasin
          </p>
        </div>
        
        <div className="flex gap-2">
          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" />
            {pendingItems.length} en attente
          </Badge>
          <Badge variant="outline" className="gap-1 bg-success/10 text-success">
            <CheckCircle className="w-3 h-3" />
            {historyItems.length} validés
          </Badge>
        </div>
      </div>

      {/* ✅ SOLUTION : Gestion d'erreur avec bouton de retry */}
      {error ? (
        <Card className="bg-destructive/10 border border-destructive/20">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-destructive mb-2">
              Erreur de chargement
            </h3>
            <p className="text-destructive/80 mb-4">{error}</p>
            <Button onClick={handleRetry} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Search and Filters - responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Rechercher un arrivage..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 sm:h-12 text-sm sm:text-base"
              />
            </div>
            <Popover open={filterModalOpen} onOpenChange={setFilterModalOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="touch" className="gap-2 w-full sm:w-auto">
                  <Filter className="w-4 h-4" />
                  Filtres
                  {(filters.supplier !== "all" || filters.store !== "all" || filters.dateRange || filters.status !== "all") && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                      {(filters.supplier !== "all" ? 1 : 0) + 
                       (filters.store !== "all" ? 1 : 0) + 
                       (filters.dateRange ? 1 : 0) + 
                       (filters.status !== "all" ? 1 : 0)}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[92vw] sm:w-80 max-h-[70vh] overflow-auto" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Filtres</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="h-6 px-2 text-xs"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Réinitialiser
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Type</label>
                      <Select value={filters.type} onValueChange={(value: 'all' | 'Achat' | 'Transfert') => setFilters(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger className="mt-1 w-full">
                          <SelectValue placeholder="Tous les types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les types</SelectItem>
                          <SelectItem value="Achat">Achat</SelectItem>
                          <SelectItem value="Transfert">Transfert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {!isManager && (
                      <div>
                        <label className="text-sm font-medium">Fournisseur</label>
                        <Select value={filters.supplier} onValueChange={(value) => setFilters(prev => ({ ...prev, supplier: value }))}>
                          <SelectTrigger className="mt-1 w-full">
                            <SelectValue placeholder="Tous les fournisseurs" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tous les fournisseurs</SelectItem>
                            {uniqueSuppliers.map((supplier) => (
                              <SelectItem key={supplier} value={supplier}>
                                {supplier}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium">Magasin</label>
                      <Select value={filters.store} onValueChange={(value) => setFilters(prev => ({ ...prev, store: value }))}>
                        <SelectTrigger className="mt-1 w-full">
                          <SelectValue placeholder="Tous les magasins" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les magasins</SelectItem>
                          {uniqueStores.map((store) => (
                            <SelectItem key={store} value={store}>
                              {store}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Période</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="mt-1 w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filters.dateRange?.from ? (
                              filters.dateRange.to ? (
                                <>
                                  {format(filters.dateRange.from, "LLL dd, y", { locale: fr })} -{" "}
                                  {format(filters.dateRange.to, "LLL dd, y", { locale: fr })}
                                </>
                              ) : (
                                format(filters.dateRange.from, "LLL dd, y", { locale: fr })
                              )
                            ) : (
                              <span>Période</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={filters.dateRange?.from}
                            selected={filters.dateRange}
                            onSelect={(range) => setFilters(prev => ({ ...prev, dateRange: range }))}
                            numberOfMonths={2}
                            locale={fr}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Statut (historique)</label>
                      <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                        <SelectTrigger className="mt-1 w-full">
                          <SelectValue placeholder="Tous les statuts" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les statuts</SelectItem>
                          <SelectItem value="perfect">Sans écart</SelectItem>
                          <SelectItem value="discrepancy">Avec écart</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Arrivals Tabs */}
          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList>
              <TabsTrigger value="pending">En Attente ({filteredPending.length})</TabsTrigger>
              <TabsTrigger value="history">Historique ({filteredValidated.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              <Card className="bg-gradient-card shadow-card">
                <CardHeader>
                  <CardTitle>Arrivages à valider</CardTitle>
                  <CardDescription>Achats et transferts en attente de validation</CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingLoading ? (
                    // ✅ SOLUTION : Skeleton loading pour le tableau
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                          <div className="animate-pulse bg-gray-300 h-4 w-16 rounded"></div>
                          <div className="animate-pulse bg-gray-300 h-4 w-32 rounded"></div>
                          <div className="animate-pulse bg-gray-300 h-4 w-48 rounded"></div>
                          <div className="animate-pulse bg-gray-300 h-4 w-24 rounded"></div>
                          <div className="animate-pulse bg-gray-300 h-4 w-20 rounded"></div>
                          <div className="animate-pulse bg-gray-300 h-8 w-24 rounded"></div>
                        </div>
                      ))}
                    </div>
                  ) : filteredPending.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Package className="w-16 h-16 text-muted-foreground/20 mb-4" />
                      <p className="text-muted-foreground mb-4">
                        {searchTerm ? "Aucun arrivage ne correspond à votre recherche" : "Aucun arrivage en attente"}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Desktop table */}
                      <div className="hidden sm:block">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Type</TableHead>
                              {!isManager && <TableHead>Fournisseur</TableHead>}
                              <TableHead>Produit</TableHead>
                              <TableHead>Magasin</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredPending.map((item) => (
                              <TableRow key={`${item.type}-${item.id}`}>
                                <TableCell>{item.type}</TableCell>
                                {!isManager && (
                                  <TableCell>{item.type==='Achat' ? (item.suppliers?.name || item.purchases?.suppliers?.name) : '—'}</TableCell>
                                )}
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{item.type==='Achat' ? (item.products?.name || item.purchases?.products?.name) : (item.product_name || item.products?.name)}</p>
                                    {item.type==='Achat' && (
                                      <p className="text-sm text-muted-foreground">SKU: {item.products?.sku || item.purchases?.products?.sku}</p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>{item.type==='Achat' ? (item.stores?.name || item.purchases?.stores?.name) : '—'}</TableCell>
                                <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                                <TableCell>
                                  {item.type==='Achat' ? (
                                    <Button size="sm" onClick={() => handleValidateArrival(item)} className="gap-1">
                                      <CheckCircle className="w-3 h-3" /> Valider
                                    </Button>
                                  ) : (
                                    <Button size="sm" onClick={() => { setSelectedTransfer(item); setTransferModalOpen(true); }} className="gap-1">
                                      <CheckCircle className="w-3 h-3" /> Réceptionner
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Mobile cards */}
                      <div className="space-y-3 sm:hidden">
                        {filteredPending.map((item) => (
                          <div key={`${item.type}-${item.id}`} className="border rounded-lg p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs uppercase text-muted-foreground">{item.type}</p>
                                <p className="font-medium truncate">{item.type==='Achat' ? (item.products?.name || item.purchases?.products?.name) : (item.product_name || item.products?.name)}</p>
                                {item.type==='Achat' && (
                                  <p className="text-xs text-muted-foreground">SKU: {item.products?.sku || item.purchases?.products?.sku}</p>
                                )}
                              </div>
                              <div>
                                <span className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                              {!isManager && (
                                <div>
                                  <span className="text-muted-foreground">Fournisseur</span>
                                  <div className="font-medium">{item.type==='Achat' ? (item.suppliers?.name || item.purchases?.suppliers?.name) : '—'}</div>
                                </div>
                              )}
                              <div className="text-right">
                                <span className="text-muted-foreground">Magasin</span>
                                <div className="font-medium">{item.type==='Achat' ? (item.stores?.name || item.purchases?.stores?.name) : '—'}</div>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-end">
                              {item.type==='Achat' ? (
                                <Button size="sm" onClick={() => handleValidateArrival(item)} className="gap-1 w-full sm:w-auto">
                                  <CheckCircle className="w-3 h-3" /> Valider
                                </Button>
                              ) : (
                                <Button size="sm" onClick={() => { setSelectedTransfer(item); setTransferModalOpen(true); }} className="gap-1 w-full sm:w-auto">
                                  <CheckCircle className="w-3 h-3" /> Réceptionner
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card className="bg-gradient-card shadow-card">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <CardTitle>Historique des arrivages</CardTitle>
                      <CardDescription>Achats validés et réceptions de transferts</CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Par page</span>
                        <Select value={String(historyPageSize)} onValueChange={(v) => setHistoryPageSize(v === 'all' ? 'all' : parseInt(v))}>
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
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={exportHistoryCSV} className="gap-2">
                          <Download className="w-4 h-4" /> CSV
                        </Button>
                        <Button variant="outline" size="sm" onClick={exportHistoryPDF} className="gap-2">
                          <Download className="w-4 h-4" /> PDF
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {historyLoading ? (
                    // ✅ SOLUTION : Skeleton loading pour l'historique
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                          <div className="animate-pulse bg-gray-300 h-4 w-16 rounded"></div>
                          <div className="animate-pulse bg-gray-300 h-4 w-32 rounded"></div>
                          <div className="animate-pulse bg-gray-300 h-4 w-48 rounded"></div>
                          <div className="animate-pulse bg-gray-300 h-4 w-24 rounded"></div>
                          <div className="animate-pulse bg-gray-300 h-4 w-20 rounded"></div>
                          <div className="animate-pulse bg-gray-300 h-4 w-24 rounded"></div>
                          <div className="animate-pulse bg-gray-300 h-4 w-20 rounded"></div>
                        </div>
                      ))}
                    </div>
                  ) : filteredValidated.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Package className="w-16 h-16 text-muted-foreground/20 mb-4" />
                      <p className="text-muted-foreground mb-4">
                        {searchTerm ? "Aucun arrivage ne correspond à votre recherche" : "Aucun arrivage validé"}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Desktop table */}
                      <div className="hidden sm:block">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Type</TableHead>
                              {!isManager && <TableHead>Fournisseur</TableHead>}
                              <TableHead>Produit</TableHead>
                              <TableHead>Quantité</TableHead>
                              <TableHead>Statut</TableHead>
                              <TableHead>Validé par</TableHead>
                              <TableHead>Date validation</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedValidated.map((item) => (
                              <TableRow key={`${item.type}-${item.id}`}>
                                <TableCell>{item.type}</TableCell>
                                {!isManager && (
                                  <TableCell>{item.type==='Achat' ? (item.purchases?.suppliers?.name) : '—'}</TableCell>
                                )}
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{item.type==='Achat' ? (item.purchases?.products?.name) : (item.product_name || item.products?.name)}</p>
                                    {item.type==='Achat' && (
                                      <p className="text-sm text-muted-foreground">SKU: {item.purchases?.products?.sku}</p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span>Reçu: {item.received_quantity}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {getStatusBadge(true, false)}
                                </TableCell>
                                <TableCell>
                                  N/A
                                </TableCell>
                                <TableCell>
                                  {new Date(item.received_at || item.created_at).toLocaleDateString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Mobile cards */}
                      <div className="space-y-3 sm:hidden">
                        {paginatedValidated.map((item) => (
                          <div key={`${item.type}-${item.id}`} className="border rounded-lg p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs uppercase text-muted-foreground">{item.type}</p>
                                <p className="font-medium truncate">{item.type==='Achat' ? (item.purchases?.products?.name) : (item.product_name || item.products?.name)}</p>
                                {item.type==='Achat' && (
                                  <p className="text-xs text-muted-foreground">SKU: {item.purchases?.products?.sku}</p>
                                )}
                              </div>
                              <div>
                                {getStatusBadge(true, false)}
                              </div>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                              {!isManager && (
                                <div>
                                  <span className="text-muted-foreground">Fournisseur</span>
                                  <div className="font-medium">{item.type==='Achat' ? (item.purchases?.suppliers?.name) : '—'}</div>
                                </div>
                              )}
                              <div className="text-right">
                                <span className="text-muted-foreground">Reçu</span>
                                <div className="font-medium">{item.received_quantity}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Date</span>
                                <div className="font-medium">{new Date(item.received_at || item.created_at).toLocaleDateString()}</div>
                              </div>
                              <div className="text-right">
                                <span className="text-muted-foreground">Validé par</span>
                                <div className="font-medium">N/A</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination controls */}
                      <div className="mt-4 flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentHistoryPage <= 1}
                          onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                        >
                          Précédent
                        </Button>
                        <span className="text-sm text-muted-foreground">Page {currentHistoryPage} / {historyTotalPages}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentHistoryPage >= historyTotalPages}
                          onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))}
                        >
                          Suivant
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      <ArrivalValidationModal
        isOpen={validationModalOpen}
        onClose={() => setValidationModalOpen(false)}
        onSuccess={loadArrivals}
        purchase={selectedPurchase}
      />
      <TransferReceptionModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        onSuccess={loadArrivals}
        transfer={selectedTransfer}
      />
    </div>
  )
}