-- Script de diagnostic avancé pour GesFlex Pro
-- À exécuter dans l'interface SQL de Supabase

-- 1. Vérifier l'état actuel de la base de données
SELECT '=== ÉTAT ACTUEL DE LA BASE ===' as section;

-- Vérifier les types ENUM
SELECT 'Types ENUM existants:' as info;
SELECT typname, typtype 
FROM pg_type 
WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND typtype = 'e'
ORDER BY typname;

-- Vérifier la table users
SELECT 'Structure de la table users:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Vérifier les triggers sur auth.users
SELECT 'Triggers sur auth.users:' as info;
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users'
AND event_object_schema = 'auth'
ORDER BY trigger_name;

-- Vérifier les fonctions
SELECT 'Fonctions handle_new_user:' as info;
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name LIKE '%handle_new_user%'
AND routine_schema = 'public';

-- 2. Test de création manuelle d'un utilisateur
SELECT '=== TEST CRÉATION MANUELLE ===' as section;

-- Vérifier si on peut insérer dans auth.users
SELECT 'Test insertion auth.users:' as test;
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Créer un utilisateur de test dans auth.users
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        'test@diagnostic.com',
        crypt('password123', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{"first_name":"Test","last_name":"User"}',
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    ) RETURNING id INTO test_user_id;
    
    RAISE NOTICE 'Utilisateur de test créé avec ID: %', test_user_id;
    
    -- Vérifier si le trigger a fonctionné
    IF EXISTS (SELECT 1 FROM public.users WHERE auth_id = test_user_id) THEN
        RAISE NOTICE '✅ Trigger handle_new_user a fonctionné';
    ELSE
        RAISE NOTICE '❌ Trigger handle_new_user a échoué';
    END IF;
    
    -- Nettoyer
    DELETE FROM auth.users WHERE id = test_user_id;
    DELETE FROM public.users WHERE auth_id = test_user_id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Erreur lors du test: %', SQLERRM;
END $$;

-- 3. Vérifier les permissions
SELECT '=== PERMISSIONS ===' as section;

-- Permissions sur la table users
SELECT 'Permissions sur public.users:' as info;
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'users'
AND table_schema = 'public'
ORDER BY grantee, privilege_type;

-- Permissions sur auth.users
SELECT 'Permissions sur auth.users:' as info;
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'users'
AND table_schema = 'auth'
ORDER BY grantee, privilege_type;

-- 4. Vérifier les politiques RLS
SELECT '=== POLITIQUES RLS ===' as section;
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users'
AND schemaname = 'public'
ORDER BY policyname;

-- 5. Test de la fonction handle_new_user
SELECT '=== TEST FONCTION ===' as section;
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_email TEXT := 'test@function.com';
    test_first_name TEXT := 'Test';
    test_last_name TEXT := 'Function';
    result BOOLEAN;
BEGIN
    -- Simuler un utilisateur auth.users
    RAISE NOTICE 'Test de la fonction handle_new_user...';
    
    -- Appeler la fonction directement
    BEGIN
        PERFORM public.handle_new_user();
        RAISE NOTICE '✅ Fonction exécutée sans erreur';
        result := TRUE;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Erreur dans la fonction: %', SQLERRM;
        result := FALSE;
    END;
    
    -- Vérifier si on peut insérer manuellement
    BEGIN
        INSERT INTO public.users (auth_id, email, first_name, last_name, role, status)
        VALUES (test_user_id, test_email, test_first_name, test_last_name, 'Vendeur', 'pending');
        RAISE NOTICE '✅ Insertion manuelle réussie';
        
        -- Nettoyer
        DELETE FROM public.users WHERE auth_id = test_user_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Erreur insertion manuelle: %', SQLERRM;
    END;
    
END $$;

-- 6. Résumé des problèmes potentiels
SELECT '=== RÉSUMÉ DES PROBLÈMES ===' as section;
SELECT 
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') 
        THEN '❌ Type user_role manquant'
        ELSE '✅ Type user_role OK'
    END as probleme_1
UNION ALL
SELECT 
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') 
        THEN '❌ Type user_status manquant'
        ELSE '✅ Type user_status OK'
    END as probleme_2
UNION ALL
SELECT 
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') 
        THEN '❌ Table users manquante'
        ELSE '✅ Table users OK'
    END as probleme_3
UNION ALL
SELECT 
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'handle_new_user') 
        THEN '❌ Trigger handle_new_user manquant'
        ELSE '✅ Trigger handle_new_user OK'
    END as probleme_4
UNION ALL
SELECT 
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'handle_new_user') 
        THEN '❌ Fonction handle_new_user manquante'
        ELSE '✅ Fonction handle_new_user OK'
    END as probleme_5
UNION ALL
SELECT 
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public') 
        THEN '❌ Politiques RLS manquantes'
        ELSE '✅ Politiques RLS OK'
    END as probleme_6; 