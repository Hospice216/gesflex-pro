-- =====================================================
-- GESFLEX PRO - PRODUITS ET CATÉGORIES
-- Gestion des produits, catégories, unités et attribution automatique aux magasins
-- =====================================================

-- =====================================================
-- TABLE UNITÉS
-- =====================================================

CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    symbol TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Contraintes
    CONSTRAINT units_name_check CHECK (length(name) >= 1),
    CONSTRAINT units_symbol_check CHECK (length(symbol) >= 1)
);

-- =====================================================
-- TABLE CATÉGORIES
-- =====================================================

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    icon TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Contraintes
    CONSTRAINT categories_name_check CHECK (length(name) >= 2)
);

-- =====================================================
-- TABLE PRODUITS
-- =====================================================

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    description TEXT,
    category_id UUID REFERENCES categories(id),
    unit_id UUID REFERENCES units(id),
    min_sale_price DECIMAL(10,2) NOT NULL,
    current_sale_price DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    alert_stock INTEGER DEFAULT 10,
    expiration_date DATE,
    barcode TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Contraintes
    CONSTRAINT products_name_check CHECK (length(name) >= 2),
    CONSTRAINT products_sku_check CHECK (length(sku) >= 3),
    CONSTRAINT products_price_check CHECK (min_sale_price >= 0 AND current_sale_price >= 0),
    CONSTRAINT products_tax_check CHECK (tax_rate >= 0 AND tax_rate <= 100),
    CONSTRAINT products_alert_stock_check CHECK (alert_stock >= 0)
);

-- =====================================================
-- TABLE PRODUITS PAR MAGASIN
-- =====================================================

CREATE TABLE product_stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    current_stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    max_stock INTEGER,
    is_available BOOLEAN DEFAULT true,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    assigned_by UUID REFERENCES users(id),
    
    -- Contraintes
    CONSTRAINT product_stores_unique UNIQUE(product_id, store_id),
    CONSTRAINT product_stores_stock_check CHECK (current_stock >= 0),
    CONSTRAINT product_stores_min_stock_check CHECK (min_stock >= 0),
    CONSTRAINT product_stores_max_stock_check CHECK (max_stock IS NULL OR max_stock >= min_stock)
);

-- =====================================================
-- INDEX POUR PERFORMANCE
-- =====================================================

CREATE INDEX idx_units_name ON units(name);
CREATE INDEX idx_units_active ON units(is_active);
CREATE INDEX idx_categories_name ON categories(name);
CREATE INDEX idx_categories_active ON categories(is_active);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_unit ON products(unit_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_product_stores_product ON product_stores(product_id);
CREATE INDEX idx_product_stores_store ON product_stores(store_id);
CREATE INDEX idx_product_stores_available ON product_stores(is_available);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_units_updated_at
    BEFORE UPDATE ON units
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour générer automatiquement le SKU
CREATE OR REPLACE FUNCTION generate_product_sku()
RETURNS TRIGGER AS $$
BEGIN
    -- Si le SKU n'est pas fourni, le générer
    IF NEW.sku IS NULL OR NEW.sku = '' THEN
        NEW.sku := generate_sku(NEW.name);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_product_sku
    BEFORE INSERT ON products
    FOR EACH ROW
    EXECUTE FUNCTION generate_product_sku();

-- Trigger pour valider les prix
CREATE OR REPLACE FUNCTION validate_product_prices()
RETURNS TRIGGER AS $$
BEGIN
    -- Le prix de vente actuel ne peut pas être inférieur au prix minimum
    IF NEW.current_sale_price < NEW.min_sale_price THEN
        RAISE EXCEPTION 'Le prix de vente actuel ne peut pas être inférieur au prix minimum de vente';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_product_prices
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION validate_product_prices();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Activer RLS
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_stores ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLITIQUES RLS POUR UNITS
-- =====================================================

-- SuperAdmin peut tout faire
CREATE POLICY "SuperAdmin units full access" ON units
    FOR ALL USING (is_superadmin());

-- Admin peut gérer les unités
CREATE POLICY "Admin units management" ON units
    FOR ALL USING (is_admin());

-- Tous les utilisateurs actifs peuvent voir les unités actives
CREATE POLICY "Users can view active units" ON units
    FOR SELECT USING (
        is_active = true AND
        EXISTS (SELECT 1 FROM users WHERE auth_id = get_current_user_id() AND status = 'active')
    );

-- =====================================================
-- POLITIQUES RLS POUR CATEGORIES
-- =====================================================

-- SuperAdmin peut tout faire
CREATE POLICY "SuperAdmin categories full access" ON categories
    FOR ALL USING (is_superadmin());

-- Admin peut gérer les catégories
CREATE POLICY "Admin categories management" ON categories
    FOR ALL USING (is_admin());

-- Tous les utilisateurs actifs peuvent voir les catégories actives
CREATE POLICY "Users can view active categories" ON categories
    FOR SELECT USING (
        is_active = true AND
        EXISTS (SELECT 1 FROM users WHERE auth_id = get_current_user_id() AND status = 'active')
    );

-- =====================================================
-- POLITIQUES RLS POUR PRODUCTS
-- =====================================================

-- SuperAdmin peut tout faire
CREATE POLICY "SuperAdmin products full access" ON products
    FOR ALL USING (is_superadmin());

-- Admin peut gérer tous les produits
CREATE POLICY "Admin products management" ON products
    FOR ALL USING (is_admin());

-- Tous les utilisateurs actifs peuvent voir les produits actifs
CREATE POLICY "Users can view active products" ON products
    FOR SELECT USING (
        is_active = true AND
        EXISTS (SELECT 1 FROM users WHERE auth_id = get_current_user_id() AND status = 'active')
    );

-- =====================================================
-- POLITIQUES RLS POUR PRODUCT_STORES
-- =====================================================

-- SuperAdmin peut tout faire
CREATE POLICY "SuperAdmin product stores full access" ON product_stores
    FOR ALL USING (is_superadmin());

-- Admin peut gérer tous les produits par magasin
CREATE POLICY "Admin product stores management" ON product_stores
    FOR ALL USING (is_admin());

-- Manager peut voir et modifier les produits de ses magasins
CREATE POLICY "Manager product stores access" ON product_stores
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_stores us
            JOIN users u ON u.id = us.user_id
            WHERE u.auth_id = get_current_user_id()
            AND u.role = 'Manager'
            AND us.store_id = product_stores.store_id
        )
    );

-- Vendeur peut voir les produits de son magasin
CREATE POLICY "Vendeur product stores access" ON product_stores
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_stores us
            JOIN users u ON u.id = us.user_id
            WHERE u.auth_id = get_current_user_id()
            AND u.role = 'Vendeur'
            AND us.store_id = product_stores.store_id
        )
    );

-- =====================================================
-- FONCTIONS DE GESTION
-- =====================================================

-- Fonction pour obtenir les produits d'un magasin
CREATE OR REPLACE FUNCTION get_store_products(store_uuid UUID)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    product_sku TEXT,
    category_name TEXT,
    unit_symbol TEXT,
    current_stock INTEGER,
    min_stock INTEGER,
    current_price DECIMAL(10,2),
    min_price DECIMAL(10,2),
    is_available BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.sku,
        c.name,
        u.symbol,
        ps.current_stock,
        ps.min_stock,
        p.current_sale_price,
        p.min_sale_price,
        ps.is_available
    FROM products p
    JOIN product_stores ps ON ps.product_id = p.id
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN units u ON u.id = p.unit_id
    WHERE ps.store_id = store_uuid
    AND p.is_active = true
    ORDER BY p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour assigner automatiquement un produit à un magasin lors de la première validation
CREATE OR REPLACE FUNCTION assign_product_to_store(
    p_product_id UUID,
    p_store_id UUID,
    p_initial_stock INTEGER DEFAULT 0
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Insérer l'assignation si elle n'existe pas
    INSERT INTO product_stores (product_id, store_id, current_stock, assigned_by)
    VALUES (p_product_id, p_store_id, p_initial_stock, (SELECT id FROM users WHERE auth_id = get_current_user_id()))
    ON CONFLICT (product_id, store_id) DO NOTHING;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour mettre à jour le stock d'un produit
CREATE OR REPLACE FUNCTION update_product_stock(
    p_product_id UUID,
    p_store_id UUID,
    p_quantity_change INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    new_stock INTEGER;
BEGIN
    -- Mettre à jour le stock
    UPDATE product_stores 
    SET current_stock = current_stock + p_quantity_change
    WHERE product_id = p_product_id AND store_id = p_store_id
    RETURNING current_stock INTO new_stock;
    
    -- Vérifier que le stock ne devient pas négatif
    IF new_stock < 0 THEN
        RAISE EXCEPTION 'Stock insuffisant pour cette opération';
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- DONNÉES INITIALES
-- =====================================================

-- Insérer les unités de base
INSERT INTO units (name, symbol, description) VALUES
('Pièce', 'pcs', 'Unité par pièce'),
('Kilogramme', 'kg', 'Unité en kilogrammes'),
('Gramme', 'g', 'Unité en grammes'),
('Litre', 'L', 'Unité en litres'),
('Millilitre', 'ml', 'Unité en millilitres'),
('Mètre', 'm', 'Unité en mètres'),
('Centimètre', 'cm', 'Unité en centimètres'),
('Paquet', 'pkg', 'Unité par paquet'),
('Boîte', 'box', 'Unité par boîte'),
('Carton', 'ctn', 'Unité par carton');

-- Insérer les catégories de base
INSERT INTO categories (name, description, color) VALUES
('Alimentation', 'Produits alimentaires', '#10B981'),
('Boissons', 'Boissons et liquides', '#3B82F6'),
('Hygiène', 'Produits d''hygiène', '#F59E0B'),
('Électronique', 'Produits électroniques', '#8B5CF6'),
('Vêtements', 'Vêtements et accessoires', '#EF4444'),
('Maison', 'Produits pour la maison', '#06B6D4'),
('Sport', 'Articles de sport', '#84CC16'),
('Loisirs', 'Produits de loisirs', '#F97316'),
('Automobile', 'Pièces automobiles', '#6B7280'),
('Autres', 'Autres catégories', '#9CA3AF');

-- =====================================================
-- COMMENTAIRES
-- =====================================================

COMMENT ON TABLE units IS 'Table des unités de mesure';
COMMENT ON TABLE categories IS 'Table des catégories de produits';
COMMENT ON TABLE products IS 'Table des produits avec SKU auto-généré';
COMMENT ON TABLE product_stores IS 'Table d''assignation des produits aux magasins avec stock';
COMMENT ON FUNCTION get_store_products(UUID) IS 'Retourne les produits d''un magasin spécifique';
COMMENT ON FUNCTION assign_product_to_store(UUID, UUID, INTEGER) IS 'Assigne un produit à un magasin lors de la première validation';
COMMENT ON FUNCTION update_product_stock(UUID, UUID, INTEGER) IS 'Met à jour le stock d''un produit dans un magasin'; 