import { supabase } from "@/integrations/supabase/client"
import { UserProfile } from "@/integrations/supabase/types"

/**
 * Vérifie si un utilisateur peut accéder à un magasin spécifique
 */
export const canAccessStore = async (userId: string, storeId: string, userRole: string): Promise<boolean> => {
  try {
    // SuperAdmin et Admin ont accès à tous les magasins
    if (userRole === 'SuperAdmin' || userRole === 'Admin') {
      return true
    }

    // Manager et Vendeur doivent être assignés au magasin
    if (userRole === 'Manager' || userRole === 'Vendeur') {
      const { data, error } = await supabase
        .from("user_stores")
        .select("id")
        .eq("user_id", userId)
        .eq("store_id", storeId)
        .single()

      if (error) {
        console.error('Erreur vérification permissions magasin:', error)
        return false
      }

      return !!data
    }

    return false
  } catch (error) {
    console.error('Erreur vérification permissions magasin:', error)
    return false
  }
}

/**
 * Récupère la liste des magasins auxquels un utilisateur a accès (pour les opérations source)
 * - SuperAdmin/Admin : tous les magasins
 * - Manager/Vendeur : seulement leurs magasins assignés
 */
export const getUserAccessibleStores = async (userId: string, userRole: string): Promise<{ id: string; name: string }[]> => {
  try {
    let query = supabase
      .from("stores")
      .select("id, name")
      .eq("is_active", true)
      .order("name")

    // SuperAdmin et Admin voient tous les magasins
    if (userRole === 'SuperAdmin' || userRole === 'Admin') {
      const { data, error } = await query
      if (error) throw error
      return data || []
    }

    // Manager et Vendeur ne voient que leurs magasins assignés
    if (userRole === 'Manager' || userRole === 'Vendeur') {
      const { data: userStores, error: userStoresError } = await supabase
        .from("user_stores")
        .select("store_id")
        .eq("user_id", userId)

      if (userStoresError) throw userStoresError

      if (userStores && userStores.length > 0) {
        const storeIds = userStores.map(us => us.store_id)
        const { data, error } = await query.in("id", storeIds)
        if (error) throw error
        return data || []
      }

      return []
    }

    return []
  } catch (error) {
    console.error('Erreur récupération magasins accessibles:', error)
    return []
  }
}

/**
 * Récupère la liste de TOUS les magasins (pour les opérations destination)
 * - Tous les utilisateurs voient tous les magasins
 * - Utilisé pour les transferts, arrivages, etc.
 */
export const getAllStores = async (): Promise<{ id: string; name: string }[]> => {
  try {
    // ✅ CORRECTION : Requête simplifiée et robuste
    const { data, error } = await supabase
      .from("stores")
      .select("id, name")
      .eq("is_active", true)
      .order("name")

    if (error) {
      console.error('Erreur getAllStores:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Erreur getAllStores:', error)
    // ✅ CORRECTION : Retourner une liste vide en cas d'erreur
    return []
  }
}

/**
 * Vérifie si un utilisateur peut créer un transfert entre deux magasins
 */
export const canCreateTransfer = async (
  userId: string, 
  userRole: string, 
  sourceStoreId: string, 
  destinationStoreId: string
): Promise<{ canCreate: boolean; error?: string }> => {
  try {
    // Vérifier l'accès au magasin source (doit être assigné)
    const canAccessSource = await canAccessStore(userId, sourceStoreId, userRole)
    if (!canAccessSource) {
      return {
        canCreate: false,
        error: "Vous n'avez pas accès au magasin source. Vous devez être assigné à ce magasin pour transférer des produits."
      }
    }

    // ✅ CORRECTION : Le magasin destination peut être n'importe quel magasin
    // Pas besoin de vérifier l'accès au magasin destination pour les transferts
    // Cela permet aux managers de transférer vers tous les magasins

    // Vérifier que les magasins sont différents
    if (sourceStoreId === destinationStoreId) {
      return {
        canCreate: false,
        error: "Le magasin source et destination doivent être différents"
      }
    }

    return { canCreate: true }
  } catch (error) {
    console.error('Erreur vérification permissions transfert:', error)
    return {
      canCreate: false,
      error: "Erreur lors de la vérification des permissions"
    }
  }
}

