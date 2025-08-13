-- ========================================
-- ÉTAPE 1: IDENTIFICATION COMPLÈTE DU PROBLÈME
-- ========================================

-- 1. Vérifier tous les triggers existants
SELECT '=== TRIGGERS EXISTANTS ===' as section;
SELECT 
    trigger_schema,
    trigger_name,
    event_object_schema,
    event_object_table,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema IN ('public', 'auth')
ORDER BY trigger_schema, trigger_name;

-- 2. Vérifier toutes les fonctions existantes
SELECT '=== FONCTIONS EXISTANTES ===' as section;
SELECT 
    routine_schema,
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema IN ('public', 'auth')
AND routine_name LIKE '%user%'
ORDER BY routine_schema, routine_name;

-- 3. Vérifier la structure de la table users
SELECT '=== STRUCTURE TABLE USERS ===' as section;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Vérifier les contraintes de la table users
SELECT '=== CONTRAINTES TABLE USERS ===' as section;
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_schema = 'public'
AND constraint_name LIKE '%users%';

-- 5. Vérifier les politiques RLS sur users
SELECT '=== POLITIQUES RLS USERS ===' as section;
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
WHERE tablename = 'users'
AND schemaname = 'public';

-- 6. Vérifier les données existantes dans users
SELECT '=== DONNÉES EXISTANTES USERS ===' as section;
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN auth_id IS NULL THEN 1 END) as users_sans_auth_id,
    COUNT(CASE WHEN first_name IS NULL OR first_name = '' THEN 1 END) as users_sans_prenom,
    COUNT(CASE WHEN last_name IS NULL OR last_name = '' THEN 1 END) as users_sans_nom
FROM public.users;

-- 7. Vérifier les erreurs récentes dans les logs (si accessible)
SELECT '=== VÉRIFICATION ERREURS ===' as section;
SELECT 
    'Vérifier les logs Supabase pour les erreurs récentes' as info;

-- 8. Test du trigger actuel (si existe)
SELECT '=== TEST TRIGGER ACTUEL ===' as section;
DO $$
DECLARE
    trigger_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'handle_new_user'
    ) INTO trigger_exists;
    
    IF trigger_exists THEN
        RAISE NOTICE '✅ Trigger handle_new_user existe';
        
        -- Afficher les détails du trigger
        SELECT 
            trigger_name,
            event_object_table,
            action_timing,
            event_manipulation
        FROM information_schema.triggers 
        WHERE trigger_name = 'handle_new_user';
    ELSE
        RAISE NOTICE '❌ Trigger handle_new_user N''EXISTE PAS';
    END IF;
END $$;

-- 9. Vérifier les permissions
SELECT '=== PERMISSIONS ===' as section;
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_name = 'users'
AND table_schema = 'public';

-- 10. Résumé des problèmes identifiés
SELECT '=== RÉSUMÉ DES PROBLÈMES ===' as section;
SELECT 
    '1. Trigger handle_new_user peut être mal configuré' as probleme,
    '2. Contraintes CHECK peuvent être trop strictes' as probleme,
    '3. Permissions RLS peuvent bloquer les insertions' as probleme,
    '4. Structure de table peut avoir des incohérences' as probleme; 