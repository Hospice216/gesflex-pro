-- Script pour diagnostiquer et corriger l'erreur du trigger
-- À exécuter dans l'interface SQL de Supabase

-- 1. Vérifier les logs d'erreur récents
SELECT 
    log_time,
    error_severity,
    message,
    detail,
    hint
FROM pg_stat_activity 
WHERE state = 'active' 
AND query LIKE '%handle_new_user%'
ORDER BY log_time DESC
LIMIT 10;

-- 2. Vérifier la structure exacte de la table users
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Vérifier les contraintes actuelles
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass
ORDER BY conname;

-- 4. Supprimer complètement le trigger et la fonction
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- 5. Créer une fonction simplifiée et robuste
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Vérifier que les données nécessaires existent
    IF NEW.id IS NULL OR NEW.email IS NULL THEN
        RAISE EXCEPTION 'Données utilisateur manquantes';
    END IF;
    
    -- Insérer avec des valeurs par défaut sécurisées
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
        COALESCE(NEW.raw_user_meta_data->>'first_name', 'Utilisateur'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', 'Test'),
        'Vendeur',
        'active',
        NOW(),
        NOW()
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log l'erreur pour le débogage
        RAISE NOTICE 'Erreur dans handle_new_user: %', SQLERRM;
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Recréer le trigger
CREATE TRIGGER handle_new_user
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 7. Vérifier que le trigger est créé
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    event_object_schema,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_name = 'handle_new_user';

-- 8. Test de la fonction avec gestion d'erreur
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_result BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE 'Début du test avec ID: %', test_user_id;
    
    -- Simuler l'insertion d'un utilisateur auth
    INSERT INTO auth.users (
        id,
        email,
        raw_user_meta_data,
        created_at,
        updated_at
    ) VALUES (
        test_user_id,
        'test@debug.com',
        '{"first_name": "Test", "last_name": "Debug"}',
        NOW(),
        NOW()
    );
    
    -- Vérifier que l'utilisateur a été créé dans public.users
    SELECT EXISTS (
        SELECT 1 FROM public.users WHERE auth_id = test_user_id
    ) INTO test_result;
    
    IF test_result THEN
        RAISE NOTICE '✅ Test réussi - Utilisateur créé dans public.users';
        
        -- Afficher les données créées
        SELECT 
            id, auth_id, email, first_name, last_name, role, status
        FROM public.users 
        WHERE auth_id = test_user_id;
    ELSE
        RAISE NOTICE '❌ Test échoué - Utilisateur non trouvé dans public.users';
    END IF;
    
    -- Nettoyer le test
    DELETE FROM public.users WHERE auth_id = test_user_id;
    DELETE FROM auth.users WHERE id = test_user_id;
    
    RAISE NOTICE 'Test terminé';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Erreur pendant le test: %', SQLERRM;
        -- Nettoyer en cas d'erreur
        DELETE FROM public.users WHERE auth_id = test_user_id;
        DELETE FROM auth.users WHERE id = test_user_id;
END $$; 