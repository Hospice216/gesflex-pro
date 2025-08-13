// SOLUTION RAPIDE - Désactiver RLS sur purchases
// Copiez et exécutez cette requête SQL dans Supabase SQL Editor

console.log(`
🚨 SOLUTION RAPIDE - Désactiver RLS sur purchases

COPIEZ ET EXÉCUTEZ CETTE REQUÊTE SQL DANS SUPABASE SQL EDITOR :

-- Désactiver RLS sur purchases
ALTER TABLE public.purchases DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.purchases;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.purchases;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.purchases;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.purchases;
DROP POLICY IF EXISTS "Users can view their own purchases" ON public.purchases;
DROP POLICY IF EXISTS "Users can insert their own purchases" ON public.purchases;
DROP POLICY IF EXISTS "Users can update their own purchases" ON public.purchases;
DROP POLICY IF EXISTS "Users can delete their own purchases" ON public.purchases;
DROP POLICY IF EXISTS "Admins can view all purchases" ON public.purchases;
DROP POLICY IF EXISTS "Admins can insert purchases" ON public.purchases;
DROP POLICY IF EXISTS "Admins can update purchases" ON public.purchases;
DROP POLICY IF EXISTS "Admins can delete purchases" ON public.purchases;

-- Vérifier que RLS est désactivé
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'purchases';
`);

console.log(`
✅ APRÈS AVOIR EXÉCUTÉ LA REQUÊTE :

1. Rechargez la page /purchases
2. Testez la création d'un nouvel achat
3. L'erreur 403 devrait disparaître

⚠️ ATTENTION : Cette solution désactive temporairement la sécurité RLS.
   Réactivez-la plus tard avec la migration permanente.
`); 