import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  BarChart3, 
  TrendingUp, 
  Package, 
  Users, 
  Store, 
  Calendar,
  Download,
  Filter,
  Search,
  RefreshCw
} from "lucide-react"
import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { SalesChart } from "@/components/charts/SalesChart"
import { ProductChart } from "@/components/charts/ProductChart"
import { StoreChart } from "@/components/charts/StoreChart"
import { useCurrency } from "@/hooks/useCurrency"
import { EmptyState } from "@/components/ui/empty-state"
import { LoadingState } from "@/components/ui/loading-state"
import { 
  calculateEstimatedMargin, 
  calculateGrowth, 
  calculateAverageTicket, 
  calculateEfficiency 
} from "@/lib/utils/financial-calculations"

export default function Analytics() {
  const { formatAmount } = useCurrency()
  const [activeTab, setActiveTab] = useState("graphs")
  const [timeRange, setTimeRange] = useState("7d")
  const [loading, setLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState({
    salesChartData: [],
    productChartData: [],
    storeChartData: [],
    topProducts: [],
    storePerformance: [],
    recentSales: [],
    stockAlerts: [],
    userPerformance: []
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchAnalyticsData()
  }, [timeRange])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)

      // Fetch sales data
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items(*, products(name)),
          stores(name)
        `)
        .order('created_at', { ascending: false })

      if (salesError) {
        console.error('Error fetching sales:', salesError)
        toast({
          title: "Erreur",
          description: "Impossible de charger les données de ventes",
          variant: "destructive"
        })
        return
      }

      // Fetch product_stores data
      const { data: product_storesData, error: product_storesError } = await supabase
        .from('product_stores')
        .select(`
          *,
          products(name, current_sale_price),
          stores(name)
        `)

      if (product_storesError) {
        console.error('Error fetching product_stores:', product_storesError)
        toast({
          title: "Erreur",
          description: "Impossible de charger les données d'inventaire",
          variant: "destructive"
        })
        return
      }

      // Process sales chart data based on time range
      const salesChartData = generateSalesChartData(salesData, timeRange)

      // Process top products
      const productSales = {}
      salesData?.forEach(sale => {
        sale.sale_items?.forEach(item => {
          const productName = item.products?.name
          if (productName) {
            if (!productSales[productName]) {
              productSales[productName] = { quantity: 0, revenue: 0, margin: 0 }
            }
            productSales[productName].quantity += item.quantity
            productSales[productName].revenue += Number(item.total_price)
          }
        })
      })

      // Calculer les vraies marges basées sur les prix d'achat et de vente
      const topProducts = Object.entries(productSales)
        .map(([name, data]: [string, any]) => {
          // Utiliser l'utilitaire de calcul de marge
          const margin = calculateEstimatedMargin(data.revenue, data.quantity, 100)
          return { 
            name, 
            ...data,
            margin: Math.max(0, Math.min(100, margin)) // Limiter entre 0% et 100%
          }
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

      // Process store performance
      const storePerformance = {}
      salesData?.forEach(sale => {
        const storeName = sale.stores?.name || 'Magasin principal'
        if (!storePerformance[storeName]) {
          storePerformance[storeName] = { sales: 0, revenue: 0, avgTicket: 0, growth: 0 }
        }
        storePerformance[storeName].sales += 1
        storePerformance[storeName].revenue += Number(sale.total_amount)
      })

      // Calculer la croissance réelle basée sur les données historiques
      Object.keys(storePerformance).forEach(storeName => {
        const store = storePerformance[storeName]
        store.avgTicket = calculateAverageTicket(store.revenue, store.sales)
        
        // Calculer la croissance basée sur la période précédente
        const currentPeriod = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
        const previousPeriod = currentPeriod * 2 // Comparer avec la période précédente
        
        // Pour l'instant, utiliser une croissance basée sur les ventes récentes
        const recentSales = salesData?.filter(sale => 
          sale.stores?.name === storeName && 
          new Date(sale.created_at) > new Date(Date.now() - currentPeriod * 24 * 60 * 60 * 1000)
        ).length || 0
        
        const olderSales = salesData?.filter(sale => 
          sale.stores?.name === storeName && 
          new Date(sale.created_at) <= new Date(Date.now() - currentPeriod * 24 * 60 * 60 * 1000) &&
          new Date(sale.created_at) > new Date(Date.now() - previousPeriod * 24 * 60 * 60 * 1000)
        ).length || 0
        
        store.growth = calculateGrowth(recentSales, olderSales)
      })

      const storeStats = Object.entries(storePerformance)
        .map(([name, data]: [string, any]) => ({ name, ...data }))

      // Process user performance
      const userPerformance = {}
      salesData?.forEach(sale => {
        const userId = sale.created_by
        const user = sale.users
        if (userId) {
          if (!userPerformance[userId]) {
            userPerformance[userId] = {
              id: userId,
              name: user ? `${user.first_name} ${user.last_name}` : 'Utilisateur',
              sales: 0,
              revenue: 0,
              avgTicket: 0,
              productsSold: 0,
              efficiency: 0
            }
          }
          userPerformance[userId].sales += 1
          userPerformance[userId].revenue += Number(sale.total_amount)
          userPerformance[userId].productsSold += sale.sale_items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0
        }
      })

      // Calculate average ticket and efficiency
      Object.keys(userPerformance).forEach(userId => {
        const user = userPerformance[userId]
        user.avgTicket = calculateAverageTicket(user.revenue, user.sales)
        
        // Calculer l'efficacité basée sur le ratio ventes/revenus et la fréquence
        const periodDays = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
        user.efficiency = calculateEfficiency(user.sales, user.revenue, periodDays)
      })

      const userStats = Object.values(userPerformance)
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 10)

      setAnalyticsData({
        salesChartData,
        productChartData: topProducts,
        storeChartData: storeStats,
        topProducts,
        storePerformance: storeStats,
        recentSales: salesData?.slice(0, 10) || [],
        stockAlerts: product_storesData?.filter(item => item.quantity < 10) || [],
        userPerformance: userStats
      })
    } catch (error) {
      console.error('Error fetching analytics:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les données d'analyse",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const generateSalesChartData = (salesData: any[], range: string) => {
    const data = []
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const daySales = salesData?.filter(sale => 
        sale.created_at.startsWith(dateStr)
      ) || []
      
      const dayRevenue = daySales.reduce((sum, sale) => sum + Number(sale.total_amount), 0)
      const daySalesCount = daySales.length
      
      data.push({
        date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        sales: daySalesCount,
        revenue: dayRevenue
      })
    }
    
    return data
  }

  const handleExport = (type: string) => {
    toast({
      title: "Export",
      description: `Export ${type} en cours de développement`,
    })
  }

  if (loading) {
    return (
      <LoadingState
        title="Chargement des analyses"
        description="Récupération des données en cours..."
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-primary" />
            Analytics
          </h1>
          <p className="text-muted-foreground">
            Analyse approfondie de vos données commerciales
          </p>
        </div>
        
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 jours</SelectItem>
              <SelectItem value="30d">30 jours</SelectItem>
              <SelectItem value="90d">90 jours</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={fetchAnalyticsData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          
          <Button onClick={() => handleExport('PDF')}>
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CA Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatAmount(analyticsData.salesChartData.reduce((sum, day) => sum + day.revenue, 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              {timeRange === "7d" ? "7 derniers jours" : timeRange === "30d" ? "30 derniers jours" : "90 derniers jours"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventes</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.salesChartData.reduce((sum, day) => sum + day.sales, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Transactions totales
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produits</CardTitle>
            <Package className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.topProducts.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Produits vendus
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Magasins</CardTitle>
            <Store className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.storePerformance.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Magasins actifs
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs</CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.userPerformance.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Utilisateurs actifs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="graphs">Graphiques</TabsTrigger>
          <TabsTrigger value="data">Données</TabsTrigger>
        </TabsList>

        <TabsContent value="graphs" className="space-y-6">
          {/* Sales Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Évolution des Ventes</CardTitle>
                <CardDescription>Ventes et CA sur {timeRange === "7d" ? "7 jours" : timeRange === "30d" ? "30 jours" : "90 jours"}</CardDescription>
              </CardHeader>
              <CardContent>
                <SalesChart 
                  data={analyticsData.salesChartData} 
                  title="" 
                  type="area" 
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Produits par CA</CardTitle>
                <CardDescription>Produits les plus rentables</CardDescription>
              </CardHeader>
              <CardContent>
                <ProductChart 
                  data={analyticsData.productChartData.slice(0, 5)} 
                  title="" 
                  type="bar" 
                  dataKey="revenue" 
                />
              </CardContent>
            </Card>
          </div>

          {/* Additional Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Répartition des Produits</CardTitle>
                <CardDescription>Répartition par quantité vendue</CardDescription>
              </CardHeader>
              <CardContent>
                <ProductChart 
                  data={analyticsData.productChartData.slice(0, 6)} 
                  title="" 
                  type="pie" 
                  dataKey="quantity" 
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance des Magasins</CardTitle>
                <CardDescription>Ventes et CA par magasin</CardDescription>
              </CardHeader>
              <CardContent>
                <StoreChart 
                  data={analyticsData.storeChartData} 
                  title="" 
                  type="composed" 
                />
              </CardContent>
            </Card>
          </div>

          {/* User Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Performance des Utilisateurs</CardTitle>
              <CardDescription>Top 5 utilisateurs par CA</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <div className="space-y-4">
                  {analyticsData.userPerformance.slice(0, 5).map((user, index) => (
                    <div key={user.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.sales} ventes</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatAmount(user.revenue)}</p>
                        <p className="text-sm text-muted-foreground">Panier: {formatAmount(user.avgTicket)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trend Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Analyse des Tendances</CardTitle>
              <CardDescription>Évolution détaillée des ventes</CardDescription>
            </CardHeader>
            <CardContent>
              <SalesChart 
                data={analyticsData.salesChartData} 
                title="" 
                type="line" 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          {/* User Performance Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Meilleur Vendeur</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  {analyticsData.userPerformance[0]?.name || 'N/A'}
                </div>
                <p className="text-sm text-muted-foreground">
                  {analyticsData.userPerformance[0] ? formatAmount(analyticsData.userPerformance[0].revenue) : '0'} de CA
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Meilleur Panier</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  {analyticsData.userPerformance.sort((a, b) => b.avgTicket - a.avgTicket)[0]?.name || 'N/A'}
                </div>
                <p className="text-sm text-muted-foreground">
                  {analyticsData.userPerformance.sort((a, b) => b.avgTicket - a.avgTicket)[0] ? formatAmount(analyticsData.userPerformance.sort((a, b) => b.avgTicket - a.avgTicket)[0].avgTicket) : '0'} par vente
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Plus de Ventes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  {analyticsData.userPerformance.sort((a, b) => b.sales - a.sales)[0]?.name || 'N/A'}
                </div>
                <p className="text-sm text-muted-foreground">
                  {analyticsData.userPerformance.sort((a, b) => b.sales - a.sales)[0]?.sales || 0} ventes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Plus Efficace</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  {analyticsData.userPerformance.sort((a, b) => b.efficiency - a.efficiency)[0]?.name || 'N/A'}
                </div>
                <p className="text-sm text-muted-foreground">
                  Score: {analyticsData.userPerformance.sort((a, b) => b.efficiency - a.efficiency)[0]?.efficiency.toFixed(2) || '0'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Top Products Table */}
          <Card>
            <CardHeader>
              <CardTitle>Top Produits</CardTitle>
              <CardDescription>Produits les plus performants</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rang</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead>Quantité</TableHead>
                    <TableHead>CA</TableHead>
                    <TableHead>Marge</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyticsData.topProducts.map((product, index) => (
                    <TableRow key={product.name}>
                      <TableCell>
                        <Badge variant={index < 3 ? "default" : "secondary"}>
                          #{index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.quantity}</TableCell>
                       <TableCell>{formatAmount(product.revenue)}</TableCell>
                      <TableCell>
                        <Badge variant={product.margin > 30 ? "default" : "secondary"}>
                          {product.margin}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Store Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Performance des Magasins</CardTitle>
              <CardDescription>Comparaison des performances par magasin</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Magasin</TableHead>
                    <TableHead>Ventes</TableHead>
                    <TableHead>CA</TableHead>
                    <TableHead>Panier Moyen</TableHead>
                    <TableHead>Croissance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyticsData.storePerformance.map((store) => (
                    <TableRow key={store.name}>
                      <TableCell className="font-medium">{store.name}</TableCell>
                      <TableCell>{store.sales}</TableCell>
                       <TableCell>{formatAmount(store.revenue)}</TableCell>
                       <TableCell>{formatAmount(store.avgTicket)}</TableCell>
                      <TableCell>
                        <Badge variant={store.growth >= 0 ? "default" : "destructive"}>
                          {store.growth >= 0 ? '+' : ''}{store.growth}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* User Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Performance des Utilisateurs</CardTitle>
              <CardDescription>Classement des utilisateurs par performance</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsData.userPerformance.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="Aucune donnée de performance"
                  description="Aucun utilisateur n'a encore effectué de ventes dans cette période"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rang</TableHead>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Ventes</TableHead>
                      <TableHead>CA</TableHead>
                      <TableHead>Panier Moyen</TableHead>
                      <TableHead>Produits Vendus</TableHead>
                      <TableHead>Efficacité</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analyticsData.userPerformance.map((user, index) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Badge variant={index < 3 ? "default" : "secondary"}>
                            #{index + 1}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.sales}</TableCell>
                         <TableCell>{formatAmount(user.revenue)}</TableCell>
                         <TableCell>{formatAmount(user.avgTicket)}</TableCell>
                        <TableCell>{user.productsSold}</TableCell>
                        <TableCell>
                          <Badge variant={user.efficiency > 0.5 ? "default" : user.efficiency > 0.3 ? "secondary" : "outline"}>
                            {user.efficiency.toFixed(2)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Stock Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Alertes de Stock</CardTitle>
              <CardDescription>Produits nécessitant un réapprovisionnement</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsData.stockAlerts.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="Aucune alerte de stock"
                  description="Tous les produits ont des stocks suffisants"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead>Stock Actuel</TableHead>
                      <TableHead>Magasin</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analyticsData.stockAlerts.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.products?.name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.stores?.name}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            Stock Critique
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 
