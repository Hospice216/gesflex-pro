import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, DollarSign, Package, AlertTriangle, Users, Store } from "lucide-react"
import { useDashboardStats } from "@/hooks/useDashboardStats"
import { useCurrency } from "@/hooks/useCurrency"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  trend?: string
  icon: React.ElementType
  variant?: 'default' | 'success' | 'warning' | 'info'
  loading?: boolean
}

function StatCard({ title, value, description, trend, icon: Icon, variant = 'default', loading = false }: StatCardProps) {
  const getCardStyles = () => {
    switch (variant) {
      case 'success':
        return "bg-gradient-success text-white border-0"
      case 'warning':
        return "bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0"
      case 'info':
        return "bg-gradient-primary text-white border-0"
      default:
        return "bg-gradient-card border shadow-card hover:shadow-elevated transition-all duration-200"
    }
  }

  const getTextColor = () => {
    return variant === 'default' ? 'text-foreground' : 'text-white'
  }

  const getDescriptionColor = () => {
    return variant === 'default' ? 'text-muted-foreground' : 'text-white/80'
  }

  // ✅ CORRECTION : Validation des données avant affichage
  const isValidValue = (val: string | number) => {
    if (typeof val === 'number') return !isNaN(val) && isFinite(val)
    if (typeof val === 'string') return val.trim().length > 0
    return false
  }

  const displayValue = isValidValue(value) ? value : '0'
  const displayDescription = description && isValidValue(value) ? description : 'Données non disponibles'
  const displayTrend = trend && isValidValue(value) ? trend : ''

  return (
    <Card className={`${getCardStyles()} transform hover:scale-[1.02] transition-all duration-200`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={`text-sm font-medium ${getTextColor()}`}>
          {title}
        </CardTitle>
        <Icon className={`h-5 w-5 ${variant === 'default' ? 'text-muted-foreground' : 'text-white/80'}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${getTextColor()}`}>
          {loading ? (
            <div className="animate-pulse bg-gray-300 h-8 w-24 rounded"></div>
          ) : (
            displayValue
          )}
        </div>
        {description && (
          <div className={`text-xs ${getDescriptionColor()}`}>
            {loading ? (
              <div className="animate-pulse bg-gray-300 h-3 w-16 rounded"></div>
            ) : (
              displayDescription
            )}
          </div>
        )}
        {trend && (
          <div className="flex items-center mt-1">
            <TrendingUp className={`h-3 w-3 mr-1 ${variant === 'default' ? 'text-green-600' : 'text-white/80'}`} />
            <span className={`text-xs ${variant === 'default' ? 'text-green-600' : 'text-white/80'}`}>
              {loading ? (
                <div className="animate-pulse bg-gray-300 h-3 w-12 rounded"></div>
              ) : (
                displayTrend
              )}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function DashboardStats() {
  const { dailySales, totalSales, totalProducts, lowStockProducts, loading, error, refetch } = useDashboardStats()
  const { formatAmount, formatPercentage } = useCurrency()
  const { userProfile } = useAuth()

  const canViewRevenue = userProfile?.role && ['Admin', 'SuperAdmin'].includes(userProfile.role)

  // ✅ CORRECTION : Gestion d'erreur améliorée avec bouton de retry
  if (error) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="bg-gradient-card border shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-foreground">
                  Erreur
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  --
                </div>
                <div className="text-xs text-muted-foreground">
                  Données non disponibles
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* ✅ NOUVEAU : Message d'erreur centralisé avec bouton de retry */}
        <Card className="bg-destructive/10 border border-destructive/20">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-destructive mb-2">
              Erreur de chargement des statistiques
            </h3>
            <p className="text-destructive/80 mb-4 text-sm">
              {error}
            </p>
            <Button 
              variant="outline" 
              onClick={refetch}
              className="gap-2"
              size="sm"
            >
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ✅ CORRECTION : Validation des données avant affichage
  const stats = [
    {
      title: "Ventes du jour",
      value: dailySales?.count || 0,
      description: dailySales?.amount ? `${formatAmount(dailySales.amount)} de chiffre d'affaires` : 'Aucune vente',
      icon: DollarSign,
      variant: "info" as const,
      trend: dailySales?.percentageChange ? formatPercentage(dailySales.percentageChange) : '',
      loading
    },
    {
      title: "Produits vendus",
      value: totalSales?.productsSold || 0,
      description: canViewRevenue && totalSales?.amount
        ? `${formatAmount(totalSales.amount)} de chiffre d'affaires total`
        : "Quantité de produits vendus ce mois",
      icon: TrendingUp,
      variant: "success" as const,
      loading
    },
    {
      title: "Total produits",
      value: totalProducts?.count || 0,
      description: "Produits en stock",
      icon: Package,
      variant: "default" as const,
      loading
    },
    {
      title: "Stock faible",
      value: lowStockProducts?.count || 0,
      description: "Produits nécessitant un réapprovisionnement",
      icon: AlertTriangle,
      variant: "warning" as const,
      loading
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  )
}
