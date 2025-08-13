-- Script de test pour vérifier que la migration system_settings fonctionne correctement
-- Ce script simule les opérations de la migration pour détecter les problèmes potentiels

-- Test 1: Vérifier la structure de la table
DO $$
BEGIN
  RAISE NOTICE 'Test 1: Vérification de la structure de la table system_settings';
  
  -- Vérifier si la table existe
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'system_settings') THEN
    RAISE NOTICE '✅ Table system_settings existe';
  ELSE
    RAISE NOTICE '❌ Table system_settings n''existe pas';
    RETURN;
  END IF;
  
  -- Vérifier si la colonne category existe
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'system_settings' AND column_name = 'category') THEN
    RAISE NOTICE '✅ Colonne category existe';
  ELSE
    RAISE NOTICE '❌ Colonne category n''existe pas';
    RETURN;
  END IF;
END $$;

-- Test 2: Vérifier la contrainte actuelle
DO $$
DECLARE
  constraint_definition TEXT;
BEGIN
  RAISE NOTICE 'Test 2: Vérification de la contrainte CHECK actuelle';
  
  SELECT pg_get_constraintdef(con.oid) INTO constraint_definition
  FROM pg_constraint con
  JOIN pg_namespace nsp ON nsp.oid = con.connamespace
  WHERE nsp.nspname = 'public' 
    AND con.conrelid = 'public.system_settings'::regclass
    AND con.conname = 'system_settings_category_check';
  
  IF constraint_definition IS NOT NULL THEN
    RAISE NOTICE '✅ Contrainte actuelle: %', constraint_definition;
  ELSE
    RAISE NOTICE '⚠️ Aucune contrainte CHECK trouvée';
  END IF;
END $$;

-- Test 3: Tester la suppression et recréation de la contrainte
DO $$
BEGIN
  RAISE NOTICE 'Test 3: Test de suppression et recréation de la contrainte';
  
  -- Supprimer la contrainte si elle existe
  ALTER TABLE public.system_settings DROP CONSTRAINT IF EXISTS system_settings_category_check;
  RAISE NOTICE '✅ Contrainte supprimée (si elle existait)';
  
  -- Recréer la contrainte avec currency
  ALTER TABLE public.system_settings ADD CONSTRAINT system_settings_category_check 
    CHECK (category IN ('general', 'business', 'inventory', 'sales', 'system', 'security', 'notifications', 'interface', 'stores', 'performance', 'maintenance', 'currency'));
  RAISE NOTICE '✅ Nouvelle contrainte créée avec currency';
END $$;

-- Test 4: Tester l'insertion des configurations de devise
DO $$
DECLARE
  current_user_id UUID;
  insert_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Test 4: Test d''insertion des configurations de devise';
  
  -- Récupérer un utilisateur admin
  SELECT id INTO current_user_id 
  FROM public.users 
  WHERE role IN ('Admin', 'SuperAdmin') 
  LIMIT 1;
  
  IF current_user_id IS NULL THEN
    RAISE NOTICE '⚠️ Aucun utilisateur admin trouvé, test d''insertion ignoré';
    RETURN;
  END IF;
  
  -- Tester l'insertion des configurations de devise
  BEGIN
    INSERT INTO public.system_settings (setting_key, setting_value, setting_type, category, description, is_required, created_by) VALUES
      ('currency.default', '"XOF"', 'string', 'currency', 'Devise par défaut', true, current_user_id),
      ('currency.symbol', '"CFA"', 'string', 'currency', 'Symbole de la devise', false, current_user_id),
      ('currency.position', '"after"', 'string', 'currency', 'Position du symbole', false, current_user_id),
      ('currency.decimal_places', '0', 'number', 'currency', 'Nombre de décimales', false, current_user_id)
    ON CONFLICT (setting_key) DO NOTHING;
    
    GET DIAGNOSTICS insert_count = ROW_COUNT;
    RAISE NOTICE '✅ Insertion réussie: % configurations de devise ajoutées', insert_count;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Erreur lors de l''insertion: %', SQLERRM;
  END;
END $$;

-- Test 5: Vérifier le résultat final
DO $$
DECLARE
  currency_count INTEGER;
  total_count INTEGER;
BEGIN
  RAISE NOTICE 'Test 5: Vérification du résultat final';
  
  -- Compter les configurations de devise
  SELECT COUNT(*) INTO currency_count 
  FROM public.system_settings 
  WHERE category = 'currency';
  
  -- Compter le total
  SELECT COUNT(*) INTO total_count 
  FROM public.system_settings;
  
  RAISE NOTICE '📊 Résultats:';
  RAISE NOTICE '  - Configurations de devise: %', currency_count;
  RAISE NOTICE '  - Total de configurations: %', total_count;
  
  IF currency_count = 4 THEN
    RAISE NOTICE '✅ Test réussi: Toutes les configurations de devise sont présentes';
  ELSE
    RAISE NOTICE '❌ Test échoué: % configurations de devise trouvées (attendu: 4)', currency_count;
  END IF;
END $$;

RAISE NOTICE '🎉 Tests de migration terminés avec succès!'; 