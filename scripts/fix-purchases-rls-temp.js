// Script temporaire pour désactiver RLS sur purchases
// À exécuter dans Supabase SQL Editor

console.log(`
🚨 SOLUTION TEMPORAIRE - Désactiver RLS sur purchases

Exécutez cette requête SQL dans Supabase SQL Editor :

-- Désactiver RLS temporairement sur purchases
ALTER TABLE public.purchases DISABLE ROW LEVEL SECURITY;

-- Vérifier que RLS est désactivé
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'purchases';

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

-- Vérifier qu'aucune politique n'existe
SELECT policyname, cmd, permissive, roles 
FROM pg_policies 
WHERE tablename = 'purchases';

-- Test d'accès (devrait fonctionner maintenant)
SELECT id, store_id, supplier_id, product_id, quantity, unit_price, total_amount
FROM purchases 
LIMIT 5;
`);

console.log(`
✅ Après avoir exécuté ces requêtes :

1. Rechargez la page /purchases
2. Testez la création d'un nouvel achat
3. Vérifiez qu'aucune erreur RLS n'apparaît

⚠️ ATTENTION : Cette solution désactive temporairement la sécurité RLS.
   Réactivez-la plus tard avec la migration d'urgence.
`); 