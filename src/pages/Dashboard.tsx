import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, TrendingUp, Package, ShoppingCart, DollarSign, AlertTriangle, Users, Store, RefreshCw, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useStoreSalesStats, useTopSellingProducts, usePeriodSalesStats, PeriodType } from '@/hooks/useSalesStats'
import { useStoreInventory } from '@/hooks/useStoreInventory'
import { useCurrency } from '@/hooks/useCurrency'
import { DashboardSkeleton } from '@/components/LoadingStates'
import DashboardErrorBoundary from '@/components/DashboardErrorBoundary'

import { format } from "date-fns"
import { fr } from "date-fns/locale"

export default function Dashboard() {
  const welcomeEmoji = "👋"
  const { userProfile } = useAuth()
  const { recentSales, lowStockProducts, loading, error, refetch } = useDashboardStats()
  const { formatAmount } = useCurrency()
  const navigate = useNavigate()
  
  // ✅ NOUVEAU : États pour les filtres et périodes
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('day')
  // Période dédiée aux cartes personnelles (globales)
  const [personalPeriod, setPersonalPeriod] = useState<PeriodType>('day')
  const [selectedStore, setSelectedStore] = useState<string>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const isSeller = userProfile?.role === 'Vendeur'

  // ✅ NOUVEAU : Vérification et réinitialisation de la période selon le rôle
  useEffect(() => {
    if (!userProfile) return
    const isAdmin = userProfile.role === 'Admin' || userProfile.role === 'SuperAdmin'
    if (!isAdmin && (selectedPeriod === 'year' || selectedPeriod === 'last3months')) {
      setSelectedPeriod('day')
    }
  }, [userProfile, selectedPeriod])
  
  // ✅ NOUVEAU : Récupération des magasins de l'utilisateur depuis user_stores
  const [userStores, setUserStores] = useState<Array<{ id: string; name: string }>>([])

  // ✅ CORRIGÉ : Logique de storeId pour les hooks
  const storeId = useMemo(() => {
    if (selectedStore === 'all') return 'all' // Changé de undefined à 'all'
    if (selectedStore === 'current') return userProfile?.store_id
    return selectedStore
  }, [selectedStore, userProfile?.store_id])

  // ✅ CORRIGÉ : Récupération des IDs de magasins pour les hooks
  const userStoreIds = useMemo(() => {
    return userStores.map(store => store.id)
  }, [userStores])

  // ✅ Période calculée pour requêtes magasin (totaux magasin)
  const periodRange = useMemo(() => {
    const now = new Date()
    switch (selectedPeriod) {
      case 'day':
        return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()), end: now }
      case 'yesterday': {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        end.setMilliseconds(end.getMilliseconds() - 1)
        return { start, end }
      }
      case 'day_before_yesterday': {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2)
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        end.setMilliseconds(end.getMilliseconds() - 1)
        return { start, end }
      }
      case 'week': {
        const s = new Date(now)
        s.setDate(now.getDate() - now.getDay())
        return { start: s, end: now }
      }
      case 'last3months':
        return { start: new Date(now.getFullYear(), now.getMonth() - 2, 1), end: now }
      case 'year':
        return { start: new Date(now.getFullYear(), 0, 1), end: now }
      case 'month':
      default:
        return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now }
    }
  }, [selectedPeriod])

  // ✅ Totaux magasin (pour managers/admins)
  const { data: storeTotals, isLoading: salesStatsLoading } = useStoreSalesStats(
    storeId,
    periodRange.start,
    periodRange.end
  )

  // ✅ CORRIGÉ : Utilisation du vrai hook pour les statistiques de période
  const { data: periodStats, isLoading: periodStatsLoading } = usePeriodSalesStats(
    storeId,
    personalPeriod
  )

  // ✅ NOUVEAU : Filtrage des ventes récentes selon la période
  const filteredRecentSales = useMemo(() => {
    if (!recentSales || recentSales.length === 0) return []
    
    let filtered = recentSales
    
    // ✅ NOTE : Les ventes récentes sont déjà filtrées par utilisateur dans useDashboardStats
    // Le filtrage par magasin se fait au niveau de la base de données
    
    // Filtre par période
    if (selectedPeriod) {
      const now = new Date()
      let start: Date
      
      switch (selectedPeriod) {
        case 'day':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'yesterday':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
          break
        case 'day_before_yesterday':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2)
          break
        case 'week':
          start = new Date(now)
          start.setDate(now.getDate() - now.getDay())
          break
        case 'last3months':
          start = new Date(now.getFullYear(), now.getMonth() - 2, 1)
          break
        case 'year':
          start = new Date(now.getFullYear(), 0, 1)
          break
        default:
          return filtered
      }
      
      filtered = filtered.filter(sale => {
        const saleDate = new Date(sale.created_at)
        return saleDate >= start && saleDate <= now
      })
    }
    
    return filtered
  }, [recentSales, selectedPeriod])
  
  const { data: topProducts, isLoading: topProductsLoading } = useTopSellingProducts(
    storeId,
    5,
    periodRange.start,
    periodRange.end
  )
  
  const { data: inventoryStats, isLoading: inventoryLoading } = useStoreInventory(
    storeId
  )

  // ✅ NOUVEAU : État de chargement global pour les statistiques
  const statsLoading = salesStatsLoading || periodStatsLoading || topProductsLoading || inventoryLoading

  // ✅ SUPPRIMÉ : Logs de debug temporaires

  // ✅ AMÉLIORÉ : Fonction de rafraîchissement complète
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      // Rafraîchir toutes les données
      await refetch()
      
      // Forcer le rafraîchissement des autres hooks via React Query
      // Les hooks se rafraîchiront automatiquement
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Récupérer les magasins de l'utilisateur depuis la table user_stores
  useEffect(() => {
    const fetchUserStores = async () => {
      if (!userProfile?.id) return
      
      try {
        const { data, error } = await supabase
          .from('user_stores')
          .select(`
            store_id,
            stores (name)
          `)
          .eq('user_id', userProfile.id)
        
        if (error) {
          console.error('Erreur récupération magasins:', error)
          return
        }
        
        const stores = data?.map(item => ({
          id: item.store_id,
          name: (item.stores as any)?.name || `Magasin ${item.store_id}`
        })) || []
        
        setUserStores(stores)
      } catch (error) {
        console.error('Erreur récupération magasins:', error)
      }
    }
    
    fetchUserStores()
  }, [userProfile?.id])
  
  // ✅ SOLUTION : Vérification des permissions avant navigation
  const handleNewSale = () => {
    if (userProfile?.role && ['Vendeur', 'Manager', 'Admin', 'SuperAdmin'].includes(userProfile.role)) {
      navigate('/sales')
    }
  }

  const handleAddProduct = () => {
    if (userProfile?.role && ['Admin', 'SuperAdmin', 'Manager'].includes(userProfile.role)) {
      navigate('/products')
    }
  }

  const handleInventory = () => {
    if (userProfile?.role && ['Admin', 'SuperAdmin', 'Manager'].includes(userProfile.role)) {
      navigate('/inventory')
    }
  }

  const handleViewAllSales = () => {
    if (userProfile?.role && ['Vendeur', 'Manager', 'Admin', 'SuperAdmin'].includes(userProfile.role)) {
      navigate('/sales')
    }
  }

  // ✅ CORRECTION : Validation des données avant affichage
  const hasValidData = !loading && !error && recentSales && lowStockProducts

  // ✅ NOUVEAU : Filtrage des produits en alerte selon le magasin
  const filteredLowStockProducts = useMemo(() => {
    if (!lowStockProducts || lowStockProducts.length === 0) return []
    
    // ✅ NOTE : Les produits en alerte sont déjà filtrés par magasin dans useDashboardStats
    // via la table user_stores, donc pas besoin de filtrage supplémentaire ici
    return lowStockProducts
  }, [lowStockProducts])

  // ✅ SOLUTION : Affichage d'erreur global avec possibilité de recharger
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              Bonjour {userProfile?.first_name || 'Utilisateur'} ! {welcomeEmoji}
            </h1>
            <p className="text-muted-foreground">
              Aperçu de votre activité aujourd'hui
            </p>
          </div>
        </div>
        
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-destructive mb-2">
            Erreur de chargement
          </h3>
          <p className="text-destructive/80 mb-4">
            Impossible de charger les données du tableau de bord
          </p>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </Button>
        </div>
      </div>
    )
  }

  return (
    <DashboardErrorBoundary>
      <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tableau de Bord</h1>
            <p className="text-gray-600 mt-1">
              Bienvenue, {userProfile?.first_name} {userProfile?.last_name}
            </p>
          </div>

          {/* ✅ AMÉLIORÉ : Actions rapides avec tooltips et meilleure UX */}
          {(userProfile?.role === 'Manager' || userProfile?.role === 'SuperAdmin') && (
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => navigate('/sales')} 
                className="bg-green-600 hover:bg-green-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                title="Créer une nouvelle vente - Accès direct à la page des ventes"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle vente
              </Button>
              {userProfile?.role === 'SuperAdmin' && (
                <Button 
                  onClick={() => navigate('/transfers')} 
                  variant="outline"
                  className="border-blue-300 text-blue-700 hover:bg-blue-50 transition-all duration-200"
                  title="Créer un nouveau transfert - Accès direct à la page des transferts"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Nouveau transfert
                </Button>
              )}
            </div>
          )}

          {userProfile?.role === 'Vendeur' && (
            <Button 
              onClick={() => navigate('/sales')} 
              className="bg-green-600 hover:bg-green-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              title="Créer une nouvelle vente - Accès direct à la page des ventes"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle vente
            </Button>
          )}
        </div>

        {/* ✅ NOUVEAU : Section de filtres et statistiques avancées */}
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
              <div>
                <CardTitle className="text-xl">Statistiques avancées</CardTitle>
                <CardDescription>
                  Synthèse personnelle et performances du magasin sélectionné
                </CardDescription>
              </div>
              
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                {/* Filtre Période appliqué uniquement aux cartes personnelles */}
                <Select value={personalPeriod} onValueChange={(v: string) => setPersonalPeriod(v as PeriodType)}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Aujourd'hui</SelectItem>
                    <SelectItem value="yesterday">Hier</SelectItem>
                    <SelectItem value="day_before_yesterday">Avant-hier</SelectItem>
                    <SelectItem value="week">Cette semaine</SelectItem>
                    <SelectItem value="month">Ce mois</SelectItem>
                    {(userProfile?.role === 'Admin' || userProfile?.role === 'SuperAdmin') && (
                      <>
                        <SelectItem value="last3months">3 mois derniers</SelectItem>
                      <SelectItem value="year">Cette année</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>

                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="sm"
                  disabled={loading || isRefreshing}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading || isRefreshing ? 'animate-spin' : ''}`} />
                  Actualiser
                </Button>
                
                
              </div>
            </div>
          </CardHeader>
                    <CardContent className="space-y-4 sm:space-y-6">
            {/* En-tête propre */}

            {/* Statistiques principales */}
            {periodStatsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-20 sm:h-24 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                  <CardContent className="p-4 text-center">
                    <DollarSign className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-900">
                      {periodStats?.total_revenue ? formatAmount(periodStats.total_revenue) : '0'}
                    </div>
                    <p className="text-sm text-blue-700 font-medium">Mon chiffre d'affaires</p>
                    <p className="text-xs text-blue-600 mt-1">Données personnelles (filtrées par Période)</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                  <CardContent className="p-4 text-center">
                    <ShoppingCart className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-900">
                      {periodStats?.total_sales || 0}
                    </div>
                    <p className="text-sm text-green-700 font-medium">Mes ventes</p>
                    <p className="text-xs text-green-600 mt-1">Données personnelles (filtrées par Période)</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
                  <CardContent className="p-4 text-center">
                    <AlertTriangle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-orange-900">
                      {lowStockProducts?.length || 0}
                    </div>
                    <p className="text-sm text-orange-700 font-medium">Stock faible</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
                  <CardContent className="p-4 text-center">
                    <Store className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-purple-900">
                      {userStores?.length || 0}
                    </div>
                    <p className="text-sm text-purple-700 font-medium">Magasins actifs</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ✅ SUPPRIMÉ : Panneau de debug temporaire - remplacé par les vraies données */}





            {/* Filtres (réservés Manager/Admin) */}
            {!isSeller && (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">
                  Période
                  {/* ✅ INDICATEUR : Filtre "Année" réservé aux admins */}
                  {!(userProfile?.role === 'Admin' || userProfile?.role === 'SuperAdmin') && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (Année réservée aux admins)
                    </span>
                  )}
                </label>
                <Select value={selectedPeriod} onValueChange={(value: string) => setSelectedPeriod(value as PeriodType)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner une période" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Aujourd'hui</SelectItem>
                    <SelectItem value="yesterday">Hier</SelectItem>
                    <SelectItem value="day_before_yesterday">Avant-hier</SelectItem>
                    <SelectItem value="week">Cette semaine</SelectItem>
                    <SelectItem value="month">Ce mois</SelectItem>
                    {/* ✅ RESTRICTION : Filtres étendus réservés aux admins */}
                    {(userProfile?.role === 'Admin' || userProfile?.role === 'SuperAdmin') && (
                      <>
                        <SelectItem value="last3months">3 mois derniers</SelectItem>
                        <SelectItem value="year">Cette année</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Magasin</label>
                <Select value={selectedStore} onValueChange={setSelectedStore}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Tous les magasins" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les magasins</SelectItem>
                    {userStores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            )}

            {/* Indicateurs des filtres actifs */}
            {!isSeller && (
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className="text-xs">
                  📅 Période: {selectedPeriod === 'day' ? 'Aujourd\'hui' : 
                                selectedPeriod === 'yesterday' ? 'Hier' :
                                selectedPeriod === 'day_before_yesterday' ? 'Avant-hier' :
                                selectedPeriod === 'week' ? 'Cette semaine' : 
                                selectedPeriod === 'month' ? 'Ce mois' :
                                selectedPeriod === 'last3months' ? '3 mois derniers' : 'Cette année'}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  🏪 Magasin: {selectedStore === 'all' ? 'Tous' : 
                                userStores.find(s => s.id === selectedStore)?.name || selectedStore}
                </Badge>
              </div>
            )}

            {/* Statistiques de la période - Totaux magasin (masqué pour vendeurs) */}
            {isSeller ? null : periodStatsLoading || salesStatsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : storeTotals && Object.keys(storeTotals).length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <Card className="bg-background/50">
                  <CardContent className="p-4 text-center">
                    <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{formatAmount(storeTotals.total_revenue || 0)}</div>
                    <div className="text-xs text-muted-foreground">Chiffre d'affaires du magasin</div>
                  </CardContent>
                </Card>
                
                <Card className="bg-background/50">
                  <CardContent className="p-4 text-center">
                    <ShoppingCart className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{storeTotals.total_sales || 0}</div>
                    <div className="text-xs text-muted-foreground">Ventes du magasin</div>
                  </CardContent>
                </Card>
                
                <Card className="bg-background/50">
                  <CardContent className="p-4 text-center">
                    <Users className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{storeTotals.unique_customers || 0}</div>
                    <div className="text-xs text-muted-foreground">Clients uniques</div>
                  </CardContent>
                </Card>
                
                <Card className="bg-background/50">
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{formatAmount(storeTotals.average_sale_amount || 0)}</div>
                    <div className="text-xs text-muted-foreground">Panier moyen</div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Aucune donnée disponible pour cette période
              </div>
            )}

            {/* Produits les plus vendus (masqué pour vendeurs) */}
            {isSeller ? null : statsLoading ? (
              <div className="space-y-2 sm:space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 sm:h-12 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : topProducts && Array.isArray(topProducts) && topProducts.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">Produits les plus vendus (magasin)</h4>
                {topProducts.slice(0, 3).map((product, index) => (
                  <div key={product.product_id} className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                      <div>
                        <div className="font-medium text-sm">{product.product_name}</div>
                        <div className="text-xs text-muted-foreground">{product.product_sku}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">{product.total_quantity} unités</div>
                      <div className="text-xs text-muted-foreground">{formatAmount(product.total_revenue)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Aucun produit vendu pour cette période
              </div>
            )}
          </CardContent>
        </Card>

        {/* ✅ OPTIMISÉ : Affichage simplifié et direct des données */}
        {loading ? (
          <DashboardSkeleton />
        ) : hasValidData ? (
          <>
            {/* Stock Status Section */}
            <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  lowStockProducts.length === 0 
                    ? 'bg-green-100' 
                    : 'bg-orange-100'
                }`}>
                  {lowStockProducts.length === 0 ? (
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-orange-600" />
                  )}
                </div>
                <CardTitle className="text-xl">
                  {filteredLowStockProducts.length === 0 ? 'Stock optimal' : 'Attention au stock'}
                </CardTitle>
                <CardDescription>
                  {filteredLowStockProducts.length === 0 
                    ? 'Stock suffisant pour tous les produits'
                    : `${filteredLowStockProducts.length} produit${filteredLowStockProducts.length > 1 ? 's' : ''} en alerte`
                  }
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
              {/* Recent Sales */}
              <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-green-600" />
                    Ventes récentes
                  </CardTitle>
                  <CardDescription>Dernières transactions effectuées</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentSales.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <ShoppingCart className="w-16 h-16 text-muted-foreground/20 mb-4" />
                      <p className="text-muted-foreground">Aucune vente récente</p>
                      {userProfile?.role && ['Vendeur', 'Manager', 'Admin', 'SuperAdmin'].includes(userProfile.role) && (
                        <Button variant="outline" className="mt-4" onClick={handleViewAllSales}>
                          Voir toutes les ventes
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {filteredRecentSales.slice(0, 5).map((sale) => (
                        <div key={sale.id} className="p-3 bg-white rounded-lg border border-green-200">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{sale.sale_code}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {sale.customer_name} • {format(new Date(sale.created_at), 'dd/MM/yyyy', { locale: fr })}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-semibold text-sm">{formatAmount(sale.total_amount)}</p>
                              <p className="text-xs text-muted-foreground">{sale.store_name}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Low Stock Products */}
              <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    Produits en alerte stock
                  </CardTitle>
                  <CardDescription>Produits nécessitant un réapprovisionnement</CardDescription>
                </CardHeader>
                <CardContent>
                  {lowStockProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <CheckCircle className="w-16 h-16 text-green-500/20 mb-4" />
                      <p className="text-green-600 font-medium">Stock optimal</p>
                      <p className="text-xs text-muted-foreground">Tous les produits ont un stock suffisant</p>
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {filteredLowStockProducts.slice(0, 5).map((product) => (
                        <div key={product.id} className="p-3 bg-white rounded-lg border border-orange-200">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{product.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {product.sku} • {product.store_name}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <Badge variant="destructive" className="text-xs">
                                Stock: {product.current_stock}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">
                                Alerte: {product.alert_stock}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Aucune donnée disponible pour le moment</p>
          </div>
        )}
      </div>
    </DashboardErrorBoundary>
  )
}