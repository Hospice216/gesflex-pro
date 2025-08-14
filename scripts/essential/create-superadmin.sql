-- =====================================================
-- CRÉATION D'UN SUPERADMIN
-- Créer un utilisateur SuperAdmin pour l'accès complet
-- =====================================================

-- Début de la transaction
BEGIN;

-- 1. VÉRIFIER SI UN SUPERADMIN EXISTE DÉJÀ
SELECT 
    'SUPERADMIN EXISTANT' as diagnostic_type,
    COUNT(*) as superadmin_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ SUPERADMIN EXISTE'
        ELSE '❌ AUCUN SUPERADMIN'
    END as status
FROM users 
WHERE role = 'SuperAdmin';

-- 2. CRÉER UN SUPERADMIN SI AUCUN N'EXISTE
DO $$
DECLARE
    superadmin_count INTEGER;
BEGIN
    -- Compter les SuperAdmin existants
    SELECT COUNT(*) INTO superadmin_count FROM users WHERE role = 'SuperAdmin';
    
    -- Créer un SuperAdmin seulement s'il n'y en a pas
    IF superadmin_count = 0 THEN
        INSERT INTO users (
            email,
            first_name,
            last_name,
            role,
            status,
            created_at,
            updated_at
        ) VALUES (
            'superadmin@gesflex.com',
            'Super',
            'Administrateur',
            'SuperAdmin',
            'active',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'SuperAdmin créé avec succès';
    ELSE
        RAISE NOTICE 'Un SuperAdmin existe déjà';
    END IF;
END $$;

-- 3. VÉRIFIER LES SUPERADMIN APRÈS CRÉATION
SELECT 
    'SUPERADMIN APRÈS CRÉATION' as diagnostic_type,
    id,
    email,
    first_name,
    last_name,
    role,
    status,
    '✅ CRÉÉ' as creation_status
FROM users 
WHERE role = 'SuperAdmin';

-- 4. VÉRIFIER LES PERMISSIONS
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
SELECT '🎉 SUPERADMIN CRÉÉ AVEC SUCCÈS' as result;
