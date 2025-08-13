import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Settings, Store, Database, Shield, AlertTriangle, Save, Zap, Bell, BarChart3, DollarSign } from "lucide-react"
import { useSystemSettings } from "@/hooks/useSystemSettings"
import { useAuth } from "@/contexts/AuthContext"

export default function Configuration() {
  const { user } = useAuth()
  const { 
    settings, 
    loading, 
    error, 
    hasEditPermissions,
    saveSetting, 
    saveAllSettings, 
    resetToDefaults 
  } = useSystemSettings()

  const handleSave = async () => {
    try {
      await saveAllSettings(settings)
    } catch (error) {
      // L'erreur est déjà gérée dans le hook
    }
  }

  const updateSetting = (key: keyof typeof settings, value: any) => {
    saveSetting(key, value)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement des configurations...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-4" />
          <p className="text-destructive mb-2">Erreur de chargement</p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Settings className="w-7 h-7 text-primary" />
            Configuration Système
          </h1>
          <p className="text-muted-foreground">
            Paramètres avancés du système GesFlex
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetToDefaults} disabled={!hasEditPermissions}>
            Réinitialiser
          </Button>
          <Button onClick={handleSave} size="touch" className="gap-2" disabled={!hasEditPermissions}>
            <Save className="w-4 h-4" />
            Sauvegarder
          </Button>
        </div>
      </div>

      {/* Avertissement si pas de permissions d'édition */}
      {!hasEditPermissions && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-800">Permissions limitées</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Vous pouvez consulter les configurations mais vous n'avez pas les permissions pour les modifier. 
                Seuls les utilisateurs Admin et SuperAdmin peuvent modifier les configurations système.
              </p>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="stores" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="stores">Multi-Magasins</TabsTrigger>
          <TabsTrigger value="system">Système</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="currency">Devise</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        {/* Multi-Magasins Settings */}
        <TabsContent value="stores" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5" />
                Configuration Multi-Magasins
              </CardTitle>
              <CardDescription>
                Paramètres globaux pour la gestion multi-magasins
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Transferts automatiques</Label>
                  <p className="text-sm text-muted-foreground">
                    Permettre les transferts automatiques entre magasins
                  </p>
                </div>
                <Switch
                  checked={settings.enableStoreTransfers}
                  onCheckedChange={(checked) => updateSetting('enableStoreTransfers', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Alertes stock globales</Label>
                  <p className="text-sm text-muted-foreground">
                    Alertes de stock faible pour tous les magasins
                  </p>
                </div>
                <Switch
                  checked={settings.globalStockAlerts}
                  onCheckedChange={(checked) => updateSetting('globalStockAlerts', checked)}
                />
              </div>

              {settings.globalStockAlerts && (
                <div>
                  <Label htmlFor="globalStockThreshold">Seuil global d'alerte stock</Label>
                  <Input
                    id="globalStockThreshold"
                    type="number"
                    value={settings.globalStockThreshold}
                    onChange={(e) => updateSetting('globalStockThreshold', parseInt(e.target.value))}
                    className="w-32"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Seuil minimum pour tous les magasins
                  </p>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="defaultOpeningTime">Heure d'ouverture par défaut</Label>
                  <Input
                    id="defaultOpeningTime"
                    type="time"
                    value={settings.defaultOpeningTime}
                    onChange={(e) => updateSetting('defaultOpeningTime', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="defaultClosingTime">Heure de fermeture par défaut</Label>
                  <Input
                    id="defaultClosingTime"
                    type="time"
                    value={settings.defaultClosingTime}
                    onChange={(e) => updateSetting('defaultClosingTime', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Paramètres Système
              </CardTitle>
              <CardDescription>
                Configuration technique et performance du système
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sauvegarde automatique</Label>
                  <p className="text-sm text-muted-foreground">
                    Sauvegarde quotidienne des données
                  </p>
                </div>
                <Switch
                  checked={settings.autoBackup}
                  onCheckedChange={(checked) => updateSetting('autoBackup', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Mode debug</Label>
                  <p className="text-sm text-muted-foreground">
                    Activer les logs détaillés pour le support
                  </p>
                </div>
                <Switch
                  checked={settings.debugMode}
                  onCheckedChange={(checked) => updateSetting('debugMode', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Analytics en temps réel</Label>
                  <p className="text-sm text-muted-foreground">
                    Afficher les données en temps réel
                  </p>
                </div>
                <Switch
                  checked={settings.enableRealTimeAnalytics}
                  onCheckedChange={(checked) => updateSetting('enableRealTimeAnalytics', checked)}
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

        {/* Performance Settings */}
        <TabsContent value="performance" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Paramètres de Performance
              </CardTitle>
              <CardDescription>
                Optimisation des performances et seuils de gamification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Gamification active</Label>
                  <p className="text-sm text-muted-foreground">
                    Activer le système de récompenses et points
                  </p>
                </div>
                <Switch
                  checked={settings.gamificationEnabled}
                  onCheckedChange={(checked) => updateSetting('gamificationEnabled', checked)}
                />
              </div>

              {settings.gamificationEnabled && (
                <>
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="salesTarget">Objectif de vente quotidien</Label>
                      <Input
                        id="salesTarget"
                        type="number"
                        value={settings.dailySalesTarget}
                        onChange={(e) => updateSetting('dailySalesTarget', parseFloat(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="performanceThreshold">Seuil de performance (%)</Label>
                      <Input
                        id="performanceThreshold"
                        type="number"
                        value={settings.performanceThreshold}
                        onChange={(e) => updateSetting('performanceThreshold', parseInt(e.target.value))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="pointsPerSale">Points par vente</Label>
                    <Input
                      id="pointsPerSale"
                      type="number"
                      value={settings.pointsPerSale}
                      onChange={(e) => updateSetting('pointsPerSale', parseInt(e.target.value))}
                      className="w-32"
                    />
                  </div>
                </>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Rapports automatiques</Label>
                  <p className="text-sm text-muted-foreground">
                    Générer automatiquement des rapports de performance
                  </p>
                </div>
                <Switch
                  checked={settings.autoGenerateReports}
                  onCheckedChange={(checked) => updateSetting('autoGenerateReports', checked)}
                />
              </div>

              {settings.autoGenerateReports && (
                <div>
                  <Label htmlFor="reportSchedule">Fréquence des rapports</Label>
                  <Select value={settings.reportSchedule} onValueChange={(value) => updateSetting('reportSchedule', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Quotidien</SelectItem>
                      <SelectItem value="weekly">Hebdomadaire</SelectItem>
                      <SelectItem value="monthly">Mensuel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Currency Settings */}
        <TabsContent value="currency" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Configuration de la Devise
              </CardTitle>
              <CardDescription>
                Paramètres de formatage monétaire pour l'application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="defaultCurrency">Devise par défaut</Label>
                  <Select value={settings.defaultCurrency} onValueChange={(value) => updateSetting('defaultCurrency', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="XOF">Franc CFA (XOF)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                      <SelectItem value="USD">Dollar US (USD)</SelectItem>
                      <SelectItem value="GBP">Livre Sterling (GBP)</SelectItem>
                      <SelectItem value="JPY">Yen Japonais (JPY)</SelectItem>
                      <SelectItem value="CNY">Yuan Chinois (CNY)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="currencySymbol">Symbole de la devise</Label>
                  <Input
                    id="currencySymbol"
                    value={settings.currencySymbol}
                    onChange={(e) => updateSetting('currencySymbol', e.target.value)}
                    placeholder="CFA, €, $, £"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currencyPosition">Position du symbole</Label>
                  <Select value={settings.currencyPosition} onValueChange={(value) => updateSetting('currencyPosition', value as 'before' | 'after')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="before">Avant le montant</SelectItem>
                      <SelectItem value="after">Après le montant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="decimalPlaces">Nombre de décimales</Label>
                  <Select value={settings.decimalPlaces.toString()} onValueChange={(value) => updateSetting('decimalPlaces', parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 (entiers)</SelectItem>
                      <SelectItem value="2">2 (cents)</SelectItem>
                      <SelectItem value="3">3 (millièmes)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="bg-muted/50 p-4 rounded-lg">
                <Label className="text-sm font-medium mb-2 block">Aperçu du formatage</Label>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Montant: 1234567</span>
                    <span className="font-mono">
                      {settings.currencyPosition === 'before' 
                        ? `${settings.currencySymbol} 1,234,567`
                        : `1,234,567 ${settings.currencySymbol}`
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Montant avec décimales: 1234.56</span>
                    <span className="font-mono">
                      {settings.currencyPosition === 'before' 
                        ? `${settings.currencySymbol} 1,234${settings.decimalPlaces > 0 ? '.56' : ''}`
                        : `1,234${settings.decimalPlaces > 0 ? '.56' : ''} ${settings.currencySymbol}`
                      }
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Settings */}
        <TabsContent value="maintenance" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Mode Maintenance
              </CardTitle>
              <CardDescription>
                Contrôle d'accès et maintenance du système
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Mode maintenance</Label>
                  <p className="text-sm text-muted-foreground">
                    Désactiver l'accès utilisateur temporairement
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.maintenanceMode}
                    onCheckedChange={(checked) => updateSetting('maintenanceMode', checked)}
                  />
                  {settings.maintenanceMode && (
                    <Badge variant="destructive">Actif</Badge>
                  )}
                </div>
              </div>

              {settings.maintenanceMode && (
                <div>
                  <Label htmlFor="maintenanceMessage">Message de maintenance</Label>
                  <Input
                    id="maintenanceMessage"
                    value={settings.maintenanceMessage}
                    onChange={(e) => updateSetting('maintenanceMessage', e.target.value)}
                    placeholder="Le système est en maintenance..."
                  />
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Accès administrateur uniquement</Label>
                  <p className="text-sm text-muted-foreground">
                    Restreindre l'accès aux administrateurs pendant la maintenance
                  </p>
                </div>
                <Switch
                  checked={settings.adminOnlyAccess}
                  onCheckedChange={(checked) => updateSetting('adminOnlyAccess', checked)}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Actions de maintenance</Label>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" className="gap-2">
                    <Database className="w-4 h-4" />
                    Optimiser base de données
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Nettoyer logs
                  </Button>
                  <Button variant="destructive" className="gap-2">
                    <Shield className="w-4 h-4" />
                    Redémarrer services
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button at bottom */}
      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg" className="gap-2">
          <Save className="w-4 h-4" />
          Sauvegarder tous les paramètres
        </Button>
      </div>
    </div>
  )
}