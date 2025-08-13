-- =====================================================
-- CORRECTION DE LA RELATION SALES - USERS
-- Ajout de la contrainte de clé étrangère nommée
-- =====================================================

-- Vérifier si la contrainte existe déjà
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sales_created_by_fkey' 
        AND table_name = 'sales'
    ) THEN
        -- Supprimer la contrainte existante sans nom (si elle existe)
        ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_sold_by_fkey;
        
        -- Ajouter la contrainte de clé étrangère avec le nom correct
        ALTER TABLE sales 
        ADD CONSTRAINT sales_created_by_fkey 
        FOREIGN KEY (sold_by) REFERENCES users(id) ON DELETE RESTRICT;
        
        RAISE NOTICE 'Contrainte de clé étrangère sales_created_by_fkey ajoutée avec succès';
    ELSE
        RAISE NOTICE 'La contrainte de clé étrangère sales_created_by_fkey existe déjà';
    END IF;
END $$;

-- Vérifier l'intégrité des données
SELECT 
    'sales' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN sold_by IS NULL THEN 1 END) as null_sold_by,
    COUNT(CASE WHEN sold_by NOT IN (SELECT id FROM users) THEN 1 END) as orphaned_sold_by
FROM sales;

-- Afficher les enregistrements orphelins (si any)
SELECT 
    s.id as sale_id,
    s.sale_code,
    s.sold_by,
    u.email as user_email
FROM sales s
LEFT JOIN users u ON s.sold_by = u.id
WHERE u.id IS NULL;

-- Vérifier que la contrainte a été ajoutée
SELECT 
    constraint_name,
    table_name,
    constraint_type,
    column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'sales' 
AND tc.constraint_type = 'FOREIGN KEY'
AND kcu.column_name = 'sold_by';
