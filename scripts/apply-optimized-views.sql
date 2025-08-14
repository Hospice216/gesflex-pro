-- Script pour appliquer les vues optimisées GesFlex Pro
-- Exécutez ce script dans votre base de données Supabase

-- 1. Vérifier si les vues existent déjà
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'low_stock_products_view') THEN
        RAISE NOTICE 'Création de la vue low_stock_products_view...';
        
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
        
        RAISE NOTICE 'Vue low_stock_products_view créée avec succès !';
    ELSE
        RAISE NOTICE 'La vue low_stock_products_view existe déjà.';
    END IF;
END $$;

-- 2. Créer les autres vues si elles n'existent pas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'sales_stats_daily_view') THEN
        RAISE NOTICE 'Création de la vue sales_stats_daily_view...';
        
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
        
        RAISE NOTICE 'Vue sales_stats_daily_view créée avec succès !';
    ELSE
        RAISE NOTICE 'La vue sales_stats_daily_view existe déjà.';
    END IF;
END $$;

-- 3. Créer les fonctions si elles n'existent pas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_store_inventory') THEN
        RAISE NOTICE 'Création de la fonction get_store_inventory...';
        
        CREATE OR REPLACE FUNCTION get_store_inventory(
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
        
        RAISE NOTICE 'Fonction get_store_inventory créée avec succès !';
    ELSE
        RAISE NOTICE 'La fonction get_store_inventory existe déjà.';
    END IF;
END $$;

-- 4. Accorder les permissions
GRANT SELECT ON low_stock_products_view TO authenticated;
GRANT SELECT ON sales_stats_daily_view TO authenticated;
GRANT EXECUTE ON FUNCTION get_store_inventory TO authenticated;

-- 5. Vérification finale
SELECT 
  'Vues créées avec succès !' as status,
  COUNT(*) as total_views
FROM information_schema.views 
WHERE table_name IN ('low_stock_products_view', 'sales_stats_daily_view');

SELECT 
  'Fonctions créées avec succès !' as status,
  COUNT(*) as total_functions
FROM information_schema.routines 
WHERE routine_name IN ('get_store_inventory');
