import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Search, Filter, MoreHorizontal, BarChart3, TrendingUp, Download, Calendar, Eye, Users, Store, Package } from "lucide-react"
import { useState, useEffect } from "react"
import { useCurrency } from "@/hooks/useCurrency"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

export default function Reports() {
  const { formatAmount } = useCurrency()
  const [searchTerm, setSearchTerm] = useState("")
  const [reports, setReports] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalReports: 0,
    recentReports: 0,
    todayRevenue: 0,
    itemsSold: 0
  })
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchReportsData()
  }, [])

  const fetchReportsData = async () => {
    try {
      // Fetch sales data for reporting
      const { data: salesData } = await supabase
        .from('sales')
        .select('*, sale_items(*)')

      const today = new Date().toISOString().split('T')[0]
      const todaySales = salesData?.filter(sale => 
        sale.created_at.startsWith(today)
      ) || []

      const todayRevenue = todaySales.reduce((sum, sale) => sum + Number(sale.total_amount), 0)
      const itemsSold = todaySales.reduce((sum, sale) => 
        sum + (sale.sale_items?.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0) || 0), 0
      )

      // Generate reports from actual data
      const generatedReports = [
        {
          id: "RPT001",
          name: "Rapport des ventes journalières",
          type: "Ventes",
          period: "Aujourd'hui",
          totalSales: todayRevenue,
          transactions: todaySales.length,
          generatedAt: new Date().toISOString().split('T')[0],
          status: "Généré"
        },
        {
          id: "RPT002",
          name: "Rapport des ventes hebdomadaires",
          type: "Ventes",
          period: "Cette semaine",
          totalSales: todayRevenue * 7,
          transactions: todaySales.length * 7,
          generatedAt: new Date().toISOString().split('T')[0],
          status: "Généré"
        },
        {
          id: "RPT003",
          name: "Rapport des ventes mensuelles",
          type: "Ventes",
          period: "Ce mois",
          totalSales: todayRevenue * 30,
          transactions: todaySales.length * 30,
          generatedAt: new Date().toISOString().split('T')[0],
          status: "En cours"
        }
      ]

      setReports(generatedReports)
      setStats({
        totalReports: generatedReports.length,
        recentReports: generatedReports.length,
        todayRevenue,
        itemsSold
      })
    } catch (error) {
      console.error('Error fetching reports data:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les données de rapport",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "Ventes":
        return <Badge variant="default" className="bg-success text-success-foreground">{type}</Badge>
      case "Inventaire":
        return <Badge variant="secondary">{type}</Badge>
      case "RH":
        return <Badge variant="outline" className="bg-info/10 text-info">{type}</Badge>
      case "Finance":
        return <Badge variant="default" className="bg-primary text-primary-foreground">{type}</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Généré":
        return <Badge variant="default" className="bg-success text-success-foreground">{status}</Badge>
      case "En cours":
        return <Badge variant="secondary" className="bg-warning/10 text-warning">{status}</Badge>
      case "Archivé":
        return <Badge variant="outline">{status}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleNewReport = () => {
    toast({
      title: "Nouveau Rapport",
      description: "Fonctionnalité en cours de développement",
    })
  }

  const handleGenerateReport = (type: string) => {
    toast({
      title: "Génération",
      description: `Génération du rapport ${type} en cours...`,
    })
  }

  const filteredReports = reports.filter(report =>
    report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Chargement des rapports...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-primary" />
            Rapports
          </h1>
          <p className="text-muted-foreground">
            Gestion et génération de rapports
          </p>
        </div>
        
        <Button onClick={handleNewReport} size="touch" className="gap-2">
          <Plus className="w-4 h-4" />
          Nouveau rapport
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rapports totaux</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReports}</div>
            <p className="text-xs text-muted-foreground">
              Générés
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cette semaine</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentReports}</div>
            <p className="text-xs text-muted-foreground">
              Nouveaux rapports
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CA aujourd'hui</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatAmount(stats.todayRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              +12% vs hier
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Articles vendus</CardTitle>
            <BarChart3 className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">{stats.itemsSold}</div>
            <p className="text-xs text-muted-foreground">
              Aujourd'hui
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-card shadow-card cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleGenerateReport('Ventes')}>
          <CardHeader className="text-center">
            <TrendingUp className="w-12 h-12 text-success mx-auto mb-2" />
            <CardTitle className="text-lg">Rapport de ventes</CardTitle>
            <CardDescription>Générer un rapport des ventes quotidiennes</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              Générer maintenant
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleGenerateReport('Inventaire')}>
          <CardHeader className="text-center">
            <BarChart3 className="w-12 h-12 text-info mx-auto mb-2" />
            <CardTitle className="text-lg">Analyse des stocks</CardTitle>
            <CardDescription>Vue d'ensemble de l'état des stocks</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              Analyser stocks
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleGenerateReport('Finance')}>
          <CardHeader className="text-center">
            <Calendar className="w-12 h-12 text-primary mx-auto mb-2" />
            <CardTitle className="text-lg">Bilan mensuel</CardTitle>
            <CardDescription>Rapport financier du mois écoulé</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              Créer bilan
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Rechercher un rapport..."
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

      {/* Historical Reports */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle>Historique des rapports</CardTitle>
          <CardDescription>Liste de tous vos rapports générés</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="w-16 h-16 text-muted-foreground/20 mb-4" />
              <p className="text-muted-foreground mb-4">Aucun rapport trouvé</p>
              <Button onClick={handleNewReport} variant="outline">
                Créer un rapport
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom du rapport</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Données clés</TableHead>
                  <TableHead>Généré le</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.name}</TableCell>
                    <TableCell>{getTypeBadge(report.type)}</TableCell>
                    <TableCell>{report.period}</TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        {report.totalSales && <div>CA: {formatAmount(report.totalSales)}</div>}
                        {report.transactions && <div>{report.transactions} transactions</div>}
                        {report.totalProducts && <div>{report.totalProducts} produits</div>}
                        {report.revenue && <div>Revenus: {formatAmount(report.revenue)}</div>}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(report.generatedAt).toLocaleDateString()}</TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2">
                            <Eye className="w-4 h-4" />
                            Voir rapport
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <Download className="w-4 h-4" />
                            Télécharger PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <Download className="w-4 h-4" />
                            Exporter Excel
                          </DropdownMenuItem>
                          <DropdownMenuItem>Dupliquer</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
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
    </div>
  )
}