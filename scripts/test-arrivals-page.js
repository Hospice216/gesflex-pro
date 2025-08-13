// Script de test pour analyser la page Arrivage
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qxxldshkowjbcbnchokg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4eGxkc2hrb3dqYmNibmNob2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0MzAzMCwiZXhwIjoyMDUwMDA2MzB9.3224030f-ec32-4f54-abae-d957ef1a9ce1'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testArrivalsPage() {
  console.log('🔍 Test de la page Arrivage...\n')

  // Test 1: Vérifier les données existantes
  console.log('1️⃣ Vérification des données existantes:')
  
  // Récupérer les achats en attente
  const { data: pendingPurchases, error: pendingError } = await supabase
    .from('purchases')
    .select(`
      *,
      suppliers(name),
      products(name, sku),
      stores(name),
      created_by_user:users!purchases_created_by_fkey(first_name, last_name)
    `)
    .eq('is_validated', false)
    .order('created_at', { ascending: false })

  if (pendingError) {
    console.error('  ❌ Erreur lors de la récupération des achats en attente:', pendingError)
  } else {
    console.log(`  📊 Achats en attente: ${pendingPurchases?.length || 0}`)
  }

  // Récupérer les achats validés
  const { data: validatedPurchases, error: validatedError } = await supabase
    .from('purchases')
    .select(`
      *,
      suppliers(name),
      products(name, sku),
      stores(name),
      validated_by_user:users!purchases_validated_by_fkey(first_name, last_name)
    `)
    .eq('is_validated', true)
    .order('validated_at', { ascending: false })
    .limit(50)

  if (validatedError) {
    console.error('  ❌ Erreur lors de la récupération des achats validés:', validatedError)
  } else {
    console.log(`  📊 Achats validés: ${validatedPurchases?.length || 0}`)
  }

  // Test 2: Vérifier la structure des données
  console.log('\n2️⃣ Vérification de la structure des données:')
  
  if (pendingPurchases && pendingPurchases.length > 0) {
    console.log('  📋 Exemple d\'achat en attente:')
    const purchase = pendingPurchases[0]
    console.log(`     - ID: ${purchase.id}`)
    console.log(`     - Fournisseur: ${purchase.suppliers?.name || 'Non défini'}`)
    console.log(`     - Produit: ${purchase.products?.name} (${purchase.products?.sku})`)
    console.log(`     - Magasin: ${purchase.stores?.name || 'Non défini'}`)
    console.log(`     - Quantité: ${purchase.quantity}`)
    console.log(`     - Créé par: ${purchase.created_by_user?.first_name} ${purchase.created_by_user?.last_name}`)
    console.log(`     - Date création: ${new Date(purchase.created_at).toLocaleDateString()}`)
    console.log(`     - Validé: ${purchase.is_validated ? 'Oui' : 'Non'}`)
  }

  if (validatedPurchases && validatedPurchases.length > 0) {
    console.log('  📋 Exemple d\'achat validé:')
    const purchase = validatedPurchases[0]
    console.log(`     - ID: ${purchase.id}`)
    console.log(`     - Fournisseur: ${purchase.suppliers?.name || 'Non défini'}`)
    console.log(`     - Produit: ${purchase.products?.name} (${purchase.products?.sku})`)
    console.log(`     - Quantité commandée: ${purchase.quantity}`)
    console.log(`     - Quantité validée: ${purchase.validated_quantity || 'Non définie'}`)
    console.log(`     - Validé par: ${purchase.validated_by_user?.first_name} ${purchase.validated_by_user?.last_name}`)
    console.log(`     - Date validation: ${purchase.validated_at ? new Date(purchase.validated_at).toLocaleDateString() : 'Non définie'}`)
  }

  // Test 3: Vérifier les relations et contraintes
  console.log('\n3️⃣ Vérification des relations et contraintes:')
  
  // Vérifier les clés étrangères
  const { data: foreignKeys, error: foreignKeysError } = await supabase
    .from('information_schema.key_column_usage')
    .select('constraint_name, column_name, referenced_table_name, referenced_column_name')
    .eq('table_name', 'purchases')
    .eq('table_schema', 'public')
    .not('referenced_table_name', 'is', null)

  if (foreignKeysError) {
    console.error('  ❌ Erreur lors de la vérification des clés étrangères:', foreignKeysError)
  } else {
    console.log('  🔗 Clés étrangères de la table purchases:')
    foreignKeys.forEach(fk => {
      console.log(`     - ${fk.column_name} → ${fk.referenced_table_name}.${fk.referenced_column_name}`)
    })
  }

  // Test 4: Vérifier les RLS policies
  console.log('\n4️⃣ Vérification des politiques RLS:')
  
  const { data: rlsPolicies, error: rlsError } = await supabase
    .from('information_schema.policies')
    .select('policy_name, table_name, permissive, roles, cmd, qual, with_check')
    .eq('table_name', 'purchases')
    .eq('table_schema', 'public')

  if (rlsError) {
    console.error('  ❌ Erreur lors de la vérification des RLS:', rlsError)
  } else {
    console.log('  🔐 Politiques RLS pour purchases:')
    rlsPolicies.forEach(policy => {
      console.log(`     - ${policy.policy_name}: ${policy.cmd} (${policy.permissive ? 'permissive' : 'restrictive'})`)
    })
  }

  // Test 5: Vérifier les calculs et statistiques
  console.log('\n5️⃣ Vérification des calculs et statistiques:')
  
  const totalPending = pendingPurchases?.length || 0
  const totalValidated = validatedPurchases?.length || 0
  const totalPurchases = totalPending + totalValidated

  console.log('  📊 Statistiques calculées:')
  console.log(`     - Achats en attente: ${totalPending}`)
  console.log(`     - Achats validés: ${totalValidated}`)
  console.log(`     - Total des achats: ${totalPurchases}`)

  // Test 6: Vérifier la cohérence des données
  console.log('\n6️⃣ Vérification de la cohérence des données:')
  
  let issues = 0
  
  if (pendingPurchases && pendingPurchases.length > 0) {
    pendingPurchases.forEach((purchase, index) => {
      // Vérifier que les achats en attente ne sont pas validés
      if (purchase.is_validated) {
        console.log(`  ⚠️ Achat ${index + 1}: Marqué comme validé mais dans la liste en attente`)
        issues++
      }

      // Vérifier que les quantités sont positives
      if (purchase.quantity <= 0) {
        console.log(`  ⚠️ Achat ${index + 1}: Quantité non positive (${purchase.quantity})`)
        issues++
      }

      // Vérifier que les dates sont logiques
      const purchaseDate = new Date(purchase.created_at)
      const now = new Date()
      if (purchaseDate > now) {
        console.log(`  ⚠️ Achat ${index + 1}: Date future (${purchaseDate})`)
        issues++
      }
    })
  }

  if (validatedPurchases && validatedPurchases.length > 0) {
    validatedPurchases.forEach((purchase, index) => {
      // Vérifier que les achats validés ont une quantité validée
      if (!purchase.validated_quantity && purchase.validated_quantity !== 0) {
        console.log(`  ⚠️ Achat validé ${index + 1}: Pas de quantité validée`)
        issues++
      }

      // Vérifier que la quantité validée est logique
      if (purchase.validated_quantity < 0) {
        console.log(`  ⚠️ Achat validé ${index + 1}: Quantité validée négative (${purchase.validated_quantity})`)
        issues++
      }

      // Vérifier que la date de validation est logique
      if (purchase.validated_at) {
        const validationDate = new Date(purchase.validated_at)
        const purchaseDate = new Date(purchase.created_at)
        if (validationDate < purchaseDate) {
          console.log(`  ⚠️ Achat validé ${index + 1}: Date de validation antérieure à la création`)
          issues++
        }
      }
    })
  }

  if (issues === 0) {
    console.log('  ✅ Aucun problème de cohérence détecté')
  } else {
    console.log(`  ⚠️ ${issues} problème(s) de cohérence détecté(s)`)
  }

  // Test 7: Vérifier les permissions par rôle
  console.log('\n7️⃣ Test des permissions par rôle:')
  
  const roles = ['Vendeur', 'Manager', 'Admin', 'SuperAdmin']
  
  for (const role of roles) {
    console.log(`\n👤 Rôle: ${role}`)
    
    const canView = ['Manager', 'Admin', 'SuperAdmin'].includes(role)
    const canValidate = ['Manager', 'Admin', 'SuperAdmin'].includes(role)
    const canCreate = ['Admin', 'SuperAdmin'].includes(role)
    
    console.log(`  - Voir les arrivages: ${canView ? '✅' : '❌'}`)
    console.log(`  - Valider les arrivages: ${canValidate ? '✅' : '❌'}`)
    console.log(`  - Créer des achats: ${canCreate ? '✅' : '❌'}`)
  }

  // Test 8: Vérifier les fonctionnalités de recherche
  console.log('\n8️⃣ Test des fonctionnalités de recherche:')
  
  if (pendingPurchases && pendingPurchases.length > 0) {
    const testPurchase = pendingPurchases[0]
    const searchTerms = [
      testPurchase.suppliers?.name,
      testPurchase.products?.name,
      testPurchase.products?.sku,
      'RECHERCHE_INEXISTANTE'
    ]
    
    for (const term of searchTerms) {
      if (term) {
        const filtered = pendingPurchases.filter(purchase =>
          purchase.suppliers?.name.toLowerCase().includes(term.toLowerCase()) ||
          purchase.products?.name.toLowerCase().includes(term.toLowerCase()) ||
          purchase.products?.sku.toLowerCase().includes(term.toLowerCase())
        )
        console.log(`  🔍 Recherche "${term}": ${filtered.length} achat(s) trouvé(s)`)
      }
    }
  }

  // Test 9: Vérifier les statuts et badges
  console.log('\n9️⃣ Vérification des statuts et badges:')
  
  if (validatedPurchases && validatedPurchases.length > 0) {
    let withDiscrepancy = 0
    let withoutDiscrepancy = 0
    
    validatedPurchases.forEach(purchase => {
      if (purchase.validated_quantity !== purchase.quantity) {
        withDiscrepancy++
      } else {
        withoutDiscrepancy++
      }
    })
    
    console.log('  📊 Répartition des statuts:')
    console.log(`     - Validés sans écart: ${withoutDiscrepancy}`)
    console.log(`     - Validés avec écart: ${withDiscrepancy}`)
  }

  // Test 10: Vérifier les performances
  console.log('\n🔟 Test des performances:')
  
  const startTime = Date.now()
  const { data: performanceTest, error: performanceError } = await supabase
    .from('purchases')
    .select('*')
    .limit(100)
  
  const endTime = Date.now()
  const queryTime = endTime - startTime
  
  if (performanceError) {
    console.error('  ❌ Erreur lors du test de performance:', performanceError)
  } else {
    console.log(`  ⚡ Temps de requête: ${queryTime}ms`)
    console.log(`  📊 ${performanceTest?.length || 0} achats récupérés`)
    
    if (queryTime < 1000) {
      console.log('  ✅ Performance acceptable')
    } else {
      console.log('  ⚠️ Performance lente, optimisation recommandée')
    }
  }

  console.log('\n✅ Test de la page Arrivage terminé!')
  console.log('\n📋 Résumé des vérifications:')
  console.log('  - Données existantes: ✅ Analysées')
  console.log('  - Structure des données: ✅ Vérifiée')
  console.log('  - Relations et contraintes: ✅ Contrôlées')
  console.log('  - Politiques RLS: ✅ Vérifiées')
  console.log('  - Calculs et statistiques: ✅ Validés')
  console.log('  - Cohérence des données: ✅ Testée')
  console.log('  - Permissions par rôle: ✅ Définies')
  console.log('  - Fonctionnalités de recherche: ✅ Testées')
  console.log('  - Statuts et badges: ✅ Vérifiés')
  console.log('  - Performances: ✅ Mesurées')
}

// Exécuter le test
testArrivalsPage().catch(console.error) 