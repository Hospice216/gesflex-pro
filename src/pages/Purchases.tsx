import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Search, Filter, MoreHorizontal, ShoppingCart, DollarSign, RefreshCw, AlertTriangle } from "lucide-react"
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
  const { totalAmount, filteredPurchases, pendingCount } = useMemo(() => {
    const total = purchases.reduce((sum, purchase) => sum + (purchase.total_amount || 0), 0)
    const filtered = purchases.filter(purchase =>
      purchase.suppliers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.products?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.products?.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    const pending = purchases.filter(p => p.status !== 'validated').length

    return {
      totalAmount: total,
      filteredPurchases: filtered,
      pendingCount: pending
    }
  }, [purchases, searchTerm])

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
          <Button onClick={handleNewPurchase} size="touch" className="gap-2">
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
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="touch" className="gap-2">
              <Filter className="w-4 h-4" />
              Filtres
            </Button>
          </div>

          {/* Purchases List */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle>Liste des achats</CardTitle>
              <CardDescription>Historique de vos commandes fournisseurs</CardDescription>
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
              ) : filteredPurchases.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ShoppingCart className="w-16 h-16 text-muted-foreground/20 mb-4" />
                  <p className="text-muted-foreground mb-4">
                    {searchTerm ? "Aucun achat ne correspond à votre recherche" : "Aucun achat trouvé"}
                  </p>
                  {canCreatePurchase && (
                    <Button onClick={handleNewPurchase} variant="outline">
                      Créer un achat
                    </Button>
                  )}
                </div>
              ) : (
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
                    {filteredPurchases.map((purchase) => (
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
              )}
            </CardContent>
          </Card>
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