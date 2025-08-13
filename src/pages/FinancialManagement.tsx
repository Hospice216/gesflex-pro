import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, TrendingUp, TrendingDown, DollarSign, PieChart, Calendar, Search } from "lucide-react"
import { useState, useEffect } from "react"
import { useCurrency } from "@/hooks/useCurrency"
import { ExpenseModal } from "@/components/ExpenseModal"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"

interface FinancialSummary {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  monthlyGrowth: number
}

interface Expense {
  id: string
  title: string
  category: string
  amount: number
  expense_date: string
  created_at: string
  store_id: string | null
  stores?: {
    name: string
  }
}

export default function FinancialManagement() {
  const { formatAmount } = useCurrency()
  const [searchTerm, setSearchTerm] = useState("")
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    monthlyGrowth: 0
  })
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { userProfile } = useAuth()

  useEffect(() => {
    fetchFinancialData()
  }, [])

  const fetchFinancialData = async () => {
    try {
      setLoading(true)

      // Fetch expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select(`
          *,
          stores(name)
        `)
        .order('expense_date', { ascending: false })

      if (expensesError) throw expensesError

      // Fetch sales for revenue calculation
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('total_amount, created_at')
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

      if (salesError) throw salesError

      // Calculate financial summary
      const totalExpenses = expensesData?.reduce((sum, expense) => sum + expense.amount, 0) || 0
      const totalRevenue = salesData?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0
      const netProfit = totalRevenue - totalExpenses

      // Calculate monthly growth (simplified)
      const previousMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
      const { data: previousSalesData } = await supabase
        .from('sales')
        .select('total_amount, created_at')
        .gte('created_at', previousMonth.toISOString())
        .lt('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

      const previousRevenue = previousSalesData?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0
      const monthlyGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0

      setExpenses(expensesData || [])
      setFinancialSummary({
        totalRevenue,
        totalExpenses,
        netProfit,
        monthlyGrowth
      })
    } catch (error) {
      console.error('Error fetching financial data:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les données financières",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getTransactionBadge = (type: string) => {
    return type === "revenue" ? (
      <Badge variant="default" className="bg-success text-success-foreground">Recette</Badge>
    ) : (
      <Badge variant="destructive">Dépense</Badge>
    )
  }

  const handleNewExpense = () => {
    setIsExpenseModalOpen(true)
  }

  const filteredExpenses = expenses.filter(expense =>
    expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-primary" />
            Gestion Financière
          </h1>
          <p className="text-muted-foreground">
            Suivi des finances et comptabilité
          </p>
        </div>
        
        <Button onClick={handleNewExpense} className="gap-2">
          <Plus className="w-4 h-4" />
          Nouvelle Dépense
        </Button>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus Totaux</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(financialSummary.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              +{financialSummary.monthlyGrowth.toFixed(1)}% par rapport au mois dernier
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dépenses Totales</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(financialSummary.totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              Dépenses du mois en cours
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bénéfice Net</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${financialSummary.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatAmount(financialSummary.netProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              {financialSummary.netProfit >= 0 ? 'Bénéfice' : 'Perte'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Croissance Mensuelle</CardTitle>
            <PieChart className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${financialSummary.monthlyGrowth >= 0 ? 'text-success' : 'text-destructive'}`}>
              {financialSummary.monthlyGrowth >= 0 ? '+' : ''}{financialSummary.monthlyGrowth.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Par rapport au mois dernier
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="expenses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="expenses">Dépenses</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dépenses</CardTitle>
              <CardDescription>
                Liste de toutes les dépenses enregistrées
              </CardDescription>
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une dépense..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Chargement...</div>
                </div>
              ) : filteredExpenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <DollarSign className="w-16 h-16 text-muted-foreground/20 mb-4" />
                  <p className="text-muted-foreground">Aucune dépense enregistrée</p>
                  <Button onClick={handleNewExpense} className="mt-4">
                    Ajouter une dépense
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dépense</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Magasin</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">{expense.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{expense.category}</Badge>
                        </TableCell>
                        <TableCell className="font-medium text-destructive">
                          {formatAmount(expense.amount)}
                        </TableCell>
                        <TableCell>{expense.stores?.name || 'Tous'}</TableCell>
                        <TableCell>{new Date(expense.expense_date).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Financiers</CardTitle>
              <CardDescription>
                Graphiques et analyses des performances financières
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <PieChart className="w-16 h-16 text-muted-foreground/20 mb-4" />
                <p className="text-muted-foreground">Graphiques et analytics à venir</p>
                <p className="text-sm text-muted-foreground">
                  Intégration de graphiques interactifs pour l'analyse financière
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Expense Modal */}
      <ExpenseModal
        open={isExpenseModalOpen}
        onOpenChange={setIsExpenseModalOpen}
        onSuccess={fetchFinancialData}
      />
    </div>
  )
}