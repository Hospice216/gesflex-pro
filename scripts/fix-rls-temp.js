// Script temporaire pour désactiver RLS sur system_settings
// À exécuter dans Supabase SQL Editor

console.log(`
🚨 SOLUTION TEMPORAIRE - Désactiver RLS

Exécutez cette requête SQL dans Supabase SQL Editor :

-- Désactiver RLS temporairement sur system_settings
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;

-- Vérifier que RLS est désactivé
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'system_settings';

-- Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "Admins can view system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can modify system settings" ON public.system_settings;
DROP POLICY IF EXISTS "SuperAdmins can modify system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.system_settings;
DROP POLICY IF EXISTS "Enable modify access for admins" ON public.system_settings;

-- Vérifier qu'aucune politique n'existe
SELECT policyname, cmd, permissive, roles 
FROM pg_policies 
WHERE tablename = 'system_settings';

-- Test d'accès (devrait fonctionner maintenant)
SELECT setting_key, setting_value, setting_type, category 
FROM system_settings 
LIMIT 5;
`);

console.log(`
✅ Après avoir exécuté ces requêtes :

1. Rechargez la page /configuration
2. Testez la sauvegarde d'un paramètre
3. Vérifiez qu'aucune erreur RLS n'apparaît

⚠️ ATTENTION : Cette solution désactive temporairement la sécurité RLS.
   Réactivez-la plus tard avec la migration d'urgence.
`); 