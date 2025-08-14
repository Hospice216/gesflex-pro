# 🚨 Guide d'Action Immédiate - Erreur RLS

## ❌ Problème Actuel

Vous recevez l'erreur :
```
POST https://qxxldshkowjbcbnchokg.supabase.co/rest/v1/system_settings 403 (Forbidden)
Error: Erreur de sécurité: Vérifiez que vous avez les permissions nécessaires
```

## 🔧 Solution Immédiate

### Étape 1: Exécuter la Migration d'Urgence

```bash
# Dans Supabase Dashboard ou SQL Editor, exécutez :
supabase db reset

# OU exécutez spécifiquement la migration d'urgence :
# 20250127000010-emergency-fix-rls-policies.sql
```

### Étape 2: Vérifier l'Utilisateur

Assurez-vous que votre utilisateur a le rôle `Admin` ou `SuperAdmin` :

```sql
-- Vérifier votre rôle actuel
SELECT id, email, role 
FROM users 
WHERE id = auth.uid();

-- Si aucun utilisateur Admin/SuperAdmin n'existe, en créer un :
INSERT INTO users (id, email, role, created_at, updated_at)
VALUES (
  'votre-user-id', 
  'votre-email@example.com', 
  'SuperAdmin',
  NOW(),
  NOW()
);
```

### Étape 3: Test Rapide

1. **Rechargez la page** `/configuration`
2. **Vérifiez que** :
   - ✅ Les boutons "Sauvegarder" et "Réinitialiser" sont **activés**
   - ✅ Aucun message d'avertissement de permissions
3. **Testez la sauvegarde** en modifiant un paramètre

## 🔍 Diagnostic Automatique

Exécutez le script de diagnostic :

```bash
node scripts/quick-rls-check.js
```

Ce script vérifiera :
- ✅ Accès à la table `system_settings`
- ✅ Existence d'utilisateurs Admin/SuperAdmin
- ✅ Fonctionnement des politiques RLS

## 🚨 Si le Problème Persiste

### Option A: Désactiver Temporairement RLS

```sql
-- Désactiver RLS temporairement (solution d'urgence)
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;

-- Réactiver après avoir créé un utilisateur Admin
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
```

### Option B: Politique Permissive Temporaire

```sql
-- Créer une politique permissive temporaire
DROP POLICY IF EXISTS "Enable modify access for admins" ON public.system_settings;

CREATE POLICY "Temporary permissive policy" ON public.system_settings
  FOR ALL USING (auth.role() = 'authenticated');
```

## ✅ Vérification Finale

Après avoir appliqué les corrections :

1. **Connectez-vous** en tant que SuperAdmin
2. **Allez sur** `/configuration`
3. **Modifiez** un paramètre (ex: Devise par défaut)
4. **Sauvegardez** - vous devriez voir le toast "Configuration sauvegardée"
5. **Vérifiez** qu'aucune erreur RLS n'apparaît dans la console

## 📞 Support

Si le problème persiste après ces étapes :

1. **Vérifiez les logs** de la migration d'urgence
2. **Exécutez** le diagnostic automatique
3. **Vérifiez** que votre utilisateur a bien le rôle `SuperAdmin`
4. **Testez** avec un nouvel utilisateur Admin

---

**💡 Conseil** : La migration d'urgence corrige automatiquement tous les problèmes RLS courants. 