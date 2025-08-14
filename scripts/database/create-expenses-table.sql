-- =====================================================
-- CRÉATION DE LA TABLE EXPENSES MANQUANTE
-- =====================================================

-- Vérifier si la table existe déjà
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
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            
            -- Contraintes
            CONSTRAINT expenses_title_check CHECK (length(title) >= 3),
            CONSTRAINT expenses_category_check CHECK (length(category) >= 2),
            CONSTRAINT expenses_amount_positive CHECK (amount > 0)
        );

        -- Créer les index pour les performances
        CREATE INDEX idx_expenses_store_id ON expenses(store_id);
        CREATE INDEX idx_expenses_created_by ON expenses(created_by);
        CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);
        CREATE INDEX idx_expenses_category ON expenses(category);

        -- Créer le trigger pour updated_at
        CREATE TRIGGER update_expenses_updated_at
            BEFORE UPDATE ON expenses
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();

        RAISE NOTICE 'Table expenses créée avec succès';
    ELSE
        RAISE NOTICE 'La table expenses existe déjà';
    END IF;
END $$;

-- Activer RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour expenses
-- SuperAdmin et Admin peuvent tout faire
CREATE POLICY "Admins full access expenses" ON expenses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_id = auth.uid() 
            AND role IN ('SuperAdmin', 'Admin')
        )
    );

-- Manager peut voir et créer les dépenses de ses magasins
CREATE POLICY "Manager expenses access" ON expenses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_id = auth.uid() 
            AND role = 'Manager'
        )
    );

-- Vendeur peut voir les dépenses de son magasin
CREATE POLICY "Vendeur expenses view" ON expenses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_id = auth.uid() 
            AND role = 'Vendeur'
        )
    );

-- Vérifier que la table a été créée
SELECT 
    'expenses' as table_name,
    COUNT(*) as total_records
FROM expenses;

-- Afficher la structure de la table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'expenses' 
AND table_schema = 'public'
ORDER BY ordinal_position;
