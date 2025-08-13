// Script simple pour tester les politiques RLS
// Ce script vérifie la structure de la base de données

import { createClient } from '@supabase/supabase-js'

// Configuration Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://qxxldshkowjbcbnchokg.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSimpleRLS() {
  console.log('🔍 Test simple des politiques RLS...\n')
  
  try {
    // Test 1: Vérifier la table system_settings
    console.log('📋 Test 1: Vérification de la table system_settings')
    
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value, setting_type, category')
      .limit(5)
    
    if (settingsError) {
      console.error('❌ Erreur lors de la récupération des configurations:', settingsError)
      return
    }
    
    console.log(`📊 Configurations trouvées: ${settings.length}`)
    settings.forEach(setting => {
      console.log(`  - ${setting.setting_key}: ${setting.setting_value} (${setting.setting_type})`)
    })
    
    // Test 2: Vérifier les utilisateurs
    console.log('\n👥 Test 2: Vérification des utilisateurs')
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role')
      .limit(5)
    
    if (usersError) {
      console.error('❌ Erreur lors de la récupération des utilisateurs:', usersError)
      return
    }
    
    console.log(`📊 Utilisateurs trouvés: ${users.length}`)
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.role})`)
    })
    
    // Test 3: Vérifier les politiques RLS (si accessible)
    console.log('\n🔒 Test 3: Vérification des politiques RLS')
    
    try {
      const { data: policies, error: policiesError } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'system_settings')
      
      if (policiesError) {
        console.log('⚠️ Impossible d\'accéder aux politiques RLS (normal sans authentification)')
        console.log('   Erreur:', policiesError.message)
      } else {
        console.log(`📊 Politiques trouvées: ${policies.length}`)
        policies.forEach(policy => {
          console.log(`  - ${policy.policyname}: ${policy.cmd}`)
        })
      }
    } catch (error) {
      console.log('⚠️ Impossible d\'accéder aux politiques RLS (normal sans authentification)')
    }
    
    // Résumé
    console.log('\n📋 Résumé des tests:')
    console.log(`  ✅ Table system_settings: ${settings.length > 0 ? 'Accessible' : 'Inaccessible'}`)
    console.log(`  ✅ Table users: ${users.length > 0 ? 'Accessible' : 'Inaccessible'}`)
    console.log(`  ✅ Utilisateurs Admin/SuperAdmin: ${users.filter(u => ['Admin', 'SuperAdmin'].includes(u.role)).length}`)
    
    if (settings.length > 0 && users.length > 0) {
      console.log('\n🎉 Tests de base réussis!')
      console.log('💡 La structure de la base de données semble correcte.')
      console.log('🔧 Pour tester les politiques RLS, exécutez la migration et testez via l\'interface.')
    } else {
      console.log('\n⚠️ Certains tests ont échoué.')
      console.log('🔧 Vérifiez que les migrations ont été exécutées correctement.')
    }
    
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error)
  }
}

// Exécuter les tests
testSimpleRLS() 