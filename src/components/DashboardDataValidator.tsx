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

    // Validation des ventes récentes
    if (data?.recentSales) {
      if (this.isValidArray(data.recentSales)) {
        sanitized.recentSales = data.recentSales.map((sale: any) => this.validateSaleData(sale).sanitized)
      } else {
        sanitized.recentSales = []
        errors.push('Format des ventes récentes invalide')
      }
    } else {
      sanitized.recentSales = []
    }

    // Validation des produits en stock faible
    if (data?.lowStockProducts) {
      if (this.isValidArray(data.lowStockProducts)) {
        sanitized.lowStockProducts = {
          count: data.lowStockProducts.length,
          items: data.lowStockProducts.map((product: any) => this.validateProductData(product).sanitized)
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
