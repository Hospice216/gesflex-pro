-- Script de diagnostic des relations dans la base de données
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier la structure de la table purchases
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'purchases' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Vérifier les contraintes de clés étrangères
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'purchases';

-- 3. Vérifier les relations existantes
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE tablename IN ('purchases', 'users', 'suppliers', 'products', 'stores')
ORDER BY tablename, attname;

-- 4. Tester une requête simple
SELECT 
    p.id,
    p.purchase_code,
    p.created_by,
    s.name as supplier_name,
    pr.name as product_name,
    st.name as store_name
FROM purchases p
LEFT JOIN suppliers s ON p.supplier_id = s.id
LEFT JOIN products pr ON p.product_id = pr.id
LEFT JOIN stores st ON p.store_id = st.id
LIMIT 5;

-- 5. Vérifier les utilisateurs
SELECT 
    id,
    first_name,
    last_name,
    email,
    role
FROM users
LIMIT 5; 