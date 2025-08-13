-- =====================================================
-- GESFLEX PRO - VENTES ET RETOURS
-- Système de vente avec codes uniques et gestion des retours/échanges
-- =====================================================

-- =====================================================
-- TABLE CLIENTS
-- =====================================================

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Contraintes
    CONSTRAINT customers_name_check CHECK (length(name) >= 2),
    CONSTRAINT customers_email_check CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- =====================================================
-- TABLE VENTES
-- =====================================================

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
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    notes TEXT,
    sold_by UUID NOT NULL REFERENCES users(id),
    sold_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Contraintes
    CONSTRAINT sales_amount_check CHECK (subtotal >= 0 AND total_amount >= 0 AND tax_amount >= 0)
);

-- =====================================================
-- TABLE DÉTAILS DE VENTE
-- =====================================================

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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Contraintes
    CONSTRAINT sale_items_quantity_check CHECK (quantity > 0),
    CONSTRAINT sale_items_price_check CHECK (unit_price >= 0 AND total_price >= 0)
);

-- =====================================================
-- TABLE RETOURS ET ÉCHANGES
-- =====================================================

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
    processed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Contraintes
    -- Aucune contrainte CHECK avec sous-requête
);

-- =====================================================
-- TABLE DÉTAILS DE RETOUR
-- =====================================================

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
    price_difference DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Contraintes
    CONSTRAINT return_items_quantity_check CHECK (returned_quantity > 0),
    CONSTRAINT return_items_price_check CHECK (
        original_unit_price >= 0 AND original_total_price >= 0 AND
        (exchange_unit_price IS NULL OR exchange_unit_price >= 0) AND
        (exchange_total_price IS NULL OR exchange_total_price >= 0)
    )
);

-- =====================================================
-- INDEX POUR PERFORMANCE
-- =====================================================

CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_active ON customers(is_active);
CREATE INDEX idx_sales_store ON sales(store_id);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_code ON sales(sale_code);
CREATE INDEX idx_sales_sold_by ON sales(sold_by);
CREATE INDEX idx_sales_date ON sales(sold_at);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);
CREATE INDEX idx_returns_sale ON returns(original_sale_id);
CREATE INDEX idx_returns_code ON returns(return_code);
CREATE INDEX idx_returns_status ON returns(return_status);
CREATE INDEX idx_return_items_return ON return_items(return_id);
CREATE INDEX idx_return_items_product ON return_items(product_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at
    BEFORE UPDATE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_returns_updated_at
    BEFORE UPDATE ON returns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour générer automatiquement le code de vente
CREATE OR REPLACE FUNCTION generate_sale_code()
RETURNS TRIGGER AS $$
BEGIN
    -- Si le code n'est pas fourni, le générer
    IF NEW.sale_code IS NULL OR NEW.sale_code = '' THEN
        NEW.sale_code := generate_unique_code('V');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_sale_code
    BEFORE INSERT ON sales
    FOR EACH ROW
    EXECUTE FUNCTION generate_sale_code();

-- Trigger pour générer automatiquement le code de retour
CREATE OR REPLACE FUNCTION generate_return_code()
RETURNS TRIGGER AS $$
BEGIN
    -- Si le code n'est pas fourni, le générer
    IF NEW.return_code IS NULL OR NEW.return_code = '' THEN
        NEW.return_code := generate_unique_code('R');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_return_code
    BEFORE INSERT ON returns
    FOR EACH ROW
    EXECUTE FUNCTION generate_return_code();

-- Trigger pour calculer automatiquement le total de vente
CREATE OR REPLACE FUNCTION calculate_sale_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_amount := NEW.subtotal + NEW.tax_amount;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_sale_total
    BEFORE INSERT OR UPDATE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION calculate_sale_total();

-- Trigger pour calculer automatiquement le prix total des articles
CREATE OR REPLACE FUNCTION calculate_sale_item_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_price := NEW.quantity * NEW.unit_price;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_sale_item_total
    BEFORE INSERT OR UPDATE ON sale_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_sale_item_total();

-- Trigger pour valider les prix de vente
CREATE OR REPLACE FUNCTION validate_sale_prices()
RETURNS TRIGGER AS $$
DECLARE
    min_price DECIMAL(10,2);
    current_user_role user_role;
BEGIN
    -- Récupérer le prix minimum du produit
    SELECT min_sale_price INTO min_price FROM products WHERE id = NEW.product_id;
    
    -- Récupérer le rôle de l'utilisateur
    SELECT role INTO current_user_role FROM users WHERE auth_id = get_current_user_id();
    
    -- Vérifier que le prix de vente n'est pas inférieur au prix minimum
    IF NEW.unit_price < min_price THEN
        -- Seuls les Manager et Admin peuvent vendre en dessous du prix minimum
        IF current_user_role NOT IN ('Manager', 'Admin', 'SuperAdmin') THEN
            RAISE EXCEPTION 'Le prix de vente ne peut pas être inférieur au prix minimum. Contactez un manager ou admin.';
        END IF;
        
        -- Si c'est un Manager ou Admin, vérifier qu'une raison de réduction est fournie
        IF NEW.discount_reason IS NULL OR trim(NEW.discount_reason) = '' THEN
            RAISE EXCEPTION 'Une raison de réduction est requise pour vendre en dessous du prix minimum.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_sale_prices
    BEFORE INSERT OR UPDATE ON sale_items
    FOR EACH ROW
    EXECUTE FUNCTION validate_sale_prices();

-- Trigger pour mettre à jour le stock lors d'une vente
CREATE OR REPLACE FUNCTION update_stock_on_sale()
RETURNS TRIGGER AS $$
DECLARE
    store_id UUID;
BEGIN
    -- Récupérer le magasin de la vente
    SELECT s.store_id INTO store_id FROM sales s WHERE s.id = NEW.sale_id;
    
    -- Mettre à jour le stock (diminuer)
    PERFORM update_product_stock(NEW.product_id, store_id, -NEW.quantity);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_on_sale
    AFTER INSERT ON sale_items
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_on_sale();

-- Trigger pour calculer la différence de prix lors d'un échange
CREATE OR REPLACE FUNCTION calculate_exchange_difference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.exchange_total_price IS NOT NULL THEN
        NEW.price_difference := NEW.exchange_total_price - NEW.original_total_price;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_exchange_difference
    BEFORE INSERT OR UPDATE ON return_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_exchange_difference();

-- Trigger pour valider que seuls les utilisateurs autorisés peuvent créer des ventes
CREATE OR REPLACE FUNCTION validate_sale_creator_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Vérifier que l'utilisateur qui crée la vente a un rôle autorisé
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = NEW.sold_by 
        AND role IN ('Vendeur', 'Manager', 'Admin', 'SuperAdmin')
    ) THEN
        RAISE EXCEPTION 'Seuls les Vendeurs, Managers, Admin et SuperAdmin peuvent créer des ventes';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_sale_creator_role
    BEFORE INSERT ON sales
    FOR EACH ROW
    EXECUTE FUNCTION validate_sale_creator_role();

-- Trigger pour valider que seuls les utilisateurs autorisés peuvent traiter les retours
CREATE OR REPLACE FUNCTION validate_return_processor_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Vérifier que l'utilisateur qui traite le retour a un rôle autorisé
    IF NEW.processed_by IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = NEW.processed_by 
        AND role IN ('Vendeur', 'Manager', 'Admin', 'SuperAdmin')
    ) THEN
        RAISE EXCEPTION 'Seuls les Vendeurs, Managers, Admin et SuperAdmin peuvent traiter les retours';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_return_processor_role
    BEFORE INSERT OR UPDATE ON returns
    FOR EACH ROW
    EXECUTE FUNCTION validate_return_processor_role();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Activer RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLITIQUES RLS POUR CUSTOMERS
-- =====================================================

-- SuperAdmin peut tout faire
CREATE POLICY "SuperAdmin customers full access" ON customers
    FOR ALL USING (is_superadmin());

-- Admin peut gérer tous les clients
CREATE POLICY "Admin customers management" ON customers
    FOR ALL USING (is_admin());

-- Tous les utilisateurs actifs peuvent voir les clients actifs
CREATE POLICY "Users can view active customers" ON customers
    FOR SELECT USING (
        is_active = true AND
        EXISTS (SELECT 1 FROM users WHERE auth_id = get_current_user_id() AND status = 'active')
    );

-- =====================================================
-- POLITIQUES RLS POUR SALES
-- =====================================================

-- SuperAdmin peut tout faire
CREATE POLICY "SuperAdmin sales full access" ON sales
    FOR ALL USING (is_superadmin());

-- Admin peut voir toutes les ventes
CREATE POLICY "Admin sales access" ON sales
    FOR ALL USING (is_admin());

-- Manager peut voir les ventes de ses magasins
CREATE POLICY "Manager sales access" ON sales
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_stores us
            JOIN users u ON u.id = us.user_id
            WHERE u.auth_id = get_current_user_id()
            AND u.role = 'Manager'
            AND us.store_id = sales.store_id
        )
    );

-- Vendeur peut voir et créer les ventes de son magasin
CREATE POLICY "Vendeur sales access" ON sales
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_stores us
            JOIN users u ON u.id = us.user_id
            WHERE u.auth_id = get_current_user_id()
            AND u.role = 'Vendeur'
            AND us.store_id = sales.store_id
        )
    );

-- =====================================================
-- POLITIQUES RLS POUR SALE_ITEMS
-- =====================================================

-- SuperAdmin peut tout faire
CREATE POLICY "SuperAdmin sale items full access" ON sale_items
    FOR ALL USING (is_superadmin());

-- Admin peut voir tous les articles de vente
CREATE POLICY "Admin sale items access" ON sale_items
    FOR ALL USING (is_admin());

-- Manager peut voir les articles de vente de ses magasins
CREATE POLICY "Manager sale items access" ON sale_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sales s
            JOIN user_stores us ON us.store_id = s.store_id
            JOIN users u ON u.id = us.user_id
            WHERE u.auth_id = get_current_user_id()
            AND u.role = 'Manager'
            AND s.id = sale_items.sale_id
        )
    );

-- Vendeur peut voir les articles de vente de son magasin
CREATE POLICY "Vendeur sale items access" ON sale_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sales s
            JOIN user_stores us ON us.store_id = s.store_id
            JOIN users u ON u.id = us.user_id
            WHERE u.auth_id = get_current_user_id()
            AND u.role = 'Vendeur'
            AND s.id = sale_items.sale_id
        )
    );

-- =====================================================
-- POLITIQUES RLS POUR RETURNS
-- =====================================================

-- SuperAdmin peut tout faire
CREATE POLICY "SuperAdmin returns full access" ON returns
    FOR ALL USING (is_superadmin());

-- Admin peut gérer tous les retours
CREATE POLICY "Admin returns management" ON returns
    FOR ALL USING (is_admin());

-- Manager peut gérer les retours de ses magasins
CREATE POLICY "Manager returns management" ON returns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM sales s
            JOIN user_stores us ON us.store_id = s.store_id
            JOIN users u ON u.id = us.user_id
            WHERE u.auth_id = get_current_user_id()
            AND u.role = 'Manager'
            AND s.id = returns.original_sale_id
        )
    );

-- Vendeur peut créer et voir les retours de son magasin
CREATE POLICY "Vendeur returns access" ON returns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM sales s
            JOIN user_stores us ON us.store_id = s.store_id
            JOIN users u ON u.id = us.user_id
            WHERE u.auth_id = get_current_user_id()
            AND u.role = 'Vendeur'
            AND s.id = returns.original_sale_id
        )
    );

-- =====================================================
-- POLITIQUES RLS POUR RETURN_ITEMS
-- =====================================================

-- SuperAdmin peut tout faire
CREATE POLICY "SuperAdmin return items full access" ON return_items
    FOR ALL USING (is_superadmin());

-- Admin peut voir tous les articles de retour
CREATE POLICY "Admin return items access" ON return_items
    FOR ALL USING (is_admin());

-- Manager peut voir les articles de retour de ses magasins
CREATE POLICY "Manager return items access" ON return_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM returns r
            JOIN sales s ON s.id = r.original_sale_id
            JOIN user_stores us ON us.store_id = s.store_id
            JOIN users u ON u.id = us.user_id
            WHERE u.auth_id = get_current_user_id()
            AND u.role = 'Manager'
            AND r.id = return_items.return_id
        )
    );

-- Vendeur peut voir les articles de retour de son magasin
CREATE POLICY "Vendeur return items access" ON return_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM returns r
            JOIN sales s ON s.id = r.original_sale_id
            JOIN user_stores us ON us.store_id = s.store_id
            JOIN users u ON u.id = us.user_id
            WHERE u.auth_id = get_current_user_id()
            AND u.role = 'Vendeur'
            AND r.id = return_items.return_id
        )
    );

-- =====================================================
-- FONCTIONS DE GESTION
-- =====================================================

-- Fonction pour créer une vente complète
CREATE OR REPLACE FUNCTION create_sale(
    p_store_id UUID,
    p_customer_data JSONB,
    p_payment_method payment_method,
    p_items JSONB,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    sale_id UUID;
    customer_id UUID;
    item JSONB;
    subtotal DECIMAL(10,2) := 0;
    tax_amount DECIMAL(10,2) := 0;
    total_amount DECIMAL(10,2) := 0;
    current_user_id UUID;
BEGIN
    -- Récupérer l'ID de l'utilisateur connecté
    SELECT id INTO current_user_id FROM users WHERE auth_id = get_current_user_id();
    
    -- Vérifier que l'utilisateur a accès au magasin
    IF NOT EXISTS (
        SELECT 1 FROM user_stores us
        WHERE us.user_id = current_user_id
        AND us.store_id = p_store_id
    ) THEN
        RAISE EXCEPTION 'Vous n''avez pas accès à ce magasin';
    END IF;
    
    -- Créer ou récupérer le client
    IF p_customer_data->>'id' IS NOT NULL THEN
        customer_id := (p_customer_data->>'id')::UUID;
    ELSE
        INSERT INTO customers (name, email, phone, created_by)
        VALUES (
            p_customer_data->>'name',
            p_customer_data->>'email',
            p_customer_data->>'phone',
            current_user_id
        )
        RETURNING id INTO customer_id;
    END IF;
    
    -- Créer la vente
    INSERT INTO sales (
        store_id, customer_id, customer_name, customer_email, customer_phone,
        payment_method, subtotal, tax_amount, total_amount, notes, sold_by
    )
    VALUES (
        p_store_id, customer_id,
        p_customer_data->>'name',
        p_customer_data->>'email',
        p_customer_data->>'phone',
        p_payment_method, 0, 0, 0, p_notes, current_user_id
    )
    RETURNING id INTO sale_id;
    
    -- Ajouter les articles
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO sale_items (
            sale_id, product_id, product_name, product_sku,
            quantity, unit_price, total_price, discount_reason
        )
        VALUES (
            sale_id,
            (item->>'product_id')::UUID,
            item->>'product_name',
            item->>'product_sku',
            (item->>'quantity')::INTEGER,
            (item->>'unit_price')::DECIMAL(10,2),
            (item->>'total_price')::DECIMAL(10,2),
            item->>'discount_reason'
        );
        
        subtotal := subtotal + (item->>'total_price')::DECIMAL(10,2);
    END LOOP;
    
    -- Calculer la TVA (à adapter selon la configuration)
    tax_amount := subtotal * 0.18; -- 18% de TVA par défaut
    
    -- Mettre à jour la vente avec les totaux
    UPDATE sales 
    SET subtotal = subtotal, tax_amount = tax_amount, total_amount = subtotal + tax_amount
    WHERE id = sale_id;
    
    RETURN sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour créer un retour/échange
CREATE OR REPLACE FUNCTION create_return(
    p_sale_code TEXT,
    p_customer_data JSONB,
    p_items JSONB,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    return_id UUID;
    sale_id UUID;
    item JSONB;
    current_user_id UUID;
    store_id UUID;
BEGIN
    -- Récupérer l'ID de l'utilisateur connecté
    SELECT id INTO current_user_id FROM users WHERE auth_id = get_current_user_id();
    
    -- Vérifier que la vente existe
    SELECT id, store_id INTO sale_id, store_id FROM sales WHERE sale_code = p_sale_code;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Vente non trouvée avec le code: %', p_sale_code;
    END IF;
    
    -- Vérifier que l'utilisateur a accès au magasin
    IF NOT EXISTS (
        SELECT 1 FROM user_stores us
        WHERE us.user_id = current_user_id
        AND us.store_id = store_id
    ) THEN
        RAISE EXCEPTION 'Vous n''avez pas accès à ce magasin';
    END IF;
    
    -- Créer le retour
    INSERT INTO returns (
        original_sale_id, customer_name, customer_email, customer_phone,
        return_reason, notes
    )
    VALUES (
        sale_id,
        p_customer_data->>'name',
        p_customer_data->>'email',
        p_customer_data->>'phone',
        p_customer_data->>'return_reason',
        p_notes
    )
    RETURNING id INTO return_id;
    
    -- Ajouter les articles de retour
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO return_items (
            return_id, original_sale_item_id, product_id, product_name, product_sku,
            returned_quantity, original_unit_price, original_total_price,
            exchange_product_id, exchange_quantity, exchange_unit_price, exchange_total_price
        )
        VALUES (
            return_id,
            (item->>'original_sale_item_id')::UUID,
            (item->>'product_id')::UUID,
            item->>'product_name',
            item->>'product_sku',
            (item->>'returned_quantity')::INTEGER,
            (item->>'original_unit_price')::DECIMAL(10,2),
            (item->>'original_total_price')::DECIMAL(10,2),
            CASE WHEN item->>'exchange_product_id' != 'null' THEN (item->>'exchange_product_id')::UUID ELSE NULL END,
            CASE WHEN item->>'exchange_quantity' != 'null' THEN (item->>'exchange_quantity')::INTEGER ELSE NULL END,
            CASE WHEN item->>'exchange_unit_price' != 'null' THEN (item->>'exchange_unit_price')::DECIMAL(10,2) ELSE NULL END,
            CASE WHEN item->>'exchange_total_price' != 'null' THEN (item->>'exchange_total_price')::DECIMAL(10,2) ELSE NULL END
        );
    END LOOP;
    
    RETURN return_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTAIRES
-- =====================================================

COMMENT ON TABLE customers IS 'Table des clients';
COMMENT ON TABLE sales IS 'Table des ventes avec codes uniques';
COMMENT ON TABLE sale_items IS 'Détails des articles vendus';
COMMENT ON TABLE returns IS 'Table des retours et échanges avec codes uniques';
COMMENT ON TABLE return_items IS 'Détails des articles retournés/échangés';
COMMENT ON FUNCTION create_sale(UUID, JSONB, payment_method, JSONB, TEXT) IS 'Crée une vente complète avec articles';
COMMENT ON FUNCTION create_return(TEXT, JSONB, JSONB, TEXT) IS 'Crée un retour/échange basé sur le code de vente';
COMMENT ON FUNCTION validate_sale_creator_role() IS 'Valide que seuls les utilisateurs autorisés peuvent créer des ventes';
COMMENT ON FUNCTION validate_return_processor_role() IS 'Valide que seuls les utilisateurs autorisés peuvent traiter les retours'; 