-- =====================================================
-- GESFLEX PRO – OPTIMIZED VIEWS AND INDEXES
-- Performance optimizations for frequently used queries
-- =====================================================

BEGIN;

-- Ensure objects are created in public schema by default
SET search_path = public, pg_temp;

-- =====================================================
-- OPTIMIZED VIEWS FOR FREQUENT QUERIES
-- =====================================================

-- Vue pour l'inventaire des produits avec toutes les informations nécessaires
CREATE OR REPLACE VIEW product_inventory_view AS
SELECT 
  p.id as product_id,
  p.name as product_name,
  p.sku,
  p.description,
  p.min_sale_price,
  p.current_sale_price,
  p.tax_rate,
  p.alert_stock,
  p.expiration_date,
  p.barcode,
  p.is_active as product_active,
  c.id as category_id,
  c.name as category_name,
  c.color as category_color,
  c.icon as category_icon,
  u.id as unit_id,
  u.name as unit_name,
  u.symbol as unit_symbol,
  ps.current_stock,
  ps.min_stock,
  ps.max_stock,
  ps.is_available,
  s.id as store_id,
  s.name as store_name,
  s.code as store_code,
  CASE 
    WHEN ps.current_stock <= ps.min_stock THEN 'low_stock'
    WHEN ps.current_stock = 0 THEN 'out_of_stock'
    WHEN ps.current_stock <= p.alert_stock THEN 'alert_stock'
    ELSE 'normal_stock'
  END as stock_status,
  CASE 
    WHEN p.expiration_date IS NOT NULL AND p.expiration_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    WHEN p.expiration_date IS NOT NULL AND p.expiration_date <= CURRENT_DATE THEN 'expired'
    ELSE 'valid'
  END as expiration_status
FROM products p
JOIN categories c ON p.category_id = c.id
JOIN units u ON p.unit_id = u.id
JOIN product_stores ps ON p.id = ps.product_id
JOIN stores s ON ps.store_id = s.id
WHERE p.is_active = true AND c.is_active = true AND u.is_active = true;

-- Vue pour les statistiques de vente par jour
CREATE OR REPLACE VIEW sales_stats_daily_view AS
SELECT 
  DATE_TRUNC('day', s.sold_at) as sale_date,
  s.store_id,
  st.name as store_name,
  COUNT(*) as total_sales,
  COUNT(DISTINCT s.id) as unique_transactions,
  SUM(s.total_amount) as total_revenue,
  SUM(s.subtotal) as total_subtotal,
  SUM(s.tax_amount) as total_tax,
  COUNT(DISTINCT s.sold_by) as unique_sellers,
  COUNT(DISTINCT s.customer_id) as unique_customers,
  AVG(s.total_amount) as average_sale_amount,
  MIN(s.total_amount) as min_sale_amount,
  MAX(s.total_amount) as max_sale_amount
FROM sales s
JOIN stores st ON s.store_id = st.id
GROUP BY DATE_TRUNC('day', s.sold_at), s.store_id, st.name
ORDER BY sale_date DESC, store_id;

-- Vue pour les statistiques de vente par mois
CREATE OR REPLACE VIEW sales_stats_monthly_view AS
SELECT 
  DATE_TRUNC('month', s.sold_at) as sale_month,
  s.store_id,
  st.name as store_name,
  COUNT(*) as total_sales,
  SUM(s.total_amount) as total_revenue,
  COUNT(DISTINCT s.sold_by) as unique_sellers,
  COUNT(DISTINCT s.customer_id) as unique_customers,
  AVG(s.total_amount) as average_sale_amount
FROM sales s
JOIN stores st ON s.store_id = st.id
GROUP BY DATE_TRUNC('month', s.sold_at), s.store_id, st.name
ORDER BY sale_month DESC, store_id;

-- Vue pour les produits en rupture de stock
CREATE OR REPLACE VIEW low_stock_products_view AS
SELECT 
  p.id as product_id,
  p.name as product_name,
  p.sku,
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

-- Vue pour les achats en attente de validation
CREATE OR REPLACE VIEW pending_purchases_view AS
SELECT 
  p.id as purchase_id,
  p.purchase_code,
  p.store_id,
  s.name as store_name,
  p.product_id,
  pr.name as product_name,
  pr.sku as product_sku,
  p.supplier_id,
  sup.name as supplier_name,
  sup.phone as supplier_phone,
  p.quantity,
  p.unit_price,
  p.total_amount,
  p.expected_arrival_date,
  p.status,
  p.notes,
  p.created_by,
  u.first_name || ' ' || u.last_name as created_by_name,
  p.created_at,
  CASE 
    WHEN p.expected_arrival_date < CURRENT_DATE THEN 'En retard'
    WHEN p.expected_arrival_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'Arrivée proche'
    ELSE 'En attente'
  END as arrival_status
FROM purchases p
JOIN stores s ON p.store_id = s.id
JOIN products pr ON p.product_id = pr.id
JOIN suppliers sup ON p.supplier_id = sup.id
JOIN users u ON p.created_by = u.id
WHERE p.status = 'pending'
ORDER BY p.expected_arrival_date ASC, p.created_at DESC;

-- Vue pour les transferts en cours
CREATE OR REPLACE VIEW active_transfers_view AS
SELECT 
  t.id as transfer_id,
  t.transfer_code,
  t.source_store_id,
  ss.name as source_store_name,
  t.destination_store_id,
  ds.name as destination_store_name,
  t.product_id,
  p.name as product_name,
  p.sku as product_sku,
  t.quantity,
  t.status,
  t.notes,
  t.created_by,
  u.first_name || ' ' || u.last_name as created_by_name,
  t.created_at,
  t.updated_at,
  CASE 
    WHEN t.status = 'pending' THEN 'En attente de validation'
    WHEN t.status = 'validated' THEN 'Terminé'
    WHEN t.status = 'rejected' THEN 'Rejeté'
    ELSE 'Inconnu'
  END as transfer_status_display
FROM store_transfers t
JOIN stores ss ON t.source_store_id = ss.id
JOIN stores ds ON t.destination_store_id = ds.id
JOIN products p ON t.product_id = p.id
JOIN users u ON t.created_by = u.id
WHERE t.status IN ('pending', 'validated')
ORDER BY t.created_at DESC;

-- Vue pour les retours et échanges
CREATE OR REPLACE VIEW returns_summary_view AS
SELECT 
  r.id as return_id,
  r.return_code,
  r.original_sale_id,
  s.sale_code as original_sale_code,
  r.customer_name,
  r.customer_email,
  r.customer_phone,
  r.return_reason,
  r.return_status,
  r.processed_by,
  u.first_name || ' ' || u.last_name as processed_by_name,
  r.processed_at,
  r.notes,
  r.created_at,
  COUNT(ri.id) as total_returned_items,
  SUM(ri.returned_quantity) as total_returned_quantity,
  SUM(ri.original_total_price) as total_returned_value,
  SUM(COALESCE(ri.exchange_total_price, 0)) as total_exchange_value,
  SUM(COALESCE(ri.price_difference, 0)) as total_price_difference
FROM returns r
JOIN sales s ON r.original_sale_id = s.id
LEFT JOIN users u ON r.processed_by = u.id
LEFT JOIN return_items ri ON r.id = ri.return_id
GROUP BY r.id, r.return_code, r.original_sale_id, s.sale_code, r.customer_name, 
         r.customer_email, r.customer_phone, r.return_reason, r.return_status, 
         r.processed_by, u.first_name, u.last_name, r.processed_at, r.notes, r.created_at
ORDER BY r.created_at DESC;

-- =====================================================
-- ADVANCED INDEXES FOR PERFORMANCE
-- =====================================================

-- Index full-text pour la recherche de produits
CREATE INDEX IF NOT EXISTS idx_products_search_fulltext ON products 
USING gin(to_tsvector('french', name || ' ' || COALESCE(description, '')));

-- Index composite pour les requêtes temporelles de ventes
CREATE INDEX IF NOT EXISTS idx_sales_date_store_composite ON sales(sold_at, store_id, total_amount);

-- Index composite pour les achats par date et magasin
CREATE INDEX IF NOT EXISTS idx_purchases_date_store_composite ON purchases(created_at, store_id, status);

-- Index pour les relations fréquentes product_stores
CREATE INDEX IF NOT EXISTS idx_product_stores_stock_status ON product_stores(current_stock, is_available, store_id);

-- Index pour les transferts actifs
CREATE INDEX IF NOT EXISTS idx_store_transfers_status_date ON store_transfers(status, created_at);

-- Index pour les retours par statut et date
CREATE INDEX IF NOT EXISTS idx_returns_status_date ON returns(return_status, created_at);

-- Index pour la recherche de clients
CREATE INDEX IF NOT EXISTS idx_customers_search ON customers 
USING gin(to_tsvector('french', name || ' ' || COALESCE(email, '') || ' ' || COALESCE(phone, '')));

-- =====================================================
-- OPTIMIZED FUNCTIONS FOR BUSINESS LOGIC
-- =====================================================

-- Fonction pour récupérer l'inventaire d'un magasin avec filtres
CREATE OR REPLACE FUNCTION get_store_inventory(
  store_uuid UUID,
  category_filter UUID DEFAULT NULL,
  stock_status_filter TEXT DEFAULT NULL,
  search_term TEXT DEFAULT NULL
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  sku TEXT,
  current_stock INTEGER,
  min_stock INTEGER,
  max_stock INTEGER,
  category_name TEXT,
  unit_symbol TEXT,
  stock_status TEXT,
  alert_stock INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.sku,
    ps.current_stock,
    ps.min_stock,
    ps.max_stock,
    c.name,
    u.symbol,
    CASE 
      WHEN ps.current_stock <= ps.min_stock THEN 'low_stock'
      WHEN ps.current_stock = 0 THEN 'out_of_stock'
      WHEN ps.current_stock <= p.alert_stock THEN 'alert_stock'
      ELSE 'normal_stock'
    END,
    p.alert_stock
  FROM products p
  JOIN product_stores ps ON p.id = ps.product_id
  JOIN categories c ON p.category_id = c.id
  JOIN units u ON p.unit_id = u.id
  WHERE ps.store_id = store_uuid 
    AND p.is_active = true
    AND (category_filter IS NULL OR p.category_id = category_filter)
    AND (stock_status_filter IS NULL OR 
         CASE 
           WHEN stock_status_filter = 'low_stock' THEN ps.current_stock <= ps.min_stock
           WHEN stock_status_filter = 'out_of_stock' THEN ps.current_stock = 0
           WHEN stock_status_filter = 'alert_stock' THEN ps.current_stock <= p.alert_stock
           WHEN stock_status_filter = 'normal_stock' THEN ps.current_stock > p.alert_stock
           ELSE true
         END)
    AND (search_term IS NULL OR 
         p.name ILIKE '%' || search_term || '%' OR 
         p.sku ILIKE '%' || search_term || '%')
  ORDER BY p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour récupérer les statistiques de vente d'un magasin
CREATE OR REPLACE FUNCTION get_store_sales_stats(
  store_uuid UUID,
  period_start DATE DEFAULT NULL,
  period_end DATE DEFAULT NULL
)
RETURNS TABLE (
  total_sales BIGINT,
  total_revenue DECIMAL,
  average_sale_amount DECIMAL,
  unique_customers BIGINT,
  unique_sellers BIGINT,
  top_selling_product TEXT,
  top_selling_product_quantity BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH sales_summary AS (
    SELECT 
      COUNT(*) as total_sales,
      SUM(total_amount) as total_revenue,
      AVG(total_amount) as average_sale_amount,
      COUNT(DISTINCT customer_id) as unique_customers,
      COUNT(DISTINCT sold_by) as unique_sellers
    FROM sales
    WHERE store_id = store_uuid
      AND (period_start IS NULL OR sold_at >= period_start)
      AND (period_end IS NULL OR sold_at <= period_end)
  ),
  top_product AS (
    SELECT 
      p.name as product_name,
      SUM(si.quantity) as total_quantity
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    JOIN products p ON si.product_id = p.id
    WHERE s.store_id = store_uuid
      AND (period_start IS NULL OR s.sold_at >= period_start)
      AND (period_end IS NULL OR s.sold_at <= period_end)
    GROUP BY p.id, p.name
    ORDER BY total_quantity DESC
    LIMIT 1
  )
  SELECT 
    ss.total_sales,
    ss.total_revenue,
    ss.average_sale_amount,
    ss.unique_customers,
    ss.unique_sellers,
    tp.product_name,
    tp.total_quantity
  FROM sales_summary ss
  CROSS JOIN top_product tp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANTS FOR VIEWS AND FUNCTIONS
-- =====================================================

-- Donner accès aux vues aux utilisateurs authentifiés
GRANT SELECT ON product_inventory_view TO authenticated;
GRANT SELECT ON sales_stats_daily_view TO authenticated;
GRANT SELECT ON sales_stats_monthly_view TO authenticated;
GRANT SELECT ON low_stock_products_view TO authenticated;
GRANT SELECT ON pending_purchases_view TO authenticated;
GRANT SELECT ON active_transfers_view TO authenticated;
GRANT SELECT ON returns_summary_view TO authenticated;

-- Donner accès aux fonctions aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION get_store_inventory(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_store_sales_stats(UUID, DATE, DATE) TO authenticated;

-- =====================================================
-- FINAL MESSAGE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'GesFlex Pro – Optimized views and indexes created successfully';
  RAISE NOTICE 'Performance improvements applied to database';
END$$;

COMMIT;
