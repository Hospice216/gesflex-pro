-- =====================================================
-- RESET COMPLET DE LA BASE (schéma public) - SUPABASE
-- ATTENTION: Ce script SUPPRIME TOUTES LES DONNÉES ET OBJETS DU SCHÉMA public.
-- Utilisation: Exécuter dans l'éditeur SQL Supabase avec un rôle service.
-- =====================================================

BEGIN;

-- 1) Désactiver les triggers pour accélérer les drops
SET session_replication_role = replica;

-- 2) Supprimer toutes les tables du schéma public (avec CASCADE)
DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP TABLE IF EXISTS %I.%I CASCADE;', r.schemaname, r.tablename);
  END LOOP;
END $$;

-- 3) Supprimer toutes les vues du schéma public
DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT schemaname, viewname
    FROM pg_views
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE;', r.schemaname, r.viewname);
  END LOOP;
END $$;

-- 4) Supprimer toutes les séquences du schéma public
DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT sequence_schema, sequence_name
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
  ) LOOP
    EXECUTE format('DROP SEQUENCE IF EXISTS %I.%I CASCADE;', r.sequence_schema, r.sequence_name);
  END LOOP;
END $$;

-- 5) Supprimer les fonctions définies par l'utilisateur dans public
DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT n.nspname AS schema_name,
           p.proname AS function_name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  ) LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE;', r.schema_name, r.function_name, r.args);
  END LOOP;
END $$;

-- 6) Supprimer les types ENUM personnalisés dans public
DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT n.nspname AS schema_name, t.typname AS type_name
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typtype = 'e' -- enum
  ) LOOP
    EXECUTE format('DROP TYPE IF EXISTS %I.%I CASCADE;', r.schema_name, r.type_name);
  END LOOP;
END $$;

-- 7) Réactiver les triggers
SET session_replication_role = DEFAULT;

COMMIT;

-- Vérification rapide
SELECT 'Tables restantes (public): ' || count(*) AS remaining_tables
FROM pg_tables WHERE schemaname = 'public';

SELECT 'Types ENUM restants (public): ' || count(*) AS remaining_enums
FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname='public' AND t.typtype='e';

SELECT 'Fonctions restantes (public): ' || count(*) AS remaining_functions
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public';

-- =====================================================
-- SCRIPT DE RÉINITIALISATION COMPLÈTE DE LA BASE DE DONNÉES
-- ATTENTION : Ce script supprime TOUTES les données !
-- =====================================================

-- Désactiver les triggers temporairement
SET session_replication_role = replica;

-- =====================================================
-- SUPPRIMER TOUTES LES TABLES (dans l'ordre des dépendances)
-- =====================================================

-- Tables de gamification
DROP TABLE IF EXISTS user_badges CASCADE;
DROP TABLE IF EXISTS user_trophies CASCADE;
DROP TABLE IF EXISTS points_history CASCADE;
DROP TABLE IF EXISTS user_points CASCADE;
DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS trophies CASCADE;

-- Tables de transferts
DROP TABLE IF EXISTS transfer_history CASCADE;
DROP TABLE IF EXISTS transfer_receptions CASCADE;
DROP TABLE IF EXISTS transfers CASCADE;

-- Tables de retours
DROP TABLE IF EXISTS return_items CASCADE;
DROP TABLE IF EXISTS returns CASCADE;

-- Tables de ventes
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- Tables d'arrivages et achats
DROP TABLE IF EXISTS purchase_history CASCADE;
DROP TABLE IF EXISTS arrivals CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;

-- Tables de produits
DROP TABLE IF EXISTS product_stores CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS units CASCADE;

-- Tables de magasins et fournisseurs
DROP TABLE IF EXISTS stores CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;

-- Tables d'utilisateurs
DROP TABLE IF EXISTS user_stores CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Tables de paramètres
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS currencies CASCADE;

-- =====================================================
-- SUPPRIMER TOUS LES TYPES PERSONNALISÉS
-- =====================================================

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS validation_status CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS return_status CASCADE;
DROP TYPE IF EXISTS gamification_type CASCADE;

-- =====================================================
-- SUPPRIMER TOUTES LES FONCTIONS
-- =====================================================

-- Fonctions de base
DROP FUNCTION IF EXISTS generate_unique_code(TEXT) CASCADE;
DROP FUNCTION IF EXISTS generate_sku(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_current_user_id() CASCADE;
DROP FUNCTION IF EXISTS is_superadmin() CASCADE;
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS get_user_stores() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Fonctions de gestion des utilisateurs
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS assign_admin_to_all_stores() CASCADE;
DROP FUNCTION IF EXISTS create_superadmin(TEXT, TEXT, TEXT) CASCADE;

-- Fonctions de gestion des magasins
DROP FUNCTION IF EXISTS generate_store_code() CASCADE;
DROP FUNCTION IF EXISTS get_user_accessible_stores(UUID) CASCADE;
DROP FUNCTION IF EXISTS assign_user_to_store(UUID, UUID, BOOLEAN) CASCADE;

-- Fonctions de gestion des produits
DROP FUNCTION IF EXISTS generate_product_sku() CASCADE;
DROP FUNCTION IF EXISTS validate_product_prices() CASCADE;
DROP FUNCTION IF EXISTS get_store_products(UUID) CASCADE;
DROP FUNCTION IF EXISTS assign_product_to_store(UUID, UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS update_product_stock(UUID, UUID, INTEGER) CASCADE;

-- Fonctions de gestion des achats
DROP FUNCTION IF EXISTS generate_purchase_code() CASCADE;
DROP FUNCTION IF EXISTS calculate_purchase_total() CASCADE;
DROP FUNCTION IF EXISTS prevent_purchase_modification_after_validation() CASCADE;
DROP FUNCTION IF EXISTS handle_arrival_validation() CASCADE;
DROP FUNCTION IF EXISTS log_purchase_history() CASCADE;
DROP FUNCTION IF EXISTS get_pending_purchases(UUID) CASCADE;
DROP FUNCTION IF EXISTS validate_arrival(UUID, INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_arrivals_history(UUID) CASCADE;

-- Fonctions de gestion des ventes
DROP FUNCTION IF EXISTS generate_sale_code() CASCADE;
DROP FUNCTION IF EXISTS calculate_sale_total() CASCADE;
DROP FUNCTION IF EXISTS calculate_sale_item_total() CASCADE;
DROP FUNCTION IF EXISTS validate_sale_prices() CASCADE;
DROP FUNCTION IF EXISTS update_stock_on_sale() CASCADE;
DROP FUNCTION IF EXISTS generate_return_code() CASCADE;
DROP FUNCTION IF EXISTS calculate_exchange_difference() CASCADE;
DROP FUNCTION IF EXISTS create_sale(UUID, JSONB, payment_method, JSONB, TEXT) CASCADE;
DROP FUNCTION IF EXISTS create_return(TEXT, JSONB, JSONB, TEXT) CASCADE;

-- Fonctions de gestion des transferts
DROP FUNCTION IF EXISTS generate_transfer_code() CASCADE;
DROP FUNCTION IF EXISTS prevent_transfer_modification_after_validation() CASCADE;
DROP FUNCTION IF EXISTS handle_transfer_reception() CASCADE;
DROP FUNCTION IF EXISTS log_transfer_history() CASCADE;
DROP FUNCTION IF EXISTS get_pending_transfers(UUID) CASCADE;
DROP FUNCTION IF EXISTS validate_transfer_reception(UUID, INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_transfers_history(UUID) CASCADE;
DROP FUNCTION IF EXISTS create_transfer(UUID, UUID, UUID, INTEGER, DATE, TEXT) CASCADE;

-- Fonctions de gamification
DROP FUNCTION IF EXISTS create_user_points_record() CASCADE;
DROP FUNCTION IF EXISTS calculate_user_level(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS award_points_manually(UUID, INTEGER, TEXT) CASCADE;

-- Fonctions de paramètres système
DROP FUNCTION IF EXISTS ensure_single_default_currency() CASCADE;
DROP FUNCTION IF EXISTS get_system_setting(TEXT) CASCADE;
DROP FUNCTION IF EXISTS set_system_setting(TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS get_default_currency() CASCADE;
DROP FUNCTION IF EXISTS format_currency(DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS get_settings_by_category(TEXT) CASCADE;

-- Fonctions de sécurité et maintenance
DROP FUNCTION IF EXISTS create_initial_superadmin(TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS can_access_store(UUID) CASCADE;
DROP FUNCTION IF EXISTS can_modify_data() CASCADE;
DROP FUNCTION IF EXISTS can_delete_data() CASCADE;
DROP FUNCTION IF EXISTS cleanup_orphaned_data() CASCADE;
DROP FUNCTION IF EXISTS get_system_stats() CASCADE;
DROP FUNCTION IF EXISTS validate_data_integrity() CASCADE;
DROP FUNCTION IF EXISTS get_user_performance_report(DATE, DATE) CASCADE;

-- =====================================================
-- SUPPRIMER TOUS LES TRIGGERS
-- =====================================================

-- Les triggers sont automatiquement supprimés avec les tables
-- mais on peut les supprimer explicitement si nécessaire

-- =====================================================
-- SUPPRIMER TOUS LES INDEX
-- =====================================================

-- Les index sont automatiquement supprimés avec les tables

-- =====================================================
-- SUPPRIMER TOUTES LES POLITIQUES RLS
-- =====================================================

-- Les politiques RLS sont automatiquement supprimées avec les tables

-- =====================================================
-- RÉACTIVER LES TRIGGERS
-- =====================================================

SET session_replication_role = DEFAULT;

-- =====================================================
-- MESSAGE DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'BASE DE DONNÉES COMPLÈTEMENT VIDÉE';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '✅ Toutes les tables supprimées';
    RAISE NOTICE '✅ Tous les types supprimés';
    RAISE NOTICE '✅ Toutes les fonctions supprimées';
    RAISE NOTICE '✅ Tous les triggers supprimés';
    RAISE NOTICE '✅ Toutes les politiques RLS supprimées';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Base de données prête pour les nouvelles migrations!';
    RAISE NOTICE '=====================================================';
END $$; 