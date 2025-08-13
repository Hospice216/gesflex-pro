// Test de création d'utilisateur corrigé
// À exécuter dans la console du navigateur

console.log('👤 Test de création d\'utilisateur (corrigé)...');

const SUPABASE_URL = 'https://qxxldshkowjbcbnchokg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4eGxkc2hrb3dqYmNibmNob2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMzc3OTYsImV4cCI6MjA2OTcxMzc5Nn0.jdaXmCVgpLoYcc-GlMNR9da8rISDNDPs1AKhS1G1ujQ';

// Test avec des données correctes (sans la colonne name)
const testUser = {
    email: 'test@gesflex.com',
    password: 'TestPassword123!',
    user_metadata: {
        first_name: 'Test',
        last_name: 'User'
    }
};

console.log('Données utilisateur:', testUser);

fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(testUser)
})
.then(response => {
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    return response.json();
})
.then(data => {
    console.log('Réponse complète:', data);
    
    if (data.user) {
        console.log('✅ Création utilisateur réussie!');
        console.log('User ID:', data.user.id);
        console.log('Email:', data.user.email);
        console.log('User Metadata:', data.user.user_metadata);
    } else if (data.error) {
        console.log('❌ Erreur de création:', data.error);
        console.log('Message:', data.msg);
    } else {
        console.log('⚠️ Réponse inattendue:', data);
    }
})
.catch(error => {
    console.log('❌ Erreur réseau:', error.message);
}); 