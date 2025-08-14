# 🔍 GUIDE DE DIAGNOSTIC - PAGE CONFIGURATION

## 📋 **ANALYSE COMPLÈTE DE LA COHÉRENCE**

### **🎯 OBJECTIF**
Vérifier et corriger toutes les incohérences entre :
- La structure de base de données (migration)
- Les types TypeScript
- Le code de la page Configuration
- Les fonctionnalités attendues

---

## 🚨 **PROBLÈMES IDENTIFIÉS**

### **1. ❌ Incohérence des Types TypeScript**

#### **Problème**
- **Migration** : `system_settings` avec `setting_value` de type `TEXT`
- **Code TypeScript** : `setting_value` de type `any` dans l'interface
- **Hook** : Attend des types variés (boolean, number, string)

#### **Impact**
- Erreurs de type lors de la conversion
- Données mal formatées
- Fonctionnalités cassées

### **2. ❌ Incohérence des Catégories**

#### **Problème**
- **Migration** : Catégories limitées à `('general', 'currency', 'sales', 'inventory', 'notifications', 'security', 'appearance')`
- **Hook** : Utilise des catégories comme `stores`, `performance`, `maintenance`
- **Page** : Attend des catégories spécifiques

#### **Impact**
- Erreurs de contrainte CHECK
- Insertion impossible
- Fonctionnalités non disponibles

### **3. ❌ Mapping des Clés Incohérent**

#### **Problème**
- **Hook** : Utilise des clés comme `stores.enable_transfers`
- **Migration** : Insère des clés comme `app.name`, `currency.default`
- **Page** : Attend des clés spécifiques

#### **Impact**
- Données non trouvées
- Valeurs par défaut affichées
- Configuration non persistée

### **4. ❌ Permissions RLS Manquantes**

#### **Problème**
- **Migration** : Politiques RLS basiques
- **Hook** : Attend des permissions Admin/SuperAdmin
- **Page** : Vérifie les permissions

#### **Impact**
- Erreurs 42501 (Permission denied)
- Fonctionnalités de modification bloquées
- Expérience utilisateur dégradée

---

## ✅ **SOLUTION COMPLÈTE**

### **ÉTAPE 1 : Vérifier la Structure de la Table**

```sql
-- Vérifier l'existence de la table system_settings
SELECT 
    'VÉRIFICATION TABLE' as test_type,
    table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'system_settings' 
            AND table_schema = 'public'
        ) THEN '✅ EXISTE'
        ELSE '❌ MANQUANTE'
    END as status
FROM (VALUES ('system_settings')) as tables(table_name);

-- Vérifier la structure de la table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'system_settings'
ORDER BY ordinal_position;
```

### **ÉTAPE 2 : Vérifier les Contraintes**

```sql
-- Vérifier les contraintes CHECK
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%system_settings%';
```

### **ÉTAPE 3 : Vérifier les Données Existantes**

```sql
-- Vérifier les données existantes
SELECT 
    setting_key,
    setting_value,
    setting_type,
    category
FROM system_settings
ORDER BY setting_key;
```

---

## 🔧 **CORRECTIONS NÉCESSAIRES**

### **1. Correction des Types TypeScript**

#### **Problème Identifié**
Le hook `useSystemSettings` attend des types variés mais la base de données stocke tout en TEXT.

#### **Solution**
```sql
-- Mettre à jour les types dans la base de données
UPDATE system_settings 
SET setting_type = 'boolean' 
WHERE setting_key IN (
    'stores.enable_transfers',
    'stores.global_stock_alerts',
    'system.auto_backup',
    'system.debug_mode',
    'system.enable_real_time_analytics',
    'performance.gamification_enabled',
    'performance.auto_generate_reports',
    'maintenance.mode',
    'maintenance.admin_only_access'
);

UPDATE system_settings 
SET setting_type = 'number' 
WHERE setting_key IN (
    'stores.global_stock_threshold',
    'performance.daily_sales_target',
    'performance.performance_threshold',
    'performance.points_per_sale',
    'currency.decimal_places'
);
```

### **2. Correction des Catégories**

#### **Problème Identifié**
Les catégories utilisées par le hook ne sont pas autorisées par la contrainte CHECK.

#### **Solution**
```sql
-- Mettre à jour la contrainte CHECK pour inclure toutes les catégories
ALTER TABLE system_settings DROP CONSTRAINT IF EXISTS system_settings_category_check;

ALTER TABLE system_settings ADD CONSTRAINT system_settings_category_check 
CHECK (category IN (
    'general', 'currency', 'sales', 'inventory', 'notifications', 
    'security', 'appearance', 'stores', 'performance', 'maintenance', 'system'
));
```

### **3. Correction du Mapping des Clés**

#### **Problème Identifié**
Les clés utilisées par le hook ne correspondent pas aux clés dans la base de données.

#### **Solution**
```sql
-- Insérer les configurations manquantes
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_required, is_public) VALUES
-- Paramètres multi-magasins
('stores.enable_transfers', 'true', 'boolean', 'stores', 'Activer les transferts entre magasins', false, true),
('stores.global_stock_alerts', 'true', 'boolean', 'stores', 'Alertes de stock globales', false, true),
('stores.global_stock_threshold', '10', 'number', 'stores', 'Seuil global d''alerte stock', false, true),
('stores.default_opening_time', '09:00', 'string', 'stores', 'Heure d''ouverture par défaut', false, true),
('stores.default_closing_time', '19:00', 'string', 'stores', 'Heure de fermeture par défaut', false, true),

-- Paramètres système
('system.auto_backup', 'true', 'boolean', 'system', 'Sauvegarde automatique', false, true),
('system.debug_mode', 'false', 'boolean', 'system', 'Mode debug', false, true),
('system.enable_real_time_analytics', 'true', 'boolean', 'system', 'Analytics en temps réel', false, true),

-- Paramètres de performance
('performance.gamification_enabled', 'true', 'boolean', 'performance', 'Gamification active', false, true),
('performance.daily_sales_target', '50000', 'number', 'performance', 'Objectif de vente quotidien', false, true),
('performance.performance_threshold', '80', 'number', 'performance', 'Seuil de performance', false, true),
('performance.points_per_sale', '10', 'number', 'performance', 'Points par vente', false, true),
('performance.auto_generate_reports', 'true', 'boolean', 'performance', 'Rapports automatiques', false, true),
('performance.report_schedule', 'weekly', 'string', 'performance', 'Fréquence des rapports', false, true),

-- Paramètres de maintenance
('maintenance.mode', 'false', 'boolean', 'maintenance', 'Mode maintenance', false, true),
('maintenance.message', '', 'string', 'maintenance', 'Message de maintenance', false, true),
('maintenance.admin_only_access', 'false', 'boolean', 'maintenance', 'Accès administrateur uniquement', false, true)
ON CONFLICT (setting_key) DO NOTHING;
```

### **4. Correction des Permissions RLS**

#### **Problème Identifié**
Les politiques RLS peuvent être insuffisantes pour les opérations de modification.

#### **Solution**
```sql
-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Admins can view system settings" ON system_settings;
DROP POLICY IF EXISTS "Admins can modify system settings" ON system_settings;
DROP POLICY IF EXISTS "SuperAdmins can modify system settings" ON system_settings;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON system_settings;
DROP POLICY IF EXISTS "Enable modify access for admins" ON system_settings;

-- Créer les nouvelles politiques
CREATE POLICY "SuperAdmin system settings full access" ON system_settings FOR ALL USING (is_superadmin());
CREATE POLICY "Admin system settings management" ON system_settings FOR ALL USING (is_admin());
CREATE POLICY "Users can view public system settings" ON system_settings FOR SELECT USING (
    is_public = true AND EXISTS (SELECT 1 FROM users WHERE auth_id = get_current_user_id() AND status = 'active')
);
```

---

## 🔧 **FONCTIONNALITÉS À TESTER**

### **1. Multi-Magasins**
- ✅ Transferts automatiques
- ✅ Alertes stock globales
- ✅ Seuil global d'alerte
- ✅ Heures d'ouverture/fermeture

### **2. Système**
- ✅ Sauvegarde automatique
- ✅ Mode debug
- ✅ Analytics en temps réel
- ✅ Actions système

### **3. Performance**
- ✅ Gamification active
- ✅ Objectifs de vente
- ✅ Seuils de performance
- ✅ Points par vente
- ✅ Rapports automatiques

### **4. Devise**
- ✅ Devise par défaut
- ✅ Symbole de devise
- ✅ Position du symbole
- ✅ Nombre de décimales
- ✅ Aperçu du formatage

### **5. Maintenance**
- ✅ Mode maintenance
- ✅ Message de maintenance
- ✅ Accès administrateur uniquement
- ✅ Actions de maintenance

---

## 📊 **DIAGNOSTIC DÉTAILLÉ**

### **Vérifications à Effectuer**

1. **Structure de la Table :**
   ```sql
   -- Vérifier la structure de system_settings
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns 
   WHERE table_name = 'system_settings';
   ```

2. **Contraintes :**
   ```sql
   -- Vérifier les contraintes CHECK
   SELECT constraint_name, check_clause
   FROM information_schema.check_constraints 
   WHERE constraint_name LIKE '%system_settings%';
   ```

3. **Données :**
   ```sql
   -- Vérifier les données existantes
   SELECT setting_key, setting_value, setting_type, category
   FROM system_settings
   ORDER BY setting_key;
   ```

4. **Permissions RLS :**
   ```sql
   -- Vérifier les politiques RLS
   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
   FROM pg_policies 
   WHERE tablename = 'system_settings';
   ```

---

## 🎯 **RÉSULTATS ATTENDUS**

### **Après Correction**
- ✅ Page Configuration accessible sans erreur
- ✅ Tous les onglets fonctionnels
- ✅ Sauvegarde des paramètres
- ✅ Permissions respectées
- ✅ Interface utilisateur réactive

### **Indicateurs de Succès**
- Plus d'erreurs dans la console
- Tous les paramètres visibles et modifiables
- Sauvegarde fonctionnelle
- Permissions correctement appliquées

---

## 🔧 **DÉPANNAGE**

### **Si des erreurs persistent :**

1. **Vérifier l'exécution des scripts :**
   ```sql
   SELECT setting_key, setting_value, setting_type, category
   FROM system_settings
   WHERE setting_key LIKE 'stores.%' OR setting_key LIKE 'performance.%' OR setting_key LIKE 'maintenance.%';
   ```

2. **Vérifier les permissions :**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'system_settings';
   ```

3. **Vérifier les contraintes :**
   ```sql
   SELECT constraint_name, check_clause
   FROM information_schema.check_constraints 
   WHERE constraint_name LIKE '%system_settings%';
   ```

4. **Recharger l'application :**
   - Vider le cache du navigateur
   - Recharger la page Configuration
   - Tester toutes les fonctionnalités

---

## 📝 **NOTES IMPORTANTES**

### **Avant d'exécuter les corrections :**
- ✅ Sauvegarder la base de données actuelle
- ✅ Vérifier que vous avez les droits d'administration
- ✅ Exécuter les scripts dans l'ordre indiqué

### **Après les corrections :**
- ✅ Recharger l'application complètement
- ✅ Tester toutes les fonctionnalités de la page
- ✅ Vérifier que les données sont persistées

### **En cas de problème :**
- ✅ Vérifier les logs de Supabase
- ✅ Contrôler la console du navigateur
- ✅ Utiliser les requêtes de diagnostic

---

## 🎉 **RÉSULTAT FINAL ATTENDU**

Après l'exécution de toutes les corrections, la page Configuration devrait fonctionner parfaitement avec :

- ✅ **Multi-Magasins** : Configuration complète des transferts et alertes
- ✅ **Système** : Paramètres techniques et actions système
- ✅ **Performance** : Gamification et objectifs de performance
- ✅ **Devise** : Configuration monétaire complète
- ✅ **Maintenance** : Contrôle d'accès et maintenance
- ✅ **Interface cohérente** : Design uniforme avec le reste de l'application
- ✅ **Sécurité** : Permissions RLS correctement configurées
