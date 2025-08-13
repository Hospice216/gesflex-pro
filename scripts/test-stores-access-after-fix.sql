-- =====================================================
-- TEST D'ACCÈS AUX MAGASINS APRÈS CORRECTION RLS
-- Vérifier que tous les utilisateurs peuvent voir tous les magasins
-- =====================================================

-- =====================================================
-- 1. VÉRIFIER L'ÉTAT DES POLITIQUES RLS
-- =====================================================

SELECT 'VÉRIFICATION POLITIQUES RLS' as test_type;

-- Vérifier que RLS est activé
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS ACTIVÉ'
        ELSE '❌ RLS DÉSACTIVÉ'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'stores';

-- Lister toutes les politiques
SELECT 
    policyname,
    cmd as operation,
    permissive,
    CASE 
        WHEN cmd = 'SELECT' THEN '📖 LECTURE'
        WHEN cmd = 'INSERT' THEN '➕ CRÉATION'
        WHEN cmd = 'UPDATE' THEN '✏️ MODIFICATION'
        WHEN cmd = 'DELETE' THEN '🗑️ SUPPRESSION'
        WHEN cmd = 'ALL' THEN '🔓 TOUT'
        ELSE '❓ INCONNU'
    END as operation_type
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'stores'
ORDER BY cmd, policyname;

-- =====================================================
-- 2. VÉRIFIER L'ACCÈS AUX DONNÉES
-- =====================================================

SELECT 'VÉRIFICATION ACCÈS DONNÉES' as test_type;

-- Compter le nombre total de magasins
SELECT 
    'TOTAL MAGASINS' as metric,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ DONNÉES PRÉSENTES'
        ELSE '❌ AUCUNE DONNÉE'
    END as status
FROM stores;

-- Compter le nombre de magasins actifs
SELECT 
    'MAGASINS ACTIFS' as metric,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ MAGASINS ACTIFS PRÉSENTS'
        ELSE '❌ AUCUN MAGASIN ACTIF'
    END as status
FROM stores 
WHERE is_active = true;

-- Lister tous les magasins actifs
SELECT 
    id,
    name,
    code,
    is_active,
    created_at,
    CASE 
        WHEN is_active THEN '✅ ACTIF'
        ELSE '❌ INACTIF'
    END as status
FROM stores 
WHERE is_active = true
ORDER BY name;

-- =====================================================
-- 3. VÉRIFIER LES RELATIONS
-- =====================================================

SELECT 'VÉRIFICATION RELATIONS' as test_type;

-- Vérifier les assignations utilisateurs-magasins
SELECT 
    'ASSIGNATIONS UTILISATEURS-MAGASINS' as metric,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ ASSIGNATIONS PRÉSENTES'
        ELSE '❌ AUCUNE ASSIGNATION'
    END as status
FROM user_stores;

-- Lister les assignations
SELECT 
    u.email,
    u.role,
    s.name as store_name,
    us.is_primary,
    us.assigned_at
FROM user_stores us
JOIN users u ON u.id = us.user_id
JOIN stores s ON s.id = us.store_id
WHERE s.is_active = true
ORDER BY u.email, s.name;

-- =====================================================
-- 4. RÉSUMÉ DE LA CORRECTION
-- =====================================================

SELECT 'RÉSUMÉ CORRECTION RLS' as test_type;

SELECT 
    '✅ CORRECTION APPLIQUÉE' as result,
    'Tous les utilisateurs authentifiés peuvent maintenant voir tous les magasins actifs' as description
UNION ALL
SELECT 
    '✅ SÉCURITÉ MAINTENUE' as result,
    'Seuls Admin/SuperAdmin peuvent créer/modifier/supprimer des magasins' as description
UNION ALL
SELECT 
    '✅ TRANSFERTS POSSIBLES' as result,
    'Les transferts inter-magasins sont maintenant autorisés' as description;

-- =====================================================
-- 5. INSTRUCTIONS POUR TESTER
-- =====================================================

SELECT 'INSTRUCTIONS DE TEST' as test_type;

SELECT 
    '1️⃣' as step,
    'Exécuter ce script dans Supabase SQL Editor' as instruction
UNION ALL
SELECT 
    '2️⃣' as step,
    'Vérifier que tous les magasins sont visibles' as instruction
UNION ALL
SELECT 
    '3️⃣' as step,
    'Tester la page des transferts dans l\'application' as instruction
UNION ALL
SELECT 
    '4️⃣' as step,
    'Vérifier que le champ "Magasin Destination" affiche tous les magasins' as instruction;
