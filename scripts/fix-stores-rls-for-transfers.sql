-- =====================================================
-- CORRECTION RLS STORES POUR LES TRANSFERTS
-- Permettre aux utilisateurs de voir TOUS les magasins pour les transferts
-- tout en gardant les restrictions sur les modifications
-- =====================================================

BEGIN;

-- =====================================================
-- 1. VÉRIFIER L'ÉTAT ACTUEL
-- =====================================================

SELECT 'ÉTAT ACTUEL RLS' as diagnostic_type, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'stores';

SELECT 'POLITIQUES ACTUELLES' as diagnostic_type, policyname, cmd, permissive
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'stores'
ORDER BY policyname;

-- =====================================================
-- 2. SUPPRIMER LA POLITIQUE RESTRICTIVE
-- =====================================================

DROP POLICY IF EXISTS "stores_select_assigned_for_non_admin" ON stores;

-- =====================================================
-- 3. CRÉER UNE NOUVELLE POLITIQUE PERMISSIVE POUR LA LECTURE
-- =====================================================

-- ✅ NOUVELLE POLITIQUE : Tous les utilisateurs authentifiés peuvent voir TOUS les magasins actifs
CREATE POLICY "stores_select_all_authenticated" ON stores
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL  -- Utilisateur authentifié
        AND is_active = true    -- Seulement les magasins actifs
    );

-- =====================================================
-- 4. GARDER LES POLITIQUES RESTRICTIVES POUR LES MODIFICATIONS
-- =====================================================

-- ✅ INSERT : Seulement Admin/SuperAdmin
CREATE POLICY "stores_insert_admins" ON stores
    FOR INSERT
    WITH CHECK (is_admin() OR is_superadmin());

-- ✅ UPDATE : Seulement Admin/SuperAdmin
CREATE POLICY "stores_update_admins" ON stores
    FOR UPDATE
    USING (is_admin() OR is_superadmin())
    WITH CHECK (is_admin() OR is_superadmin());

-- ✅ DELETE : Seulement Admin/SuperAdmin
CREATE POLICY "stores_delete_admins" ON stores
    FOR DELETE
    USING (is_admin() OR is_superadmin());

-- =====================================================
-- 5. VÉRIFICATION FINALE
-- =====================================================

SELECT 'VÉRIFICATION FINALE' as diagnostic_type, policyname, cmd, permissive
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'stores'
ORDER BY policyname;

-- =====================================================
-- 6. TEST DE LA NOUVELLE POLITIQUE
-- =====================================================

-- Vérifier que la table stores est accessible
SELECT 
    'TEST ACCÈS' as test_type,
    COUNT(*) as total_stores,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_stores
FROM stores;

COMMIT;

-- =====================================================
-- RÉSULTAT ATTENDU
-- =====================================================

SELECT '✅ CORRECTION RLS STORES TERMINÉE' as result;
SELECT '✅ Tous les utilisateurs peuvent maintenant voir tous les magasins actifs' as access_granted;
SELECT '✅ Les transferts inter-magasins sont maintenant possibles' as transfers_enabled;
SELECT '✅ La sécurité des modifications est maintenue (Admin/SuperAdmin uniquement)' as security_maintained;
