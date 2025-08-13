-- =====================================================
-- CORRECTION DES PERMISSIONS DE CRÉATION DE MAGASINS
-- Résolution de l'erreur 403 Forbidden lors de la création
-- =====================================================

-- Début de la transaction
BEGIN;

-- 1. VÉRIFIER LES POLITIQUES EXISTANTES
SELECT 
    'POLITIQUES EXISTANTES' as diagnostic_type,
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'stores'
ORDER BY policyname;

-- 2. SUPPRIMER LES POLITIQUES EXISTANTES POUR STORES
DROP POLICY IF EXISTS "SuperAdmin stores full access" ON stores;
DROP POLICY IF EXISTS "Admin stores management" ON stores;
DROP POLICY IF EXISTS "Manager stores access" ON stores;
DROP POLICY IF EXISTS "Vendeur store access" ON stores;

-- 3. CRÉER LES NOUVELLES POLITIQUES RLS POUR STORES

-- SuperAdmin peut tout faire
CREATE POLICY "SuperAdmin stores full access" ON stores
    FOR ALL USING (is_superadmin());

-- Admin peut gérer tous les magasins (CRÉATION, LECTURE, MODIFICATION, SUPPRESSION)
CREATE POLICY "Admin stores management" ON stores
    FOR ALL USING (is_admin());

-- Manager peut voir et modifier ses magasins assignés
CREATE POLICY "Manager stores access" ON stores
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_stores us
            JOIN users u ON u.id = us.user_id
            WHERE u.auth_id = get_current_user_id()
            AND u.role = 'Manager'
            AND us.store_id = stores.id
        )
    );

-- Vendeur peut voir son magasin assigné
CREATE POLICY "Vendeur store access" ON stores
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_stores us
            JOIN users u ON u.id = us.user_id
            WHERE u.auth_id = get_current_user_id()
            AND u.role = 'Vendeur'
            AND us.store_id = stores.id
        )
    );

-- 4. VÉRIFICATION FINALE DES POLITIQUES
SELECT 
    'VÉRIFICATION FINALE' as diagnostic_type,
    policyname,
    cmd,
    permissive,
    roles,
    '✅ CRÉÉE' as status
FROM pg_policies 
WHERE tablename = 'stores'
ORDER BY policyname;

-- 5. TESTER LES PERMISSIONS
-- Vérifier que les politiques sont actives
SELECT 
    'TEST PERMISSIONS' as diagnostic_type,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN '✅ RLS ACTIVÉ'
        ELSE '❌ RLS DÉSACTIVÉ'
    END as status
FROM pg_tables 
WHERE tablename = 'stores';

-- 6. COMPTER LES POLITIQUES
SELECT 
    'COMPTAGE POLITIQUES' as diagnostic_type,
    COUNT(*) as total_policies,
    CASE 
        WHEN COUNT(*) >= 4 THEN '✅ COMPLET'
        ELSE '❌ INCOMPLET'
    END as status
FROM pg_policies 
WHERE tablename = 'stores';

-- Validation de la transaction
COMMIT;

-- Message de fin
SELECT '🎉 PERMISSIONS DE CRÉATION DE MAGASINS CORRIGÉES AVEC SUCCÈS' as result;
