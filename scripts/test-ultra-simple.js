// Test ultra-simple - Copiez ce code dans la console

console.log('🔍 Test ultra-simple...');

// Test 1: Vérifier que fetch fonctionne
console.log('Test fetch...');
fetch('https://qxxldshkowjbcbnchokg.supabase.co/rest/v1/')
.then(r => console.log('✅ Fetch OK, status:', r.status))
.catch(e => console.log('❌ Fetch error:', e.message));

// Test 2: Vérifier la clé
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4eGxkc2hrb3dqYmNibmNob2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMzc3OTYsImV4cCI6MjA2OTcxMzc5Nn0.jdaXmCVgpLoYcc-GlMNR9da8rISDNDPs1AKhS1G1ujQ';
console.log('Clé configurée:', key ? 'OUI' : 'NON');

// Test 3: Test avec clé
fetch('https://qxxldshkowjbcbnchokg.supabase.co/rest/v1/', {
  headers: { 'apikey': key }
})
.then(r => console.log('✅ Test avec clé OK, status:', r.status))
.catch(e => console.log('❌ Test avec clé error:', e.message)); 