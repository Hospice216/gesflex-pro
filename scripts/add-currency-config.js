const { createClient } = require('@supabase/supabase-js')

// Configuration Supabase
const supabaseUrl = 'https://qxxldshkowjbcbnchokg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4eGxkc2hrb3dqYmNibmNob2tnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDQzMjM0NywiZXhwIjoyMDUwMDA4MzQ3fQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function addCurrencyConfig() {
  try {
    console.log('🔄 Ajout des configurations de devise...')

    // Récupérer un utilisateur pour created_by
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id')
      .limit(1)

    if (userError || !users || users.length === 0) {
      console.error('❌ Erreur: Aucun utilisateur trouvé')
      return
    }

    const userId = users[0].id

    // Configurations de devise à ajouter
    const currencyConfigs = [
      {
        setting_key: 'currency.default',
        setting_value: '"XOF"',
        setting_type: 'string',
        category: 'currency',
        description: 'Devise par défaut',
        is_required: true,
        created_by: userId
      },
      {
        setting_key: 'currency.symbol',
        setting_value: '"CFA"',
        setting_type: 'string',
        category: 'currency',
        description: 'Symbole de la devise',
        is_required: false,
        created_by: userId
      },
      {
        setting_key: 'currency.position',
        setting_value: '"after"',
        setting_type: 'string',
        category: 'currency',
        description: 'Position du symbole',
        is_required: false,
        created_by: userId
      },
      {
        setting_key: 'currency.decimal_places',
        setting_value: '0',
        setting_type: 'number',
        category: 'currency',
        description: 'Nombre de décimales',
        is_required: false,
        created_by: userId
      },
      {
        setting_key: 'currency.thousands_separator',
        setting_value: '" "',
        setting_type: 'string',
        category: 'currency',
        description: 'Séparateur de milliers',
        is_required: false,
        created_by: userId
      },
      {
        setting_key: 'currency.decimal_separator',
        setting_value: '","',
        setting_type: 'string',
        category: 'currency',
        description: 'Séparateur décimal',
        is_required: false,
        created_by: userId
      }
    ]

    // Insérer les configurations
    for (const config of currencyConfigs) {
      const { error } = await supabase
        .from('system_settings')
        .upsert(config, { onConflict: 'setting_key' })

      if (error) {
        console.error(`❌ Erreur lors de l'ajout de ${config.setting_key}:`, error)
      } else {
        console.log(`✅ ${config.setting_key} ajouté`)
      }
    }

    console.log('✅ Configuration de devise terminée')

    // Vérifier les configurations ajoutées
    const { data: settings, error: checkError } = await supabase
      .from('system_settings')
      .select('*')
      .eq('category', 'currency')

    if (checkError) {
      console.error('❌ Erreur lors de la vérification:', checkError)
    } else {
      console.log('📋 Configurations actuelles:')
      settings.forEach(setting => {
        console.log(`  - ${setting.setting_key}: ${setting.setting_value}`)
      })
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error)
  }
}

// Exécuter le script
addCurrencyConfig() 