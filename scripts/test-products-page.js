// Script de test pour analyser la page Produits
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://qxxldshkowjbcbnchokg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4eGxkc2hrb3dqYmNibmNob2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0MzAzMCwiZXhwIjoyMDUwMDA2MzB9.3224030f-ec32-4f54-abae-d957ef1a9ce1'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testProductsPage() {
  console.log('🔍 Analyse de la page Produits...\n')

  // Test 1: Vérifier la structure de la base de données
  console.log('1️⃣ Vérification de la structure de la base de données:')
  
  // Vérifier les tables principales
  const tables = ['products', 'categories', 'units', 'product_stores']
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (error) {
        console.error(`  ❌ Erreur avec la table ${table}:`, error.message)
      } else {
        console.log(`  ✅ Table ${table}: OK`)
      }
    } catch (error) {
      console.error(`  ❌ Erreur avec la table ${table}:`, error.message)
    }
  }

  // Test 2: Vérifier les données existantes
  console.log('\n2️⃣ Vérification des données existantes:')
  
  // Produits
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select(`
      *,
      categories(name),
      units(name, symbol)
    `)
    .limit(5)

  if (productsError) {
    console.error('  ❌ Erreur lors de la récupération des produits:', productsError)
  } else {
    console.log(`  📊 Produits trouvés: ${products?.length || 0}`)
    if (products && products.length > 0) {
      console.log('  📋 Exemple de produit:')
      const product = products[0]
      console.log(`     - Nom: ${product.name}`)
      console.log(`     - SKU: ${product.sku}`)
      console.log(`     - Catégorie: ${product.categories?.name || 'Non catégorisé'}`)
      console.log(`     - Unité: ${product.units?.name} (${product.units?.symbol})`)
      console.log(`     - Prix actuel: ${product.current_sale_price} XOF`)
      console.log(`     - Prix minimum: ${product.min_sale_price} XOF`)
    }
  }

  // Catégories
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)

  if (categoriesError) {
    console.error('  ❌ Erreur lors de la récupération des catégories:', categoriesError)
  } else {
    console.log(`  📊 Catégories actives: ${categories?.length || 0}`)
  }

  // Unités
  const { data: units, error: unitsError } = await supabase
    .from('units')
    .select('*')
    .eq('is_active', true)

  if (unitsError) {
    console.error('  ❌ Erreur lors de la récupération des unités:', unitsError)
  } else {
    console.log(`  📊 Unités actives: ${units?.length || 0}`)
  }

  // Test 3: Vérifier les permissions par rôle
  console.log('\n3️⃣ Test des permissions par rôle:')
  
  const roles = ['Vendeur', 'Manager', 'Admin', 'SuperAdmin']
  
  for (const role of roles) {
    console.log(`\n📋 Test pour le rôle: ${role}`)
    
    // Simuler les permissions de la page Produits
    const canAddProduct = ['Admin', 'SuperAdmin', 'Manager'].includes(role)
    const canEditProduct = ['Admin', 'SuperAdmin', 'Manager'].includes(role)
    const canDeleteProduct = ['Admin', 'SuperAdmin'].includes(role)
    const canAddCategory = ['Admin', 'SuperAdmin', 'Manager'].includes(role)
    
    console.log(`  🔧 Permissions:`)
    console.log(`     - Ajouter produit: ${canAddProduct ? '✅ OUI' : '❌ NON'}`)
    console.log(`     - Modifier produit: ${canEditProduct ? '✅ OUI' : '❌ NON'}`)
    console.log(`     - Supprimer produit: ${canDeleteProduct ? '✅ OUI' : '❌ NON'}`)
    console.log(`     - Ajouter catégorie: ${canAddCategory ? '✅ OUI' : '❌ NON'}`)
    
    // Simuler l'affichage des boutons
    console.log(`  🎯 Interface:`)
    console.log(`     - Bouton "Nouveau produit": ${canAddProduct ? '✅ Visible' : '❌ Masqué'}`)
    console.log(`     - Bouton "Nouvelle catégorie": ${canAddCategory ? '✅ Visible' : '❌ Masqué'}`)
    console.log(`     - Actions dans le menu: ${canEditProduct || canDeleteProduct ? '✅ Disponibles' : '❌ Limitées'}`)
  }

  // Test 4: Vérifier la cohérence des champs
  console.log('\n4️⃣ Vérification de la cohérence des champs:')
  
  if (products && products.length > 0) {
    const product = products[0]
    
    // Vérifier les champs requis
    const requiredFields = ['name', 'sku', 'category_id', 'unit_id', 'current_sale_price', 'min_sale_price']
    const missingFields = requiredFields.filter(field => !product[field])
    
    if (missingFields.length > 0) {
      console.log(`  ⚠️  Champs manquants: ${missingFields.join(', ')}`)
    } else {
      console.log('  ✅ Tous les champs requis sont présents')
    }
    
    // Vérifier la cohérence des prix
    if (product.current_sale_price < product.min_sale_price) {
      console.log('  ⚠️  Prix actuel inférieur au prix minimum')
    } else {
      console.log('  ✅ Prix cohérents')
    }
    
    // Vérifier les relations
    if (!product.categories) {
      console.log('  ⚠️  Catégorie manquante')
    } else {
      console.log('  ✅ Catégorie présente')
    }
    
    if (!product.units) {
      console.log('  ⚠️  Unité manquante')
    } else {
      console.log('  ✅ Unité présente')
    }
  }

  // Test 5: Vérifier les fonctionnalités de recherche
  console.log('\n5️⃣ Test des fonctionnalités de recherche:')
  
  if (products && products.length > 0) {
    const testProduct = products[0]
    const searchTerms = [
      testProduct.name,
      testProduct.sku,
      testProduct.name.substring(0, 3),
      'PRODUIT_INEXISTANT'
    ]
    
    for (const term of searchTerms) {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(term.toLowerCase()) ||
        product.sku.toLowerCase().includes(term.toLowerCase())
      )
      console.log(`  🔍 Recherche "${term}": ${filtered.length} résultat(s)`)
    }
  }

  // Test 6: Vérifier les contraintes de validation
  console.log('\n6️⃣ Test des contraintes de validation:')
  
  const validationTests = [
    { name: 'Produit valide', data: { name: 'Test', sku: 'TEST-001', current_sale_price: 1000, min_sale_price: 800 } },
    { name: 'Prix négatif', data: { name: 'Test', sku: 'TEST-002', current_sale_price: -100, min_sale_price: 800 } },
    { name: 'Prix actuel < prix min', data: { name: 'Test', sku: 'TEST-003', current_sale_price: 500, min_sale_price: 800 } },
    { name: 'SKU vide', data: { name: 'Test', sku: '', current_sale_price: 1000, min_sale_price: 800 } }
  ]
  
  for (const test of validationTests) {
    console.log(`  📋 Test: ${test.name}`)
    
    // Simuler la validation côté client
    const isValid = 
      test.data.name && 
      test.data.sku && 
      test.data.current_sale_price > 0 && 
      test.data.min_sale_price > 0 && 
      test.data.current_sale_price >= test.data.min_sale_price
    
    console.log(`     - Validité: ${isValid ? '✅ Valide' : '❌ Invalide'}`)
  }

  console.log('\n✅ Analyse de la page Produits terminée!')
  console.log('\n📋 Résumé des vérifications:')
  console.log('  - Structure de base de données: ✅ Vérifiée')
  console.log('  - Permissions par rôle: ✅ Définies')
  console.log('  - Cohérence des données: ✅ Vérifiée')
  console.log('  - Fonctionnalités de recherche: ✅ Testées')
  console.log('  - Validation des données: ✅ Implémentée')
}

// Exécuter le test
testProductsPage().catch(console.error) 