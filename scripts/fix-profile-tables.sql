-- =====================================================
-- CORRECTION DES TABLES POUR LA PAGE PROFILE
-- Harmonisation entre la page Profile et la base de données
-- =====================================================

-- Début de la transaction
BEGIN;

-- 1. VÉRIFIER ET CRÉER LES TABLES MANQUANTES

-- Table gamification_levels (si elle n'existe pas)
CREATE TABLE IF NOT EXISTS gamification_levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    min_points INTEGER NOT NULL,
    max_points INTEGER NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    icon TEXT DEFAULT 'star',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT gamification_levels_name_check CHECK (length(name) >= 2),
    CONSTRAINT gamification_levels_points_check CHECK (min_points >= 0 AND max_points > min_points)
);

-- Table gamification_points (si elle n'existe pas)
CREATE TABLE IF NOT EXISTS gamification_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT gamification_points_reason_check CHECK (length(reason) >= 2)
);

-- Table gamification_badges (si elle n'existe pas)
CREATE TABLE IF NOT EXISTS gamification_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    badge_type TEXT NOT NULL,
    required_role TEXT,
    condition_data JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT gamification_badges_name_check CHECK (length(name) >= 2)
);

-- Table gamification_trophies (si elle n'existe pas)
CREATE TABLE IF NOT EXISTS gamification_trophies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    trophy_type TEXT NOT NULL,
    condition_type TEXT NOT NULL,
    condition_value INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT gamification_trophies_name_check CHECK (length(name) >= 2)
);

-- 2. AJOUTER LES CHAMPS MANQUANTS À user_trophies

-- Ajouter period_month si il n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_trophies' AND column_name = 'period_month'
    ) THEN
        ALTER TABLE user_trophies ADD COLUMN period_month INTEGER;
        RAISE NOTICE '✅ Champ period_month ajouté à user_trophies';
    ELSE
        RAISE NOTICE 'ℹ️ Champ period_month existe déjà dans user_trophies';
    END IF;
END $$;

-- Ajouter period_year si il n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_trophies' AND column_name = 'period_year'
    ) THEN
        ALTER TABLE user_trophies ADD COLUMN period_year INTEGER;
        RAISE NOTICE '✅ Champ period_year ajouté à user_trophies';
    ELSE
        RAISE NOTICE 'ℹ️ Champ period_year existe déjà dans user_trophies';
    END IF;
END $$;

-- 3. CRÉER LES INDEX POUR PERFORMANCE

CREATE INDEX IF NOT EXISTS idx_gamification_levels_points ON gamification_levels(min_points, max_points);
CREATE INDEX IF NOT EXISTS idx_gamification_points_user ON gamification_points(user_id);
CREATE INDEX IF NOT EXISTS idx_gamification_points_date ON gamification_points(created_at);
CREATE INDEX IF NOT EXISTS idx_gamification_badges_active ON gamification_badges(is_active);
CREATE INDEX IF NOT EXISTS idx_gamification_trophies_active ON gamification_trophies(is_active);

-- 4. CRÉER LES TRIGGERS POUR updated_at (seulement s'ils n'existent pas)

-- Trigger pour gamification_levels
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_gamification_levels_updated_at'
    ) THEN
        CREATE TRIGGER update_gamification_levels_updated_at
            BEFORE UPDATE ON gamification_levels
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE '✅ Trigger update_gamification_levels_updated_at créé';
    ELSE
        RAISE NOTICE 'ℹ️ Trigger update_gamification_levels_updated_at existe déjà';
    END IF;
END $$;

-- Trigger pour gamification_badges
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_gamification_badges_updated_at'
    ) THEN
        CREATE TRIGGER update_gamification_badges_updated_at
            BEFORE UPDATE ON gamification_badges
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE '✅ Trigger update_gamification_badges_updated_at créé';
    ELSE
        RAISE NOTICE 'ℹ️ Trigger update_gamification_badges_updated_at existe déjà';
    END IF;
END $$;

-- Trigger pour gamification_trophies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_gamification_trophies_updated_at'
    ) THEN
        CREATE TRIGGER update_gamification_trophies_updated_at
            BEFORE UPDATE ON gamification_trophies
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE '✅ Trigger update_gamification_trophies_updated_at créé';
    ELSE
        RAISE NOTICE 'ℹ️ Trigger update_gamification_trophies_updated_at existe déjà';
    END IF;
END $$;

-- 5. ACTIVER RLS

ALTER TABLE gamification_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_trophies ENABLE ROW LEVEL SECURITY;

-- 6. CRÉER LES POLITIQUES RLS (seulement si elles n'existent pas)

-- SuperAdmin peut tout faire
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'gamification_levels' 
        AND policyname = 'SuperAdmin gamification levels full access'
    ) THEN
        CREATE POLICY "SuperAdmin gamification levels full access" ON gamification_levels FOR ALL USING (is_superadmin());
        RAISE NOTICE '✅ Politique SuperAdmin gamification levels créée';
    ELSE
        RAISE NOTICE 'ℹ️ Politique SuperAdmin gamification levels existe déjà';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'gamification_points' 
        AND policyname = 'SuperAdmin gamification points full access'
    ) THEN
        CREATE POLICY "SuperAdmin gamification points full access" ON gamification_points FOR ALL USING (is_superadmin());
        RAISE NOTICE '✅ Politique SuperAdmin gamification points créée';
    ELSE
        RAISE NOTICE 'ℹ️ Politique SuperAdmin gamification points existe déjà';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'gamification_badges' 
        AND policyname = 'SuperAdmin gamification badges full access'
    ) THEN
        CREATE POLICY "SuperAdmin gamification badges full access" ON gamification_badges FOR ALL USING (is_superadmin());
        RAISE NOTICE '✅ Politique SuperAdmin gamification badges créée';
    ELSE
        RAISE NOTICE 'ℹ️ Politique SuperAdmin gamification badges existe déjà';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'gamification_trophies' 
        AND policyname = 'SuperAdmin gamification trophies full access'
    ) THEN
        CREATE POLICY "SuperAdmin gamification trophies full access" ON gamification_trophies FOR ALL USING (is_superadmin());
        RAISE NOTICE '✅ Politique SuperAdmin gamification trophies créée';
    ELSE
        RAISE NOTICE 'ℹ️ Politique SuperAdmin gamification trophies existe déjà';
    END IF;
END $$;

-- Admin peut gérer
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'gamification_levels' 
        AND policyname = 'Admin gamification levels management'
    ) THEN
        CREATE POLICY "Admin gamification levels management" ON gamification_levels FOR ALL USING (is_admin());
        RAISE NOTICE '✅ Politique Admin gamification levels créée';
    ELSE
        RAISE NOTICE 'ℹ️ Politique Admin gamification levels existe déjà';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'gamification_points' 
        AND policyname = 'Admin gamification points access'
    ) THEN
        CREATE POLICY "Admin gamification points access" ON gamification_points FOR SELECT USING (is_admin());
        RAISE NOTICE '✅ Politique Admin gamification points créée';
    ELSE
        RAISE NOTICE 'ℹ️ Politique Admin gamification points existe déjà';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'gamification_badges' 
        AND policyname = 'Admin gamification badges management'
    ) THEN
        CREATE POLICY "Admin gamification badges management" ON gamification_badges FOR ALL USING (is_admin());
        RAISE NOTICE '✅ Politique Admin gamification badges créée';
    ELSE
        RAISE NOTICE 'ℹ️ Politique Admin gamification badges existe déjà';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'gamification_trophies' 
        AND policyname = 'Admin gamification trophies management'
    ) THEN
        CREATE POLICY "Admin gamification trophies management" ON gamification_trophies FOR ALL USING (is_admin());
        RAISE NOTICE '✅ Politique Admin gamification trophies créée';
    ELSE
        RAISE NOTICE 'ℹ️ Politique Admin gamification trophies existe déjà';
    END IF;
END $$;

-- Utilisateurs peuvent voir leurs propres points
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'gamification_points' 
        AND policyname = 'Users can view own gamification points'
    ) THEN
        CREATE POLICY "Users can view own gamification points" ON gamification_points FOR SELECT USING (
            user_id = (SELECT id FROM users WHERE auth_id = get_current_user_id())
        );
        RAISE NOTICE '✅ Politique Users can view own gamification points créée';
    ELSE
        RAISE NOTICE 'ℹ️ Politique Users can view own gamification points existe déjà';
    END IF;
END $$;

-- Tous les utilisateurs actifs peuvent voir les niveaux, badges et trophées actifs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'gamification_levels' 
        AND policyname = 'Users can view active gamification levels'
    ) THEN
        CREATE POLICY "Users can view active gamification levels" ON gamification_levels FOR SELECT USING (
            EXISTS (SELECT 1 FROM users WHERE auth_id = get_current_user_id() AND status = 'active')
        );
        RAISE NOTICE '✅ Politique Users can view active gamification levels créée';
    ELSE
        RAISE NOTICE 'ℹ️ Politique Users can view active gamification levels existe déjà';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'gamification_badges' 
        AND policyname = 'Users can view active gamification badges'
    ) THEN
        CREATE POLICY "Users can view active gamification badges" ON gamification_badges FOR SELECT USING (
            is_active = true AND EXISTS (SELECT 1 FROM users WHERE auth_id = get_current_user_id() AND status = 'active')
        );
        RAISE NOTICE '✅ Politique Users can view active gamification badges créée';
    ELSE
        RAISE NOTICE 'ℹ️ Politique Users can view active gamification badges existe déjà';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'gamification_trophies' 
        AND policyname = 'Users can view active gamification trophies'
    ) THEN
        CREATE POLICY "Users can view active gamification trophies" ON gamification_trophies FOR SELECT USING (
            is_active = true AND EXISTS (SELECT 1 FROM users WHERE auth_id = get_current_user_id() AND status = 'active')
        );
        RAISE NOTICE '✅ Politique Users can view active gamification trophies créée';
    ELSE
        RAISE NOTICE 'ℹ️ Politique Users can view active gamification trophies existe déjà';
    END IF;
END $$;

-- 7. VÉRIFIER ET CORRIGER LES RELATIONS

-- Vérifier la relation user_badges -> gamification_badges
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'user_badges' 
        AND constraint_name LIKE '%badge_id%'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        -- Ajouter la contrainte de clé étrangère
        ALTER TABLE user_badges 
        ADD CONSTRAINT user_badges_badge_id_fkey 
        FOREIGN KEY (badge_id) REFERENCES gamification_badges(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Relation user_badges -> gamification_badges ajoutée';
    ELSE
        RAISE NOTICE 'ℹ️ Relation user_badges -> gamification_badges existe déjà';
    END IF;
END $$;

-- Vérifier la relation user_trophies -> gamification_trophies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'user_trophies' 
        AND constraint_name LIKE '%trophy_id%'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        -- Ajouter la contrainte de clé étrangère
        ALTER TABLE user_trophies 
        ADD CONSTRAINT user_trophies_trophy_id_fkey 
        FOREIGN KEY (trophy_id) REFERENCES gamification_trophies(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Relation user_trophies -> gamification_trophies ajoutée';
    ELSE
        RAISE NOTICE 'ℹ️ Relation user_trophies -> gamification_trophies existe déjà';
    END IF;
END $$;

-- 8. INSÉRER DES DONNÉES INITIALES SI LES TABLES SONT VIDES

-- Niveaux de base
INSERT INTO gamification_levels (name, min_points, max_points, color, icon) VALUES
('Débutant', 0, 99, '#10B981', 'star'),
('Intermédiaire', 100, 299, '#3B82F6', 'award'),
('Avancé', 300, 599, '#8B5CF6', 'trophy'),
('Expert', 600, 999, '#F59E0B', 'target'),
('Maître', 1000, 1999, '#EF4444', 'users'),
('Légende', 2000, 999999, '#06B6D4', 'trending-up')
ON CONFLICT DO NOTHING;

-- Badges de base
INSERT INTO gamification_badges (name, description, icon, badge_type, required_role, condition_data, is_active) VALUES
('Premier Pas', 'Première vente réalisée', 'star', 'achievement', 'Vendeur', '{"sales_count": 1}', true),
('Débutant', '10 ventes réalisées', 'award', 'achievement', 'Vendeur', '{"sales_count": 10}', true),
('Intermédiaire', '50 ventes réalisées', 'trophy', 'achievement', 'Vendeur', '{"sales_count": 50}', true),
('Expert', '100 ventes réalisées', 'target', 'achievement', 'Vendeur', '{"sales_count": 100}', true)
ON CONFLICT DO NOTHING;

-- Trophées de base
INSERT INTO gamification_trophies (name, description, icon, trophy_type, condition_type, condition_value, is_active) VALUES
('Vendeur Débutant', 'Première vente réalisée', 'star', 'achievement', 'sales_count', 1, true),
('Vendeur Confirmé', '10 ventes réalisées', 'award', 'achievement', 'sales_count', 10, true),
('Vendeur Expert', '100 ventes réalisées', 'trophy', 'achievement', 'sales_count', 100, true),
('Champion des Ventes', '1000 ventes réalisées', 'target', 'achievement', 'sales_count', 1000, true)
ON CONFLICT DO NOTHING;

-- 9. VÉRIFICATION FINALE

SELECT 
    'VÉRIFICATION DES TABLES PROFILE' as diagnostic_type,
    table_name,
    'CRÉÉE' as status
FROM information_schema.tables 
WHERE table_name IN (
    'gamification_levels',
    'gamification_points',
    'gamification_badges',
    'gamification_trophies'
)
AND table_schema = 'public';

-- Vérifier les champs ajoutés à user_trophies
SELECT 
    'CHAMPS USER_TROPHIES' as diagnostic_type,
    column_name,
    'AJOUTÉ' as status
FROM information_schema.columns 
WHERE table_name = 'user_trophies' 
AND column_name IN ('period_month', 'period_year')
ORDER BY column_name;

-- Validation de la transaction
COMMIT;

-- Message de fin
SELECT '🎉 TABLES DE PROFILE CORRIGÉES AVEC SUCCÈS' as result;
