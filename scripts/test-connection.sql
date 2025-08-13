-- Script de test de connexion Frontend-Backend pour GesFlex Pro
-- À exécuter dans l'interface SQL de Supabase

-- 1. Test de base de la connexion
SELECT '=== TEST DE CONNEXION DE BASE ===' as section;

-- Vérifier que la base de données répond
SELECT 
    'Connexion DB OK' as status,
    current_database() as database_name,
    current_user as current_user,
    version() as postgres_version;

-- 2. Test des tables critiques
SELECT '=== TABLES CRITIQUES ===' as section;

-- Vérifier l'existence des tables principales
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('users', 'stores', 'products', 'categories', 'suppliers') THEN 'Table critique'
        ELSE 'Table système'
    END as importance,
    (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as nb_columns
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('users', 'stores', 'products', 'categories', 'suppliers', 'system_settings')
ORDER BY importance DESC, table_name;

-- 3. Test des types ENUM
SELECT '=== TYPES ENUM ===' as section;
SELECT 
    typname as enum_name,
    CASE 
        WHEN typname IN ('user_role', 'user_status', 'product_status', 'sale_status') THEN 'Type critique'
        ELSE 'Type système'
    END as importance
FROM pg_type 
WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND typtype = 'e'
ORDER BY importance DESC, typname;

-- 4. Test des fonctions critiques
SELECT '=== FONCTIONS CRITIQUES ===' as section;
SELECT 
    routine_name,
    routine_type,
    CASE 
        WHEN routine_name IN ('handle_new_user', 'generate_unique_code', 'update_inventory_on_sale') THEN 'Fonction critique'
        ELSE 'Fonction système'
    END as importance
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name IN ('handle_new_user', 'generate_unique_code', 'update_inventory_on_sale', 'validate_purchase')
ORDER BY importance DESC, routine_name;

-- 5. Test des triggers
SELECT '=== TRIGGERS ===' as section;
SELECT 
    trigger_name,
    event_object_table,
    event_manipulation,
    action_timing,
    CASE 
        WHEN trigger_name IN ('handle_new_user', 'update_inventory_updated_at') THEN 'Trigger critique'
        ELSE 'Trigger système'
    END as importance
FROM information_schema.triggers 
WHERE event_object_schema IN ('public', 'auth')
ORDER BY importance DESC, trigger_name;

-- 6. Test des politiques RLS
SELECT '=== POLITIQUES RLS ===' as section;
SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN cmd = 'INSERT' THEN 'Politique dinsertion'
        WHEN cmd = 'SELECT' THEN 'Politique de lecture'
        WHEN cmd = 'UPDATE' THEN 'Politique de modification'
        WHEN cmd = 'DELETE' THEN 'Politique de suppression'
        ELSE 'Autre politique'
    END as type_politique
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- 7. Test de données de base
SELECT '=== DONNÉES DE BASE ===' as section;

-- Compter les utilisateurs
SELECT 
    'users' as table_name,
    count(*) as record_count,
    CASE 
        WHEN count(*) > 0 THEN 'Données présentes'
        ELSE 'Table vide'
    END as status
FROM public.users
UNION ALL
-- Compter les magasins
SELECT 
    'stores' as table_name,
    count(*) as record_count,
    CASE 
        WHEN count(*) > 0 THEN 'Données présentes'
        ELSE 'Table vide'
    END as status
FROM public.stores
UNION ALL
-- Compter les produits
SELECT 
    'products' as table_name,
    count(*) as record_count,
    CASE 
        WHEN count(*) > 0 THEN 'Données présentes'
        ELSE 'Table vide'
    END as status
FROM public.products
UNION ALL
-- Compter les catégories
SELECT 
    'categories' as table_name,
    count(*) as record_count,
    CASE 
        WHEN count(*) > 0 THEN 'Données présentes'
        ELSE 'Table vide'
    END as status
FROM public.categories
UNION ALL
-- Compter les fournisseurs
SELECT 
    'suppliers' as table_name,
    count(*) as record_count,
    CASE 
        WHEN count(*) > 0 THEN 'Données présentes'
        ELSE 'Table vide'
    END as status
FROM public.suppliers
UNION ALL
-- Compter les paramètres système
SELECT 
    'system_settings' as table_name,
    count(*) as record_count,
    CASE 
        WHEN count(*) > 0 THEN 'Données présentes'
        ELSE 'Table vide'
    END as status
FROM public.system_settings;

-- 8. Test de simulation d'opérations frontend
SELECT '=== SIMULATION OPÉRATIONS FRONTEND ===' as section;

-- Test de lecture des paramètres système
DO $$
DECLARE
    settings_count INTEGER;
BEGIN
    SELECT count(*) INTO settings_count FROM public.system_settings;
    RAISE NOTICE 'Paramètres système: % enregistrements', settings_count;
    
    IF settings_count > 0 THEN
        RAISE NOTICE '✅ Lecture des paramètres système OK';
    ELSE
        RAISE NOTICE '⚠️ Aucun paramètre système trouvé';
    END IF;
END $$;

-- Test de lecture des magasins
DO $$
DECLARE
    stores_count INTEGER;
BEGIN
    SELECT count(*) INTO stores_count FROM public.stores;
    RAISE NOTICE 'Magasins: % enregistrements', stores_count;
    
    IF stores_count > 0 THEN
        RAISE NOTICE '✅ Lecture des magasins OK';
    ELSE
        RAISE NOTICE '⚠️ Aucun magasin trouvé';
    END IF;
END $$;

-- Test de lecture des catégories
DO $$
DECLARE
    categories_count INTEGER;
BEGIN
    SELECT count(*) INTO categories_count FROM public.categories;
    RAISE NOTICE 'Catégories: % enregistrements', categories_count;
    
    IF categories_count > 0 THEN
        RAISE NOTICE '✅ Lecture des catégories OK';
    ELSE
        RAISE NOTICE '⚠️ Aucune catégorie trouvée';
    END IF;
END $$;

-- 9. Test des permissions utilisateur
SELECT '=== PERMISSIONS UTILISATEUR ===' as section;

-- Permissions sur les tables principales
SELECT 
    table_name,
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_schema = 'public'
AND table_name IN ('users', 'stores', 'products', 'categories', 'suppliers', 'system_settings')
AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY table_name, grantee, privilege_type;

-- 10. Diagnostic final de connectivité
SELECT '=== DIAGNOSTIC FINAL ===' as section;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') 
        THEN '✅ Table users accessible'
        ELSE '❌ Table users inaccessible'
    END as test_1
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_settings' AND table_schema = 'public') 
        THEN '✅ Table system_settings accessible'
        ELSE '❌ Table system_settings inaccessible'
    END as test_2
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') 
        THEN '✅ Type user_role disponible'
        ELSE '❌ Type user_role manquant'
    END as test_3
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'handle_new_user') 
        THEN '✅ Fonction handle_new_user disponible'
        ELSE '❌ Fonction handle_new_user manquante'
    END as test_4
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public') 
        THEN '✅ Politiques RLS configurées'
        ELSE '❌ Politiques RLS manquantes'
    END as test_5
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.system_settings LIMIT 1) 
        THEN '✅ Données système disponibles'
        ELSE '❌ Données système manquantes'
    END as test_6; 