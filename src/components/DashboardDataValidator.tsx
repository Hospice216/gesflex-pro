import React from 'react'
import { DataValidator } from './DataValidator'

// Validateur spécifique pour les données du Dashboard
export class DashboardDataValidator extends DataValidator {
  // Validation des données du Dashboard
  static validateDashboardData(data: any): {
    isValid: boolean
    errors: string[]
    sanitized: any
  } {
    const errors: string[] = []
    const sanitized: any = {}



    // Validation des ventes récentes - Plus tolérant
    if (data?.recentSales) {
      if (Array.isArray(data.recentSales)) {
        sanitized.recentSales = data.recentSales.length > 0 
          ? data.recentSales.map((sale: any) => this.validateSaleData(sale).sanitized)
          : []
      } else {
        sanitized.recentSales = []
        errors.push('Format des ventes récentes invalide (attendu: tableau)')
      }
    } else {
      sanitized.recentSales = []
    }

    // Validation des produits en stock faible - Plus flexible
    if (data?.lowStockProducts) {
      if (Array.isArray(data.lowStockProducts)) {
        // Format tableau (attendu)
        sanitized.lowStockProducts = {
          count: data.lowStockProducts.length,
          items: data.lowStockProducts.length > 0 
            ? data.lowStockProducts.map((product: any) => this.validateProductData(product).sanitized)
            : []
        }
      } else if (typeof data.lowStockProducts === 'object' && data.lowStockProducts !== null) {
        // Format objet (fallback) - essayer d'extraire les données
        if (data.lowStockProducts.items && Array.isArray(data.lowStockProducts.items)) {
          // Items est déjà un tableau
          sanitized.lowStockProducts = {
            count: data.lowStockProducts.items.length,
            items: data.lowStockProducts.items.map((product: any) => this.validateProductData(product).sanitized)
          }
        } else if (data.lowStockProducts.items && typeof data.lowStockProducts.items === 'object') {
          // Items est un objet - essayer de le convertir en tableau
          const itemsArray = Object.values(data.lowStockProducts.items)
          if (itemsArray.length > 0) {
            sanitized.lowStockProducts = {
              count: itemsArray.length,
              items: itemsArray.map((product: any) => this.validateProductData(product).sanitized)
            }
          } else {
            // Objet vide - pas d'erreur, juste un stock optimal
            sanitized.lowStockProducts = { count: 0, items: [] }
          }
        } else if (data.lowStockProducts.data && Array.isArray(data.lowStockProducts.data)) {
          sanitized.lowStockProducts = {
            count: data.lowStockProducts.data.length,
            items: data.lowStockProducts.data.map((product: any) => this.validateProductData(product).sanitized)
          }
        } else {
          // Objet avec structure inconnue
          sanitized.lowStockProducts = { count: 0, items: [] }
          errors.push('Structure des produits en stock faible non reconnue')
        }
      } else {
        sanitized.lowStockProducts = { count: 0, items: [] }
        errors.push('Format des produits en stock faible invalide')
      }
    } else {
      sanitized.lowStockProducts = { count: 0, items: [] }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized
    }
  }

  // Validation des données de produit
  static validateProductData(product: any): {
    isValid: boolean
    errors: string[]
    sanitized: any
  } {
    const errors: string[] = []
    const sanitized: any = {}

    // Validation de l'ID
    if (!product?.id) {
      errors.push('ID de produit manquant')
    } else {
      sanitized.id = product.id
    }

    // Validation du nom
    if (!this.isValidString(product?.name)) {
      errors.push('Nom de produit invalide')
    } else {
      sanitized.name = this.sanitizeString(product.name)
    }

    // Validation du SKU
    if (!this.isValidString(product?.sku)) {
      errors.push('SKU de produit invalide')
    } else {
      sanitized.sku = this.sanitizeString(product.sku)
    }

    // Validation du stock actuel
    if (!this.isValidNumber(product?.current_stock) || product.current_stock < 0) {
      errors.push('Stock actuel invalide')
    } else {
      sanitized.current_stock = this.sanitizeNumber(product.current_stock)
    }

    // Validation du stock d'alerte
    if (!this.isValidNumber(product?.alert_stock) || product.alert_stock < 0) {
      errors.push('Stock d\'alerte invalide')
    } else {
      sanitized.alert_stock = this.sanitizeNumber(product.alert_stock)
    }

    // Validation du nom du magasin
    if (product?.store_name) {
      sanitized.store_name = this.sanitizeString(product.store_name)
    } else {
      sanitized.store_name = 'Magasin inconnu'
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized
    }
  }

  // Validation des données de vente
  static validateSaleData(sale: any): {
    isValid: boolean
    errors: string[]
    sanitized: any
  } {
    const errors: string[] = []
    const sanitized: any = {}

    // Validation de l'ID
    if (!sale?.id) {
      errors.push('ID de vente manquant')
    } else {
      sanitized.id = sale.id
    }

    // Validation du code de vente
    if (!this.isValidString(sale?.sale_code)) {
      errors.push('Code de vente invalide')
    } else {
      sanitized.sale_code = this.sanitizeString(sale.sale_code)
    }

    // Validation du montant total
    if (!this.isValidNumber(sale?.total_amount) || sale.total_amount < 0) {
      errors.push('Montant total invalide')
    } else {
      sanitized.total_amount = this.sanitizeNumber(sale.total_amount)
    }

    // Validation du nom du client
    if (sale?.customer_name) {
      sanitized.customer_name = this.sanitizeString(sale.customer_name)
    } else {
      sanitized.customer_name = 'Client anonyme'
    }

    // Validation de la date
    if (!this.isValidDate(sale?.created_at)) {
      errors.push('Date de création invalide')
    } else {
      sanitized.created_at = this.sanitizeDate(sale.created_at)
    }

    // Validation du nom du magasin
    if (sale?.store_name) {
      sanitized.store_name = this.sanitizeString(sale.store_name)
    } else {
      sanitized.store_name = 'Magasin inconnu'
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized
    }
  }
}

// Composant de validation des données du Dashboard
interface DashboardDataValidatorProps {
  data: any
  children: (validatedData: any, isValid: boolean, errors: string[]) => React.ReactNode
}

export function DashboardDataValidatorComponent({ 
  data, 
  children 
}: DashboardDataValidatorProps) {
  const validation = DashboardDataValidator.validateDashboardData(data)
  
  return (
    <>
      {children(validation.sanitized, validation.isValid, validation.errors)}
    </>
  )
}
