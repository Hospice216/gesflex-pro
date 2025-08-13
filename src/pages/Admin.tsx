import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle,
  Users, 
  Store, 
  BarChart3, 
  Settings
} from 'lucide-react'

export default function Admin() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Administration</h1>
        <p className="text-muted-foreground">
          Panneau d'administration pour la gestion du système GesFlex Pro
        </p>
      </div>

      {/* Status Overview */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success" />
            Statut du Système
          </CardTitle>
          <CardDescription>
            Vue d'ensemble de l'état du système
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-success">7</div>
              <div className="text-sm text-muted-foreground">Modules Actifs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">100%</div>
              <div className="text-sm text-muted-foreground">Disponibilité</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">0</div>
              <div className="text-sm text-muted-foreground">Alertes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">OK</div>
              <div className="text-sm text-muted-foreground">Statut</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Modules */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Gestion des Utilisateurs</CardTitle>
                <CardDescription>Gérer les comptes et permissions</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Store className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Gestion des Magasins</CardTitle>
                <CardDescription>Configurer les points de vente</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Rapports & Analytics</CardTitle>
                <CardDescription>Analyser les performances</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
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
        </Card>
      </div>
    </div>
  )
}