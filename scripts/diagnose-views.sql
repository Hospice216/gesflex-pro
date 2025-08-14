-- Script de diagnostic pour identifier les conflits de vues GesFlex Pro
-- Exécutez ce script AVANT de corriger les vues

-- 1. Vérifier les vues existantes
SELECT 
  'Vues existantes dans la base de données :' as info,
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%view%'
ORDER BY table_name;

-- 2. Vérifier la structure de low_stock_products_view si elle existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'low_stock_products_view') THEN
    RAISE NOTICE 'Vue low_stock_products_view existe - Vérification de la structure...';
  ELSE
    RAISE NOTICE 'Vue low_stock_products_view N''EXISTE PAS';
  END IF;
END $$;

-- 3. Vérifier la structure de sales_stats_daily_view si elle existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'sales_stats_daily_view') THEN
    RAISE NOTICE 'Vue sales_stats_daily_view existe - Vérification de la structure...';
  ELSE
    RAISE NOTICE 'Vue sales_stats_daily_view N''EXISTE PAS';
  END IF;
END $$;

-- 4. Vérifier les fonctions existantes
SELECT 
  'Fonctions existantes :' as info,
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%inventory%'
ORDER BY routine_name;

-- 5. Vérifier les tables de base nécessaires
SELECT 
  'Tables de base nécessaires :' as info,
  t.table_name,
  CASE 
    WHEN it.table_name IS NOT NULL THEN '✅ Existe'
    ELSE '❌ Manquante'
  END as status
FROM (
  SELECT 'products' as table_name
  UNION SELECT 'categories'
  UNION SELECT 'units'
  UNION SELECT 'product_stores'
  UNION SELECT 'stores'
  UNION SELECT 'sales'
) t
LEFT JOIN information_schema.tables it ON it.table_name = t.table_name AND it.table_schema = 'public';

-- 6. Vérifier les colonnes clés de la table products
SELECT 
  'Colonnes de la table products :' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND table_schema = 'public'
  AND column_name IN ('id', 'name', 'sku', 'alert_stock', 'is_active')
ORDER BY column_name;

-- 7. Vérifier les colonnes clés de la table product_stores
SELECT 
  'Colonnes de la table product_stores :' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'product_stores' 
  AND table_schema = 'public'
  AND column_name IN ('product_id', 'store_id', 'current_stock', 'min_stock', 'max_stock')
ORDER BY column_name;

-- 8. Vérifier les colonnes clés de la table sales
SELECT 
  'Colonnes de la table sales :' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'sales' 
  AND table_schema = 'public'
  AND column_name IN ('id', 'store_id', 'sold_at', 'total_amount', 'customer_id')
ORDER BY column_name;

-- 9. Résumé des problèmes potentiels
SELECT 
  'Résumé du diagnostic :' as info,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'low_stock_products_view') 
    THEN 'Vue low_stock_products_view existe (peut avoir des conflits de colonnes)'
    ELSE 'Vue low_stock_products_view manquante'
  END as low_stock_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'sales_stats_daily_view') 
    THEN 'Vue sales_stats_daily_view existe (peut avoir des conflits de colonnes)'
    ELSE 'Vue sales_stats_daily_view manquante'
  END as sales_stats_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_store_inventory') 
    THEN 'Fonction get_store_inventory existe'
    ELSE 'Fonction get_store_inventory manquante'
  END as function_status;

-- 10. Recommandations
SELECT 
  'Recommandations :' as info,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'low_stock_products_view') 
    THEN 'Utiliser le script fix-existing-views.sql pour corriger les conflits'
    ELSE 'Utiliser le script apply-optimized-views.sql pour créer les vues'
  END as action_required;
