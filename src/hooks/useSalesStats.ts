import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

// ✅ NOUVEAU : Hook optimisé pour les statistiques de ventes

export interface SalesStats {
  total_sales: number
  total_revenue: number
  average_sale_amount: number
  unique_customers: number
  unique_sellers: number
  top_selling_product: string
  top_selling_product_quantity: number
}

export interface DailySalesStats {
  sale_date: string
  store_id: string
  store_name: string
  total_sales: number
  unique_transactions: number
  total_revenue: number
  total_subtotal: number
  total_tax: number
  unique_sellers: number
  unique_customers: number
  average_sale_amount: number
  min_sale_amount: number
  max_sale_amount: number
}

export interface MonthlySalesStats {
  sale_month: string
  store_id: string
  store_name: string
  total_sales: number
  total_revenue: number
  unique_sellers: number
  unique_customers: number
  average_sale_amount: number
}

export type PeriodType =
  | 'day'
  | 'yesterday'
  | 'day_before_yesterday'
  | 'week'
  | 'month'
  | 'last3months'
  | 'year'
  | 'custom'

// Fonction pour récupérer les statistiques de vente d'un magasin
async function fetchStoreSalesStats(
  storeId: string,
  periodStart?: Date,
  periodEnd?: Date
): Promise<SalesStats> {
  try {
    // ✅ CORRIGÉ : Requête directe au lieu de RPC
    let query = supabase
      .from('sales')
      .select(`
        id,
        total_amount,
        customer_name,
        sold_by,
        created_at
      `)

    // Appliquer le filtre magasin uniquement si un storeId spécifique est fourni
    if (storeId && storeId !== 'all') {
      query = query.eq('store_id', storeId)
    }

    // Ajouter les filtres de période si fournis
    if (periodStart) {
      query = query.gte('created_at', periodStart.toISOString())
    }
    if (periodEnd) {
      query = query.lte('created_at', periodEnd.toISOString())
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Erreur lors de la récupération des statistiques: ${error.message}`)
    }

    if (!data || data.length === 0) {
      return {
        total_sales: 0,
        total_revenue: 0,
        average_sale_amount: 0,
        unique_customers: 0,
        unique_sellers: 0,
        top_selling_product: 'Aucun',
        top_selling_product_quantity: 0
      }
    }

    // Calculer les statistiques manuellement
    const totalSales = data.length
    const totalRevenue = data.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
    const averageSaleAmount = totalSales > 0 ? totalRevenue / totalSales : 0
    
    // Clients uniques
    const uniqueCustomers = new Set(data.map(sale => sale.customer_name).filter(Boolean)).size
    
    // Vendeurs uniques
    const uniqueSellers = new Set(data.map(sale => sale.sold_by).filter(Boolean)).size

    // Produit le plus vendu (approximation)
    const topSellingProduct = 'Calcul en cours...'
    const topSellingProductQuantity = 0

    return {
      total_sales: totalSales,
      total_revenue: totalRevenue,
      average_sale_amount: averageSaleAmount,
      unique_customers: uniqueCustomers,
      unique_sellers: uniqueSellers,
      top_selling_product: topSellingProduct,
      top_selling_product_quantity: topSellingProductQuantity
    }
  } catch (error: any) {
    console.error('Erreur fetchStoreSalesStats:', error)
    throw new Error(error.message || 'Erreur lors de la récupération des statistiques')
  }
}

// Fonction pour récupérer les statistiques quotidiennes
async function fetchDailySalesStats(
  storeId: string,
  days: number = 30
): Promise<DailySalesStats[]> {
  try {
    const { data, error } = await supabase
      .from('sales_stats_daily_view')
      .select('*')
      .eq('store_id', storeId)
      .gte('sale_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('sale_date', { ascending: false })

    if (error) {
      throw new Error(`Erreur lors de la récupération des statistiques quotidiennes: ${error.message}`)
    }

    return data || []
  } catch (error: any) {
    console.error('Erreur fetchDailySalesStats:', error)
    throw new Error(error.message || 'Erreur lors de la récupération des statistiques quotidiennes')
  }
}

// Fonction pour récupérer les statistiques mensuelles
async function fetchMonthlySalesStats(
  storeId: string,
  months: number = 12
): Promise<MonthlySalesStats[]> {
  try {
    const { data, error } = await supabase
      .from('sales_stats_monthly_view')
      .select('*')
      .eq('store_id', storeId)
      .gte('sale_month', new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('sale_month', { ascending: false })

    if (error) {
      throw new Error(`Erreur lors de la récupération des statistiques mensuelles: ${error.message}`)
    }

    return data || []
  } catch (error: any) {
    console.error('Erreur fetchMonthlySalesStats:', error)
    throw new Error(error.message || 'Erreur lors de la récupération des statistiques mensuelles')
  }
}

// Hook principal pour les statistiques de vente
export function useStoreSalesStats(
  storeId: string | undefined,
  periodStart?: Date,
  periodEnd?: Date
) {
  const { userProfile } = useAuth()
  
  return useQuery({
    queryKey: ['store-sales-stats', storeId, periodStart, periodEnd],
    queryFn: async () => {
      if (!storeId || storeId === 'all') {
        // Si pas de storeId, récupérer les stats globales
        const { data, error } = await supabase
          .from('sales')
          .select('total_amount, created_at, customer_name, sold_by')
          .gte('created_at', (periodStart ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).toISOString())
          .lte('created_at', (periodEnd ?? new Date()).toISOString())
        
        if (error) throw error
        
        const totalRevenue = data?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0
        const totalSales = data?.length || 0
        const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0
        const uniqueCustomers = new Set(data?.map(sale => sale.customer_name).filter(Boolean)).size
        
        return {
          total_sales: totalSales,
          total_revenue: totalRevenue,
          average_sale_amount: averageSale,
          unique_customers: uniqueCustomers,
          unique_sellers: 0,
          top_selling_product: 'N/A',
          top_selling_product_quantity: 0
        }
      }
      
      return fetchStoreSalesStats(storeId, periodStart, periodEnd)
    },
    enabled: !!userProfile,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,    // 5 minutes
    refetchOnWindowFocus: false,
    retry: 3,
  })
}

// Hook pour les statistiques quotidiennes
export function useDailySalesStats(storeId: string, days: number = 30) {
  const { userProfile } = useAuth()
  
  return useQuery({
    queryKey: ['daily-sales-stats', storeId, days],
    queryFn: () => fetchDailySalesStats(storeId, days),
    enabled: !!storeId && !!userProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    refetchOnWindowFocus: false,
    retry: 3,
  })
}

// Hook pour les statistiques mensuelles
export function useMonthlySalesStats(storeId: string, months: number = 12) {
  const { userProfile } = useAuth()
  
  return useQuery({
    queryKey: ['monthly-sales-stats', storeId, months],
    queryFn: () => fetchMonthlySalesStats(storeId, months),
    enabled: !!storeId && !!userProfile,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 20 * 60 * 1000,    // 20 minutes
    refetchOnWindowFocus: false,
    retry: 3,
  })
}

// Hook pour les statistiques par période
export function usePeriodSalesStats(
  storeId: string | undefined,
  period: PeriodType,
  customStart?: Date,
  customEnd?: Date
) {
  const { userProfile } = useAuth()
  
  const getPeriodDates = () => {
    const now = new Date()
    
    switch (period) {
      case 'day':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          end: now
        }
      case 'yesterday': {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        end.setMilliseconds(end.getMilliseconds() - 1)
        return { start, end }
      }
      case 'day_before_yesterday': {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2)
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        end.setMilliseconds(end.getMilliseconds() - 1)
        return { start, end }
      }
      case 'week':
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay())
        return { start: startOfWeek, end: now }
      case 'month':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: now
        }
      case 'last3months':
        return {
          start: new Date(now.getFullYear(), now.getMonth() - 2, 1),
          end: now
        }
      case 'year':
        return {
          start: new Date(now.getFullYear(), 0, 1),
          end: now
        }
      case 'custom':
        return {
          start: customStart || new Date(now.getFullYear(), now.getMonth(), 1),
          end: customEnd || now
        }
      default:
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: now
        }
    }
  }
  
  // Mémoïser les bornes de période pour éviter un changement à chaque rendu
  const { start, end } = useMemo(() => getPeriodDates(), [period, customStart, customEnd])
  const startIso = useMemo(() => start.toISOString(), [start])
  const endIso = useMemo(() => end.toISOString(), [end])
  
  return useQuery({
    queryKey: ['period-sales-stats', storeId, period, startIso, endIso],
    queryFn: async () => {
      // ✅ DEBUG : Log des paramètres
      console.log('🔍 usePeriodSalesStats - Paramètres:', {
        storeId,
        period,
        start: startIso,
        end: endIso,
        userId: userProfile?.id
      })
      
      // Toujours récupérer des données PERSONNELLES (peu importe le rôle)
      // Filtrer par sold_by = utilisateur connecté et, si fourni, par store_id
      // Essayer d'abord avec sold_at, puis fallback sur created_at
      let data: any[] | null = null
      let lastError: any = null

      const baseSelect = 'total_amount, customer_name, created_at, sold_at, sold_by, store_id'

      // sold_at
      {
        let q1 = supabase
          .from('sales')
          .select(baseSelect)
          .eq('sold_by', userProfile!.id)
          .gte('sold_at', startIso)
          .lte('sold_at', endIso)
        if (storeId && storeId !== 'all') q1 = q1.eq('store_id', storeId)
        const res1 = await q1
        if (!res1.error) {
          data = res1.data || []
        } else {
          lastError = res1.error
        }
      }

      // created_at (fallback)
      if (!data || data.length === 0) {
        let q2 = supabase
          .from('sales')
          .select(baseSelect)
          .eq('sold_by', userProfile!.id)
          .gte('created_at', startIso)
          .lte('created_at', endIso)
        if (storeId && storeId !== 'all') q2 = q2.eq('store_id', storeId)
        const res2 = await q2
        if (!res2.error) {
          data = res2.data || []
        } else {
          lastError = lastError || res2.error
        }
      }

      if (!data && lastError) throw lastError

      const totalRevenue = (data || [])
        .reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0
      const totalSales = data?.length || 0
      const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0
      const uniqueCustomers = new Set(data?.map(sale => sale.customer_name).filter(Boolean)).size

      const result = {
        total_sales: totalSales,
        total_revenue: totalRevenue,
        average_sale_amount: averageSale,
        unique_customers: uniqueCustomers
      }

      // ✅ DEBUG : Log des résultats
      console.log('🔍 usePeriodSalesStats - Résultats:', {
        dataLength: data?.length || 0,
        result,
        hasData: !!data && data.length > 0
      })

      return result
    },
    enabled: !!userProfile,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,    // 5 minutes
    refetchOnWindowFocus: false,
    retry: 3,
  })
}

// Hook pour les meilleures ventes
export function useTopSellingProducts(
  storeId: string | undefined,
  limit: number = 10,
  periodStart?: Date,
  periodEnd?: Date
) {
  const { userProfile } = useAuth()
  
  return useQuery({
    queryKey: ['top-selling-products', storeId, limit, periodStart?.toISOString(), periodEnd?.toISOString()],
    queryFn: async () => {
      if (!storeId || storeId === 'all') {
        // Si pas de storeId, récupérer les meilleures ventes globales
        const { data, error } = await supabase
          .from('sale_items')
          .select(`
            product_id,
            product_name,
            product_sku,
            quantity,
            total_price
          `)
          .gte('created_at', (periodStart ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).toISOString())
          .lte('created_at', (periodEnd ?? new Date()).toISOString())
          .order('quantity', { ascending: false })
          .limit(limit)

        if (error) {
          throw new Error(`Erreur lors de la récupération des meilleures ventes: ${error.message}`)
        }

        // Agréger par produit
        const aggregated = data?.reduce((acc, item) => {
          const existing = acc.find(p => p.product_id === item.product_id)
          if (existing) {
            existing.total_quantity += item.quantity
            existing.total_revenue += item.total_price
          } else {
            acc.push({
              product_id: item.product_id,
              product_name: item.product_name,
              product_sku: item.product_sku,
              total_quantity: item.quantity,
              total_revenue: item.total_price
            })
          }
          return acc
        }, [] as any[]) || []

        return aggregated.sort((a, b) => b.total_quantity - a.total_quantity)
      }

      const { data, error } = await supabase
        .from('sale_items')
        .select(`
          product_id,
          product_name,
          product_sku,
          quantity,
          total_price,
          sales!inner(store_id, sold_at)
        `)
        .eq('sales.store_id', storeId)
        .gte('sales.sold_at', (periodStart ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).toISOString())
        .lte('sales.sold_at', (periodEnd ?? new Date()).toISOString())
        .order('quantity', { ascending: false })
        .limit(limit)

      if (error) {
        throw new Error(`Erreur lors de la récupération des meilleures ventes: ${error.message}`)
      }

      // Agréger par produit
      const aggregated = data?.reduce((acc, item) => {
        const existing = acc.find(p => p.product_id === item.product_id)
        if (existing) {
          existing.total_quantity += item.quantity
          existing.total_revenue += item.total_price
        } else {
          acc.push({
            product_id: item.product_id,
            product_name: item.product_name,
            product_sku: item.product_sku,
            total_quantity: item.quantity,
            total_revenue: item.total_price
          })
        }
        return acc
      }, [] as any[]) || []

      return aggregated.sort((a, b) => b.total_quantity - a.total_quantity)
    },
    enabled: !!userProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    refetchOnWindowFocus: false,
    retry: 3,
  })
}

// Hook pour les statistiques de performance des vendeurs
export function useSellerPerformance(storeId: string, period: PeriodType = 'month') {
  const { userProfile } = useAuth()
  
  return useQuery({
    queryKey: ['seller-performance', storeId, period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          sold_by,
          total_amount,
          sold_at,
          users!inner(first_name, last_name)
        `)
        .eq('store_id', storeId)
        .gte('sold_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      if (error) {
        throw new Error(`Erreur lors de la récupération des performances: ${error.message}`)
      }

      // Agréger par vendeur
      const performance = data?.reduce((acc, sale) => {
        const sellerId = sale.sold_by
        const existing = acc.find(p => p.seller_id === sellerId)
        
        if (existing) {
          existing.total_sales += 1
          existing.total_revenue += sale.total_amount
          existing.sales_count += 1
        } else {
          acc.push({
            seller_id: sellerId,
            seller_name: `${sale.users.first_name} ${sale.users.last_name}`,
            total_sales: 1,
            total_revenue: sale.total_amount,
            sales_count: 1
          })
        }
        return acc
      }, [] as any[]) || []

      return performance
        .map(p => ({
          ...p,
          average_sale: p.total_revenue / p.sales_count
        }))
        .sort((a, b) => b.total_revenue - a.total_revenue)
    },
    enabled: !!storeId && !!userProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    refetchOnWindowFocus: false,
    retry: 3,
  })
}
