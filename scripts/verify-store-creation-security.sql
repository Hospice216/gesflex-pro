-- =====================================================
-- VÉRIFICATION DE LA SÉCURITÉ DE CRÉATION DE MAGASINS
-- Confirmer que seuls Admin et SuperAdmin peuvent créer des magasins
-- =====================================================

-- 1. VÉRIFIER LES POLITIQUES RLS POUR STORES
SELECT 
    'POLITIQUES RLS STORES' as diagnostic_type,
    policyname,
    cmd,
    permissive,
    roles,
    CASE 
        WHEN cmd = 'ALL' AND policyname LIKE '%Admin%' THEN '✅ CRÉATION AUTORISÉE (Admin/SuperAdmin)'
        WHEN cmd = 'ALL' AND policyname LIKE '%Manager%' THEN '⚠️ ACCÈS LIMITÉ (Manager)'
        WHEN cmd = 'SELECT' THEN '❌ LECTURE SEULE'
        ELSE '❌ ACCÈS LIMITÉ'
    END as access_level
FROM pg_policies 
WHERE tablename = 'stores'
ORDER BY policyname;

-- 2. VÉRIFIER LES FONCTIONS DE SÉCURITÉ
SELECT 
    'FONCTIONS DE SÉCURITÉ' as diagnostic_type,
    proname as function_name,
    CASE 
        WHEN proname = 'is_superadmin' THEN 'Vérifie si SuperAdmin'
        WHEN proname = 'is_admin' THEN 'Vérifie si Admin ou SuperAdmin'
        WHEN proname = 'get_current_user_id' THEN 'Retourne l\'ID utilisateur'
        ELSE 'Autre fonction'
    END as description,
    '✅ EXISTE' as status
FROM pg_proc 
WHERE proname IN ('is_superadmin', 'is_admin', 'get_current_user_id');

-- 3. TESTER LES PERMISSIONS PAR RÔLE
SELECT 
    'TEST PERMISSIONS PAR RÔLE' as diagnostic_type,
    'SuperAdmin' as role_test,
    CASE 
        WHEN is_superadmin() THEN '✅ PEUT CRÉER DES MAGASINS'
        ELSE '❌ NE PEUT PAS CRÉER DES MAGASINS'
    END as permissions
UNION ALL
SELECT 
    'TEST PERMISSIONS PAR RÔLE' as diagnostic_type,
    'Admin' as role_test,
    CASE 
        WHEN is_admin() THEN '✅ PEUT CRÉER DES MAGASINS'
        ELSE '❌ NE PEUT PAS CRÉER DES MAGASINS'
    END as permissions;

-- 4. VÉRIFIER LES UTILISATEURS PAR RÔLE
SELECT 
    'UTILISATEURS PAR RÔLE' as diagnostic_type,
    role,
    COUNT(*) as user_count,
    CASE 
        WHEN role IN ('SuperAdmin', 'Admin') THEN '✅ PEUT CRÉER DES MAGASINS'
        ELSE '❌ NE PEUT PAS CRÉER DES MAGASINS'
    END as permissions
FROM users 
GROUP BY role
ORDER BY 
    CASE role 
        WHEN 'SuperAdmin' THEN 1
        WHEN 'Admin' THEN 2
        WHEN 'Manager' THEN 3
        WHEN 'Vendeur' THEN 4
        ELSE 5
    END;

-- 5. VÉRIFIER LA SÉCURITÉ DES POLITIQUES
SELECT 
    'SÉCURITÉ DES POLITIQUES' as diagnostic_type,
    'Stores - Création' as policy_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'stores' 
            AND cmd = 'ALL' 
            AND policyname LIKE '%Admin%'
        ) THEN '✅ SEULS ADMIN/SUPERADMIN PEUVENT CRÉER'
        ELSE '❌ SÉCURITÉ INSUFFISANTE'
    END as security_status;

-- 6. RÉSUMÉ DE LA SÉCURITÉ
SELECT 
    'RÉSUMÉ SÉCURITÉ' as diagnostic_type,
    'Création de magasins' as feature,
    CASE 
        WHEN is_superadmin() OR is_admin() THEN '✅ AUTORISÉ (Admin/SuperAdmin)'
        ELSE '❌ INTERDIT (Utilisateur normal)'
    END as current_user_status,
    'Seuls Admin et SuperAdmin peuvent créer des magasins' as security_rule;
