// Script de test pour vérifier le système de validation des achats
// Teste la création d'achats et la validation d'arrivages

console.log(`
🧪 TEST - Système de Validation des Achats GesFlex Pro

COPIEZ ET EXÉCUTEZ CES REQUÊTES SQL DANS SUPABASE SQL EDITOR :

-- ========================================
-- 1. VÉRIFIER L'ÉTAT DES MIGRATIONS
-- ========================================

-- Vérifier que les migrations ont été exécutées
SELECT 
    name,
    executed_at,
    CASE 
        WHEN executed_at IS NOT NULL THEN '✅ EXÉCUTÉE'
        ELSE '❌ NON EXÉCUTÉE'
    END as status
FROM supabase_migrations.schema_migrations 
WHERE name LIKE '%purchases%' OR name LIKE '%validation%'
ORDER BY executed_at DESC;

-- ========================================
-- 2. VÉRIFIER LES FONCTIONS ET TRIGGERS
-- ========================================

-- Vérifier que la fonction de validation existe
SELECT 
    routine_name,
    routine_type,
    CASE 
        WHEN routine_name = 'validate_purchase_created_by' THEN '✅ FONCTION CRÉÉE'
        ELSE '❌ FONCTION MANQUANTE'
    END as status
FROM information_schema.routines 
WHERE routine_name = 'validate_purchase_created_by';

-- Vérifier que le trigger existe
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    CASE 
        WHEN trigger_name = 'validate_purchase_created_by_trigger' THEN '✅ TRIGGER ACTIF'
        ELSE '❌ TRIGGER MANQUANT'
    END as status
FROM information_schema.triggers 
WHERE trigger_name = 'validate_purchase_created_by_trigger';

-- ========================================
-- 3. VÉRIFIER LES POLITIQUES RLS
-- ========================================

-- Vérifier l'état RLS sur purchases
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity = true THEN '✅ RLS ACTIVÉ'
        ELSE '❌ RLS DÉSACTIVÉ'
    END as status
FROM pg_tables 
WHERE tablename = 'purchases';

-- Vérifier les politiques RLS
SELECT 
    policyname,
    cmd,
    permissive,
    CASE 
        WHEN policyname IS NOT NULL THEN '✅ POLITIQUE ACTIVE'
        ELSE '❌ AUCUNE POLITIQUE'
    END as status
FROM pg_policies
WHERE tablename = 'purchases'
ORDER BY policyname;

-- ========================================
-- 4. VÉRIFIER L'UTILISATEUR ACTUEL
-- ========================================

-- Vérifier votre utilisateur (remplacez par votre email)
SELECT 
    id,
    auth_id,
    email,
    first_name,
    last_name,
    role,
    status,
    CASE 
        WHEN id IS NOT NULL THEN '✅ UTILISATEUR VALIDE'
        ELSE '❌ UTILISATEUR INEXISTANT'
    END as status
FROM users
WHERE email = 'VOTRE_EMAIL'; -- Remplacez par votre email

-- ========================================
-- 5. TEST DE CRÉATION D'ACHAT
-- ========================================

-- Test manuel de création d'achat (remplacez les UUIDs)
-- Assurez-vous d'avoir des données dans stores, suppliers, products
/*
INSERT INTO purchases (
    store_id,
    supplier_id,
    product_id,
    quantity,
    unit_price,
    total_amount,
    created_by
) VALUES (
    'STORE_UUID',      -- Remplacez par un UUID de store valide
    'SUPPLIER_UUID',   -- Remplacez par un UUID de supplier valide
    'PRODUCT_UUID',    -- Remplacez par un UUID de product valide
    10,
    100.00,
    1000.00,
    'USER_UUID'        -- Remplacez par votre user.id
);
*/

-- ========================================
-- 6. TEST DE VALIDATION D'ARRIVAGE
-- ========================================

-- Test manuel de validation d'arrivage (remplacez les UUIDs)
/*
UPDATE purchases 
SET 
    validated_quantity = 10,
    validated_by = 'USER_UUID',  -- Remplacez par votre user.id
    validated_at = now(),
    is_validated = true
WHERE id = 'PURCHASE_UUID';  -- Remplacez par un UUID d'achat valide
*/

-- ========================================
-- 7. VÉRIFIER LES ACHATS EXISTANTS
-- ========================================

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
    validated_by,
    validated_at,
    created_at,
    CASE 
        WHEN created_by IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE id = created_by) THEN '✅ CRÉATEUR VALIDE'
        ELSE '❌ CRÉATEUR INVALIDE'
    END as creator_status,
    CASE 
        WHEN validated_by IS NULL THEN '⏳ NON VALIDÉ'
        WHEN validated_by IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE id = validated_by) THEN '✅ VALIDATEUR VALIDE'
        ELSE '❌ VALIDATEUR INVALIDE'
    END as validator_status
FROM purchases
ORDER BY created_at DESC
LIMIT 10;
`);

console.log(`
📋 INTERPRÉTATION DES RÉSULTATS :

1. **Migrations** : Toutes les migrations doivent être "✅ EXÉCUTÉE"
2. **Fonction** : validate_purchase_created_by doit exister
3. **Trigger** : validate_purchase_created_by_trigger doit être actif
4. **RLS** : Doit être activé sur purchases
5. **Politiques** : Au moins 4 politiques doivent être actives
6. **Utilisateur** : Votre utilisateur doit exister et être valide
7. **Achats** : Les achats existants doivent avoir des créateurs/validateurs valides

🔧 EN CAS DE PROBLÈME :

1. **Migrations non exécutées** : Exécutez les migrations manquantes
2. **Fonction/Trigger manquants** : Exécutez 20250127000013-fix-validation-trigger.sql
3. **Politiques manquantes** : Exécutez 20250127000012-fix-purchases-validation-and-rls.sql
4. **Utilisateur inexistant** : Créez l'utilisateur dans la table users
5. **Achats invalides** : Corrigez les UUIDs manquants

✅ RÉSULTAT ATTENDU :
- Toutes les vérifications doivent afficher "✅"
- Les tests de création et validation doivent fonctionner
- Aucune erreur UUID ne doit apparaître
`); 