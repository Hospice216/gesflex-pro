-- =====================================================
-- CORRECTION DES TABLES DE GAMIFICATION
-- Harmonisation entre la migration et le code TypeScript
-- =====================================================

-- Début de la transaction
BEGIN;

-- 1. CRÉER LES TABLES MANQUANTES SELON LE CODE TYPESCRIPT

-- Table gamification_levels
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

-- Table gamification_point_rules
CREATE TABLE IF NOT EXISTS gamification_point_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL,
    points_awarded INTEGER NOT NULL,
    condition_value JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT gamification_point_rules_name_check CHECK (length(name) >= 2),
    CONSTRAINT gamification_point_rules_points_check CHECK (points_awarded >= 0)
);

-- Table gamification_points (remplace points_history pour la compatibilité)
CREATE TABLE IF NOT EXISTS gamification_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT gamification_points_reason_check CHECK (length(reason) >= 2)
);

-- Table gamification_badges (alias pour badges)
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

-- Table gamification_trophies (alias pour trophies)
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

-- 2. CRÉER LES INDEX POUR PERFORMANCE

CREATE INDEX IF NOT EXISTS idx_gamification_levels_points ON gamification_levels(min_points, max_points);
CREATE INDEX IF NOT EXISTS idx_gamification_point_rules_active ON gamification_point_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_gamification_point_rules_event ON gamification_point_rules(event_type);
CREATE INDEX IF NOT EXISTS idx_gamification_points_user ON gamification_points(user_id);
CREATE INDEX IF NOT EXISTS idx_gamification_points_date ON gamification_points(created_at);
CREATE INDEX IF NOT EXISTS idx_gamification_badges_active ON gamification_badges(is_active);
CREATE INDEX IF NOT EXISTS idx_gamification_trophies_active ON gamification_trophies(is_active);

-- 3. CRÉER LES TRIGGERS POUR updated_at

CREATE TRIGGER update_gamification_levels_updated_at
    BEFORE UPDATE ON gamification_levels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gamification_point_rules_updated_at
    BEFORE UPDATE ON gamification_point_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gamification_badges_updated_at
    BEFORE UPDATE ON gamification_badges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gamification_trophies_updated_at
    BEFORE UPDATE ON gamification_trophies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. ACTIVER RLS

ALTER TABLE gamification_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_point_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_trophies ENABLE ROW LEVEL SECURITY;

-- 5. CRÉER LES POLITIQUES RLS

-- SuperAdmin peut tout faire
CREATE POLICY "SuperAdmin gamification levels full access" ON gamification_levels FOR ALL USING (is_superadmin());
CREATE POLICY "SuperAdmin gamification rules full access" ON gamification_point_rules FOR ALL USING (is_superadmin());
CREATE POLICY "SuperAdmin gamification points full access" ON gamification_points FOR ALL USING (is_superadmin());
CREATE POLICY "SuperAdmin gamification badges full access" ON gamification_badges FOR ALL USING (is_superadmin());
CREATE POLICY "SuperAdmin gamification trophies full access" ON gamification_trophies FOR ALL USING (is_superadmin());

-- Admin peut gérer
CREATE POLICY "Admin gamification levels management" ON gamification_levels FOR ALL USING (is_admin());
CREATE POLICY "Admin gamification rules management" ON gamification_point_rules FOR ALL USING (is_admin());
CREATE POLICY "Admin gamification points access" ON gamification_points FOR SELECT USING (is_admin());
CREATE POLICY "Admin gamification badges management" ON gamification_badges FOR ALL USING (is_admin());
CREATE POLICY "Admin gamification trophies management" ON gamification_trophies FOR ALL USING (is_admin());

-- Utilisateurs peuvent voir leurs propres points
CREATE POLICY "Users can view own gamification points" ON gamification_points FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE auth_id = get_current_user_id())
);

-- Tous les utilisateurs actifs peuvent voir les niveaux, règles, badges et trophées actifs
CREATE POLICY "Users can view active gamification levels" ON gamification_levels FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE auth_id = get_current_user_id() AND status = 'active')
);

CREATE POLICY "Users can view active gamification rules" ON gamification_point_rules FOR SELECT USING (
    is_active = true AND EXISTS (SELECT 1 FROM users WHERE auth_id = get_current_user_id() AND status = 'active')
);

CREATE POLICY "Users can view active gamification badges" ON gamification_badges FOR SELECT USING (
    is_active = true AND EXISTS (SELECT 1 FROM users WHERE auth_id = get_current_user_id() AND status = 'active')
);

CREATE POLICY "Users can view active gamification trophies" ON gamification_trophies FOR SELECT USING (
    is_active = true AND EXISTS (SELECT 1 FROM users WHERE auth_id = get_current_user_id() AND status = 'active')
);

-- 6. INSÉRER DES DONNÉES INITIALES

-- Niveaux de base
INSERT INTO gamification_levels (name, min_points, max_points, color, icon) VALUES
('Débutant', 0, 99, '#10B981', 'star'),
('Intermédiaire', 100, 299, '#3B82F6', 'award'),
('Avancé', 300, 599, '#8B5CF6', 'trophy'),
('Expert', 600, 999, '#F59E0B', 'target'),
('Maître', 1000, 1999, '#EF4444', 'users'),
('Légende', 2000, 999999, '#06B6D4', 'trending-up')
ON CONFLICT DO NOTHING;

-- Règles de points de base
INSERT INTO gamification_point_rules (name, description, event_type, points_awarded, condition_value, is_active) VALUES
('Première Vente', 'Points pour la première vente', 'sale', 10, '{"min_amount": 0}', true),
('Vente Quotidienne', 'Points pour chaque vente', 'sale', 5, '{"min_amount": 0}', true),
('Objectif Atteint', 'Points pour atteindre un objectif', 'target_achieved', 50, '{}', true),
('Retour Traité', 'Points pour traiter un retour', 'return', 15, '{}', true)
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

-- 7. VÉRIFICATION FINALE

SELECT 
    'VÉRIFICATION DES TABLES GAMIFICATION' as diagnostic_type,
    table_name,
    'CRÉÉE' as status
FROM information_schema.tables 
WHERE table_name IN (
    'gamification_levels',
    'gamification_point_rules', 
    'gamification_points',
    'gamification_badges',
    'gamification_trophies'
)
AND table_schema = 'public';

-- Validation de la transaction
COMMIT;

-- Message de fin
SELECT '🎉 TABLES DE GAMIFICATION CRÉÉES AVEC SUCCÈS' as result;
