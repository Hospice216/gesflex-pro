// Script de vérification des configurations system_settings
// Ce script vérifie que toutes les configurations nécessaires sont présentes

const { createClient } = require('@supabase/supabase-js')

// Configuration Supabase (à adapter selon votre environnement)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://qxxldshkowjbcbnchokg.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

const supabase = createClient(supabaseUrl, supabaseKey)

// Configurations attendues
const expectedSettings = {
  // Multi-store settings
  'stores.enable_transfers': { type: 'boolean', category: 'stores' },
  'stores.global_stock_alerts': { type: 'boolean', category: 'stores' },
  'stores.global_stock_threshold': { type: 'number', category: 'stores' },
  'stores.default_opening_time': { type: 'string', category: 'stores' },
  'stores.default_closing_time': { type: 'string', category: 'stores' },
  
  // System settings
  'system.auto_backup': { type: 'boolean', category: 'system' },
  'system.debug_mode': { type: 'boolean', category: 'system' },
  'system.enable_real_time_analytics': { type: 'boolean', category: 'system' },
  
  // Performance settings
  'performance.gamification_enabled': { type: 'boolean', category: 'performance' },
  'performance.daily_sales_target': { type: 'number', category: 'performance' },
  'performance.performance_threshold': { type: 'number', category: 'performance' },
  'performance.points_per_sale': { type: 'number', category: 'performance' },
  'performance.auto_generate_reports': { type: 'boolean', category: 'performance' },
  'performance.report_schedule': { type: 'string', category: 'performance' },
  
  // Maintenance settings
  'maintenance.mode': { type: 'boolean', category: 'maintenance' },
  'maintenance.message': { type: 'string', category: 'maintenance' },
  'maintenance.admin_only_access': { type: 'boolean', category: 'maintenance' },
  
  // Currency settings
  'currency.default': { type: 'string', category: 'currency' },
  'currency.symbol': { type: 'string', category: 'currency' },
  'currency.position': { type: 'string', category: 'currency' },
  'currency.decimal_places': { type: 'number', category: 'currency' }
}

async function verifyConfiguration() {
  console.log('🔍 Vérification des configurations system_settings...\n')
  
  try {
    // Récupérer toutes les configurations
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('setting_key')
    
    if (error) {
      console.error('❌ Erreur lors de la récupération des configurations:', error)
      return
    }
    
    console.log(`📊 Total de configurations trouvées: ${settings.length} (attendu: 19)`)
    
    // Vérifier les configurations attendues
    const foundSettings = new Set(settings.map(s => s.setting_key))
    const missingSettings = []
    const extraSettings = []
    
    // Vérifier les configurations manquantes
    for (const [key, expected] of Object.entries(expectedSettings)) {
      if (!foundSettings.has(key)) {
        missingSettings.push(key)
      }
    }
    
    // Vérifier les configurations en trop
    for (const setting of settings) {
      if (!expectedSettings[setting.setting_key]) {
        extraSettings.push(setting.setting_key)
      }
    }
    
    // Afficher les résultats
    console.log('\n✅ Configurations présentes:')
    for (const setting of settings) {
      const expected = expectedSettings[setting.setting_key]
      if (expected) {
        const status = expected.type === setting.setting_type ? '✅' : '⚠️'
        console.log(`  ${status} ${setting.setting_key} (${setting.setting_type})`)
      }
    }
    
    if (missingSettings.length > 0) {
      console.log('\n❌ Configurations manquantes:')
      missingSettings.forEach(key => {
        console.log(`  ❌ ${key}`)
      })
    }
    
    if (extraSettings.length > 0) {
      console.log('\n⚠️ Configurations en trop:')
      extraSettings.forEach(key => {
        console.log(`  ⚠️ ${key}`)
      })
    }
    
    // Résumé
    console.log('\n📋 Résumé:')
    console.log(`  ✅ Configurations correctes: ${settings.length - missingSettings.length - extraSettings.length}`)
    console.log(`  ❌ Configurations manquantes: ${missingSettings.length}`)
    console.log(`  ⚠️ Configurations en trop: ${extraSettings.length}`)
    
      if (missingSettings.length === 0 && extraSettings.length === 0) {
    console.log('\n🎉 Toutes les configurations sont correctes !')
    console.log('💱 Configuration de devise incluse et fonctionnelle.')
  } else {
    console.log('\n🔧 Exécutez la migration 20250127000006-update-system-settings-simplified.sql pour corriger.')
  }
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error)
  }
}

// Exécuter la vérification
verifyConfiguration() 