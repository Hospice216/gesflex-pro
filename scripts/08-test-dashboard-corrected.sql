-- ========================================
-- TEST DASHBOARD CORRIGÉ
-- ========================================

SELECT '=== TEST DASHBOARD AVEC NOUVELLES SPÉCIFICATIONS ===' as info;

-- 1. Vérifier les ventes du jour (ventes journalières individuelles)
SELECT '=== VENTES DU JOUR (VENTES JOURNALIÈRES INDIVIDUELLES) ===' as info;

SELECT 
    COUNT(*) as nombre_ventes_jour,
    COALESCE(SUM(total_amount), 0) as chiffre_affaires_jour
FROM sales 
WHERE DATE(created_at) = CURRENT_DATE;

-- 2. Vérifier les ventes d'hier pour comparaison
SELECT '=== VENTES D''HIER (POUR COMPARAISON) ===' as info;

SELECT 
    COUNT(*) as nombre_ventes_hier,
    COALESCE(SUM(total_amount), 0) as chiffre_affaires_hier
FROM sales 
WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day';

-- 3. Vérifier le nombre total de produits vendus dans le mois
SELECT '=== PRODUITS VENDUS DANS LE MOIS ===' as info;

WITH monthly_sales AS (
    SELECT 
        s.id as sale_id,
        si.quantity as product_quantity
    FROM sales s
    LEFT JOIN sale_items si ON s.id = si.sale_id
    WHERE DATE(s.created_at) >= DATE_TRUNC('month', CURRENT_DATE)
)
SELECT 
    COUNT(DISTINCT sale_id) as nombre_transactions_mois,
    COALESCE(SUM(product_quantity), 0) as total_produits_vendus_mois
FROM monthly_sales;

-- 4. Vérifier le chiffre d'affaires total
SELECT '=== CHIFFRE D''AFFAIRES TOTAL ===' as info;

SELECT 
    COUNT(*) as nombre_total_ventes,
    COALESCE(SUM(total_amount), 0) as chiffre_affaires_total
FROM sales;

-- 5. Vérifier les produits en stock
SELECT '=== PRODUITS EN STOCK ===' as info;

SELECT 
    COUNT(DISTINCT i.product_id) as nombre_produits_stock,
    COUNT(CASE WHEN i.current_stock <= p.alert_stock THEN 1 END) as produits_stock_faible
FROM inventory i
JOIN products p ON i.product_id = p.id;

-- 6. Vérifier les produits en stock faible
SELECT '=== PRODUITS EN STOCK FAIBLE ===' as info;

SELECT 
    p.name as nom_produit,
    p.sku,
    i.current_stock as stock_actuel,
    p.alert_stock as stock_alerte,
    s.name as nom_magasin
FROM inventory i
JOIN products p ON i.product_id = p.id
JOIN stores s ON i.store_id = s.id
WHERE i.current_stock <= p.alert_stock
ORDER BY i.current_stock ASC
LIMIT 10;

-- 7. Vérifier les ventes récentes
SELECT '=== VENTES RÉCENTES ===' as info;

SELECT 
    s.sale_code,
    s.customer_name,
    s.total_amount,
    s.created_at,
    st.name as nom_magasin
FROM sales s
LEFT JOIN stores st ON s.store_id = st.id
ORDER BY s.created_at DESC
LIMIT 5;

-- 8. Créer des données de test si nécessaire
SELECT '=== CRÉATION DONNÉES DE TEST ===' as info;

DO $$
DECLARE
    test_store_id UUID;
    test_product_id UUID;
    test_user_id UUID;
BEGIN
    -- Récupérer un magasin existant
    SELECT id INTO test_store_id FROM stores LIMIT 1;
    
    -- Récupérer un produit existant
    SELECT id INTO test_product_id FROM products LIMIT 1;
    
    -- Récupérer un utilisateur existant
    SELECT id INTO test_user_id FROM users LIMIT 1;
    
    -- Créer une vente de test pour aujourd'hui si aucune n'existe
    IF test_store_id IS NOT NULL AND test_product_id IS NOT NULL AND test_user_id IS NOT NULL THEN
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
            2500,
            0,
            2500,
            'Vente de test pour le dashboard',
            test_user_id,
            NOW(),
            NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM sales WHERE DATE(created_at) = CURRENT_DATE
        );
        
        -- Créer des items de vente pour la vente de test
        INSERT INTO sale_items (
            sale_id, product_id, product_name, product_sku, quantity, unit_price, total_price
        )
        SELECT 
            s.id,
            test_product_id,
            p.name,
            p.sku,
            2,
            1250,
            2500
        FROM sales s
        JOIN products p ON p.id = test_product_id
        WHERE DATE(s.created_at) = CURRENT_DATE
        AND NOT EXISTS (
            SELECT 1 FROM sale_items WHERE sale_id = s.id
        );
        
        RAISE NOTICE '✅ Données de test créées pour le dashboard';
    END IF;
END $$;

-- 9. Vérifier les données après création
SELECT '=== VÉRIFICATION APRÈS CRÉATION ===' as info;

SELECT 
    'Ventes aujourd''hui' as info,
    COUNT(*) as nombre_ventes,
    COALESCE(SUM(total_amount), 0) as chiffre_affaires
FROM sales 
WHERE DATE(created_at) = CURRENT_DATE;

SELECT 
    'Produits vendus ce mois' as info,
    COALESCE(SUM(si.quantity), 0) as total_produits
FROM sales s
LEFT JOIN sale_items si ON s.id = si.sale_id
WHERE DATE(s.created_at) >= DATE_TRUNC('month', CURRENT_DATE);

SELECT '=== TEST DASHBOARD TERMINÉ ===' as info; 