// Script de diagnostic rapide RLS
// Vérifie l'état actuel des politiques et permissions

import { createClient } from '@supabase/supabase-js'

// Configuration directe (sans dotenv)
const supabaseUrl = 'https://qxxldshkowjbcbnchokg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4eGxkc2hrb3dqYmNibmNob2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI5NzE5NzAsImV4cCI6MjA0ODU0Nzk3MH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'

if (!supabaseKey || supabaseKey.includes('Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8')) {
  console.error('❌ Clé Supabase invalide ou manquante')
  console.log('💡 Vérifiez votre configuration Supabase')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function quickRLSCheck() {
  console.log('🔍 Diagnostic RLS Rapide\n')
  
  try {
    // Test 1: Vérifier l'accès à la table system_settings
    console.log('📋 Test 1: Accès à system_settings')
    
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .limit(3)
    
    if (settingsError) {
      console.error('❌ Erreur d\'accès:', settingsError.message)
      console.log('💡 Problème: Politiques RLS trop restrictives ou table inexistante')
    } else {
      console.log(`✅ Accès réussi - ${settings.length} configurations trouvées`)
    }
    
    // Test 2: Vérifier les utilisateurs
    console.log('\n👥 Test 2: Utilisateurs Admin/SuperAdmin')
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('email, role')
      .in('role', ['Admin', 'SuperAdmin'])
    
    if (usersError) {
      console.error('❌ Erreur d\'accès aux utilisateurs:', usersError.message)
    } else {
      console.log(`✅ ${users.length} utilisateurs Admin/SuperAdmin trouvés:`)
      users.forEach(user => {
        console.log(`   - ${user.email} (${user.role})`)
      })
      
      if (users.length === 0) {
        console.log('⚠️ ATTENTION: Aucun Admin/SuperAdmin - impossible de modifier les configurations')
      }
    }
    
    // Test 3: Tentative de modification (sans authentification)
    console.log('\n✏️ Test 3: Tentative de modification (sans auth)')
    
    const { error: updateError } = await supabase
      .from('system_settings')
      .update({ setting_value: 'test' })
      .eq('setting_key', 'currency.default')
    
    if (updateError) {
      console.log('✅ Politiques RLS fonctionnent (modification bloquée comme attendu)')
      console.log(`   Erreur attendue: ${updateError.message}`)
    } else {
      console.log('⚠️ ATTENTION: Modification réussie sans authentification!')
    }
    
    // Résumé
    console.log('\n📋 Résumé du Diagnostic:')
    console.log('   - Accès lecture:', settingsError ? '❌ ÉCHEC' : '✅ OK')
    console.log('   - Utilisateurs Admin:', users.length > 0 ? '✅ TROUVÉS' : '❌ MANQUANTS')
    console.log('   - Politiques RLS:', updateError ? '✅ ACTIVES' : '❌ INACTIVES')
    
    if (settingsError || users.length === 0) {
      console.log('\n🚨 PROBLÈMES DÉTECTÉS:')
      if (settingsError) {
        console.log('   - Politiques RLS trop restrictives')
        console.log('   - Solution: Exécuter la migration d\'urgence')
      }
      if (users.length === 0) {
        console.log('   - Aucun utilisateur Admin/SuperAdmin')
        console.log('   - Solution: Créer un utilisateur Admin')
      }
    } else {
      console.log('\n✅ Diagnostic réussi - Politiques RLS fonctionnelles')
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error.message)
  }
}

// Exécuter le diagnostic
quickRLSCheck() 