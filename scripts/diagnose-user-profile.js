// Script de diagnostic pour les problèmes de profil utilisateur
// Vérifie l'état de l'authentification et du profil utilisateur

console.log(`
🔍 DIAGNOSTIC - Problème Profil Utilisateur

COPIEZ ET EXÉCUTEZ CES REQUÊTES SQL DANS SUPABASE SQL EDITOR :

-- ========================================
-- 1. VÉRIFIER L'UTILISATEUR AUTHENTIFIÉ
-- ========================================

-- Vérifier l'utilisateur actuellement authentifié
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at
FROM auth.users
WHERE id = auth.uid();

-- ========================================
-- 2. VÉRIFIER LE PROFIL UTILISATEUR
-- ========================================

-- Vérifier si le profil existe dans la table users
SELECT 
    id,
    auth_id,
    email,
    first_name,
    last_name,
    role,
    status,
    created_at,
    CASE 
        WHEN id IS NOT NULL THEN '✅ PROFIL EXISTANT'
        ELSE '❌ PROFIL MANQUANT'
    END as status
FROM users
WHERE auth_id = auth.uid();

-- ========================================
-- 3. VÉRIFIER TOUS LES UTILISATEURS
-- ========================================

-- Voir tous les utilisateurs pour comparaison
SELECT 
    id,
    auth_id,
    email,
    first_name,
    last_name,
    role,
    status,
    created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- ========================================
-- 4. VÉRIFIER LES ACHATS EXISTANTS
-- ========================================

-- Vérifier les achats et leurs créateurs
SELECT 
    p.id,
    p.created_by,
    u.email as creator_email,
    u.role as creator_role,
    CASE 
        WHEN u.id IS NOT NULL THEN '✅ CRÉATEUR VALIDE'
        ELSE '❌ CRÉATEUR INVALIDE'
    END as creator_status
FROM purchases p
LEFT JOIN users u ON p.created_by = u.id
ORDER BY p.created_at DESC
LIMIT 10;

-- ========================================
-- 5. CRÉER L'UTILISATEUR SI MANQUANT
-- ========================================

-- Si le profil n'existe pas, le créer (remplacez les valeurs)
/*
INSERT INTO users (
    auth_id,
    email,
    first_name,
    last_name,
    role,
    status
) VALUES (
    'VOTRE_AUTH_ID',  -- Remplacez par l'ID de auth.users
    'votre@email.com', -- Remplacez par votre email
    'Prénom',         -- Remplacez par votre prénom
    'Nom',            -- Remplacez par votre nom
    'Admin',          -- Rôle approprié
    'active'          -- Statut actif
);
*/

-- ========================================
-- 6. VÉRIFIER LES TRIGGERS ET FONCTIONS
-- ========================================

-- Vérifier que la fonction de validation existe
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'validate_purchase_created_by';

-- Vérifier que le trigger existe
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'validate_purchase_created_by_trigger';
`);

console.log(`
📋 INTERPRÉTATION DES RÉSULTATS :

1. **Utilisateur Auth** : Doit exister dans auth.users
2. **Profil Utilisateur** : Doit exister dans users avec auth_id correspondant
3. **Achats** : Doivent avoir des créateurs valides
4. **Fonction/Trigger** : Doivent exister pour la validation

🔧 SOLUTIONS :

**Si le profil utilisateur n'existe pas :**
1. Copiez l'ID de auth.users (étape 1)
2. Exécutez la requête INSERT (étape 5) avec vos informations
3. Rechargez l'application

**Si les achats ont des créateurs invalides :**
1. Identifiez les achats problématiques
2. Mettez à jour les created_by avec des UUIDs valides
3. Ou supprimez les achats invalides

**Si la fonction/trigger n'existe pas :**
1. Exécutez la migration : 20250127000013-fix-validation-trigger.sql

✅ RÉSULTAT ATTENDU :
- Profil utilisateur valide avec ID non vide
- Achats avec créateurs valides
- Fonction et trigger de validation actifs
- Aucune erreur UUID vide
`); 