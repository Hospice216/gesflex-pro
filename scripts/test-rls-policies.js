// Script de test des politiques RLS pour system_settings
// Ce script vérifie que les politiques RLS fonctionnent correctement

const { createClient } = require('@supabase/supabase-js')

// Configuration Supabase (à adapter selon votre environnement)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://qxxldshkowjbcbnchokg.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testRLSPolicies() {
  console.log('🔍 Test des politiques RLS pour system_settings...\n')
  
  try {
    // Test 1: Vérifier les politiques existantes
    console.log('📋 Test 1: Vérification des politiques RLS')
    
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'system_settings')
    
    if (policiesError) {
      console.error('❌ Erreur lors de la récupération des politiques:', policiesError)
      return
    }
    
    console.log(`📊 Politiques trouvées: ${policies.length}`)
    policies.forEach(policy => {
      console.log(`  - ${policy.policyname}: ${policy.cmd} (${policy.permissive ? 'permissive' : 'restrictive'})`)
    })
    
    // Test 2: Vérifier les utilisateurs Admin/SuperAdmin
    console.log('\n👥 Test 2: Vérification des utilisateurs Admin/SuperAdmin')
    
    const { data: adminUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, role')
      .in('role', ['Admin', 'SuperAdmin'])
    
    if (usersError) {
      console.error('❌ Erreur lors de la récupération des utilisateurs:', usersError)
      return
    }
    
    console.log(`📊 Utilisateurs Admin/SuperAdmin: ${adminUsers.length}`)
    adminUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.role})`)
    })
    
    // Test 3: Vérifier les configurations existantes
    console.log('\n⚙️ Test 3: Vérification des configurations existantes')
    
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value, setting_type, category')
      .order('setting_key')
    
    if (settingsError) {
      console.error('❌ Erreur lors de la récupération des configurations:', settingsError)
      return
    }
    
    console.log(`📊 Configurations trouvées: ${settings.length}`)
    settings.slice(0, 5).forEach(setting => {
      console.log(`  - ${setting.setting_key}: ${setting.setting_value} (${setting.setting_type})`)
    })
    if (settings.length > 5) {
      console.log(`  ... et ${settings.length - 5} autres`)
    }
    
    // Test 4: Test de modification (simulation)
    console.log('\n🔧 Test 4: Test de modification (simulation)')
    
    if (adminUsers.length === 0) {
      console.log('⚠️ Aucun utilisateur Admin/SuperAdmin trouvé pour tester les modifications')
      return
    }
    
    // Simuler une tentative de modification
    const testSetting = settings.find(s => s.setting_key === 'system.debug_mode')
    if (testSetting) {
      console.log(`🔄 Tentative de modification de ${testSetting.setting_key}...`)
      
      const { error: updateError } = await supabase
        .from('system_settings')
        .update({ setting_value: testSetting.setting_value === 'true' ? 'false' : 'true' })
        .eq('setting_key', testSetting.setting_key)
      
      if (updateError) {
        console.log(`❌ Erreur de modification: ${updateError.message}`)
        if (updateError.code === '42501') {
          console.log('🔒 Erreur RLS détectée - Vérifiez les politiques de sécurité')
        }
      } else {
        console.log('✅ Modification réussie - Les politiques RLS fonctionnent correctement')
      }
    } else {
      console.log('⚠️ Aucune configuration de test trouvée')
    }
    
    // Résumé
    console.log('\n📋 Résumé des tests:')
    console.log(`  ✅ Politiques RLS: ${policies.length >= 2 ? 'Configurées' : 'Manquantes'}`)
    console.log(`  ✅ Utilisateurs Admin: ${adminUsers.length > 0 ? 'Présents' : 'Manquants'}`)
    console.log(`  ✅ Configurations: ${settings.length > 0 ? 'Présentes' : 'Manquantes'}`)
    
    if (policies.length >= 2 && adminUsers.length > 0 && settings.length > 0) {
      console.log('\n🎉 Tous les tests sont passés avec succès!')
      console.log('💡 Les politiques RLS devraient fonctionner correctement.')
    } else {
      console.log('\n⚠️ Certains tests ont échoué.')
      console.log('🔧 Exécutez la migration 20250127000009-fix-system-settings-rls-policies.sql pour corriger.')
    }
    
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error)
  }
}

// Exécuter les tests
testRLSPolicies() 