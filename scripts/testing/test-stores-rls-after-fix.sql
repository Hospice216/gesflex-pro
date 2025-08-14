-- 🧪 Script de Test des Politiques RLS après Correction
-- 📋 Vérifie que les transferts entre magasins fonctionnent maintenant

-- 1. Vérifier l'état des politiques RLS sur la table stores
SELECT 
    'État des politiques RLS' as test_type,
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'stores'
ORDER BY policyname;

-- 2. Vérifier que RLS est activé sur la table stores
SELECT 
    'Activation RLS' as test_type,
    tablename,
    rowsecurity as rls_active
FROM pg_tables 
WHERE tablename = 'stores';

-- 3. Tester l'accès en lecture pour tous les utilisateurs authentifiés
-- Cette requête devrait fonctionner maintenant
SELECT 
    'Test accès lecture' as test_type,
    COUNT(*) as nombre_magasins_visibles,
    COUNT(CASE WHEN is_active = true THEN 1 END) as magasins_actifs
FROM stores;

-- 4. Vérifier les permissions des utilisateurs sur la table stores
SELECT 
    'Permissions utilisateurs' as test_type,
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'stores'
ORDER BY grantee, privilege_type;

-- 5. Test spécifique pour les transferts
-- Vérifier que tous les magasins sont visibles pour les transferts
SELECT 
    'Test transferts' as test_type,
    s.id as store_id,
    s.name as store_name,
    s.is_active,
    s.created_at
FROM stores s
WHERE s.is_active = true
ORDER BY s.name;

-- 6. Vérifier les contraintes de clés étrangères
SELECT 
    'Contraintes FK' as test_type,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name IN ('transfers', 'user_stores', 'store_permissions')
ORDER BY tc.table_name;

-- 7. Message de confirmation
DO $$
BEGIN
    RAISE NOTICE '🧪 Tests des politiques RLS terminés !';
    RAISE NOTICE '📊 Vérifiez les résultats ci-dessus';
    RAISE NOTICE '✅ Si tout est vert, les transferts devraient fonctionner';
    RAISE NOTICE '🚀 Testez maintenant la création de transferts dans l''application';
END $$;
