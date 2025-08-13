-- Script de correction rapide pour les problèmes d'inscription GesFlex Pro
-- À exécuter dans l'interface SQL de Supabase

-- 1. Vérifier et corriger les types ENUM
DO $$ 
BEGIN
    -- Créer le type user_role s'il n'existe pas
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('SuperAdmin', 'Admin', 'Manager', 'Vendeur');
    END IF;
    
    -- Créer le type user_status s'il n'existe pas
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM ('pending', 'active', 'rejected');
    END IF;
END $$;

-- 2. Vérifier et corriger la table users
DO $$ 
BEGIN
    -- Créer la table users si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        CREATE TABLE public.users (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
            email TEXT NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            role user_role DEFAULT 'Vendeur',
            status user_status DEFAULT 'pending',
            phone TEXT,
            avatar_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
    
    -- Ajouter les colonnes manquantes si nécessaire
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
        ALTER TABLE public.users ADD COLUMN role user_role DEFAULT 'Vendeur';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'status') THEN
        ALTER TABLE public.users ADD COLUMN status user_status DEFAULT 'pending';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone') THEN
        ALTER TABLE public.users ADD COLUMN phone TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'avatar_url') THEN
        ALTER TABLE public.users ADD COLUMN avatar_url TEXT;
    END IF;
END $$;

-- 3. Recréer le trigger handle_new_user
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_id, email, first_name, last_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'Vendeur',
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Vérifier et corriger les politiques RLS
DO $$ 
BEGIN
    -- Activer RLS sur la table users
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    
    -- Supprimer les anciennes politiques
    DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
    DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
    DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
    
    -- Créer les nouvelles politiques
    CREATE POLICY "Users can view own profile" ON public.users
        FOR SELECT USING (auth_id = auth.uid());
    
    CREATE POLICY "Admins can view all users" ON public.users
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.users 
                WHERE auth_id = auth.uid() 
                AND role IN ('SuperAdmin', 'Admin')
            )
        );
    
    CREATE POLICY "Users can update own profile" ON public.users
        FOR UPDATE USING (auth_id = auth.uid());
    
    CREATE POLICY "Admins can update all users" ON public.users
        FOR UPDATE USING (
            EXISTS (
                SELECT 1 FROM public.users 
                WHERE auth_id = auth.uid() 
                AND role IN ('SuperAdmin', 'Admin')
            )
        );
END $$;

-- 5. Créer un SuperAdmin initial si aucun n'existe
DO $$ 
DECLARE
    superadmin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO superadmin_count 
    FROM public.users 
    WHERE role = 'SuperAdmin';
    
    IF superadmin_count = 0 THEN
        -- Insérer un SuperAdmin par défaut (à modifier selon vos besoins)
        INSERT INTO public.users (auth_id, email, first_name, last_name, role, status)
        VALUES (
            '00000000-0000-0000-0000-000000000000', -- UUID temporaire
            'admin@gesflex.com',
            'Super',
            'Admin',
            'SuperAdmin',
            'active'
        );
        
        RAISE NOTICE 'SuperAdmin créé avec succès';
    ELSE
        RAISE NOTICE 'SuperAdmin existe déjà';
    END IF;
END $$;

-- 6. Vérifier les résultats
SELECT 
    'Tables' as check_type,
    table_name as name,
    'OK' as status
FROM information_schema.tables 
WHERE table_name = 'users' 
AND table_schema = 'public'

UNION ALL

SELECT 
    'Triggers' as check_type,
    trigger_name as name,
    'OK' as status
FROM information_schema.triggers 
WHERE trigger_name = 'handle_new_user'
AND trigger_schema = 'public'

UNION ALL

SELECT 
    'Policies' as check_type,
    policyname as name,
    'OK' as status
FROM pg_policies 
WHERE tablename = 'users'
AND schemaname = 'public'

UNION ALL

SELECT 
    'Types' as check_type,
    typname as name,
    'OK' as status
FROM pg_type 
WHERE typname IN ('user_role', 'user_status')
AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')

UNION ALL

SELECT 
    'Data' as check_type,
    'users_count' as name,
    COUNT(*)::text as status
FROM public.users; 