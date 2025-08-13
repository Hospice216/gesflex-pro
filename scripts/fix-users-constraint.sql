-- Script pour corriger la contrainte users_name_check
-- À exécuter dans l'interface SQL de Supabase

-- 1. Vérifier la contrainte actuelle
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'users_name_check' 
AND conrelid = 'public.users'::regclass;

-- 2. Supprimer la contrainte problématique si elle existe
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_name_check;

-- 3. Vérifier la structure de la table users
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Vérifier les données existantes
SELECT 
    id,
    name,
    email,
    role,
    status,
    created_at
FROM public.users 
LIMIT 5;

-- 5. Ajouter une contrainte plus appropriée si nécessaire
-- (Seulement si la colonne name existe et doit avoir des contraintes)
DO $$
BEGIN
    -- Vérifier si la colonne name existe
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'name' 
        AND table_schema = 'public'
    ) THEN
        -- Ajouter une contrainte plus flexible
        ALTER TABLE public.users 
        ADD CONSTRAINT users_name_check 
        CHECK (name IS NULL OR length(trim(name)) > 0);
        
        RAISE NOTICE 'Contrainte users_name_check ajoutée avec succès';
    ELSE
        RAISE NOTICE 'La colonne name n''existe pas dans la table users';
    END IF;
END $$;

-- 6. Vérifier que la correction fonctionne
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'users_name_check' 
AND conrelid = 'public.users'::regclass; 