-- 🗑️ Script de Sauvegarde + Vidage de la Base de Données
-- 📦 Crée une sauvegarde avant de tout effacer

-- 1. Créer une sauvegarde des données importantes
CREATE TABLE IF NOT EXISTS backup_sales AS SELECT * FROM sales;
CREATE TABLE IF NOT EXISTS backup_products AS SELECT * FROM products;
CREATE TABLE IF NOT EXISTS backup_users AS SELECT * FROM users;
CREATE TABLE IF NOT EXISTS backup_stores AS SELECT * FROM stores;

-- 2. Désactiver les triggers
SET session_replication_role = replica;

-- 3. Vider les tables principales
TRUNCATE TABLE sales CASCADE;
TRUNCATE TABLE returns CASCADE;
TRUNCATE TABLE transfers CASCADE;
TRUNCATE TABLE arrivals CASCADE;
TRUNCATE TABLE purchases CASCADE;
TRUNCATE TABLE stock_movements CASCADE;
TRUNCATE TABLE stock_alerts CASCADE;
TRUNCATE TABLE inventory_items CASCADE;
TRUNCATE TABLE products CASCADE;
TRUNCATE TABLE categories CASCADE;
TRUNCATE TABLE user_stores CASCADE;
TRUNCATE TABLE store_permissions CASCADE;

-- 4. Supprimer les utilisateurs (sauf SuperAdmin)
DELETE FROM users WHERE role != 'SuperAdmin';

-- 5. Supprimer les magasins (sauf le principal)
DELETE FROM stores WHERE id != (SELECT id FROM stores LIMIT 1);

-- 6. Réactiver les triggers
SET session_replication_role = DEFAULT;

-- 7. Vérifier le résultat
SELECT 
    'sales' as table_name, COUNT(*) as count FROM sales
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'stores', COUNT(*) FROM stores;

-- 8. Informations sur la sauvegarde
SELECT 
    'backup_sales' as backup_table, COUNT(*) as count FROM backup_sales
UNION ALL
SELECT 'backup_products', COUNT(*) FROM backup_products
UNION ALL
SELECT 'backup_users', COUNT(*) FROM backup_users
UNION ALL
SELECT 'backup_stores', COUNT(*) FROM backup_stores;

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE '📦 Sauvegarde créée dans les tables backup_*';
    RAISE NOTICE '🗑️ Base de données vidée avec succès !';
    RAISE NOTICE '✅ Toutes les données ont été supprimées';
    RAISE NOTICE '🔒 L''utilisateur SuperAdmin et le magasin principal sont conservés';
    RAISE NOTICE '💾 Pour restaurer : DROP TABLE backup_* puis INSERT FROM backup_*';
END $$;
