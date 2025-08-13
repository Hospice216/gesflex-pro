-- =====================================================
-- DIAGNOSTIC SIMPLIFIÉ DES PERMISSIONS UTILISATEUR
-- Vérification des rôles et permissions pour la création de magasins
-- =====================================================

-- 1. VÉRIFIER L'UTILISATEUR CONNECTÉ
SELECT 
    'UTILISATEUR CONNECTÉ' as diagnostic_type,
    auth.uid() as current_user_id,
    '✅ CONNECTÉ' as status;

-- 2. VÉRIFIER LE PROFIL UTILISATEUR
SELECT 
    'PROFIL UTILISATEUR' as diagnostic_type,
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    u.status,
    CASE 
        WHEN u.role IN ('SuperAdmin', 'Admin') THEN '✅ PEUT CRÉER DES MAGASINS'
        ELSE '❌ NE PEUT PAS CRÉER DES MAGASINS'
    END as permissions
FROM users u
WHERE u.auth_id = auth.uid();

-- 3. VÉRIFIER LES FONCTIONS DE SÉCURITÉ
SELECT 
    'FONCTIONS DE SÉCURITÉ' as diagnostic_type,
    proname as function_name,
    '✅ EXISTE' as status
FROM pg_proc 
WHERE proname IN ('is_superadmin', 'is_admin', 'get_current_user_id');

-- 4. VÉRIFIER LES POLITIQUES RLS POUR STORES
SELECT 
    'POLITIQUES RLS STORES' as diagnostic_type,
    policyname,
    cmd,
    permissive,
    roles,
    CASE 
        WHEN cmd = 'ALL' THEN '✅ ACCÈS COMPLET'
        WHEN cmd = 'SELECT' THEN '✅ LECTURE SEULE'
        WHEN cmd = 'INSERT' THEN '✅ CRÉATION'
        WHEN cmd = 'UPDATE' THEN '✅ MODIFICATION'
        WHEN cmd = 'DELETE' THEN '✅ SUPPRESSION'
        ELSE '❌ ACCÈS LIMITÉ'
    END as access_level
FROM pg_policies 
WHERE tablename = 'stores'
ORDER BY policyname;

-- 5. TESTER LES PERMISSIONS DIRECTEMENT
SELECT 
    'TEST PERMISSIONS' as diagnostic_type,
    'is_superadmin()' as function_name,
    CASE 
        WHEN is_superadmin() THEN '✅ SUPERADMIN'
        ELSE '❌ PAS SUPERADMIN'
    END as status
UNION ALL
SELECT 
    'TEST PERMISSIONS' as diagnostic_type,
    'is_admin()' as function_name,
    CASE 
        WHEN is_admin() THEN '✅ ADMIN'
        ELSE '❌ PAS ADMIN'
    END as status;

-- 6. VÉRIFIER LES MAGASINS EXISTANTS
SELECT 
    'MAGASINS EXISTANTS' as diagnostic_type,
    COUNT(*) as total_stores,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_stores,
    COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_stores
FROM stores;

-- 7. VÉRIFIER LES ASSIGNATIONS UTILISATEUR-MAGASIN
SELECT 
    'ASSIGNATIONS UTILISATEUR-MAGASIN' as diagnostic_type,
    COUNT(*) as total_assignments,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT store_id) as unique_stores
FROM user_stores;

-- 8. RÉSUMÉ DES PERMISSIONS
SELECT 
    'RÉSUMÉ PERMISSIONS' as diagnostic_type,
    CASE 
        WHEN is_superadmin() THEN 'SUPERADMIN - ACCÈS COMPLET'
        WHEN is_admin() THEN 'ADMIN - PEUT CRÉER DES MAGASINS'
        ELSE 'UTILISATEUR NORMAL - ACCÈS LIMITÉ'
    END as user_permissions,
    CASE 
        WHEN is_superadmin() OR is_admin() THEN '✅ PEUT CRÉER DES MAGASINS'
        ELSE '❌ NE PEUT PAS CRÉER DES MAGASINS'
    END as store_creation_status;
