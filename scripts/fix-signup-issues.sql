-- Script pour diagnostiquer et corriger les problèmes d'inscription GesFlex Pro
-- À exécuter dans l'interface SQL de Supabase

-- 1. Vérifier si la table users existe et sa structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Vérifier si le trigger handle_new_user existe
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'handle_new_user'
AND trigger_schema = 'public';

-- 3. Vérifier les politiques RLS sur la table users
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users'
AND schemaname = 'public';

-- 4. Vérifier les contraintes sur la table users
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'users'
AND tc.table_schema = 'public';

-- 5. Vérifier les types ENUM utilisés
SELECT 
    typname,
    enumlabel
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND typname IN ('user_role', 'user_status')
ORDER BY typname, enumsortorder;

-- 6. Vérifier les données existantes dans users
SELECT 
    id,
    auth_id,
    email,
    first_name,
    last_name,
    role,
    status,
    created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- 7. Vérifier les connexions actives (alternative aux logs)
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    state_change
FROM pg_stat_activity 
WHERE state = 'active'
AND query NOT LIKE '%pg_stat_activity%'
ORDER BY query_start DESC
LIMIT 10;

-- 8. Script de correction - Recréer le trigger si nécessaire
-- Décommenter et exécuter si le trigger n'existe pas

/*
-- Supprimer le trigger s'il existe
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;

-- Recréer le trigger
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
*/

-- 9. Vérifier les permissions sur la table users
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'users'
AND table_schema = 'public';

-- 10. Vérifier les séquences utilisées
SELECT 
    sequence_name,
    data_type,
    start_value,
    minimum_value,
    maximum_value,
    increment
FROM information_schema.sequences 
WHERE sequence_schema = 'public'
AND sequence_name LIKE '%users%'; 