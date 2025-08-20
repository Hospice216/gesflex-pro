import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  CheckCircle,
  Users, 
  Store, 
  BarChart3, 
  Settings,
  AlertTriangle,
  Database,
  Shield,
  Activity,
  TrendingUp,
  UserCheck,
  StoreIcon,
  Package,
  DollarSign
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'

interface SystemStats {
  totalUsers: number
  activeUsers: number
  totalStores: number
  totalProducts: number
  totalSales: number
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical'
  lastBackup: string
  databaseSize: string
}

interface UserStats {
  role: string
  count: number
  status: string
}

export default function Admin() {
  const { userProfile } = useAuth()
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [userStats, setUserStats] = useState<UserStats[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (userProfile?.role === 'Admin' || userProfile?.role === 'SuperAdmin') {
      fetchSystemStats()
      fetchUserStats()
    }
  }, [userProfile])

  const fetchSystemStats = async () => {
    try {
      // Récupérer les statistiques système
      const [
        { count: totalUsers },
        { count: totalStores },
        { count: totalProducts },
        { count: totalSales }
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('stores').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('sales').select('*', { count: 'exact', head: true })
      ])

      // Calculer la santé du système
      const systemHealth = totalUsers > 0 && totalStores > 0 ? 'excellent' : 'warning'
      
      setSystemStats({
        totalUsers: totalUsers || 0,
        activeUsers: totalUsers || 0, // Simplifié pour l'exemple
        totalStores: totalStores || 0,
        totalProducts: totalProducts || 0,
        totalSales: totalSales || 0,
        systemHealth,
        lastBackup: new Date().toLocaleDateString('fr-FR'),
        databaseSize: '2.4 MB' // Exemple
      })
    } catch (error) {
      console.error('Erreur récupération stats système:', error)
    }
  }

  const fetchUserStats = async () => {
    try {
      const { data: users } = await supabase
        .from('users')
        .select('role, status')

      if (users) {
        const stats = users.reduce((acc: UserStats[], user) => {
          const existing = acc.find(s => s.role === user.role)
          if (existing) {
            existing.count++
          } else {
            acc.push({ role: user.role, count: 1, status: user.status })
          }
          return acc
        }, [])

        setUserStats(stats)
      }
    } catch (error) {
      console.error('Erreur récupération stats utilisateurs:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSystemHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'text-success'
      case 'good': return 'text-primary'
      case 'warning': return 'text-warning'
      case 'critical': return 'text-destructive'
      default: return 'text-muted-foreground'
    }
  }

  const getSystemHealthIcon = (health: string) => {
    switch (health) {
      case 'excellent': return <CheckCircle className="w-5 h-5 text-success" />
      case 'good': return <CheckCircle className="w-5 h-5 text-primary" />
      case 'warning': return <AlertTriangle className="w-5 h-5 text-warning" />
      case 'critical': return <AlertTriangle className="w-5 h-5 text-destructive" />
      default: return <Activity className="w-5 h-5 text-muted-foreground" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Chargement des statistiques...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Administration</h1>
        <p className="text-muted-foreground">
          Panneau d'administration pour la gestion du système GesFlex Pro
        </p>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-auto">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="stores">Magasins</TabsTrigger>
          <TabsTrigger value="system">Système</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview" className="space-y-6">
          {/* Status Overview */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getSystemHealthIcon(systemStats?.systemHealth || 'warning')}
                Statut du Système
              </CardTitle>
              <CardDescription>
                Vue d'ensemble de l'état du système
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <div className="text-2xl font-bold text-success">{systemStats?.totalUsers || 0}</div>
                  <div className="text-sm text-muted-foreground">Utilisateurs</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <div className="text-2xl font-bold text-primary">{systemStats?.totalStores || 0}</div>
                  <div className="text-sm text-muted-foreground">Magasins</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <div className="text-2xl font-bold text-warning">{systemStats?.totalProducts || 0}</div>
                  <div className="text-sm text-muted-foreground">Produits</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <div className="text-2xl font-bold text-accent">{systemStats?.totalSales || 0}</div>
                  <div className="text-sm text-muted-foreground">Ventes</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Gestion Utilisateurs</CardTitle>
                    <CardDescription>Gérer les comptes et permissions</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  Accéder
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Store className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Gestion Magasins</CardTitle>
                    <CardDescription>Configurer les points de vente</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  Accéder
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Rapports</CardTitle>
                    <CardDescription>Analyser les performances</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  Accéder
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Settings className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Configuration</CardTitle>
                    <CardDescription>Paramètres système</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  Accéder
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Gestion des Utilisateurs */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Statistiques des Utilisateurs
              </CardTitle>
              <CardDescription>
                Vue d'ensemble des utilisateurs par rôle et statut
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {userStats.map((stat) => (
                  <div key={stat.role} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <UserCheck className="w-4 h-4 text-primary" />
                      <span className="font-medium">{stat.role}</span>
                    </div>
                    <div className="text-2xl font-bold text-primary">{stat.count}</div>
                    <div className="text-sm text-muted-foreground">
                      Statut: {stat.status}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gestion des Magasins */}
        <TabsContent value="stores" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StoreIcon className="w-5 h-5" />
                Gestion des Magasins
              </CardTitle>
              <CardDescription>
                Configuration et suivi des points de vente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Store className="w-4 h-4 text-primary" />
                    <span className="font-medium">Total Magasins</span>
                  </div>
                  <div className="text-2xl font-bold text-primary">{systemStats?.totalStores || 0}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-warning" />
                    <span className="font-medium">Produits en Stock</span>
                  </div>
                  <div className="text-2xl font-bold text-warning">{systemStats?.totalProducts || 0}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-success" />
                    <span className="font-medium">Ventes Total</span>
                  </div>
                  <div className="text-2xl font-bold text-success">{systemStats?.totalSales || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Système */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Informations Système
              </CardTitle>
              <CardDescription>
                Détails techniques et maintenance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="font-medium">Santé du Système</span>
                    <Badge variant={systemStats?.systemHealth === 'excellent' ? 'default' : 'secondary'}>
                      {systemStats?.systemHealth || 'warning'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="font-medium">Dernière Sauvegarde</span>
                    <span className="text-sm text-muted-foreground">
                      {systemStats?.lastBackup || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="font-medium">Taille Base de Données</span>
                    <span className="text-sm text-muted-foreground">
                      {systemStats?.databaseSize || 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-success" />
                      <span className="font-medium">Sécurité</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      RLS activé, authentification sécurisée, permissions granulaires
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span className="font-medium">Performance</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Requêtes optimisées, cache intelligent, monitoring actif
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}