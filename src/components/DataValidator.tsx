import React from 'react'

// ✅ NOUVEAU : Utilitaires de validation des données
export class DataValidator {
  // Validation des nombres
  static isValidNumber(value: any): boolean {
    if (typeof value === 'number') {
      return !isNaN(value) && isFinite(value)
    }
    if (typeof value === 'string') {
      const num = parseFloat(value)
      return !isNaN(num) && isFinite(num)
    }
    return false
  }

  // Validation des chaînes
  static isValidString(value: any): boolean {
    return typeof value === 'string' && value.trim().length > 0
  }

  // Validation des dates
  static isValidDate(value: any): boolean {
    if (value instanceof Date) {
      return !isNaN(value.getTime())
    }
    if (typeof value === 'string') {
      const date = new Date(value)
      return !isNaN(date.getTime())
    }
    return false
  }

  // Validation des objets
  static isValidObject(value: any): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
  }

  // Validation des tableaux
  static isValidArray(value: any): boolean {
    return Array.isArray(value) && value.length > 0
  }

  // Nettoyage des nombres
  static sanitizeNumber(value: any, defaultValue: number = 0): number {
    if (this.isValidNumber(value)) {
      return typeof value === 'string' ? parseFloat(value) : value
    }
    return defaultValue
  }

  // Nettoyage des chaînes
  static sanitizeString(value: any, defaultValue: string = ''): string {
    if (this.isValidString(value)) {
      return value.trim()
    }
    return defaultValue
  }

  // Nettoyage des dates
  static sanitizeDate(value: any, defaultValue: Date = new Date()): Date {
    if (this.isValidDate(value)) {
      return value instanceof Date ? value : new Date(value)
    }
    return defaultValue
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

    // Validation de la date
    if (!this.isValidDate(sale?.created_at)) {
      errors.push('Date de création invalide')
    } else {
      sanitized.created_at = this.sanitizeDate(sale.created_at)
    }

    // Validation du client
    if (sale?.customer_name) {
      sanitized.customer_name = this.sanitizeString(sale.customer_name)
    } else {
      sanitized.customer_name = 'Client anonyme'
    }

    // Validation du magasin
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
      errors.push('Nom de produit manquant')
    } else {
      sanitized.name = this.sanitizeString(product.name)
    }

    // Validation du SKU
    if (!this.isValidString(product?.sku)) {
      errors.push('SKU manquant')
    } else {
      sanitized.sku = this.sanitizeString(product.sku)
    }

    // Validation du stock
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

    return {
      isValid: errors.length === 0,
      errors,
      sanitized
    }
  }

  // Validation des données de statistiques
  static validateStatsData(stats: any): {
    isValid: boolean
    errors: string[]
    sanitized: any
  } {
    const errors: string[] = []
    const sanitized: any = {}

    // Validation des ventes du jour
    if (stats?.dailySales) {
      const dailySales = stats.dailySales
      sanitized.dailySales = {
        amount: this.sanitizeNumber(dailySales.amount, 0),
        count: this.sanitizeNumber(dailySales.count, 0),
        percentageChange: this.sanitizeNumber(dailySales.percentageChange, 0)
      }
    } else {
      sanitized.dailySales = { amount: 0, count: 0, percentageChange: 0 }
    }

    // Validation des ventes totales
    if (stats?.totalSales) {
      const totalSales = stats.totalSales
      sanitized.totalSales = {
        amount: this.sanitizeNumber(totalSales.amount, 0),
        count: this.sanitizeNumber(totalSales.count, 0),
        productsSold: this.sanitizeNumber(totalSales.productsSold, 0)
      }
    } else {
      sanitized.totalSales = { amount: 0, count: 0, productsSold: 0 }
    }

    // Validation des produits
    if (stats?.totalProducts) {
      const totalProducts = stats.totalProducts
      sanitized.totalProducts = {
        count: this.sanitizeNumber(totalProducts.count, 0),
        lowStockCount: this.sanitizeNumber(totalProducts.lowStockCount, 0)
      }
    } else {
      sanitized.totalProducts = { count: 0, lowStockCount: 0 }
    }

    // Validation des produits en alerte
    if (stats?.lowStockProducts) {
      const lowStockProducts = stats.lowStockProducts
      sanitized.lowStockProducts = {
        count: this.sanitizeNumber(lowStockProducts.count, 0),
        items: this.isValidArray(lowStockProducts.items) 
          ? lowStockProducts.items.map((item: any) => this.validateProductData(item).sanitized)
          : []
      }
    } else {
      sanitized.lowStockProducts = { count: 0, items: [] }
    }

    // Validation des ventes récentes
    if (stats?.recentSales) {
      sanitized.recentSales = this.isValidArray(stats.recentSales)
        ? stats.recentSales.map((sale: any) => this.validateSaleData(sale).sanitized)
        : []
    } else {
      sanitized.recentSales = []
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized
    }
  }
}

// Hook pour utiliser le validateur
export function useDataValidator() {
  return DataValidator
}

// Composant de validation des données
interface DataValidatorProps {
  data: any
  children: (validatedData: any, isValid: boolean, errors: string[]) => React.ReactNode
  validator?: (data: any) => { isValid: boolean; errors: string[]; sanitized: any }
}

export function DataValidatorComponent({ 
  data, 
  children, 
  validator = DataValidator.validateStatsData 
}: DataValidatorProps) {
  const validation = validator(data)
  
  return (
    <>
      {children(validation.sanitized, validation.isValid, validation.errors)}
    </>
  )
}
