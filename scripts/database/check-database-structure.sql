-- 🔍 Script de Vérification de la Structure de la Base de Données
-- 📋 Vérifie quelles tables existent réellement avant de les supprimer

-- 1. Lister toutes les tables existantes dans le schéma public
SELECT 
    'Tables existantes' as info_type,
    tablename as table_name,
    schemaname as schema_name
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Vérifier les tables spécifiques mentionnées dans les scripts de nettoyage
SELECT 
    'Vérification tables de nettoyage' as info_type,
    tablename as table_name,
    CASE 
        WHEN tablename IN ('sales', 'returns', 'transfers', 'arrivals', 'purchases') THEN '✅ Table de transactions'
        WHEN tablename IN ('stock_movements', 'stock_alerts', 'inventory_items') THEN '✅ Table de gestion des stocks'
        WHEN tablename IN ('products', 'categories') THEN '✅ Table de produits et catégories'
        WHEN tablename IN ('user_stores', 'store_permissions') THEN '✅ Table de gestion des magasins'
        WHEN tablename IN ('users', 'stores') THEN '✅ Table d''utilisateurs et magasins'
        WHEN tablename IN ('app_settings', 'notifications', 'audit_logs') THEN '✅ Table de configuration'
        ELSE '❓ Table non classée'
    END as classification
FROM pg_tables 
WHERE schemaname = 'public'
    AND tablename IN (
        'sales', 'returns', 'transfers', 'arrivals', 'purchases',
        'stock_movements', 'stock_alerts', 'inventory_items',
        'products', 'categories', 'user_stores', 'store_permissions',
        'users', 'stores', 'app_settings', 'notifications', 'audit_logs'
    )
ORDER BY tablename;

-- 3. Compter les enregistrements dans chaque table existante
SELECT 
    'Comptage des données' as info_type,
    schemaname,
    tablename,
    (SELECT COUNT(*) FROM information_schema.tables t2 
     WHERE t2.table_schema = t1.schemaname AND t2.table_name = t1.tablename) as table_exists,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables t2 
                    WHERE t2.table_schema = t1.schemaname AND t2.table_name = t1.tablename)
        THEN (SELECT COUNT(*) FROM (SELECT 1 FROM ONLY t1.tablename::regclass LIMIT 1) t)
        ELSE 0
    END as record_count
FROM pg_tables t1
WHERE schemaname = 'public'
    AND tablename IN (
        'sales', 'returns', 'transfers', 'arrivals', 'purchases',
        'stock_movements', 'stock_alerts', 'inventory_items',
        'products', 'categories', 'user_stores', 'store_permissions',
        'users', 'stores', 'app_settings', 'notifications', 'audit_logs'
    )
ORDER BY tablename;

-- 4. Vérifier les séquences d'ID
SELECT 
    'Séquences d''ID' as info_type,
    sequence_name,
    data_type,
    start_value,
    last_value
FROM information_schema.sequences 
WHERE sequence_schema = 'public'
    AND sequence_name LIKE '%_id_seq'
ORDER BY sequence_name;

-- 5. Vérifier les triggers existants
SELECT 
    'Triggers existants' as info_type,
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 6. Message de diagnostic
DO $$
DECLARE
    table_count integer;
    missing_tables text[];
BEGIN
    -- Compter les tables existantes
    SELECT COUNT(*) INTO table_count
    FROM pg_tables 
    WHERE schemaname = 'public';
    
    -- Identifier les tables manquantes
    SELECT array_agg(tablename) INTO missing_tables
    FROM (
        SELECT unnest(ARRAY['sales', 'returns', 'transfers', 'arrivals', 'purchases',
                           'stock_movements', 'stock_alerts', 'inventory_items',
                           'products', 'categories', 'user_stores', 'store_permissions',
                           'users', 'stores', 'app_settings', 'notifications', 'audit_logs']) as tablename
    ) t
    WHERE NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = t.tablename
    );
    
    RAISE NOTICE '🔍 Diagnostic de la base de données terminé !';
    RAISE NOTICE '📊 Nombre total de tables: %', table_count;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE NOTICE '⚠️ Tables manquantes: %', array_to_string(missing_tables, ', ');
        RAISE NOTICE '💡 Certaines tables mentionnées dans les scripts de nettoyage n''existent pas';
    ELSE
        RAISE NOTICE '✅ Toutes les tables attendues sont présentes';
    END IF;
    
    RAISE NOTICE '📋 Utilisez ces informations pour adapter vos scripts de nettoyage';
END $$;
