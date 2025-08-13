-- Script pour vérifier et corriger le trigger handle_new_user
-- À exécuter dans l'interface SQL de Supabase

-- 1. Vérifier le trigger actuel
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND event_object_schema = 'public'
AND trigger_name = 'handle_new_user';

-- 2. Vérifier la fonction du trigger
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user' 
AND routine_schema = 'public';

-- 3. Supprimer le trigger et la fonction problématiques
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- 4. Créer une nouvelle fonction corrigée
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Recréer le trigger
CREATE TRIGGER handle_new_user
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 6. Vérifier que le trigger est créé
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND event_object_schema = 'auth'
AND trigger_name = 'handle_new_user';

-- 7. Test de la fonction
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
BEGIN
    -- Simuler l'insertion d'un utilisateur auth
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
    
    -- Vérifier que l'utilisateur a été créé dans public.users
    IF EXISTS (SELECT 1 FROM public.users WHERE auth_id = test_user_id) THEN
        RAISE NOTICE '✅ Trigger fonctionne correctement';
    ELSE
        RAISE NOTICE '❌ Trigger ne fonctionne pas';
    END IF;
    
    -- Nettoyer le test
    DELETE FROM public.users WHERE auth_id = test_user_id;
    DELETE FROM auth.users WHERE id = test_user_id;
END $$; 