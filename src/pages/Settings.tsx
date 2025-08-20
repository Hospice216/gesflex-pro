import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings, Store, Users, Bell, Shield, Palette, Database, Globe } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const { toast } = useToast()
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    lowStock: true,
    newSales: true
  })

  const [systemSettings, setSystemSettings] = useState({
    autoBackup: true,
    maintenanceMode: false,
    debugMode: false
  })

  const [taxRate, setTaxRate] = useState<string>("20")

  useEffect(() => {
    const loadTax = async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'sales.tax_rate')
        .maybeSingle()
      if (!error && data?.setting_value) {
        setTaxRate(String(data.setting_value))
      }
    }
    loadTax()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Settings className="w-7 h-7 text-primary" />
            Configuration
          </h1>
          <p className="text-muted-foreground">
            Gérez les paramètres de votre application
          </p>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="w-4 h-4" />
            Général
          </TabsTrigger>
          <TabsTrigger value="stores" className="gap-2">
            <Store className="w-4 h-4" />
            Magasins
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Database className="w-4 h-4" />
            Système
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                Informations générales
              </CardTitle>
              <CardDescription>Configuration de base de l'application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Nom de l'entreprise</Label>
                  <Input id="company-name" defaultValue="GesFlex Solutions" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business-type">Type d'activité</Label>
                  <Input id="business-type" defaultValue="Commerce de détail" />
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="currency">Devise par défaut</Label>
                  <Input id="currency" defaultValue="EUR - Euro" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Fuseau horaire</Label>
                  <Input id="timezone" defaultValue="Europe/Paris" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adresse principale</Label>
                <Input id="address" defaultValue="123 Rue de la République, 75001 Paris" />
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tax_rate">TVA (%)</Label>
                  <Input
                    id="tax_rate"
                    type="number"
                    step="0.01"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={async () => {
                      const value = parseFloat(taxRate)
                      if (isNaN(value) || value < 0 || value > 100) {
                        toast({ title: 'Valeur invalide', description: 'Entrez un pourcentage entre 0 et 100', variant: 'destructive' })
                        return
                      }
                      const { error } = await supabase
                        .from('system_settings')
                        .upsert({
                          setting_key: 'sales.tax_rate',
                          setting_value: String(value),
                          setting_type: 'number',
                          category: 'sales',
                          description: 'TVA %',
                          is_required: false,
                          is_public: true,
                        }, { onConflict: 'setting_key' })
                      if (error) {
                        toast({ title: 'Erreur', description: "Impossible d'enregistrer la TVA", variant: 'destructive' })
                      } else {
                        toast({ title: 'Enregistré', description: 'TVA mise à jour' })
                      }
                    }}
                  >
                    Enregistrer la TVA
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input id="phone" defaultValue="+33 1 23 45 67 89" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" defaultValue="contact@gesflex.com" />
                </div>
              </div>

              <Button>Enregistrer les modifications</Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                Apparence
              </CardTitle>
              <CardDescription>Personnalisez l'interface utilisateur</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Mode sombre</Label>
                  <p className="text-sm text-muted-foreground">Activer le thème sombre</p>
                </div>
                <Switch />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Sidebar compacte</Label>
                  <p className="text-sm text-muted-foreground">Réduire la taille de la barre latérale</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Store Settings */}
        <TabsContent value="stores" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" />
                Configuration des magasins
              </CardTitle>
              <CardDescription>Paramètres globaux pour tous les magasins</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Multi-magasins</Label>
                  <p className="text-sm text-muted-foreground">Activer la gestion multi-magasins</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Transferts automatiques</Label>
                  <p className="text-sm text-muted-foreground">Permettre les transferts automatiques entre magasins</p>
                </div>
                <Switch />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Horaires par défaut</Label>
                <div className="grid gap-2 md:grid-cols-2">
                  <Input placeholder="Heure d'ouverture" defaultValue="09:00" />
                  <Input placeholder="Heure de fermeture" defaultValue="19:00" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Settings */}
        <TabsContent value="users" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Gestion des utilisateurs
              </CardTitle>
              <CardDescription>Paramètres de sécurité et d'accès</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Inscription libre</Label>
                  <p className="text-sm text-muted-foreground">Permettre aux nouveaux utilisateurs de s'inscrire</p>
                </div>
                <Switch />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Validation des comptes</Label>
                  <p className="text-sm text-muted-foreground">Validation manuelle des nouveaux comptes</p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Authentification à deux facteurs</Label>
                  <p className="text-sm text-muted-foreground">Obligatoire pour les administrateurs</p>
                </div>
                <Switch />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Durée de session (minutes)</Label>
                <Input type="number" defaultValue="480" placeholder="480" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Notifications
              </CardTitle>
              <CardDescription>Configurez les alertes et notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Notifications par email</Label>
                  <p className="text-sm text-muted-foreground">Recevoir les alertes par email</p>
                </div>
                <Switch 
                  checked={notifications.email}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, email: checked }))}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Notifications push</Label>
                  <p className="text-sm text-muted-foreground">Alertes en temps réel dans l'application</p>
                </div>
                <Switch 
                  checked={notifications.push}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, push: checked }))}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Alertes de stock faible</Label>
                  <p className="text-sm text-muted-foreground">Notification quand un produit est en rupture</p>
                </div>
                <Switch 
                  checked={notifications.lowStock}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, lowStock: checked }))}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Nouvelles ventes</Label>
                  <p className="text-sm text-muted-foreground">Notification pour chaque nouvelle vente</p>
                </div>
                <Switch 
                  checked={notifications.newSales}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, newSales: checked }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Paramètres système
              </CardTitle>
              <CardDescription>Configuration technique de l'application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Sauvegarde automatique</Label>
                  <p className="text-sm text-muted-foreground">Sauvegarde quotidienne des données</p>
                </div>
                <Switch 
                  checked={systemSettings.autoBackup}
                  onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, autoBackup: checked }))}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Mode maintenance</Label>
                  <p className="text-sm text-muted-foreground">Désactiver l'accès utilisateur temporairement</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={systemSettings.maintenanceMode}
                    onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, maintenanceMode: checked }))}
                  />
                  {systemSettings.maintenanceMode && (
                    <Badge variant="destructive">Actif</Badge>
                  )}
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Mode debug</Label>
                  <p className="text-sm text-muted-foreground">Activer les logs détaillés pour le support</p>
                </div>
                <Switch 
                  checked={systemSettings.debugMode}
                  onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, debugMode: checked }))}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Actions système</Label>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" className="gap-2">
                    <Database className="w-4 h-4" />
                    Sauvegarder maintenant
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <Shield className="w-4 h-4" />
                    Vérifier intégrité
                  </Button>
                  <Button variant="destructive" className="gap-2">
                    <Database className="w-4 h-4" />
                    Réinitialiser cache
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle>Informations système</CardTitle>
              <CardDescription>État actuel de l'application</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Version de l'application</Label>
                  <p className="text-sm font-mono">v2.1.3</p>
                </div>
                <div className="space-y-2">
                  <Label>Dernière sauvegarde</Label>
                  <p className="text-sm">27/01/2025 à 03:00</p>
                </div>
                <div className="space-y-2">
                  <Label>Base de données</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-success text-success-foreground">En ligne</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Espace utilisé</Label>
                  <p className="text-sm">2.4 GB / 10 GB</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}