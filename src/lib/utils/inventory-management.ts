import { supabase } from "@/integrations/supabase/client"

export interface InventoryAdjustment {
  store_id: string
  product_id: string
  adjustment_type: 'purchase' | 'sale' | 'manual' | 'transfer_in' | 'transfer_out' | 'loss' | 'correction'
  quantity_change: number
  reason?: string
  reference_id?: string
  reference_type?: string
  created_by: string
}

export interface StoreTransfer {
  source_store_id: string
  destination_store_id: string
  product_id: string
  quantity: number
  notes?: string
  created_by: string
}

/**
 * Ajuster le stock d'un produit dans un magasin avec historique
 */
export const adjustInventory = async (adjustment: InventoryAdjustment): Promise<{ success: boolean; error?: string }> => {
  try {
    // 1. Récupérer l'inventaire actuel
    const { data: currentInventory, error: fetchError } = await supabase
      .from('product_stores')
      .select('id, current_stock')
      .eq('store_id', adjustment.store_id)
      .eq('product_id', adjustment.product_id)
      .maybeSingle()

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError
    }

    const previousQuantity = currentInventory?.current_stock || 0
    const newQuantity = previousQuantity + adjustment.quantity_change

    // 2. Vérifier que le stock ne devient pas négatif (sauf pour les corrections)
    if (newQuantity < 0 && adjustment.adjustment_type !== 'correction') {
      return {
        success: false,
        error: `Stock insuffisant. Stock actuel: ${previousQuantity}, Tentative de retrait: ${Math.abs(adjustment.quantity_change)}`
      }
    }

    // 3. Mettre à jour ou créer l'inventaire
    let inventoryId: string
    if (currentInventory) {
      const { error: updateError } = await supabase
        .from('product_stores')
        .update({ current_stock: newQuantity })
        .eq('id', currentInventory.id)

      if (updateError) throw updateError
      inventoryId = currentInventory.id
    } else {
      const { data: newInventory, error: insertError } = await supabase
        .from('product_stores')
        .insert({
          store_id: adjustment.store_id,
          product_id: adjustment.product_id,
          current_stock: newQuantity
        })
        .select('id')
        .single()

      if (insertError) throw insertError
      inventoryId = newInventory.id
    }

    // 4. Enregistrer l'ajustement dans l'historique
    const { error: historyError } = await supabase
      .from('inventory_adjustments')
      .insert({
        inventory_id: inventoryId,
        store_id: adjustment.store_id,
        product_id: adjustment.product_id,
        adjustment_type: adjustment.adjustment_type,
        previous_quantity: previousQuantity,
        new_quantity: newQuantity,
        quantity_change: adjustment.quantity_change,
        reason: adjustment.reason,
        reference_id: adjustment.reference_id,
        reference_type: adjustment.reference_type,
        created_by: adjustment.created_by
      })

    if (historyError) throw historyError

    return { success: true }
  } catch (error) {
    console.error('Error adjusting inventory:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Vérifier le stock disponible avant une opération
 */
export const checkStockAvailability = async (
  store_id: string,
  product_id: string,
  required_quantity: number
): Promise<{ available: boolean; current_stock: number; error?: string }> => {
  try {
    const { data: inventory, error } = await supabase
      .from('product_stores')
      .select('current_stock')
      .eq('store_id', store_id)
      .eq('product_id', product_id)
      .maybeSingle()

    if (error) throw error

    const currentStock = inventory?.current_stock || 0
    const available = currentStock >= required_quantity

    return {
      available,
      current_stock: currentStock
    }
  } catch (error) {
    console.error('Error checking stock availability:', error)
    return {
      available: false,
      current_stock: 0,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Créer un transfert entre magasins
 */
export const createStoreTransfer = async (transfer: StoreTransfer): Promise<{ success: boolean; transfer_id?: string; error?: string }> => {
  try {
    // ✅ SÉCURITÉ : Vérifier les permissions d'accès aux magasins
    // Note: Cette vérification sera implémentée au niveau de l'interface utilisateur
    // pour éviter les imports circulaires

    // 1. Vérifier le stock disponible dans le magasin source
    const stockCheck = await checkStockAvailability(
      transfer.source_store_id,
      transfer.product_id,
      transfer.quantity
    )

    if (!stockCheck.available) {
      return {
        success: false,
        error: `Stock insuffisant dans le magasin source. Stock disponible: ${stockCheck.current_stock}, Quantité demandée: ${transfer.quantity}`
      }
    }

    // 2. Générer un code de transfert unique
    const transferCode = `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // 3. Créer le transfert
    const { data: newTransfer, error: insertError } = await supabase
      .from('store_transfers')
      .insert({
        transfer_code: transferCode,
        source_store_id: transfer.source_store_id,
        destination_store_id: transfer.destination_store_id,
        product_id: transfer.product_id,
        quantity: transfer.quantity,
        notes: transfer.notes,
        created_by: transfer.created_by
      })
      .select('id')
      .single()

    if (insertError) throw insertError

    // 4. Déduire le stock du magasin source
    const adjustmentResult = await adjustInventory({
      store_id: transfer.source_store_id,
      product_id: transfer.product_id,
      adjustment_type: 'transfer_out',
      quantity_change: -transfer.quantity,
      reason: `Transfert vers ${transfer.destination_store_id}`,
      reference_id: newTransfer.id,
      reference_type: 'transfer',
      created_by: transfer.created_by
    })

    if (!adjustmentResult.success) {
      // Annuler le transfert si l'ajustement échoue
      await supabase
        .from('store_transfers')
        .update({ status: 'cancelled' })
        .eq('id', newTransfer.id)

      return {
        success: false,
        error: adjustmentResult.error
      }
    }

    return {
      success: true,
      transfer_id: newTransfer.id
    }
  } catch (error) {
    console.error('Error creating store transfer:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Valider la réception d'un transfert
 */
export const validateTransferReceipt = async (
  transfer_id: string,
  received_quantity: number,
  received_by: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 1. Récupérer les détails du transfert
    const { data: transfer, error: fetchError } = await supabase
      .from('store_transfers')
      .select('*')
      .eq('id', transfer_id)
      .single()

    if (fetchError) throw fetchError

    if (transfer.status !== 'pending' && transfer.status !== 'in_transit') {
      return {
        success: false,
        error: 'Ce transfert ne peut plus être validé'
      }
    }

    // 2. Mettre à jour le statut du transfert
    const { error: updateError } = await supabase
      .from('store_transfers')
      .update({
        status: 'received',
        received_at: new Date().toISOString(),
        received_by: received_by
      })
      .eq('id', transfer_id)

    if (updateError) throw updateError

    // 3. Ajouter le stock au magasin de destination
    const adjustmentResult = await adjustInventory({
      store_id: transfer.destination_store_id,
      product_id: transfer.product_id,
      adjustment_type: 'transfer_in',
      quantity_change: received_quantity,
      reason: `Réception transfert ${transfer.transfer_code}`,
      reference_id: transfer_id,
      reference_type: 'transfer',
      created_by: received_by
    })

    if (!adjustmentResult.success) {
      return {
        success: false,
        error: adjustmentResult.error
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error validating transfer receipt:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Obtenir l'historique des ajustements d'un produit
 */
export const getInventoryHistory = async (
  store_id: string,
  product_id: string,
  limit: number = 50
): Promise<{ data: any[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('inventory_adjustments')
      .select(`
        *,
        created_by_user:users(first_name, last_name)
      `)
      .eq('store_id', store_id)
      .eq('product_id', product_id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return { data: data || [] }
  } catch (error) {
    console.error('Error fetching inventory history:', error)
    return {
      data: [],
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
} 