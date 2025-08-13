# 🔧 Corrections des Relations Supabase

## 🚨 **Problème Identifié**

L'erreur indique que Supabase ne peut pas trouver la relation entre `purchases` et `users` :

```
Could not find a relationship between 'purchases' and 'users' in the schema cache
```

## 🎯 **Solution**

### **Problème Principal**
La syntaxe de relation utilisée n'est pas supportée par Supabase :
```typescript
// ❌ INCORRECT - Cette syntaxe n'existe pas
created_by_user:users!purchases_created_by_fkey(first_name, last_name)
```

### **Solution Correcte**
Utiliser des requêtes séparées et enrichir les données manuellement :

```typescript
// ✅ CORRECT - Approche en deux étapes
const loadArrivals = async () => {
  try {
    // 1. Récupérer les achats avec les relations de base
    const { data: pending, error: pendingError } = await supabase
      .from('purchases')
      .select(`
        *,
        suppliers(name),
        products(name, sku),
        stores(name)
      `)
      .eq('is_validated', false)
      .order('created_at', { ascending: false })

    if (pendingError) throw pendingError

    const { data: validated, error: validatedError } = await supabase
      .from('purchases')
      .select(`
        *,
        suppliers(name),
        products(name, sku),
        stores(name)
      `)
      .eq('is_validated', true)
      .order('validated_at', { ascending: false })
      .limit(50)

    if (validatedError) throw validatedError

    // 2. Récupérer les informations utilisateur séparément
    const userIds = [...new Set([
      ...(pending || []).map(p => p.created_by),
      ...(validated || []).map(p => p.validated_by)
    ].filter(Boolean))]

    let usersData: any = {}
    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', userIds)

      if (!usersError && users) {
        usersData = users.reduce((acc, user) => {
          acc[user.id] = user
          return acc
        }, {})
      }
    }

    // 3. Enrichir les données
    const enrichedPending = (pending || []).map(purchase => ({
      ...purchase,
      created_by_user: usersData[purchase.created_by]
    }))

    const enrichedValidated = (validated || []).map(purchase => ({
      ...purchase,
      validated_by_user: usersData[purchase.validated_by]
    }))

    setPendingPurchases(enrichedPending)
    setValidatedPurchases(enrichedValidated)
  } catch (error) {
    console.error('Error loading arrivals:', error)
    toast({
      title: "Erreur",
      description: "Impossible de charger les arrivages",
      variant: "destructive",
    })
  } finally {
    setLoading(false)
  }
}
```

## 📋 **Fichiers à Corriger**

### 1️⃣ **src/pages/Arrivals.tsx**
- ✅ **Corrigé** : Requêtes simplifiées sans relations complexes
- ✅ **Corrigé** : Enrichissement manuel des données utilisateur

### 2️⃣ **src/pages/Purchases.tsx**
- ⚠️ **À corriger** : Même problème de relations
- ⚠️ **À corriger** : Utiliser la même approche

### 3️⃣ **Autres fichiers**
- ⚠️ **À vérifier** : Tous les fichiers utilisant des relations complexes

## 🔍 **Vérification de la Structure**

### **Table purchases**
```sql
CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_code TEXT UNIQUE NOT NULL,
    store_id UUID NOT NULL REFERENCES stores(id),
    product_id UUID NOT NULL REFERENCES products(id),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    expected_arrival_date DATE,
    status validation_status DEFAULT 'pending',
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),  -- ✅ Relation correcte
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### **Table users**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID REFERENCES auth.users(id),
    email TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role user_role DEFAULT 'Vendeur',
    status user_status DEFAULT 'pending',
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## 🎯 **Implémentation Finale**

### **Approche Recommandée**
1. **Requêtes simples** : Utiliser seulement les relations de base (suppliers, products, stores)
2. **Enrichissement manuel** : Récupérer les données utilisateur séparément
3. **Performance** : Éviter les requêtes complexes avec des relations imbriquées

### **Code Type**
```typescript
// ✅ Bonne pratique
const { data, error } = await supabase
  .from('purchases')
  .select(`
    *,
    suppliers(name),
    products(name, sku),
    stores(name)
  `)
  .eq('is_validated', false)

// Enrichir avec les données utilisateur si nécessaire
if (data && data.length > 0) {
  const userIds = [...new Set(data.map(p => p.created_by).filter(Boolean))]
  const { data: users } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .in('id', userIds)
  
  // Enrichir les données
  const enriched = data.map(purchase => ({
    ...purchase,
    created_by_user: users?.find(u => u.id === purchase.created_by)
  }))
}
```

## ✅ **Résultat Attendu**

Après ces corrections :
- ✅ **Erreurs résolues** : Plus d'erreurs de relations
- ✅ **Performance améliorée** : Requêtes plus simples et rapides
- ✅ **Code maintenable** : Approche claire et documentée
- ✅ **Fonctionnalité préservée** : Toutes les données affichées correctement

---

**🎯 Mission :** Corriger toutes les relations Supabase pour une expérience utilisateur fluide ! 