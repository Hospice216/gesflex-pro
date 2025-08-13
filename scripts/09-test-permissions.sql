-- ========================================
-- TEST DES PERMISSIONS PAR RÔLE
-- ========================================

SELECT '=== TEST DES PERMISSIONS PAR RÔLE ===' as info;

-- 1. Vérifier les utilisateurs existants et leurs rôles
SELECT '=== UTILISATEURS ET RÔLES ===' as info;

SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.role,
    u.status,
    COUNT(us.store_id) as nombre_magasins_assignes
FROM users u
LEFT JOIN user_stores us ON u.id = us.user_id
GROUP BY u.id, u.first_name, u.last_name, u.email, u.role, u.status
ORDER BY u.role, u.first_name;

-- 2. Vérifier les permissions par rôle
SELECT '=== PERMISSIONS PAR RÔLE ===' as info;

-- SuperAdmin : Accès à tout
SELECT 'SuperAdmin' as role, 
       'Tous les accès' as permissions,
       'Peut tout faire' as description;

-- Admin : Accès à tout sauf configuration
SELECT 'Admin' as role, 
       'Gestion complète' as permissions,
       'Peut gérer utilisateurs, magasins, produits, ventes, achats' as description;

-- Manager : Accès limité
SELECT 'Manager' as role, 
       'Gestion magasin' as permissions,
       'Peut gérer ses magasins, produits, ventes, inventaire' as description;

-- Vendeur : Accès très limité
SELECT 'Vendeur' as role, 
       'Ventes uniquement' as permissions,
       'Peut voir produits, faire des ventes, voir tableau de bord' as description;

-- 3. Vérifier les boutons visibles par rôle
SELECT '=== BOUTONS VISIBLES PAR RÔLE ===' as info;

-- Dashboard
SELECT 'Dashboard' as page,
       'Nouvelle vente' as bouton,
       'Tous les rôles' as visible_pour;

SELECT 'Dashboard' as page,
       'Ajouter produit' as bouton,
       'Admin, SuperAdmin, Manager' as visible_pour;

SELECT 'Dashboard' as page,
       'Inventaire' as bouton,
       'Admin, SuperAdmin, Manager' as visible_pour;

-- Produits
SELECT 'Produits' as page,
       'Nouveau produit' as bouton,
       'Admin, SuperAdmin, Manager' as visible_pour;

SELECT 'Produits' as page,
       'Nouvelle catégorie' as bouton,
       'Admin, SuperAdmin, Manager' as visible_pour;

SELECT 'Produits' as page,
       'Modifier produit' as action,
       'Admin, SuperAdmin, Manager' as visible_pour;

SELECT 'Produits' as page,
       'Supprimer produit' as action,
       'Admin, SuperAdmin' as visible_pour;

-- 4. Vérifier les pages accessibles par rôle
SELECT '=== PAGES ACCESSIBLES PAR RÔLE ===' as info;

-- SuperAdmin
SELECT 'SuperAdmin' as role,
       'Dashboard, Produits, Arrivage, Achat, Ventes, Retours, Inventaire, Utilisateurs, Magasins, Fournisseurs, Gestion Financière, Analytics, Rapports, Gamification, Configuration' as pages_accessibles;

-- Admin
SELECT 'Admin' as role,
       'Dashboard, Produits, Arrivage, Achat, Ventes, Retours, Inventaire, Utilisateurs, Magasins, Fournisseurs, Gestion Financière, Analytics, Rapports, Gamification' as pages_accessibles;

-- Manager
SELECT 'Manager' as role,
       'Dashboard, Produits, Arrivage, Ventes, Retours, Inventaire, Analytics, Rapports' as pages_accessibles;

-- Vendeur
SELECT 'Vendeur' as role,
       'Dashboard, Produits, Ventes, Retours' as pages_accessibles;

-- 5. Créer des données de test pour vérifier les statistiques
SELECT '=== CRÉATION DONNÉES DE TEST POUR STATISTIQUES ===' as info;

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
        -- Créer une vente de test pour aujourd'hui
        INSERT INTO sales (
            sale_code, store_id, payment_method, customer_name, customer_email, 
            customer_phone, subtotal, tax_amount, total_amount, notes, 
            sold_by, created_at, updated_at
        )
        VALUES (
            'V-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 7, '0'),
            test_store_id,
            'cash',
            'Client Test Permissions',
            'client.permissions@test.com',
            '+1234567890',
            5000,
            0,
            5000,
            'Vente de test pour vérifier les permissions',
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
                3,
                1667,
                5000
            );
        END IF;
        
        RAISE NOTICE '✅ Données de test créées pour vérifier les permissions';
    END IF;
END $$;

-- 6. Vérifier les statistiques après création
SELECT '=== VÉRIFICATION STATISTIQUES ===' as info;

-- Ventes du jour
SELECT 
    'Ventes du jour' as statistique,
    COUNT(*) as nombre_ventes,
    COALESCE(SUM(total_amount), 0) as chiffre_affaires
FROM sales 
WHERE DATE(created_at) = CURRENT_DATE;

-- Produits vendus ce mois
SELECT 
    'Produits vendus ce mois' as statistique,
    COALESCE(SUM(si.quantity), 0) as total_produits
FROM sales s
LEFT JOIN sale_items si ON s.id = si.sale_id
WHERE DATE(s.created_at) >= DATE_TRUNC('month', CURRENT_DATE);

SELECT '=== TEST DES PERMISSIONS TERMINÉ ===' as info; 