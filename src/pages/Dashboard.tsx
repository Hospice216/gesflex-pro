import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, TrendingUp, TrendingDown, Package, ShoppingCart, DollarSign, AlertTriangle, Users, Store, BarChart3, Filter, Calendar, RefreshCw, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/contexts/AuthContext'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useStoreSalesStats, usePeriodSalesStats, useTopSellingProducts, PeriodType } from '@/hooks/useSalesStats'
import { useStoreInventory } from '@/hooks/useStoreInventory'
import { useCurrency } from '@/hooks/useCurrency'
import { DataValidatorComponent } from '@/components/DataValidator'
import { DashboardSkeleton } from '@/components/LoadingStates'
import { ListPageErrorHandler } from '@/components/ListPageErrorHandler'
import DashboardErrorBoundary from '@/components/DashboardErrorBoundary'
import DatabaseViewsTest from '@/components/DatabaseViewsTest'
import AdvancedDashboardDiagnostic from '@/components/AdvancedDashboardDiagnostic'
import StoreSelector from '@/components/StoreSelector'
import { format } from "date-fns"
import { fr } from "date-fns/locale"

export default function Dashboard() {
  const welcomeEmoji = "👋"
  const { userProfile } = useAuth()
  const { recentSales, lowStockProducts, loading, error, refetch } = useDashboardStats()
  const { formatAmount } = useCurrency()
  const navigate = useNavigate()
  
  // ✅ NOUVEAU : États pour les filtres et périodes
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('month')
  const [selectedStore, setSelectedStore] = useState<string>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // ✅ NOUVEAU : Hooks optimisés pour les statistiques
  const storeId = selectedStore === 'all' 
    ? undefined 
    : selectedStore === 'current' 
      ? userProfile?.store_id 
      : selectedStore || userProfile?.store_id
  
  const { data: salesStats, isLoading: salesStatsLoading } = useStoreSalesStats(
    storeId,
    undefined,
    undefined
  )
  
  const { data: periodStats, isLoading: periodStatsLoading } = usePeriodSalesStats(
    storeId,
    selectedPeriod
  )
  
  const { data: topProducts, isLoading: topProductsLoading } = useTopSellingProducts(
    storeId,
    5
  )
  
  const { data: inventoryStats, isLoading: inventoryLoading } = useStoreInventory(
    storeId
  )

  // ✅ NOUVEAU : Fonction de rafraîchissement
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refetch()
    } finally {
      setIsRefreshing(false)
    }
  }

  // ✅ NOUVEAU : Récupération des magasins de l'utilisateur
  const userStores = useMemo(() => {
    if (!userProfile?.store_id) return []
    return [{ id: userProfile.store_id, name: 'Magasin principal' }]
  }, [userProfile?.store_id])
  
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
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tableau de Bord</h1>
            <p className="text-gray-600 mt-1">
              Bienvenue, {userProfile?.first_name} {userProfile?.last_name}
            </p>
          </div>

          {/* ✅ NOUVEAU : Actions rapides selon le rôle */}
          {userProfile?.role === 'Manager' && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => navigate('/sales/new')} className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle vente
              </Button>
              <Button onClick={() => navigate('/transfers/new')} variant="outline">
                <Package className="w-4 h-4 mr-2" />
                Nouveau transfert
              </Button>
            </div>
          )}

          {userProfile?.role === 'Vendeur' && (
            <Button onClick={() => navigate('/sales/new')} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle vente
            </Button>
          )}
        </div>

        {/* ✅ NOUVEAU : Section de filtres et statistiques avancées */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-xl">Statistiques Avancées</CardTitle>
                <CardDescription>
                  Analyse détaillée des performances et de l'inventaire
                </CardDescription>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Select value={selectedPeriod} onValueChange={(value: string) => setSelectedPeriod(value as PeriodType)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Aujourd'hui</SelectItem>
                    <SelectItem value="week">Cette semaine</SelectItem>
                    <SelectItem value="month">Ce mois</SelectItem>
                    <SelectItem value="year">Cette année</SelectItem>
                  </SelectContent>
                </Select>

                {userProfile?.role === 'Manager' && (
                  <Select value={selectedStore} onValueChange={setSelectedStore}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Tous les magasins" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tous les magasins</SelectItem>
                      {userStores.map(store => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

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
          <CardContent className="space-y-6">
            {/* ✅ NOUVEAU : Composant de test des vues PostgreSQL */}
            <DatabaseViewsTest />
            
            {/* 🔍 NOUVEAU : Diagnostic avancé du Dashboard */}
            <AdvancedDashboardDiagnostic />
            
            {/* Filtres */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Période</label>
                <Select value={selectedPeriod} onValueChange={(value: string) => setSelectedPeriod(value as PeriodType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une période" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Aujourd'hui</SelectItem>
                    <SelectItem value="week">Cette semaine</SelectItem>
                    <SelectItem value="month">Ce mois</SelectItem>
                    <SelectItem value="year">Cette année</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Magasin</label>
                <StoreSelector 
                  value={selectedStore} 
                  onValueChange={setSelectedStore}
                  placeholder="Tous les magasins"
                />
              </div>
            </div>

            {/* Statistiques de la période */}
            {periodStatsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : periodStats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-background/50">
                  <CardContent className="p-4 text-center">
                    <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{formatAmount(periodStats.total_revenue || 0)}</div>
                    <div className="text-xs text-muted-foreground">Chiffre d'affaires</div>
                  </CardContent>
                </Card>
                
                <Card className="bg-background/50">
                  <CardContent className="p-4 text-center">
                    <ShoppingCart className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{periodStats.total_sales || 0}</div>
                    <div className="text-xs text-muted-foreground">Ventes</div>
                  </CardContent>
                </Card>
                
                <Card className="bg-background/50">
                  <CardContent className="p-4 text-center">
                    <Users className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{periodStats.unique_customers || 0}</div>
                    <div className="text-xs text-muted-foreground">Clients uniques</div>
                  </CardContent>
                </Card>
                
                <Card className="bg-background/50">
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{formatAmount(periodStats.average_sale_amount || 0)}</div>
                    <div className="text-xs text-muted-foreground">Panier moyen</div>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {/* Produits les plus vendus */}
            {topProductsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : topProducts && topProducts.length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">Produits les plus vendus</h4>
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
            ) : null}
          </CardContent>
        </Card>

        {/* ✅ CORRECTION : Utilisation des nouveaux composants de chargement */}
        {loading ? (
          <DashboardSkeleton />
        ) : hasValidData ? (
          <DataValidatorComponent data={{ recentSales, lowStockProducts }}>
            {(validatedData, isValid, errors) => {
              // ✅ NOUVEAU : Log des erreurs de validation en développement
              if (process.env.NODE_ENV === 'development' && errors.length > 0) {
                console.warn('Erreurs de validation des données:', errors)
              }

              return (
                <>
                  {/* Stock Status Section */}
                  <Card className="bg-gradient-card shadow-card">
                    <CardHeader className="text-center">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                        validatedData.lowStockProducts.count === 0 
                          ? 'bg-success/10' 
                          : 'bg-warning/10'
                      }`}>
                        {validatedData.lowStockProducts.count === 0 ? (
                          <CheckCircle className="w-8 h-8 text-success" />
                        ) : (
                          <AlertTriangle className="w-8 h-8 text-warning" />
                        )}
                      </div>
                      <CardTitle className="text-xl">
                        {validatedData.lowStockProducts.count === 0 ? 'Stock optimal' : 'Attention au stock'}
                      </CardTitle>
                      <CardDescription>
                        {validatedData.lowStockProducts.count === 0 
                          ? 'Stock suffisant pour tous les produits'
                          : `${validatedData.lowStockProducts.count} produit${validatedData.lowStockProducts.count > 1 ? 's' : ''} en alerte`
                        }
                      </CardDescription>
                    </CardHeader>
                  </Card>

                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Recent Sales */}
                    <Card className="bg-gradient-card shadow-card">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <ShoppingCart className="w-5 h-5 text-primary" />
                          Ventes récentes
                        </CardTitle>
                        <CardDescription>Dernières transactions effectuées</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {validatedData.recentSales.length === 0 ? (
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
                          <div className="space-y-3">
                            {validatedData.recentSales.slice(0, 5).map((sale) => (
                              <div key={sale.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{sale.sale_code}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {sale.customer_name} • {format(new Date(sale.created_at), 'dd/MM/yyyy', { locale: fr })}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-sm">{formatAmount(sale.total_amount)}</p>
                                  <p className="text-xs text-muted-foreground">{sale.store_name}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Low Stock Products */}
                    <Card className="bg-gradient-card shadow-card">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-warning" />
                          Produits en alerte stock
                        </CardTitle>
                        <CardDescription>Produits nécessitant un réapprovisionnement</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {validatedData.lowStockProducts.count === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <CheckCircle className="w-16 h-16 text-success/20 mb-4" />
                            <p className="text-success">Stock optimal</p>
                            <p className="text-xs text-muted-foreground">Tous les produits ont un stock suffisant</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {validatedData.lowStockProducts.items.slice(0, 5).map((product) => (
                              <div key={product.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{product.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {product.sku} • {product.store_name}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <Badge variant="destructive" className="text-xs">
                                    Stock: {product.current_stock}
                                  </Badge>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Alerte: {product.alert_stock}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              )
            }}
          </DataValidatorComponent>
        ) : (
          // ✅ NOUVEAU : État d'erreur silencieux avec message informatif
          <div className="text-center py-8">
            <p className="text-muted-foreground">Aucune donnée disponible pour le moment</p>
          </div>
        )}
      </div>
    </DashboardErrorBoundary>
  )
}