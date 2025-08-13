const { createClient } = require('@supabase/supabase-js')

// Configuration Supabase (à adapter selon votre environnement)
const supabaseUrl = process.env.SUPABASE_URL || 'your-supabase-url'
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'your-service-key'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDashboardStockAlerts() {
  console.log('🔍 Test des Alertes de Stock du Dashboard...\n')

  try {
    // 1. Vérifier la structure des données
    console.log('📊 1. Vérification de la structure des données...')
    
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, sku, alert_stock')
      .limit(5)

    if (productsError) {
      console.error('❌ Erreur produits:', productsError)
    } else {
      console.log(`✅ ${products?.length || 0} produits récupérés`)
      products?.forEach(p => {
        console.log(`   - ${p.name} (${p.sku}): alert_stock=${p.alert_stock}`)
      })
    }

    // 2. Vérifier les product_stores
    console.log('\n📦 2. Vérification des stocks par magasin...')
    
    const { data: productStores, error: productStoresError } = await supabase
      .from('product_stores')
      .select(`
        id,
        current_stock,
        min_stock,
        products (
          id,
          name,
          sku,
          alert_stock
        ),
        stores (
          name
        )
      `)
      .limit(10)

    if (productStoresError) {
      console.error('❌ Erreur product_stores:', productStoresError)
    } else {
      console.log(`✅ ${productStores?.length || 0} relations produit-magasin récupérées`)
      productStores?.forEach(ps => {
        const product = ps.products
        const store = ps.stores
        console.log(`   - ${product?.name || 'N/A'} @ ${store?.name || 'N/A'}: stock=${ps.current_stock}, seuil=${product?.alert_stock || ps.min_stock || 10}`)
      })
    }

    // 3. Calculer les alertes de stock
    console.log('\n🚨 3. Calcul des alertes de stock...')
    
    const lowStockItems = productStores?.filter(item => 
      item.current_stock <= (item.products?.alert_stock || item.min_stock || 10)
    ).map(item => ({
      id: item.id,
      name: item.products?.name || 'Produit inconnu',
      sku: item.products?.sku || 'SKU inconnu',
      current_stock: item.current_stock,
      alert_stock: item.products?.alert_stock || item.min_stock || 10,
      store_name: item.stores?.name || 'Magasin inconnu'
    })) || []

    console.log(`✅ ${lowStockItems.length} produits en alerte de stock`)
    lowStockItems.forEach(item => {
      console.log(`   🚨 ${item.name} (${item.sku}) @ ${item.store_name}: ${item.current_stock}/${item.alert_stock}`)
    })

    // 4. Simuler une alerte de stock
    console.log('\n🧪 4. Simulation d''une alerte de stock...')
    
    if (productStores && productStores.length > 0) {
      const testItem = productStores[0]
      const testProduct = testItem.products
      const testStore = testItem.stores
      
      if (testProduct && testStore) {
        // Mettre à jour le stock pour créer une alerte
        const { error: updateError } = await supabase
          .from('product_stores')
          .update({ current_stock: 5 })
          .eq('id', testItem.id)

        if (updateError) {
          console.error('❌ Erreur mise à jour stock:', updateError)
        } else {
          console.log(`✅ Stock mis à jour pour ${testProduct.name} @ ${testStore.name}: 5`)
          
          // Mettre à jour le seuil d'alerte
          const { error: alertError } = await supabase
            .from('products')
            .update({ alert_stock: 10 })
            .eq('id', testProduct.id)

          if (alertError) {
            console.error('❌ Erreur mise à jour seuil:', alertError)
          } else {
            console.log(`✅ Seuil d'alerte mis à jour pour ${testProduct.name}: 10`)
          }
        }
      }
    }

    // 5. Vérifier le résultat final
    console.log('\n📋 5. Vérification finale...')
    
    const { data: finalCheck, error: finalError } = await supabase
      .from('product_stores')
      .select(`
        current_stock,
        products (
          name,
          alert_stock
        ),
        stores (
          name
        )
      `)
      .eq('id', productStores?.[0]?.id)

    if (finalError) {
      console.error('❌ Erreur vérification finale:', finalError)
    } else if (finalCheck && finalCheck.length > 0) {
      const item = finalCheck[0]
      const isAlert = item.current_stock <= (item.products?.alert_stock || 10)
      console.log(`✅ Vérification: ${item.products?.name} @ ${item.stores?.name}`)
      console.log(`   Stock: ${item.current_stock}, Seuil: ${item.products?.alert_stock || 10}`)
      console.log(`   Alerte: ${isAlert ? '🚨 ACTIVE' : '✅ OK'}`)
    }

    console.log('\n🎉 Test des alertes de stock terminé !')
    
    // Résumé
    console.log('\n📊 RÉSUMÉ:')
    console.log(`   - Produits total: ${products?.length || 0}`)
    console.log(`   - Relations produit-magasin: ${productStores?.length || 0}`)
    console.log(`   - Alertes de stock: ${lowStockItems.length}`)
    console.log(`   - Test d'alerte: ${lowStockItems.length > 0 ? '✅ Réussi' : '❌ Échec'}`)

  } catch (error) {
    console.error('❌ Erreur générale:', error)
  }
}

// Exécuter le test
if (require.main === module) {
  testDashboardStockAlerts()
}

module.exports = { testDashboardStockAlerts }
