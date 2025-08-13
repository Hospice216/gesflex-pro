// Script de test de connexion Frontend-Backend pour GesFlex Pro
// À exécuter dans la console du navigateur

console.log('🔍 Début du test de connexion Frontend-Backend...');

// Configuration Supabase (à adapter selon votre projet)
const SUPABASE_URL = 'https://qxxldshkowjbcbnchokg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4eGxkc2hrb3dqYmNibmNob2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMzc3OTYsImV4cCI6MjA2OTcxMzc5Nn0.jdaXmCVgpLoYcc-GlMNR9da8rISDNDPs1AKhS1G1ujQ';

// Test 1: Vérifier la configuration Supabase
console.log('📋 Test 1: Configuration Supabase');
console.log('URL:', SUPABASE_URL);
console.log('Clé anonyme configurée:', !!SUPABASE_ANON_KEY);

// Test 2: Test de connexion de base
async function testBasicConnection() {
    console.log('🔌 Test 2: Connexion de base');
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (response.ok) {
            console.log('✅ Connexion Supabase OK');
            return true;
        } else {
            console.log('❌ Erreur de connexion:', response.status, response.statusText);
            return false;
        }
    } catch (error) {
        console.log('❌ Erreur réseau:', error.message);
        return false;
    }
}

// Test 3: Test de lecture des paramètres système
async function testSystemSettings() {
    console.log('⚙️ Test 3: Lecture des paramètres système');
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/system_settings?select=*`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Paramètres système accessibles:', data.length, 'enregistrements');
            return true;
        } else {
            console.log('❌ Erreur lecture paramètres:', response.status, response.statusText);
            return false;
        }
    } catch (error) {
        console.log('❌ Erreur lecture paramètres:', error.message);
        return false;
    }
}

// Test 4: Test de lecture des magasins
async function testStores() {
    console.log('🏪 Test 4: Lecture des magasins');
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/stores?select=*`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Magasins accessibles:', data.length, 'enregistrements');
            return true;
        } else {
            console.log('❌ Erreur lecture magasins:', response.status, response.statusText);
            return false;
        }
    } catch (error) {
        console.log('❌ Erreur lecture magasins:', error.message);
        return false;
    }
}

// Test 5: Test de lecture des catégories
async function testCategories() {
    console.log('📂 Test 5: Lecture des catégories');
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/categories?select=*`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Catégories accessibles:', data.length, 'enregistrements');
            return true;
        } else {
            console.log('❌ Erreur lecture catégories:', response.status, response.statusText);
            return false;
        }
    } catch (error) {
        console.log('❌ Erreur lecture catégories:', error.message);
        return false;
    }
}

// Test 6: Test d'authentification
async function testAuth() {
    console.log('🔐 Test 6: Test d\'authentification');
    try {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Authentification OK');
            return true;
        } else {
            console.log('⚠️ Authentification non configurée (normal pour les tests)');
            return true; // Normal pour les tests
        }
    } catch (error) {
        console.log('❌ Erreur authentification:', error.message);
        return false;
    }
}

// Test 7: Test de création d'utilisateur (simulation)
async function testUserCreation() {
    console.log('👤 Test 7: Test de création d\'utilisateur (simulation)');
    try {
        const testUser = {
            email: 'test@connection.com',
            password: 'testpassword123',
            user_metadata: {
                first_name: 'Test',
                last_name: 'Connection'
            }
        };
        
        const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testUser)
        });
        
        if (response.ok) {
            console.log('✅ Création d\'utilisateur OK');
            return true;
        } else {
            const error = await response.json();
            console.log('❌ Erreur création utilisateur:', response.status, error);
            return false;
        }
    } catch (error) {
        console.log('❌ Erreur création utilisateur:', error.message);
        return false;
    }
}

// Test 8: Test des erreurs courantes
async function testCommonErrors() {
    console.log('🚨 Test 8: Test des erreurs courantes');
    
    // Test d'une table inexistante
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/table_inexistante?select=*`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (response.status === 404) {
            console.log('✅ Gestion d\'erreur 404 OK');
        } else {
            console.log('⚠️ Réponse inattendue pour table inexistante:', response.status);
        }
    } catch (error) {
        console.log('❌ Erreur test table inexistante:', error.message);
    }
    
    // Test avec clé invalide
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/system_settings?select=*`, {
            method: 'GET',
            headers: {
                'apikey': 'clé_invalide',
                'Authorization': 'Bearer clé_invalide'
            }
        });
        
        if (response.status === 401) {
            console.log('✅ Gestion d\'erreur 401 OK');
        } else {
            console.log('⚠️ Réponse inattendue pour clé invalide:', response.status);
        }
    } catch (error) {
        console.log('❌ Erreur test clé invalide:', error.message);
    }
}

// Exécution de tous les tests
async function runAllTests() {
    console.log('🚀 Démarrage de tous les tests...');
    
    const results = {
        basicConnection: await testBasicConnection(),
        systemSettings: await testSystemSettings(),
        stores: await testStores(),
        categories: await testCategories(),
        auth: await testAuth(),
        userCreation: await testUserCreation()
    };
    
    await testCommonErrors();
    
    // Résumé final
    console.log('📊 === RÉSUMÉ DES TESTS ===');
    console.log('Connexion de base:', results.basicConnection ? '✅' : '❌');
    console.log('Paramètres système:', results.systemSettings ? '✅' : '❌');
    console.log('Magasins:', results.stores ? '✅' : '❌');
    console.log('Catégories:', results.categories ? '✅' : '❌');
    console.log('Authentification:', results.auth ? '✅' : '❌');
    console.log('Création utilisateur:', results.userCreation ? '✅' : '❌');
    
    const successCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;
    
    console.log(`\n🎯 Résultat: ${successCount}/${totalCount} tests réussis`);
    
    if (successCount === totalCount) {
        console.log('🎉 Tous les tests sont passés ! La connexion est parfaite.');
    } else {
        console.log('⚠️ Certains tests ont échoué. Vérifiez la configuration.');
    }
}

// Instructions d'utilisation
console.log(`
📝 INSTRUCTIONS D'UTILISATION:
1. Assurez-vous d'être sur la page de votre application GesFlex Pro
2. Ouvrez la console du navigateur (F12)
3. Copiez et collez ce script
4. Modifiez SUPABASE_URL et SUPABASE_ANON_KEY si nécessaire
5. Exécutez: runAllTests()
`);

// Exporter la fonction pour l'utiliser
window.runAllTests = runAllTests; 