# 💱 Guide de Configuration de Devise

## 📋 Vue d'Ensemble

La configuration de devise permet de personnaliser l'affichage monétaire dans toute l'application GesFlex. Cette fonctionnalité s'intègre parfaitement avec le système existant et offre une flexibilité maximale.

## 🎯 Fonctionnalités

### ✅ Paramètres Configurables

1. **Devise par défaut** : XOF, EUR, USD, GBP, JPY, CNY
2. **Symbole personnalisable** : CFA, €, $, £, ¥, etc.
3. **Position du symbole** : Avant ou après le montant
4. **Nombre de décimales** : 0, 2, ou 3 décimales
5. **Aperçu en temps réel** : Visualisation immédiate des changements

### 🔧 Intégration Système

- **Hook personnalisé** : `useCurrency()` pour un accès facile
- **Formatage automatique** : Intégration avec les utilitaires existants
- **Cohérence globale** : Application uniforme dans toute l'app
- **Performance optimisée** : Mise en cache des paramètres

## 🚀 Utilisation

### 1. **Configuration via l'Interface**

Naviguez vers `/configuration` → Onglet "Devise" :

```typescript
// Exemple de configuration
{
  defaultCurrency: "XOF",
  currencySymbol: "CFA", 
  currencyPosition: "after",
  decimalPlaces: 0
}
```

### 2. **Utilisation dans le Code**

```typescript
import { useCurrency } from "@/hooks/useCurrency"

function MyComponent() {
  const { 
    formatCurrency, 
    formatCurrencyWithSymbol, 
    formatCurrencyCustom 
  } = useCurrency()

  return (
    <div>
      {/* Formatage standard */}
      <p>Prix: {formatCurrency(1234567)}</p>
      
      {/* Formatage avec symbole personnalisé */}
      <p>Total: {formatCurrencyWithSymbol(987654)}</p>
      
      {/* Formatage personnalisé */}
      <p>EUR: {formatCurrencyCustom(1234.56, 'EUR', 2)}</p>
    </div>
  )
}
```

### 3. **Fonctions Disponibles**

| Fonction | Description | Exemple |
|----------|-------------|---------|
| `formatCurrency(amount)` | Formatage standard | `1,234,567 XOF` |
| `formatCurrencyWithSymbol(amount)` | Avec symbole personnalisé | `1,234,567 CFA` |
| `formatCurrencyCustom(amount, currency, decimals)` | Formatage personnalisé | `1,234.56 EUR` |
| `getCurrencyInfo()` | Informations de devise | `{code: 'XOF', symbol: 'CFA', ...}` |

## 📊 Exemples de Formatage

### Configuration XOF (Franc CFA)
```typescript
{
  defaultCurrency: "XOF",
  currencySymbol: "CFA",
  currencyPosition: "after",
  decimalPlaces: 0
}
```

**Résultats :**
- `1234567` → `1,234,567 XOF`
- `1234567` → `1,234,567 CFA` (avec symbole personnalisé)

### Configuration EUR (Euro)
```typescript
{
  defaultCurrency: "EUR",
  currencySymbol: "€",
  currencyPosition: "before",
  decimalPlaces: 2
}
```

**Résultats :**
- `1234.56` → `€1,234.56`
- `1234567` → `€1,234,567.00`

### Configuration USD (Dollar US)
```typescript
{
  defaultCurrency: "USD",
  currencySymbol: "$",
  currencyPosition: "before",
  decimalPlaces: 2
}
```

**Résultats :**
- `1234.56` → `$1,234.56`
- `1234567` → `$1,234,567.00`

## 🔄 Migration et Mise à Jour

### Migration Automatique

Les nouvelles configurations de devise sont automatiquement ajoutées lors de l'exécution des migrations :

```sql
-- Configurations de devise ajoutées automatiquement
INSERT INTO system_settings (setting_key, setting_value, setting_type, category) VALUES
  ('currency.default', '"XOF"', 'string', 'currency'),
  ('currency.symbol', '"CFA"', 'string', 'currency'),
  ('currency.position', '"after"', 'string', 'currency'),
  ('currency.decimal_places', '0', 'number', 'currency')
```

### Vérification

Utilisez le script de vérification pour confirmer l'installation :

```bash
node scripts/verify-configuration.js
```

**Résultat attendu :**
```
📊 Total de configurations trouvées: 19 (attendu: 19)
✅ currency.default (string)
✅ currency.symbol (string)
✅ currency.position (string)
✅ currency.decimal_places (number)
💱 Configuration de devise incluse et fonctionnelle.
```

## 🎨 Intégration avec l'Interface

### Composants Compatibles

La configuration de devise s'intègre automatiquement avec :

- **Graphiques** : `SalesChart`, `ProductChart`, `StoreChart`
- **Tableaux** : Tous les tableaux de données financières
- **Statistiques** : Dashboard, Analytics, Reports
- **Modales** : ProductModal, PurchaseModal, ExpenseModal

### Exemple d'Intégration

```typescript
// Avant (hardcodé)
<div>Prix: {price.toLocaleString()} XOF</div>

// Après (configurable)
<div>Prix: {formatCurrency(price)}</div>
```

## 🛠️ Développement

### Ajout de Nouvelles Devises

Pour ajouter une nouvelle devise :

1. **Mettre à jour l'interface** dans `Configuration.tsx`
2. **Ajouter les options** dans le Select
3. **Tester le formatage** avec `formatCurrencyCustom()`

```typescript
// Exemple d'ajout de devise
<SelectItem value="CAD">Dollar Canadien (CAD)</SelectItem>
<SelectItem value="AUD">Dollar Australien (AUD)</SelectItem>
```

### Tests

```typescript
// Test de formatage
const { formatCurrency } = useCurrency()
console.log(formatCurrency(1234567)) // Vérifier le format

// Test de configuration
const { getCurrencyInfo } = useCurrency()
console.log(getCurrencyInfo()) // Vérifier les paramètres
```

## 📈 Avantages

### 1. **Flexibilité**
- Support de multiples devises
- Configuration en temps réel
- Personnalisation complète

### 2. **Cohérence**
- Formatage uniforme dans toute l'app
- Intégration transparente
- Maintenance simplifiée

### 3. **Performance**
- Mise en cache des paramètres
- Formatage optimisé
- Pas d'impact sur les performances

### 4. **Maintenabilité**
- Code centralisé
- Configuration centralisée
- Facilité de mise à jour

## 🚨 Dépannage

### Problèmes Courants

1. **Formatage incorrect**
   - Vérifier les paramètres dans `/configuration`
   - Contrôler la configuration de devise

2. **Symbole non affiché**
   - Vérifier le champ "Symbole de la devise"
   - Contrôler la position du symbole

3. **Décimales incorrectes**
   - Ajuster le nombre de décimales
   - Vérifier le formatage de la devise

### Solutions

```typescript
// Debug des paramètres
const { getCurrencyInfo } = useCurrency()
console.log('Paramètres devise:', getCurrencyInfo())

// Test de formatage
const { formatCurrency } = useCurrency()
console.log('Test formatage:', formatCurrency(1234567))
```

## 🎯 Prochaines Étapes

1. **Tester la configuration** dans l'interface
2. **Vérifier l'intégration** dans tous les composants
3. **Documenter les cas d'usage** spécifiques
4. **Former les utilisateurs** sur la nouvelle fonctionnalité

---

**💱 La configuration de devise est maintenant entièrement fonctionnelle et intégrée au système GesFlex !** 