-- ========================================
-- TEST DONNÉES DASHBOARD
-- ========================================

SELECT '=== TEST DONNÉES DASHBOARD ===' as info;

-- 1. Vérifier les tables principales
SELECT '=== VÉRIFICATION TABLES PRINCIPALES ===' as info;

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
FROM products
UNION ALL
SELECT 
    'stores' as table_name,
    COUNT(*) as count
FROM stores;

-- 2. Vérifier les ventes du jour
SELECT '=== VENTES DU JOUR ===' as info;

WITH today_sales AS (
    SELECT 
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as total_amount
    FROM sales 
    WHERE DATE(created_at) = CURRENT_DATE
),
yesterday_sales AS (
    SELECT 
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as total_amount
    FROM sales 
    WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'
)
SELECT 
    today.count as today_count,
    today.total_amount as today_amount,
    yesterday.count as yesterday_count,
    yesterday.total_amount as yesterday_amount,
    CASE 
        WHEN yesterday.total_amount > 0 
        THEN ROUND(((today.total_amount - yesterday.total_amount) / yesterday.total_amount) * 100, 1)
        ELSE 0 
    END as percentage_change
FROM today_sales today, yesterday_sales yesterday;

-- 3. Vérifier les ventes totales
SELECT '=== VENTES TOTALES ===' as info;

SELECT 
    COUNT(*) as total_sales_count,
    COALESCE(SUM(total_amount), 0) as total_sales_amount
FROM sales;

-- 4. Vérifier les produits et l'inventaire
SELECT '=== PRODUITS ET INVENTAIRE ===' as info;

SELECT 
    COUNT(DISTINCT i.product_id) as total_products,
    COUNT(CASE WHEN i.current_stock <= p.alert_stock THEN 1 END) as low_stock_count
FROM inventory i
JOIN products p ON i.product_id = p.id;

-- 5. Vérifier les produits en stock faible
SELECT '=== PRODUITS EN STOCK FAIBLE ===' as info;

SELECT 
    p.name as product_name,
    p.sku,
    i.current_stock,
    p.alert_stock,
    s.name as store_name
FROM inventory i
JOIN products p ON i.product_id = p.id
JOIN stores s ON i.store_id = s.id
WHERE i.current_stock <= p.alert_stock
ORDER BY i.current_stock ASC
LIMIT 10;

-- 6. Vérifier les ventes récentes
SELECT '=== VENTES RÉCENTES ===' as info;

SELECT 
    s.sale_code,
    s.customer_name,
    s.total_amount,
    s.created_at,
    st.name as store_name
FROM sales s
LEFT JOIN stores st ON s.store_id = st.id
ORDER BY s.created_at DESC
LIMIT 5;

-- 7. Vérifier la configuration de devise
SELECT '=== CONFIGURATION DEVISES ===' as info;

SELECT 
    category,
    key_name,
    value
FROM system_settings 
WHERE category = 'currency';

-- 8. Statistiques par magasin
SELECT '=== STATISTIQUES PAR MAGASIN ===' as info;

SELECT 
    s.name as store_name,
    COUNT(DISTINCT i.product_id) as products_count,
    COUNT(CASE WHEN i.current_stock <= p.alert_stock THEN 1 END) as low_stock_count,
    COALESCE(SUM(sales.total_amount), 0) as total_sales
FROM stores s
LEFT JOIN inventory i ON s.id = i.store_id
LEFT JOIN products p ON i.product_id = p.id
LEFT JOIN sales ON s.id = sales.store_id
GROUP BY s.id, s.name
ORDER BY s.name;

-- 9. Vérifier les données de test
SELECT '=== DONNÉES DE TEST ===' as info;

-- Créer quelques données de test si nécessaire
DO $$
DECLARE
    test_store_id UUID;
    test_product_id UUID;
    test_supplier_id UUID;
BEGIN
    -- Créer un magasin de test s'il n'existe pas
    INSERT INTO stores (name, address, phone, email, created_at, updated_at)
    VALUES ('Magasin Test Dashboard', 'Adresse Test', '+1234567890', 'test@dashboard.com', NOW(), NOW())
    ON CONFLICT (name) DO NOTHING
    RETURNING id INTO test_store_id;
    
    -- Récupérer l'ID du magasin
    SELECT id INTO test_store_id FROM stores WHERE name = 'Magasin Test Dashboard' LIMIT 1;
    
    -- Créer un fournisseur de test s'il n'existe pas
    INSERT INTO suppliers (name, contact_person, phone, email, address, created_at, updated_at)
    VALUES ('Fournisseur Test', 'Contact Test', '+1234567890', 'fournisseur@test.com', 'Adresse Fournisseur', NOW(), NOW())
    ON CONFLICT (name) DO NOTHING
    RETURNING id INTO test_supplier_id;
    
    -- Récupérer l'ID du fournisseur
    SELECT id INTO test_supplier_id FROM suppliers WHERE name = 'Fournisseur Test' LIMIT 1;
    
    -- Créer un produit de test s'il n'existe pas
    INSERT INTO products (name, sku, min_sale_price, current_sale_price, unit_id, alert_stock, description, created_at, updated_at)
    VALUES ('Produit Test Dashboard', 'TEST-DASH-001', 1000, 1500, (SELECT id FROM units LIMIT 1), 5, 'Produit de test pour le dashboard', NOW(), NOW())
    ON CONFLICT (sku) DO NOTHING
    RETURNING id INTO test_product_id;
    
    -- Récupérer l'ID du produit
    SELECT id INTO test_product_id FROM products WHERE sku = 'TEST-DASH-001' LIMIT 1;
    
    -- Créer un inventaire de test s'il n'existe pas
    IF test_store_id IS NOT NULL AND test_product_id IS NOT NULL THEN
        INSERT INTO inventory (store_id, product_id, current_stock, created_at, updated_at)
        VALUES (test_store_id, test_product_id, 3, NOW(), NOW())
        ON CONFLICT (store_id, product_id) DO UPDATE SET
            current_stock = 3,
            updated_at = NOW();
    END IF;
    
    -- Créer une vente de test s'il n'y en a pas aujourd'hui
    IF test_store_id IS NOT NULL AND test_product_id IS NOT NULL THEN
        INSERT INTO sales (
            sale_code, store_id, payment_method, customer_name, customer_email, 
            customer_phone, subtotal, tax_amount, total_amount, notes, 
            sold_by, created_at, updated_at
        )
        SELECT 
            'V-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 7, '0'),
            test_store_id,
            'cash',
            'Client Test Dashboard',
            'client@test.com',
            '+1234567890',
            1500,
            0,
            1500,
            'Vente de test pour le dashboard',
            (SELECT id FROM users LIMIT 1),
            NOW(),
            NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM sales WHERE DATE(created_at) = CURRENT_DATE
        );
    END IF;
    
    RAISE NOTICE '✅ Données de test créées pour le dashboard';
END $$;

-- 10. Vérifier les données après création
SELECT '=== VÉRIFICATION APRÈS CRÉATION ===' as info;

SELECT 
    'Ventes aujourd''hui' as info,
    COUNT(*) as count,
    COALESCE(SUM(total_amount), 0) as amount
FROM sales 
WHERE DATE(created_at) = CURRENT_DATE;

SELECT 
    'Produits en stock faible' as info,
    COUNT(*) as count
FROM inventory i
JOIN products p ON i.product_id = p.id
WHERE i.current_stock <= p.alert_stock;

SELECT '=== TEST DONNÉES DASHBOARD TERMINÉ ===' as info; 