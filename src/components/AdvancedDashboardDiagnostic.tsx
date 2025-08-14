import React, { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle, Database, RefreshCw, Bug, Activity } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface DiagnosticResult {
  name: string
  status: 'success' | 'error' | 'warning' | 'info'
  message: string
  details?: any
  error?: string
}

export default function AdvancedDashboardDiagnostic() {
  const [results, setResults] = useState<DiagnosticResult[]>([])
  const [loading, setLoading] = useState(false)
  const [lastTest, setLastTest] = useState<Date | null>(null)
  const { user } = useAuth()

  const runDiagnostic = async () => {
    setLoading(true)
    setResults([])
    const newResults: DiagnosticResult[] = []

    try {
      // 1. Vérifier l'authentification
      if (!user) {
        newResults.push({
          name: 'Authentification',
          status: 'error',
          message: 'Utilisateur non connecté'
        })
      } else {
        newResults.push({
          name: 'Authentification',
          status: 'success',
          message: `Connecté en tant que ${user.email} (${user.role})`,
          details: { userId: user.id, role: user.role }
        })
      }

      // 2. Vérifier les magasins assignés
      if (user) {
        try {
          const { data: userStores, error: userStoresError } = await supabase
            .from('user_stores')
            .select('store_id')
            .eq('user_id', user.id)

          if (userStoresError) throw userStoresError

          newResults.push({
            name: 'Magasins assignés',
            status: 'success',
            message: `${userStores?.length || 0} magasin(s) assigné(s)`,
            details: { storeIds: userStores?.map(us => us.store_id) }
          })
        } catch (error) {
          newResults.push({
            name: 'Magasins assignés',
            status: 'error',
            message: 'Erreur lors de la récupération des magasins',
            error: error instanceof Error ? error.message : String(error)
          })
        }
      }

      // 3. Tester la vue low_stock_products_view
      try {
        const { data: lowStockData, error: lowStockError } = await supabase
          .from('low_stock_products_view')
          .select('*')
          .limit(5)

        if (lowStockError) throw lowStockError

        newResults.push({
          name: 'Vue low_stock_products_view',
          status: 'success',
          message: `${lowStockData?.length || 0} produit(s) en stock faible trouvé(s)`,
          details: { sampleData: lowStockData?.slice(0, 2) }
        })
      } catch (error) {
        newResults.push({
          name: 'Vue low_stock_products_view',
          status: 'error',
          message: 'Vue non accessible ou inexistante',
          error: error instanceof Error ? error.message : String(error)
        })
      }

      // 4. Tester la fonction get_store_inventory
      try {
        const { data: inventoryData, error: inventoryError } = await supabase
          .rpc('get_store_inventory')

        if (inventoryError) throw inventoryError

        newResults.push({
          name: 'Fonction get_store_inventory',
          status: 'success',
          message: `${inventoryData?.length || 0} produit(s) d\'inventaire trouvé(s)`,
          details: { sampleData: inventoryData?.slice(0, 2) }
        })
      } catch (error) {
        newResults.push({
          name: 'Fonction get_store_inventory',
          status: 'error',
          message: 'Fonction non accessible ou inexistante',
          error: error instanceof Error ? error.message : String(error)
        })
      }

      // 5. Tester les statistiques de vente
      try {
        const { data: salesStats, error: salesError } = await supabase
          .from('sales_stats_daily_view')
          .select('*')
          .limit(5)

        if (salesError) throw salesError

        newResults.push({
          name: 'Vue sales_stats_daily_view',
          status: 'success',
          message: `${salesStats?.length || 0} statistique(s) de vente trouvée(s)`,
          details: { sampleData: salesStats?.slice(0, 2) }
        })
      } catch (error) {
        newResults.push({
          name: 'Vue sales_stats_daily_view',
          status: 'error',
          message: 'Vue non accessible ou inexistante',
          error: error instanceof Error ? error.message : String(error)
        })
      }

      // 6. Tester la table product_stores (fallback)
      try {
        const { data: productStores, error: productStoresError } = await supabase
          .from('product_stores')
          .select(`
            products (id, name, sku, alert_stock),
            stores (name),
            current_stock
          `)
          .limit(5)

        if (productStoresError) throw productStoresError

        newResults.push({
          name: 'Table product_stores (fallback)',
          status: 'success',
          message: `${productStores?.length || 0} relation(s) produit-magasin trouvée(s)`,
          details: { sampleData: productStores?.slice(0, 2) }
        })
      } catch (error) {
        newResults.push({
          name: 'Table product_stores (fallback)',
          status: 'error',
          message: 'Table non accessible',
          error: error instanceof Error ? error.message : String(error)
        })
      }

      // 7. Vérifier les permissions RLS
      try {
        const { data: permissionsTest, error: permissionsError } = await supabase
          .from('stores')
          .select('id, name')
          .limit(1)

        if (permissionsError) throw permissionsError

        newResults.push({
          name: 'Permissions RLS',
          status: 'success',
          message: 'Accès aux magasins autorisé',
          details: { sampleStore: permissionsTest?.[0] }
        })
      } catch (error) {
        newResults.push({
          name: 'Permissions RLS',
          status: 'error',
          message: 'Problème de permissions RLS',
          error: error instanceof Error ? error.message : String(error)
        })
      }

    } catch (error) {
      newResults.push({
        name: 'Diagnostic général',
        status: 'error',
        message: 'Erreur lors du diagnostic',
        error: error instanceof Error ? error.message : String(error)
      })
    }

    setResults(newResults)
    setLastTest(new Date())
    setLoading(false)
  }

  const getStatusIcon = (result: DiagnosticResult) => {
    switch (result.status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-600" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      default:
        return <Activity className="w-5 h-5 text-blue-600" />
    }
  }

  const getStatusBadge = (result: DiagnosticResult) => {
    return (
      <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
        {result.status === 'success' ? '✅ OK' : '❌ Erreur'}
      </Badge>
    )
  }

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bug className="w-5 h-5" />
            <CardTitle>Diagnostic Avancé du Dashboard</CardTitle>
          </div>
          <Button onClick={runDiagnostic} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> 
            Diagnostic Complet
          </Button>
        </div>
        {lastTest && (
          <p className="text-sm text-muted-foreground">
            Dernier diagnostic: {lastTest.toLocaleString('fr-FR')}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {results.length === 0 && !loading && (
          <div className="text-center text-muted-foreground py-8">
            Cliquez sur "Diagnostic Complet" pour commencer l'analyse
          </div>
        )}
        
        {loading && (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p>Diagnostic en cours...</p>
          </div>
        )}

        {results.map((result, index) => (
          <div key={index} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {getStatusIcon(result)}
                <h4 className="font-medium">{result.name}</h4>
                {getStatusBadge(result)}
              </div>
            </div>
            
            <p className="text-sm mb-2">{result.message}</p>
            
            {result.error && (
              <div className="bg-red-50 p-3 rounded-lg mb-2">
                <p className="text-sm text-red-700 font-medium">Erreur détaillée:</p>
                <p className="text-xs text-red-600 font-mono">{result.error}</p>
              </div>
            )}
            
            {result.details && (
              <details className="bg-gray-50 p-3 rounded-lg">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                  Détails techniques
                </summary>
                <pre className="text-xs text-gray-600 overflow-x-auto">
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}

        {results.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Résumé du diagnostic :</h4>
            <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
              <div>
                <strong>Tests réussis:</strong> {results.filter(r => r.status === 'success').length}
              </div>
              <div>
                <strong>Tests échoués:</strong> {results.filter(r => r.status === 'error').length}
              </div>
            </div>
            
            {results.some(r => r.status === 'error') && (
              <div className="mt-3 p-3 bg-red-50 rounded-lg">
                <h5 className="font-medium text-red-900 mb-2">Actions recommandées :</h5>
                <ul className="text-sm text-red-800 space-y-1">
                  <li>• Exécutez le script SQL de correction dans Supabase</li>
                  <li>• Vérifiez que les vues et fonctions existent</li>
                  <li>• Contrôlez les permissions RLS</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
