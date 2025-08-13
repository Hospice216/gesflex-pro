-- =====================================================
-- DIAGNOSTIC DES PROBLÈMES D'ENCODAGE
-- =====================================================

-- Vérifier l'encodage de la base de données
SELECT 
    'Database Encoding' as check_type,
    pg_encoding_to_char(encoding) as encoding,
    datcollate as collation,
    datctype as ctype
FROM pg_database 
WHERE datname = current_database();

-- Vérifier les tables avec des caractères suspects
SELECT 
    'Tables with potential encoding issues' as check_type,
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename LIKE '%%';

-- Vérifier les colonnes avec des caractères suspects
SELECT 
    'Columns with potential encoding issues' as check_type,
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public'
AND (column_name LIKE '%%' OR table_name LIKE '%%');

-- Vérifier les contraintes avec des caractères suspects
SELECT 
    'Constraints with potential encoding issues' as check_type,
    constraint_name,
    table_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_schema = 'public'
AND constraint_name LIKE '%%';

-- Vérifier les triggers avec des caractères suspects
SELECT 
    'Triggers with potential encoding issues' as check_type,
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'public'
AND trigger_name LIKE '%%';
