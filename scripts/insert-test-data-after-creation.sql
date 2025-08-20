-- =====================================================
-- GESFLEX PRO - INSERTION DES DONNÉES DE TEST
-- Exécutez ce script APRÈS avoir exécuté create-complete-database.sql
-- =====================================================

BEGIN;

-- =====================================================
-- REMPLACER VOTRE AUTH_ID ICI
-- =====================================================
-- Remplacez 'VOTRE_AUTH_ID_ICI' par votre véritable auth_id Supabase
-- Vous pouvez le trouver dans votre profil utilisateur ou dans l'interface Supabase
DO $$
DECLARE
    user_auth_id UUID := 'VOTRE_AUTH_ID_ICI'::UUID; -- REMPLACEZ ICI
BEGIN
    -- =====================================================
    -- CRÉATION DE L'UTILISATEUR SUPERADMIN
            -- =====================================================
    INSERT INTO users (auth_id, email, first_name, last_name, role, status) VALUES
    (user_auth_id, 'admin@gesflex.com', 'Super', 'Admin', 'SuperAdmin', 'active');

    -- =====================================================
    -- CRÉATION DES MAGASINS DE TEST
    -- =====================================================
    INSERT INTO stores (name, code, address, phone, email, manager_id) VALUES
    ('Magasin Principal', 'MP-001', '123 Avenue Principale, Ville', '+1234567890', 'mp@gesflex.com', 
     (SELECT id FROM users WHERE auth_id = user_auth_id)),
    ('Magasin Secondaire', 'MS-002', '456 Rue Secondaire, Ville', '+1234567891', 'ms@gesflex.com', 
     (SELECT id FROM users WHERE auth_id = user_auth_id));

    -- =====================================================
    -- CRÉATION DES FOURNISSEURS DE TEST
    -- =====================================================
    INSERT INTO suppliers (name, contact_person, phone, email, address) VALUES
    ('Fournisseur Tech', 'Jean Tech', '+1234567892', 'tech@fournisseur.com', '789 Rue Tech, Ville'),
    ('Fournisseur Accessoires', 'Marie Accessoires', '+1234567893', 'accessoires@fournisseur.com', '321 Rue Accessoires, Ville'),
    ('Fournisseur Vêtements', 'Pierre Vêtements', '+1234567894', 'vetements@fournisseur.com', '654 Rue Vêtements, Ville');

    -- =====================================================
    -- CRÉATION DES PRODUITS DE TEST
    -- =====================================================
    INSERT INTO products (name, sku, description, category_id, unit_id, min_sale_price, current_sale_price, purchase_price, alert_stock) VALUES
    ('Laptop Gaming Pro', 'LAP-001', 'Ordinateur portable gaming haute performance', 
     (SELECT id FROM categories WHERE name = 'Informatique'), 
     (SELECT id FROM units WHERE symbol = 'pcs'), 1200.00, 1500.00, 1000.00, 5),
    ('Smartphone Galaxy S23', 'SMA-001', 'Smartphone Android dernière génération', 
     (SELECT id FROM categories WHERE name = 'Téléphonie'), 
     (SELECT id FROM units WHERE symbol = 'pcs'), 800.00, 999.99, 650.00, 10),
    ('Casque Bluetooth Premium', 'CAS-001', 'Casque audio sans fil haute qualité', 
     (SELECT id FROM categories WHERE name = 'Accessoires'), 
     (SELECT id FROM units WHERE symbol = 'pcs'), 150.00, 199.99, 120.00, 15),
    ('T-shirt Cotton Bio', 'TSH-001', 'T-shirt en coton biologique confortable', 
     (SELECT id FROM categories WHERE name = 'Vêtements'), 
     (SELECT id FROM units WHERE symbol = 'pcs'), 15.00, 24.99, 10.00, 50),
    ('Café Arabica Premium', 'CAF-001', 'Café en grains arabica d''exception', 
     (SELECT id FROM categories WHERE name = 'Alimentation'), 
     (SELECT id FROM units WHERE symbol = 'kg'), 25.00, 39.99, 18.00, 20);

    -- =====================================================
    -- ASSIGNATION DES STOCKS AUX MAGASINS
    -- =====================================================
    INSERT INTO product_stores (product_id, store_id, current_stock, min_stock, max_stock) VALUES
    -- Magasin Principal
    ((SELECT id FROM products WHERE sku = 'LAP-001'), 
     (SELECT id FROM stores WHERE code = 'MP-001'), 8, 5, 20),
    ((SELECT id FROM products WHERE sku = 'SMA-001'), 
     (SELECT id FROM stores WHERE code = 'MP-001'), 15, 10, 30),
    ((SELECT id FROM products WHERE sku = 'CAS-001'), 
     (SELECT id FROM stores WHERE code = 'MP-001'), 25, 15, 50),
    ((SELECT id FROM products WHERE sku = 'TSH-001'), 
     (SELECT id FROM stores WHERE code = 'MP-001'), 80, 50, 100),
    ((SELECT id FROM products WHERE sku = 'CAF-001'), 
     (SELECT id FROM stores WHERE code = 'MP-001'), 35, 20, 60),
    
    -- Magasin Secondaire
    ((SELECT id FROM products WHERE sku = 'LAP-001'), 
     (SELECT id FROM stores WHERE code = 'MS-002'), 3, 5, 15),
    ((SELECT id FROM products WHERE sku = 'SMA-001'), 
     (SELECT id FROM stores WHERE code = 'MS-002'), 7, 10, 25),
    ((SELECT id FROM products WHERE sku = 'CAS-001'), 
     (SELECT id FROM stores WHERE code = 'MS-002'), 12, 15, 40),
    ((SELECT id FROM products WHERE sku = 'TSH-001'), 
     (SELECT id FROM stores WHERE code = 'MS-002'), 45, 50, 80),
    ((SELECT id FROM products WHERE sku = 'CAF-001'), 
     (SELECT id FROM stores WHERE code = 'MS-002'), 18, 20, 50);

    -- =====================================================
    -- CRÉATION DES CLIENTS DE TEST
    -- =====================================================
    INSERT INTO customers (name, email, phone, address, created_by) VALUES
    ('Client Premium', 'premium@client.com', '+1234567895', '123 Rue Client, Ville', 
     (SELECT id FROM users WHERE auth_id = user_auth_id)),
    ('Client Standard', 'standard@client.com', '+1234567896', '456 Rue Standard, Ville', 
     (SELECT id FROM users WHERE auth_id = user_auth_id)),
    ('Client Occasionnel', 'occasionnel@client.com', '+1234567897', '789 Rue Occasionnel, Ville', 
     (SELECT id FROM users WHERE auth_id = user_auth_id));

    -- =====================================================
    -- CRÉATION DES VENTES DE TEST
    -- =====================================================
    INSERT INTO sales (sale_code, store_id, customer_id, customer_name, customer_email, customer_phone, 
                      payment_method, subtotal, tax_amount, total_amount, sold_by) VALUES
    ('VNT-2025-001', (SELECT id FROM stores WHERE code = 'MP-001'), 
     (SELECT id FROM customers WHERE email = 'premium@client.com'), 'Client Premium', 'premium@client.com', '+1234567895',
     'card', 1499.99, 293.99, 1793.98, (SELECT id FROM users WHERE auth_id = user_auth_id)),
    ('VNT-2025-002', (SELECT id FROM stores WHERE code = 'MP-001'), 
     (SELECT id FROM customers WHERE email = 'standard@client.com'), 'Client Standard', 'standard@client.com', '+1234567896',
     'cash', 199.99, 39.20, 239.19, (SELECT id FROM users WHERE auth_id = user_auth_id)),
    ('VNT-2025-003', (SELECT id FROM stores WHERE code = 'MS-002'), 
     (SELECT id FROM customers WHERE email = 'occasionnel@client.com'), 'Client Occasionnel', 'occasionnel@client.com', '+1234567897',
     'mobile_money', 39.99, 7.84, 47.83, (SELECT id FROM users WHERE auth_id = user_auth_id)),
    ('VNT-2025-004', (SELECT id FROM stores WHERE code = 'MP-001'), 
     NULL, 'Client Walk-in', 'walkin@client.com', '+1234567898',
     'card', 24.99, 4.90, 29.89, (SELECT id FROM users WHERE auth_id = user_auth_id)),
    ('VNT-2025-005', (SELECT id FROM stores WHERE code = 'MS-002'), 
     (SELECT id FROM customers WHERE email = 'premium@client.com'), 'Client Premium', 'premium@client.com', '+1234567895',
     'bank_transfer', 999.99, 196.00, 1195.99, (SELECT id FROM users WHERE auth_id = user_auth_id));

    -- =====================================================
    -- CRÉATION DES ÉLÉMENTS DE VENTE
    -- =====================================================
    INSERT INTO sale_items (sale_id, product_id, product_name, product_sku, quantity, unit_price, total_price) VALUES
    -- Vente 1: Laptop + Casque
    ((SELECT id FROM sales WHERE sale_code = 'VNT-2025-001'), 
     (SELECT id FROM products WHERE sku = 'LAP-001'), 'Laptop Gaming Pro', 'LAP-001', 1, 1499.99, 1499.99),
    ((SELECT id FROM sales WHERE sale_code = 'VNT-2025-001'), 
     (SELECT id FROM products WHERE sku = 'CAS-001'), 'Casque Bluetooth Premium', 'CAS-001', 1, 199.99, 199.99),
    
    -- Vente 2: Casque uniquement
    ((SELECT id FROM sales WHERE sale_code = 'VNT-2025-002'), 
     (SELECT id FROM products WHERE sku = 'CAS-001'), 'Casque Bluetooth Premium', 'CAS-001', 1, 199.99, 199.99),
    
    -- Vente 3: Café
    ((SELECT id FROM sales WHERE sale_code = 'VNT-2025-003'), 
     (SELECT id FROM products WHERE sku = 'CAF-001'), 'Café Arabica Premium', 'CAF-001', 1, 39.99, 39.99),
    
    -- Vente 4: T-shirt
    ((SELECT id FROM sales WHERE sale_code = 'VNT-2025-004'), 
     (SELECT id FROM products WHERE sku = 'TSH-001'), 'T-shirt Cotton Bio', 'TSH-001', 1, 24.99, 24.99),
    
    -- Vente 5: Smartphone
    ((SELECT id FROM sales WHERE sale_code = 'VNT-2025-005'), 
     (SELECT id FROM products WHERE sku = 'SMA-001'), 'Smartphone Galaxy S23', 'SMA-001', 1, 999.99, 999.99);

    -- =====================================================
    -- CRÉATION DES ACHATS DE TEST
    -- =====================================================
    INSERT INTO purchases (purchase_code, store_id, product_id, supplier_id, quantity, unit_price, total_amount, 
                          expected_arrival_date, status, created_by) VALUES
    ('ACH-2025-001', (SELECT id FROM stores WHERE code = 'MP-001'), 
     (SELECT id FROM products WHERE sku = 'LAP-001'), (SELECT id FROM suppliers WHERE name = 'Fournisseur Tech'),
     10, 1000.00, 10000.00, CURRENT_DATE + INTERVAL '7 days', 'pending', 
     (SELECT id FROM users WHERE auth_id = user_auth_id)),
    ('ACH-2025-002', (SELECT id FROM stores WHERE code = 'MP-001'), 
     (SELECT id FROM products WHERE sku = 'SMA-001'), (SELECT id FROM suppliers WHERE name = 'Fournisseur Tech'),
     20, 650.00, 13000.00, CURRENT_DATE + INTERVAL '5 days', 'pending', 
     (SELECT id FROM users WHERE auth_id = user_auth_id)),
    ('ACH-2025-003', (SELECT id FROM stores WHERE code = 'MS-002'), 
     (SELECT id FROM products WHERE sku = 'CAS-001'), (SELECT id FROM suppliers WHERE name = 'Fournisseur Accessoires'),
     30, 120.00, 3600.00, CURRENT_DATE + INTERVAL '3 days', 'pending', 
     (SELECT id FROM users WHERE auth_id = user_auth_id));

    -- =====================================================
    -- ASSIGNATION UTILISATEUR-MAGASIN
    -- =====================================================
    INSERT INTO user_stores (user_id, store_id, is_primary) VALUES
    ((SELECT id FROM users WHERE auth_id = user_auth_id), 
     (SELECT id FROM stores WHERE code = 'MP-001'), true),
    ((SELECT id FROM users WHERE auth_id = user_auth_id), 
     (SELECT id FROM stores WHERE code = 'MS-002'), false);

    -- =====================================================
    -- CRÉATION DES POINTS UTILISATEUR
    -- =====================================================
    INSERT INTO user_points (user_id, points, total_earned, total_spent, level) VALUES
    ((SELECT id FROM users WHERE auth_id = user_auth_id), 150, 150, 0, 2);

    -- =====================================================
    -- HISTORIQUE DES POINTS
    -- =====================================================
    INSERT INTO points_history (user_id, points_change, change_type, reason, related_sale_id) VALUES
    ((SELECT id FROM users WHERE auth_id = user_auth_id), 50, 'vente', 'Vente VNT-2025-001', 
     (SELECT id FROM sales WHERE sale_code = 'VNT-2025-001')),
    ((SELECT id FROM users WHERE auth_id = user_auth_id), 30, 'vente', 'Vente VNT-2025-002', 
     (SELECT id FROM sales WHERE sale_code = 'VNT-2025-002')),
    ((SELECT id FROM users WHERE auth_id = user_auth_id), 20, 'vente', 'Vente VNT-2025-003', 
     (SELECT id FROM sales WHERE sale_code = 'VNT-2025-003')),
    ((SELECT id FROM users WHERE auth_id = user_auth_id), 10, 'vente', 'Vente VNT-2025-004', 
     (SELECT id FROM sales WHERE sale_code = 'VNT-2025-004')),
    ((SELECT id FROM users WHERE auth_id = user_auth_id), 40, 'vente', 'Vente VNT-2025-005', 
     (SELECT id FROM sales WHERE sale_code = 'VNT-2025-005'));

    -- =====================================================
    -- CRÉATION DES TROPHÉES
    -- =====================================================
    INSERT INTO trophies (name, description, icon, points_reward, condition_type, condition_value) VALUES
    ('Premier Vendeur', 'Réaliser votre première vente', '🏆', 100, 'sales_count', 1),
    ('Vendeur Bronze', 'Réaliser 10 ventes', '🥉', 200, 'sales_count', 10),
    ('Vendeur Argent', 'Réaliser 50 ventes', '🥈', 500, 'sales_count', 50),
    ('Vendeur Or', 'Réaliser 100 ventes', '🥇', 1000, 'sales_count', 100),
    ('Champion des Ventes', 'Atteindre 1000€ de ventes', '👑', 500, 'sales_amount', 1000);

    -- =====================================================
    -- CRÉATION DES BADGES
    -- =====================================================
    INSERT INTO badges (name, description, icon, category) VALUES
    ('Nouveau Vendeur', 'Bienvenue dans l''équipe de vente', '🆕', 'debutant'),
    ('Vendeur Efficace', 'Vendeur qui respecte les objectifs', '⚡', 'performance'),
    ('Service Client', 'Excellence en service client', '💎', 'qualite'),
    ('Équipe', 'Travail d''équipe exemplaire', '🤝', 'collaboration'),
    ('Innovation', 'Nouvelles idées et améliorations', '💡', 'creativite');

    -- =====================================================
    -- ATTRIBUTION DES TROPHÉES ET BADGES
    -- =====================================================
    INSERT INTO user_trophies (user_id, trophy_id) VALUES
    ((SELECT id FROM users WHERE auth_id = user_auth_id), 
     (SELECT id FROM trophies WHERE name = 'Premier Vendeur')),
    ((SELECT id FROM users WHERE auth_id = user_auth_id), 
     (SELECT id FROM trophies WHERE name = 'Vendeur Bronze'));

    INSERT INTO user_badges (user_id, badge_id) VALUES
    ((SELECT id FROM users WHERE auth_id = user_auth_id), 
     (SELECT id FROM badges WHERE name = 'Nouveau Vendeur')),
    ((SELECT id FROM users WHERE auth_id = user_auth_id), 
     (SELECT id FROM badges WHERE name = 'Vendeur Efficace'));

    -- =====================================================
    -- CRÉATION DES DÉPENSES DE TEST
    -- =====================================================
    INSERT INTO expenses (title, description, category, amount, expense_date, store_id, created_by) VALUES
    ('Maintenance Équipements', 'Maintenance des équipements informatiques', 'Maintenance', 150.00, CURRENT_DATE, 
     (SELECT id FROM stores WHERE code = 'MP-001'), (SELECT id FROM users WHERE auth_id = user_auth_id)),
    ('Formation Personnel', 'Formation sur les nouveaux produits', 'Formation', 300.00, CURRENT_DATE, 
     (SELECT id FROM stores WHERE code = 'MP-001'), (SELECT id FROM users WHERE auth_id = user_auth_id)),
    ('Marketing Local', 'Publicité locale et flyers', 'Marketing', 200.00, CURRENT_DATE, 
     (SELECT id FROM stores WHERE code = 'MS-002'), (SELECT id FROM users WHERE auth_id = user_auth_id));

    RAISE NOTICE '✅ Données de test insérées avec succès !';
    RAISE NOTICE '📊 Base de données prête pour les tests et le développement';
    RAISE NOTICE '🔑 N''oubliez pas de remplacer VOTRE_AUTH_ID_ICI par votre véritable auth_id';

END $$;

COMMIT;

-- =====================================================
-- VÉRIFICATION DES DONNÉES INSÉRÉES
-- =====================================================
SELECT 'Vérification des données insérées' as status;

-- Compter les utilisateurs
SELECT 'Utilisateurs' as table_name, COUNT(*) as count FROM users;

-- Compter les magasins
SELECT 'Magasins' as table_name, COUNT(*) as count FROM stores;

-- Compter les produits
SELECT 'Produits' as table_name, COUNT(*) as count FROM products;

-- Compter les ventes
SELECT 'Ventes' as table_name, COUNT(*) as count FROM sales;

-- Compter les clients
SELECT 'Clients' as table_name, COUNT(*) as count FROM customers;

-- Compter les fournisseurs
SELECT 'Fournisseurs' as table_name, COUNT(*) as count FROM suppliers;

-- Compter les achats
SELECT 'Achats' as table_name, COUNT(*) as count FROM purchases;

-- Compter les trophées et badges
SELECT 'Trophées' as table_name, COUNT(*) as count FROM trophies;
SELECT 'Badges' as table_name, COUNT(*) as count FROM badges;

-- Vérifier les stocks
SELECT 'Stocks par magasin' as info, 
       s.name as store_name, 
       COUNT(ps.product_id) as products_count,
       SUM(ps.current_stock) as total_stock
FROM stores s
LEFT JOIN product_stores ps ON s.id = ps.store_id
GROUP BY s.id, s.name
ORDER BY s.name;

-- Vérifier les ventes par magasin
SELECT 'Ventes par magasin' as info,
       s.name as store_name,
       COUNT(sa.id) as sales_count,
       SUM(sa.total_amount) as total_revenue
FROM stores s
LEFT JOIN sales sa ON s.id = sa.store_id
GROUP BY s.id, s.name
ORDER BY s.name;
