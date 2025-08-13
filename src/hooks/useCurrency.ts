import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface CurrencyConfig {
  code: string
  symbol: string
  position: "before" | "after"
  decimal_places: number
  thousands_separator: string
  decimal_separator: string
}

export function useCurrency() {
  const [currency, setCurrency] = useState<CurrencyConfig>({
    code: "XOF",
    symbol: "CFA",
    position: "after",
    decimal_places: 0,
    thousands_separator: " ",
    decimal_separator: ","
  })
  const [loading, setLoading] = useState(true)

  const fetchCurrencyConfig = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value, setting_type')
        .in('setting_key', [
          'currency.default',
          'currency.symbol',
          'currency.position',
          'currency.decimal_places',
          'currency.thousands_separator',
          'currency.decimal_separator'
        ])

      if (error) {
        console.error("Erreur lors du chargement de la devise:", error)
        // Utiliser les valeurs par défaut
        setCurrency({
          code: "XOF",
          symbol: "CFA",
          position: "after",
          decimal_places: 0,
          thousands_separator: " ",
          decimal_separator: ","
        })
      } else if (data && data.length > 0) {
        // Construire la configuration à partir des données
        const config: CurrencyConfig = {
          code: "XOF",
          symbol: "CFA",
          position: "after",
          decimal_places: 0,
          thousands_separator: " ",
          decimal_separator: ","
        }

        // Mapper les données
        data.forEach(item => {
          let value = item.setting_value
          
          // Gérer les différents types de valeurs
          if (item.setting_type === 'number') {
            value = parseInt(value) || 0
          } else if (item.setting_type === 'boolean') {
            value = value === 'true' || value === true
          } else if (item.setting_type === 'json') {
            try {
              value = JSON.parse(value)
            } catch {
              // Si le parsing JSON échoue, utiliser la valeur brute
              value = item.setting_value
            }
          }
          // Pour les strings, utiliser la valeur directement

          switch (item.setting_key) {
            case 'currency.default':
              if (value) config.code = String(value)
              break
            case 'currency.symbol':
              if (value) config.symbol = String(value)
              break
            case 'currency.position':
              if (value && (value === 'before' || value === 'after')) {
                config.position = value
              }
              break
            case 'currency.decimal_places':
              if (value !== null && value !== undefined) {
                config.decimal_places = parseInt(String(value)) || 0
              }
              break
            case 'currency.thousands_separator':
              if (value) config.thousands_separator = String(value)
              break
            case 'currency.decimal_separator':
              if (value) config.decimal_separator = String(value)
              break
          }
        })

        setCurrency(config)
      } else {
        // Aucune donnée trouvée, utiliser les valeurs par défaut
        setCurrency({
          code: "XOF",
          symbol: "CFA",
          position: "after",
          decimal_places: 0,
          thousands_separator: " ",
          decimal_separator: ","
        })
      }
    } catch (error) {
      console.error("Erreur lors du chargement de la devise:", error)
      // Utiliser les valeurs par défaut en cas d'erreur
      setCurrency({
        code: "XOF",
        symbol: "CFA",
        position: "after",
        decimal_places: 0,
        thousands_separator: " ",
        decimal_separator: ","
      })
    } finally {
      setLoading(false)
    }
  }

  const formatAmount = (amount: number): string => {
    if (amount === null || amount === undefined) return "0"
    
    const formattedNumber = amount.toFixed(currency.decimal_places)
      .replace(".", currency.decimal_separator)
      .replace(/\B(?=(\d{3})+(?!\d))/g, currency.thousands_separator)

    if (currency.position === "before") {
      return `${currency.symbol} ${formattedNumber}`
    } else {
      return `${formattedNumber} ${currency.symbol}`
    }
  }

  const formatPercentage = (value: number): string => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`
  }

  useEffect(() => {
    fetchCurrencyConfig()
  }, [])

  return {
    currency,
    loading,
    formatAmount,
    formatPercentage,
    refreshCurrency: fetchCurrencyConfig
  }
}
