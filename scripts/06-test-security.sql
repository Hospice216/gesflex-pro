-- ========================================
-- TEST LOGIQUE DE SÉCURITÉ
-- ========================================

SELECT '=== TEST LOGIQUE DE SÉCURITÉ ===' as info;

-- 1. Vérifier l'état actuel
SELECT '=== ÉTAT ACTUEL ===' as info;

SELECT 
    'Utilisateurs dans auth.users' as info,
    COUNT(*) as count
FROM auth.users;

SELECT 
    'Utilisateurs dans public.users' as info,
    COUNT(*) as count
FROM public.users;

-- 2. Créer un utilisateur de test SANS profil (pour tester la sécurité)
SELECT '=== CRÉATION UTILISATEUR SANS PROFIL (TEST SÉCURITÉ) ===' as info;

DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
BEGIN
    -- Créer seulement dans auth.users (pas dans public.users)
    INSERT INTO auth.users (
        id,
        email,
        raw_user_meta_data,
        created_at,
        updated_at
    ) VALUES (
        test_user_id,
        'test-no-profile@gesflex.com',
        '{"first_name": "Test", "last_name": "NoProfile"}',
        NOW(),
        NOW()
    );
    
    RAISE NOTICE '⚠️ Utilisateur SANS profil créé (pour test sécurité): %', test_user_id;
    RAISE NOTICE 'Cet utilisateur devrait être automatiquement déconnecté par le frontend';
END $$;

-- 3. Identifier les utilisateurs orphelins
SELECT '=== UTILISATEURS ORPHELINS (PROBLÈME DE SÉCURITÉ) ===' as info;

SELECT 
    au.id as auth_id,
    au.email as auth_email,
    au.created_at as auth_created_at,
    CASE 
        WHEN pu.id IS NULL THEN '❌ MANQUANT'
        ELSE '✅ PRÉSENT'
    END as profile_status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.auth_id
WHERE au.email LIKE '%test%'
ORDER BY au.created_at DESC;

SELECT '=== TEST LOGIQUE DE SÉCURITÉ TERMINÉ ===' as info; 