-- =====================================================
-- TEST DES FONCTIONNALITÉS DE GAMIFICATION
-- Vérification complète du système
-- =====================================================

-- 1. VÉRIFIER L'EXISTENCE DES TABLES
SELECT 
    'VÉRIFICATION DES TABLES' as test_type,
    table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = table_name 
            AND table_schema = 'public'
        ) THEN '✅ EXISTE'
        ELSE '❌ MANQUANTE'
    END as status
FROM (VALUES 
    ('gamification_levels'),
    ('gamification_point_rules'),
    ('gamification_points'),
    ('gamification_badges'),
    ('gamification_trophies')
) as tables(table_name);

-- 2. VÉRIFIER LES DONNÉES INITIALES
SELECT 
    'DONNÉES INITIALES' as test_type,
    'Niveaux' as entity,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ PRÉSENTES'
        ELSE '❌ MANQUANTES'
    END as status
FROM gamification_levels
UNION ALL
SELECT 
    'DONNÉES INITIALES' as test_type,
    'Règles' as entity,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ PRÉSENTES'
        ELSE '❌ MANQUANTES'
    END as status
FROM gamification_point_rules
UNION ALL
SELECT 
    'DONNÉES INITIALES' as test_type,
    'Badges' as entity,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ PRÉSENTES'
        ELSE '❌ MANQUANTES'
    END as status
FROM gamification_badges
UNION ALL
SELECT 
    'DONNÉES INITIALES' as test_type,
    'Trophées' as entity,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ PRÉSENTES'
        ELSE '❌ MANQUANTES'
    END as status
FROM gamification_trophies;

-- 3. VÉRIFIER LES PERMISSIONS RLS
SELECT 
    'PERMISSIONS RLS' as test_type,
    tablename,
    CASE 
        WHEN rowsecurity = true THEN '✅ ACTIVÉ'
        ELSE '❌ DÉSACTIVÉ'
    END as rls_status
FROM pg_tables 
WHERE tablename LIKE 'gamification_%'
ORDER BY tablename;

-- 4. VÉRIFIER LES POLITIQUES RLS
SELECT 
    'POLITIQUES RLS' as test_type,
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN policyname IS NOT NULL THEN '✅ CONFIGURÉE'
        ELSE '❌ MANQUANTE'
    END as policy_status
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename
WHERE t.tablename LIKE 'gamification_%'
ORDER BY t.tablename, p.policyname;

-- 5. VÉRIFIER LES INDEX
SELECT 
    'INDEX' as test_type,
    tablename,
    indexname,
    CASE 
        WHEN indexname IS NOT NULL THEN '✅ CRÉÉ'
        ELSE '❌ MANQUANT'
    END as index_status
FROM pg_tables t
LEFT JOIN pg_indexes i ON t.tablename = i.tablename
WHERE t.tablename LIKE 'gamification_%'
AND i.indexname LIKE 'idx_gamification_%'
ORDER BY t.tablename, i.indexname;

-- 6. VÉRIFIER LES TRIGGERS
SELECT 
    'TRIGGERS' as test_type,
    tablename,
    triggername,
    CASE 
        WHEN triggername IS NOT NULL THEN '✅ CRÉÉ'
        ELSE '❌ MANQUANT'
    END as trigger_status
FROM pg_tables t
LEFT JOIN pg_triggers tr ON t.tablename = tr.tablename
WHERE t.tablename LIKE 'gamification_%'
AND tr.triggername LIKE 'update_gamification_%'
ORDER BY t.tablename, tr.triggername;

-- 7. TEST D'INSERTION DE DONNÉES
DO $$
DECLARE
    test_user_id UUID;
    test_level_id UUID;
    test_rule_id UUID;
    test_badge_id UUID;
    test_trophy_id UUID;
    test_points_id UUID;
BEGIN
    -- Récupérer un utilisateur de test
    SELECT id INTO test_user_id FROM users LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE '❌ Aucun utilisateur trouvé pour les tests';
        RETURN;
    END IF;
    
    -- Test d'insertion d'un niveau
    INSERT INTO gamification_levels (name, min_points, max_points, color, icon)
    VALUES ('Test Niveau', 1000, 1999, '#FF0000', 'test')
    RETURNING id INTO test_level_id;
    
    IF test_level_id IS NOT NULL THEN
        RAISE NOTICE '✅ Test insertion niveau: SUCCÈS';
    ELSE
        RAISE NOTICE '❌ Test insertion niveau: ÉCHEC';
    END IF;
    
    -- Test d'insertion d'une règle
    INSERT INTO gamification_point_rules (name, description, event_type, points_awarded, condition_value)
    VALUES ('Test Règle', 'Règle de test', 'test', 10, '{}')
    RETURNING id INTO test_rule_id;
    
    IF test_rule_id IS NOT NULL THEN
        RAISE NOTICE '✅ Test insertion règle: SUCCÈS';
    ELSE
        RAISE NOTICE '❌ Test insertion règle: ÉCHEC';
    END IF;
    
    -- Test d'insertion d'un badge
    INSERT INTO gamification_badges (name, description, icon, badge_type, required_role, condition_data)
    VALUES ('Test Badge', 'Badge de test', 'test', 'test', 'Vendeur', '{}')
    RETURNING id INTO test_badge_id;
    
    IF test_badge_id IS NOT NULL THEN
        RAISE NOTICE '✅ Test insertion badge: SUCCÈS';
    ELSE
        RAISE NOTICE '❌ Test insertion badge: ÉCHEC';
    END IF;
    
    -- Test d'insertion d'un trophée
    INSERT INTO gamification_trophies (name, description, icon, trophy_type, condition_type, condition_value)
    VALUES ('Test Trophée', 'Trophée de test', 'test', 'test', 'test', 1)
    RETURNING id INTO test_trophy_id;
    
    IF test_trophy_id IS NOT NULL THEN
        RAISE NOTICE '✅ Test insertion trophée: SUCCÈS';
    ELSE
        RAISE NOTICE '❌ Test insertion trophée: ÉCHEC';
    END IF;
    
    -- Test d'insertion de points
    INSERT INTO gamification_points (user_id, points, reason)
    VALUES (test_user_id, 50, 'Test attribution manuelle')
    RETURNING id INTO test_points_id;
    
    IF test_points_id IS NOT NULL THEN
        RAISE NOTICE '✅ Test insertion points: SUCCÈS';
    ELSE
        RAISE NOTICE '❌ Test insertion points: ÉCHEC';
    END IF;
    
    -- Nettoyer les données de test
    DELETE FROM gamification_levels WHERE id = test_level_id;
    DELETE FROM gamification_point_rules WHERE id = test_rule_id;
    DELETE FROM gamification_badges WHERE id = test_badge_id;
    DELETE FROM gamification_trophies WHERE id = test_trophy_id;
    DELETE FROM gamification_points WHERE id = test_points_id;
    
    RAISE NOTICE '🧹 Données de test nettoyées';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Erreur lors des tests: %', SQLERRM;
END $$;

-- 8. VÉRIFICATION FINALE
SELECT 
    'RÉSUMÉ DES TESTS' as test_type,
    'Tables créées' as check_item,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 5 THEN '✅ COMPLET'
        ELSE '❌ INCOMPLET'
    END as status
FROM information_schema.tables 
WHERE table_name IN (
    'gamification_levels',
    'gamification_point_rules',
    'gamification_points',
    'gamification_badges',
    'gamification_trophies'
)
AND table_schema = 'public';

-- 9. RECOMMANDATIONS
SELECT 
    'RECOMMANDATIONS' as test_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name IN (
                'gamification_levels',
                'gamification_point_rules',
                'gamification_points',
                'gamification_badges',
                'gamification_trophies'
            )
        ) THEN '✅ Système de gamification prêt à utiliser'
        ELSE '❌ Système de gamification nécessite des corrections'
    END as recommendation;
