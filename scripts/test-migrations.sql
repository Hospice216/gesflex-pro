-- =====================================================
-- SCRIPT DE TEST DES MIGRATIONS GESFLEX PRO
-- Vérification de la syntaxe et de la cohérence
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'TEST DES MIGRATIONS GESFLEX PRO';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '🔍 Vérification de la syntaxe...';
    
    -- Vérifier que les types personnalisés existent
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        RAISE EXCEPTION 'Type user_role manquant';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        RAISE EXCEPTION 'Type user_status manquant';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'validation_status') THEN
        RAISE EXCEPTION 'Type validation_status manquant';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        RAISE EXCEPTION 'Type payment_method manquant';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'return_status') THEN
        RAISE EXCEPTION 'Type return_status manquant';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gamification_type') THEN
        RAISE EXCEPTION 'Type gamification_type manquant';
    END IF;
    
    RAISE NOTICE '✅ Types personnalisés vérifiés';
    
    -- Vérifier que les fonctions utilitaires existent
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        RAISE EXCEPTION 'Fonction update_updated_at_column manquante';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_unique_code') THEN
        RAISE EXCEPTION 'Fonction generate_unique_code manquante';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_current_user_id') THEN
        RAISE EXCEPTION 'Fonction get_current_user_id manquante';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_superadmin') THEN
        RAISE EXCEPTION 'Fonction is_superadmin manquante';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
        RAISE EXCEPTION 'Fonction is_admin manquante';
    END IF;
    
    RAISE NOTICE '✅ Fonctions utilitaires vérifiées';
    
    -- Vérifier que les tables principales existent
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE EXCEPTION 'Table users manquante';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stores') THEN
        RAISE EXCEPTION 'Table stores manquante';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        RAISE EXCEPTION 'Table products manquante';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales') THEN
        RAISE EXCEPTION 'Table sales manquante';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_settings') THEN
        RAISE EXCEPTION 'Table system_settings manquante';
    END IF;
    
    RAISE NOTICE '✅ Tables principales vérifiées';
    
    -- Vérifier qu'il n'y a pas de contraintes CHECK avec sous-requêtes
    IF EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        WHERE c.contype = 'c' 
        AND pg_get_constraintdef(c.oid) LIKE '%EXISTS%'
    ) THEN
        RAISE EXCEPTION 'Contraintes CHECK avec sous-requêtes détectées';
    END IF;
    
    RAISE NOTICE '✅ Contraintes CHECK vérifiées';
    
    -- Vérifier que les politiques RLS sont en place
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' 
        AND policyname LIKE '%SuperAdmin%'
    ) THEN
        RAISE EXCEPTION 'Politiques RLS manquantes pour la table users';
    END IF;
    
    RAISE NOTICE '✅ Politiques RLS vérifiées';
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 TOUTES LES VÉRIFICATIONS SONT PASSÉES !';
    RAISE NOTICE '✅ Le système est prêt pour la production';
    RAISE NOTICE '';
    RAISE NOTICE '📋 PROCHAINES ÉTAPES:';
    RAISE NOTICE '1. Créer le SuperAdmin initial';
    RAISE NOTICE '2. Tester les fonctionnalités';
    RAISE NOTICE '3. Adapter le frontend';
    RAISE NOTICE '4. Déployer en production';
    RAISE NOTICE '=====================================================';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ ERREUR DÉTECTÉE: %', SQLERRM;
        RAISE EXCEPTION 'Test des migrations échoué';
END $$; 