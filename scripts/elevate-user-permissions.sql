-- =====================================================
-- ÉLÉVATION DES PERMISSIONS UTILISATEUR
-- Donner les permissions Admin à l'utilisateur actuel
-- =====================================================

-- Début de la transaction
BEGIN;

-- 1. VÉRIFIER L'UTILISATEUR ACTUEL
SELECT 
    'UTILISATEUR ACTUEL' as diagnostic_type,
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    u.status,
    'AVANT MODIFICATION' as modification_status
FROM users u
WHERE u.auth_id = auth.uid();

-- 2. ÉLEVER LES PERMISSIONS À ADMIN
UPDATE users 
SET 
    role = 'Admin',
    updated_at = NOW()
WHERE auth_id = auth.uid()
AND role NOT IN ('SuperAdmin', 'Admin');

-- 3. VÉRIFIER LA MODIFICATION
SELECT 
    'UTILISATEUR MODIFIÉ' as diagnostic_type,
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    u.status,
    CASE 
        WHEN u.role IN ('SuperAdmin', 'Admin') THEN '✅ PEUT CRÉER DES MAGASINS'
        ELSE '❌ NE PEUT PAS CRÉER DES MAGASINS'
    END as permissions,
    'APRÈS MODIFICATION' as modification_status
FROM users u
WHERE u.auth_id = auth.uid();

-- 4. VÉRIFIER LES PERMISSIONS ACTUELLES
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

-- 5. RÉSUMÉ FINAL
SELECT 
    'RÉSUMÉ FINAL' as diagnostic_type,
    CASE 
        WHEN is_superadmin() THEN 'SUPERADMIN - ACCÈS COMPLET'
        WHEN is_admin() THEN 'ADMIN - PEUT CRÉER DES MAGASINS'
        ELSE 'UTILISATEUR NORMAL - ACCÈS LIMITÉ'
    END as user_permissions,
    CASE 
        WHEN is_superadmin() OR is_admin() THEN '✅ PEUT CRÉER DES MAGASINS'
        ELSE '❌ NE PEUT PAS CRÉER DES MAGASINS'
    END as store_creation_status;

-- Validation de la transaction
COMMIT;

-- Message de fin
SELECT '🎉 PERMISSIONS UTILISATEUR ÉLEVÉES AVEC SUCCÈS' as result;
