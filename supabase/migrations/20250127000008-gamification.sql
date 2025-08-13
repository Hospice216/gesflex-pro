-- =====================================================
-- GESFLEX PRO - GAMIFICATION
-- Système de trophées, badges, points et objectifs
-- =====================================================

-- =====================================================
-- TABLE TROPHÉES
-- =====================================================

CREATE TABLE trophies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    color TEXT DEFAULT '#FFD700',
    points_reward INTEGER DEFAULT 0,
    gamification_type gamification_type NOT NULL,
    target_value DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Contraintes
    CONSTRAINT trophies_name_check CHECK (length(name) >= 2),
    CONSTRAINT trophies_points_check CHECK (points_reward >= 0),
    CONSTRAINT trophies_target_check CHECK (target_value IS NULL OR target_value > 0)
);

-- =====================================================
-- TABLE BADGES
-- =====================================================

CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    color TEXT DEFAULT '#3B82F6',
    points_reward INTEGER DEFAULT 0,
    gamification_type gamification_type NOT NULL,
    target_value DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Contraintes
    CONSTRAINT badges_name_check CHECK (length(name) >= 2),
    CONSTRAINT badges_points_check CHECK (points_reward >= 0),
    CONSTRAINT badges_target_check CHECK (target_value IS NULL OR target_value > 0)
);

-- =====================================================
-- TABLE POINTS UTILISATEURS
-- =====================================================

CREATE TABLE user_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points INTEGER NOT NULL DEFAULT 0,
    total_earned INTEGER NOT NULL DEFAULT 0,
    total_spent INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Contraintes
    CONSTRAINT user_points_points_check CHECK (points >= 0),
    CONSTRAINT user_points_total_earned_check CHECK (total_earned >= 0),
    CONSTRAINT user_points_total_spent_check CHECK (total_spent >= 0),
    CONSTRAINT user_points_level_check CHECK (level >= 1),
    CONSTRAINT user_points_balance_check CHECK (points = total_earned - total_spent)
);

-- =====================================================
-- TABLE HISTORIQUE DES POINTS
-- =====================================================

CREATE TABLE points_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points_change INTEGER NOT NULL,
    reason TEXT NOT NULL,
    source_type TEXT NOT NULL, -- 'trophy', 'badge', 'manual', 'achievement'
    source_id UUID, -- ID du trophée, badge, ou autre source
    awarded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Contraintes
    CONSTRAINT points_history_reason_check CHECK (length(reason) >= 2),
    CONSTRAINT points_history_source_type_check CHECK (source_type IN ('trophy', 'badge', 'manual', 'achievement'))
);

-- =====================================================
-- TABLE TROPHÉES ATTRIBUÉS
-- =====================================================

CREATE TABLE user_trophies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trophy_id UUID NOT NULL REFERENCES trophies(id) ON DELETE CASCADE,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    awarded_by UUID REFERENCES users(id),
    achievement_value DECIMAL(10,2), -- Valeur atteinte pour obtenir le trophée
    
    -- Contraintes
    CONSTRAINT user_trophies_unique UNIQUE(user_id, trophy_id)
);

-- =====================================================
-- TABLE BADGES ATTRIBUÉS
-- =====================================================

CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    awarded_by UUID REFERENCES users(id),
    achievement_value DECIMAL(10,2), -- Valeur atteinte pour obtenir le badge
    
    -- Contraintes
    CONSTRAINT user_badges_unique UNIQUE(user_id, badge_id)
);

-- =====================================================
-- INDEX POUR PERFORMANCE
-- =====================================================

CREATE INDEX idx_trophies_type ON trophies(gamification_type);
CREATE INDEX idx_trophies_active ON trophies(is_active);
CREATE INDEX idx_badges_type ON badges(gamification_type);
CREATE INDEX idx_badges_active ON badges(is_active);
CREATE INDEX idx_user_points_user ON user_points(user_id);
CREATE INDEX idx_user_points_level ON user_points(level);
CREATE INDEX idx_points_history_user ON points_history(user_id);
CREATE INDEX idx_points_history_date ON points_history(created_at);
CREATE INDEX idx_user_trophies_user ON user_trophies(user_id);
CREATE INDEX idx_user_badges_user ON user_badges(user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_trophies_updated_at
    BEFORE UPDATE ON trophies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_badges_updated_at
    BEFORE UPDATE ON badges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_points_updated_at
    BEFORE UPDATE ON user_points
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour créer automatiquement un enregistrement de points pour les nouveaux utilisateurs
CREATE OR REPLACE FUNCTION create_user_points_record()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_points (user_id, points, total_earned, total_spent, level)
    VALUES (NEW.id, 0, 0, 0, 1);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_user_points_record
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_points_record();

-- =====================================================
-- FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour calculer le niveau d'un utilisateur basé sur ses points
CREATE OR REPLACE FUNCTION calculate_user_level(points INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN GREATEST(1, FLOOR(points / 100) + 1);
END;
$$ LANGUAGE plpgsql;

-- Fonction pour attribuer des points manuellement (Admin uniquement)
CREATE OR REPLACE FUNCTION award_points_manually(
    p_user_id UUID,
    p_points INTEGER,
    p_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
    current_user_role user_role;
BEGIN
    -- Récupérer l'ID de l'utilisateur connecté
    SELECT id INTO current_user_id FROM users WHERE auth_id = get_current_user_id();
    
    -- Vérifier que l'utilisateur est Admin ou SuperAdmin
    SELECT role INTO current_user_role FROM users WHERE id = current_user_id;
    IF current_user_role NOT IN ('Admin', 'SuperAdmin') THEN
        RAISE EXCEPTION 'Seuls les Admin et SuperAdmin peuvent attribuer des points manuellement';
    END IF;
    
    -- Vérifier que l'utilisateur cible existe
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'Utilisateur non trouvé';
    END IF;
    
    -- Vérifier que la raison est fournie
    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'Une raison est requise pour attribuer des points';
    END IF;
    
    -- Ajouter l'entrée dans l'historique
    INSERT INTO points_history (user_id, points_change, reason, source_type, awarded_by)
    VALUES (p_user_id, p_points, p_reason, 'manual', current_user_id);
    
    -- Mettre à jour les points utilisateur
    UPDATE user_points 
    SET 
        points = points + p_points,
        total_earned = total_earned + CASE WHEN p_points > 0 THEN p_points ELSE 0 END,
        total_spent = total_spent + CASE WHEN p_points < 0 THEN ABS(p_points) ELSE 0 END,
        level = calculate_user_level(points + p_points)
    WHERE user_id = p_user_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Activer RLS
ALTER TABLE trophies ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_trophies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLITIQUES RLS
-- =====================================================

-- SuperAdmin peut tout faire
CREATE POLICY "SuperAdmin gamification full access" ON trophies FOR ALL USING (is_superadmin());
CREATE POLICY "SuperAdmin gamification full access" ON badges FOR ALL USING (is_superadmin());
CREATE POLICY "SuperAdmin gamification full access" ON user_points FOR ALL USING (is_superadmin());
CREATE POLICY "SuperAdmin gamification full access" ON points_history FOR ALL USING (is_superadmin());
CREATE POLICY "SuperAdmin gamification full access" ON user_trophies FOR ALL USING (is_superadmin());
CREATE POLICY "SuperAdmin gamification full access" ON user_badges FOR ALL USING (is_superadmin());

-- Admin peut gérer
CREATE POLICY "Admin gamification management" ON trophies FOR ALL USING (is_admin());
CREATE POLICY "Admin gamification management" ON badges FOR ALL USING (is_admin());
CREATE POLICY "Admin gamification access" ON user_points FOR SELECT USING (is_admin());
CREATE POLICY "Admin gamification access" ON points_history FOR SELECT USING (is_admin());
CREATE POLICY "Admin gamification management" ON user_trophies FOR ALL USING (is_admin());
CREATE POLICY "Admin gamification management" ON user_badges FOR ALL USING (is_admin());

-- Utilisateurs peuvent voir leurs propres données
CREATE POLICY "Users can view own points" ON user_points FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE auth_id = get_current_user_id())
);
CREATE POLICY "Users can view own history" ON points_history FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE auth_id = get_current_user_id())
);
CREATE POLICY "Users can view own trophies" ON user_trophies FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE auth_id = get_current_user_id())
);
CREATE POLICY "Users can view own badges" ON user_badges FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE auth_id = get_current_user_id())
);

-- Tous les utilisateurs actifs peuvent voir les trophées et badges actifs
CREATE POLICY "Users can view active trophies" ON trophies FOR SELECT USING (
    is_active = true AND EXISTS (SELECT 1 FROM users WHERE auth_id = get_current_user_id() AND status = 'active')
);
CREATE POLICY "Users can view active badges" ON badges FOR SELECT USING (
    is_active = true AND EXISTS (SELECT 1 FROM users WHERE auth_id = get_current_user_id() AND status = 'active')
);

-- =====================================================
-- DONNÉES INITIALES
-- =====================================================

-- Insérer des trophées de base
INSERT INTO trophies (name, description, gamification_type, target_value, points_reward, color) VALUES
('Vendeur Débutant', 'Première vente réalisée', 'sales_count', 1, 10, '#10B981'),
('Vendeur Confirmé', '10 ventes réalisées', 'sales_count', 10, 50, '#3B82F6'),
('Vendeur Expert', '100 ventes réalisées', 'sales_count', 100, 200, '#8B5CF6'),
('Champion des Ventes', '1000 ventes réalisées', 'sales_count', 1000, 1000, '#F59E0B'),
('Record Quotidien', 'Record personnel de ventes en une journée', 'daily_record', NULL, 100, '#EF4444'),
('Vendeur du Dimanche', 'Vente réalisée un dimanche', 'holiday_sales', NULL, 25, '#06B6D4'),
('Millionnaire', 'Chiffre d''affaires de 1,000,000', 'sales_amount', 1000000, 500, '#84CC16');

-- Insérer des badges de base
INSERT INTO badges (name, description, gamification_type, target_value, points_reward, color) VALUES
('Premier Pas', 'Première vente', 'sales_count', 1, 5, '#10B981'),
('Débutant', '10 ventes', 'sales_count', 10, 20, '#3B82F6'),
('Intermédiaire', '50 ventes', 'sales_count', 50, 75, '#8B5CF6'),
('Avancé', '200 ventes', 'sales_count', 200, 150, '#F59E0B'),
('Expert', '500 ventes', 'sales_count', 500, 300, '#EF4444'),
('Maître Vendeur', '1000 ventes', 'sales_count', 1000, 500, '#06B6D4'),
('Record Personnel', 'Nouveau record personnel', 'daily_record', NULL, 50, '#84CC16'),
('Travailleur du Dimanche', 'Vente un dimanche', 'holiday_sales', NULL, 15, '#F97316');

-- =====================================================
-- COMMENTAIRES
-- =====================================================

COMMENT ON TABLE trophies IS 'Table des trophées disponibles';
COMMENT ON TABLE badges IS 'Table des badges disponibles';
COMMENT ON TABLE user_points IS 'Points et niveau des utilisateurs';
COMMENT ON TABLE points_history IS 'Historique des points gagnés/dépensés';
COMMENT ON TABLE user_trophies IS 'Trophées attribués aux utilisateurs';
COMMENT ON TABLE user_badges IS 'Badges attribués aux utilisateurs';
COMMENT ON FUNCTION award_points_manually(UUID, INTEGER, TEXT) IS 'Attribue des points manuellement (Admin uniquement)'; 