import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Search, Filter, MoreHorizontal, RefreshCw, RotateCcw, ArrowRightLeft, AlertTriangle } from "lucide-react"
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
    // TODO: Implémenter la modal de détails
    toast({
      title: "Fonctionnalité à venir",
      description: "Vue détaillée en cours de développement",
    })
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
    // TODO: Implémenter l'impression
    toast({
      title: "Fonctionnalité à venir",
      description: "Impression en cours de développement",
    })
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
    return returns.filter(returnItem => 
      searchTerm === "" || 
      returnItem.return_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      returnItem.original_sale?.sale_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      returnItem.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [returns, searchTerm])

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
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="touch" className="gap-2">
              <Filter className="w-4 h-4" />
              Filtres
            </Button>
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
                    {filteredReturns.map((returnItem) => (
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
    </div>
  )
}
