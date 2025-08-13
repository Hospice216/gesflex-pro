// Script de diagnostic RLS simplifié
// Vérifie l'état actuel des politiques et permissions

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Lire le fichier .env
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '..', '.env')

let supabaseUrl, supabaseKey

try {
  const envContent = readFileSync(envPath, 'utf8')
  const envLines = envContent.split('\n')
  
  for (const line of envLines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim()
    }
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
      supabaseKey = line.split('=')[1].trim()
    }
  }
} catch (error) {
  console.error('❌ Impossible de lire le fichier .env:', error.message)
  process.exit(1)
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables Supabase manquantes dans .env')
  console.log('💡 Vérifiez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function simpleRLSCheck() {
  console.log('🔍 Diagnostic RLS Simplifié\n')
  
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
simpleRLSCheck() 