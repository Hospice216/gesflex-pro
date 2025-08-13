// Test rapide de connexion Frontend-Backend
// Copiez ce code dans la console du navigateur

console.log('🔍 Test rapide de connexion...');

const SUPABASE_URL = 'https://qxxldshkowjbcbnchokg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4eGxkc2hrb3dqYmNibmNob2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMzc3OTYsImV4cCI6MjA2OTcxMzc5Nn0.jdaXmCVgpLoYcc-GlMNR9da8rISDNDPs1AKhS1G1ujQ';

// Test 1: Connexion de base
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
  console.log('📊 Nombre de paramètres:', data.length);
  console.log('🎉 Test réussi !');
})
.catch(err => {
  console.log('❌ Erreur:', err.message);
}); 