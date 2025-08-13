-- =====================================================
-- DIAGNOSTIC COMPLET DES RELATIONS MANQUANTES
-- =====================================================

-- 1. Vérifier toutes les tables existantes
SELECT 
    'Tables existantes' as diagnostic_type,
    table_name,
    'OK' as status
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Vérifier toutes les contraintes de clé étrangère
SELECT 
    'Contraintes de clé étrangère' as diagnostic_type,
    tc.table_name,
    kcu.column_name,
    tc.constraint_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    CASE 
        WHEN tc.constraint_name IS NOT NULL THEN 'OK'
        ELSE 'MANQUANTE'
    END as status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, kcu.column_name;

-- 3. Vérifier spécifiquement les relations problématiques
-- Relation user_stores - stores
SELECT 
    'Relation user_stores - stores' as relation_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'user_stores' 
            AND constraint_name = 'user_stores_store_id_fkey'
        ) THEN 'OK'
        ELSE 'MANQUANTE'
    END as status;

-- Relation sales - users
SELECT 
    'Relation sales - users' as relation_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'sales' 
            AND constraint_name = 'sales_created_by_fkey'
        ) THEN 'OK'
        ELSE 'MANQUANTE'
    END as status;

-- Relation expenses - stores
SELECT 
    'Relation expenses - stores' as relation_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'expenses' 
            AND constraint_name = 'expenses_store_id_fkey'
        ) THEN 'OK'
        ELSE 'MANQUANTE'
    END as status;

-- 4. Vérifier les colonnes qui devraient avoir des contraintes de clé étrangère
SELECT 
    'Colonnes sans contraintes FK' as diagnostic_type,
    t.table_name,
    c.column_name,
    c.data_type,
    'POTENTIELLEMENT MANQUANTE' as status
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
AND c.column_name LIKE '%_id'
AND c.column_name != 'id'
AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = t.table_name 
    AND kcu.column_name = c.column_name
    AND tc.constraint_type = 'FOREIGN KEY'
)
ORDER BY t.table_name, c.column_name;

-- 5. Vérifier les données de test
SELECT 
    'Données de test' as diagnostic_type,
    'users' as table_name,
    COUNT(*) as record_count,
    CASE 
        WHEN COUNT(*) > 0 THEN 'OK'
        ELSE 'VIDE'
    END as status
FROM users
UNION ALL
SELECT 
    'Données de test' as diagnostic_type,
    'stores' as table_name,
    COUNT(*) as record_count,
    CASE 
        WHEN COUNT(*) > 0 THEN 'OK'
        ELSE 'VIDE'
    END as status
FROM stores
UNION ALL
SELECT 
    'Données de test' as diagnostic_type,
    'sales' as table_name,
    COUNT(*) as record_count,
    CASE 
        WHEN COUNT(*) > 0 THEN 'OK'
        ELSE 'VIDE'
    END as status
FROM sales
UNION ALL
SELECT 
    'Données de test' as diagnostic_type,
    'expenses' as table_name,
    COUNT(*) as record_count,
    CASE 
        WHEN COUNT(*) > 0 THEN 'OK'
        ELSE 'VIDE'
    END as status
FROM expenses;

-- 6. Vérifier les permissions RLS
SELECT 
    'Permissions RLS' as diagnostic_type,
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity = true THEN 'ACTIVÉ'
        ELSE 'DÉSACTIVÉ'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 7. Résumé des problèmes détectés
SELECT 
    'RÉSUMÉ DES PROBLÈMES' as diagnostic_type,
    'Relations manquantes détectées' as probleme,
    COUNT(*) as nombre_problemes
FROM (
    SELECT 'user_stores_store_id_fkey' as constraint_name
    WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_stores_store_id_fkey'
    )
    UNION ALL
    SELECT 'sales_created_by_fkey' as constraint_name
    WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sales_created_by_fkey'
    )
    UNION ALL
    SELECT 'expenses_store_id_fkey' as constraint_name
    WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'expenses_store_id_fkey'
    )
) as problemes;
