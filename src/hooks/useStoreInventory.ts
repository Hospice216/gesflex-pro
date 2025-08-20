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
    // ✅ CORRIGÉ : Requête directe au lieu de RPC
    let query = supabase
      .from('product_stores')
      .select(`
        product_id,
        current_stock,
        min_stock,
        max_stock,
        products!inner(
          id,
          name,
          sku,
          is_active,
          categories(name)
        )
      `)
      .eq('products.is_active', true)

    if (storeId && storeId !== 'all') {
      query = query.eq('store_id', storeId)
    }

    // Ajouter les filtres si fournis
    if (filters.category_id) {
      query = query.eq('products.categories.id', filters.category_id)
    }
    if (filters.stock_status) {
      switch (filters.stock_status) {
        case 'low_stock':
          query = query.lte('current_stock', 'min_stock')
          break
        case 'out_of_stock':
          query = query.eq('current_stock', 0)
          break
        case 'alert_stock':
          query = query.lte('current_stock', 'min_stock')
          break
      }
    }
    if (filters.search_term) {
      query = query.or(`products.name.ilike.%${filters.search_term}%,products.sku.ilike.%${filters.search_term}%`)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Erreur lors de la récupération de l'inventaire: ${error.message}`)
    }

    // Transformer les données
    return (data || []).map(item => ({
      product_id: item.product_id,
      product_name: item.products?.name || 'Produit inconnu',
      sku: item.products?.sku || 'SKU inconnu',
      current_stock: item.current_stock || 0,
      min_stock: item.min_stock || 0,
      max_stock: item.max_stock || 0,
      category_name: item.products?.categories?.name || 'Sans catégorie',
      unit_symbol: 'unité', // Valeur par défaut
      stock_status: (item.current_stock || 0) <= (item.min_stock || 0) ? 'low_stock' : 'normal_stock',
      alert_stock: item.min_stock || 0
    }))
  } catch (error: any) {
    console.error('Erreur fetchStoreInventory:', error)
    throw new Error(error.message || 'Erreur lors de la récupération de l\'inventaire')
  }
}

// Hook principal pour l'inventaire
export function useStoreInventory(storeId: string | undefined, filters: InventoryFilters = {}) {
  const { userProfile } = useAuth()
  
  return useQuery({
    queryKey: ['store-inventory', storeId, filters],
    queryFn: async () => {
      if (!storeId || storeId === 'all') {
        // Si pas de storeId, récupérer l'inventaire global
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
        
        if (error) throw error
        
        return data?.map(product => ({
          product_id: product.id,
          product_name: product.name,
          sku: product.sku,
          current_stock: product.current_stock || 0,
          min_stock: product.min_stock || 0,
          max_stock: product.max_stock || 0,
          category_name: product.category_name || 'Sans catégorie',
          unit_symbol: product.unit_symbol || 'unité',
          stock_status: product.current_stock <= (product.min_stock || 0) ? 'low_stock' : 'normal_stock',
          alert_stock: product.min_stock || 0
        })) || []
      }
      
      return fetchStoreInventory(storeId, filters)
    },
    enabled: !!userProfile,
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
      // ✅ CORRIGÉ : Requête directe au lieu de la vue
      const { data, error } = await supabase
        .from('product_stores')
        .select(`
          product_id,
          current_stock,
          min_stock,
          products!inner(
            id,
            name,
            sku,
            is_active
          )
        `)
        .eq('store_id', storeId)
        .eq('products.is_active', true)
        .lte('current_stock', 'min_stock')
        .order('current_stock', { ascending: true })

      if (error) {
        throw new Error(`Erreur lors de la récupération des produits en rupture: ${error.message}`)
      }

      // Transformer les données
      return (data || []).map(item => ({
        product_id: item.product_id,
        product_name: item.products?.name || 'Produit inconnu',
        sku: item.products?.sku || 'SKU inconnu',
        current_stock: item.current_stock || 0,
        min_stock: item.min_stock || 0,
        store_id: storeId
      }))
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
      // ✅ CORRIGÉ : Requête directe au lieu de la vue
      const { data, error } = await supabase
        .from('product_stores')
        .select(`
          current_stock,
          min_stock,
          products!inner(
            id,
            is_active
          )
        `)
        .eq('store_id', storeId)
        .eq('products.is_active', true)

      if (error) {
        throw new Error(`Erreur lors de la récupération des statistiques: ${error.message}`)
      }

      // Calculer les statistiques
      const stats = {
        total_products: data.length,
        total_stock: data.reduce((sum, item) => sum + (item.current_stock || 0), 0),
        low_stock_count: data.filter(item => (item.current_stock || 0) <= (item.min_stock || 0)).length,
        out_of_stock_count: data.filter(item => (item.current_stock || 0) === 0).length,
        alert_stock_count: data.filter(item => (item.current_stock || 0) <= (item.min_stock || 0)).length,
        expiring_soon_count: 0, // Pas de gestion d'expiration pour l'instant
        expired_count: 0,       // Pas de gestion d'expiration pour l'instant
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
