-- ========================================
-- ÉTAPE 1: IDENTIFICATION SIMPLIFIÉE ET ROBUSTE
-- ========================================

SELECT '=== DÉBUT IDENTIFICATION SIMPLIFIÉE ===' as info;

-- 1. Vérifier les triggers existants
SELECT '=== TRIGGERS EXISTANTS ===' as section;
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_schema IN ('public', 'auth')
AND trigger_name LIKE '%user%'
ORDER BY trigger_name;

-- 2. Vérifier les fonctions existantes
SELECT '=== FONCTIONS EXISTANTES ===' as section;
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema IN ('public', 'auth')
AND routine_name LIKE '%user%'
ORDER BY routine_name;

-- 3. Vérifier si la table users existe
SELECT '=== EXISTENCE TABLE USERS ===' as section;
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'users' 
AND table_schema = 'public';

-- 4. Si la table existe, vérifier sa structure
SELECT '=== STRUCTURE TABLE USERS ===' as section;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Vérifier les contraintes CHECK
SELECT '=== CONTRAINTES CHECK ===' as section;
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_schema = 'public'
AND constraint_name LIKE '%users%';

-- 6. Vérifier les politiques RLS
SELECT '=== POLITIQUES RLS ===' as section;
SELECT 
    policyname,
    permissive,
    cmd
FROM pg_policies 
WHERE tablename = 'users'
AND schemaname = 'public';

-- 7. Vérifier les données existantes
SELECT '=== DONNÉES EXISTANTES ===' as section;
SELECT 
    COUNT(*) as total_users
FROM public.users;

-- 8. Test simple du trigger actuel
SELECT '=== TEST TRIGGER ACTUEL ===' as section;
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers 
    WHERE trigger_name = 'handle_new_user';
    
    IF trigger_count > 0 THEN
        RAISE NOTICE '✅ Trigger handle_new_user existe (% trouvé)', trigger_count;
    ELSE
        RAISE NOTICE '❌ Trigger handle_new_user N''EXISTE PAS';
    END IF;
END $$;

-- 9. Résumé des problèmes potentiels
SELECT '=== RÉSUMÉ PROBLÈMES ===' as section;
SELECT 
    '1. Trigger handle_new_user peut être mal configuré' as probleme
UNION ALL
SELECT 
    '2. Contraintes CHECK peuvent être trop strictes' as probleme
UNION ALL
SELECT 
    '3. Permissions RLS peuvent bloquer les insertions' as probleme
UNION ALL
SELECT 
    '4. Structure de table peut avoir des incohérences' as probleme;

SELECT '=== IDENTIFICATION TERMINÉE ===' as info; 