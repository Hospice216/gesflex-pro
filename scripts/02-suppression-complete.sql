-- ========================================
-- ÉTAPE 2: SUPPRESSION COMPLÈTE ET SÉCURISÉE
-- ========================================

-- ATTENTION: Ce script va supprimer TOUTES les données utilisateurs
-- Assurez-vous d'avoir une sauvegarde si nécessaire

SELECT '=== DÉBUT SUPPRESSION COMPLÈTE ===' as info;

-- 1. Désactiver temporairement les triggers pour éviter les conflits
SELECT '=== DÉSACTIVATION TRIGGERS ===' as info;

-- Supprimer tous les triggers liés aux utilisateurs
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON public.users;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_user_stores_updated_at ON public.user_stores;

-- 2. Supprimer toutes les fonctions liées aux utilisateurs
SELECT '=== SUPPRESSION FONCTIONS ===' as info;

DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_users_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_user_stores_updated_at() CASCADE;

-- 3. Supprimer toutes les politiques RLS sur la table users
SELECT '=== SUPPRESSION POLITIQUES RLS ===' as info;

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "SuperAdmins can do everything" ON public.users;

-- 4. Supprimer toutes les contraintes CHECK problématiques
SELECT '=== SUPPRESSION CONTRAINTES ===' as info;

-- Supprimer les contraintes CHECK par nom
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_name_check;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_auth_id_fkey;

-- 5. Supprimer les contraintes et index liés aux utilisateurs
SELECT '=== SUPPRESSION CONTRAINTES ET INDEX ===' as info;

-- Supprimer d'abord les contraintes qui dépendent des index
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_auth_id_key;

-- Puis supprimer les index
DROP INDEX IF EXISTS users_auth_id_key;
DROP INDEX IF EXISTS users_email_key;
DROP INDEX IF EXISTS idx_users_role;
DROP INDEX IF EXISTS idx_users_status;

-- 6. Supprimer toutes les données utilisateurs
SELECT '=== SUPPRESSION DONNÉES ===' as info;

-- Supprimer dans l'ordre pour respecter les contraintes de clés étrangères
DELETE FROM public.user_trophies;
DELETE FROM public.user_badges;
DELETE FROM public.user_points;
DELETE FROM public.user_stores;
DELETE FROM public.sales;
DELETE FROM public.returns;
DELETE FROM public.purchases;
DELETE FROM public.arrival_validations;
DELETE FROM public.store_transfers;
DELETE FROM public.inventory_adjustments;
DELETE FROM public.expenses;
DELETE FROM public.users;

-- 7. Vérifier que la table users est vide
SELECT '=== VÉRIFICATION SUPPRESSION ===' as info;

SELECT 
    'Nombre d''utilisateurs restants' as info,
    COUNT(*) as count
FROM public.users;

-- 8. Réinitialiser les séquences si nécessaire
SELECT '=== RÉINITIALISATION SÉQUENCES ===' as info;

-- Vérifier s'il y a des séquences à réinitialiser
SELECT 
    sequence_name,
    last_value
FROM information_schema.sequences 
WHERE sequence_schema = 'public'
AND sequence_name LIKE '%users%';

-- 9. Nettoyer les métadonnées
SELECT '=== NETTOYAGE MÉTADONNÉES ===' as info;

-- Vérifier qu'il n'y a plus de références orphelines
SELECT 
    'Vérification références orphelines' as info,
    COUNT(*) as orphelins
FROM information_schema.table_constraints 
WHERE constraint_name LIKE '%users%'
AND table_schema = 'public';

-- 10. Confirmation de suppression complète
SELECT '=== CONFIRMATION SUPPRESSION ===' as info;

SELECT 
    '✅ Suppression terminée' as status,
    'Tous les triggers, fonctions, politiques RLS et données utilisateurs ont été supprimés' as details;

-- 11. Vérification finale
SELECT '=== VÉRIFICATION FINALE ===' as info;

-- Vérifier qu'il ne reste plus de triggers
SELECT 
    'Triggers restants' as info,
    COUNT(*) as count
FROM information_schema.triggers 
WHERE trigger_name LIKE '%user%';

-- Vérifier qu'il ne reste plus de fonctions
SELECT 
    'Fonctions restantes' as info,
    COUNT(*) as count
FROM information_schema.routines 
WHERE routine_name LIKE '%user%'
AND routine_schema = 'public';

-- Vérifier qu'il ne reste plus de politiques RLS
SELECT 
    'Politiques RLS restantes' as info,
    COUNT(*) as count
FROM pg_policies 
WHERE tablename = 'users'
AND schemaname = 'public';

SELECT '=== SUPPRESSION COMPLÈTE TERMINÉE ===' as info; 