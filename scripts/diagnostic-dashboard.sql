-- =====================================================
-- GESFLEX PRO - DIAGNOSTIC DU DASHBOARD
-- Ce script vérifie ce qui existe réellement dans votre base
-- et identifie pourquoi le Dashboard affiche des valeurs incorrectes
-- =====================================================

-- =====================================================
-- 1. VÉRIFICATION DES DONNÉES EXISTANTES
-- =====================================================

SELECT '🔍 VÉRIFICATION DES DONNÉES EXISTANTES' as section;

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

-- Compter les stocks
SELECT 
    'Stocks' as table_name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ DONNÉES PRÉSENTES'
        ELSE '❌ AUCUNE DONNÉE'
    END as status
FROM product_stores;

-- =====================================================
-- 2. VÉRIFICATION DES VUES POSTGRESQL
-- =====================================================

SELECT '📊 VÉRIFICATION DES VUES POSTGRESQL' as section;

-- Vérifier si les vues existent
SELECT 
    'Vue low_stock_products_view' as vue,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'low_stock_products_view') THEN '✅ EXISTE'
        ELSE '❌ N''EXISTE PAS'
    END as status;

SELECT 
    'Vue sales_stats_daily_view' as vue,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'sales_stats_daily_view') THEN '✅ EXISTE'
        ELSE '❌ N''EXISTE PAS'
    END as status;

-- Tester les vues si elles existent
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'low_stock_products_view') THEN
        RAISE NOTICE 'Vue low_stock_products_view: ✅ EXISTE';
        RAISE NOTICE 'Nombre de produits en stock faible: %', (SELECT COUNT(*) FROM low_stock_products_view);
    ELSE
        RAISE NOTICE 'Vue low_stock_products_view: ❌ N''EXISTE PAS';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'sales_stats_daily_view') THEN
        RAISE NOTICE 'Vue sales_stats_daily_view: ✅ EXISTE';
        RAISE NOTICE 'Nombre de statistiques de ventes: %', (SELECT COUNT(*) FROM sales_stats_daily_view);
    ELSE
        RAISE NOTICE 'Vue sales_stats_daily_view: ❌ N''EXISTE PAS';
    END IF;
END $$;

-- =====================================================
-- 3. VÉRIFICATION DES FONCTIONS POSTGRESQL
-- =====================================================

SELECT '⚡ VÉRIFICATION DES FONCTIONS POSTGRESQL' as section;

-- Vérifier si les fonctions existent
SELECT 
    'Fonction get_store_inventory' as fonction,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_store_inventory') THEN '✅ EXISTE'
        ELSE '❌ N''EXISTE PAS'
    END as status;

SELECT 
    'Fonction get_store_sales_stats' as fonction,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_store_sales_stats') THEN '✅ EXISTE'
        ELSE '❌ N''EXISTE PAS'
    END as status;

-- =====================================================
-- 4. CALCUL MANUEL DES STATISTIQUES
-- =====================================================

SELECT '🧮 CALCUL MANUEL DES STATISTIQUES' as section;

-- Calculer le chiffre d'affaires total
SELECT 
    'Chiffre d''affaires total' as metric,
    COALESCE(SUM(total_amount), 0) as value,
    CASE 
        WHEN SUM(total_amount) > 0 THEN '✅ CALCULÉ'
        ELSE '❌ AUCUNE VENTE'
    END as status
FROM sales;

-- Compter le nombre total de ventes
SELECT 
    'Nombre total de ventes' as metric,
    COUNT(*) as value,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ CALCULÉ'
        ELSE '❌ AUCUNE VENTE'
    END as status
FROM sales;

-- Compter les produits en stock faible
SELECT 
    'Produits en stock faible' as metric,
    COUNT(*) as value,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ CALCULÉ'
        ELSE '❌ AUCUN PRODUIT EN STOCK FAIBLE'
    END as status
FROM product_stores ps
JOIN products p ON ps.product_id = p.id
WHERE ps.current_stock <= p.alert_stock;

-- =====================================================
-- 5. VÉRIFICATION DES RELATIONS
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
-- 6. RÉSUMÉ DU DIAGNOSTIC
-- =====================================================

SELECT '🎯 RÉSUMÉ DU DIAGNOSTIC' as section;

-- Résumé final
DO $$
DECLARE
    users_count INTEGER;
    stores_count INTEGER;
    products_count INTEGER;
    sales_count INTEGER;
    stock_count INTEGER;
    revenue_total DECIMAL;
    low_stock_count INTEGER;
BEGIN
    -- Compter les éléments
    SELECT COUNT(*) INTO users_count FROM users;
    SELECT COUNT(*) INTO stores_count FROM stores;
    SELECT COUNT(*) INTO products_count FROM products;
    SELECT COUNT(*) INTO sales_count FROM sales;
    SELECT COUNT(*) INTO stock_count FROM product_stores;
    SELECT COALESCE(SUM(total_amount), 0) INTO revenue_total FROM sales;
    
    -- Compter les produits en stock faible
    SELECT COUNT(*) INTO low_stock_count 
    FROM product_stores ps
    JOIN products p ON ps.product_id = p.id
    WHERE ps.current_stock <= p.alert_stock;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 RÉSUMÉ DU DIAGNOSTIC DU DASHBOARD';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Utilisateurs: %', users_count;
    RAISE NOTICE '✅ Magasins: %', stores_count;
    RAISE NOTICE '✅ Produits: %', products_count;
    RAISE NOTICE '✅ Ventes: %', sales_count;
    RAISE NOTICE '✅ Stocks: %', stock_count;
    RAISE NOTICE '✅ Chiffre d''affaires: % €', revenue_total;
    RAISE NOTICE '✅ Produits en stock faible: %', low_stock_count;
    RAISE NOTICE '';
    
    IF sales_count = 0 THEN
        RAISE NOTICE '🚨 PROBLÈME: Aucune vente dans la base - Dashboard affichera 0';
    END IF;
    
    IF low_stock_count = 0 THEN
        RAISE NOTICE '🚨 PROBLÈME: Aucun produit en stock faible - Dashboard affichera 0';
    END IF;
    
    IF revenue_total = 0 THEN
        RAISE NOTICE '🚨 PROBLÈME: Aucun chiffre d''affaires - Dashboard affichera 0';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '💡 SOLUTION: Vérifiez que les données de test ont été insérées correctement';
    RAISE NOTICE '';
END $$;
