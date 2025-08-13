-- Script de diagnostic simple pour GesFlex Pro
-- À exécuter dans l'interface SQL de Supabase

-- 1. Vérifier les tables principales
SELECT 'Tables principales' as section;
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('users', 'stores', 'products', 'categories', 'units', 'suppliers', 'system_settings') 
        THEN '✅ Table principale'
        ELSE '📋 Table système'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'stores', 'products', 'categories', 'units', 'suppliers', 'system_settings', 'user_stores', 'product_stores', 'purchases', 'sales', 'transfers')
ORDER BY table_name;

-- 2. Vérifier les types ENUM
SELECT 'Types ENUM' as section;
SELECT 
    typname as type_name,
    CASE 
        WHEN typname IN ('user_role', 'user_status', 'validation_status', 'payment_method', 'return_status') 
        THEN '✅ Type défini'
        ELSE '❌ Type manquant'
    END as status
FROM pg_type 
WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND typtype = 'e'
ORDER BY typname;

-- 3. Vérifier les triggers importants
SELECT 'Triggers importants' as section;
SELECT 
    trigger_name,
    event_object_table,
    CASE 
        WHEN trigger_name IN ('handle_new_user', 'update_updated_at_column') 
        THEN '✅ Trigger actif'
        ELSE '📋 Trigger système'
    END as status
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND trigger_name IN ('handle_new_user', 'update_updated_at_column', 'generate_unique_code', 'generate_sku')
ORDER BY trigger_name;

-- 4. Vérifier les politiques RLS sur users
SELECT 'Politiques RLS - Table users' as section;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN policyname IS NOT NULL 
        THEN '✅ Politique définie'
        ELSE '❌ Aucune politique'
    END as status
FROM pg_policies 
WHERE tablename = 'users'
AND schemaname = 'public'
ORDER BY policyname;

-- 5. Vérifier les données dans users
SELECT 'Données utilisateurs' as section;
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as users_actifs,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as users_en_attente,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as users_rejetes,
    COUNT(CASE WHEN role = 'SuperAdmin' THEN 1 END) as superadmins,
    COUNT(CASE WHEN role = 'Admin' THEN 1 END) as admins
FROM users;

-- 6. Vérifier la structure de la table users
SELECT 'Structure table users' as section;
SELECT 
    column_name,
    data_type,
    is_nullable,
    CASE 
        WHEN column_name IN ('id', 'auth_id', 'email', 'first_name', 'last_name', 'role', 'status') 
        THEN '✅ Colonne requise'
        ELSE '📋 Colonne optionnelle'
    END as status
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. Test de création d'un utilisateur de test (ne pas exécuter en production)
-- SELECT 'Test création utilisateur' as section;
-- INSERT INTO public.users (auth_id, email, first_name, last_name, role, status)
-- VALUES (
--     gen_random_uuid(),
--     'test@example.com',
--     'Test',
--     'User',
--     'Vendeur',
--     'pending'
-- ) ON CONFLICT (auth_id) DO NOTHING;

-- 8. Résumé des problèmes potentiels
SELECT 'Résumé des problèmes' as section;
SELECT 
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') 
        THEN '❌ Type user_role manquant'
        ELSE '✅ Type user_role OK'
    END as probleme_1
UNION ALL
SELECT 
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') 
        THEN '❌ Type user_status manquant'
        ELSE '✅ Type user_status OK'
    END as probleme_2
UNION ALL
SELECT 
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') 
        THEN '❌ Table users manquante'
        ELSE '✅ Table users OK'
    END as probleme_3
UNION ALL
SELECT 
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'handle_new_user') 
        THEN '❌ Trigger handle_new_user manquant'
        ELSE '✅ Trigger handle_new_user OK'
    END as probleme_4
UNION ALL
SELECT 
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public') 
        THEN '❌ Politiques RLS manquantes sur users'
        ELSE '✅ Politiques RLS OK'
    END as probleme_5; 