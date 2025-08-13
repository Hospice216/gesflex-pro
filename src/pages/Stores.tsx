import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Search, Filter, MoreHorizontal, Store, MapPin, Users, Phone, ArrowRightLeft } from "lucide-react"
import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Store as StoreType } from "@/integrations/supabase/types"
import { StoreModal } from "@/components/StoreModal"
import StoreTransferModal from "@/components/StoreTransferModal"

export default function Stores() {
  const [searchTerm, setSearchTerm] = useState("")
  const [stores, setStores] = useState<StoreType[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStore, setSelectedStore] = useState<StoreType | null>(null)
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchStores()
  }, [])

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setStores(data || [])
    } catch (error) {
      console.error('Erreur chargement magasins:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les magasins",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (is_active: boolean) => {
    return is_active ? (
      <Badge variant="default" className="bg-success text-success-foreground">Actif</Badge>
    ) : (
      <Badge variant="destructive">Inactif</Badge>
    )
  }

  const handleNewStore = () => {
    setSelectedStore(null)
    setIsStoreModalOpen(true)
  }

  const handleEditStore = (store: StoreType) => {
    setSelectedStore(store)
    setIsStoreModalOpen(true)
  }

  const handleDeleteStore = async (storeId: string) => {
    try {
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', storeId)

      if (error) throw error
      
      toast({ title: "Succès", description: "Magasin supprimé avec succès" })
      fetchStores()
    } catch (error) {
      console.error('Erreur suppression magasin:', error)
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression",
        variant: "destructive"
      })
    }
  }

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (store.address && store.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (store.email && store.email.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const totalStores = stores.length
  const activeStores = stores.filter(store => store.is_active).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Store className="w-7 h-7 text-primary" />
            Magasins
          </h1>
          <p className="text-muted-foreground">
            Gérez vos points de vente et entrepôts
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => setIsTransferModalOpen(true)} variant="outline" size="touch" className="gap-2">
            <ArrowRightLeft className="w-4 h-4" />
            Transfert
          </Button>
          <Button onClick={handleNewStore} size="touch" className="gap-2">
            <Plus className="w-4 h-4" />
            Nouveau magasin
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total magasins</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStores}</div>
            <p className="text-xs text-muted-foreground">
              Points de vente
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Magasins actifs</CardTitle>
            <Store className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{activeStores}</div>
            <p className="text-xs text-muted-foreground">
              En fonctionnement
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transferts en cours</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              En attente validation
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux activité</CardTitle>
            <Store className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">
              {totalStores > 0 ? Math.round((activeStores / totalStores) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Magasins actifs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Rechercher un magasin..."
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

      {/* Stores List */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle>Liste des magasins</CardTitle>
          <CardDescription>Gérez vos points de vente et leurs informations</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Chargement...</div>
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Store className="w-16 h-16 text-muted-foreground/20 mb-4" />
              <p className="text-muted-foreground mb-4">Aucun magasin trouvé</p>
              <Button onClick={handleNewStore} variant="outline">
                Créer un magasin
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Adresse</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-medium">{store.name}</TableCell>
                    <TableCell>
                      {store.address ? (
                        <div className="flex items-start gap-1">
                          <MapPin className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                          <span className="text-sm max-w-[200px]">{store.address}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Non renseignée</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {store.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            {store.phone}
                          </div>
                        )}
                        {store.email && <div className="text-xs text-muted-foreground">{store.email}</div>}
                        {!store.phone && !store.email && (
                          <span className="text-muted-foreground text-sm">Non renseigné</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(store.is_active)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditStore(store)}>
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem>Voir inventaire</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteStore(store.id)}>
                            Supprimer
                          </DropdownMenuItem>
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

      <StoreModal
        open={isStoreModalOpen}
        onOpenChange={setIsStoreModalOpen}
        store={selectedStore}
        onSuccess={fetchStores}
      />

      <StoreTransferModal
        open={isTransferModalOpen}
        onOpenChange={setIsTransferModalOpen}
        onSuccess={() => {
          toast({ title: "Succès", description: "Demande de transfert créée" })
        }}
      />
    </div>
  )
}