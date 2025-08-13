-- =====================================================
-- CORRECTION DE LA RELATION USER_STORES - STORES
-- Ajout de la contrainte de clé étrangère manquante
-- =====================================================

-- Vérifier si la contrainte existe déjà
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_stores_store_id_fkey' 
        AND table_name = 'user_stores'
    ) THEN
        -- Ajouter la contrainte de clé étrangère
        ALTER TABLE user_stores 
        ADD CONSTRAINT user_stores_store_id_fkey 
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Contrainte de clé étrangère ajoutée avec succès';
    ELSE
        RAISE NOTICE 'La contrainte de clé étrangère existe déjà';
    END IF;
END $$;

-- Vérifier l'intégrité des données
SELECT 
    'user_stores' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN store_id IS NULL THEN 1 END) as null_store_ids,
    COUNT(CASE WHEN store_id NOT IN (SELECT id FROM stores) THEN 1 END) as orphaned_store_ids
FROM user_stores;

-- Afficher les enregistrements orphelins (si any)
SELECT 
    us.id as user_store_id,
    us.user_id,
    us.store_id,
    u.email as user_email,
    s.name as store_name
FROM user_stores us
LEFT JOIN users u ON us.user_id = u.id
LEFT JOIN stores s ON us.store_id = s.id
WHERE s.id IS NULL;
