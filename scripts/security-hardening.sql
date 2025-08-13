-- =====================================================
-- SECURITY HARDENING – STANDARDISATION RLS (IDEMPOTENTE)
-- Objectif: appliquer des politiques claires, séparées (SELECT/INSERT/UPDATE/DELETE)
--           avec USING et WITH CHECK explicites, pour un SaaS propre et sécurisé.
-- Tables ciblées ici: stores, system_settings
-- (Étendre progressivement aux autres tables si nécessaire.)
-- =====================================================

BEGIN;

-- ===== Pré-requis : s'assurer que RLS est activé =====
ALTER TABLE IF EXISTS stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS system_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STORES: Seuls Admin/SuperAdmin peuvent créer/supprimer/modifier.
-- Managers/Vendeurs: lecture limitée aux magasins assignés.
-- =====================================================

-- Nettoyage des anciennes politiques si présentes
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stores'
    ) THEN
        EXECUTE 'DROP POLICY IF EXISTS "SuperAdmin stores full access" ON stores';
        EXECUTE 'DROP POLICY IF EXISTS "Admin stores management" ON stores';
        EXECUTE 'DROP POLICY IF EXISTS "Manager stores access" ON stores';
        EXECUTE 'DROP POLICY IF EXISTS "Vendeur store access" ON stores';
        -- Au cas où des politiques standard existent déjà
        EXECUTE 'DROP POLICY IF EXISTS "stores_select_assigned_for_non_admin" ON stores';
        EXECUTE 'DROP POLICY IF EXISTS "stores_select_admins" ON stores';
        EXECUTE 'DROP POLICY IF EXISTS "stores_insert_admins" ON stores';
        EXECUTE 'DROP POLICY IF EXISTS "stores_update_admins" ON stores';
        EXECUTE 'DROP POLICY IF EXISTS "stores_delete_admins" ON stores';
    END IF;
END$$;

-- SELECT pour Admin/SuperAdmin (accès complet)
CREATE POLICY "stores_select_admins" ON stores
    FOR SELECT
    USING (is_admin() OR is_superadmin());

-- SELECT pour non-admins restreint aux magasins assignés
CREATE POLICY "stores_select_assigned_for_non_admin" ON stores
    FOR SELECT
    USING (
        NOT (is_admin() OR is_superadmin())
        AND EXISTS (
            SELECT 1
            FROM user_stores us
            JOIN users u ON u.id = us.user_id
            WHERE u.auth_id = get_current_user_id()
              AND us.store_id = stores.id
        )
    );

-- INSERT uniquement Admin/SuperAdmin
CREATE POLICY "stores_insert_admins" ON stores
    FOR INSERT
    WITH CHECK (is_admin() OR is_superadmin());

-- UPDATE uniquement Admin/SuperAdmin
CREATE POLICY "stores_update_admins" ON stores
    FOR UPDATE
    USING (is_admin() OR is_superadmin())
    WITH CHECK (is_admin() OR is_superadmin());

-- DELETE uniquement Admin/SuperAdmin
CREATE POLICY "stores_delete_admins" ON stores
    FOR DELETE
    USING (is_admin() OR is_superadmin());


-- =====================================================
-- SYSTEM_SETTINGS: lecture pour tous les utilisateurs authentifiés
-- INSERT/UPDATE: Admin/SuperAdmin; DELETE: SuperAdmin uniquement.
-- =====================================================

-- Nettoyage des anciennes politiques si présentes
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'system_settings'
    ) THEN
        EXECUTE 'DROP POLICY IF EXISTS "system_settings_all" ON system_settings';
        EXECUTE 'DROP POLICY IF EXISTS "system_settings_select_all" ON system_settings';
        EXECUTE 'DROP POLICY IF EXISTS "system_settings_insert_admin" ON system_settings';
        EXECUTE 'DROP POLICY IF EXISTS "system_settings_update_admin" ON system_settings';
        EXECUTE 'DROP POLICY IF EXISTS "system_settings_delete_superadmin" ON system_settings';
    END IF;
END$$;

-- SELECT pour tout utilisateur authentifié
CREATE POLICY "system_settings_select_all" ON system_settings
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- INSERT seulement Admin/SuperAdmin
CREATE POLICY "system_settings_insert_admin" ON system_settings
    FOR INSERT
    WITH CHECK (is_admin() OR is_superadmin());

-- UPDATE seulement Admin/SuperAdmin
CREATE POLICY "system_settings_update_admin" ON system_settings
    FOR UPDATE
    USING (is_admin() OR is_superadmin())
    WITH CHECK (is_admin() OR is_superadmin());

-- DELETE seulement SuperAdmin
CREATE POLICY "system_settings_delete_superadmin" ON system_settings
    FOR DELETE
    USING (is_superadmin());


-- =====================================================
-- Vérifications
-- =====================================================

-- État RLS
SELECT 'RLS_STATUS' AS kind, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('stores','system_settings')
ORDER BY tablename;

-- Politiques
SELECT 'POLICIES' AS kind, policyname, tablename, cmd, permissive
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('stores','system_settings')
ORDER BY tablename, policyname;

COMMIT;

-- Fin
SELECT '✅ SECURITY HARDENING APPLY – stores, system_settings' AS result;


