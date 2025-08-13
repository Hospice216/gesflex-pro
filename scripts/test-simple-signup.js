// Test simple de création d'utilisateur
// À exécuter dans la console du navigateur

console.log('👤 Test simple de création d\'utilisateur...');

const SUPABASE_URL = 'https://qxxldshkowjbcbnchokg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4eGxkc2hrb3dqYmNibmNob2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMzc3OTYsImV4cCI6MjA2OTcxMzc5Nn0.jdaXmCVgpLoYcc-GlMNR9da8rISDNDPs1AKhS1G1ujQ';

// Test avec des données minimales
const testUser = {
    email: 'simple@test.com',
    password: 'SimpleTest123!',
    user_metadata: {
        first_name: 'Simple',
        last_name: 'Test'
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
        
        // Vérifier dans public.users
        return fetch(`${SUPABASE_URL}/rest/v1/users?auth_id=eq.${data.user.id}`, {
            headers: { 'apikey': SUPABASE_KEY }
        });
    } else {
        console.log('❌ Erreur de création:', data);
        throw new Error('Création échouée');
    }
})
.then(response => {
    if (response) {
        console.log('Vérification public.users status:', response.status);
        return response.json();
    }
})
.then(data => {
    if (data && data.length > 0) {
        console.log('✅ Utilisateur trouvé dans public.users!');
        console.log('Données:', data[0]);
        console.log('🎉 Test réussi !');
    } else {
        console.log('⚠️ Utilisateur non trouvé dans public.users');
    }
})
.catch(error => {
    console.log('❌ Erreur:', error.message);
}); 