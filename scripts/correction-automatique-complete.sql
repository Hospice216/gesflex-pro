-- =====================================================
-- CORRECTION AUTOMATIQUE COMPLÈTE
-- Tous les problèmes de relations identifiés
-- =====================================================

-- Début de la transaction
BEGIN;

-- 1. CORRECTION DE LA RELATION USER_STORES - STORES
DO $$
BEGIN
    -- Vérifier si la contrainte existe déjà
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_stores_store_id_fkey' 
        AND table_name = 'user_stores'
    ) THEN
        -- Supprimer la contrainte existante sans nom (si elle existe)
        ALTER TABLE user_stores DROP CONSTRAINT IF EXISTS user_stores_store_id_fkey;
        
        -- Ajouter la contrainte de clé étrangère
        ALTER TABLE user_stores 
        ADD CONSTRAINT user_stores_store_id_fkey 
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
        
        RAISE NOTICE '✅ Contrainte user_stores_store_id_fkey ajoutée avec succès';
    ELSE
        RAISE NOTICE 'ℹ️ La contrainte user_stores_store_id_fkey existe déjà';
    END IF;
END $$;

-- 2. CORRECTION DE LA RELATION SALES - USERS
DO $$
BEGIN
    -- Vérifier si la contrainte existe déjà
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
        
        RAISE NOTICE '✅ Contrainte sales_created_by_fkey ajoutée avec succès';
    ELSE
        RAISE NOTICE 'ℹ️ La contrainte sales_created_by_fkey existe déjà';
    END IF;
END $$;

-- 3. CRÉATION DE LA TABLE EXPENSES SI ELLE N'EXISTE PAS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'expenses' 
        AND table_schema = 'public'
    ) THEN
        -- Créer la table expenses
        CREATE TABLE expenses (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            title TEXT NOT NULL,
            description TEXT,
            category TEXT NOT NULL,
            amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
            expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
            store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
            created_by UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Ajouter les index
        CREATE INDEX idx_expenses_store_id ON expenses(store_id);
        CREATE INDEX idx_expenses_created_by ON expenses(created_by);
        CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);
        CREATE INDEX idx_expenses_category ON expenses(category);
        
        -- Activer RLS
        ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
        
        -- Créer les politiques RLS
        CREATE POLICY "Users can view expenses from their stores" ON expenses
            FOR SELECT USING (
                store_id IN (
                    SELECT store_id FROM user_stores WHERE user_id = auth.uid()
                )
            );
        
        CREATE POLICY "Users can insert expenses for their stores" ON expenses
            FOR INSERT WITH CHECK (
                store_id IN (
                    SELECT store_id FROM user_stores WHERE user_id = auth.uid()
                )
            );
        
        CREATE POLICY "Users can update expenses for their stores" ON expenses
            FOR UPDATE USING (
                store_id IN (
                    SELECT store_id FROM user_stores WHERE user_id = auth.uid()
                )
            );
        
        CREATE POLICY "Users can delete expenses for their stores" ON expenses
            FOR DELETE USING (
                store_id IN (
                    SELECT store_id FROM user_stores WHERE user_id = auth.uid()
                )
            );
        
        RAISE NOTICE '✅ Table expenses créée avec succès';
    ELSE
        RAISE NOTICE 'ℹ️ La table expenses existe déjà';
    END IF;
END $$;

-- 4. CORRECTION DE LA RELATION EXPENSES - STORES
DO $$
BEGIN
    -- Vérifier si la contrainte existe déjà
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'expenses_store_id_fkey' 
        AND table_name = 'expenses'
    ) THEN
        -- Ajouter la contrainte de clé étrangère
        ALTER TABLE expenses 
        ADD CONSTRAINT expenses_store_id_fkey 
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL;
        
        RAISE NOTICE '✅ Contrainte expenses_store_id_fkey ajoutée avec succès';
    ELSE
        RAISE NOTICE 'ℹ️ La contrainte expenses_store_id_fkey existe déjà';
    END IF;
END $$;

-- 5. CORRECTION DE LA RELATION EXPENSES - USERS
DO $$
BEGIN
    -- Vérifier si la contrainte existe déjà
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'expenses_created_by_fkey' 
        AND table_name = 'expenses'
    ) THEN
        -- Ajouter la contrainte de clé étrangère
        ALTER TABLE expenses 
        ADD CONSTRAINT expenses_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
        
        RAISE NOTICE '✅ Contrainte expenses_created_by_fkey ajoutée avec succès';
    ELSE
        RAISE NOTICE 'ℹ️ La contrainte expenses_created_by_fkey existe déjà';
    END IF;
END $$;

-- 6. VÉRIFICATION FINALE DES CONTRAINTES
SELECT 
    'VÉRIFICATION FINALE' as diagnostic_type,
    tc.table_name,
    kcu.column_name,
    tc.constraint_name,
    ccu.table_name AS foreign_table_name,
    'OK' as status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('user_stores', 'sales', 'expenses')
ORDER BY tc.table_name, kcu.column_name;

-- 7. INSERTION DE DONNÉES DE TEST SI LES TABLES SONT VIDES
DO $$
BEGIN
    -- Insérer des données de test dans expenses si la table est vide
    IF NOT EXISTS (SELECT 1 FROM expenses LIMIT 1) THEN
        INSERT INTO expenses (title, description, category, amount, store_id, created_by)
        VALUES 
            ('Achat fournitures', 'Fournitures de bureau', 'Fournitures', 150.00, 
             (SELECT id FROM stores LIMIT 1), 
             (SELECT id FROM users LIMIT 1)),
            ('Maintenance équipement', 'Réparation imprimante', 'Maintenance', 200.00,
             (SELECT id FROM stores LIMIT 1), 
             (SELECT id FROM users LIMIT 1)),
            ('Marketing', 'Publicité locale', 'Marketing', 300.00,
             (SELECT id FROM stores LIMIT 1), 
             (SELECT id FROM users LIMIT 1));
        
        RAISE NOTICE '✅ Données de test ajoutées dans expenses';
    ELSE
        RAISE NOTICE 'ℹ️ La table expenses contient déjà des données';
    END IF;
END $$;

-- Validation de la transaction
COMMIT;

-- Message de fin
SELECT '🎉 CORRECTION AUTOMATIQUE TERMINÉE AVEC SUCCÈS' as result;
