-- =====================================================
-- CORRECTION DES TABLES POUR LA PAGE CONFIGURATION
-- Harmonisation entre la page Configuration et la base de données
-- =====================================================

-- Début de la transaction
BEGIN;

-- 1. VÉRIFIER ET CRÉER LA TABLE system_settings SI ELLE N'EXISTE PAS

CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    setting_type TEXT NOT NULL CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
    category TEXT NOT NULL,
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

-- 2. Mettre à jour la contrainte CHECK pour les catégories

DO $$
BEGIN
    -- Supprimer l'ancienne contrainte si elle existe
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'system_settings_category_check'
    ) THEN
        ALTER TABLE system_settings DROP CONSTRAINT system_settings_category_check;
        RAISE NOTICE '✅ Ancienne contrainte category supprimée';
    END IF;
    
    -- Ajouter la nouvelle contrainte avec toutes les catégories
    ALTER TABLE system_settings ADD CONSTRAINT system_settings_category_check 
    CHECK (category IN (
        'general', 'currency', 'sales', 'inventory', 'notifications', 
        'security', 'appearance', 'stores', 'performance', 'maintenance', 'system'
    ));
    RAISE NOTICE '✅ Nouvelle contrainte category ajoutée';
END $$;

-- 3. CRÉER LES INDEX POUR PERFORMANCE

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_public ON system_settings(is_public);

-- 4. CRÉER LE TRIGGER POUR updated_at

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_system_settings_updated_at'
    ) THEN
        CREATE TRIGGER update_system_settings_updated_at
            BEFORE UPDATE ON system_settings
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE '✅ Trigger update_system_settings_updated_at créé';
    ELSE
        RAISE NOTICE 'ℹ️ Trigger update_system_settings_updated_at existe déjà';
    END IF;
END $$;

-- 5. ACTIVER RLS

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 6. CRÉER LES POLITIQUES RLS (seulement si elles n'existent pas)

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Admins can view system settings" ON system_settings;
DROP POLICY IF EXISTS "Admins can modify system settings" ON system_settings;
DROP POLICY IF EXISTS "SuperAdmins can modify system settings" ON system_settings;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON system_settings;
DROP POLICY IF EXISTS "Enable modify access for admins" ON system_settings;

-- SuperAdmin peut tout faire
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'system_settings' 
        AND policyname = 'SuperAdmin system settings full access'
    ) THEN
        CREATE POLICY "SuperAdmin system settings full access" ON system_settings FOR ALL USING (is_superadmin());
        RAISE NOTICE '✅ Politique SuperAdmin system settings créée';
    ELSE
        RAISE NOTICE 'ℹ️ Politique SuperAdmin system settings existe déjà';
    END IF;
END $$;

-- Admin peut gérer
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'system_settings' 
        AND policyname = 'Admin system settings management'
    ) THEN
        CREATE POLICY "Admin system settings management" ON system_settings FOR ALL USING (is_admin());
        RAISE NOTICE '✅ Politique Admin system settings créée';
    ELSE
        RAISE NOTICE 'ℹ️ Politique Admin system settings existe déjà';
    END IF;
END $$;

-- Utilisateurs peuvent voir les paramètres publics
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'system_settings' 
        AND policyname = 'Users can view public system settings'
    ) THEN
        CREATE POLICY "Users can view public system settings" ON system_settings FOR SELECT USING (
            is_public = true AND EXISTS (SELECT 1 FROM users WHERE auth_id = get_current_user_id() AND status = 'active')
        );
        RAISE NOTICE '✅ Politique Users can view public system settings créée';
    ELSE
        RAISE NOTICE 'ℹ️ Politique Users can view public system settings existe déjà';
    END IF;
END $$;

-- 7. INSÉRER LES CONFIGURATIONS MANQUANTES

-- Paramètres multi-magasins
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_required, is_public) VALUES
('stores.enable_transfers', 'true', 'boolean', 'stores', 'Activer les transferts entre magasins', false, true),
('stores.global_stock_alerts', 'true', 'boolean', 'stores', 'Alertes de stock globales', false, true),
('stores.global_stock_threshold', '10', 'number', 'stores', 'Seuil global d''alerte stock', false, true),
('stores.default_opening_time', '09:00', 'string', 'stores', 'Heure d''ouverture par défaut', false, true),
('stores.default_closing_time', '19:00', 'string', 'stores', 'Heure de fermeture par défaut', false, true)
ON CONFLICT (setting_key) DO NOTHING;

-- Paramètres système
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_required, is_public) VALUES
('system.auto_backup', 'true', 'boolean', 'system', 'Sauvegarde automatique', false, true),
('system.debug_mode', 'false', 'boolean', 'system', 'Mode debug', false, true),
('system.enable_real_time_analytics', 'true', 'boolean', 'system', 'Analytics en temps réel', false, true)
ON CONFLICT (setting_key) DO NOTHING;

-- Paramètres de performance
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_required, is_public) VALUES
('performance.gamification_enabled', 'true', 'boolean', 'performance', 'Gamification active', false, true),
('performance.daily_sales_target', '50000', 'number', 'performance', 'Objectif de vente quotidien', false, true),
('performance.performance_threshold', '80', 'number', 'performance', 'Seuil de performance', false, true),
('performance.points_per_sale', '10', 'number', 'performance', 'Points par vente', false, true),
('performance.auto_generate_reports', 'true', 'boolean', 'performance', 'Rapports automatiques', false, true),
('performance.report_schedule', 'weekly', 'string', 'performance', 'Fréquence des rapports', false, true)
ON CONFLICT (setting_key) DO NOTHING;

-- Paramètres de maintenance
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_required, is_public) VALUES
('maintenance.mode', 'false', 'boolean', 'maintenance', 'Mode maintenance', false, true),
('maintenance.message', '', 'string', 'maintenance', 'Message de maintenance', false, true),
('maintenance.admin_only_access', 'false', 'boolean', 'maintenance', 'Accès administrateur uniquement', false, true)
ON CONFLICT (setting_key) DO NOTHING;

-- Paramètres de devise (si ils n'existent pas déjà)
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_required, is_public) VALUES
('currency.default', 'XOF', 'string', 'currency', 'Devise par défaut', true, true),
('currency.symbol', 'CFA', 'string', 'currency', 'Symbole de la devise', false, true),
('currency.position', 'after', 'string', 'currency', 'Position du symbole', false, true),
('currency.decimal_places', '0', 'number', 'currency', 'Nombre de décimales', false, true)
ON CONFLICT (setting_key) DO NOTHING;

-- 8. Mettre à jour les types des paramètres existants

-- Mettre à jour les types boolean
UPDATE system_settings 
SET setting_type = 'boolean' 
WHERE setting_key IN (
    'stores.enable_transfers',
    'stores.global_stock_alerts',
    'system.auto_backup',
    'system.debug_mode',
    'system.enable_real_time_analytics',
    'performance.gamification_enabled',
    'performance.auto_generate_reports',
    'maintenance.mode',
    'maintenance.admin_only_access'
);

-- Mettre à jour les types number
UPDATE system_settings 
SET setting_type = 'number' 
WHERE setting_key IN (
    'stores.global_stock_threshold',
    'performance.daily_sales_target',
    'performance.performance_threshold',
    'performance.points_per_sale',
    'currency.decimal_places'
);

-- 9. VÉRIFICATION FINALE

SELECT 
    'VÉRIFICATION DES CONFIGURATIONS' as diagnostic_type,
    setting_key,
    setting_value,
    setting_type,
    category
FROM system_settings
WHERE setting_key LIKE 'stores.%' 
   OR setting_key LIKE 'system.%' 
   OR setting_key LIKE 'performance.%' 
   OR setting_key LIKE 'maintenance.%' 
   OR setting_key LIKE 'currency.%'
ORDER BY setting_key;

-- Vérifier les politiques RLS
SELECT 
    'POLITIQUES RLS' as diagnostic_type,
    policyname,
    cmd,
    'CONFIGURÉE' as status
FROM pg_policies 
WHERE tablename = 'system_settings'
ORDER BY policyname;

-- Validation de la transaction
COMMIT;

-- Message de fin
SELECT '🎉 CONFIGURATIONS CORRIGÉES AVEC SUCCÈS' as result;
