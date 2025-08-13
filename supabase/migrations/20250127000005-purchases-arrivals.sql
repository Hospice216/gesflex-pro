-- =====================================================
-- GESFLEX PRO - ACHATS ET ARRIVAGES
-- Workflow de validation : Admin crée achat → Manager valide arrivage
-- =====================================================

-- =====================================================
-- TABLE ACHATS
-- =====================================================

CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_code TEXT UNIQUE NOT NULL,
    store_id UUID NOT NULL REFERENCES stores(id),
    product_id UUID NOT NULL REFERENCES products(id),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    barcode TEXT,
    expected_arrival_date DATE,
    status validation_status DEFAULT 'pending',
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Contraintes
    CONSTRAINT purchases_quantity_check CHECK (quantity > 0),
    CONSTRAINT purchases_unit_price_check CHECK (unit_price > 0),
    CONSTRAINT purchases_total_amount_check CHECK (total_amount > 0)
);

-- =====================================================
-- TABLE ARRIVAGES (VALIDATIONS)
-- =====================================================

CREATE TABLE arrivals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    received_quantity INTEGER NOT NULL,
    received_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    validated_by UUID NOT NULL REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Contraintes
    CONSTRAINT arrivals_quantity_check CHECK (received_quantity > 0)
);

-- =====================================================
-- TABLE HISTORIQUE DES MODIFICATIONS D'ACHATS
-- =====================================================

CREATE TABLE purchase_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'validated'
    old_values JSONB,
    new_values JSONB,
    performed_by UUID NOT NULL REFERENCES users(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Contraintes
    CONSTRAINT purchase_history_action_check CHECK (action IN ('created', 'updated', 'deleted', 'validated'))
);

-- =====================================================
-- INDEX POUR PERFORMANCE
-- =====================================================

CREATE INDEX idx_purchases_store ON purchases(store_id);
CREATE INDEX idx_purchases_product ON purchases(product_id);
CREATE INDEX idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_purchases_created_by ON purchases(created_by);
CREATE INDEX idx_purchases_code ON purchases(purchase_code);
CREATE INDEX idx_arrivals_purchase ON arrivals(purchase_id);
CREATE INDEX idx_arrivals_validated_by ON arrivals(validated_by);
CREATE INDEX idx_purchase_history_purchase ON purchase_history(purchase_id);
CREATE INDEX idx_purchase_history_performed_by ON purchase_history(performed_by);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_purchases_updated_at
    BEFORE UPDATE ON purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour générer automatiquement le code d'achat
CREATE OR REPLACE FUNCTION generate_purchase_code()
RETURNS TRIGGER AS $$
BEGIN
    -- Si le code n'est pas fourni, le générer
    IF NEW.purchase_code IS NULL OR NEW.purchase_code = '' THEN
        NEW.purchase_code := generate_unique_code('PUR');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_purchase_code
    BEFORE INSERT ON purchases
    FOR EACH ROW
    EXECUTE FUNCTION generate_purchase_code();

-- Trigger pour calculer automatiquement le montant total
CREATE OR REPLACE FUNCTION calculate_purchase_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_amount := NEW.quantity * NEW.unit_price;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_purchase_total
    BEFORE INSERT OR UPDATE ON purchases
    FOR EACH ROW
    EXECUTE FUNCTION calculate_purchase_total();

-- Trigger pour empêcher la modification après validation
CREATE OR REPLACE FUNCTION prevent_purchase_modification_after_validation()
RETURNS TRIGGER AS $$
BEGIN
    -- Si l'achat est validé, seul le SuperAdmin peut le modifier
    IF OLD.status = 'validated' AND NEW.status = 'validated' THEN
        IF NOT is_superadmin() THEN
            RAISE EXCEPTION 'Impossible de modifier un achat validé. Seul le SuperAdmin peut le faire.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_purchase_modification_after_validation
    BEFORE UPDATE ON purchases
    FOR EACH ROW
    EXECUTE FUNCTION prevent_purchase_modification_after_validation();

-- Trigger pour valider que seuls les Admin/SuperAdmin peuvent créer des achats
CREATE OR REPLACE FUNCTION validate_purchase_creator_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Vérifier que l'utilisateur qui crée l'achat est Admin ou SuperAdmin
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = NEW.created_by 
        AND role IN ('SuperAdmin', 'Admin')
    ) THEN
        RAISE EXCEPTION 'Seuls les Admin et SuperAdmin peuvent créer des achats';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_purchase_creator_role
    BEFORE INSERT ON purchases
    FOR EACH ROW
    EXECUTE FUNCTION validate_purchase_creator_role();

-- Trigger pour gérer la validation d'arrivage
CREATE OR REPLACE FUNCTION handle_arrival_validation()
RETURNS TRIGGER AS $$
DECLARE
    purchase_record purchases%ROWTYPE;
    quantity_diff INTEGER;
BEGIN
    -- Récupérer les informations de l'achat
    SELECT * INTO purchase_record FROM purchases WHERE id = NEW.purchase_id;
    
    -- Vérifier que l'arrivage n'existe pas déjà pour cet achat
    IF EXISTS (SELECT 1 FROM arrivals WHERE purchase_id = NEW.purchase_id) THEN
        RAISE EXCEPTION 'Un arrivage existe déjà pour cet achat';
    END IF;
    
    -- Calculer la différence entre quantité commandée et reçue
    quantity_diff := NEW.received_quantity - purchase_record.quantity;
    
    -- Si les quantités ne correspondent pas, lever une exception
    IF quantity_diff != 0 THEN
        RAISE EXCEPTION 'Quantité reçue (%) ne correspond pas à la quantité commandée (%). Veuillez vérifier ou contacter l''administrateur.', 
            NEW.received_quantity, purchase_record.quantity;
    END IF;
    
    -- Marquer l'achat comme validé
    UPDATE purchases 
    SET status = 'validated', updated_at = now()
    WHERE id = NEW.purchase_id;
    
    -- Assigner automatiquement le produit au magasin s'il n'y est pas déjà
    PERFORM assign_product_to_store(
        purchase_record.product_id, 
        purchase_record.store_id, 
        NEW.received_quantity
    );
    
    -- Mettre à jour le stock du produit
    PERFORM update_product_stock(
        purchase_record.product_id,
        purchase_record.store_id,
        NEW.received_quantity
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_handle_arrival_validation
    BEFORE INSERT ON arrivals
    FOR EACH ROW
    EXECUTE FUNCTION handle_arrival_validation();

-- Trigger pour valider que seuls les Managers peuvent valider les arrivages
CREATE OR REPLACE FUNCTION validate_arrival_validator_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Vérifier que l'utilisateur qui valide l'arrivage est Manager
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = NEW.validated_by 
        AND role = 'Manager'
    ) THEN
        RAISE EXCEPTION 'Seuls les Managers peuvent valider les arrivages';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_arrival_validator_role
    BEFORE INSERT ON arrivals
    FOR EACH ROW
    EXECUTE FUNCTION validate_arrival_validator_role();

-- Trigger pour l'historique des achats
CREATE OR REPLACE FUNCTION log_purchase_history()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO purchase_history (purchase_id, action, new_values, performed_by)
        VALUES (NEW.id, 'created', to_jsonb(NEW), NEW.created_by);
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO purchase_history (purchase_id, action, old_values, new_values, performed_by)
        VALUES (NEW.id, 'updated', to_jsonb(OLD), to_jsonb(NEW), (SELECT id FROM users WHERE auth_id = get_current_user_id()));
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO purchase_history (purchase_id, action, old_values, performed_by)
        VALUES (OLD.id, 'deleted', to_jsonb(OLD), (SELECT id FROM users WHERE auth_id = get_current_user_id()));
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_purchase_history
    AFTER INSERT OR UPDATE OR DELETE ON purchases
    FOR EACH ROW
    EXECUTE FUNCTION log_purchase_history();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Activer RLS
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE arrivals ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_history ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLITIQUES RLS POUR PURCHASES
-- =====================================================

-- SuperAdmin peut tout faire
CREATE POLICY "SuperAdmin purchases full access" ON purchases
    FOR ALL USING (is_superadmin());

-- Admin peut créer et gérer les achats de ses magasins
CREATE POLICY "Admin purchases management" ON purchases
    FOR ALL USING (
        is_admin() AND
        store_id = ANY(get_user_stores())
    );

-- Manager peut voir les achats de ses magasins (pour validation)
CREATE POLICY "Manager purchases view" ON purchases
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_stores us
            JOIN users u ON u.id = us.user_id
            WHERE u.auth_id = get_current_user_id()
            AND u.role = 'Manager'
            AND us.store_id = purchases.store_id
        )
    );

-- =====================================================
-- POLITIQUES RLS POUR ARRIVALS
-- =====================================================

-- SuperAdmin peut tout faire
CREATE POLICY "SuperAdmin arrivals full access" ON arrivals
    FOR ALL USING (is_superadmin());

-- Manager peut créer des arrivages pour ses magasins
CREATE POLICY "Manager arrivals management" ON arrivals
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_stores us
            JOIN users u ON u.id = us.user_id
            JOIN purchases p ON p.id = arrivals.purchase_id
            WHERE u.auth_id = get_current_user_id()
            AND u.role = 'Manager'
            AND us.store_id = p.store_id
        )
    );

-- Tous les utilisateurs autorisés peuvent voir les arrivages
CREATE POLICY "Users can view arrivals" ON arrivals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM purchases p
            JOIN user_stores us ON us.store_id = p.store_id
            JOIN users u ON u.id = us.user_id
            WHERE u.auth_id = get_current_user_id()
            AND p.id = arrivals.purchase_id
        )
    );

-- =====================================================
-- POLITIQUES RLS POUR PURCHASE_HISTORY
-- =====================================================

-- SuperAdmin peut tout voir
CREATE POLICY "SuperAdmin purchase history access" ON purchase_history
    FOR SELECT USING (is_superadmin());

-- Admin peut voir l'historique de ses achats
CREATE POLICY "Admin purchase history access" ON purchase_history
    FOR SELECT USING (
        is_admin() AND
        purchase_id IN (
            SELECT id FROM purchases 
            WHERE store_id = ANY(get_user_stores())
        )
    );

-- Manager peut voir l'historique de ses magasins
CREATE POLICY "Manager purchase history access" ON purchase_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM purchases p
            JOIN user_stores us ON us.store_id = p.store_id
            JOIN users u ON u.id = us.user_id
            WHERE u.auth_id = get_current_user_id()
            AND u.role = 'Manager'
            AND p.id = purchase_history.purchase_id
        )
    );

-- =====================================================
-- FONCTIONS DE GESTION
-- =====================================================

-- Fonction pour obtenir les achats en attente de validation
CREATE OR REPLACE FUNCTION get_pending_purchases(store_uuid UUID DEFAULT NULL)
RETURNS TABLE (
    purchase_id UUID,
    purchase_code TEXT,
    product_name TEXT,
    product_sku TEXT,
    supplier_name TEXT,
    quantity INTEGER,
    unit_price DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    expected_arrival_date DATE,
    created_at TIMESTAMP WITH TIME ZONE,
    created_by_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.purchase_code,
        pr.name,
        pr.sku,
        s.name,
        p.quantity,
        p.unit_price,
        p.total_amount,
        p.expected_arrival_date,
        p.created_at,
        CONCAT(u.first_name, ' ', u.last_name)
    FROM purchases p
    JOIN products pr ON pr.id = p.product_id
    JOIN suppliers s ON s.id = p.supplier_id
    JOIN users u ON u.id = p.created_by
    WHERE p.status = 'pending'
    AND (store_uuid IS NULL OR p.store_id = store_uuid)
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour valider un arrivage
CREATE OR REPLACE FUNCTION validate_arrival(
    p_purchase_id UUID,
    p_received_quantity INTEGER,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    purchase_record purchases%ROWTYPE;
    current_user_id UUID;
BEGIN
    -- Récupérer l'ID de l'utilisateur connecté
    SELECT id INTO current_user_id FROM users WHERE auth_id = get_current_user_id();
    
    -- Vérifier que l'utilisateur est un Manager
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = current_user_id AND role = 'Manager') THEN
        RAISE EXCEPTION 'Seuls les Managers peuvent valider les arrivages';
    END IF;
    
    -- Récupérer les informations de l'achat
    SELECT * INTO purchase_record FROM purchases WHERE id = p_purchase_id;
    
    -- Vérifier que l'achat existe et est en attente
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Achat non trouvé';
    END IF;
    
    IF purchase_record.status != 'pending' THEN
        RAISE EXCEPTION 'Cet achat a déjà été validé';
    END IF;
    
    -- Vérifier que le Manager a accès au magasin de l'achat
    IF NOT EXISTS (
        SELECT 1 FROM user_stores us
        WHERE us.user_id = current_user_id
        AND us.store_id = purchase_record.store_id
    ) THEN
        RAISE EXCEPTION 'Vous n''avez pas accès à ce magasin';
    END IF;
    
    -- Insérer l'arrivage (le trigger gérera la validation et la mise à jour du stock)
    INSERT INTO arrivals (purchase_id, received_quantity, validated_by, notes)
    VALUES (p_purchase_id, p_received_quantity, current_user_id, p_notes);
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir l'historique des arrivages
CREATE OR REPLACE FUNCTION get_arrivals_history(store_uuid UUID DEFAULT NULL)
RETURNS TABLE (
    arrival_id UUID,
    purchase_code TEXT,
    product_name TEXT,
    supplier_name TEXT,
    ordered_quantity INTEGER,
    received_quantity INTEGER,
    received_date TIMESTAMP WITH TIME ZONE,
    validated_by_name TEXT,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        p.purchase_code,
        pr.name,
        s.name,
        p.quantity,
        a.received_quantity,
        a.received_date,
        CONCAT(u.first_name, ' ', u.last_name),
        a.notes
    FROM arrivals a
    JOIN purchases p ON p.id = a.purchase_id
    JOIN products pr ON pr.id = p.product_id
    JOIN suppliers s ON s.id = p.supplier_id
    JOIN users u ON u.id = a.validated_by
    WHERE (store_uuid IS NULL OR p.store_id = store_uuid)
    ORDER BY a.received_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTAIRES
-- =====================================================

COMMENT ON TABLE purchases IS 'Table des achats créés par les Admin';
COMMENT ON TABLE arrivals IS 'Table des validations d''arrivage par les Managers';
COMMENT ON TABLE purchase_history IS 'Historique des modifications d''achats';
COMMENT ON FUNCTION get_pending_purchases(UUID) IS 'Retourne les achats en attente de validation';
COMMENT ON FUNCTION validate_arrival(UUID, INTEGER, TEXT) IS 'Valide un arrivage avec vérification des quantités';
COMMENT ON FUNCTION get_arrivals_history(UUID) IS 'Retourne l''historique des arrivages validés';
COMMENT ON FUNCTION validate_purchase_creator_role() IS 'Valide que seuls les Admin/SuperAdmin peuvent créer des achats';
COMMENT ON FUNCTION validate_arrival_validator_role() IS 'Valide que seuls les Managers peuvent valider les arrivages'; 