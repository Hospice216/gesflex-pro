// Script de test pour vérifier les permissions du dashboard
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://qxxldshkowjbcbnchokg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4eGxkc2hrb3dqYmNibmNob2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0MzAzMCwiZXhwIjoyMDUwMDA2MzB9.3224030f-ec32-4f54-abae-d957ef1a9ce1'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDashboardPermissions() {
  console.log('🔍 Test des permissions du Dashboard...\n')

  // Test 1: Vérifier les utilisateurs et leurs rôles
  console.log('1️⃣ Vérification des utilisateurs:')
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, email')
    .order('role')

  if (usersError) {
    console.error('❌ Erreur lors de la récupération des utilisateurs:', usersError)
    return
  }

  console.log('Utilisateurs trouvés:')
  users.forEach(user => {
    console.log(`  - ${user.first_name} ${user.last_name} (${user.email}) - Rôle: ${user.role}`)
  })

  // Test 2: Simuler les permissions du dashboard pour chaque rôle
  console.log('\n2️⃣ Test des permissions du Dashboard par rôle:')
  
  const roles = ['Vendeur', 'Manager', 'Admin', 'SuperAdmin']
  
  for (const role of roles) {
    console.log(`\n📋 Test pour le rôle: ${role}`)
    
    // Simuler les permissions du dashboard
    const canViewRevenue = ['Admin', 'SuperAdmin'].includes(role)
    const canAddProduct = ['Admin', 'SuperAdmin', 'Manager'].includes(role)
    const canViewInventory = ['Admin', 'SuperAdmin', 'Manager'].includes(role)
    
    console.log(`  📊 Carte "Total des ventes":`)
    console.log(`     - Valeur affichée: Nombre de produits vendus`)
    console.log(`     - Description: ${canViewRevenue ? 'X CFA de chiffre d\'affaires total' : 'Produits vendus ce mois'}`)
    console.log(`     - Permissions: ${canViewRevenue ? '✅ Peut voir le CA' : '❌ Ne peut pas voir le CA'}`)
    
    console.log(`  🔧 Boutons d'action:`)
    console.log(`     - "Ajouter produit": ${canAddProduct ? '✅ Visible' : '❌ Masqué'}`)
    console.log(`     - "Inventaire": ${canViewInventory ? '✅ Visible' : '❌ Masqué'}`)
  }

  // Test 3: Vérifier les données réelles du dashboard
  console.log('\n3️⃣ Test des données réelles du Dashboard:')
  
  const today = new Date()
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Ventes du jour
  const { data: dailySales, error: dailyError } = await supabase
    .from('sales')
    .select('total_amount, created_at')
    .gte('created_at', today.toISOString())
    .lt('created_at', tomorrow.toISOString())

  if (dailyError) {
    console.error('❌ Erreur lors de la récupération des ventes du jour:', dailyError)
  } else {
    const dailyCount = dailySales?.length || 0
    const dailyAmount = dailySales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0
    console.log(`  📊 Ventes du jour: ${dailyCount} ventes, ${dailyAmount} CFA`)
  }

  // Total des ventes du mois (produits vendus)
  const { data: monthlySales, error: monthlyError } = await supabase
    .from('sales')
    .select(`
      sale_items (
        quantity
      )
    `)
    .gte('created_at', firstDayOfMonth.toISOString())

  if (monthlyError) {
    console.error('❌ Erreur lors de la récupération des ventes du mois:', monthlyError)
  } else {
    const totalProductsSold = monthlySales?.reduce((sum, sale) => {
      const saleItemsQuantity = sale.sale_items?.reduce((itemSum, item) => 
        itemSum + (item.quantity || 0), 0) || 0
      return sum + saleItemsQuantity
    }, 0) || 0
    console.log(`  📊 Produits vendus ce mois: ${totalProductsSold} produits`)
  }

  // Total des ventes du mois (montant)
  const { data: monthlyAmount, error: amountError } = await supabase
    .from('sales')
    .select('total_amount')
    .gte('created_at', firstDayOfMonth.toISOString())

  if (amountError) {
    console.error('❌ Erreur lors de la récupération du montant du mois:', amountError)
  } else {
    const totalAmount = monthlyAmount?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0
    console.log(`  📊 Chiffre d'affaires du mois: ${totalAmount} CFA`)
  }

  // Total produits
  const { data: products, error: productsError } = await supabase
    .from('product_stores')
    .select('quantity')
    .gt('quantity', 0)

  if (productsError) {
    console.error('❌ Erreur lors de la récupération des produits:', productsError)
  } else {
    const totalProducts = products?.length || 0
    console.log(`  📊 Total produits en stock: ${totalProducts} produits`)
  }

  // Stock faible
  const { data: lowStock, error: lowStockError } = await supabase
    .from('product_stores')
    .select('quantity')
    .lte('quantity', 10)

  if (lowStockError) {
    console.error('❌ Erreur lors de la récupération du stock faible:', lowStockError)
  } else {
    const lowStockCount = lowStock?.length || 0
    console.log(`  📊 Produits en stock faible (≤10): ${lowStockCount} produits`)
  }

  console.log('\n✅ Test des permissions du Dashboard terminé!')
  console.log('\n📋 Résumé des permissions:')
  console.log('  - Admin/SuperAdmin: Accès complet aux informations financières')
  console.log('  - Manager: Accès limité (pas de CA)')
  console.log('  - Vendeur: Accès limité (pas de CA)')
}

// Exécuter le test
testDashboardPermissions().catch(console.error) 