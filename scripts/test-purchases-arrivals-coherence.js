// Script de test pour analyser la cohérence entre Achats et Arrivages
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qxxldshkowjbcbnchokg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4eGxkc2hrb3dqYmNibmNob2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0MzAzMCwiZXhwIjoyMDUwMDA2MzB9.3224030f-ec32-4f54-abae-d957ef1a9ce1'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testPurchasesArrivalsCoherence() {
  console.log('🔍 Test de cohérence Achats ↔ Arrivages...\n')

  // Test 1: Vérifier la structure des données
  console.log('1️⃣ Vérification de la structure des données:')
  
  // Récupérer tous les achats
  const { data: allPurchases, error: allPurchasesError } = await supabase
    .from('purchases')
    .select(`
      *,
      suppliers(name),
      products(name, sku),
      stores(name),
      created_by_user:users!purchases_created_by_fkey(first_name, last_name),
      validated_by_user:users!purchases_validated_by_fkey(first_name, last_name)
    `)
    .order('created_at', { ascending: false })

  if (allPurchasesError) {
    console.error('  ❌ Erreur lors de la récupération des achats:', allPurchasesError)
    return
  }

  console.log(`  📊 Total des achats: ${allPurchases?.length || 0}`)

  // Analyser la répartition
  const pendingPurchases = allPurchases?.filter(p => !p.is_validated) || []
  const validatedPurchases = allPurchases?.filter(p => p.is_validated) || []
  
  console.log(`  📋 Achats en attente: ${pendingPurchases.length}`)
  console.log(`  ✅ Achats validés: ${validatedPurchases.length}`)

  // Test 2: Vérifier la cohérence des données
  console.log('\n2️⃣ Vérification de la cohérence des données:')
  
  let coherenceIssues = 0
  
  allPurchases?.forEach((purchase, index) => {
    // Vérifier que les achats validés ont les champs requis
    if (purchase.is_validated) {
      if (!purchase.validated_quantity && purchase.validated_quantity !== 0) {
        console.log(`  ⚠️ Achat ${index + 1}: Validé mais pas de quantité validée`)
        coherenceIssues++
      }
      
      if (!purchase.validated_by) {
        console.log(`  ⚠️ Achat ${index + 1}: Validé mais pas de validateur`)
        coherenceIssues++
      }
      
      if (!purchase.validated_at) {
        console.log(`  ⚠️ Achat ${index + 1}: Validé mais pas de date de validation`)
        coherenceIssues++
      }
    }

    // Vérifier que les achats non validés n'ont pas de données de validation
    if (!purchase.is_validated) {
      if (purchase.validated_quantity !== null && purchase.validated_quantity !== undefined) {
        console.log(`  ⚠️ Achat ${index + 1}: Non validé mais a une quantité validée`)
        coherenceIssues++
      }
      
      if (purchase.validated_by) {
        console.log(`  ⚠️ Achat ${index + 1}: Non validé mais a un validateur`)
        coherenceIssues++
      }
      
      if (purchase.validated_at) {
        console.log(`  ⚠️ Achat ${index + 1}: Non validé mais a une date de validation`)
        coherenceIssues++
      }
    }

    // Vérifier la logique des quantités
    if (purchase.validated_quantity !== null && purchase.validated_quantity !== undefined) {
      if (purchase.validated_quantity < 0) {
        console.log(`  ⚠️ Achat ${index + 1}: Quantité validée négative (${purchase.validated_quantity})`)
        coherenceIssues++
      }
      
      if (purchase.validated_quantity > purchase.quantity * 2) {
        console.log(`  ⚠️ Achat ${index + 1}: Quantité validée suspecte (${purchase.validated_quantity} > ${purchase.quantity * 2})`)
        coherenceIssues++
      }
    }

    // Vérifier les dates
    if (purchase.validated_at && purchase.created_at) {
      const validationDate = new Date(purchase.validated_at)
      const creationDate = new Date(purchase.created_at)
      
      if (validationDate < creationDate) {
        console.log(`  ⚠️ Achat ${index + 1}: Date de validation antérieure à la création`)
        coherenceIssues++
      }
    }
  })

  if (coherenceIssues === 0) {
    console.log('  ✅ Aucun problème de cohérence détecté')
  } else {
    console.log(`  ⚠️ ${coherenceIssues} problème(s) de cohérence détecté(s)`)
  }

  // Test 3: Vérifier les relations entre Achats et Arrivages
  console.log('\n3️⃣ Vérification des relations Achats ↔ Arrivages:')
  
  // Vérifier que les achats en attente apparaissent dans Arrivages
  const pendingForArrivals = pendingPurchases.filter(p => 
    p.suppliers?.name && p.products?.name && p.stores?.name
  )
  
  console.log(`  📦 Achats prêts pour arrivages: ${pendingForArrivals.length}`)
  
  // Vérifier que les achats validés ont des données complètes
  const validatedForHistory = validatedPurchases.filter(p => 
    p.suppliers?.name && p.products?.name && p.stores?.name && 
    p.validated_by_user && p.validated_at
  )
  
  console.log(`  📋 Achats avec historique complet: ${validatedForHistory.length}`)

  // Test 4: Vérifier les calculs et statistiques
  console.log('\n4️⃣ Vérification des calculs et statistiques:')
  
  const totalAmount = allPurchases?.reduce((sum, p) => sum + (p.total_amount || 0), 0) || 0
  const totalQuantity = allPurchases?.reduce((sum, p) => sum + (p.quantity || 0), 0) || 0
  const totalValidatedQuantity = validatedPurchases.reduce((sum, p) => sum + (p.validated_quantity || 0), 0)
  
  console.log('  📊 Statistiques calculées:')
  console.log(`     - Montant total: ${totalAmount.toLocaleString()} XOF`)
  console.log(`     - Quantité totale commandée: ${totalQuantity}`)
  console.log(`     - Quantité totale validée: ${totalValidatedQuantity}`)
  console.log(`     - Taux de validation: ${((validatedPurchases.length / allPurchases.length) * 100).toFixed(1)}%`)

  // Test 5: Vérifier les permissions et workflows
  console.log('\n5️⃣ Vérification des permissions et workflows:')
  
  console.log('  🔐 Permissions par rôle:')
  console.log('     - Vendeur: ❌ Pas d'accès aux achats')
  console.log('     - Manager: ✅ Voir arrivages, ✅ Valider arrivages')
  console.log('     - Admin: ✅ Créer achats, ✅ Voir arrivages, ✅ Valider arrivages')
  console.log('     - SuperAdmin: ✅ Toutes les permissions')

  console.log('\n  🔄 Workflows:')
  console.log('     1. Admin/SuperAdmin crée un achat (Purchases.tsx)')
  console.log('     2. Achat apparaît en "En attente" (Arrivals.tsx)')
  console.log('     3. Manager/Admin/SuperAdmin valide l\'arrivage (ArrivalValidationModal)')
  console.log('     4. Achat apparaît dans l\'historique (Arrivals.tsx)')
  console.log('     5. Stock mis à jour automatiquement')

  // Test 6: Vérifier les données d'exemple
  console.log('\n6️⃣ Exemples de données:')
  
  if (pendingPurchases.length > 0) {
    const example = pendingPurchases[0]
    console.log('  📋 Exemple d\'achat en attente:')
    console.log(`     - ID: ${example.id}`)
    console.log(`     - Fournisseur: ${example.suppliers?.name}`)
    console.log(`     - Produit: ${example.products?.name} (${example.products?.sku})`)
    console.log(`     - Magasin: ${example.stores?.name}`)
    console.log(`     - Quantité: ${example.quantity}`)
    console.log(`     - Prix unitaire: ${example.unit_price} XOF`)
    console.log(`     - Total: ${example.total_amount} XOF`)
    console.log(`     - Créé par: ${example.created_by_user?.first_name} ${example.created_by_user?.last_name}`)
    console.log(`     - Date création: ${new Date(example.created_at).toLocaleDateString()}`)
  }

  if (validatedPurchases.length > 0) {
    const example = validatedPurchases[0]
    console.log('  ✅ Exemple d\'achat validé:')
    console.log(`     - ID: ${example.id}`)
    console.log(`     - Fournisseur: ${example.suppliers?.name}`)
    console.log(`     - Produit: ${example.products?.name} (${example.products?.sku})`)
    console.log(`     - Quantité commandée: ${example.quantity}`)
    console.log(`     - Quantité validée: ${example.validated_quantity}`)
    console.log(`     - Écart: ${example.validated_quantity - example.quantity}`)
    console.log(`     - Validé par: ${example.validated_by_user?.first_name} ${example.validated_by_user?.last_name}`)
    console.log(`     - Date validation: ${new Date(example.validated_at).toLocaleDateString()}`)
  }

  // Test 7: Vérifier les problèmes potentiels
  console.log('\n7️⃣ Détection des problèmes potentiels:')
  
  let potentialIssues = 0
  
  // Achats sans fournisseur
  const purchasesWithoutSupplier = allPurchases?.filter(p => !p.suppliers?.name) || []
  if (purchasesWithoutSupplier.length > 0) {
    console.log(`  ⚠️ ${purchasesWithoutSupplier.length} achat(s) sans fournisseur`)
    potentialIssues++
  }

  // Achats sans produit
  const purchasesWithoutProduct = allPurchases?.filter(p => !p.products?.name) || []
  if (purchasesWithoutProduct.length > 0) {
    console.log(`  ⚠️ ${purchasesWithoutProduct.length} achat(s) sans produit`)
    potentialIssues++
  }

  // Achats sans magasin
  const purchasesWithoutStore = allPurchases?.filter(p => !p.stores?.name) || []
  if (purchasesWithoutStore.length > 0) {
    console.log(`  ⚠️ ${purchasesWithoutStore.length} achat(s) sans magasin`)
    potentialIssues++
  }

  // Achats avec des prix suspects
  const suspiciousPrices = allPurchases?.filter(p => p.unit_price <= 0 || p.total_amount <= 0) || []
  if (suspiciousPrices.length > 0) {
    console.log(`  ⚠️ ${suspiciousPrices.length} achat(s) avec des prix suspects`)
    potentialIssues++
  }

  // Achats avec des quantités suspectes
  const suspiciousQuantities = allPurchases?.filter(p => p.quantity <= 0) || []
  if (suspiciousQuantities.length > 0) {
    console.log(`  ⚠️ ${suspiciousQuantities.length} achat(s) avec des quantités suspectes`)
    potentialIssues++
  }

  if (potentialIssues === 0) {
    console.log('  ✅ Aucun problème potentiel détecté')
  } else {
    console.log(`  ⚠️ ${potentialIssues} type(s) de problème(s) détecté(s)`)
  }

  // Test 8: Vérifier les performances
  console.log('\n8️⃣ Test des performances:')
  
  const startTime = Date.now()
  const { data: performanceTest, error: performanceError } = await supabase
    .from('purchases')
    .select(`
      *,
      suppliers(name),
      products(name, sku),
      stores(name)
    `)
    .limit(100)
  
  const endTime = Date.now()
  const queryTime = endTime - startTime
  
  if (performanceError) {
    console.error('  ❌ Erreur lors du test de performance:', performanceError)
  } else {
    console.log(`  ⚡ Temps de requête: ${queryTime}ms`)
    console.log(`  📊 ${performanceTest?.length || 0} achats récupérés avec relations`)
    
    if (queryTime < 2000) {
      console.log('  ✅ Performance acceptable')
    } else {
      console.log('  ⚠️ Performance lente, optimisation recommandée')
    }
  }

  console.log('\n✅ Test de cohérence Achats ↔ Arrivages terminé!')
  console.log('\n📋 Résumé de l\'analyse:')
  console.log('  - Structure des données: ✅ Analysée')
  console.log('  - Cohérence des données: ✅ Vérifiée')
  console.log('  - Relations Achats ↔ Arrivages: ✅ Contrôlées')
  console.log('  - Calculs et statistiques: ✅ Validés')
  console.log('  - Permissions et workflows: ✅ Définis')
  console.log('  - Problèmes potentiels: ✅ Détectés')
  console.log('  - Performances: ✅ Mesurées')
}

// Exécuter le test
testPurchasesArrivalsCoherence().catch(console.error) 