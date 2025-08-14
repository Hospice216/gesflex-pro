import React, { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle, Database, RefreshCw } from 'lucide-react'

interface ViewStatus {
  name: string
  exists: boolean
  error?: string
  recordCount?: number
}

export default function DatabaseViewsTest() {
  const [viewsStatus, setViewsStatus] = useState<ViewStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [lastTest, setLastTest] = useState<Date | null>(null)

  const testViews = async () => {
    setLoading(true)
    const results: ViewStatus[] = []

    try {
      // Test 1: Vérifier si low_stock_products_view existe
      try {
        const { data, error } = await supabase
          .from('low_stock_products_view')
          .select('*')
          .limit(1)

        if (error) {
          results.push({
            name: 'low_stock_products_view',
            exists: false,
            error: error.message
          })
        } else {
          results.push({
            name: 'low_stock_products_view',
            exists: true,
            recordCount: data?.length || 0
          })
        }
      } catch (err) {
        results.push({
          name: 'low_stock_products_view',
          exists: false,
          error: err instanceof Error ? err.message : 'Erreur inconnue'
        })
      }

      // Test 2: Vérifier si sales_stats_daily_view existe
      try {
        const { data, error } = await supabase
          .from('sales_stats_daily_view')
          .select('*')
          .limit(1)

        if (error) {
          results.push({
            name: 'sales_stats_daily_view',
            exists: false,
            error: error.message
          })
        } else {
          results.push({
            name: 'sales_stats_daily_view',
            exists: true,
            recordCount: data?.length || 0
          })
        }
      } catch (err) {
        results.push({
          name: 'sales_stats_daily_view',
          exists: false,
          error: err instanceof Error ? err.message : 'Erreur inconnue'
        })
      }

      // Test 3: Vérifier la fonction get_store_inventory
      try {
        const { data, error } = await supabase
          .rpc('get_store_inventory', { store_id_filter: null, stock_status_filter: null })

        if (error) {
          results.push({
            name: 'get_store_inventory (fonction)',
            exists: false,
            error: error.message
          })
        } else {
          results.push({
            name: 'get_store_inventory (fonction)',
            exists: true,
            recordCount: data?.length || 0
          })
        }
      } catch (err) {
        results.push({
          name: 'get_store_inventory (fonction)',
          exists: false,
          error: err instanceof Error ? err.message : 'Erreur inconnue'
        })
      }

      // Test 4: Vérifier la table product_stores (fallback)
      try {
        const { data, error } = await supabase
          .from('product_stores')
          .select(`
            products (id, name, sku, alert_stock),
            stores (name),
            current_stock
          `)
          .limit(1)

        if (error) {
          results.push({
            name: 'product_stores (fallback)',
            exists: false,
            error: error.message
          })
        } else {
          results.push({
            name: 'product_stores (fallback)',
            exists: true,
            recordCount: data?.length || 0
          })
        }
      } catch (err) {
        results.push({
          name: 'product_stores (fallback)',
          exists: false,
          error: err instanceof Error ? err.message : 'Erreur inconnue'
        })
      }

    } catch (err) {
      console.error('Erreur lors du test des vues:', err)
    } finally {
      setLoading(false)
      setLastTest(new Date())
    }

    setViewsStatus(results)
  }

  useEffect(() => {
    testViews()
  }, [])

  const getStatusIcon = (status: ViewStatus) => {
    if (status.exists) {
      return <CheckCircle className="w-5 h-5 text-green-600" />
    }
    return <AlertTriangle className="w-5 h-5 text-red-600" />
  }

  const getStatusBadge = (status: ViewStatus) => {
    if (status.exists) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Disponible</Badge>
    }
    return <Badge variant="destructive">Non disponible</Badge>
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            <CardTitle>Test des Vues PostgreSQL</CardTitle>
          </div>
          <Button
            onClick={testViews}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Tester
          </Button>
        </div>
        {lastTest && (
          <p className="text-sm text-muted-foreground">
            Dernier test: {lastTest.toLocaleString('fr-FR')}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {viewsStatus.map((status, index) => (
          <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {getStatusIcon(status)}
              <div>
                <h4 className="font-medium">{status.name}</h4>
                {status.error && (
                  <p className="text-sm text-red-600 mt-1">{status.error}</p>
                )}
                {status.recordCount !== undefined && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {status.recordCount} enregistrement(s) trouvé(s)
                  </p>
                )}
              </div>
            </div>
            {getStatusBadge(status)}
          </div>
        ))}

        {viewsStatus.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Instructions de résolution :</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Si les vues ne sont pas disponibles, exécutez le script SQL dans votre base de données Supabase</li>
              <li>• Vérifiez que les permissions RLS sont correctement configurées</li>
              <li>• Assurez-vous que toutes les tables référencées existent</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
