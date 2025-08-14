import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

interface DashboardStats {
  dailySales: {
    amount: number
    count: number
    percentageChange: number
  }
  totalSales: {
    amount: number
    count: number
    productsSold: number
  }
  totalProducts: {
    count: number
    lowStockCount: number
  }
  lowStockProducts: {
    count: number
    items: Array<{
      id: string
      name: string
      sku: string
      current_stock: number
      alert_stock: number
      store_name: string
    }>
  }
  recentSales: Array<{
    id: string
    sale_code: string
    total_amount: number
    customer_name: string
    created_at: string
    store_name: string
  }>
  loading: boolean
  error: string | null
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    dailySales: { amount: 0, count: 0, percentageChange: 0 },
    totalSales: { amount: 0, count: 0, productsSold: 0 },
    totalProducts: { count: 0, lowStockCount: 0 },
    lowStockProducts: { count: 0, items: [] },
    recentSales: [],
    loading: true,
    error: null
  })

  const { userProfile } = useAuth()

  // ✅ CORRECTION : Fonction fetchDashboardStats extraite et réutilisable
  const fetchDashboardStats = useCallback(async () => {
    try {
      setStats(prev => ({ ...prev, loading: true, error: null }))

      if (!userProfile?.id) {
        setStats(prev => ({ ...prev, loading: false }))
        return
      }

      // ✅ SOLUTION : Récupération des magasins utilisateur via user_stores
      const { data: userStores, error: userStoresError } = await supabase
        .from('user_stores')
        .select('store_id')
        .eq('user_id', userProfile.id)

      if (userStoresError) {
        throw new Error(`Erreur lors de la récupération des magasins: ${userStoresError.message}`)
      }

      const storeIds = userStores?.map(us => us.store_id) || []

      // ✅ SOLUTION : Requêtes parallèles pour améliorer les performances
      const [
        dailySalesResult,
        yesterdaySalesResult,
        monthlySalesResult,
        productsResult,
        lowStockResult,
        recentSalesResult
      ] = await Promise.all([
        fetchDailySales(userProfile.id),
        fetchYesterdaySales(userProfile.id),
        fetchMonthlySales(userProfile.id, storeIds),
        fetchProductsCount(storeIds),
        fetchLowStockProducts(storeIds),
        fetchRecentSales(userProfile.id)
      ])

      // ✅ CORRECTION : Validation des résultats avant traitement
      if (dailySalesResult.error) throw new Error(`Erreur ventes du jour: ${dailySalesResult.error.message}`)
      if (yesterdaySalesResult.error) throw new Error(`Erreur ventes hier: ${yesterdaySalesResult.error.message}`)
      if (monthlySalesResult.error) throw new Error(`Erreur ventes mensuelles: ${monthlySalesResult.error.message}`)
      if (productsResult.error) throw new Error(`Erreur comptage produits: ${productsResult.error.message}`)
      if (lowStockResult.error) throw new Error(`Erreur stock faible: ${lowStockResult.error.message}`)
      if (recentSalesResult.error) throw new Error(`Erreur ventes récentes: ${recentSalesResult.error.message}`)

      // ✅ SOLUTION : Calculs simplifiés et robustes
      const dailySales = dailySalesResult.data || []
      const yesterdaySales = yesterdaySalesResult.data || []
      const monthlySales = monthlySalesResult.data || []

      const dailyAmount = dailySales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
      const dailyCount = dailySales.length
      const yesterdayAmount = yesterdaySales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
      const percentageChange = yesterdayAmount > 0 ? ((dailyAmount - yesterdayAmount) / yesterdayAmount) * 100 : 0

      // ✅ SOLUTION : Calcul des produits vendus simplifié
      const totalProductsSold = monthlySales.reduce((sum, sale) => {
        return sum + (sale.sale_items?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0)
      }, 0)

      const totalAmount = monthlySales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
      const totalCount = monthlySales.length

      setStats({
        dailySales: { amount: dailyAmount, count: dailyCount, percentageChange },
        totalSales: { amount: totalAmount, count: totalCount, productsSold: totalProductsSold },
        totalProducts: { count: productsResult.data || 0, lowStockCount: lowStockResult.data?.length || 0 },
        lowStockProducts: { count: lowStockResult.data?.length || 0, items: lowStockResult.data || [] },
        recentSales: recentSalesResult.data || [],
        loading: false,
        error: null
      })

    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error)
      setStats(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }))
    }
  }, [userProfile])

  // ✅ NOUVEAU : Fonction refetch pour retry manuel
  const refetch = useCallback(() => {
    fetchDashboardStats()
  }, [fetchDashboardStats])

  useEffect(() => {
    if (userProfile) {
      fetchDashboardStats()
    }
  }, [userProfile, fetchDashboardStats])

  // ✅ SOLUTION : Fonctions de récupération séparées et réutilisables
  const fetchDailySales = async (userId: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return await supabase
      .from('sales')
      .select('total_amount, created_at')
      .eq('sold_by', userId)
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())
  }

  const fetchYesterdaySales = async (userId: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    return await supabase
      .from('sales')
      .select('total_amount')
      .eq('sold_by', userId)
      .gte('created_at', yesterday.toISOString())
      .lt('created_at', today.toISOString())
  }

  const fetchMonthlySales = async (userId: string, storeIds: string[]) => {
    const today = new Date()
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    let query = supabase
      .from('sales')
      .select(`
        total_amount,
        sale_items (quantity)
      `)
      .eq('sold_by', userId)
      .gte('created_at', firstDayOfMonth.toISOString())
      .lt('created_at', tomorrow.toISOString())

    if (storeIds.length > 0) {
      query = query.in('store_id', storeIds)
    }

    return await query
  }

  const fetchProductsCount = async (storeIds: string[]) => {
    if (storeIds.length === 0) return { data: 0 }

    const { data, error } = await supabase
      .from('product_stores')
      .select('product_id')
      .in('store_id', storeIds)

    if (error) throw error

    const uniqueProductIds = [...new Set(data?.map(ps => ps.product_id) || [])]
    return { data: uniqueProductIds.length, error: null }
  }

  const fetchLowStockProducts = async (storeIds: string[]) => {
    if (storeIds.length === 0) return { data: [] }

    // ✅ CORRECTION : Utiliser la vue PostgreSQL optimisée au lieu d'une requête complexe
    try {
      const { data, error } = await supabase
        .from('low_stock_products_view')
        .select('*')
        .in('store_id', storeIds)

      if (error) throw error

      // ✅ CORRECTION : Mapping des données depuis la vue
      const lowStockItems = data?.map(item => ({
        id: item.product_id,
        name: item.product_name,
        sku: item.product_sku,
        current_stock: item.current_stock,
        alert_stock: item.alert_stock,
        store_name: item.store_name
      })) || []

      return { data: lowStockItems, error: null }
    } catch (error) {
      // ✅ CORRECTION : Fallback vers la méthode originale si la vue n'existe pas
      console.warn('Vue low_stock_products_view non disponible, utilisation de la méthode alternative')
      
      const { data, error: fallbackError } = await supabase
        .from('product_stores')
        .select(`
          products (
            id, name, sku, alert_stock
          ),
          stores (name),
          current_stock
        `)
        .in('store_id', storeIds)

      if (fallbackError) throw fallbackError

      // ✅ CORRECTION : Filtrage côté client pour éviter l'erreur Supabase
      const lowStockItems = data?.filter(ps => {
        const product = Array.isArray(ps.products) ? ps.products[0] : ps.products
        return product && ps.current_stock < (product.alert_stock || 0)
      }).map(ps => {
        const product = Array.isArray(ps.products) ? ps.products[0] : ps.products
        const store = Array.isArray(ps.stores) ? ps.stores[0] : ps.stores
        
        return {
          id: product?.id,
          name: product?.name,
          sku: product?.sku,
          current_stock: ps.current_stock,
          alert_stock: product?.alert_stock,
          store_name: store?.name
        }
      }).filter(item => item.id) || []

      return { data: lowStockItems, error: null }
    }
  }

  const fetchRecentSales = async (userId: string) => {
    const { data, error } = await supabase
      .from('sales')
      .select(`
        id, sale_code, total_amount, customer_name, created_at,
        stores (name)
      `)
      .eq('sold_by', userId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) throw error

    // ✅ CORRECTION : Gestion correcte des relations Supabase
    const recentSales = data?.map(sale => {
      const store = Array.isArray(sale.stores) ? sale.stores[0] : sale.stores
      
      return {
        id: sale.id,
        sale_code: sale.sale_code,
        total_amount: sale.total_amount,
        customer_name: sale.customer_name,
        created_at: sale.created_at,
        store_name: store?.name
      }
    }) || []

    return { data: recentSales, error: null }
  }

  return {
    ...stats,
    refetch
  }
}
