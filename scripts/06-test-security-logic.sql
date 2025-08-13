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

-- 2. Créer un utilisateur de test avec profil
SELECT '=== CRÉATION UTILISATEUR AVEC PROFIL ===' as info;

DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
BEGIN
    -- Créer dans auth.users
    INSERT INTO auth.users (
        id,
        email,
        raw_user_meta_data,
        created_at,
        updated_at
    ) VALUES (
        test_user_id,
        'test-with-profile@gesflex.com',
        '{"first_name": "Test", "last_name": "WithProfile"}',
        NOW(),
        NOW()
    );
    
    -- Créer dans public.users (le trigger devrait le faire automatiquement)
    INSERT INTO public.users (
        auth_id,
        email,
        first_name,
        last_name,
        role,
        status,
        created_at,
        updated_at
    ) VALUES (
        test_user_id,
        'test-with-profile@gesflex.com',
        'Test',
        'WithProfile',
        'Vendeur',
        'pending',
        NOW(),
        NOW()
    )
    ON CONFLICT (auth_id) DO NOTHING;
    
    RAISE NOTICE '✅ Utilisateur avec profil créé: %', test_user_id;
END $$;

-- 3. Créer un utilisateur de test SANS profil (pour tester la sécurité)
SELECT '=== CRÉATION UTILISATEUR SANS PROFIL (TEST SÉCURITÉ) ===' as info;

DO $$
DECLARE
    test_user_id_no_profile UUID := gen_random_uuid();
BEGIN
    -- Créer seulement dans auth.users (pas dans public.users)
    INSERT INTO auth.users (
        id,
        email,
        raw_user_meta_data,
        created_at,
        updated_at
    ) VALUES (
        test_user_id_no_profile,
        'test-no-profile@gesflex.com',
        '{"first_name": "Test", "last_name": "NoProfile"}',
        NOW(),
        NOW()
    );
    
    RAISE NOTICE '⚠️ Utilisateur SANS profil créé (pour test sécurité): %', test_user_id_no_profile;
    RAISE NOTICE 'Cet utilisateur devrait être automatiquement déconnecté par le frontend';
END $$;

-- 4. Vérifier les utilisateurs créés
SELECT '=== VÉRIFICATION UTILISATEURS CRÉÉS ===' as info;

SELECT 
    'Utilisateurs dans auth.users après création' as info,
    COUNT(*) as count
FROM auth.users;

SELECT 
    'Utilisateurs dans public.users après création' as info,
    COUNT(*) as count
FROM public.users;

-- 5. Afficher les utilisateurs de test
SELECT '=== UTILISATEURS DE TEST ===' as info;

SELECT 
    'auth.users' as table_name,
    id,
    email,
    created_at
FROM auth.users 
WHERE email LIKE '%test%'
ORDER BY created_at DESC;

SELECT 
    'public.users' as table_name,
    auth_id,
    email,
    first_name,
    last_name,
    role,
    status,
    created_at
FROM public.users 
WHERE email LIKE '%test%'
ORDER BY created_at DESC;

-- 6. Identifier les utilisateurs orphelins (dans auth.users mais pas dans public.users)
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