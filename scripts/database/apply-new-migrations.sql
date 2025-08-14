-- =====================================================
-- SCRIPT D'APPLICATION DES NOUVELLES MIGRATIONS
-- =====================================================

-- Exécuter les migrations dans l'ordre
\i supabase/migrations/20250127000001-base-setup.sql
\i supabase/migrations/20250127000002-auth-users.sql
\i supabase/migrations/20250127000003-stores-suppliers.sql
\i supabase/migrations/20250127000004-products-categories.sql
\i supabase/migrations/20250127000005-purchases-arrivals.sql
\i supabase/migrations/20250127000006-sales-returns.sql
\i supabase/migrations/20250127000007-transfers.sql
\i supabase/migrations/20250127000008-gamification.sql
\i supabase/migrations/20250127000009-settings.sql
\i supabase/migrations/20250127000010-final-rls-policies.sql

-- Créer le SuperAdmin initial (remplacez par vos informations)
-- SELECT create_initial_superadmin('votre@email.com', 'Prénom', 'Nom');

-- Vérifier l'intégrité
SELECT * FROM validate_data_integrity(); 