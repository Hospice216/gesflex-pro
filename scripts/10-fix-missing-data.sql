-- ========================================
-- CORRECTION DES DONNÉES MANQUANTES
-- ========================================

SELECT '=== CORRECTION DES DONNÉES MANQUANTES ===' as info;

-- 1. Ajouter les configurations de devise manquantes
SELECT '=== AJOUT CONFIGURATION DEVISES ===' as info;

INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_required, created_by)
VALUES 
  ('currency.default', '"XOF"', 'string', 'currency', 'Devise par défaut', true, (SELECT id FROM users LIMIT 1)),
  ('currency.symbol', '"CFA"', 'string', 'currency', 'Symbole de la devise', false, (SELECT id FROM users LIMIT 1)),
  ('currency.position', '"after"', 'string', 'currency', 'Position du symbole', false, (SELECT id FROM users LIMIT 1)),
  ('currency.decimal_places', '0', 'number', 'currency', 'Nombre de décimales', false, (SELECT id FROM users LIMIT 1)),
  ('currency.thousands_separator', '" "', 'string', 'currency', 'Séparateur de milliers', false, (SELECT id FROM users LIMIT 1)),
  ('currency.decimal_separator', '","', 'string', 'currency', 'Séparateur décimal', false, (SELECT id FROM users LIMIT 1))
ON CONFLICT (setting_key) DO NOTHING;

-- 2. Vérifier que les configurations ont été ajoutées
SELECT '=== VÉRIFICATION CONFIGURATIONS ===' as info;

SELECT 
    setting_key,
    setting_value,
    category
FROM system_settings 
WHERE category = 'currency'
ORDER BY setting_key;

-- 3. Créer des données de test pour les ventes si nécessaire
SELECT '=== CRÉATION DONNÉES DE TEST ===' as info;

DO $$
DECLARE
    test_store_id UUID;
    test_product_id UUID;
    test_user_id UUID;
    test_sale_id UUID;
BEGIN
    -- Récupérer des données existantes
    SELECT id INTO test_store_id FROM stores LIMIT 1;
    SELECT id INTO test_product_id FROM products LIMIT 1;
    SELECT id INTO test_user_id FROM users WHERE role = 'Vendeur' LIMIT 1;
    
    IF test_store_id IS NOT NULL AND test_product_id IS NOT NULL AND test_user_id IS NOT NULL THEN
        -- Créer une vente de test pour aujourd'hui si aucune n'existe
        IF NOT EXISTS (SELECT 1 FROM sales WHERE DATE(created_at) = CURRENT_DATE) THEN
            INSERT INTO sales (
                sale_code, store_id, payment_method, customer_name, customer_email, 
                customer_phone, subtotal, tax_amount, total_amount, notes, 
                sold_by, created_at, updated_at
            )
            VALUES (
                'V-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 7, '0'),
                test_store_id,
                'cash',
                'Client Test Dashboard',
                'client@test.com',
                '+1234567890',
                3000,
                0,
                3000,
                'Vente de test pour le dashboard',
                test_user_id,
                NOW(),
                NOW()
            )
            RETURNING id INTO test_sale_id;
            
            -- Créer des items de vente
            IF test_sale_id IS NOT NULL THEN
                INSERT INTO sale_items (
                    sale_id, product_id, product_name, product_sku, quantity, unit_price, total_price
                )
                VALUES (
                    test_sale_id,
                    test_product_id,
                    (SELECT name FROM products WHERE id = test_product_id),
                    (SELECT sku FROM products WHERE id = test_product_id),
                    2,
                    1500,
                    3000
                );
            END IF;
            
            RAISE NOTICE '✅ Vente de test créée pour aujourd''hui';
        ELSE
            RAISE NOTICE 'ℹ️ Des ventes existent déjà pour aujourd''hui';
        END IF;
        
        -- Créer une vente de test pour hier si aucune n'existe
        IF NOT EXISTS (SELECT 1 FROM sales WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day') THEN
            INSERT INTO sales (
                sale_code, store_id, payment_method, customer_name, customer_email, 
                customer_phone, subtotal, tax_amount, total_amount, notes, 
                sold_by, created_at, updated_at
            )
            VALUES (
                'V-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 7, '0'),
                test_store_id,
                'cash',
                'Client Test Hier',
                'client.hier@test.com',
                '+1234567890',
                2000,
                0,
                2000,
                'Vente de test pour hier',
                test_user_id,
                NOW() - INTERVAL '1 day',
                NOW() - INTERVAL '1 day'
            )
            RETURNING id INTO test_sale_id;
            
            -- Créer des items de vente
            IF test_sale_id IS NOT NULL THEN
                INSERT INTO sale_items (
                    sale_id, product_id, product_name, product_sku, quantity, unit_price, total_price
                )
                VALUES (
                    test_sale_id,
                    test_product_id,
                    (SELECT name FROM products WHERE id = test_product_id),
                    (SELECT sku FROM products WHERE id = test_product_id),
                    1,
                    2000,
                    2000
                );
            END IF;
            
            RAISE NOTICE '✅ Vente de test créée pour hier';
        ELSE
            RAISE NOTICE 'ℹ️ Des ventes existent déjà pour hier';
        END IF;
    ELSE
        RAISE NOTICE '⚠️ Impossible de créer des données de test : données de base manquantes';
    END IF;
END $$;

-- 4. Vérifier les données créées
SELECT '=== VÉRIFICATION DONNÉES CRÉÉES ===' as info;

-- Ventes du jour
SELECT 
    'Ventes aujourd''hui' as info,
    COUNT(*) as nombre_ventes,
    COALESCE(SUM(total_amount), 0) as chiffre_affaires
FROM sales 
WHERE DATE(created_at) = CURRENT_DATE;

-- Ventes d'hier
SELECT 
    'Ventes hier' as info,
    COUNT(*) as nombre_ventes,
    COALESCE(SUM(total_amount), 0) as chiffre_affaires
FROM sales 
WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day';

-- Produits vendus ce mois
SELECT 
    'Produits vendus ce mois' as info,
    COALESCE(SUM(si.quantity), 0) as total_produits
FROM sales s
LEFT JOIN sale_items si ON s.id = si.sale_id
WHERE DATE(s.created_at) >= DATE_TRUNC('month', CURRENT_DATE);

-- 5. Vérifier les tables existantes
SELECT '=== VÉRIFICATION TABLES ===' as info;

SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('products', 'product_stores', 'sales', 'sale_items', 'system_settings')
ORDER BY table_name;

SELECT '=== CORRECTION TERMINÉE ===' as info; 