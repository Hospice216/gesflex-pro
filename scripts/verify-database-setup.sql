-- =====================================================
-- GESFLEX PRO - VÉRIFICATION DE LA CONFIGURATION
-- Exécutez ce script APRÈS avoir exécuté les deux scripts principaux
-- =====================================================

-- =====================================================
-- VÉRIFICATION GÉNÉRALE DE LA STRUCTURE
-- =====================================================

SELECT '🔍 VÉRIFICATION DE LA STRUCTURE DE LA BASE' as section;

-- Vérifier le nombre total de tables
SELECT 
    'Tables créées' as type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) >= 25 THEN '✅ SUFFISANT'
        ELSE '❌ INSUFFISANT'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';

-- Vérifier le nombre de vues
SELECT 
    'Vues créées' as type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) >= 2 THEN '✅ SUFFISANT'
        ELSE '❌ INSUFFISANT'
    END as status
FROM information_schema.views 
WHERE table_schema = 'public';

-- Vérifier le nombre de fonctions
SELECT 
    'Fonctions créées' as type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) >= 3 THEN '✅ SUFFISANT'
        ELSE '❌ INSUFFISANT'
    END as status
FROM information_schema.routines 
WHERE routine_schema = 'public';

-- =====================================================
-- VÉRIFICATION DES TABLES PRINCIPALES
-- =====================================================

SELECT '📊 VÉRIFICATION DES TABLES PRINCIPALES' as section;

-- Vérifier les tables essentielles
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('users', 'stores', 'products', 'sales', 'customers') THEN '✅ CRITIQUE'
        WHEN table_name IN ('categories', 'units', 'suppliers', 'purchases') THEN '⚠️ IMPORTANT'
        ELSE 'ℹ️ STANDARD'
    END as importance
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name IN (
        'users', 'stores', 'products', 'sales', 'customers',
        'categories', 'units', 'suppliers', 'purchases',
        'product_stores', 'sale_items', 'user_stores'
    )
ORDER BY 
    CASE 
        WHEN table_name IN ('users', 'stores', 'products', 'sales', 'customers') THEN 1
        WHEN table_name IN ('categories', 'units', 'suppliers', 'purchases') THEN 2
        ELSE 3
    END,
    table_name;

-- =====================================================
-- VÉRIFICATION DES DONNÉES
-- =====================================================

SELECT '🧪 VÉRIFICATION DES DONNÉES' as section;

-- Compter les utilisateurs
SELECT 
    'Utilisateurs' as table_name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ DONNÉES PRÉSENTES'
        ELSE '❌ AUCUNE DONNÉE'
    END as status
FROM users;

-- Compter les magasins
SELECT 
    'Magasins' as table_name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ DONNÉES PRÉSENTES'
        ELSE '❌ AUCUNE DONNÉE'
    END as status
FROM stores;

-- Compter les produits
SELECT 
    'Produits' as table_name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ DONNÉES PRÉSENTES'
        ELSE '❌ AUCUNE DONNÉE'
    END as status
FROM products;

-- Compter les ventes
SELECT 
    'Ventes' as table_name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ DONNÉES PRÉSENTES'
        ELSE '❌ AUCUNE DONNÉE'
    END as status
FROM sales;

-- =====================================================
-- VÉRIFICATION DES RELATIONS
-- =====================================================

SELECT '🔗 VÉRIFICATION DES RELATIONS' as section;

-- Vérifier les produits avec catégories
SELECT 
    'Produits avec catégories' as relation,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ RELATIONS OK'
        ELSE '❌ RELATIONS MANQUANTES'
    END as status
FROM products p
JOIN categories c ON p.category_id = c.id;

-- Vérifier les produits avec unités
SELECT 
    'Produits avec unités' as relation,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ RELATIONS OK'
        ELSE '❌ RELATIONS MANQUANTES'
    END as status
FROM products p
JOIN units u ON p.unit_id = u.id;

-- Vérifier les stocks par magasin
SELECT 
    'Stocks par magasin' as relation,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ RELATIONS OK'
        ELSE '❌ RELATIONS MANQUANTES'
    END as status
FROM product_stores ps
JOIN products p ON ps.product_id = p.id
JOIN stores s ON ps.store_id = s.id;

-- =====================================================
-- VÉRIFICATION DES VUES
-- =====================================================

SELECT '📈 VÉRIFICATION DES VUES' as section;

-- Tester la vue des produits en stock faible
SELECT 
    'Vue low_stock_products_view' as vue,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) >= 0 THEN '✅ FONCTIONNE'
        ELSE '❌ ERREUR'
    END as status
FROM low_stock_products_view;

-- Tester la vue des statistiques de ventes
SELECT 
    'Vue sales_stats_daily_view' as vue,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) >= 0 THEN '✅ FONCTIONNE'
        ELSE '❌ ERREUR'
    END as status
FROM sales_stats_daily_view;

-- =====================================================
-- VÉRIFICATION DES FONCTIONS
-- =====================================================

SELECT '⚡ VÉRIFICATION DES FONCTIONS' as section;

-- Tester la fonction get_store_inventory
SELECT 
    'Fonction get_store_inventory' as fonction,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) >= 0 THEN '✅ FONCTIONNE'
        ELSE '❌ ERREUR'
    END as status
FROM get_store_inventory();

-- Tester la fonction get_store_sales_stats
DO $$
DECLARE
    store_id UUID;
    result_count INTEGER;
BEGIN
    -- Récupérer un store_id existant
    SELECT id INTO store_id FROM stores LIMIT 1;
    
    IF store_id IS NOT NULL THEN
        SELECT COUNT(*) INTO result_count FROM get_store_sales_stats(store_id);
        
        RAISE NOTICE 'Fonction get_store_sales_stats: ✅ FONCTIONNE (résultats: %)', result_count;
    ELSE
        RAISE NOTICE 'Fonction get_store_sales_stats: ❌ ERREUR - Aucun magasin trouvé';
    END IF;
END $$;

-- =====================================================
-- VÉRIFICATION DE LA SÉCURITÉ
-- =====================================================

SELECT '🔒 VÉRIFICATION DE LA SÉCURITÉ' as section;

-- Vérifier que RLS est activé sur les tables principales
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_active,
    CASE 
        WHEN rowsecurity = true THEN '✅ RLS ACTIVÉ'
        ELSE '❌ RLS DÉSACTIVÉ'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('users', 'stores', 'products', 'sales', 'customers')
ORDER BY tablename;

-- =====================================================
-- VÉRIFICATION DES INDEX
-- =====================================================

SELECT '📚 VÉRIFICATION DES INDEX' as section;

-- Compter les index sur les tables principales
SELECT 
    'Index sur users' as table_name,
    COUNT(*) as index_count,
    CASE 
        WHEN COUNT(*) >= 3 THEN '✅ SUFFISANT'
        ELSE '❌ INSUFFISANT'
    END as status
FROM pg_indexes 
WHERE tablename = 'users' AND schemaname = 'public';

SELECT 
    'Index sur products' as table_name,
    COUNT(*) as index_count,
    CASE 
        WHEN COUNT(*) >= 3 THEN '✅ SUFFISANT'
        ELSE '❌ INSUFFISANT'
    END as status
FROM pg_indexes 
WHERE tablename = 'products' AND schemaname = 'public';

-- =====================================================
-- VÉRIFICATION DES TRIGGERS
-- =====================================================

SELECT '🔄 VÉRIFICATION DES TRIGGERS' as section;

-- Compter les triggers sur les tables principales
SELECT 
    'Triggers sur users' as table_name,
    COUNT(*) as trigger_count,
    CASE 
        WHEN COUNT(*) >= 1 THEN '✅ PRÉSENT'
        ELSE '❌ MANQUANT'
    END as status
FROM pg_trigger 
WHERE tgrelid = 'users'::regclass;

-- =====================================================
-- RÉSUMÉ FINAL
-- =====================================================

SELECT '🎯 RÉSUMÉ FINAL DE LA VÉRIFICATION' as section;

-- Compter les éléments vérifiés
WITH verification_summary AS (
    SELECT 
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as tables_count,
        (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public') as views_count,
        (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public') as functions_count,
        (SELECT COUNT(*) FROM users) as users_count,
        (SELECT COUNT(*) FROM stores) as stores_count,
        (SELECT COUNT(*) FROM products) as products_count,
        (SELECT COUNT(*) FROM sales) as sales_count
)
SELECT 
    'Tables créées' as element,
    tables_count as count,
    CASE 
        WHEN tables_count >= 25 THEN '✅ SUCCÈS'
        ELSE '❌ ÉCHEC'
    END as status
FROM verification_summary
UNION ALL
SELECT 
    'Vues créées' as element,
    views_count as count,
    CASE 
        WHEN views_count >= 2 THEN '✅ SUCCÈS'
        ELSE '❌ ÉCHEC'
    END as status
FROM verification_summary
UNION ALL
SELECT 
    'Fonctions créées' as element,
    functions_count as count,
    CASE 
        WHEN functions_count >= 3 THEN '✅ SUCCÈS'
        ELSE '❌ ÉCHEC'
    END as status
FROM verification_summary
UNION ALL
SELECT 
    'Utilisateurs créés' as element,
    users_count as count,
    CASE 
        WHEN users_count > 0 THEN '✅ SUCCÈS'
        ELSE '❌ ÉCHEC'
    END as status
FROM verification_summary
UNION ALL
SELECT 
    'Magasins créés' as element,
    stores_count as count,
    CASE 
        WHEN stores_count > 0 THEN '✅ SUCCÈS'
        ELSE '❌ ÉCHEC'
    END as status
FROM verification_summary
UNION ALL
SELECT 
    'Produits créés' as element,
    products_count as count,
    CASE 
        WHEN products_count > 0 THEN '✅ SUCCÈS'
        ELSE '❌ ÉCHEC'
    END as status
FROM verification_summary
UNION ALL
SELECT 
    'Ventes créées' as element,
    sales_count as count,
    CASE 
        WHEN sales_count > 0 THEN '✅ SUCCÈS'
        ELSE '❌ ÉCHEC'
    END as status
FROM verification_summary;

-- =====================================================
-- MESSAGE DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 VÉRIFICATION TERMINÉE !';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Si tous les éléments affichent ✅ SUCCÈS, votre base est prête !';
    RAISE NOTICE '🚀 Vous pouvez maintenant tester votre application GesFlex Pro';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ Si certains éléments affichent ❌ ÉCHEC, consultez le guide de dépannage';
    RAISE NOTICE '';
END $$;
