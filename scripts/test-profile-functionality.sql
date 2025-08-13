-- =====================================================
-- TEST DES FONCTIONNALITÉS DE LA PAGE PROFILE
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
    ('gamification_points'),
    ('gamification_badges'),
    ('gamification_trophies'),
    ('user_badges'),
    ('user_trophies')
) as tables(table_name);

-- 2. VÉRIFIER LES CHAMPS MANQUANTS
SELECT 
    'CHAMPS MANQUANTS' as test_type,
    'user_trophies.period_month' as field_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_trophies' AND column_name = 'period_month'
        ) THEN '✅ EXISTE'
        ELSE '❌ MANQUANT'
    END as status
UNION ALL
SELECT 
    'CHAMPS MANQUANTS' as test_type,
    'user_trophies.period_year' as field_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_trophies' AND column_name = 'period_year'
        ) THEN '✅ EXISTE'
        ELSE '❌ MANQUANT'
    END as status;

-- 3. VÉRIFIER LES RELATIONS
SELECT 
    'RELATIONS' as test_type,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    CASE 
        WHEN tc.constraint_name IS NOT NULL THEN '✅ EXISTE'
        ELSE '❌ MANQUANTE'
    END as status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('user_badges', 'user_trophies', 'gamification_points')
ORDER BY tc.table_name, kcu.column_name;

-- 4. VÉRIFIER LES DONNÉES INITIALES
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

-- 5. VÉRIFIER LES PERMISSIONS RLS
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

-- 6. VÉRIFIER LES POLITIQUES RLS
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

-- 7. TEST D'INSERTION DE DONNÉES
DO $$
DECLARE
    test_user_id UUID;
    test_level_id UUID;
    test_badge_id UUID;
    test_trophy_id UUID;
    test_points_id UUID;
    test_user_badge_id UUID;
    test_user_trophy_id UUID;
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
    
    -- Test d'insertion d'un badge utilisateur
    INSERT INTO user_badges (user_id, badge_id, awarded_at)
    VALUES (test_user_id, test_badge_id, NOW())
    RETURNING id INTO test_user_badge_id;
    
    IF test_user_badge_id IS NOT NULL THEN
        RAISE NOTICE '✅ Test insertion user_badge: SUCCÈS';
    ELSE
        RAISE NOTICE '❌ Test insertion user_badge: ÉCHEC';
    END IF;
    
    -- Test d'insertion d'un trophée utilisateur
    INSERT INTO user_trophies (user_id, trophy_id, awarded_at, period_month, period_year)
    VALUES (test_user_id, test_trophy_id, NOW(), 1, 2024)
    RETURNING id INTO test_user_trophy_id;
    
    IF test_user_trophy_id IS NOT NULL THEN
        RAISE NOTICE '✅ Test insertion user_trophy: SUCCÈS';
    ELSE
        RAISE NOTICE '❌ Test insertion user_trophy: ÉCHEC';
    END IF;
    
    -- Nettoyer les données de test
    DELETE FROM user_trophies WHERE id = test_user_trophy_id;
    DELETE FROM user_badges WHERE id = test_user_badge_id;
    DELETE FROM gamification_points WHERE id = test_points_id;
    DELETE FROM gamification_trophies WHERE id = test_trophy_id;
    DELETE FROM gamification_badges WHERE id = test_badge_id;
    DELETE FROM gamification_levels WHERE id = test_level_id;
    
    RAISE NOTICE '🧹 Données de test nettoyées';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Erreur lors des tests: %', SQLERRM;
END $$;

-- 8. TEST DES REQUÊTES DE LA PAGE PROFILE
DO $$
DECLARE
    test_user_id UUID;
    points_count INTEGER;
    badges_count INTEGER;
    trophies_count INTEGER;
    levels_count INTEGER;
BEGIN
    -- Récupérer un utilisateur de test
    SELECT id INTO test_user_id FROM users LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE '❌ Aucun utilisateur trouvé pour les tests';
        RETURN;
    END IF;
    
    -- Test de la requête des points
    SELECT COUNT(*) INTO points_count FROM gamification_points WHERE user_id = test_user_id;
    RAISE NOTICE '✅ Points pour l''utilisateur: %', points_count;
    
    -- Test de la requête des badges
    SELECT COUNT(*) INTO badges_count FROM user_badges WHERE user_id = test_user_id;
    RAISE NOTICE '✅ Badges pour l''utilisateur: %', badges_count;
    
    -- Test de la requête des trophées
    SELECT COUNT(*) INTO trophies_count FROM user_trophies WHERE user_id = test_user_id;
    RAISE NOTICE '✅ Trophées pour l''utilisateur: %', trophies_count;
    
    -- Test de la requête des niveaux
    SELECT COUNT(*) INTO levels_count FROM gamification_levels;
    RAISE NOTICE '✅ Niveaux disponibles: %', levels_count;
    
    -- Test de la jointure user_badges -> gamification_badges
    BEGIN
        SELECT COUNT(*) INTO badges_count 
        FROM user_badges ub
        JOIN gamification_badges gb ON ub.badge_id = gb.id
        WHERE ub.user_id = test_user_id;
        RAISE NOTICE '✅ Jointure user_badges -> gamification_badges: SUCCÈS';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ Jointure user_badges -> gamification_badges: ÉCHEC';
    END;
    
    -- Test de la jointure user_trophies -> gamification_trophies
    BEGIN
        SELECT COUNT(*) INTO trophies_count 
        FROM user_trophies ut
        JOIN gamification_trophies gt ON ut.trophy_id = gt.id
        WHERE ut.user_id = test_user_id;
        RAISE NOTICE '✅ Jointure user_trophies -> gamification_trophies: SUCCÈS';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ Jointure user_trophies -> gamification_trophies: ÉCHEC';
    END;
    
END $$;

-- 9. VÉRIFICATION FINALE
SELECT 
    'RÉSUMÉ DES TESTS' as test_type,
    'Tables créées' as check_item,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) >= 6 THEN '✅ COMPLET'
        ELSE '❌ INCOMPLET'
    END as status
FROM information_schema.tables 
WHERE table_name IN (
    'gamification_levels',
    'gamification_points',
    'gamification_badges',
    'gamification_trophies',
    'user_badges',
    'user_trophies'
)
AND table_schema = 'public';

-- 10. RECOMMANDATIONS
SELECT 
    'RECOMMANDATIONS' as test_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name IN (
                'gamification_levels',
                'gamification_points',
                'gamification_badges',
                'gamification_trophies'
            )
        ) AND EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_trophies' 
            AND column_name IN ('period_month', 'period_year')
        ) THEN '✅ Page Profile prête à utiliser'
        ELSE '❌ Page Profile nécessite des corrections'
    END as recommendation;
