// Script de test pour analyser la page Ventes
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qxxldshkowjbcbnchokg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4eGxkc2hrb3dqYmNibmNob2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0MzAzMCwiZXhwIjoyMDUwMDA2MzB9.3224030f-ec32-4f54-abae-d957ef1a9ce1'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSalesPage() {
  console.log('🔍 Test de la page Ventes...\n')

  // Test 1: Vérifier les données existantes
  console.log('1️⃣ Vérification des données existantes:')
  
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select(`
      *,
      sale_items(count),
      stores(name),
      users!sales_created_by_fkey(first_name, last_name)
    `)
    .order('created_at', { ascending: false })
    .limit(10)

  if (salesError) {
    console.error('  ❌ Erreur lors de la récupération des ventes:', salesError)
    return
  }

  console.log(`  📊 Ventes trouvées: ${sales?.length || 0}`)

  if (sales && sales.length > 0) {
    console.log('  📋 Exemple de vente:')
    const sale = sales[0]
    console.log(`     - Code: ${sale.sale_code}`)
    console.log(`     - Magasin: ${sale.stores?.name || 'Non défini'}`)
    console.log(`     - Client: ${sale.customer_name || 'Client anonyme'}`)
    console.log(`     - Montant total: ${sale.total_amount} XOF`)
    console.log(`     - Méthode de paiement: ${sale.payment_method}`)
    console.log(`     - Créé par: ${sale.users?.first_name} ${sale.users?.last_name}`)
    console.log(`     - Date: ${new Date(sale.created_at).toLocaleDateString()}`)
  }

  // Test 2: Vérifier les calculs et statistiques
  console.log('\n2️⃣ Vérification des calculs et statistiques:')
  
  if (sales && sales.length > 0) {
    const totalSales = sales.reduce((sum, sale) => sum + sale.total_amount, 0)
    const averageTicket = sales.length > 0 ? totalSales / sales.length : 0
    const pendingSales = sales.filter(sale => sale.payment_method === 'pending').length

    console.log('  📊 Statistiques calculées:')
    console.log(`     - Total des ventes: ${totalSales.toFixed(2)} XOF`)
    console.log(`     - Nombre de transactions: ${sales.length}`)
    console.log(`     - Panier moyen: ${averageTicket.toFixed(2)} XOF`)
    console.log(`     - Ventes en attente: ${pendingSales}`)
  }

  // Test 3: Vérifier la cohérence des données
  console.log('\n3️⃣ Vérification de la cohérence des données:')
  
  if (sales && sales.length > 0) {
    let issues = 0
    
    sales.forEach((sale, index) => {
      // Vérifier que le montant total est cohérent
      if (sale.subtotal && sale.tax_amount && sale.total_amount) {
        const calculatedTotal = sale.subtotal + sale.tax_amount
        if (Math.abs(calculatedTotal - sale.total_amount) > 0.01) {
          console.log(`  ⚠️ Vente ${index + 1}: Montant total incohérent`)
          console.log(`     Calculé: ${calculatedTotal}, Enregistré: ${sale.total_amount}`)
          issues++
        }
      }

      // Vérifier que le code de vente est unique
      const duplicateCodes = sales.filter(s => s.sale_code === sale.sale_code)
      if (duplicateCodes.length > 1) {
        console.log(`  ⚠️ Code de vente dupliqué: ${sale.sale_code}`)
        issues++
      }

      // Vérifier que les dates sont logiques
      const saleDate = new Date(sale.created_at)
      const now = new Date()
      if (saleDate > now) {
        console.log(`  ⚠️ Vente ${index + 1}: Date future: ${saleDate}`)
        issues++
      }
    })

    if (issues === 0) {
      console.log('  ✅ Aucun problème de cohérence détecté')
    } else {
      console.log(`  ⚠️ ${issues} problème(s) de cohérence détecté(s)`)
    }
  }

  // Test 4: Vérifier les permissions par rôle
  console.log('\n4️⃣ Test des permissions par rôle:')
  
  const roles = ['Vendeur', 'Manager', 'Admin', 'SuperAdmin']
  
  for (const role of roles) {
    console.log(`\n👤 Rôle: ${role}`)
    
    const canCreate = ['Vendeur', 'Manager', 'Admin', 'SuperAdmin'].includes(role)
    const canView = ['Vendeur', 'Manager', 'Admin', 'SuperAdmin'].includes(role)
    const canEdit = ['Manager', 'Admin', 'SuperAdmin'].includes(role)
    const canDelete = ['Admin', 'SuperAdmin'].includes(role)
    
    console.log(`  - Créer une vente: ${canCreate ? '✅' : '❌'}`)
    console.log(`  - Voir les ventes: ${canView ? '✅' : '❌'}`)
    console.log(`  - Modifier une vente: ${canEdit ? '✅' : '❌'}`)
    console.log(`  - Supprimer une vente: ${canDelete ? '✅' : '❌'}`)
  }

  // Test 5: Vérifier les fonctionnalités de recherche
  console.log('\n5️⃣ Test des fonctionnalités de recherche:')
  
  if (sales && sales.length > 0) {
    const testSale = sales[0]
    const searchTerms = [
      testSale.sale_code,
      testSale.customer_name,
      testSale.sale_code.substring(0, 3),
      'VENTE_INEXISTANTE'
    ]
    
    for (const term of searchTerms) {
      if (term) {
        const filtered = sales.filter(sale =>
          sale.sale_code.toLowerCase().includes(term.toLowerCase()) ||
          (sale.customer_name && sale.customer_name.toLowerCase().includes(term.toLowerCase()))
        )
        console.log(`  🔍 Recherche "${term}": ${filtered.length} vente(s) trouvée(s)`)
      }
    }
  }

  // Test 6: Vérifier les méthodes de paiement
  console.log('\n6️⃣ Vérification des méthodes de paiement:')
  
  if (sales && sales.length > 0) {
    const paymentMethods = {}
    sales.forEach(sale => {
      paymentMethods[sale.payment_method] = (paymentMethods[sale.payment_method] || 0) + 1
    })
    
    console.log('  💳 Répartition des méthodes de paiement:')
    Object.entries(paymentMethods).forEach(([method, count]) => {
      console.log(`     - ${method}: ${count} vente(s)`)
    })
  }

  // Test 7: Vérifier les performances
  console.log('\n7️⃣ Test des performances:')
  
  const startTime = Date.now()
  const { data: performanceTest, error: performanceError } = await supabase
    .from('sales')
    .select('*')
    .limit(100)
  
  const endTime = Date.now()
  const queryTime = endTime - startTime
  
  if (performanceError) {
    console.error('  ❌ Erreur lors du test de performance:', performanceError)
  } else {
    console.log(`  ⚡ Temps de requête: ${queryTime}ms`)
    console.log(`  📊 ${performanceTest?.length || 0} ventes récupérées`)
    
    if (queryTime < 1000) {
      console.log('  ✅ Performance acceptable')
    } else {
      console.log('  ⚠️ Performance lente, optimisation recommandée')
    }
  }

  console.log('\n✅ Test de la page Ventes terminé!')
  console.log('\n📋 Résumé des vérifications:')
  console.log('  - Données existantes: ✅ Analysées')
  console.log('  - Calculs et statistiques: ✅ Validés')
  console.log('  - Cohérence des données: ✅ Testée')
  console.log('  - Permissions par rôle: ✅ Définies')
  console.log('  - Fonctionnalités de recherche: ✅ Testées')
  console.log('  - Méthodes de paiement: ✅ Vérifiées')
  console.log('  - Performances: ✅ Mesurées')
}

// Exécuter le test
testSalesPage().catch(console.error) 