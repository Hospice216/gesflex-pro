-- ========================================
-- TEST DONNÉES DASHBOARD
-- ========================================

SELECT '=== TEST DONNÉES DASHBOARD ===' as info;

-- 1. Vérifier les tables principales
SELECT '=== VÉRIFICATION TABLES ===' as info;

SELECT 
    'sales' as table_name,
    COUNT(*) as count
FROM sales
UNION ALL
SELECT 
    'inventory' as table_name,
    COUNT(*) as count
FROM inventory
UNION ALL
SELECT 
    'products' as table_name,
    COUNT(*) as count
FROM products;

-- 2. Vérifier les ventes du jour
SELECT '=== VENTES DU JOUR ===' as info;

SELECT 
    COUNT(*) as today_count,
    COALESCE(SUM(total_amount), 0) as today_amount
FROM sales 
WHERE DATE(created_at) = CURRENT_DATE;

-- 3. Vérifier les produits en stock faible
SELECT '=== PRODUITS EN STOCK FAIBLE ===' as info;

SELECT 
    COUNT(*) as low_stock_count
FROM inventory i
JOIN products p ON i.product_id = p.id
WHERE i.current_stock <= p.alert_stock;

-- 4. Vérifier la configuration de devise
SELECT '=== CONFIGURATION DEVISES ===' as info;

SELECT 
    category,
    key_name,
    value
FROM system_settings 
WHERE category = 'currency';

SELECT '=== TEST DASHBOARD TERMINÉ ===' as info; 