const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://qxxldshkowjbcbnchokg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4eGxkc2hrb3dqYmNibmNob2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0NzQ5NzAsImV4cCI6MjA1MTA1MDk3MH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDbStructure() {
  console.log('🔍 Testing database structure...')

  try {
    // Test 1: Vérifier la structure de la table purchases
    console.log('\n1. Testing purchases table structure...')
    const { data: purchases, error: purchasesError } = await supabase
      .from('purchases')
      .select('*')
      .limit(1)

    if (purchasesError) {
      console.error('❌ Error with purchases table:', purchasesError)
    } else {
      console.log('✅ Purchases table accessible')
      if (purchases && purchases.length > 0) {
        console.log('📋 Sample purchase fields:', Object.keys(purchases[0]))
      }
    }

    // Test 2: Vérifier la structure de la table users
    console.log('\n2. Testing users table structure...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1)

    if (usersError) {
      console.error('❌ Error with users table:', usersError)
    } else {
      console.log('✅ Users table accessible')
      if (users && users.length > 0) {
        console.log('📋 Sample user fields:', Object.keys(users[0]))
      }
    }

    // Test 3: Vérifier les relations
    console.log('\n3. Testing relationships...')
    const { data: purchasesWithRelations, error: relationsError } = await supabase
      .from('purchases')
      .select(`
        *,
        suppliers(name),
        products(name, sku),
        stores(name)
      `)
      .limit(1)

    if (relationsError) {
      console.error('❌ Error with relations:', relationsError)
    } else {
      console.log('✅ Relations working')
      if (purchasesWithRelations && purchasesWithRelations.length > 0) {
        console.log('📋 Sample purchase with relations:', {
          id: purchasesWithRelations[0].id,
          supplier: purchasesWithRelations[0].suppliers?.name,
          product: purchasesWithRelations[0].products?.name,
          store: purchasesWithRelations[0].stores?.name
        })
      }
    }

    // Test 4: Vérifier les contraintes de clés étrangères
    console.log('\n4. Testing foreign key constraints...')
    const { data: constraints, error: constraintsError } = await supabase
      .rpc('get_foreign_keys')

    if (constraintsError) {
      console.log('⚠️ Could not check foreign keys directly, checking manually...')
      
      // Test manuel des relations
      const { data: testPurchase, error: testError } = await supabase
        .from('purchases')
        .select('created_by')
        .limit(1)

      if (!testError && testPurchase && testPurchase.length > 0) {
        const createdBy = testPurchase[0].created_by
        if (createdBy) {
          const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, first_name, last_name')
            .eq('id', createdBy)
            .single()

          if (userError) {
            console.error('❌ Foreign key constraint issue:', userError)
          } else {
            console.log('✅ Foreign key constraint working')
          }
        }
      }
    } else {
      console.log('✅ Foreign key constraints:', constraints)
    }

  } catch (error) {
    console.error('❌ General error:', error)
  }
}

testDbStructure() 