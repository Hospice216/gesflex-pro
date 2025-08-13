-- Script pour vérifier la structure de la table users
-- À exécuter dans l'interface SQL de Supabase

-- 1. Vérifier la structure complète de la table users
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

-- 2. Vérifier les contraintes sur la table users
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass
ORDER BY conname;

-- 3. Vérifier les données existantes (sans la colonne name)
SELECT 
    id,
    auth_id,
    email,
    role,
    status,
    created_at,
    updated_at
FROM public.users 
LIMIT 5;

-- 4. Vérifier le trigger handle_new_user
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND event_object_schema = 'public'
AND trigger_name = 'handle_new_user'; 