import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, DollarSign, Package, AlertTriangle, Users, Store } from "lucide-react"
import { useDashboardStats } from "@/hooks/useDashboardStats"
import { useCurrency } from "@/hooks/useCurrency"
import { useAuth } from "@/contexts/AuthContext"

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
            value
          )}
        </div>
        {description && (
          <div className={`text-xs ${getDescriptionColor()}`}>
            {loading ? (
              <div className="animate-pulse bg-gray-300 h-3 w-16 rounded"></div>
            ) : (
              description
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
                trend
              )}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function DashboardStats() {
  const { dailySales, totalSales, totalProducts, lowStockProducts, loading, error } = useDashboardStats()
  const { formatAmount, formatPercentage } = useCurrency()
  const { userProfile } = useAuth()

  const canViewRevenue = userProfile?.role && ['Admin', 'SuperAdmin'].includes(userProfile.role)

  // ✅ SOLUTION : Affichage d'erreur clair avec skeleton loading
  if (error) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="bg-gradient-card border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">
                Chargement...
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                <div className="animate-pulse bg-gray-300 h-8 w-24 rounded"></div>
              </div>
              <div className="text-xs text-muted-foreground">
                <div className="animate-pulse bg-gray-300 h-3 w-16 rounded mt-2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
        <div className="col-span-full text-center py-4">
          <p className="text-destructive text-sm">
            Erreur de chargement des statistiques: {error}
          </p>
        </div>
      </div>
    )
  }

  const stats = [
    {
      title: "Ventes du jour",
      value: dailySales.count.toString(),
      description: `${formatAmount(dailySales.amount)} de chiffre d'affaires`,
      icon: DollarSign,
      variant: "info" as const,
      trend: formatPercentage(dailySales.percentageChange),
      loading
    },
    {
      title: "Produits vendus",
      value: totalSales.productsSold.toString(),
      description: canViewRevenue 
        ? `${formatAmount(totalSales.amount)} de chiffre d'affaires total`
        : "Quantité de produits vendus ce mois",
      icon: TrendingUp,
      variant: "success" as const,
      loading
    },
    {
      title: "Total produits",
      value: totalProducts.count.toString(),
      description: "Produits en stock",
      icon: Package,
      variant: "default" as const,
      loading
    },
    {
      title: "Stock faible",
      value: lowStockProducts.count.toString(),
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
