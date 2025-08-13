// Script de test pour vérifier les permissions des rôles
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://qxxldshkowjbcbnchokg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4eGxkc2hrb3dqYmNibmNob2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0MzAzMCwiZXhwIjoyMDUwMDA2MzB9.3224030f-ec32-4f54-abae-d957ef1a9ce1'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testPermissions() {
  console.log('🔍 Test des permissions pour les différents rôles...\n')

  // Test 1: Vérifier les rôles existants
  console.log('1️⃣ Vérification des rôles existants:')
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

  // Test 2: Vérifier les permissions pour chaque rôle
  console.log('\n2️⃣ Test des permissions par rôle:')
  
  const roles = ['Vendeur', 'Manager', 'Admin', 'SuperAdmin']
  
  for (const role of roles) {
    console.log(`\n📋 Test pour le rôle: ${role}`)
    
    // Trouver un utilisateur avec ce rôle
    const userWithRole = users.find(u => u.role === role)
    
    if (!userWithRole) {
      console.log(`  ⚠️  Aucun utilisateur trouvé avec le rôle ${role}`)
      continue
    }

    // Vérifier les permissions
    const canViewRevenue = ['Admin', 'SuperAdmin'].includes(role)
    console.log(`  ✅ Peut voir le chiffre d'affaires: ${canViewRevenue ? 'OUI' : 'NON'}`)
    
    // Vérifier les permissions de navigation
    const canAddProduct = ['Admin', 'SuperAdmin', 'Manager'].includes(role)
    console.log(`  ✅ Peut ajouter des produits: ${canAddProduct ? 'OUI' : 'NON'}`)
    
    const canViewInventory = ['Admin', 'SuperAdmin', 'Manager'].includes(role)
    console.log(`  ✅ Peut voir l'inventaire: ${canViewInventory ? 'OUI' : 'NON'}`)
    
    const canManageUsers = ['Admin', 'SuperAdmin'].includes(role)
    console.log(`  ✅ Peut gérer les utilisateurs: ${canManageUsers ? 'OUI' : 'NON'}`)
    
    const canManageStores = ['Admin', 'SuperAdmin'].includes(role)
    console.log(`  ✅ Peut gérer les magasins: ${canManageStores ? 'OUI' : 'NON'}`)
  }

  // Test 3: Vérifier les données du dashboard
  console.log('\n3️⃣ Test des données du dashboard:')
  
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

  // Total des ventes du mois
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

  console.log('\n✅ Test des permissions terminé!')
}

// Exécuter le test
testPermissions().catch(console.error) 