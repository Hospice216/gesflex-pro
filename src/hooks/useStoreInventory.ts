import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

// ✅ NOUVEAU : Hook optimisé pour l'inventaire des magasins

export interface InventoryItem {
  product_id: string
  product_name: string
  sku: string
  current_stock: number
  min_stock: number
  max_stock: number
  category_name: string
  unit_symbol: string
  stock_status: 'low_stock' | 'out_of_stock' | 'alert_stock' | 'normal_stock'
  alert_stock: number
}

export interface InventoryFilters {
  category_id?: string
  stock_status?: string
  search_term?: string
}

// Fonction pour récupérer l'inventaire d'un magasin avec filtres
async function fetchStoreInventory(
  storeId: string, 
  filters: InventoryFilters = {}
): Promise<InventoryItem[]> {
  try {
    // Utiliser la nouvelle fonction PostgreSQL optimisée
    const { data, error } = await supabase
      .rpc('get_store_inventory', {
        store_uuid: storeId,
        category_filter: filters.category_id || null,
        stock_status_filter: filters.stock_status || null,
        search_term: filters.search_term || null
      })

    if (error) {
      throw new Error(`Erreur lors de la récupération de l'inventaire: ${error.message}`)
    }

    return data || []
  } catch (error: any) {
    console.error('Erreur fetchStoreInventory:', error)
    throw new Error(error.message || 'Erreur lors de la récupération de l\'inventaire')
  }
}

// Hook principal pour l'inventaire
export function useStoreInventory(storeId: string, filters: InventoryFilters = {}) {
  const { userProfile } = useAuth()
  
  return useQuery({
    queryKey: ['store-inventory', storeId, filters],
    queryFn: () => fetchStoreInventory(storeId, filters),
    enabled: !!storeId && !!userProfile,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,    // 5 minutes
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

// Hook pour les produits en rupture de stock
export function useLowStockProducts(storeId: string) {
  const { userProfile } = useAuth()
  
  return useQuery({
    queryKey: ['low-stock-products', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('low_stock_products_view')
        .select('*')
        .eq('store_id', storeId)
        .order('current_stock', { ascending: true })

      if (error) {
        throw new Error(`Erreur lors de la récupération des produits en rupture: ${error.message}`)
      }

      return data || []
    },
    enabled: !!storeId && !!userProfile,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 3 * 60 * 1000,    // 3 minutes
    refetchOnWindowFocus: false,
    retry: 3,
  })
}

// Hook pour mettre à jour le stock d'un produit
export function useUpdateStock() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      productId, 
      storeId, 
      newStock, 
      reason 
    }: { 
      productId: string
      storeId: string
      newStock: number
      reason: string
    }) => {
      const { error } = await supabase
        .from('product_stores')
        .update({ 
          current_stock: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('product_id', productId)
        .eq('store_id', storeId)

      if (error) {
        throw new Error(`Erreur lors de la mise à jour du stock: ${error.message}`)
      }

      return { productId, storeId, newStock }
    },
    onSuccess: (data) => {
      // Invalider les caches liés à l'inventaire
      queryClient.invalidateQueries({ 
        queryKey: ['store-inventory', data.storeId] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['low-stock-products', data.storeId] 
      })
      
      toast.success(`Stock mis à jour: ${data.newStock} unités`)
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`)
    }
  })
}

// Hook pour les statistiques d'inventaire
export function useInventoryStats(storeId: string) {
  const { userProfile } = useAuth()
  
  return useQuery({
    queryKey: ['inventory-stats', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_inventory_view')
        .select('current_stock, stock_status, expiration_status')
        .eq('store_id', storeId)

      if (error) {
        throw new Error(`Erreur lors de la récupération des statistiques: ${error.message}`)
      }

      // Calculer les statistiques
      const stats = {
        total_products: data.length,
        total_stock: data.reduce((sum, item) => sum + (item.current_stock || 0), 0),
        low_stock_count: data.filter(item => item.stock_status === 'low_stock').length,
        out_of_stock_count: data.filter(item => item.stock_status === 'out_of_stock').length,
        alert_stock_count: data.filter(item => item.stock_status === 'alert_stock').length,
        expiring_soon_count: data.filter(item => item.expiration_status === 'expiring_soon').length,
        expired_count: data.filter(item => item.expiration_status === 'expired').length,
      }

      return stats
    },
    enabled: !!storeId && !!userProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    refetchOnWindowFocus: false,
    retry: 3,
  })
}

// Hook pour la recherche d'inventaire
export function useInventorySearch(storeId: string, searchTerm: string) {
  const { userProfile } = useAuth()
  
  return useQuery({
    queryKey: ['inventory-search', storeId, searchTerm],
    queryFn: () => fetchStoreInventory(storeId, { search_term: searchTerm }),
    enabled: !!storeId && !!userProfile && searchTerm.length >= 2,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 3 * 60 * 1000,    // 3 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  })
}
