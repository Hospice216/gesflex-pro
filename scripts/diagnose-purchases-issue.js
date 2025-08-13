// Script de diagnostic pour les problèmes d'UUID dans purchases
// Vérifie l'état des utilisateurs et des achats

console.log(`
🔍 DIAGNOSTIC - Problèmes UUID dans purchases

COPIEZ ET EXÉCUTEZ CES REQUÊTES SQL DANS SUPABASE SQL EDITOR :

-- ========================================
-- 1. VÉRIFIER L'ÉTAT DE LA TABLE USERS
-- ========================================

-- Vérifier la structure de la table users
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- Vérifier les utilisateurs existants
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
-- 2. VÉRIFIER L'ÉTAT DE LA TABLE PURCHASES
-- ========================================

-- Vérifier la structure de la table purchases
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'purchases'
ORDER BY ordinal_position;

-- Vérifier les achats existants
SELECT 
    id,
    store_id,
    supplier_id,
    product_id,
    quantity,
    unit_price,
    total_amount,
    created_by,
    is_validated,
    created_at
FROM purchases
ORDER BY created_at DESC
LIMIT 10;

-- ========================================
-- 3. VÉRIFIER LES RELATIONS
-- ========================================

-- Vérifier les contraintes de clé étrangère
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'purchases';

-- ========================================
-- 4. VÉRIFIER LES PROBLÈMES POTENTIELS
-- ========================================

-- Vérifier si des achats ont des created_by invalides
SELECT 
    p.id,
    p.created_by,
    u.id as user_id,
    u.email,
    CASE 
        WHEN u.id IS NULL THEN '❌ UTILISATEUR INEXISTANT'
        ELSE '✅ UTILISATEUR VALIDE'
    END as status
FROM purchases p
LEFT JOIN users u ON p.created_by = u.id
ORDER BY p.created_at DESC
LIMIT 20;

-- ========================================
-- 5. VÉRIFIER L'UTILISATEUR ACTUEL
-- ========================================

-- Remplacer 'VOTRE_EMAIL' par votre email pour vérifier votre utilisateur
SELECT 
    id,
    auth_id,
    email,
    first_name,
    last_name,
    role,
    status
FROM users
WHERE email = 'VOTRE_EMAIL'; -- Remplacez par votre email

-- ========================================
-- 6. VÉRIFIER LES POLITIQUES RLS
-- ========================================

-- Vérifier l'état RLS
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity = false THEN '✅ RLS DÉSACTIVÉ'
        ELSE '❌ RLS ACTIVÉ'
    END as status
FROM pg_tables 
WHERE tablename = 'purchases';

-- Vérifier les politiques existantes
SELECT 
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies
WHERE tablename = 'purchases';
`);

console.log(`
📋 INTERPRÉTATION DES RÉSULTATS :

1. **Structure users** : Vérifiez que id est de type UUID
2. **Structure purchases** : Vérifiez que created_by est de type UUID
3. **Relations** : Vérifiez que created_by référence users(id)
4. **Problèmes** : Cherchez les "❌ UTILISATEUR INEXISTANT"
5. **Utilisateur actuel** : Vérifiez que votre utilisateur existe
6. **RLS** : Vérifiez l'état des politiques

🔧 SOLUTIONS :

Si vous trouvez des problèmes :
1. Exécutez la migration : 20250127000012-fix-purchases-validation-and-rls.sql
2. Vérifiez que PurchaseModal.tsx utilise userProfile.id
3. Testez la création d'un nouvel achat
`); 