# 🔍 Guide de Test de Connexion Frontend-Backend - GesFlex Pro

## 📋 Vue d'ensemble

Ce guide vous permet de vérifier que la connexion entre votre frontend React et votre backend Supabase fonctionne correctement.

## 🚀 Étape 1: Test Backend (SQL)

### Instructions :
1. **Ouvrez l'interface SQL de Supabase**
   - Allez sur https://supabase.com
   - Connectez-vous à votre projet
   - Cliquez sur "SQL Editor"

2. **Exécutez le script de test**
   - Copiez le contenu du fichier `scripts/test-connection.sql`
   - Collez-le dans l'éditeur SQL
   - Cliquez sur "Run"

3. **Analysez les résultats**
   - Vérifiez que toutes les sections affichent "✅"
   - Notez les éventuelles erreurs

## 🌐 Étape 2: Test Frontend (JavaScript)

### Instructions :
1. **Ouvrez votre application**
   - Lancez votre serveur de développement : `npm run dev`
   - Ouvrez http://localhost:8080 dans votre navigateur

2. **Ouvrez la console du navigateur**
   - Appuyez sur F12
   - Allez dans l'onglet "Console"

3. **Exécutez le script de test**
   - Copiez le contenu du fichier `scripts/test-frontend-connection.js`
   - Collez-le dans la console
   - Appuyez sur Entrée
   - Exécutez : `runAllTests()`

## 📊 Interprétation des résultats

### ✅ Tests réussis
- **Connexion de base** : L'API Supabase répond
- **Paramètres système** : Lecture des configurations OK
- **Magasins** : Accès aux données des magasins OK
- **Catégories** : Accès aux catégories OK
- **Authentification** : Système d'auth fonctionnel
- **Création utilisateur** : Inscription possible

### ❌ Tests échoués - Solutions

#### Erreur 500 (Internal Server Error)
**Cause** : Problème backend
**Solution** :
1. Vérifiez les migrations SQL
2. Exécutez le script de diagnostic backend
3. Vérifiez les triggers et fonctions

#### Erreur 403 (Forbidden)
**Cause** : Problème de permissions RLS
**Solution** :
1. Vérifiez les politiques RLS
2. Assurez-vous que l'utilisateur est authentifié
3. Vérifiez les rôles utilisateur

#### Erreur 404 (Not Found)
**Cause** : Table ou ressource inexistante
**Solution** :
1. Vérifiez que les migrations sont appliquées
2. Vérifiez les noms de tables
3. Vérifiez l'URL de l'API

#### Erreur 401 (Unauthorized)
**Cause** : Clé API invalide
**Solution** :
1. Vérifiez la clé anonyme dans le code
2. Vérifiez la configuration Supabase
3. Régénérez la clé si nécessaire

## 🔧 Tests rapides

### Test 1: Connexion de base
```javascript
fetch('https://qxxldshkowjbcbnchokg.supabase.co/rest/v1/', {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4eGxkc2hrb3dqYmNibmNob2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMzc3OTYsImV4cCI6MjA2OTcxMzc5Nn0.jdaXmCVgpLoYcc-GlMNR9da8rISDNDPs1AKhS1G1ujQ'
  }
}).then(r => console.log('Status:', r.status));
```

### Test 2: Lecture des paramètres
```javascript
fetch('https://qxxldshkowjbcbnchokg.supabase.co/rest/v1/system_settings?select=*', {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4eGxkc2hrb3dqYmNibmNob2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMzc3OTYsImV4cCI6MjA2OTcxMzc5Nn0.jdaXmCVgpLoYcc-GlMNR9da8rISDNDPs1AKhS1G1ujQ'
  }
}).then(r => r.json()).then(data => console.log('Paramètres:', data));
```

## 🎯 Résultats attendus

### Backend (SQL)
```
✅ Table users accessible
✅ Table system_settings accessible
✅ Type user_role disponible
✅ Fonction handle_new_user disponible
✅ Politiques RLS configurées
✅ Données système disponibles
```

### Frontend (JavaScript)
```
✅ Connexion Supabase OK
✅ Paramètres système accessibles: X enregistrements
✅ Magasins accessibles: X enregistrements
✅ Catégories accessibles: X enregistrements
✅ Authentification OK
✅ Création d'utilisateur OK
```

## 🚨 Problèmes courants

### 1. Erreur 500 lors de l'inscription
**Diagnostic** : Exécutez le script de diagnostic backend
**Solution** : Vérifiez le trigger `handle_new_user`

### 2. Erreur 403 sur les paramètres système
**Diagnostic** : Vérifiez les politiques RLS
**Solution** : Assurez-vous que l'utilisateur a les bonnes permissions

### 3. Tables manquantes
**Diagnostic** : Vérifiez les migrations
**Solution** : Réappliquez les migrations dans l'ordre

## 📞 Support

Si vous rencontrez des problèmes :
1. **Exécutez d'abord les tests** ci-dessus
2. **Notez les erreurs exactes**
3. **Partagez les résultats** des tests
4. **Incluez les messages d'erreur** complets

## 🎉 Succès

Si tous les tests passent, votre connexion frontend-backend est parfaite ! Vous pouvez maintenant utiliser toutes les fonctionnalités de GesFlex Pro. 