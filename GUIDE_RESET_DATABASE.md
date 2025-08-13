# 🗑️ GUIDE DE RÉINITIALISATION COMPLÈTE DE LA BASE DE DONNÉES

## ⚠️ ATTENTION
**Ce processus supprime TOUTES les données existantes !**

## 📋 PROCÉDURE COMPLÈTE

### **ÉTAPE 1 : Vider la base de données**

#### **Option A : Via Supabase Dashboard (Recommandé)**

1. **Aller sur Supabase Dashboard**
   - Connectez-vous à votre projet Supabase
   - Allez dans l'onglet "SQL Editor"

2. **Exécuter le script de reset**
   - Copiez le contenu de `scripts/reset-database.sql`
   - Collez-le dans l'éditeur SQL
   - Cliquez sur "Run"

#### **Option B : Via Supabase CLI**

```bash
# Installer Supabase CLI si pas déjà fait
npm install -g supabase

# Se connecter à votre projet
supabase login
supabase link --project-ref YOUR_PROJECT_ID

# Exécuter le script de reset
supabase db reset
```

### **ÉTAPE 2 : Appliquer les nouvelles migrations**

#### **Option A : Via Supabase Dashboard**

1. **Exécuter les migrations une par une**
   - Dans l'éditeur SQL, exécutez chaque fichier dans l'ordre :
     - `20250127000001-base-setup.sql`
     - `20250127000002-auth-users.sql`
     - `20250127000003-stores-suppliers.sql`
     - `20250127000004-products-categories.sql`
     - `20250127000005-purchases-arrivals.sql`
     - `20250127000006-sales-returns.sql`
     - `20250127000007-transfers.sql`
     - `20250127000008-gamification.sql`
     - `20250127000009-settings.sql`
     - `20250127000010-final-rls-policies.sql`

#### **Option B : Via Supabase CLI**

```bash
# Appliquer toutes les migrations
supabase db push
```

### **ÉTAPE 3 : Créer le SuperAdmin initial**

```sql
-- Remplacez par vos informations
SELECT create_initial_superadmin('votre@email.com', 'Votre Prénom', 'Votre Nom');
```

### **ÉTAPE 4 : Vérifier l'intégrité**

```sql
-- Vérifier que tout fonctionne
SELECT * FROM validate_data_integrity();

-- Voir les statistiques système
SELECT * FROM get_system_stats();
```

## 🔧 COMMANDES UTILES

### **Vérifier l'état des migrations**
```sql
-- Voir toutes les tables créées
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### **Vérifier les types créés**
```sql
-- Voir tous les types personnalisés
SELECT typname FROM pg_type 
WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND typtype = 'e';
```

### **Vérifier les fonctions créées**
```sql
-- Voir toutes les fonctions
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
ORDER BY routine_name;
```

## 🚨 DÉPANNAGE

### **Erreur : "relation already exists"**
- Cela signifie qu'une table existe encore
- Exécutez à nouveau le script de reset

### **Erreur : "function already exists"**
- Une fonction existe encore
- Le script de reset devrait les supprimer toutes

### **Erreur : "type already exists"**
- Un type existe encore
- Vérifiez que le script de reset a bien supprimé tous les types

### **Erreur lors de l'application des migrations**
- Vérifiez que la base est bien vide
- Exécutez les migrations dans l'ordre exact

## ✅ VÉRIFICATION FINALE

Après avoir appliqué toutes les migrations, vérifiez que :

1. **Toutes les tables sont créées** (environ 20 tables)
2. **Tous les types sont créés** (6 types ENUM)
3. **Toutes les fonctions sont créées** (environ 50 fonctions)
4. **Le SuperAdmin est créé**
5. **L'intégrité est validée**

## 🎯 RÉSULTAT ATTENDU

Vous devriez avoir une base de données complètement propre avec :
- ✅ Aucune donnée ancienne
- ✅ Structure optimisée
- ✅ Sécurité RLS complète
- ✅ Fonctionnalités GesFlex Pro complètes
- ✅ SuperAdmin configuré

## 📞 SUPPORT

Si vous rencontrez des problèmes :
1. Vérifiez les logs d'erreur
2. Assurez-vous que la base est bien vide avant d'appliquer les migrations
3. Exécutez les migrations dans l'ordre exact
4. Vérifiez l'intégrité avec `validate_data_integrity()` 