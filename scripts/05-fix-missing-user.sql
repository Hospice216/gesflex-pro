-- ========================================
-- CORRECTION UTILISATEUR MANQUANT
-- ========================================

SELECT '=== CORRECTION UTILISATEUR MANQUANT ===' as info;

-- 1. Vérifier l'utilisateur dans auth.users
SELECT '=== VÉRIFICATION AUTH.USERS ===' as info;

SELECT 
    id,
    email,
    raw_user_meta_data,
    created_at
FROM auth.users 
WHERE id = '3ae5d228-6b71-47e3-8d08-4c667d0c3414';

-- 2. Vérifier l'utilisateur dans public.users
SELECT '=== VÉRIFICATION PUBLIC.USERS ===' as info;

SELECT 
    id,
    auth_id,
    email,
    first_name,
    last_name,
    role,
    status
FROM public.users 
WHERE auth_id = '3ae5d228-6b71-47e3-8d08-4c667d0c3414';

-- 3. Créer manuellement l'utilisateur manquant
SELECT '=== CRÉATION MANUELLE UTILISATEUR ===' as info;

-- Vérifier d'abord si l'utilisateur existe dans auth.users
DO $$
DECLARE
    user_exists BOOLEAN;
    user_email TEXT;
    user_first_name TEXT;
    user_last_name TEXT;
BEGIN
    -- Vérifier si l'utilisateur existe
    SELECT EXISTS (
        SELECT 1 FROM auth.users WHERE id = '3ae5d228-6b71-47e3-8d08-4c667d0c3414'
    ) INTO user_exists;
    
    IF user_exists THEN
        -- Récupérer les données de l'utilisateur
        SELECT 
            email,
            COALESCE(raw_user_meta_data->>'first_name', 'Utilisateur'),
            COALESCE(raw_user_meta_data->>'last_name', 'Test')
        INTO user_email, user_first_name, user_last_name
        FROM auth.users 
        WHERE id = '3ae5d228-6b71-47e3-8d08-4c667d0c3414';
        
        RAISE NOTICE 'Utilisateur trouvé dans auth.users: %', user_email;
        
        -- Créer l'utilisateur dans public.users
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
            '3ae5d228-6b71-47e3-8d08-4c667d0c3414',
            user_email,
            user_first_name,
            user_last_name,
            'Vendeur',
            'pending',
            NOW(),
            NOW()
        )
        ON CONFLICT (auth_id) DO NOTHING;
        
        RAISE NOTICE '✅ Utilisateur créé dans public.users';
    ELSE
        RAISE NOTICE '❌ Utilisateur NON trouvé dans auth.users avec ID: 3ae5d228-6b71-47e3-8d08-4c667d0c3414';
        
        -- Créer un utilisateur de test avec des valeurs par défaut
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
            '3ae5d228-6b71-47e3-8d08-4c667d0c3414',
            'test@default.com',
            'Utilisateur',
            'Test',
            'Vendeur',
            'pending',
            NOW(),
            NOW()
        )
        ON CONFLICT (auth_id) DO NOTHING;
        
        RAISE NOTICE '✅ Utilisateur de test créé dans public.users';
    END IF;
END $$;

-- 4. Vérifier que l'utilisateur a été créé
SELECT '=== VÉRIFICATION CRÉATION ===' as info;

SELECT 
    id,
    auth_id,
    email,
    first_name,
    last_name,
    role,
    status,
    created_at
FROM public.users 
WHERE auth_id = '3ae5d228-6b71-47e3-8d08-4c667d0c3414';

-- 5. Vérifier le trigger handle_new_user
SELECT '=== VÉRIFICATION TRIGGER ===' as info;

SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_name = 'handle_new_user';

-- 6. Test du trigger avec un nouvel utilisateur
SELECT '=== TEST TRIGGER ===' as info;

DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_result BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE 'Test User ID: %', test_user_id;
    
    -- Créer un utilisateur de test dans auth.users
    INSERT INTO auth.users (
        id,
        email,
        raw_user_meta_data,
        created_at,
        updated_at
    ) VALUES (
        test_user_id,
        'test@trigger.com',
        '{"first_name": "Test", "last_name": "Trigger"}',
        NOW(),
        NOW()
    );
    
    -- Vérifier si le trigger a créé l'utilisateur dans public.users
    SELECT EXISTS (
        SELECT 1 FROM public.users WHERE auth_id = test_user_id
    ) INTO test_result;
    
    IF test_result THEN
        RAISE NOTICE '✅ Trigger fonctionne - Utilisateur créé dans public.users';
        
        -- Afficher les détails
        SELECT 
            id, auth_id, email, first_name, last_name, role, status
        FROM public.users 
        WHERE auth_id = test_user_id;
    ELSE
        RAISE NOTICE '❌ Trigger ne fonctionne pas - Utilisateur NON créé dans public.users';
    END IF;
    
    -- Nettoyage
    DELETE FROM public.users WHERE auth_id = test_user_id;
    DELETE FROM auth.users WHERE id = test_user_id;
    
END $$;

SELECT '=== CORRECTION UTILISATEUR MANQUANT TERMINÉE ===' as info; 