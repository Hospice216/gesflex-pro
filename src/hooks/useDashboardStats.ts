import { useState, useEffect } from 'react'
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

  useEffect(() => {
    if (userProfile) {
      fetchDashboardStats()
    }
  }, [userProfile])

  const fetchDashboardStats = async () => {
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
  }

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
    return { data: uniqueProductIds.length }
  }

  const fetchLowStockProducts = async (storeIds: string[]) => {
    if (storeIds.length === 0) return { data: [] }

    const { data, error } = await supabase
      .from('product_stores')
      .select(`
        id,
        current_stock,
        min_stock,
        products (id, name, sku, alert_stock),
        stores (name)
      `)
      .in('store_id', storeIds)

    if (error) throw error

    const lowStockItems = data?.filter(item => {
      const product = Array.isArray(item.products) ? item.products[0] : item.products
      const alertStock = product?.alert_stock || item.min_stock || 10
      return item.current_stock <= alertStock
    }).map(item => {
      const product = Array.isArray(item.products) ? item.products[0] : item.products
      const store = Array.isArray(item.stores) ? item.stores[0] : item.stores
      return {
        id: item.id,
        name: product?.name || 'Produit inconnu',
        sku: product?.sku || 'SKU inconnu',
        current_stock: item.current_stock,
        alert_stock: product?.alert_stock || item.min_stock || 10,
        store_name: store?.name || 'Magasin inconnu'
      }
    }) || []

    return { data: lowStockItems }
  }

  const fetchRecentSales = async (userId: string) => {
    return await supabase
      .from('sales')
      .select(`
        id,
        sale_code,
        total_amount,
        customer_name,
        created_at,
        stores (name)
      `)
      .eq('sold_by', userId)
      .order('created_at', { ascending: false })
      .limit(5)
  }

  return stats
}
