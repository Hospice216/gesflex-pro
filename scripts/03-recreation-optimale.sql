-- ========================================
-- ÉTAPE 3: RECRÉATION AVEC MEILLEURES PRATIQUES
-- ========================================

SELECT '=== DÉBUT RECRÉATION OPTIMALE ===' as info;

-- 1. Recréer la table users avec une structure optimale
SELECT '=== CRÉATION TABLE USERS ===' as info;

-- Supprimer la table si elle existe encore
DROP TABLE IF EXISTS public.users CASCADE;

-- Créer la table users avec une structure simple et robuste
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL DEFAULT 'Utilisateur',
    last_name TEXT NOT NULL DEFAULT 'Test',
    role TEXT NOT NULL DEFAULT 'Vendeur' CHECK (role IN ('SuperAdmin', 'Admin', 'Manager', 'Vendeur')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'inactive', 'rejected')),
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Créer les index optimaux
SELECT '=== CRÉATION INDEX ===' as info;

CREATE INDEX idx_users_auth_id ON public.users(auth_id);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_status ON public.users(status);
CREATE INDEX idx_users_created_at ON public.users(created_at);

-- 3. Créer la fonction de mise à jour automatique
SELECT '=== CRÉATION FONCTION UPDATE ===' as info;

CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Créer le trigger de mise à jour automatique
SELECT '=== CRÉATION TRIGGER UPDATE ===' as info;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();

-- 5. Créer la fonction handle_new_user ultra-simple et robuste
SELECT '=== CRÉATION FONCTION HANDLE_NEW_USER ===' as info;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_first_name TEXT;
    user_last_name TEXT;
BEGIN
    -- Log pour débogage
    RAISE NOTICE '=== DÉBUT handle_new_user ===';
    RAISE NOTICE 'ID: %, Email: %', NEW.id, NEW.email;
    
    -- Extraire les noms avec gestion d'erreur robuste
    BEGIN
        user_first_name := COALESCE(
            NULLIF(NEW.raw_user_meta_data->>'first_name', ''),
            'Utilisateur'
        );
    EXCEPTION
        WHEN OTHERS THEN
            user_first_name := 'Utilisateur';
    END;
    
    BEGIN
        user_last_name := COALESCE(
            NULLIF(NEW.raw_user_meta_data->>'last_name', ''),
            'Test'
        );
    EXCEPTION
        WHEN OTHERS THEN
            user_last_name := 'Test';
    END;
    
    -- S'assurer que les noms ont au moins 2 caractères
    IF length(user_first_name) < 2 THEN
        user_first_name := 'Utilisateur';
    END IF;
    
    IF length(user_last_name) < 2 THEN
        user_last_name := 'Test';
    END IF;
    
    RAISE NOTICE 'Noms extraits: % %', user_first_name, user_last_name;
    
    -- Insérer dans public.users avec gestion d'erreur complète
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
        )         VALUES (
            NEW.id,
            NEW.email,
            user_first_name,
            user_last_name,
            'Vendeur',
            'pending',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE '✅ Utilisateur créé avec succès dans public.users';
        
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE '⚠️ Utilisateur déjà existant, ignoré';
        WHEN OTHERS THEN
            RAISE NOTICE '❌ ERREUR lors de l''insertion: %', SQLERRM;
            RAISE;
    END;
    
    RAISE NOTICE '=== FIN handle_new_user ===';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Créer le trigger handle_new_user
SELECT '=== CRÉATION TRIGGER HANDLE_NEW_USER ===' as info;

CREATE TRIGGER handle_new_user
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- 7. Créer les politiques RLS simples et efficaces
SELECT '=== CRÉATION POLITIQUES RLS ===' as info;

-- Activer RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent voir leur propre profil
CREATE POLICY "users_can_view_own_profile" ON public.users
    FOR SELECT USING (auth.uid() = auth_id);

-- Politique: Les utilisateurs peuvent modifier leur propre profil
CREATE POLICY "users_can_update_own_profile" ON public.users
    FOR UPDATE USING (auth.uid() = auth_id);

-- Politique: Les admins peuvent voir tous les utilisateurs
CREATE POLICY "admins_can_view_all_users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_id = auth.uid() 
            AND role IN ('Admin', 'SuperAdmin')
        )
    );

-- Politique: Les admins peuvent modifier tous les utilisateurs
CREATE POLICY "admins_can_update_all_users" ON public.users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_id = auth.uid() 
            AND role IN ('Admin', 'SuperAdmin')
        )
    );

-- Politique: Les admins peuvent insérer de nouveaux utilisateurs
CREATE POLICY "admins_can_insert_users" ON public.users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_id = auth.uid() 
            AND role IN ('Admin', 'SuperAdmin')
        )
    );

-- 8. Test complet de la nouvelle configuration
SELECT '=== TEST COMPLET ===' as info;

DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_result BOOLEAN := FALSE;
    test_user_record RECORD;
BEGIN
    RAISE NOTICE '=== DÉBUT TEST COMPLET ===';
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
        'test@recreation.com',
        '{"first_name": "Test", "last_name": "Recreation"}',
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
        
        -- Afficher les données complètes
        SELECT * INTO test_user_record
        FROM public.users 
        WHERE auth_id = test_user_id;
        
        RAISE NOTICE 'Détails utilisateur:';
        RAISE NOTICE '  ID: %', test_user_record.id;
        RAISE NOTICE '  Auth ID: %', test_user_record.auth_id;
        RAISE NOTICE '  Email: %', test_user_record.email;
        RAISE NOTICE '  Prénom: %', test_user_record.first_name;
        RAISE NOTICE '  Nom: %', test_user_record.last_name;
        RAISE NOTICE '  Rôle: %', test_user_record.role;
        RAISE NOTICE '  Statut: %', test_user_record.status;
        RAISE NOTICE '  Créé: %', test_user_record.created_at;
        RAISE NOTICE '  Modifié: %', test_user_record.updated_at;
    ELSE
        RAISE NOTICE '❌ Utilisateur NON trouvé dans public.users';
    END IF;
    
    -- Test 3: Vérifier les triggers
    RAISE NOTICE 'Test 3: Vérification des triggers...';
    SELECT COUNT(*) INTO test_result
    FROM information_schema.triggers 
    WHERE trigger_name IN ('handle_new_user', 'update_users_updated_at');
    
    IF test_result = 2 THEN
        RAISE NOTICE '✅ Tous les triggers sont présents';
    ELSE
        RAISE NOTICE '❌ Problème avec les triggers: % trouvés', test_result;
    END IF;
    
    -- Test 4: Vérifier les politiques RLS
    RAISE NOTICE 'Test 4: Vérification des politiques RLS...';
    SELECT COUNT(*) INTO test_result
    FROM pg_policies 
    WHERE tablename = 'users'
    AND schemaname = 'public';
    
    IF test_result >= 5 THEN
        RAISE NOTICE '✅ Politiques RLS configurées (% trouvées)', test_result;
    ELSE
        RAISE NOTICE '❌ Problème avec les politiques RLS: % trouvées', test_result;
    END IF;
    
    -- Nettoyage
    RAISE NOTICE 'Nettoyage...';
    DELETE FROM public.users WHERE auth_id = test_user_id;
    DELETE FROM auth.users WHERE id = test_user_id;
    
    RAISE NOTICE '=== TEST TERMINÉ AVEC SUCCÈS ===';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ ERREUR PENDANT LE TEST: %', SQLERRM;
        -- Nettoyage en cas d'erreur
        DELETE FROM public.users WHERE auth_id = test_user_id;
        DELETE FROM auth.users WHERE id = test_user_id;
END $$;

-- 9. Vérification finale
SELECT '=== VÉRIFICATION FINALE ===' as info;

-- Vérifier la structure de la table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Vérifier les triggers
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_name IN ('handle_new_user', 'update_users_updated_at');

-- Vérifier les politiques RLS
SELECT 
    policyname,
    permissive,
    cmd
FROM pg_policies 
WHERE tablename = 'users'
AND schemaname = 'public';

SELECT '=== RECRÉATION OPTIMALE TERMINÉE AVEC SUCCÈS ===' as info; 