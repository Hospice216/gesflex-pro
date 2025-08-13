import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from './use-toast'
import { useAuth } from '@/contexts/AuthContext'

export interface SystemSetting {
  id: string
  setting_key: string
  setting_value: any
  setting_type: string
  category: string
  description?: string
  is_required: boolean
  is_sensitive: boolean
  created_at: string
  updated_at: string
}

export interface SystemSettings {
  // Multi-store settings
  enableStoreTransfers: boolean
  globalStockAlerts: boolean
  globalStockThreshold: number
  defaultOpeningTime: string
  defaultClosingTime: string
  
  // System settings
  autoBackup: boolean
  debugMode: boolean
  enableRealTimeAnalytics: boolean
  
  // Performance settings
  gamificationEnabled: boolean
  dailySalesTarget: number
  performanceThreshold: number
  pointsPerSale: number
  autoGenerateReports: boolean
  reportSchedule: string
  
  // Maintenance settings
  maintenanceMode: boolean
  maintenanceMessage: string
  adminOnlyAccess: boolean
  
  // Currency settings
  defaultCurrency: string
  currencySymbol: string
  currencyPosition: 'before' | 'after'
  decimalPlaces: number
}

const defaultSettings: SystemSettings = {
  // Multi-store settings
  enableStoreTransfers: true,
  globalStockAlerts: true,
  globalStockThreshold: 10,
  defaultOpeningTime: "09:00",
  defaultClosingTime: "19:00",
  
  // System settings
  autoBackup: true,
  debugMode: false,
  enableRealTimeAnalytics: true,
  
  // Performance settings
  gamificationEnabled: true,
  dailySalesTarget: 50000,
  performanceThreshold: 80,
  pointsPerSale: 10,
  autoGenerateReports: true,
  reportSchedule: "weekly",
  
  // Maintenance settings
  maintenanceMode: false,
  maintenanceMessage: "",
  adminOnlyAccess: false,
  
  // Currency settings
  defaultCurrency: "XOF",
  currencySymbol: "CFA",
  currencyPosition: "after",
  decimalPlaces: 0
}

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const { userProfile } = useAuth()

  // Vérifier si l'utilisateur a les permissions pour modifier les configurations
  const hasEditPermissions = userProfile?.role === 'Admin' || userProfile?.role === 'SuperAdmin'

  // Mapping des clés de configuration
  const settingKeyMap: Record<keyof SystemSettings, string> = {
    // Multi-store settings
    enableStoreTransfers: 'stores.enable_transfers',
    globalStockAlerts: 'stores.global_stock_alerts',
    globalStockThreshold: 'stores.global_stock_threshold',
    defaultOpeningTime: 'stores.default_opening_time',
    defaultClosingTime: 'stores.default_closing_time',
    
    // System settings
    autoBackup: 'system.auto_backup',
    debugMode: 'system.debug_mode',
    enableRealTimeAnalytics: 'system.enable_real_time_analytics',
    
    // Performance settings
    gamificationEnabled: 'performance.gamification_enabled',
    dailySalesTarget: 'performance.daily_sales_target',
    performanceThreshold: 'performance.performance_threshold',
    pointsPerSale: 'performance.points_per_sale',
    autoGenerateReports: 'performance.auto_generate_reports',
    reportSchedule: 'performance.report_schedule',
    
    // Maintenance settings
    maintenanceMode: 'maintenance.mode',
    maintenanceMessage: 'maintenance.message',
    adminOnlyAccess: 'maintenance.admin_only_access',
    
    // Currency settings
    defaultCurrency: 'currency.default',
    currencySymbol: 'currency.symbol',
    currencyPosition: 'currency.position',
    decimalPlaces: 'currency.decimal_places'
  }

  // Charger les configurations depuis Supabase
  const loadSettings = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('system_settings')
        .select('*')
        .order('setting_key')

      if (fetchError) {
        throw fetchError
      }

      if (data) {
        const loadedSettings = { ...defaultSettings }
        
        data.forEach((setting: SystemSetting) => {
          const key = Object.keys(settingKeyMap).find(k => settingKeyMap[k as keyof SystemSettings] === setting.setting_key)
          if (key) {
            // Convertir la valeur selon le type
            let value = setting.setting_value
            if (setting.setting_type === 'number') {
              value = Number(value)
            } else if (setting.setting_type === 'boolean') {
              value = value === 'true' || value === true
            }
            (loadedSettings as any)[key as keyof SystemSettings] = value
          }
        })
        
        setSettings(loadedSettings)
      }
    } catch (err) {
      console.error('Erreur lors du chargement des configurations:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      toast({
        title: "Erreur",
        description: "Impossible de charger les configurations",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Sauvegarder une configuration
  const saveSetting = async (key: keyof SystemSettings, value: any) => {
    try {
      // Vérifier les permissions
      if (!hasEditPermissions) {
        const error = new Error('Permissions insuffisantes. Seuls les Admin et SuperAdmin peuvent modifier les configurations.')
        toast({
          title: "Erreur de permissions",
          description: error.message,
          variant: "destructive"
        })
        throw error
      }

      const settingKey = settingKeyMap[key]
      if (!settingKey) {
        throw new Error(`Clé de configuration invalide: ${key}`)
      }

      // Déterminer le type de la valeur
      let settingType: SystemSetting['setting_type'] = 'string'
      if (typeof value === 'number') {
        settingType = 'number'
      } else if (typeof value === 'boolean') {
        settingType = 'boolean'
      } else if (Array.isArray(value)) {
        settingType = 'array'
      } else if (typeof value === 'object') {
        settingType = 'json'
      }

      // Vérifier si la configuration existe déjà
      const { data: existingSetting } = await supabase
        .from('system_settings')
        .select('id')
        .eq('setting_key', settingKey)
        .single()

      if (existingSetting) {
        // Mettre à jour la configuration existante
        const { error: updateError } = await supabase
          .from('system_settings')
          .update({
            setting_value: value,
            setting_type: settingType,
            category: settingKey.split('.')[0],
            updated_at: new Date().toISOString()
          })
          .eq('setting_key', settingKey)

        if (updateError) {
          throw updateError
        }
      } else {
        // Insérer une nouvelle configuration
        const { error: insertError } = await supabase
          .from('system_settings')
          .insert({
            setting_key: settingKey,
            setting_value: value,
            setting_type: settingType,
            category: settingKey.split('.')[0],
            updated_at: new Date().toISOString()
          })

        if (insertError) {
          throw insertError
        }
      }

      // Mettre à jour l'état local
      setSettings(prev => ({
        ...prev,
        [key]: value
      }))

      toast({
        title: "Succès",
        description: "Configuration sauvegardée"
      })
    } catch (err) {
      console.error('Erreur lors de la sauvegarde de la configuration:', err)
      
      // Ne pas afficher de toast si c'est déjà une erreur de permissions
      if (!err.message?.includes('Permissions insuffisantes') && !err.message?.includes('Erreur de sécurité')) {
        toast({
          title: "Erreur",
          description: "Impossible de sauvegarder la configuration",
          variant: "destructive"
        })
      }
      throw err
    }
  }

  // Sauvegarder toutes les configurations
  const saveAllSettings = async (newSettings: SystemSettings) => {
    try {
      // Vérifier les permissions
      if (!hasEditPermissions) {
        const error = new Error('Permissions insuffisantes. Seuls les Admin et SuperAdmin peuvent modifier les configurations.')
        toast({
          title: "Erreur de permissions",
          description: error.message,
          variant: "destructive"
        })
        throw error
      }

      // Récupérer toutes les configurations existantes
      const { data: existingSettings } = await supabase
        .from('system_settings')
        .select('setting_key, id')

      const existingKeys = new Set(existingSettings?.map(s => s.setting_key) || [])

      const updates: any[] = []
      const inserts: any[] = []

      Object.entries(newSettings).forEach(([key, value]) => {
        const settingKey = settingKeyMap[key as keyof SystemSettings]
        if (!settingKey) return

        let settingType: SystemSetting['setting_type'] = 'string'
        if (typeof value === 'number') {
          settingType = 'number'
        } else if (typeof value === 'boolean') {
          settingType = 'boolean'
        } else if (Array.isArray(value)) {
          settingType = 'array'
        } else if (typeof value === 'object') {
          settingType = 'json'
        }

        const settingData = {
          setting_key: settingKey,
          setting_value: value,
          setting_type: settingType,
          category: settingKey.split('.')[0],
          updated_at: new Date().toISOString()
        }

        if (existingKeys.has(settingKey)) {
          updates.push(settingData)
        } else {
          inserts.push(settingData)
        }
      })

      // Effectuer les mises à jour
      if (updates.length > 0) {
        for (const update of updates) {
          const { error: updateError } = await supabase
            .from('system_settings')
            .update(update)
            .eq('setting_key', update.setting_key)

          if (updateError) {
            throw updateError
          }
        }
      }

      // Effectuer les insertions
      if (inserts.length > 0) {
        const { error: insertError } = await supabase
          .from('system_settings')
          .insert(inserts)

        if (insertError) {
          throw insertError
        }
      }

      setSettings(newSettings)
      toast({
        title: "Succès",
        description: "Toutes les configurations ont été sauvegardées"
      })
    } catch (err) {
      console.error('Erreur lors de la sauvegarde des configurations:', err)
      
      // Ne pas afficher de toast si c'est déjà une erreur de permissions
      if (!err.message?.includes('Permissions insuffisantes') && !err.message?.includes('Erreur de sécurité')) {
        toast({
          title: "Erreur",
          description: "Impossible de sauvegarder les configurations",
          variant: "destructive"
        })
      }
      throw err
    }
  }

  // Réinitialiser aux valeurs par défaut
  const resetToDefaults = async () => {
    try {
      await saveAllSettings(defaultSettings)
      toast({
        title: "Succès",
        description: "Configurations réinitialisées aux valeurs par défaut"
      })
    } catch (err) {
      console.error('Erreur lors de la réinitialisation:', err)
      toast({
        title: "Erreur",
        description: "Impossible de réinitialiser les configurations",
        variant: "destructive"
      })
    }
  }

  // Charger les configurations au montage du composant
  useEffect(() => {
    loadSettings()
  }, [])

  return {
    settings,
    loading,
    error,
    hasEditPermissions,
    saveSetting,
    saveAllSettings,
    resetToDefaults,
    reloadSettings: loadSettings
  }
} 