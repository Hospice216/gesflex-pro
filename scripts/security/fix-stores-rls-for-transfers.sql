-- 🔧 Script de Correction RLS pour les Magasins - GesFlex Pro
-- 📋 Ce script corrige les permissions RLS pour permettre les transferts entre tous les magasins

-- 1. Vérifier les politiques existantes
DO $$
DECLARE
    policy_name text;
BEGIN
    -- Lister toutes les politiques existantes sur la table stores
    RAISE NOTICE 'Politiques existantes sur la table stores:';
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'stores'
    LOOP
        RAISE NOTICE '  - %', policy_name;
    END LOOP;
END $$;

-- 2. Supprimer les politiques existantes qui pourraient causer des conflits
DROP POLICY IF EXISTS stores_insert_admins ON stores;
DROP POLICY IF EXISTS stores_select_assigned_for_non_admin ON stores;
DROP POLICY IF EXISTS stores_select_all_authenticated ON stores;
DROP POLICY IF EXISTS stores_update_admins ON stores;
DROP POLICY IF EXISTS stores_delete_admins ON stores;

-- 3. Créer les nouvelles politiques RLS pour les magasins
-- Politique pour la sélection (lecture) - Tous les utilisateurs authentifiés peuvent voir tous les magasins actifs
CREATE POLICY stores_select_all_authenticated ON stores
    FOR SELECT
    TO authenticated
    USING (is_active = true);

-- Politique pour l'insertion - Seuls les admins peuvent créer des magasins
CREATE POLICY stores_insert_admins ON stores
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('Admin', 'SuperAdmin')
        )
    );

-- Politique pour la mise à jour - Seuls les admins peuvent modifier des magasins
CREATE POLICY stores_update_admins ON stores
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('Admin', 'SuperAdmin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('Admin', 'SuperAdmin')
        )
    );

-- Politique pour la suppression - Seuls les SuperAdmin peuvent supprimer des magasins
CREATE POLICY stores_delete_superadmin ON stores
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'SuperAdmin'
        )
    );

-- 4. Vérifier que les politiques ont été créées
DO $$
DECLARE
    policy_name text;
BEGIN
    RAISE NOTICE 'Nouvelles politiques créées sur la table stores:';
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'stores'
    LOOP
        RAISE NOTICE '  ✅ %', policy_name;
    END LOOP;
END $$;

-- 5. Tester l'accès aux magasins
-- Cette requête devrait maintenant fonctionner pour tous les utilisateurs authentifiés
SELECT 
    'Test d''accès aux magasins' as test_description,
    COUNT(*) as nombre_magasins_visibles
FROM stores 
WHERE is_active = true;

-- 6. Message de confirmation
DO $$
BEGIN
    RAISE NOTICE '🔧 Correction RLS terminée avec succès !';
    RAISE NOTICE '✅ Politiques RLS mises à jour pour la table stores';
    RAISE NOTICE '🌐 Tous les utilisateurs peuvent maintenant voir tous les magasins actifs';
    RAISE NOTICE '🚀 Les transferts entre magasins devraient maintenant fonctionner';
END $$;
