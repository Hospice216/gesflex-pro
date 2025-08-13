# 🔧 Guide de Dépannage - GesFlex Pro

## Erreur 500 lors de l'inscription

### Problème
```
POST https://qxxldshkowjbcbnchokg.supabase.co/auth/v1/signup?redirect_to=http%3A%2F%2Flocalhost%3A8080%2F 500 (Internal Server Error)
```

### Solutions

#### 1. Vérifier l'état de la base de données

1. **Accéder à Supabase Dashboard**
   - Allez sur https://supabase.com/dashboard
   - Sélectionnez votre projet `qxxldshkowjbcbnchokg`

2. **Vérifier les migrations**
   - Allez dans "SQL Editor"
   - Exécutez le script `scripts/check-database-status.sql`

#### 2. Corriger les problèmes d'inscription

1. **Exécuter le script de correction**
   - Dans "SQL Editor" de Supabase
   - Copiez et exécutez le contenu de `scripts/quick-fix-signup.sql`

2. **Vérifier les résultats**
   - Le script affichera un rapport de vérification
   - Tous les éléments doivent afficher "OK"

#### 3. Vérifications manuelles

1. **Vérifier la table users**
   ```sql
   SELECT * FROM public.users LIMIT 5;
   ```

2. **Vérifier le trigger**
   ```sql
   SELECT trigger_name FROM information_schema.triggers 
   WHERE trigger_name = 'handle_new_user';
   ```

3. **Vérifier les types ENUM**
   ```sql
   SELECT typname FROM pg_type 
   WHERE typname IN ('user_role', 'user_status');
   ```

#### 4. Problèmes courants et solutions

##### Problème : Types ENUM manquants
```sql
-- Créer les types manquants
CREATE TYPE user_role AS ENUM ('SuperAdmin', 'Admin', 'Manager', 'Vendeur');
CREATE TYPE user_status AS ENUM ('pending', 'active', 'rejected');
```

##### Problème : Trigger manquant
```sql
-- Recréer le trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_id, email, first_name, last_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'Vendeur',
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

##### Problème : Politiques RLS incorrectes
```sql
-- Recréer les politiques
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth_id = auth.uid());

CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_id = auth.uid() 
            AND role IN ('SuperAdmin', 'Admin')
        )
    );
```

#### 5. Test de l'inscription

1. **Après avoir exécuté les corrections**
   - Retournez sur http://localhost:8080/
   - Essayez de créer un nouveau compte
   - Vérifiez que l'inscription fonctionne

2. **Vérifier les logs**
   - Dans Supabase Dashboard, allez dans "Logs"
   - Vérifiez les erreurs récentes

#### 6. Créer un SuperAdmin manuellement

Si l'inscription fonctionne mais qu'aucun SuperAdmin n'existe :

```sql
-- Créer un SuperAdmin (remplacez par vos informations)
INSERT INTO public.users (auth_id, email, first_name, last_name, role, status)
VALUES (
    'votre-auth-id-ici',
    'votre-email@example.com',
    'Votre',
    'Nom',
    'SuperAdmin',
    'active'
);
```

#### 7. Contact et support

Si les problèmes persistent :
1. Vérifiez les logs Supabase
2. Vérifiez la console du navigateur (F12)
3. Vérifiez les erreurs réseau dans l'onglet Network

### Prévention

Pour éviter ces problèmes à l'avenir :
1. Exécutez toujours les migrations dans l'ordre
2. Vérifiez l'état de la base de données après chaque migration
3. Testez l'inscription après chaque modification importante 