-- Script de nettoyage des fonctions en conflit GesFlex Pro
-- Ce script supprime toutes les fonctions get_store_inventory existantes

-- 1. Identifier toutes les fonctions get_store_inventory existantes
SELECT 
  'Fonctions get_store_inventory existantes :' as info,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prorettype::regtype as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'get_store_inventory'
ORDER BY p.oid;

-- 2. Supprimer toutes les fonctions get_store_inventory existantes
-- (PostgreSQL ne peut pas avoir plusieurs fonctions avec le même nom et des signatures différentes)
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN 
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
      AND p.proname = 'get_store_inventory'
  LOOP
    RAISE NOTICE 'Suppression de la fonction get_store_inventory(%)', func_record.args;
    EXECUTE 'DROP FUNCTION IF EXISTS get_store_inventory(' || func_record.args || ') CASCADE';
  END LOOP;
  
  RAISE NOTICE 'Toutes les fonctions get_store_inventory ont été supprimées';
END $$;

-- 3. Vérifier qu'aucune fonction get_store_inventory ne reste
SELECT 
  'Vérification post-nettoyage :' as info,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Aucune fonction get_store_inventory restante'
    ELSE '❌ Il reste ' || COUNT(*) || ' fonction(s) get_store_inventory'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'get_store_inventory';

-- 4. Message de confirmation
SELECT 
  'Nettoyage terminé !' as status,
  'Vous pouvez maintenant exécuter le script fix-existing-views.sql' as next_step;
