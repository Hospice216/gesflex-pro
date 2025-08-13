-- =====================================================
-- TEST DES FONCTIONNALITÉS DE LA PAGE CONFIGURATION
-- Vérification complète du système
-- =====================================================

-- 1. VÉRIFIER L'EXISTENCE DE LA TABLE
SELECT 
    'VÉRIFICATION TABLE' as test_type,
    table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'system_settings' 
            AND table_schema = 'public'
        ) THEN '✅ EXISTE'
        ELSE '❌ MANQUANTE'
    END as status
FROM (VALUES ('system_settings')) as tables(table_name);

-- 2. VÉRIFIER LA STRUCTURE DE LA TABLE
SELECT 
    'STRUCTURE TABLE' as test_type,
    column_name,
    data_type,
    is_nullable,
    CASE 
        WHEN column_name IN ('setting_key', 'setting_value', 'setting_type', 'category') THEN '✅ REQUIS'
        ELSE 'ℹ️ OPTIONNEL'
    END as importance
FROM information_schema.columns 
WHERE table_name = 'system_settings'
ORDER BY ordinal_position;

-- 3. VÉRIFIER LES CONTRAINTES
SELECT 
    'CONTRAINTES' as test_type,
    constraint_name,
    check_clause,
    CASE 
        WHEN constraint_name LIKE '%category%' THEN '✅ CRITIQUE'
        WHEN constraint_name LIKE '%type%' THEN '✅ IMPORTANT'
        ELSE 'ℹ️ STANDARD'
    END as importance
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%system_settings%';

-- 4. VÉRIFIER LES CONFIGURATIONS REQUISES
SELECT 
    'CONFIGURATIONS REQUISES' as test_type,
    setting_key,
    setting_value,
    setting_type,
    category,
    CASE 
        WHEN setting_key LIKE 'stores.%' THEN '✅ STORES'
        WHEN setting_key LIKE 'system.%' THEN '✅ SYSTEM'
        WHEN setting_key LIKE 'performance.%' THEN '✅ PERFORMANCE'
        WHEN setting_key LIKE 'maintenance.%' THEN '✅ MAINTENANCE'
        WHEN setting_key LIKE 'currency.%' THEN '✅ CURRENCY'
        ELSE '❓ AUTRE'
    END as section
FROM system_settings
WHERE setting_key LIKE 'stores.%' 
   OR setting_key LIKE 'system.%' 
   OR setting_key LIKE 'performance.%' 
   OR setting_key LIKE 'maintenance.%' 
   OR setting_key LIKE 'currency.%'
ORDER BY setting_key;

-- 5. VÉRIFIER LES PERMISSIONS RLS
SELECT 
    'PERMISSIONS RLS' as test_type,
    tablename,
    CASE 
        WHEN rowsecurity = true THEN '✅ ACTIVÉ'
        ELSE '❌ DÉSACTIVÉ'
    END as rls_status
FROM pg_tables 
WHERE tablename = 'system_settings';

-- 6. VÉRIFIER LES POLITIQUES RLS
SELECT 
    'POLITIQUES RLS' as test_type,
    policyname,
    cmd,
    CASE 
        WHEN policyname LIKE '%SuperAdmin%' THEN '✅ SUPERADMIN'
        WHEN policyname LIKE '%Admin%' THEN '✅ ADMIN'
        WHEN policyname LIKE '%Users%' THEN '✅ USERS'
        ELSE '❓ AUTRE'
    END as policy_type
FROM pg_policies 
WHERE tablename = 'system_settings'
ORDER BY policyname;

-- 7. TEST D'INSERTION DE CONFIGURATION
DO $$
DECLARE
    test_setting_id UUID;
    test_user_id UUID;
BEGIN
    -- Récupérer un utilisateur de test
    SELECT id INTO test_user_id FROM users LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE '❌ Aucun utilisateur trouvé pour les tests';
        RETURN;
    END IF;
    
    -- Test d'insertion d'une configuration
    INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, created_by)
    VALUES ('test.configuration', 'test_value', 'string', 'general', 'Configuration de test', test_user_id)
    RETURNING id INTO test_setting_id;
    
    IF test_setting_id IS NOT NULL THEN
        RAISE NOTICE '✅ Test insertion configuration: SUCCÈS';
    ELSE
        RAISE NOTICE '❌ Test insertion configuration: ÉCHEC';
    END IF;
    
    -- Nettoyer la configuration de test
    DELETE FROM system_settings WHERE id = test_setting_id;
    RAISE NOTICE '🧹 Configuration de test nettoyée';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Erreur lors du test d''insertion: %', SQLERRM;
END $$;

-- 8. TEST DE MODIFICATION DE CONFIGURATION
DO $$
DECLARE
    test_setting_id UUID;
    old_value TEXT;
    new_value TEXT;
BEGIN
    -- Sélectionner une configuration existante
    SELECT id, setting_value INTO test_setting_id, old_value 
    FROM system_settings 
    WHERE setting_key = 'stores.enable_transfers'
    LIMIT 1;
    
    IF test_setting_id IS NULL THEN
        RAISE NOTICE '❌ Configuration stores.enable_transfers non trouvée';
        RETURN;
    END IF;
    
    -- Modifier la valeur
    UPDATE system_settings 
    SET setting_value = CASE WHEN setting_value = 'true' THEN 'false' ELSE 'true' END,
        updated_at = NOW()
    WHERE id = test_setting_id
    RETURNING setting_value INTO new_value;
    
    IF new_value IS NOT NULL THEN
        RAISE NOTICE '✅ Test modification configuration: SUCCÈS (ancienne: %, nouvelle: %)', old_value, new_value;
    ELSE
        RAISE NOTICE '❌ Test modification configuration: ÉCHEC';
    END IF;
    
    -- Restaurer la valeur originale
    UPDATE system_settings 
    SET setting_value = old_value,
        updated_at = NOW()
    WHERE id = test_setting_id;
    RAISE NOTICE '🔄 Valeur restaurée';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Erreur lors du test de modification: %', SQLERRM;
END $$;

-- 9. TEST DES REQUÊTES DE LA PAGE CONFIGURATION
DO $$
DECLARE
    stores_count INTEGER;
    system_count INTEGER;
    performance_count INTEGER;
    maintenance_count INTEGER;
    currency_count INTEGER;
BEGIN
    -- Test de la requête des configurations stores
    SELECT COUNT(*) INTO stores_count 
    FROM system_settings 
    WHERE setting_key LIKE 'stores.%';
    RAISE NOTICE '✅ Configurations stores: %', stores_count;
    
    -- Test de la requête des configurations system
    SELECT COUNT(*) INTO system_count 
    FROM system_settings 
    WHERE setting_key LIKE 'system.%';
    RAISE NOTICE '✅ Configurations system: %', system_count;
    
    -- Test de la requête des configurations performance
    SELECT COUNT(*) INTO performance_count 
    FROM system_settings 
    WHERE setting_key LIKE 'performance.%';
    RAISE NOTICE '✅ Configurations performance: %', performance_count;
    
    -- Test de la requête des configurations maintenance
    SELECT COUNT(*) INTO maintenance_count 
    FROM system_settings 
    WHERE setting_key LIKE 'maintenance.%';
    RAISE NOTICE '✅ Configurations maintenance: %', maintenance_count;
    
    -- Test de la requête des configurations currency
    SELECT COUNT(*) INTO currency_count 
    FROM system_settings 
    WHERE setting_key LIKE 'currency.%';
    RAISE NOTICE '✅ Configurations currency: %', currency_count;
    
    -- Vérifier que toutes les sections ont des configurations
    IF stores_count > 0 AND system_count > 0 AND performance_count > 0 AND maintenance_count > 0 AND currency_count > 0 THEN
        RAISE NOTICE '✅ Toutes les sections ont des configurations';
    ELSE
        RAISE NOTICE '❌ Certaines sections manquent de configurations';
    END IF;
    
END $$;

-- 10. VÉRIFICATION DES TYPES DE DONNÉES
SELECT 
    'TYPES DE DONNÉES' as test_type,
    setting_type,
    COUNT(*) as count,
    CASE 
        WHEN setting_type IN ('string', 'number', 'boolean', 'json') THEN '✅ VALIDE'
        ELSE '❌ INVALIDE'
    END as status
FROM system_settings
GROUP BY setting_type
ORDER BY setting_type;

-- 11. VÉRIFICATION DES CATÉGORIES
SELECT 
    'CATÉGORIES' as test_type,
    category,
    COUNT(*) as count,
    CASE 
        WHEN category IN ('stores', 'system', 'performance', 'maintenance', 'currency', 'general') THEN '✅ VALIDE'
        ELSE '❌ INVALIDE'
    END as status
FROM system_settings
GROUP BY category
ORDER BY category;

-- 12. VÉRIFICATION FINALE
SELECT 
    'RÉSUMÉ DES TESTS' as test_type,
    'Configurations totales' as check_item,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) >= 15 THEN '✅ COMPLET'
        ELSE '❌ INCOMPLET'
    END as status
FROM system_settings
WHERE setting_key LIKE 'stores.%' 
   OR setting_key LIKE 'system.%' 
   OR setting_key LIKE 'performance.%' 
   OR setting_key LIKE 'maintenance.%' 
   OR setting_key LIKE 'currency.%';

-- 13. RECOMMANDATIONS
SELECT 
    'RECOMMANDATIONS' as test_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM system_settings 
            WHERE setting_key LIKE 'stores.%' 
               OR setting_key LIKE 'system.%' 
               OR setting_key LIKE 'performance.%' 
               OR setting_key LIKE 'maintenance.%' 
               OR setting_key LIKE 'currency.%'
        ) AND EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'system_settings'
        ) THEN '✅ Page Configuration prête à utiliser'
        ELSE '❌ Page Configuration nécessite des corrections'
    END as recommendation;
