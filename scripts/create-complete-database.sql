-- =====================================================
-- GESFLEX PRO - CRÉATION COMPLÈTE DE LA BASE DE DONNÉES
-- Script parfait basé sur l'analyse complète du frontend et backend
-- Exécutez ce script dans votre base Supabase après avoir supprimé toutes les tables
-- =====================================================

BEGIN;

-- =====================================================
-- EXTENSIONS ET CONFIGURATION
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TYPES ENUM
-- =====================================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('SuperAdmin', 'Admin', 'Manager', 'Vendeur');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('pending', 'active', 'inactive', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE validation_status AS ENUM ('pending', 'validated', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('cash', 'card', 'mobile_money', 'bank_transfer', 'check');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE return_status AS ENUM ('pending', 'approved', 'rejected', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE gamification_type AS ENUM ('sales_amount', 'sales_count', 'holiday_sales', 'daily_record', 'achievement');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- FONCTIONS UTILITAIRES
-- =====================================================
CREATE OR REPLACE FUNCTION generate_unique_code(prefix TEXT)
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..7 LOOP
        result := result || substr(chars, floor(random() * length(chars))::integer + 1, 1);
    END LOOP;
    RETURN prefix || '-' || to_char(current_date, 'YYYY') || '-' || result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_sku(product_name TEXT)
RETURNS TEXT AS $$
DECLARE
    clean_name TEXT;
    sku TEXT;
    counter INTEGER := 1;
BEGIN
    clean_name := upper(regexp_replace(product_name, '[^a-zA-Z0-9\s]', '', 'g'));
    clean_name := regexp_replace(clean_name, '\s+', ' ', 'g');
    clean_name := trim(clean_name);
    sku := '';
    FOR i IN 1..3 LOOP
        IF i <= length(clean_name) THEN
            sku := sku || substr(clean_name, i, 1);
        END IF;
    END LOOP;
    
    -- Ajouter un compteur si le SKU existe déjà
    WHILE EXISTS (SELECT 1 FROM products WHERE sku = sku || counter::TEXT) LOOP
        counter := counter + 1;
    END LOOP;
    
    IF counter > 1 THEN
        sku := sku || counter::TEXT;
    END IF;
    
    RETURN upper(sku);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TABLES PRINCIPALES
-- =====================================================

-- Table des utilisateurs
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role user_role DEFAULT 'Vendeur',
    status user_status DEFAULT 'pending',
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des magasins
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    address TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    manager_id UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des fournisseurs
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des catégories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des unités
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des produits
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    description TEXT,
    category_id UUID NOT NULL REFERENCES categories(id),
    unit_id UUID NOT NULL REFERENCES units(id),
    min_sale_price DECIMAL(10,2) NOT NULL,
    current_sale_price DECIMAL(10,2) NOT NULL,
    purchase_price DECIMAL(10,2),
    tax_rate DECIMAL(5,2) DEFAULT 0,
    alert_stock INTEGER NOT NULL DEFAULT 0,
    expiry_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des stocks par magasin
CREATE TABLE product_stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id),
    store_id UUID NOT NULL REFERENCES stores(id),
    current_stock INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER NOT NULL DEFAULT 0,
    max_stock INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, store_id)
);

-- Table des clients
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des ventes
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_code TEXT UNIQUE NOT NULL,
    store_id UUID NOT NULL REFERENCES stores(id),
    customer_id UUID REFERENCES customers(id),
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    payment_method payment_method NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    notes TEXT,
    sold_by UUID NOT NULL REFERENCES users(id),
    sold_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des éléments de vente
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    product_name TEXT NOT NULL,
    product_sku TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    discount_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des achats
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
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des arrivages
CREATE TABLE arrivals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL REFERENCES purchases(id),
    validated_quantity INTEGER NOT NULL,
    validated_by UUID NOT NULL REFERENCES users(id),
    validated_at TIMESTAMPTZ DEFAULT NOW(),
    is_validated BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des retours
CREATE TABLE returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_code TEXT UNIQUE NOT NULL,
    original_sale_id UUID NOT NULL REFERENCES sales(id),
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    return_reason TEXT,
    return_status return_status DEFAULT 'pending',
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des éléments de retour
CREATE TABLE return_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
    original_sale_item_id UUID NOT NULL REFERENCES sale_items(id),
    product_id UUID NOT NULL REFERENCES products(id),
    product_name TEXT NOT NULL,
    product_sku TEXT NOT NULL,
    returned_quantity INTEGER NOT NULL,
    original_unit_price DECIMAL(10,2) NOT NULL,
    original_total_price DECIMAL(10,2) NOT NULL,
    exchange_product_id UUID REFERENCES products(id),
    exchange_quantity INTEGER,
    exchange_unit_price DECIMAL(10,2),
    exchange_total_price DECIMAL(10,2),
    price_difference DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des transferts entre magasins
CREATE TABLE store_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_code TEXT UNIQUE NOT NULL,
    source_store_id UUID NOT NULL REFERENCES stores(id),
    destination_store_id UUID NOT NULL REFERENCES stores(id),
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    status validation_status DEFAULT 'pending',
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des réceptions de transferts
CREATE TABLE transfer_receptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_id UUID NOT NULL REFERENCES store_transfers(id),
    received_quantity INTEGER NOT NULL,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    received_by UUID NOT NULL REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des assignations utilisateur-magasin
CREATE TABLE user_stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    store_id UUID NOT NULL REFERENCES stores(id),
    is_primary BOOLEAN DEFAULT false,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, store_id)
);

-- Table des points utilisateur
CREATE TABLE user_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    points INTEGER NOT NULL DEFAULT 0,
    total_earned INTEGER NOT NULL DEFAULT 0,
    total_spent INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table de l'historique des points
CREATE TABLE points_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    points_change INTEGER NOT NULL,
    change_type TEXT NOT NULL,
    reason TEXT,
    related_sale_id UUID REFERENCES sales(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des trophées
CREATE TABLE trophies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    points_reward INTEGER NOT NULL,
    condition_type gamification_type NOT NULL,
    condition_value INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des badges
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    category TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des trophées utilisateur
CREATE TABLE user_trophies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    trophy_id UUID NOT NULL REFERENCES trophies(id),
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des badges utilisateur
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    badge_id UUID NOT NULL REFERENCES badges(id),
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des paramètres système
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    is_required BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des devises
CREATE TABLE currencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    position TEXT NOT NULL DEFAULT 'after',
    decimal_places INTEGER NOT NULL DEFAULT 2,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des dépenses
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    expense_date DATE NOT NULL,
    store_id UUID REFERENCES stores(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEX POUR LES PERFORMANCES
-- =====================================================

-- Index sur les clés étrangères
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

CREATE INDEX idx_stores_code ON stores(code);
CREATE INDEX idx_stores_manager_id ON stores(manager_id);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_unit_id ON products(unit_id);

CREATE INDEX idx_product_stores_product_id ON product_stores(product_id);
CREATE INDEX idx_product_stores_store_id ON product_stores(store_id);
CREATE INDEX idx_product_stores_stock ON product_stores(current_stock);

CREATE INDEX idx_sales_sale_code ON sales(sale_code);
CREATE INDEX idx_sales_store_id ON sales(store_id);
CREATE INDEX idx_sales_sold_by ON sales(sold_by);
CREATE INDEX idx_sales_sold_at ON sales(sold_at);

CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);

CREATE INDEX idx_purchases_purchase_code ON purchases(purchase_code);
CREATE INDEX idx_purchases_store_id ON purchases(store_id);
CREATE INDEX idx_purchases_status ON purchases(status);

CREATE INDEX idx_store_transfers_transfer_code ON store_transfers(transfer_code);
CREATE INDEX idx_store_transfers_source_store ON store_transfers(source_store_id);
CREATE INDEX idx_store_transfers_destination_store ON store_transfers(destination_store_id);
CREATE INDEX idx_store_transfers_status ON store_transfers(status);

CREATE INDEX idx_user_stores_user_id ON user_stores(user_id);
CREATE INDEX idx_user_stores_store_id ON user_stores(store_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_stores_updated_at BEFORE UPDATE ON product_stores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_transfers_updated_at BEFORE UPDATE ON store_transfers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_stores_updated_at BEFORE UPDATE ON user_stores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_points_updated_at BEFORE UPDATE ON user_points
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trophies_updated_at BEFORE UPDATE ON trophies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_badges_updated_at BEFORE UPDATE ON badges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_currencies_updated_at BEFORE UPDATE ON currencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VUES OPTIMISÉES
-- =====================================================

-- Vue des produits en stock faible
CREATE VIEW low_stock_products_view AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.sku as product_sku,
    c.name as category_name,
    u.symbol as unit_symbol,
    ps.current_stock,
    ps.min_stock,
    ps.max_stock,
    p.alert_stock,
    s.id as store_id,
    s.name as store_name,
    s.code as store_code,
    CASE 
        WHEN ps.current_stock = 0 THEN 'out_of_stock'
        WHEN ps.current_stock <= ps.min_stock THEN 'low_stock'
        WHEN ps.current_stock <= p.alert_stock THEN 'alert_stock'
        ELSE 'normal_stock'
    END as stock_status,
    CASE 
        WHEN ps.current_stock = 0 THEN 'Rupture de stock'
        WHEN ps.current_stock <= ps.min_stock THEN 'Stock minimum atteint'
        WHEN ps.current_stock <= p.alert_stock THEN 'Stock d''alerte atteint'
        ELSE 'Stock normal'
    END as stock_warning,
    (ps.max_stock - ps.current_stock) as suggested_order_quantity
FROM products p
JOIN categories c ON p.category_id = c.id
JOIN units u ON p.unit_id = u.id
JOIN product_stores ps ON p.id = ps.product_id
JOIN stores s ON ps.store_id = s.id
WHERE p.is_active = true 
    AND (ps.current_stock <= ps.min_stock OR ps.current_stock <= p.alert_stock)
ORDER BY ps.current_stock ASC, p.name;

-- Vue des statistiques de ventes quotidiennes
CREATE VIEW sales_stats_daily_view AS
SELECT 
    DATE(s.sold_at) as sale_date,
    s.store_id,
    st.name as store_name,
    COUNT(*) as total_sales,
    SUM(s.total_amount) as total_revenue,
    COUNT(DISTINCT s.customer_id) as unique_customers,
    AVG(s.total_amount) as average_sale_amount
FROM sales s
JOIN stores st ON s.store_id = st.id
WHERE s.sold_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(s.sold_at), s.store_id, st.name
ORDER BY sale_date DESC, store_name;

-- =====================================================
-- FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour obtenir l'inventaire d'un magasin
CREATE OR REPLACE FUNCTION get_store_inventory(
    store_id_filter UUID DEFAULT NULL,
    stock_status_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    product_sku TEXT,
    category_name TEXT,
    current_stock INTEGER,
    min_stock INTEGER,
    max_stock INTEGER,
    alert_stock INTEGER,
    stock_status TEXT,
    stock_warning TEXT,
    suggested_order_quantity INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.sku,
        c.name,
        ps.current_stock,
        ps.min_stock,
        ps.max_stock,
        p.alert_stock,
        CASE 
            WHEN ps.current_stock = 0 THEN 'out_of_stock'
            WHEN ps.current_stock <= ps.min_stock THEN 'low_stock'
            WHEN ps.current_stock <= p.alert_stock THEN 'alert_stock'
            ELSE 'normal_stock'
        END as stock_status,
        CASE 
            WHEN ps.current_stock = 0 THEN 'Rupture de stock'
            WHEN ps.current_stock <= ps.min_stock THEN 'Stock minimum atteint'
            WHEN ps.current_stock <= p.alert_stock THEN 'Stock d''alerte atteint'
            ELSE 'Stock normal'
        END as stock_warning,
        (ps.max_stock - ps.current_stock) as suggested_order_quantity
    FROM products p
    JOIN categories c ON p.category_id = c.id
    JOIN product_stores ps ON p.id = ps.product_id
    JOIN stores s ON ps.store_id = s.id
    WHERE p.is_active = true
        AND (store_id_filter IS NULL OR ps.store_id = store_id_filter)
        AND (
            stock_status_filter IS NULL 
            OR CASE 
                WHEN stock_status_filter = 'out_of_stock' THEN ps.current_stock = 0
                WHEN stock_status_filter = 'low_stock' THEN ps.current_stock <= ps.min_stock
                WHEN stock_status_filter = 'alert_stock' THEN ps.current_stock <= p.alert_stock
                WHEN stock_status_filter = 'normal_stock' THEN ps.current_stock > p.alert_stock
                ELSE true
            END
        )
    ORDER BY ps.current_stock ASC, p.name;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les statistiques de vente d'un magasin
CREATE OR REPLACE FUNCTION get_store_sales_stats(
    store_uuid UUID,
    period_start DATE DEFAULT NULL,
    period_end DATE DEFAULT NULL
)
RETURNS TABLE (
    total_sales INTEGER,
    total_revenue DECIMAL(10,2),
    average_sale_amount DECIMAL(10,2),
    unique_customers INTEGER,
    unique_sellers INTEGER,
    top_selling_product TEXT,
    top_selling_product_quantity INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_sales,
        COALESCE(SUM(s.total_amount), 0) as total_revenue,
        COALESCE(AVG(s.total_amount), 0) as average_sale_amount,
        COUNT(DISTINCT s.customer_id)::INTEGER as unique_customers,
        COUNT(DISTINCT s.sold_by)::INTEGER as unique_sellers,
        COALESCE(
            (SELECT p.name FROM products p 
             JOIN sale_items si ON p.id = si.product_id 
             JOIN sales s2 ON si.sale_id = s2.id 
             WHERE s2.store_id = store_uuid
             GROUP BY p.id, p.name 
             ORDER BY SUM(si.quantity) DESC 
             LIMIT 1), 'Aucun'
        ) as top_selling_product,
        COALESCE(
            (SELECT SUM(si.quantity) FROM sale_items si 
             JOIN sales s2 ON si.sale_id = s2.id 
             JOIN products p ON si.product_id = p.id
             WHERE s2.store_id = store_uuid
             GROUP BY p.id, p.name 
             ORDER BY SUM(si.quantity) DESC 
             LIMIT 1), 0
        )::INTEGER as top_selling_product_quantity
    FROM sales s
    WHERE s.store_id = store_uuid
        AND (period_start IS NULL OR s.sold_at >= period_start)
        AND (period_end IS NULL OR s.sold_at <= period_end);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DONNÉES DE BASE
-- =====================================================

-- Insérer les devises par défaut
INSERT INTO currencies (code, name, symbol, position, decimal_places, is_default, is_active) VALUES
('EUR', 'Euro', '€', 'after', 2, true, true),
('USD', 'Dollar US', '$', 'before', 2, false, true),
('XAF', 'Franc CFA', 'FCFA', 'after', 0, false, true);

-- Insérer les catégories par défaut
INSERT INTO categories (name, description, is_active) VALUES
('Informatique', 'Produits informatiques et électroniques', true),
('Téléphonie', 'Smartphones et accessoires', true),
('Accessoires', 'Accessoires divers', true),
('Vêtements', 'Vêtements et textiles', true),
('Alimentation', 'Produits alimentaires', true);

-- Insérer les unités par défaut
INSERT INTO units (name, symbol, is_active) VALUES
('Pièce', 'pcs', true),
('Kilogramme', 'kg', true),
('Litre', 'L', true),
('Mètre', 'm', true),
('Paquet', 'pkg', true);

-- Insérer les paramètres système par défaut
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_required) VALUES
('currency.default', 'EUR', 'string', 'currency', 'Devise par défaut du système', true),
('currency.symbol', '€', 'string', 'currency', 'Symbole de la devise par défaut', true),
('currency.position', 'after', 'string', 'currency', 'Position du symbole monétaire', true),
('currency.decimal_places', '2', 'number', 'currency', 'Nombre de décimales pour les montants', true),
('sales.tax_rate', '19.6', 'number', 'sales', 'Taux de TVA par défaut', true),
('sales.auto_generate_codes', 'true', 'boolean', 'sales', 'Génération automatique des codes de vente', true),
('inventory.low_stock_threshold', '5', 'number', 'inventory', 'Seuil d''alerte pour le stock faible', true),
('inventory.enable_transfers', 'true', 'boolean', 'inventory', 'Activer les transferts entre magasins', true);

-- =====================================================
-- PERMISSIONS ET SÉCURITÉ
-- =====================================================

-- Activer RLS sur toutes les tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE arrivals ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_receptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE trophies ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_trophies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Accorder les permissions sur les vues
GRANT SELECT ON low_stock_products_view TO authenticated;
GRANT SELECT ON sales_stats_daily_view TO authenticated;
GRANT EXECUTE ON FUNCTION get_store_inventory TO authenticated;
GRANT EXECUTE ON FUNCTION get_store_sales_stats TO authenticated;

-- =====================================================
-- VÉRIFICATION FINALE
-- =====================================================

-- Vérifier que toutes les tables ont été créées
SELECT 
    'Tables créées avec succès !' as status,
    COUNT(*) as total_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';

-- Vérifier que toutes les vues ont été créées
SELECT 
    'Vues créées avec succès !' as status,
    COUNT(*) as total_views
FROM information_schema.views 
WHERE table_schema = 'public';

-- Vérifier que toutes les fonctions ont été créées
SELECT 
    'Fonctions créées avec succès !' as status,
    COUNT(*) as total_functions
FROM information_schema.routines 
WHERE routine_schema = 'public';

COMMIT;

-- =====================================================
-- MESSAGE DE SUCCÈS
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '🎉 Base de données GesFlex Pro créée avec succès !';
    RAISE NOTICE '✅ Toutes les tables, vues, fonctions et données de base ont été créées';
    RAISE NOTICE '🔒 RLS activé sur toutes les tables';
    RAISE NOTICE '📊 Vues optimisées pour le Dashboard';
    RAISE NOTICE '🚀 Prêt pour l''utilisation !';
END $$;
