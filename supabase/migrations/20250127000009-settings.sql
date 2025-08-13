-- =====================================================
-- GESFLEX PRO - PARAMÈTRES SYSTÈME ET DEVISE
-- Configuration système et gestion des devises
-- =====================================================

-- =====================================================
-- TABLE PARAMÈTRES SYSTÈME
-- =====================================================

CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    setting_type TEXT NOT NULL CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
    category TEXT NOT NULL CHECK (category IN ('general', 'currency', 'sales', 'inventory', 'notifications', 'security', 'appearance')),
    description TEXT,
    is_required BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Contraintes
    CONSTRAINT system_settings_key_check CHECK (length(setting_key) >= 2),
    CONSTRAINT system_settings_value_check CHECK (length(setting_value) >= 0)
);

-- =====================================================
-- TABLE DEVISES
-- =====================================================

CREATE TABLE currencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    "position" TEXT NOT NULL DEFAULT 'after' CHECK ("position" IN ('before', 'after')),
    decimal_places INTEGER NOT NULL DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Contraintes
    CONSTRAINT currencies_code_check CHECK (length(code) >= 3 AND length(code) <= 3),
    CONSTRAINT currencies_symbol_check CHECK (length(symbol) >= 1 AND length(symbol) <= 5),
    CONSTRAINT currencies_decimal_places_check CHECK (decimal_places >= 0 AND decimal_places <= 4)
);

-- =====================================================
-- INDEX POUR PERFORMANCE
-- =====================================================

CREATE INDEX idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX idx_system_settings_category ON system_settings(category);
CREATE INDEX idx_system_settings_public ON system_settings(is_public);
CREATE INDEX idx_currencies_code ON currencies(code);
CREATE INDEX idx_currencies_default ON currencies(is_default);
CREATE INDEX idx_currencies_active ON currencies(is_active);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_currencies_updated_at
    BEFORE UPDATE ON currencies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour s'assurer qu'il n'y a qu'une seule devise par défaut
CREATE OR REPLACE FUNCTION ensure_single_default_currency()
RETURNS TRIGGER AS $$
BEGIN
    -- Si on définit une nouvelle devise par défaut
    IF NEW.is_default = true THEN
        -- Désactiver toutes les autres devises par défaut
        UPDATE currencies 
        SET is_default = false 
        WHERE id != NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_default_currency
    BEFORE INSERT OR UPDATE ON currencies
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_currency();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Activer RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLITIQUES RLS POUR SYSTEM_SETTINGS
-- =====================================================

-- SuperAdmin peut tout faire
CREATE POLICY "SuperAdmin system settings full access" ON system_settings
    FOR ALL USING (is_superadmin());

-- Admin peut gérer les paramètres système
CREATE POLICY "Admin system settings management" ON system_settings
    FOR ALL USING (is_admin());

-- Tous les utilisateurs actifs peuvent voir les paramètres publics
CREATE POLICY "Users can view public settings" ON system_settings
    FOR SELECT USING (
        is_public = true AND
        EXISTS (SELECT 1 FROM users WHERE auth_id = get_current_user_id() AND status = 'active')
    );

-- =====================================================
-- POLITIQUES RLS POUR CURRENCIES
-- =====================================================

-- SuperAdmin peut tout faire
CREATE POLICY "SuperAdmin currencies full access" ON currencies
    FOR ALL USING (is_superadmin());

-- Admin peut gérer les devises
CREATE POLICY "Admin currencies management" ON currencies
    FOR ALL USING (is_admin());

-- Tous les utilisateurs actifs peuvent voir les devises actives
CREATE POLICY "Users can view active currencies" ON currencies
    FOR SELECT USING (
        is_active = true AND
        EXISTS (SELECT 1 FROM users WHERE auth_id = get_current_user_id() AND status = 'active')
    );

-- =====================================================
-- FONCTIONS DE GESTION
-- =====================================================

-- Fonction pour obtenir un paramètre système
CREATE OR REPLACE FUNCTION get_system_setting(p_key TEXT)
RETURNS TEXT AS $$
DECLARE
    setting_value TEXT;
BEGIN
    SELECT setting_value INTO setting_value 
    FROM system_settings 
    WHERE setting_key = p_key AND is_public = true;
    
    RETURN setting_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour définir un paramètre système
CREATE OR REPLACE FUNCTION set_system_setting(
    p_key TEXT,
    p_value TEXT,
    p_type TEXT DEFAULT 'string',
    p_category TEXT DEFAULT 'general',
    p_description TEXT DEFAULT NULL,
    p_is_required BOOLEAN DEFAULT false,
    p_is_public BOOLEAN DEFAULT true
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
        RAISE EXCEPTION 'Seuls les Admin et SuperAdmin peuvent modifier les paramètres système';
    END IF;
    
    -- Insérer ou mettre à jour le paramètre
    INSERT INTO system_settings (
        setting_key, setting_value, setting_type, category, 
        description, is_required, is_public, created_by
    )
    VALUES (
        p_key, p_value, p_type, p_category, 
        p_description, p_is_required, p_is_public, current_user_id
    )
    ON CONFLICT (setting_key) 
    DO UPDATE SET 
        setting_value = EXCLUDED.setting_value,
        setting_type = EXCLUDED.setting_type,
        category = EXCLUDED.category,
        description = EXCLUDED.description,
        is_required = EXCLUDED.is_required,
        is_public = EXCLUDED.is_public,
        updated_at = now();
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir la devise par défaut
CREATE OR REPLACE FUNCTION get_default_currency()
RETURNS TABLE (
    code TEXT,
    name TEXT,
    symbol TEXT,
    "position" TEXT,
    decimal_places INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.code,
        c.name,
        c.symbol,
        c."position",
        c.decimal_places
    FROM currencies c
    WHERE c.is_default = true AND c.is_active = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour formater un montant selon la devise par défaut
CREATE OR REPLACE FUNCTION format_currency(amount DECIMAL(10,2))
RETURNS TEXT AS $$
DECLARE
    currency_record RECORD;
    formatted_amount TEXT;
BEGIN
    -- Récupérer la devise par défaut
    SELECT * INTO currency_record FROM currencies WHERE is_default = true AND is_active = true LIMIT 1;
    
    IF NOT FOUND THEN
        -- Devise par défaut non trouvée, utiliser un format basique
        RETURN amount::TEXT || ' XOF';
    END IF;
    
    -- Formater le montant
    formatted_amount := to_char(amount, 'FM999,999,999,999,999.' || repeat('0', currency_record.decimal_places));
    
    -- Ajouter le symbole selon la position
    IF currency_record."position" = 'before' THEN
        RETURN currency_record.symbol || ' ' || formatted_amount;
    ELSE
        RETURN formatted_amount || ' ' || currency_record.symbol;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir tous les paramètres d'une catégorie
CREATE OR REPLACE FUNCTION get_settings_by_category(p_category TEXT)
RETURNS TABLE (
    setting_key TEXT,
    setting_value TEXT,
    setting_type TEXT,
    description TEXT,
    is_required BOOLEAN,
    is_public BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ss.setting_key,
        ss.setting_value,
        ss.setting_type,
        ss.description,
        ss.is_required,
        ss.is_public
    FROM system_settings ss
    WHERE ss.category = p_category
    AND (ss.is_public = true OR 
         EXISTS (
             SELECT 1 FROM users 
             WHERE auth_id = get_current_user_id() 
             AND role IN ('Admin', 'SuperAdmin')
         ))
    ORDER BY ss.setting_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- DONNÉES INITIALES
-- =====================================================

-- Insérer la devise par défaut (XOF/CFA)
INSERT INTO currencies (code, name, symbol, "position", decimal_places, is_default, is_active) VALUES
('XOF', 'Franc CFA', 'CFA', 'after', 0, true, true),
('EUR', 'Euro', '€', 'before', 2, false, true),
('USD', 'Dollar US', '$', 'before', 2, false, true),
('GBP', 'Livre Sterling', '£', 'before', 2, false, true);

-- Insérer les paramètres système de base
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_required, is_public) VALUES
-- Paramètres généraux
('app.name', 'GesFlex Pro', 'string', 'general', 'Nom de l''application', true, true),
('app.version', '1.0.0', 'string', 'general', 'Version de l''application', true, true),
('app.timezone', 'Africa/Abidjan', 'string', 'general', 'Fuseau horaire par défaut', true, true),

-- Paramètres de devise
('currency.default', 'XOF', 'string', 'currency', 'Devise par défaut', true, true),
('currency.symbol', 'CFA', 'string', 'currency', 'Symbole de la devise', false, true),
('currency.position', 'after', 'string', 'currency', 'Position du symbole', false, true),
('currency.decimal_places', '0', 'number', 'currency', 'Nombre de décimales', false, true),

-- Paramètres de vente
('sales.tax_rate', '18', 'number', 'sales', 'Taux de TVA par défaut (%)', false, true),
('sales.minimum_discount_reason', 'true', 'boolean', 'sales', 'Raison obligatoire pour les réductions', false, true),
('sales.auto_generate_codes', 'true', 'boolean', 'sales', 'Génération automatique des codes', false, true),

-- Paramètres d'inventaire
('inventory.low_stock_threshold', '10', 'number', 'inventory', 'Seuil d''alerte stock bas', false, true),
('inventory.auto_assign_products', 'true', 'boolean', 'inventory', 'Assignation automatique des produits', false, true),
('inventory.enable_transfers', 'true', 'boolean', 'inventory', 'Activer les transferts entre magasins', false, true),

-- Paramètres de notifications
('notifications.email_enabled', 'false', 'boolean', 'notifications', 'Activer les notifications par email', false, true),
('notifications.sms_enabled', 'false', 'boolean', 'notifications', 'Activer les notifications par SMS', false, true),
('notifications.low_stock_alerts', 'true', 'boolean', 'notifications', 'Alertes de stock bas', false, true),

-- Paramètres de sécurité
('security.session_timeout', '3600', 'number', 'security', 'Timeout de session (secondes)', false, true),
('security.password_min_length', '8', 'number', 'security', 'Longueur minimale des mots de passe', false, true),
('security.require_strong_password', 'true', 'boolean', 'security', 'Mots de passe forts obligatoires', false, true),

-- Paramètres d'apparence
('appearance.theme', 'light', 'string', 'appearance', 'Thème par défaut', false, true),
('appearance.language', 'fr', 'string', 'appearance', 'Langue par défaut', false, true),
('appearance.date_format', 'DD/MM/YYYY', 'string', 'appearance', 'Format de date', false, true);

-- =====================================================
-- COMMENTAIRES
-- =====================================================

COMMENT ON TABLE system_settings IS 'Table des paramètres système configurables';
COMMENT ON TABLE currencies IS 'Table des devises supportées';
COMMENT ON FUNCTION get_system_setting(TEXT) IS 'Récupère un paramètre système public';
COMMENT ON FUNCTION set_system_setting(TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN) IS 'Définit un paramètre système (Admin uniquement)';
COMMENT ON FUNCTION get_default_currency() IS 'Récupère la devise par défaut';
COMMENT ON FUNCTION format_currency(DECIMAL) IS 'Formate un montant selon la devise par défaut';
COMMENT ON FUNCTION get_settings_by_category(TEXT) IS 'Récupère tous les paramètres d''une catégorie'; 