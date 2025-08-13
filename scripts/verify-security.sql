-- =====================================================
-- VERIFICATION SECURITY – POLICIES, FKs, FUNCTIONS
-- =====================================================

-- RLS activée ?
SELECT 'RLS_STATUS' AS kind, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename IN (
  'users','user_stores','stores','products','categories','purchases','purchase_items','sales','sale_items','expenses','system_settings'
)
ORDER BY tablename;

-- Politiques par table
SELECT 'POLICIES' AS kind, policyname, tablename, cmd, permissive
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN (
  'users','user_stores','stores','products','categories','purchases','purchase_items','sales','sale_items','expenses','system_settings'
)
ORDER BY tablename, policyname;

-- Fonctions critiques
SELECT 'FUNCTIONS' AS kind, p.proname, pg_get_functiondef(p.oid) LIKE '%SECURITY DEFINER%' AS is_security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN (
  'get_current_user_id','is_admin','is_superadmin','update_updated_at_column'
)
ORDER BY p.proname;

-- FKs clés (extrait)
SELECT 'FK' AS kind, conname, conrelid::regclass AS table_name, confrelid::regclass AS references_table
FROM pg_constraint
WHERE contype = 'f' AND conname IN (
  'user_stores_store_id_fkey',
  'user_stores_user_id_fkey',
  'sales_created_by_fkey'
)
ORDER BY conname;

-- Index utiles (extrait)
SELECT 'INDEX' AS kind, indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public' AND tablename IN ('users','user_stores','stores','sales','sale_items','expenses','system_settings')
ORDER BY tablename, indexname;

-- Test lecture configs (auth requis)
SELECT 'CONFIG_SAMPLE' AS kind, setting_key, setting_type
FROM system_settings
ORDER BY setting_key
LIMIT 10;


