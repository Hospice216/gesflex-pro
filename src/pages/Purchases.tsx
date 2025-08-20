import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Filter, MoreHorizontal, ShoppingCart, DollarSign, RefreshCw, AlertTriangle, Download } from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { useCurrency } from "@/hooks/useCurrency"
import { PurchaseModal } from "@/components/PurchaseModal"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"

function PurchasesContent() {
  const { formatAmount } = useCurrency()
  const { toast } = useToast()
  const { userProfile } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [purchases, setPurchases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending')
  const [historyPage, setHistoryPage] = useState(1)
  const [historyPageSize, setHistoryPageSize] = useState<number | 'all'>(20)

  // ✅ SOLUTION : Vérification des permissions
  const canCreatePurchase = userProfile?.role && ['Admin', 'SuperAdmin', 'Manager'].includes(userProfile.role)
  const canEditPurchase = userProfile?.role && ['Admin', 'SuperAdmin', 'Manager'].includes(userProfile.role)
  const canDeletePurchase = userProfile?.role && ['Admin', 'SuperAdmin'].includes(userProfile.role)

  useEffect(() => {
    if (canCreatePurchase) {
      loadPurchases()
    }
  }, [canCreatePurchase])

  // ✅ SOLUTION : Fonction de chargement avec gestion d'erreur robuste
  const loadPurchases = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: purchases, error } = await supabase
        .from('purchases')
        .select(`
          *,
          suppliers(name),
          products(name, sku),
          stores(name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // ✅ SOLUTION : Récupération des informations utilisateur en parallèle
      const userIds = [...new Set((purchases || []).map(p => p.created_by).filter(Boolean))]

      let usersData: any = {}
      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', userIds)

        if (!usersError && users) {
          usersData = users.reduce((acc, user) => {
            acc[user.id] = user
            return acc
          }, {})
        }
      }

      // ✅ SOLUTION : Enrichissement des données avec les informations utilisateur
      const enrichedPurchases = (purchases || []).map(purchase => ({
        ...purchase,
        created_by_user: usersData[purchase.created_by]
      }))

      setPurchases(enrichedPurchases)
    } catch (error) {
      console.error('Error loading purchases:', error)
      setError("Impossible de charger les achats")
      toast({
        title: "Erreur",
        description: "Impossible de charger les achats",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // ✅ SOLUTION : Fonction de gestion d'erreur avec retry
  const handleRetry = () => {
    setError(null)
    loadPurchases()
  }

  const getStatusBadge = (status: string) => {
    if (status === 'validated') {
      return <Badge variant="default" className="bg-success text-success-foreground">Validé</Badge>
    } else {
      return <Badge variant="secondary">En attente</Badge>
    }
  }

  // ✅ SOLUTION : Fonctions avec vérification des permissions
  const handleNewPurchase = () => {
    if (!canCreatePurchase) {
      toast({
        title: "Permission refusée",
        description: "Vous n'avez pas les permissions pour créer des achats",
        variant: "destructive",
      })
      return
    }
    setSelectedPurchase(null)
    setPurchaseModalOpen(true)
  }

  const handleEditPurchase = (purchase: any) => {
    if (!canEditPurchase) {
      toast({
        title: "Permission refusée",
        description: "Vous n'avez pas les permissions pour modifier des achats",
        variant: "destructive",
      })
      return
    }

    if (purchase.status !== 'validated') {
      setSelectedPurchase(purchase)
      setPurchaseModalOpen(true)
    } else {
      toast({
        title: "Modification impossible",
        description: "Impossible de modifier un achat validé",
        variant: "destructive",
      })
    }
  }

  const handleDeletePurchase = async (purchaseId: string, isValidated: boolean) => {
    if (!canDeletePurchase) {
      toast({
        title: "Permission refusée",
        description: "Vous n'avez pas les permissions pour supprimer des achats",
        variant: "destructive",
      })
      return
    }

    if (isValidated) {
      toast({
        title: "Suppression impossible",
        description: "Impossible de supprimer un achat validé",
        variant: "destructive",
      })
      return
    }

    if (!confirm("Êtes-vous sûr de vouloir supprimer cet achat ?")) return

    try {
      const { error } = await supabase
        .from('purchases')
        .delete()
        .eq('id', purchaseId)

      if (error) throw error

      toast({
        title: "Succès",
        description: "Achat supprimé avec succès",
      })
      loadPurchases()
    } catch (error) {
      console.error('Error deleting purchase:', error)
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'achat",
        variant: "destructive",
      })
    }
  }

  // ✅ SOLUTION : Calculs optimisés avec useMemo
  const { totalAmount, pendingCount, filteredPendingPurchases, filteredHistoryPurchases } = useMemo(() => {
    const total = purchases.reduce((sum, purchase) => sum + (purchase.total_amount || 0), 0)
    const filtered = purchases.filter(purchase =>
      purchase.suppliers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.products?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.products?.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.stores?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    const pending = purchases.filter(p => p.status !== 'validated').length
    const filteredPending = filtered.filter(p => p.status !== 'validated')
    const filteredHistory = filtered.filter(p => p.status === 'validated')

    return {
      totalAmount: total,
      pendingCount: pending,
      filteredPendingPurchases: filteredPending,
      filteredHistoryPurchases: filteredHistory
    }
  }, [purchases, searchTerm])

  // Pagination (historique)
  const historyTotalPages = historyPageSize === 'all' ? 1 : Math.max(1, Math.ceil(filteredHistoryPurchases.length / (historyPageSize as number)))
  const currentHistoryPage = Math.min(historyPage, historyTotalPages)
  const paginatedHistoryPurchases = historyPageSize === 'all'
    ? filteredHistoryPurchases
    : filteredHistoryPurchases.slice(
        (currentHistoryPage - 1) * (historyPageSize as number),
        currentHistoryPage * (historyPageSize as number)
      )

  useEffect(() => {
    // Réinitialiser si le filtre ou la taille de page change
    setHistoryPage(1)
  }, [filteredHistoryPurchases.length, historyPageSize])

  // Export CSV d'une liste passée en paramètre
  const exportPurchasesCSV = (rows: any[]) => {
    const headers = [
      'Fournisseur', 'Produit', 'SKU', 'Magasin', 'Quantité', 'Prix unitaire', 'Total', 'Statut', 'Date'
    ]
    const csv = [headers.join(',')].concat(
      (rows || []).map((p: any) => {
        const fournisseur = p.suppliers?.name || ''
        const produit = p.products?.name || ''
        const sku = p.products?.sku || ''
        const magasin = p.stores?.name || ''
        const qty = p.quantity ?? ''
        const unit = p.unit_price ?? ''
        const total = p.total_amount ?? ''
        const statut = p.status === 'validated' ? 'Validé' : 'En attente'
        const date = new Date(p.created_at).toLocaleDateString()
        const cols = [fournisseur, produit, sku, magasin, qty, unit, total, statut, date]
        return cols.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
      })
    ).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `achats_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Export PDF (impression HTML)
  const exportPurchasesPDF = (rows: any[]) => {
    const w = window.open('', '_blank')
    if (!w) return
    const tableHeaders = `
      <tr>
        <th style="text-align:left;padding:6px">Fournisseur</th>
        <th style="text-align:left;padding:6px">Produit</th>
        <th style="text-align:left;padding:6px">SKU</th>
        <th style="text-align:left;padding:6px">Magasin</th>
        <th style="text-align:right;padding:6px">Quantité</th>
        <th style="text-align:right;padding:6px">PU</th>
        <th style="text-align:right;padding:6px">Total</th>
        <th style="text-align:left;padding:6px">Statut</th>
        <th style="text-align:left;padding:6px">Date</th>
      </tr>`
    const tableRows = (rows || []).map((p: any) => {
      const fournisseur = p.suppliers?.name || ''
      const produit = p.products?.name || ''
      const sku = p.products?.sku || ''
      const magasin = p.stores?.name || ''
      const qty = p.quantity ?? ''
      const unit = p.unit_price ?? ''
      const total = p.total_amount ?? ''
      const statut = p.status === 'validated' ? 'Validé' : 'En attente'
      const date = new Date(p.created_at).toLocaleDateString()
      return `
        <tr>
          <td style="padding:6px">${fournisseur}</td>
          <td style="padding:6px">${produit}</td>
          <td style="padding:6px">${sku}</td>
          <td style="padding:6px">${magasin}</td>
          <td style="padding:6px;text-align:right">${qty}</td>
          <td style="padding:6px;text-align:right">${unit}</td>
          <td style="padding:6px;text-align:right">${total}</td>
          <td style="padding:6px">${statut}</td>
          <td style="padding:6px">${date}</td>
        </tr>`
    }).join('')
    w.document.write(`
      <html><head><title>Liste des achats</title></head>
      <body>
        <h3>Liste des achats</h3>
        <table style="width:100%;border-collapse:collapse" border="1">${tableHeaders}${tableRows}</table>
      </body></html>`)
    w.document.close()
    w.focus()
    w.print()
  }

  const exportCurrentCSV = () => {
    const rows = activeTab === 'history' ? filteredHistoryPurchases : filteredPendingPurchases
    exportPurchasesCSV(rows)
  }

  const exportCurrentPDF = () => {
    const rows = activeTab === 'history' ? filteredHistoryPurchases : filteredPendingPurchases
    exportPurchasesPDF(rows)
  }

  // ✅ SOLUTION : Affichage d'erreur avec possibilité de retry
  if (error && !canCreatePurchase) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <ShoppingCart className="w-7 h-7 text-primary" />
              Achats
            </h1>
            <p className="text-muted-foreground">
              Gérez vos commandes et achats fournisseurs
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
            <ShoppingCart className="w-7 h-7 text-primary" />
            Achats
          </h1>
          <p className="text-muted-foreground">
            Gérez vos commandes et achats fournisseurs
          </p>
        </div>
        
        {canCreatePurchase && (
          <Button onClick={handleNewPurchase} size="touch" className="gap-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            Nouvel achat
          </Button>
        )}
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
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-gradient-card shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total achats</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatAmount(totalAmount)}</div>
                <p className="text-xs text-muted-foreground">
                  Ce mois-ci
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-card shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Commandes</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{purchases.length}</div>
                <p className="text-xs text-muted-foreground">
                  Total commandes
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">En attente</CardTitle>
                <ShoppingCart className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingCount}</div>
                <p className="text-xs text-muted-foreground">
                  À traiter
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Rechercher un achat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 sm:h-12 text-sm sm:text-base"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" size="touch" className="gap-2 flex-1 sm:flex-none">
                <Filter className="w-4 h-4" />
                Filtres
              </Button>
              <Button variant="outline" size="touch" onClick={exportCurrentCSV} className="gap-2 flex-1 sm:flex-none">
                <Download className="w-4 h-4" /> CSV
              </Button>
              <Button variant="outline" size="touch" onClick={exportCurrentPDF} className="gap-2 flex-1 sm:flex-none">
                <Download className="w-4 h-4" /> PDF
              </Button>
            </div>
          </div>
          {/* Purchases Tabs */}
          <Tabs defaultValue="pending" onValueChange={(v) => setActiveTab(v as 'pending' | 'history')} className="space-y-4">
            <TabsList>
              <TabsTrigger value="pending">En Attente ({filteredPendingPurchases.length})</TabsTrigger>
              <TabsTrigger value="history">Historique ({filteredHistoryPurchases.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              <Card className="bg-gradient-card shadow-card">
                <CardHeader>
                  <CardTitle>Achats en attente</CardTitle>
                  <CardDescription>Commandes fournisseurs non validées</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    // ✅ SOLUTION : Skeleton loading pour le tableau
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                          <div className="animate-pulse bg-gray-300 h-4 w-32 rounded"></div>
                          <div className="animate-pulse bg-gray-300 h-4 w-48 rounded"></div>
                          <div className="animate-pulse bg-gray-300 h-4 w-24 rounded"></div>
                          <div className="animate-pulse bg-gray-300 h-4 w-16 rounded"></div>
                          <div className="animate-pulse bg-gray-300 h-4 w-20 rounded"></div>
                          <div className="animate-pulse bg-gray-300 h-4 w-24 rounded"></div>
                          <div className="animate-pulse bg-gray-300 h-4 w-20 rounded"></div>
                          <div className="animate-pulse bg-gray-300 h-8 w-24 rounded"></div>
                        </div>
                      ))}
                    </div>
                  ) : filteredPendingPurchases.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <ShoppingCart className="w-16 h-16 text-muted-foreground/20 mb-4" />
                      <p className="text-muted-foreground mb-4">
                        {searchTerm ? "Aucun achat en attente ne correspond à votre recherche" : "Aucun achat en attente"}
                      </p>
                      {canCreatePurchase && (
                        <Button onClick={handleNewPurchase} variant="outline">
                          Créer un achat
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Desktop table */}
                      <div className="hidden sm:block">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fournisseur</TableHead>
                              <TableHead>Produit</TableHead>
                              <TableHead>Magasin</TableHead>
                              <TableHead>Quantité</TableHead>
                              <TableHead>Prix unitaire</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead>Statut</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredPendingPurchases.map((purchase) => (
                              <TableRow key={purchase.id}>
                                <TableCell>{purchase.suppliers?.name}</TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{purchase.products?.name}</p>
                                    <p className="text-sm text-muted-foreground">SKU: {purchase.products?.sku}</p>
                                  </div>
                                </TableCell>
                                <TableCell>{purchase.stores?.name}</TableCell>
                                <TableCell>{purchase.quantity}</TableCell>
                                <TableCell>{formatAmount(purchase.unit_price)}</TableCell>
                                <TableCell className="font-medium">{formatAmount(purchase.total_amount)}</TableCell>
                                <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                                <TableCell>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem>Voir détails</DropdownMenuItem>
                                      {canEditPurchase && (
                                        <DropdownMenuItem 
                                          onClick={() => handleEditPurchase(purchase)}
                                          disabled={purchase.status === 'validated'}
                                        >
                                          Modifier
                                        </DropdownMenuItem>
                                      )}
                                      {canDeletePurchase && (
                                        <DropdownMenuItem className="text-destructive"
                                          onClick={() => handleDeletePurchase(purchase.id, purchase.status === 'validated')}
                                        >
                                          Supprimer
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Mobile cards */}
                      <div className="space-y-3 sm:hidden">
                        {filteredPendingPurchases.map((purchase) => (
                          <div key={purchase.id} className="border rounded-lg p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-medium truncate">{purchase.suppliers?.name || '—'}</p>
                                <p className="text-sm text-muted-foreground truncate">{purchase.stores?.name || '—'}</p>
                              </div>
                              <div>
                                {getStatusBadge(purchase.status)}
                              </div>
                            </div>
                            <div className="mt-2">
                              <p className="font-medium">{purchase.products?.name}</p>
                              <p className="text-xs text-muted-foreground">SKU: {purchase.products?.sku}</p>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Qté</span>
                                <div className="font-medium">{purchase.quantity}</div>
                              </div>
                              <div className="text-right">
                                <span className="text-muted-foreground">PU</span>
                                <div className="font-medium">{formatAmount(purchase.unit_price)}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Date</span>
                                <div className="font-medium">{new Date(purchase.created_at).toLocaleDateString()}</div>
                              </div>
                              <div className="text-right">
                                <span className="text-muted-foreground">Total</span>
                                <div className="font-medium">{formatAmount(purchase.total_amount)}</div>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>Voir détails</DropdownMenuItem>
                                  {canEditPurchase && (
                                    <DropdownMenuItem 
                                      onClick={() => handleEditPurchase(purchase)}
                                      disabled={purchase.status === 'validated'}
                                    >
                                      Modifier
                                    </DropdownMenuItem>
                                  )}
                                  {canDeletePurchase && (
                                    <DropdownMenuItem className="text-destructive"
                                      onClick={() => handleDeletePurchase(purchase.id, purchase.status === 'validated')}
                                    >
                                      Supprimer
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
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
                      <CardTitle>Historique des achats</CardTitle>
                      <CardDescription>Commandes fournisseurs validées</CardDescription>
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
                      <div className="hidden sm:flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => exportPurchasesCSV(filteredHistoryPurchases)} className="gap-2">
                          <Download className="w-4 h-4" /> CSV
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => exportPurchasesPDF(filteredHistoryPurchases)} className="gap-2">
                          <Download className="w-4 h-4" /> PDF
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                          <div className="animate-pulse bg-gray-300 h-4 w-32 rounded"></div>
                          <div className="animate-pulse bg-gray-300 h-4 w-48 rounded"></div>
                          <div className="animate-pulse bg-gray-300 h-4 w-24 rounded"></div>
                          <div className="animate-pulse bg-gray-300 h-4 w-16 rounded"></div>
                          <div className="animate-pulse bg-gray-300 h-4 w-20 rounded"></div>
                          <div className="animate-pulse bg-gray-300 h-4 w-24 rounded"></div>
                          <div className="animate-pulse bg-gray-300 h-4 w-20 rounded"></div>
                          <div className="animate-pulse bg-gray-300 h-8 w-24 rounded"></div>
                        </div>
                      ))}
                    </div>
                  ) : filteredHistoryPurchases.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <ShoppingCart className="w-16 h-16 text-muted-foreground/20 mb-4" />
                      <p className="text-muted-foreground mb-4">
                        {searchTerm ? "Aucun achat validé ne correspond à votre recherche" : "Aucun achat validé"}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="hidden sm:block">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fournisseur</TableHead>
                              <TableHead>Produit</TableHead>
                              <TableHead>Magasin</TableHead>
                              <TableHead>Quantité</TableHead>
                              <TableHead>Prix unitaire</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead>Statut</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedHistoryPurchases.map((purchase) => (
                              <TableRow key={purchase.id}>
                                <TableCell>{purchase.suppliers?.name}</TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{purchase.products?.name}</p>
                                    <p className="text-sm text-muted-foreground">SKU: {purchase.products?.sku}</p>
                                  </div>
                                </TableCell>
                                <TableCell>{purchase.stores?.name}</TableCell>
                                <TableCell>{purchase.quantity}</TableCell>
                                <TableCell>{formatAmount(purchase.unit_price)}</TableCell>
                                <TableCell className="font-medium">{formatAmount(purchase.total_amount)}</TableCell>
                                <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                                <TableCell>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem>Voir détails</DropdownMenuItem>
                                      {canEditPurchase && (
                                        <DropdownMenuItem disabled>
                                          Modifier
                                        </DropdownMenuItem>
                                      )}
                                      {canDeletePurchase && (
                                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeletePurchase(purchase.id, true)}>
                                          Supprimer
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="space-y-3 sm:hidden">
                        {paginatedHistoryPurchases.map((purchase) => (
                          <div key={purchase.id} className="border rounded-lg p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-medium truncate">{purchase.suppliers?.name || '—'}</p>
                                <p className="text-sm text-muted-foreground truncate">{purchase.stores?.name || '—'}</p>
                              </div>
                              <div>
                                {getStatusBadge(purchase.status)}
                              </div>
                            </div>
                            <div className="mt-2">
                              <p className="font-medium">{purchase.products?.name}</p>
                              <p className="text-xs text-muted-foreground">SKU: {purchase.products?.sku}</p>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Qté</span>
                                <div className="font-medium">{purchase.quantity}</div>
                              </div>
                              <div className="text-right">
                                <span className="text-muted-foreground">PU</span>
                                <div className="font-medium">{formatAmount(purchase.unit_price)}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Date</span>
                                <div className="font-medium">{new Date(purchase.created_at).toLocaleDateString()}</div>
                              </div>
                              <div className="text-right">
                                <span className="text-muted-foreground">Total</span>
                                <div className="font-medium">{formatAmount(purchase.total_amount)}</div>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>Voir détails</DropdownMenuItem>
                                  {canEditPurchase && (
                                    <DropdownMenuItem disabled>
                                      Modifier
                                    </DropdownMenuItem>
                                  )}
                                  {canDeletePurchase && (
                                    <DropdownMenuItem className="text-destructive" onClick={() => handleDeletePurchase(purchase.id, true)}>
                                      Supprimer
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))}
                      </div>

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

      <PurchaseModal
        isOpen={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        onSuccess={loadPurchases}
        purchase={selectedPurchase}
      />
    </div>
  )
}

export default function Purchases() {
  return (
    <ProtectedRoute allowedRoles={['Admin', 'SuperAdmin', 'Manager']}>
      <PurchasesContent />
    </ProtectedRoute>
  )
}