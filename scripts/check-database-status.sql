-- Script pour vérifier l'état de la base de données GesFlex Pro
-- À exécuter dans l'interface SQL de Supabase

-- 1. Vérifier les tables existantes
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Vérifier les triggers existants
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 3. Vérifier les fonctions existantes
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 4. Vérifier les politiques RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 5. Vérifier les contraintes
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type;

-- 6. Vérifier les types personnalisés
SELECT 
    typname,
    typtype
FROM pg_type 
WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND typtype = 'e'
ORDER BY typname;

-- 7. Vérifier les données dans les tables principales
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'stores' as table_name, COUNT(*) as count FROM stores
UNION ALL
SELECT 'products' as table_name, COUNT(*) as count FROM products
UNION ALL
SELECT 'categories' as table_name, COUNT(*) as count FROM categories
UNION ALL
SELECT 'units' as table_name, COUNT(*) as count FROM units
UNION ALL
SELECT 'suppliers' as table_name, COUNT(*) as count FROM suppliers
UNION ALL
SELECT 'system_settings' as table_name, COUNT(*) as count FROM system_settings;

-- 8. Vérifier les erreurs récentes dans les logs (si accessible)
-- Cette requête peut ne pas fonctionner selon les permissions
SELECT 
    log_time,
    error_severity,
    message
FROM pg_stat_activity 
WHERE state = 'active'
ORDER BY log_time DESC
LIMIT 10; 