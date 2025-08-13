/**
 * Calcul de la marge brute
 * @param revenue - Chiffre d'affaires
 * @param cost - Coût d'achat
 * @returns Pourcentage de marge
 */
export const calculateMargin = (revenue: number, cost: number): number => {
  if (revenue <= 0) return 0
  if (cost >= revenue) return 0
  
  return Math.round(((revenue - cost) / revenue) * 100)
}

/**
 * Calcul de la marge avec prix d'achat estimé
 * @param revenue - Chiffre d'affaires
 * @param quantity - Quantité vendue
 * @param estimatedCostPerUnit - Coût unitaire estimé (par défaut 100 XOF)
 * @returns Pourcentage de marge
 */
export const calculateEstimatedMargin = (
  revenue: number, 
  quantity: number, 
  estimatedCostPerUnit: number = 100
): number => {
  if (revenue <= 0 || quantity <= 0) return 0
  
  const totalCost = quantity * estimatedCostPerUnit
  return calculateMargin(revenue, totalCost)
}

/**
 * Calcul de la croissance en pourcentage
 * @param current - Valeur actuelle
 * @param previous - Valeur précédente
 * @returns Pourcentage de croissance
 */
export const calculateGrowth = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

/**
 * Calcul du panier moyen
 * @param totalRevenue - Chiffre d'affaires total
 * @param numberOfSales - Nombre de ventes
 * @returns Panier moyen
 */
export const calculateAverageTicket = (totalRevenue: number, numberOfSales: number): number => {
  if (numberOfSales <= 0) return 0
  return Math.round(totalRevenue / numberOfSales)
}

/**
 * Calcul de l'efficacité des vendeurs
 * @param sales - Nombre de ventes
 * @param revenue - Chiffre d'affaires
 * @param periodDays - Nombre de jours de la période
 * @returns Score d'efficacité normalisé
 */
export const calculateEfficiency = (
  sales: number, 
  revenue: number, 
  periodDays: number
): number => {
  if (sales <= 0 || periodDays <= 0) return 0
  
  const avgDailySales = sales / periodDays
  const avgRevenuePerSale = revenue / sales
  
  // Métrique normalisée basée sur la fréquence et le montant
  return Math.round((avgDailySales * avgRevenuePerSale) / 1000 * 100) / 100
}

/**
 * Validation des montants financiers
 * @param amount - Montant à valider
 * @returns true si valide
 */
export const isValidAmount = (amount: number): boolean => {
  return !isNaN(amount) && amount >= 0 && isFinite(amount)
}

/**
 * Arrondi des montants monétaires
 * @param amount - Montant à arrondir
 * @param decimals - Nombre de décimales (par défaut 0)
 * @returns Montant arrondi
 */
export const roundAmount = (amount: number, decimals: number = 0): number => {
  return Math.round(amount * Math.pow(10, decimals)) / Math.pow(10, decimals)
} 