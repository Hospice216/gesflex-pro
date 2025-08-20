-- 🔧 SCRIPT D'INSERTION DE DONNÉES DE TEST
-- Ce script insère des données de base pour tester le Dashboard

-- 1. Insérer des magasins de test
INSERT INTO stores (id, name, address, city, country, phone, email, created_at, updated_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'Magasin Principal', '123 Rue du Commerce', 'Paris', 'France', '+33 1 23 45 67 89', 'principal@gesflex.com', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440002', 'Magasin Secondaire', '456 Avenue des Affaires', 'Lyon', 'France', '+33 4 56 78 90 12', 'secondaire@gesflex.com', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Insérer des produits de test
INSERT INTO products (id, name, description, sku, category, brand, unit_price, alert_stock, created_at, updated_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440010', 'Ordinateur Portable Pro', 'Ordinateur portable professionnel haute performance', 'LAPTOP-PRO-001', 'Informatique', 'TechPro', 1299.99, 5, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440011', 'Smartphone Premium', 'Smartphone dernière génération', 'PHONE-PREM-001', 'Téléphonie', 'MobileTech', 899.99, 3, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440012', 'Tablette Business', 'Tablette professionnelle pour entreprise', 'TABLET-BUS-001', 'Informatique', 'BusinessTab', 599.99, 2, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440013', 'Écran 4K', 'Écran 4K 27 pouces pour professionnels', 'SCREEN-4K-001', 'Informatique', 'DisplayPro', 399.99, 4, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440014', 'Clavier Mécanique', 'Clavier mécanique pour développeurs', 'KEYBOARD-MECH-001', 'Accessoires', 'KeyTech', 149.99, 8, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. Insérer des stocks de produits dans les magasins
INSERT INTO product_stores (id, product_id, store_id, current_stock, alert_stock, created_at, updated_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440001', 3, 5, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', 1, 3, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', 0, 2, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440001', 2, 4, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440001', 6, 8, NOW(), NOW()),
  
  ('550e8400-e29b-41d4-a716-446655440025', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440002', 4, 5, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440026', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440002', 2, 3, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440027', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440002', 1, 2, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440028', '550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440002', 3, 4, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440029', '550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440002', 5, 8, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 4. Insérer des ventes de test
INSERT INTO sales (id, sale_code, customer_name, customer_email, customer_phone, total_amount, subtotal, tax_amount, payment_method, sold_by, store_id, created_at, updated_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440030', 'SALE-001', 'Jean Dupont', 'jean.dupont@email.com', '+33 6 12 34 56 78', 1299.99, 1247.59, 52.40, 'card', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  ('550e8400-e29b-41d4-a716-446655440031', 'SALE-002', 'Marie Martin', 'marie.martin@email.com', '+33 6 23 45 67 89', 899.99, 863.45, 36.54, 'card', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
  ('550e8400-e29b-41d4-a716-446655440032', 'SALE-003', 'Pierre Durand', 'pierre.durand@email.com', '+33 6 34 56 78 90', 599.99, 575.95, 24.04, 'cash', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours'),
  ('550e8400-e29b-41d4-a716-446655440033', 'SALE-004', 'Sophie Bernard', 'sophie.bernard@email.com', '+33 6 45 67 89 01', 399.99, 383.64, 16.35, 'card', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours'),
  ('550e8400-e29b-41d4-a716-446655440034', 'SALE-005', 'Lucas Petit', 'lucas.petit@email.com', '+33 6 56 78 90 12', 149.99, 143.74, 6.25, 'cash', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours')
ON CONFLICT (id) DO NOTHING;

-- 5. Insérer des éléments de vente
INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, total_price, created_at, updated_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440010', 1, 1299.99, 1299.99, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  ('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440011', 1, 899.99, 899.99, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
  ('550e8400-e29b-41d4-a716-446655440042', '550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440012', 1, 599.99, 599.99, NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours'),
  ('550e8400-e29b-41d4-a716-446655440043', '550e8400-e29b-41d4-a716-446655440033', '550e8400-e29b-41d4-a716-446655440013', 1, 399.99, 399.99, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours'),
  ('550e8400-e29b-41d4-a716-446655440044', '550e8400-e29b-41d4-a716-446655440034', '550e8400-e29b-41d4-a716-446655440014', 1, 149.99, 149.99, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours')
ON CONFLICT (id) DO NOTHING;

-- 6. Mettre à jour les stocks après les ventes
UPDATE product_stores 
SET current_stock = current_stock - 1,
    updated_at = NOW()
WHERE id IN (
  '550e8400-e29b-41d4-a716-446655440020', -- Ordinateur
  '550e8400-e29b-41d4-a716-446655440021', -- Smartphone
  '550e8400-e29b-41d4-a716-446655440022', -- Tablette
  '550e8400-e29b-41d4-a716-446655440023', -- Écran
  '550e8400-e29b-41d4-a716-446655440024'  -- Clavier
);

-- 7. Vérifier que l'utilisateur est bien assigné aux magasins
-- (Assurez-vous que l'utilisateur actuel a l'ID '550e8400-e29b-41d4-a716-446655440000')
INSERT INTO user_stores (id, user_id, store_id, role, created_at, updated_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440050', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'Manager', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', 'Manager', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 8. Afficher un résumé des données insérées
SELECT 
  'Magasins créés:' as info,
  COUNT(*) as count
FROM stores
UNION ALL
SELECT 
  'Produits créés:' as info,
  COUNT(*) as count
FROM products
UNION ALL
SELECT 
  'Stocks créés:' as info,
  COUNT(*) as count
FROM product_stores
UNION ALL
SELECT 
  'Ventes créées:' as info,
  COUNT(*) as count
FROM sales
UNION ALL
SELECT 
  'Éléments de vente créés:' as info,
  COUNT(*) as count
FROM sale_items
UNION ALL
SELECT 
  'Assignations utilisateur-magasin:' as info,
  COUNT(*) as count
FROM user_stores;

-- 9. Vérifier les produits en stock faible
SELECT 
  p.name as product_name,
  ps.current_stock,
  p.alert_stock,
  s.name as store_name
FROM product_stores ps
JOIN products p ON ps.product_id = p.id
JOIN stores s ON ps.store_id = s.id
WHERE ps.current_stock <= p.alert_stock
ORDER BY ps.current_stock ASC;
