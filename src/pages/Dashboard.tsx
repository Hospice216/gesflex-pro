import { DashboardStats } from "@/components/dashboard-stats"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Package, TrendingUp, ShoppingCart, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useDashboardStats } from "@/hooks/useDashboardStats"
import { useCurrency } from "@/hooks/useCurrency"
import { useNavigate } from "react-router-dom"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

export default function Dashboard() {
  const welcomeEmoji = "👋"
  const { userProfile } = useAuth()
  const { recentSales, lowStockProducts, loading, error } = useDashboardStats()
  const { formatAmount } = useCurrency()
  const navigate = useNavigate()
  
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
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            Bonjour {userProfile?.first_name || 'Utilisateur'} ! {welcomeEmoji}
          </h1>
          <p className="text-muted-foreground">
            Aperçu de votre activité aujourd'hui
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          {/* ✅ SOLUTION : Boutons conditionnels avec vérification des permissions */}
          {userProfile?.role && ['Vendeur', 'Manager', 'Admin', 'SuperAdmin'].includes(userProfile.role) && (
            <Button variant="success" size="touch" className="gap-2" onClick={handleNewSale}>
              <Plus className="w-4 h-4" />
              Nouvelle vente
            </Button>
          )}
          
          {userProfile?.role && ['Admin', 'SuperAdmin', 'Manager'].includes(userProfile.role) && (
            <Button variant="default" size="touch" className="gap-2" onClick={handleAddProduct}>
              <Package className="w-4 h-4" />
              Ajouter produit
            </Button>
          )}
          
          {userProfile?.role && ['Admin', 'SuperAdmin', 'Manager'].includes(userProfile.role) && (
            <Button variant="outline" size="touch" className="gap-2" onClick={handleInventory}>
              <TrendingUp className="w-4 h-4" />
              Inventaire
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <DashboardStats />

      {/* ✅ SOLUTION : Gestion cohérente des états de chargement */}
      {loading ? (
        <div className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader className="text-center">
              <div className="animate-pulse bg-gray-300 h-16 w-16 rounded-full mx-auto mb-4"></div>
              <div className="animate-pulse bg-gray-300 h-6 w-48 rounded mx-auto mb-2"></div>
              <div className="animate-pulse bg-gray-300 h-4 w-64 rounded mx-auto"></div>
            </CardHeader>
          </Card>
          
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <Card key={index} className="bg-gradient-card shadow-card">
                <CardHeader>
                  <div className="animate-pulse bg-gray-300 h-6 w-32 rounded mb-2"></div>
                  <div className="animate-pulse bg-gray-300 h-4 w-48 rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, itemIndex) => (
                      <div key={itemIndex} className="animate-pulse bg-gray-300 h-16 w-full rounded"></div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Stock Status Section */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader className="text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                lowStockProducts.count === 0 
                  ? 'bg-success/10' 
                  : 'bg-warning/10'
              }`}>
                {lowStockProducts.count === 0 ? (
                  <CheckCircle className="w-8 h-8 text-success" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-warning" />
                )}
              </div>
              <CardTitle className="text-xl">
                {lowStockProducts.count === 0 ? 'Stock optimal' : 'Attention au stock'}
              </CardTitle>
              <CardDescription>
                {lowStockProducts.count === 0 
                  ? 'Stock suffisant pour tous les produits'
                  : `${lowStockProducts.count} produit${lowStockProducts.count > 1 ? 's' : ''} en alerte`
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
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {recentSales.slice(0, 3).map((sale) => (
                        <div key={sale.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {sale.customer_name || 'Client anonyme'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {sale.sale_code} • {format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-sm">
                              {formatAmount(sale.total_amount)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {sale.store_name}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {userProfile?.role && ['Vendeur', 'Manager', 'Admin', 'SuperAdmin'].includes(userProfile.role) && (
                      <Button variant="outline" className="w-full" onClick={handleViewAllSales}>
                        Voir toutes les ventes
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stock Alerts */}
            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  Alertes de stock
                </CardTitle>
                <CardDescription>Produits nécessitant un réapprovisionnement</CardDescription>
              </CardHeader>
              <CardContent>
                {lowStockProducts.count === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle className="w-16 h-16 text-success/20 mb-4" />
                    <p className="text-muted-foreground">Tous les produits ont un stock suffisant</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {lowStockProducts.items.slice(0, 3).map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-warning/10 rounded-lg border border-warning/20">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{item.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.sku} • {item.store_name}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="destructive" className="text-xs">
                              {item.current_stock} / {item.alert_stock}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}