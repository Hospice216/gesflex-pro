-- Correction complète et définitive du trigger handle_new_user
-- À exécuter dans l'interface SQL de Supabase

-- 1. Vérifier l'état actuel
SELECT '=== ÉTAT ACTUEL ===' as info;

-- Vérifier les triggers existants
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    event_object_schema,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_name = 'handle_new_user';

-- Vérifier les fonctions existantes
SELECT 
    routine_name,
    routine_schema
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- 2. Nettoyage complet
SELECT '=== NETTOYAGE COMPLET ===' as info;

-- Supprimer TOUS les triggers et fonctions
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON public.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 3. Vérifier la structure de la table users
SELECT '=== STRUCTURE TABLE USERS ===' as info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Créer une fonction ultra-simple et robuste
SELECT '=== CRÉATION FONCTION ===' as info;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Log pour débogage
    RAISE NOTICE 'Début handle_new_user - ID: %, Email: %', NEW.id, NEW.email;
    
    -- Insérer avec des valeurs par défaut garanties
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
        NEW.id,
        NEW.email,
        'Utilisateur',  -- Valeur par défaut garantie
        'Test',         -- Valeur par défaut garantie
        'Vendeur',
        'active',
        NOW(),
        NOW()
    );
    
    RAISE NOTICE 'Utilisateur créé avec succès dans public.users';
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ERREUR dans handle_new_user: %', SQLERRM;
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Créer le trigger
SELECT '=== CRÉATION TRIGGER ===' as info;

CREATE TRIGGER handle_new_user
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 6. Vérifier la création
SELECT '=== VÉRIFICATION ===' as info;

SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    event_object_schema,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_name = 'handle_new_user';

-- 7. Test complet
SELECT '=== TEST COMPLET ===' as info;

DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_result BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '=== DÉBUT DU TEST ===';
    RAISE NOTICE 'Test User ID: %', test_user_id;
    
    -- Test 1: Insertion dans auth.users
    RAISE NOTICE 'Test 1: Insertion dans auth.users...';
    INSERT INTO auth.users (
        id,
        email,
        raw_user_meta_data,
        created_at,
        updated_at
    ) VALUES (
        test_user_id,
        'test@complete.com',
        '{"first_name": "Test", "last_name": "Complete"}',
        NOW(),
        NOW()
    );
    RAISE NOTICE '✅ Insertion auth.users réussie';
    
    -- Test 2: Vérifier dans public.users
    RAISE NOTICE 'Test 2: Vérification dans public.users...';
    SELECT EXISTS (
        SELECT 1 FROM public.users WHERE auth_id = test_user_id
    ) INTO test_result;
    
    IF test_result THEN
        RAISE NOTICE '✅ Utilisateur trouvé dans public.users';
        
        -- Afficher les données
        SELECT 
            id, auth_id, email, first_name, last_name, role, status
        FROM public.users 
        WHERE auth_id = test_user_id;
    ELSE
        RAISE NOTICE '❌ Utilisateur NON trouvé dans public.users';
    END IF;
    
    -- Nettoyage
    RAISE NOTICE 'Nettoyage...';
    DELETE FROM public.users WHERE auth_id = test_user_id;
    DELETE FROM auth.users WHERE id = test_user_id;
    
    RAISE NOTICE '=== TEST TERMINÉ ===';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ ERREUR PENDANT LE TEST: %', SQLERRM;
        -- Nettoyage en cas d'erreur
        DELETE FROM public.users WHERE auth_id = test_user_id;
        DELETE FROM auth.users WHERE id = test_user_id;
END $$; 