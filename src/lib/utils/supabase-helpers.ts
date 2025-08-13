import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

/**
 * Utilitaire pour gérer les erreurs Supabase de manière cohérente
 */
export const handleSupabaseError = (error: any, context: string) => {
  console.error(`Error in ${context}:`, error)
  
  let message = "Une erreur inattendue s'est produite"
  
  if (error?.message) {
    message = error.message
  } else if (error?.details) {
    message = error.details
  } else if (typeof error === 'string') {
    message = error
  }
  
  return {
    success: false,
    error: message,
    originalError: error
  }
}

/**
 * Utilitaire pour valider les données avant insertion
 */
export const validateData = (data: any, requiredFields: string[]) => {
  const missingFields = requiredFields.filter(field => !data[field])
  
  if (missingFields.length > 0) {
    return {
      valid: false,
      error: `Champs manquants: ${missingFields.join(', ')}`
    }
  }
  
  return { valid: true }
}

/**
 * Utilitaire pour formater les dates de manière cohérente
 */
export const formatDateForSupabase = (date: Date | string): string => {
  if (typeof date === 'string') {
    return new Date(date).toISOString()
  }
  return date.toISOString()
}

/**
 * Utilitaire pour nettoyer les données avant insertion
 */
export const sanitizeData = (data: any): any => {
  const cleaned = { ...data }
  
  // Supprimer les propriétés undefined ou null
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === undefined || cleaned[key] === null) {
      delete cleaned[key]
    }
  })
  
  return cleaned
}

/**
 * Relations valides pour chaque table
 */
export const VALID_RELATIONS = {
  inventory: ['products', 'stores'],
  products: ['categories', 'units'],
  sales: ['sale_items', 'stores', 'users'],
  sale_items: ['products', 'sales'],
  expenses: ['stores', 'users'],
  stores: [],
  categories: [],
  units: [],
  users: []
}

/**
 * Vérifier si une relation est valide
 */
export const isValidRelation = (table: string, relation: string): boolean => {
  return VALID_RELATIONS[table as keyof typeof VALID_RELATIONS]?.includes(relation) || false
}

/**
 * Construire une requête select sécurisée
 */
export const buildSafeSelect = (table: string, relations: string[] = [], fields: string[] = ['*']) => {
  const validRelations = relations.filter(relation => isValidRelation(table, relation))
  
  if (validRelations.length === 0) {
    return fields.join(', ')
  }
  
  const selectParts = [...fields]
  
  validRelations.forEach(relation => {
    selectParts.push(`${relation}(*)`)
  })
  
  return selectParts.join(', ')
} 