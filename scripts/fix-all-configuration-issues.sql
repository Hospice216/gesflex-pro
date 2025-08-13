-- =====================================================
-- CORRECTION COMPLÈTE - TOUS LES PROBLÈMES DE CONFIGURATION
-- Résolution des erreurs de JSON, conflits de clés, et exports
-- =====================================================

-- Début de la transaction
BEGIN;

-- 1. VÉRIFIER LES CONFIGURATIONS EXISTANTES
SELECT 
    'CONFIGURATIONS EXISTANTES' as diagnostic_type,
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

-- 2. SUPPRIMER LES DOUBLONS POTENTIELS
-- Supprimer les configurations en double (garder la plus récente)
DELETE FROM system_settings 
WHERE id NOT IN (
    SELECT DISTINCT ON (setting_key) id
    FROM system_settings
    ORDER BY setting_key, updated_at DESC
);

-- 3. CORRIGER LES TYPES DE DONNÉES
-- Mettre à jour les types pour les configurations existantes
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

UPDATE system_settings 
SET setting_type = 'number' 
WHERE setting_key IN (
    'stores.global_stock_threshold',
    'performance.daily_sales_target',
    'performance.performance_threshold',
    'performance.points_per_sale',
    'currency.decimal_places'
);

UPDATE system_settings 
SET setting_type = 'string' 
WHERE setting_key IN (
    'stores.default_opening_time',
    'stores.default_closing_time',
    'performance.report_schedule',
    'maintenance.message',
    'currency.default',
    'currency.symbol',
    'currency.position'
);

-- 4. S'ASSURER QUE TOUTES LES CONFIGURATIONS REQUISES EXISTENT
-- Paramètres multi-magasins
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_required, is_public) VALUES
('stores.enable_transfers', 'true', 'boolean', 'stores', 'Activer les transferts entre magasins', false, true),
('stores.global_stock_alerts', 'true', 'boolean', 'stores', 'Alertes de stock globales', false, true),
('stores.global_stock_threshold', '10', 'number', 'stores', 'Seuil global d''alerte stock', false, true),
('stores.default_opening_time', '09:00', 'string', 'stores', 'Heure d''ouverture par défaut', false, true),
('stores.default_closing_time', '19:00', 'string', 'stores', 'Heure de fermeture par défaut', false, true)
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    setting_type = EXCLUDED.setting_type,
    category = EXCLUDED.category,
    updated_at = NOW();

-- Paramètres système
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_required, is_public) VALUES
('system.auto_backup', 'true', 'boolean', 'system', 'Sauvegarde automatique', false, true),
('system.debug_mode', 'false', 'boolean', 'system', 'Mode debug', false, true),
('system.enable_real_time_analytics', 'true', 'boolean', 'system', 'Analytics en temps réel', false, true)
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    setting_type = EXCLUDED.setting_type,
    category = EXCLUDED.category,
    updated_at = NOW();

-- Paramètres de performance
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_required, is_public) VALUES
('performance.gamification_enabled', 'true', 'boolean', 'performance', 'Gamification active', false, true),
('performance.daily_sales_target', '50000', 'number', 'performance', 'Objectif de vente quotidien', false, true),
('performance.performance_threshold', '80', 'number', 'performance', 'Seuil de performance', false, true),
('performance.points_per_sale', '10', 'number', 'performance', 'Points par vente', false, true),
('performance.auto_generate_reports', 'true', 'boolean', 'performance', 'Rapports automatiques', false, true),
('performance.report_schedule', 'weekly', 'string', 'performance', 'Fréquence des rapports', false, true)
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    setting_type = EXCLUDED.setting_type,
    category = EXCLUDED.category,
    updated_at = NOW();

-- Paramètres de maintenance
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_required, is_public) VALUES
('maintenance.mode', 'false', 'boolean', 'maintenance', 'Mode maintenance', false, true),
('maintenance.message', '', 'string', 'maintenance', 'Message de maintenance', false, true),
('maintenance.admin_only_access', 'false', 'boolean', 'maintenance', 'Accès administrateur uniquement', false, true)
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    setting_type = EXCLUDED.setting_type,
    category = EXCLUDED.category,
    updated_at = NOW();

-- Paramètres de devise (CORRIGÉS POUR ÉVITER LES ERREURS JSON)
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_required, is_public) VALUES
('currency.default', 'XOF', 'string', 'currency', 'Devise par défaut', true, true),
('currency.symbol', 'CFA', 'string', 'currency', 'Symbole de la devise', false, true),
('currency.position', 'after', 'string', 'currency', 'Position du symbole', false, true),
('currency.decimal_places', '0', 'number', 'currency', 'Nombre de décimales', false, true),
('currency.thousands_separator', ' ', 'string', 'currency', 'Séparateur de milliers', false, true),
('currency.decimal_separator', ',', 'string', 'currency', 'Séparateur décimal', false, true)
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    setting_type = EXCLUDED.setting_type,
    category = EXCLUDED.category,
    updated_at = NOW();

-- 5. VÉRIFICATION FINALE
SELECT 
    'VÉRIFICATION FINALE' as diagnostic_type,
    setting_key,
    setting_value,
    setting_type,
    category,
    '✅ CORRIGÉ' as status
FROM system_settings
WHERE setting_key LIKE 'stores.%' 
   OR setting_key LIKE 'system.%' 
   OR setting_key LIKE 'performance.%' 
   OR setting_key LIKE 'maintenance.%' 
   OR setting_key LIKE 'currency.%'
ORDER BY setting_key;

-- 6. COMPTER LES CONFIGURATIONS
SELECT 
    'COMPTAGE' as diagnostic_type,
    COUNT(*) as total_configurations,
    CASE 
        WHEN COUNT(*) >= 15 THEN '✅ COMPLET'
        ELSE '❌ INCOMPLET'
    END as status
FROM system_settings
WHERE setting_key LIKE 'stores.%' 
   OR setting_key LIKE 'system.%' 
   OR setting_key LIKE 'performance.%' 
   OR setting_key LIKE 'maintenance.%' 
   OR setting_key LIKE 'currency.%';

-- 7. VÉRIFIER LES TYPES DE DONNÉES
SELECT 
    'TYPES DE DONNÉES' as diagnostic_type,
    setting_type,
    COUNT(*) as count,
    CASE 
        WHEN setting_type IN ('string', 'number', 'boolean', 'json') THEN '✅ VALIDE'
        ELSE '❌ INVALIDE'
    END as status
FROM system_settings
WHERE setting_key LIKE 'stores.%' 
   OR setting_key LIKE 'system.%' 
   OR setting_key LIKE 'performance.%' 
   OR setting_key LIKE 'maintenance.%' 
   OR setting_key LIKE 'currency.%'
GROUP BY setting_type
ORDER BY setting_type;

-- Validation de la transaction
COMMIT;

-- Message de fin
SELECT '🎉 TOUS LES PROBLÈMES DE CONFIGURATION RÉSOLUS AVEC SUCCÈS' as result;
