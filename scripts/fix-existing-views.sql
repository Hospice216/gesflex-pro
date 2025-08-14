-- Script de correction pour les vues existantes GesFlex Pro
-- Ce script gère les conflits de noms de colonnes

-- 1. Supprimer les vues existantes si elles ont des conflits
DROP VIEW IF EXISTS low_stock_products_view CASCADE;
DROP VIEW IF EXISTS sales_stats_daily_view CASCADE;

-- 2. Recréer la vue low_stock_products_view avec la structure correcte
CREATE VIEW low_stock_products_view AS
SELECT 
  p.id as product_id,
  p.name as product_name,
  p.sku as product_sku,
  c.name as category_name,
  u.symbol as unit_symbol,
  ps.current_stock,
  ps.min_stock,
  ps.max_stock,
  p.alert_stock,
  s.id as store_id,
  s.name as store_name,
  s.code as store_code,
  CASE 
    WHEN ps.current_stock = 0 THEN 'out_of_stock'
    WHEN ps.current_stock <= ps.min_stock THEN 'low_stock'
    WHEN ps.current_stock <= p.alert_stock THEN 'alert_stock'
    ELSE 'normal_stock'
  END as stock_status,
  CASE 
    WHEN ps.current_stock = 0 THEN 'Rupture de stock'
    WHEN ps.current_stock <= ps.min_stock THEN 'Stock minimum atteint'
    WHEN ps.current_stock <= p.alert_stock THEN 'Stock d''alerte atteint'
    ELSE 'Stock normal'
  END as stock_warning,
  (ps.max_stock - ps.current_stock) as suggested_order_quantity
FROM products p
JOIN categories c ON p.category_id = c.id
JOIN units u ON p.unit_id = u.id
JOIN product_stores ps ON p.id = ps.product_id
JOIN stores s ON ps.store_id = s.id
WHERE p.is_active = true 
  AND (ps.current_stock <= ps.min_stock OR ps.current_stock <= p.alert_stock)
ORDER BY ps.current_stock ASC, p.name;

-- 3. Recréer la vue sales_stats_daily_view
CREATE VIEW sales_stats_daily_view AS
SELECT 
  DATE(s.sold_at) as sale_date,
  s.store_id,
  st.name as store_name,
  COUNT(*) as total_sales,
  SUM(s.total_amount) as total_revenue,
  COUNT(DISTINCT s.customer_id) as unique_customers,
  AVG(s.total_amount) as average_sale_amount
FROM sales s
JOIN stores st ON s.store_id = st.id
WHERE s.sold_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(s.sold_at), s.store_id, st.name
ORDER BY sale_date DESC, store_name;

-- 4. Supprimer toutes les fonctions get_store_inventory existantes pour éviter les conflits
DROP FUNCTION IF EXISTS get_store_inventory(UUID, TEXT);
DROP FUNCTION IF EXISTS get_store_inventory(UUID);
DROP FUNCTION IF EXISTS get_store_inventory(TEXT);
DROP FUNCTION IF EXISTS get_store_inventory();

-- 5. Recréer la fonction get_store_inventory avec la signature correcte
CREATE FUNCTION get_store_inventory(
  store_id_filter UUID DEFAULT NULL,
  stock_status_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  product_sku TEXT,
  category_name TEXT,
  current_stock INTEGER,
  min_stock INTEGER,
  max_stock INTEGER,
  alert_stock INTEGER,
  stock_status TEXT,
  stock_warning TEXT,
  suggested_order_quantity INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.sku,
    c.name,
    ps.current_stock,
    ps.min_stock,
    ps.max_stock,
    p.alert_stock,
    CASE 
      WHEN ps.current_stock = 0 THEN 'out_of_stock'
      WHEN ps.current_stock <= ps.min_stock THEN 'low_stock'
      WHEN ps.current_stock <= p.alert_stock THEN 'alert_stock'
      ELSE 'normal_stock'
    END as stock_status,
    CASE 
      WHEN ps.current_stock = 0 THEN 'Rupture de stock'
      WHEN ps.current_stock <= ps.min_stock THEN 'Stock minimum atteint'
      WHEN ps.current_stock <= p.alert_stock THEN 'Stock d''alerte atteint'
      ELSE 'Stock normal'
    END as stock_warning,
    (ps.max_stock - ps.current_stock) as suggested_order_quantity
  FROM products p
  JOIN categories c ON p.category_id = c.id
  JOIN product_stores ps ON p.id = ps.product_id
  JOIN stores s ON ps.store_id = s.id
  WHERE p.is_active = true
    AND (store_id_filter IS NULL OR ps.store_id = store_id_filter)
    AND (
      stock_status_filter IS NULL 
      OR CASE 
        WHEN stock_status_filter = 'out_of_stock' THEN ps.current_stock = 0
        WHEN stock_status_filter = 'low_stock' THEN ps.current_stock <= ps.min_stock
        WHEN stock_status_filter = 'alert_stock' THEN ps.current_stock <= p.alert_stock
        WHEN stock_status_filter = 'normal_stock' THEN ps.current_stock > p.alert_stock
        ELSE true
      END
    )
  ORDER BY ps.current_stock ASC, p.name;
END;
$$ LANGUAGE plpgsql;

-- 6. Accorder les permissions
GRANT SELECT ON low_stock_products_view TO authenticated;
GRANT SELECT ON sales_stats_daily_view TO authenticated;
GRANT EXECUTE ON FUNCTION get_store_inventory(UUID, TEXT) TO authenticated;

-- 7. Vérification finale
SELECT 
  'Vues et fonctions corrigées avec succès !' as status,
  COUNT(*) as total_views
FROM information_schema.views 
WHERE table_name IN ('low_stock_products_view', 'sales_stats_daily_view');

SELECT 
  'Fonctions disponibles :' as status,
  COUNT(*) as total_functions
FROM information_schema.routines 
WHERE routine_name IN ('get_store_inventory');

-- 8. Test des vues créées
SELECT 'Test de la vue low_stock_products_view :' as test_info;
SELECT COUNT(*) as total_records FROM low_stock_products_view LIMIT 1;

SELECT 'Test de la vue sales_stats_daily_view :' as test_info;
SELECT COUNT(*) as total_records FROM sales_stats_daily_view LIMIT 1;

SELECT 'Test de la fonction get_store_inventory :' as test_info;
SELECT COUNT(*) as total_records FROM get_store_inventory() LIMIT 1;
