-- ========================================
-- TEST ALERTES DE STOCK DASHBOARD
-- ========================================

SELECT '=== TEST ALERTES DE STOCK DASHBOARD ===' as info;

-- 1. Vérifier la structure des tables
SELECT '=== STRUCTURE DES TABLES ===' as info;

SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name IN ('products', 'product_stores', 'stores')
ORDER BY table_name, ordinal_position;

-- 2. Vérifier les produits avec seuil d'alerte
SELECT '=== PRODUITS AVEC SEUIL D''ALERTE ===' as info;

SELECT 
    p.id,
    p.name,
    p.sku,
    p.alert_stock,
    p.min_sale_price
FROM products p
WHERE p.alert_stock IS NOT NULL
ORDER BY p.alert_stock ASC
LIMIT 10;

-- 3. Vérifier le stock actuel par magasin
SELECT '=== STOCK ACTUEL PAR MAGASIN ===' as info;

SELECT 
    ps.id,
    p.name as product_name,
    p.sku,
    p.alert_stock as product_alert_stock,
    ps.current_stock,
    ps.min_stock as store_min_stock,
    s.name as store_name,
    CASE 
        WHEN ps.current_stock <= COALESCE(p.alert_stock, ps.min_stock, 10) 
        THEN 'ALERTE STOCK' 
        ELSE 'STOCK OK' 
    END as status
FROM product_stores ps
JOIN products p ON ps.product_id = p.id
JOIN stores s ON ps.store_id = s.id
ORDER BY ps.current_stock ASC
LIMIT 15;

-- 4. Compter les produits en alerte de stock
SELECT '=== COMPTAGE PRODUITS EN ALERTE ===' as info;

SELECT 
    COUNT(*) as total_products,
    COUNT(CASE WHEN ps.current_stock <= COALESCE(p.alert_stock, ps.min_stock, 10) THEN 1 END) as low_stock_count,
    COUNT(CASE WHEN ps.current_stock > COALESCE(p.alert_stock, ps.min_stock, 10) THEN 1 END) as ok_stock_count
FROM product_stores ps
JOIN products p ON ps.product_id = p.id;

-- 5. Détail des produits en alerte
SELECT '=== DÉTAIL PRODUITS EN ALERTE ===' as info;

SELECT 
    p.name as product_name,
    p.sku,
    p.alert_stock as product_alert_stock,
    ps.current_stock,
    ps.min_stock as store_min_stock,
    s.name as store_name,
    ps.current_stock - COALESCE(p.alert_stock, ps.min_stock, 10) as deficit
FROM product_stores ps
JOIN products p ON ps.product_id = p.id
JOIN stores s ON ps.store_id = s.id
WHERE ps.current_stock <= COALESCE(p.alert_stock, ps.min_stock, 10)
ORDER BY deficit ASC
LIMIT 10;

-- 6. Vérifier la configuration des seuils
SELECT '=== CONFIGURATION DES SEUILS ===' as info;

SELECT 
    'Produits avec alert_stock défini' as config_type,
    COUNT(*) as count
FROM products 
WHERE alert_stock IS NOT NULL
UNION ALL
SELECT 
    'Produits sans alert_stock' as config_type,
    COUNT(*) as count
FROM products 
WHERE alert_stock IS NULL
UNION ALL
SELECT 
    'Product_stores avec min_stock défini' as config_type,
    COUNT(*) as count
FROM product_stores 
WHERE min_stock IS NOT NULL;

-- 7. Test de simulation d'alerte
SELECT '=== SIMULATION ALERTE STOCK ===' as info;

-- Créer un produit de test avec stock faible si nécessaire
DO $$
DECLARE
    test_product_id UUID;
    test_store_id UUID;
BEGIN
    -- Récupérer un produit et un magasin existants
    SELECT id INTO test_product_id FROM products LIMIT 1;
    SELECT id INTO test_store_id FROM stores LIMIT 1;
    
    IF test_product_id IS NOT NULL AND test_store_id IS NOT NULL THEN
        -- Mettre à jour le stock pour simuler une alerte
        UPDATE product_stores 
        SET current_stock = 5 
        WHERE product_id = test_product_id AND store_id = test_store_id;
        
        -- Mettre à jour le seuil d'alerte du produit
        UPDATE products 
        SET alert_stock = 10 
        WHERE id = test_product_id;
        
        RAISE NOTICE 'Test d''alerte créé pour le produit %', test_product_id;
    END IF;
END $$;

-- 8. Vérifier le résultat du test
SELECT '=== RÉSULTAT DU TEST ===' as info;

SELECT 
    p.name as product_name,
    p.sku,
    p.alert_stock,
    ps.current_stock,
    s.name as store_name,
    CASE 
        WHEN ps.current_stock <= p.alert_stock 
        THEN 'ALERTE ACTIVE' 
        ELSE 'PAS D''ALERTE' 
    END as alert_status
FROM product_stores ps
JOIN products p ON ps.product_id = p.id
JOIN stores s ON ps.store_id = s.id
WHERE p.alert_stock IS NOT NULL
ORDER BY ps.current_stock ASC
LIMIT 5;

SELECT '=== TEST ALERTES DE STOCK TERMINÉ ===' as info;
