/**
 * Utilitaires pour le formatage monétaire
 */

// Deprecated: prefer useCurrency().formatAmount to respect runtime configuration
export const formatCurrency = (amount: number, currency: string = 'XOF'): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// Deprecated: prefer useCurrency().formatAmount
export const formatCurrencyWithDecimals = (amount: number, currency: string = 'XOF'): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

export const parseCurrency = (value: string): number => {
  // Supprimer tous les caractères non numériques sauf le point et la virgule
  const cleanValue = value.replace(/[^\d.,]/g, '')
  // Remplacer la virgule par un point pour la conversion
  const normalizedValue = cleanValue.replace(',', '.')
  return parseFloat(normalizedValue) || 0
}

export const validateCurrency = (value: string): boolean => {
  const amount = parseCurrency(value)
  return !isNaN(amount) && amount >= 0
} 