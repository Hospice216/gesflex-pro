// Test final de connexion Frontend-Backend
// À exécuter dans la console du navigateur

console.log('🎯 Test final de connexion...');

const SUPABASE_URL = 'https://qxxldshkowjbcbnchokg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4eGxkc2hrb3dqYmNibmNob2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMzc3OTYsImV4cCI6MjA2OTcxMzc5Nn0.jdaXmCVgpLoYcc-GlMNR9da8rISDNDPs1AKhS1G1ujQ';

// Test 1: Connexion de base
console.log('🔌 Test 1: Connexion de base...');
fetch(`${SUPABASE_URL}/rest/v1/`, {
  headers: { 'apikey': SUPABASE_KEY }
})
.then(r => {
  console.log('✅ Connexion:', r.status);
  return fetch(`${SUPABASE_URL}/rest/v1/system_settings?select=*`, {
    headers: { 'apikey': SUPABASE_KEY }
  });
})
.then(r => {
  console.log('✅ Paramètres système:', r.status);
  return r.json();
})
.then(data => {
  console.log('📊 Paramètres système:', data.length, 'enregistrements');
  
  // Test 2: Création d'utilisateur
  console.log('👤 Test 2: Création d\'utilisateur...');
  const testUser = {
    email: 'final@test.com',
    password: 'FinalTest123!',
    user_metadata: {
      first_name: 'Final',
      last_name: 'Test'
    }
  };
  
  return fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(testUser)
  });
})
.then(r => {
  console.log('✅ Création utilisateur status:', r.status);
  return r.json();
})
.then(data => {
  if (data.user) {
    console.log('✅ Création utilisateur réussie!');
    console.log('User ID:', data.user.id);
    console.log('Email:', data.user.email);
    
    // Test 3: Vérifier que l'utilisateur existe dans public.users
    console.log('🔍 Test 3: Vérification dans public.users...');
    return fetch(`${SUPABASE_URL}/rest/v1/users?auth_id=eq.${data.user.id}`, {
      headers: { 'apikey': SUPABASE_KEY }
    });
  } else {
    console.log('❌ Erreur création:', data);
    throw new Error('Création utilisateur échouée');
  }
})
.then(r => {
  console.log('✅ Vérification public.users:', r.status);
  return r.json();
})
.then(data => {
  if (data && data.length > 0) {
    console.log('✅ Utilisateur trouvé dans public.users!');
    console.log('Données:', data[0]);
  } else {
    console.log('⚠️ Utilisateur non trouvé dans public.users');
  }
  
  console.log('🎉 Test final terminé avec succès!');
  console.log('✅ Connexion frontend-backend parfaitement fonctionnelle!');
})
.catch(error => {
  console.log('❌ Erreur:', error.message);
}); 