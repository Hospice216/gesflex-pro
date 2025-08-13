-- =====================================================
-- Vérification des relations/FKs clés
-- =====================================================

SELECT 'FK' AS kind, conname,
       conrelid::regclass AS table_name,
       confrelid::regclass AS ref_table,
       pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype = 'f' AND (
      conname ILIKE '%user_stores%'
   OR conname ILIKE '%sales_created_by_fkey%'
   OR conname ILIKE '%store_id%'
)
ORDER BY table_name, conname;


