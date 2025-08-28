import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Search, Filter, MoreHorizontal, RefreshCw, RotateCcw, ArrowRightLeft, AlertTriangle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect, useMemo } from "react"
import { useCurrency } from "@/hooks/useCurrency"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import ReturnExchangeModal from "@/components/ReturnExchangeModal"

export default function Returns() {
  const { formatAmount } = useCurrency()
  const { userProfile } = useAuth()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [returns, setReturns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [selectedReturn, setSelectedReturn] = useState<any>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [returnItems, setReturnItems] = useState<any[]>([])
  const [returnsPage, setReturnsPage] = useState(1)
  const [returnsPageSize, setReturnsPageSize] = useState<number | 'all'>(20)

  // ✅ SOLUTION : Vérification complète des permissions
  const canCreateReturn = userProfile?.role && ['Vendeur', 'Manager', 'Admin', 'SuperAdmin'].includes(userProfile.role)
  const canViewReturns = userProfile?.role && ['Vendeur', 'Manager', 'Admin', 'SuperAdmin'].includes(userProfile.role)
  const canManageReturns = userProfile?.role && ['Manager', 'Admin', 'SuperAdmin'].includes(userProfile.role)

  useEffect(() => {
    if (canViewReturns) {
      fetchReturns()
    }
  }, [canViewReturns])

  // ✅ SOLUTION : Fonction de gestion d'erreur avec retry
  const handleRetry = () => {
    setError(null)
    fetchReturns()
  }

  const fetchReturns = async () => {
    try {
      setLoading(true)
      setError(null)

      // ✅ SOLUTION : Base query avec joins pour éviter les requêtes N+1
      let query = supabase
        .from("returns")
        .select(`
          *,
          original_sale:sales(sale_code, customer_name)
        `)
        .order("created_at", { ascending: false })

      // ✅ SOLUTION : Filtrage basé sur les rôles
      if (!canManageReturns) {
        // Vendeur ne voit que ses propres retours
        query = query.eq('processed_by', userProfile?.id)
      }

      const { data, error } = await query

      if (error) throw error
      setReturns(data || [])
    } catch (error) {
      console.error('Erreur chargement retours:', error)
      setError("Impossible de charger les retours")
      toast({
        title: "Erreur",
        description: "Impossible de charger les retours",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getTypeBadge = (returnItem: any) => {
    // ✅ SOLUTION : Détection du type de retour/échange
    if (returnItem.return_type === 'exchange') {
      return <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-200"><ArrowRightLeft className="w-3 h-3" />Échange</Badge>
    }
    return <Badge variant="outline" className="gap-1"><RotateCcw className="w-3 h-3" />Retour</Badge>
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-success text-success-foreground">Traité</Badge>
      case "pending":
        return <Badge variant="secondary">En cours</Badge>
      case "refunded":
        return <Badge variant="outline" className="bg-primary/10 text-primary">Remboursé</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleNewReturn = () => {
    if (!canCreateReturn) {
      toast({
        title: "Permission refusée",
        description: "Vous n'avez pas les permissions pour créer des retours",
        variant: "destructive",
      })
      return
    }
    setShowReturnModal(true)
  }

  // ✅ SOLUTION : Actions implémentées avec vérification des permissions
  const handleViewDetails = (returnItem: any) => {
    if (!canViewReturns) {
      toast({
        title: "Permission refusée",
        description: "Vous n'avez pas les permissions pour voir les détails",
        variant: "destructive",
      })
      return
    }
    setSelectedReturn(returnItem)
    fetchReturnItems(returnItem.id, returnItem)
    setShowDetailsModal(true)
  }

  const handlePrintReceipt = (returnItem: any) => {
    if (!canViewReturns) {
      toast({
        title: "Permission refusée",
        description: "Vous n'avez pas les permissions pour imprimer",
        variant: "destructive",
      })
      return
    }
    printReturnReceipt(returnItem)
  }

  const handleEditReturn = (returnItem: any) => {
    if (!canManageReturns) {
      toast({
        title: "Permission refusée",
        description: "Vous n'avez pas les permissions pour modifier",
        variant: "destructive",
      })
      return
    }
    setSelectedReturn(returnItem)
    setShowReturnModal(true)
  }

  const handleCancelReturn = async (returnItem: any) => {
    if (!canManageReturns) {
      toast({
        title: "Permission refusée",
        description: "Vous n'avez pas les permissions pour annuler",
        variant: "destructive",
      })
      return
    }
    
    try {
      const { error } = await supabase
        .from("returns")
        .update({ return_status: "cancelled" })
        .eq("id", returnItem.id)

      if (error) throw error

      toast({
        title: "Retour annulé",
        description: "Le retour a été annulé avec succès",
      })

      fetchReturns()
    } catch (error) {
      console.error('Erreur annulation retour:', error)
      toast({
        title: "Erreur",
        description: "Impossible d'annuler le retour",
        variant: "destructive",
      })
    }
  }

  const fetchReturnItems = async (returnId: string, returnData?: any) => {
    try {
      // Récupérer les items du retour
      const { data: itemsData, error: itemsError } = await supabase
        .from('return_items')
        .select('product_name, product_sku, returned_quantity, original_unit_price, original_total_price, exchange_product_id, exchange_quantity, exchange_total_price, price_difference')
        .eq('return_id', returnId)
      
      if (itemsError) throw itemsError
      setReturnItems(itemsData || [])

      // Récupérer les informations de l'utilisateur qui a traité le retour
      const returnToProcess = returnData || selectedReturn
      if (returnToProcess?.processed_by) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('first_name, last_name, email')
          .eq('id', returnToProcess.processed_by)
          .single()
        
        if (!userError && userData) {
          const userName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email || 'Utilisateur inconnu'
          
          // Mettre à jour le retour avec le nom de l'utilisateur
          setSelectedReturn(prev => ({
            ...prev,
            processed_by_name: userName
          }))
          
          console.log('Nom utilisateur récupéré:', userName)
        } else {
          console.log('Erreur récupération utilisateur:', userError)
        }
      } else {
        console.log('Aucun processed_by trouvé:', returnToProcess?.processed_by)
      }
    } catch (e) {
      console.error('Erreur chargement détails retour:', e)
      setReturnItems([])
      toast({ title: 'Erreur', description: 'Impossible de charger les détails du retour', variant: 'destructive' })
    }
  }

  const printReturnReceipt = async (returnItem: any) => {
    try {
      // S'assurer d'avoir les items
      let items = returnItems
      if (!items || items.length === 0) {
        const { data } = await supabase
          .from('return_items')
          .select('product_name, product_sku, returned_quantity, original_unit_price, original_total_price, exchange_product_id, exchange_quantity, exchange_total_price, price_difference')
          .eq('return_id', returnItem.id)
        items = data || []
      }

      const content = `
===============================
BON DE RETOUR / ECHANGE - ${returnItem.return_code}
===============================

Date: ${new Date(returnItem.created_at).toLocaleDateString('fr-FR')}
Client: ${returnItem.customer_name || 'Client anonyme'}
Vente d'origine: ${returnItem.original_sale?.sale_code || 'N/A'}
Type: ${returnItem.return_type === 'exchange' ? 'ECHANGE' : 'RETOUR'}
Statut: ${returnItem.return_status}

--- LIGNES ---
${(items || []).map((it: any, idx: number) => {
  const base = `${idx + 1}. ${[it.product_name, it.product_sku].filter(Boolean).join(' ')} - Qté: ${it.returned_quantity} x ${formatAmount(it.original_unit_price)} = ${formatAmount(it.original_total_price)}`
  if (it.exchange_product_id) {
    return `${base}\n   Echange: Qté ${it.exchange_quantity} | Total ${formatAmount(it.exchange_total_price || 0)} | Différence ${formatAmount(it.price_difference || 0)}`
  }
  return base
}).join('\n')}

===============================
`;

      const w = window.open('', '_blank')
      if (w) {
        w.document.write(`
          <html>
            <head>
              <title>Retour ${returnItem.return_code}</title>
              <style>body{font-family:monospace;font-size:12px;white-space:pre-wrap}</style>
            </head>
            <body>
              <div>${content.replace(/</g, '&lt;')}</div>
              <script>window.print(); window.close();</script>
            </body>
          </html>
        `)
        w.document.close()
        toast({ title: 'Impression lancée', description: 'Le bon de retour a été envoyé à l\'imprimante' })
      }
    } catch (e) {
      console.error('Erreur impression bon retour:', e)
      toast({ title: "Erreur d'impression", description: 'Impossible d\'imprimer le bon', variant: 'destructive' })
    }
  }

  // ✅ SOLUTION : Statistiques optimisées avec useMemo
  const { totalReturns, totalExchanges, totalAmount } = useMemo(() => {
    const returnsList = returns.filter(ret => ret.return_type !== 'exchange')
    const exchangesList = returns.filter(ret => ret.return_type === 'exchange')
    const amount = returns.reduce((sum, ret) => sum + Math.abs(ret.price_difference || 0), 0)

    return {
      totalReturns: returnsList.length,
      totalExchanges: exchangesList.length,
      totalAmount: amount
    }
  }, [returns])

  // ✅ SOLUTION : Filtrage optimisé avec useMemo
  const filteredReturns = useMemo(() => {
    const normalize = (s: any) => (s ? String(s).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase() : '')
    const tokens = normalize(searchTerm).split(/\s+/).filter(Boolean)
    if (tokens.length === 0) return returns
    return returns.filter((ret: any) => {
      const fields = [
        ret.return_code,
        ret.original_sale?.sale_code,
        ret.customer_name,
        ret.return_reason,
      ]
      const haystack = normalize(fields.filter(Boolean).join(' '))
      return tokens.every(t => haystack.includes(t))
    })
  }, [returns, searchTerm])

  const returnsTotalPages = returnsPageSize === 'all' ? 1 : Math.max(1, Math.ceil(filteredReturns.length / (returnsPageSize as number)))
  const currentReturnsPage = Math.min(returnsPage, returnsTotalPages)
  const paginatedReturns = returnsPageSize === 'all'
    ? filteredReturns
    : filteredReturns.slice(
        (currentReturnsPage - 1) * (returnsPageSize as number),
        currentReturnsPage * (returnsPageSize as number)
      )

  useEffect(() => {
    setReturnsPage(1)
  }, [returnsPageSize, searchTerm])

  // ✅ SOLUTION : Affichage d'erreur avec possibilité de retry
  if (error && !canViewReturns) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <RefreshCw className="w-7 h-7 text-primary" />
              Retours & Échanges
            </h1>
            <p className="text-muted-foreground">
              Gérez les retours et échanges de vos clients
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
            <RefreshCw className="w-7 h-7 text-primary" />
            Retours & Échanges
          </h1>
          <p className="text-muted-foreground">
            Gérez les retours et échanges de vos clients
          </p>
        </div>
        
        {canCreateReturn && (
          <Button onClick={handleNewReturn} size="touch" className="gap-2">
            <Plus className="w-4 h-4" />
            Nouveau retour/échange
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
                <CardTitle className="text-sm font-medium">Total retours</CardTitle>
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalReturns}</div>
                <p className="text-xs text-muted-foreground">
                  Ce mois-ci
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-card shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total échanges</CardTitle>
                <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalExchanges}</div>
                <p className="text-xs text-muted-foreground">
                  Ce mois-ci
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Montant impacté</CardTitle>
                <RefreshCw className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatAmount(totalAmount)}</div>
                <p className="text-xs text-muted-foreground">
                  Total transactions
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Rechercher un retour/échange..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 sm:h-12 text-sm sm:text-base"
              />
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-sm text-muted-foreground hidden sm:inline">Par page</span>
                <Select value={String(returnsPageSize)} onValueChange={(v) => setReturnsPageSize(v === 'all' ? 'all' : parseInt(v))}>
                  <SelectTrigger className="h-9 w-full sm:w-[92px]">
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
              <Button variant="outline" size="touch" className="gap-2 w-full sm:w-auto">
                <Filter className="w-4 h-4" />
                Filtres
              </Button>
            </div>
          </div>

          {/* Returns List */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle>Historique des retours et échanges</CardTitle>
              <CardDescription>Liste de toutes les opérations de retour et d'échange</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                // ✅ SOLUTION : Skeleton loading pour le tableau
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <div className="animate-pulse bg-gray-300 h-4 w-24 rounded"></div>
                      <div className="animate-pulse bg-gray-300 h-4 w-20 rounded"></div>
                      <div className="animate-pulse bg-gray-300 h-4 w-28 rounded"></div>
                      <div className="animate-pulse bg-gray-300 h-4 w-32 rounded"></div>
                      <div className="animate-pulse bg-gray-300 h-4 w-48 rounded"></div>
                      <div className="animate-pulse bg-gray-300 h-4 w-20 rounded"></div>
                      <div className="animate-pulse bg-gray-300 h-8 w-24 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : filteredReturns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <RefreshCw className="w-16 h-16 text-muted-foreground/20 mb-4" />
                  <p className="text-muted-foreground mb-4">Aucun retour/échange trouvé</p>
                  {canCreateReturn && (
                    <Button onClick={handleNewReturn} variant="outline">
                      Créer un retour/échange
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
                          <TableHead>Code</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Vente origine</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Raison</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedReturns.map((returnItem) => (
                          <TableRow key={returnItem.id}>
                            <TableCell className="font-medium">{returnItem.return_code}</TableCell>
                            <TableCell>{getTypeBadge(returnItem)}</TableCell>
                            <TableCell>{returnItem.original_sale?.sale_code || "N/A"}</TableCell>
                            <TableCell>{returnItem.customer_name || "Client anonyme"}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{returnItem.return_reason}</TableCell>
                            <TableCell>{getStatusBadge(returnItem.return_status)}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewDetails(returnItem)}>
                                    Voir détails
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handlePrintReceipt(returnItem)}>
                                    Imprimer bon
                                  </DropdownMenuItem>
                                  {canManageReturns && (
                                    <DropdownMenuItem onClick={() => handleEditReturn(returnItem)}>
                                      Modifier
                                    </DropdownMenuItem>
                                  )}
                                  {canManageReturns && (
                                    <DropdownMenuItem 
                                      className="text-destructive"
                                      onClick={() => handleCancelReturn(returnItem)}
                                    >
                                      Annuler
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
                    {paginatedReturns.map((returnItem) => (
                      <div key={returnItem.id} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{returnItem.return_code}</p>
                            <p className="text-sm text-muted-foreground truncate">{returnItem.original_sale?.sale_code || 'N/A'}</p>
                          </div>
                          <div>
                            {getStatusBadge(returnItem.return_status)}
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Type</span>
                            <div className="font-medium">{returnItem.return_type === 'exchange' ? 'Échange' : 'Retour'}</div>
                          </div>
                          <div className="text-right">
                            <span className="text-muted-foreground">Client</span>
                            <div className="font-medium">{returnItem.customer_name || '—'}</div>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Raison</span>
                            <div className="font-medium truncate">{returnItem.return_reason || '—'}</div>
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
                              <DropdownMenuItem onClick={() => handleViewDetails(returnItem)}>
                                Voir détails
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePrintReceipt(returnItem)}>
                                Imprimer bon
                              </DropdownMenuItem>
                              {canManageReturns && (
                                <DropdownMenuItem onClick={() => handleEditReturn(returnItem)}>
                                  Modifier
                                </DropdownMenuItem>
                              )}
                              {canManageReturns && (
                                <DropdownMenuItem className="text-destructive" onClick={() => handleCancelReturn(returnItem)}>
                                  Annuler
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentReturnsPage <= 1 || returnsPageSize === 'all'}
                      onClick={() => setReturnsPage(p => Math.max(1, p - 1))}
                    >
                      Précédent
                    </Button>
                    <span className="text-sm text-muted-foreground">Page {currentReturnsPage} / {returnsTotalPages}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentReturnsPage >= returnsTotalPages || returnsPageSize === 'all'}
                      onClick={() => setReturnsPage(p => Math.min(returnsTotalPages, p + 1))}
                    >
                      Suivant
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <ReturnExchangeModal 
        open={showReturnModal}
        onOpenChange={setShowReturnModal}
        onSuccess={fetchReturns}
      />

      {/* Modal Détails Retour */}
      {showDetailsModal && selectedReturn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Détails retour {selectedReturn.return_code}</h2>
              <Button variant="ghost" onClick={() => setShowDetailsModal(false)}>✕</Button>
            </div>
            
            {/* Informations générales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <label className="font-semibold text-sm text-blue-700 mb-2 block">Informations de base</label>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Code:</span> {selectedReturn.return_code}</div>
                  <div><span className="font-medium">Type:</span> {selectedReturn.return_type === 'exchange' ? 'Échange' : 'Retour'}</div>
                  <div><span className="font-medium">Statut:</span> {getStatusBadge(selectedReturn.return_status)}</div>
                  <div><span className="font-medium">Date création:</span> {new Date(selectedReturn.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  {selectedReturn.updated_at && selectedReturn.updated_at !== selectedReturn.created_at && (
                    <div><span className="font-medium">Dernière modification:</span> {new Date(selectedReturn.updated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  )}
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <label className="font-semibold text-sm text-green-700 mb-2 block">Vente d'origine</label>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Code vente:</span> {selectedReturn.original_sale?.sale_code || 'N/A'}</div>
                  <div><span className="font-medium">Client:</span> {selectedReturn.customer_name || 'Client anonyme'}</div>
                  <div><span className="font-medium">Raison:</span> {selectedReturn.return_reason || 'Non spécifiée'}</div>
                  {selectedReturn.return_notes && (
                    <div><span className="font-medium">Notes:</span> {selectedReturn.return_notes}</div>
                  )}
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <label className="font-semibold text-sm text-orange-700 mb-2 block">Informations financières</label>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Montant total retour:</span> {formatAmount(returnItems.reduce((sum, item) => sum + (item.original_total_price || 0), 0))}</div>
                  <div><span className="font-medium">Montant total échange:</span> {formatAmount(returnItems.reduce((sum, item) => sum + (item.exchange_total_price || 0), 0))}</div>
                  <div><span className="font-medium">Différence totale:</span> {formatAmount(returnItems.reduce((sum, item) => sum + (item.price_difference || 0), 0))}</div>
                  {selectedReturn.processed_by && (
                    <div><span className="font-medium">Traité par:</span> {selectedReturn.processed_by_name || selectedReturn.processed_by}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Détails des lignes */}
            <div className="mb-6">
              <label className="font-semibold text-lg text-gray-800 mb-4 block">Détail des produits</label>
              <div className="space-y-3">
                {(returnItems || []).map((it, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Produit retourné */}
                      <div className="bg-red-50 p-3 rounded-lg">
                        <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                          <RotateCcw className="w-4 h-4" />
                          Produit retourné
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div><span className="font-medium">Nom:</span> {it.product_name || 'N/A'}</div>
                          <div><span className="font-medium">SKU:</span> {it.product_sku || 'N/A'}</div>
                          <div><span className="font-medium">Quantité:</span> {it.returned_quantity}</div>
                          <div><span className="font-medium">Prix unitaire:</span> {formatAmount(it.original_unit_price)}</div>
                          <div><span className="font-medium">Prix total:</span> {formatAmount(it.original_total_price)}</div>
                        </div>
                      </div>

                      {/* Produit d'échange (si applicable) */}
                      {it.exchange_product_id ? (
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <h4 className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
                            <ArrowRightLeft className="w-4 h-4" />
                            Produit d'échange
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div><span className="font-medium">Quantité:</span> {it.exchange_quantity}</div>
                            <div><span className="font-medium">Prix total échange:</span> {formatAmount(it.exchange_total_price || 0)}</div>
                            <div><span className="font-medium">Différence:</span> {formatAmount(it.price_difference || 0)}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <h4 className="font-semibold text-gray-700 mb-2">Aucun échange</h4>
                          <p className="text-sm text-gray-600">Produit retourné sans échange</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {(!returnItems || returnItems.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <RefreshCw className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Aucune ligne de produit pour ce retour</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowDetailsModal(false)}>Fermer</Button>
              <Button onClick={() => printReturnReceipt(selectedReturn)} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Imprimer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
