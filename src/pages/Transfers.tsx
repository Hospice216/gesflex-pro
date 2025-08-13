import { useState, useEffect, useMemo } from "react"
import { Plus, Search, Filter, ArrowUpDown, MoreHorizontal, Truck, Package, CheckCircle2, XCircle, Clock, RefreshCw, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/integrations/supabase/client"
import { useCurrency } from "@/hooks/useCurrency"
import StoreTransferModal from "@/components/StoreTransferModal"
import { ValidationStatus, StoreTransfer } from "@/integrations/supabase/types"

interface TransferWithDetails extends StoreTransfer {
  source_store?: { name: string }
  destination_store?: { name: string }
  product?: { name: string; sku: string }
  created_by_user?: { first_name: string; last_name: string }
  // ✅ CORRECTION : Pas de validated_by_user dans store_transfers
  // La validation se fait via la table transfer_receptions
}

interface TransferFilters {
  search: string
  sourceStore: string
  destinationStore: string
  status: string
  dateRange: { from: Date | null; to: Date | null }
}

export default function Transfers() {
  const { toast } = useToast()
  const { userProfile } = useAuth()
  const { formatAmount } = useCurrency()
  const [transfers, setTransfers] = useState<TransferWithDetails[]>([])
  const [stores, setStores] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [selectedTransfer, setSelectedTransfer] = useState<TransferWithDetails | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showValidationModal, setShowValidationModal] = useState(false)
  const [validationNotes, setValidationNotes] = useState("")
  const [validationAction, setValidationAction] = useState<"validate" | "reject">("validate")

  const [filters, setFilters] = useState<TransferFilters>({
    search: "",
    sourceStore: "all",
    destinationStore: "all",
    status: "all",
    dateRange: { from: null, to: null }
  })

  // ✅ SOLUTION : Vérification complète des permissions
  const canCreateTransfer = userProfile?.role && ['Manager', 'Admin', 'SuperAdmin'].includes(userProfile.role)
  const canValidateTransfer = userProfile?.role && ['Manager', 'Admin', 'SuperAdmin'].includes(userProfile.role)
  const canViewAllTransfers = userProfile?.role && ['Manager', 'Admin', 'SuperAdmin'].includes(userProfile.role)
  const canViewTransfers = userProfile?.role && ['Vendeur', 'Manager', 'Admin', 'SuperAdmin'].includes(userProfile.role)

  useEffect(() => {
    if (canViewTransfers) {
      fetchTransfers()
      fetchStores()
    }
  }, [canViewTransfers])

  // ✅ SOLUTION : Fonction de chargement des magasins optimisée
  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name")
        .eq("is_active", true)
        .order("name")

      if (error) throw error
      setStores(data || [])
    } catch (error) {
      console.error('Erreur chargement magasins:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des magasins",
        variant: "destructive",
      })
    }
  }

  // ✅ SOLUTION : Fonction de chargement optimisée avec requêtes parallèles
  const fetchTransfers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // ✅ CORRECTION : Base query avec joins corrects selon le schéma réel
      let query = supabase
        .from("store_transfers")
        .select(`
          *,
          source_store:stores!store_transfers_source_store_id_fkey(id, name),
          destination_store:stores!store_transfers_destination_store_id_fkey(id, name),
          product:products(id, name, sku),
          created_by_user:users!store_transfers_created_by_fkey(id, first_name, last_name)
        `)
        .order("created_at", { ascending: false })

      // ✅ SÉCURITÉ : Filtrage basé sur les permissions d'accès aux magasins
      if (!canViewAllTransfers) {
        // Manager et Vendeur ne voient que les transferts impliquant leurs magasins assignés
        const { data: userStores, error: userStoresError } = await supabase
          .from("user_stores")
          .select("store_id")
          .eq("user_id", userProfile.id)

        if (userStoresError) throw userStoresError

        if (userStores && userStores.length > 0) {
          const storeIds = userStores.map(us => us.store_id)
          query = query.or(`source_store_id.in.(${storeIds.join(',')}),destination_store_id.in.(${storeIds.join(',')})`)
        } else {
          // Si aucun magasin assigné, retourner une liste vide
          setTransfers([])
          return
        }
      }

      const { data, error } = await query

      if (error) throw error

      // ✅ SOLUTION : Données déjà enrichies par les joins, pas besoin de requêtes supplémentaires
      setTransfers(data || [])
    } catch (error) {
      console.error('Erreur chargement transferts:', error)
      setError("Impossible de charger les transferts")
      toast({
        title: "Erreur",
        description: "Impossible de charger les transferts",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // ✅ SOLUTION : Fonction de gestion d'erreur avec retry
  const handleRetry = () => {
    setError(null)
    fetchTransfers()
  }

  const handleValidateTransfer = async (transferId: string, action: "validate" | "reject", notes?: string) => {
    if (!userProfile?.id) {
      toast({
        title: "Erreur",
        description: "Utilisateur non identifié",
        variant: "destructive",
      })
      return
    }

    if (!canValidateTransfer) {
      toast({
        title: "Permission refusée",
        description: "Vous n'avez pas les permissions pour valider les transferts",
        variant: "destructive",
      })
      return
    }

    try {
      if (action === "validate") {
        toast({
          title: "Validation via Arrivages",
          description: "Pour valider un transfert, allez dans Arrivages et enregistrez la réception.",
        })
        setShowValidationModal(false)
        setSelectedTransfer(null)
        return
      }

      const { error } = await supabase
        .from("store_transfers")
        .update({ status: "rejected", notes: notes || null })
        .eq("id", transferId)

      if (error) throw error

      toast({ title: "Transfert rejeté", description: "Le transfert a été rejeté." })

      fetchTransfers()
      setShowValidationModal(false)
      setSelectedTransfer(null)
    } catch (error) {
      console.error('Erreur validation transfert:', error)
      toast({
        title: "Erreur",
        description: "Erreur lors de la validation du transfert",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: ValidationStatus) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />En attente</Badge>
      case "validated":
        return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle2 className="w-3 h-3" />Validé</Badge>
      case "rejected":
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Rejeté</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // ✅ SOLUTION : Filtrage optimisé avec useMemo
  const filteredTransfers = useMemo(() => {
    return transfers.filter(transfer => {
      const searchTerm = filters.search.toLowerCase()
      const matchesSearch = !filters.search || 
        transfer.product?.name?.toLowerCase().includes(searchTerm) ||
        transfer.product?.sku?.toLowerCase().includes(searchTerm) ||
        transfer.source_store?.name?.toLowerCase().includes(searchTerm) ||
        transfer.destination_store?.name?.toLowerCase().includes(searchTerm)

      const matchesSourceStore = filters.sourceStore === "all" || transfer.source_store_id === filters.sourceStore
      const matchesDestinationStore = filters.destinationStore === "all" || transfer.destination_store_id === filters.destinationStore
      const matchesStatus = filters.status === "all" || transfer.status === filters.status

      return matchesSearch && matchesSourceStore && matchesDestinationStore && matchesStatus
    })
  }, [transfers, filters])

  // ✅ SOLUTION : Statistiques optimisées avec useMemo
  const { pendingTransfers, validatedTransfers, totalQuantityTransferred } = useMemo(() => {
    const pending = transfers.filter(t => t.status === "pending")
    const validated = transfers.filter(t => t.status === "validated")
    const totalQuantity = validated.reduce((sum, t) => sum + t.quantity, 0)

    return {
      pendingTransfers: pending,
      validatedTransfers: validated,
      totalQuantityTransferred: totalQuantity
    }
  }, [transfers])

  // ✅ SOLUTION : Affichage d'erreur avec possibilité de retry
  if (error && !canViewTransfers) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Truck className="w-8 h-8 text-primary" />
              Transferts entre Magasins
            </h1>
            <p className="text-muted-foreground">
              Gérez les transferts de stock entre vos magasins
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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Truck className="w-8 h-8 text-primary" />
            Transferts entre Magasins
          </h1>
          <p className="text-muted-foreground">
            Gérez les transferts de stock entre vos magasins
          </p>
        </div>
        {canCreateTransfer && (
          <Button onClick={() => setShowTransferModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nouveau Transfert
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
          {/* Statistics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">En attente</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingTransfers.length}</div>
                <p className="text-xs text-muted-foreground">transferts à valider</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Validés</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{validatedTransfers.length}</div>
                <p className="text-xs text-muted-foreground">ce mois</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total transféré</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalQuantityTransferred}</div>
                <p className="text-xs text-muted-foreground">unités ce mois</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total transferts</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{transfers.length}</div>
                <p className="text-xs text-muted-foreground">tous statuts</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par produit, SKU, magasin..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select value={filters.sourceStore} onValueChange={(value) => setFilters(prev => ({ ...prev, sourceStore: value }))}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Magasin source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les magasins</SelectItem>
                      {stores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filters.destinationStore} onValueChange={(value) => setFilters(prev => ({ ...prev, destinationStore: value }))}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Magasin destination" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les magasins</SelectItem>
                      {stores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="validated">Validé</SelectItem>
                      <SelectItem value="rejected">Rejeté</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transfers Table */}
          <Card>
            <CardHeader>
              <CardTitle>Liste des transferts</CardTitle>
              <CardDescription>
                {filteredTransfers.length} transfert{filteredTransfers.length > 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead>Source → Destination</TableHead>
                    <TableHead>Quantité</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Créé par</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    // ✅ SOLUTION : Skeleton loading pour le tableau
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="animate-pulse bg-gray-300 h-4 w-32 rounded"></div>
                            <div className="animate-pulse bg-gray-300 h-3 w-24 rounded"></div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="animate-pulse bg-gray-300 h-4 w-20 rounded"></div>
                            <div className="animate-pulse bg-gray-300 h-4 w-4 rounded"></div>
                            <div className="animate-pulse bg-gray-300 h-4 w-24 rounded"></div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="animate-pulse bg-gray-300 h-6 w-20 rounded"></div>
                        </TableCell>
                        <TableCell>
                          <div className="animate-pulse bg-gray-300 h-6 w-20 rounded"></div>
                        </TableCell>
                        <TableCell>
                          <div className="animate-pulse bg-gray-300 h-4 w-24 rounded"></div>
                        </TableCell>
                        <TableCell>
                          <div className="animate-pulse bg-gray-300 h-4 w-20 rounded"></div>
                        </TableCell>
                        <TableCell>
                          <div className="animate-pulse bg-gray-300 h-8 w-8 rounded"></div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredTransfers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Aucun transfert trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransfers.map((transfer) => (
                      <TableRow key={transfer.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{transfer.product?.name}</div>
                            <div className="text-sm text-muted-foreground">{transfer.product?.sku}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{transfer.source_store?.name}</span>
                            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{transfer.destination_store?.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{transfer.quantity} unités</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {transfer.created_by_user ? 
                              `${transfer.created_by_user.first_name} ${transfer.created_by_user.last_name}` :
                              "Utilisateur inconnu"
                            }
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(transfer.created_at).toLocaleDateString('fr-FR')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => {
                                setSelectedTransfer(transfer)
                                setShowDetailsModal(true)
                              }}>
                                Voir détails
                              </DropdownMenuItem>
                              
                              {canValidateTransfer && transfer.status === "pending" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedTransfer(transfer)
                                    setValidationAction("validate")
                                    setShowValidationModal(true)
                                  }}>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Valider
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedTransfer(transfer)
                                    setValidationAction("reject")
                                    setShowValidationModal(true)
                                  }}>
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Rejeter
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Transfer Modal */}
      <StoreTransferModal
        open={showTransferModal}
        onOpenChange={setShowTransferModal}
        onSuccess={fetchTransfers}
      />

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails du transfert</DialogTitle>
          </DialogHeader>
          {selectedTransfer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Produit</Label>
                  <p className="font-medium">{selectedTransfer.product?.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedTransfer.product?.sku}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Quantité</Label>
                  <p className="font-medium">{selectedTransfer.quantity} unités</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Magasin source</Label>
                  <p className="font-medium">{selectedTransfer.source_store?.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Magasin destination</Label>
                  <p className="font-medium">{selectedTransfer.destination_store?.name}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Statut</Label>
                  <div className="mt-1">{getStatusBadge(selectedTransfer.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Date de création</Label>
                  <p className="font-medium">{new Date(selectedTransfer.created_at).toLocaleString('fr-FR')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Créé par</Label>
                  <p className="font-medium">
                    {selectedTransfer.created_by_user ? 
                      `${selectedTransfer.created_by_user.first_name} ${selectedTransfer.created_by_user.last_name}` :
                      "Utilisateur inconnu"
                    }
                  </p>
                </div>
                {/* ✅ CORRECTION : Pas de validated_by_user dans store_transfers */}
                {/* La validation se fait via la page Arrivages */}
              </div>

              {selectedTransfer.notes && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                  <p className="mt-1 p-3 bg-muted rounded-lg">{selectedTransfer.notes}</p>
                </div>
              )}

              {/* ✅ CORRECTION : Pas de validation_notes dans store_transfers */}
              {/* Les notes de validation sont gérées via la page Arrivages */}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Validation Modal */}
      <Dialog open={showValidationModal} onOpenChange={setShowValidationModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {validationAction === "validate" ? "Valider le transfert" : "Rejeter le transfert"}
            </DialogTitle>
            <DialogDescription>
              {validationAction === "validate" 
                ? "Ce transfert sera validé et le stock sera mis à jour."
                : "Ce transfert sera rejeté et annulé."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="validation-notes">Notes (optionnel)</Label>
              <Textarea
                id="validation-notes"
                value={validationNotes}
                onChange={(e) => setValidationNotes(e.target.value)}
                placeholder="Raison de la validation/rejet..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowValidationModal(false)}>
                Annuler
              </Button>
              <Button 
                variant={validationAction === "validate" ? "default" : "destructive"}
                onClick={() => selectedTransfer && handleValidateTransfer(selectedTransfer.id, validationAction, validationNotes)}
              >
                {validationAction === "validate" ? "Valider" : "Rejeter"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
