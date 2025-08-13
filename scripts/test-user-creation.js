// Test de création d'utilisateur après correction
// À exécuter dans la console du navigateur

console.log('👤 Test de création d\'utilisateur...');

const SUPABASE_URL = 'https://qxxldshkowjbcbnchokg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4eGxkc2hrb3dqYmNibmNob2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMzc3OTYsImV4cCI6MjA2OTcxMzc5Nn0.jdaXmCVgpLoYcc-GlMNR9da8rISDNDPs1AKhS1G1ujQ';

// Test avec des données plus complètes
const testUser = {
    email: 'test@gesflex.com',
    password: 'TestPassword123!',
    user_metadata: {
        first_name: 'Test',
        last_name: 'User',
        name: 'Test User' // Ajout du nom complet
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
    console.log('Headers:', response.headers);
    return response.json();
})
.then(data => {
    if (data.user) {
        console.log('✅ Création utilisateur réussie!');
        console.log('User ID:', data.user.id);
        console.log('Email:', data.user.email);
    } else {
        console.log('❌ Erreur de création:', data);
    }
})
.catch(error => {
    console.log('❌ Erreur réseau:', error.message);
}); 