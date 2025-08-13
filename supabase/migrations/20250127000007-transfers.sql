-- =====================================================
-- GESFLEX PRO - TRANSFERTS ENTRE MAGASINS
-- Workflow de validation : Admin crée transfert → Manager valide réception
-- =====================================================

-- =====================================================
-- TABLE TRANSFERTS
-- =====================================================

CREATE TABLE transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_code TEXT UNIQUE NOT NULL,
    source_store_id UUID NOT NULL REFERENCES stores(id),
    destination_store_id UUID NOT NULL REFERENCES stores(id),
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    status validation_status DEFAULT 'pending',
    expected_arrival_date DATE,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Contraintes
    CONSTRAINT transfers_quantity_check CHECK (quantity > 0),
    CONSTRAINT transfers_different_stores_check CHECK (source_store_id != destination_store_id)
);

-- =====================================================
-- TABLE RÉCEPTIONS DE TRANSFERTS
-- =====================================================

CREATE TABLE transfer_receptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_id UUID NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
    received_quantity INTEGER NOT NULL,
    received_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    validated_by UUID NOT NULL REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Contraintes
    CONSTRAINT transfer_receptions_quantity_check CHECK (received_quantity > 0)
);

-- =====================================================
-- TABLE HISTORIQUE DES TRANSFERTS
-- =====================================================

CREATE TABLE transfer_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_id UUID NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'validated'
    old_values JSONB,
    new_values JSONB,
    performed_by UUID NOT NULL REFERENCES users(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Contraintes
    CONSTRAINT transfer_history_action_check CHECK (action IN ('created', 'updated', 'deleted', 'validated'))
);

-- =====================================================
-- INDEX POUR PERFORMANCE
-- =====================================================

CREATE INDEX idx_transfers_source_store ON transfers(source_store_id);
CREATE INDEX idx_transfers_destination_store ON transfers(destination_store_id);
CREATE INDEX idx_transfers_product ON transfers(product_id);
CREATE INDEX idx_transfers_status ON transfers(status);
CREATE INDEX idx_transfers_created_by ON transfers(created_by);
CREATE INDEX idx_transfers_code ON transfers(transfer_code);
CREATE INDEX idx_transfer_receptions_transfer ON transfer_receptions(transfer_id);
CREATE INDEX idx_transfer_receptions_validated_by ON transfer_receptions(validated_by);
CREATE INDEX idx_transfer_history_transfer ON transfer_history(transfer_id);
CREATE INDEX idx_transfer_history_performed_by ON transfer_history(performed_by);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_transfers_updated_at
    BEFORE UPDATE ON transfers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour générer automatiquement le code de transfert
CREATE OR REPLACE FUNCTION generate_transfer_code()
RETURNS TRIGGER AS $$
BEGIN
    -- Si le code n'est pas fourni, le générer
    IF NEW.transfer_code IS NULL OR NEW.transfer_code = '' THEN
        NEW.transfer_code := generate_unique_code('TRF');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_transfer_code
    BEFORE INSERT ON transfers
    FOR EACH ROW
    EXECUTE FUNCTION generate_transfer_code();

-- Trigger pour empêcher la modification après validation
CREATE OR REPLACE FUNCTION prevent_transfer_modification_after_validation()
RETURNS TRIGGER AS $$
BEGIN
    -- Si le transfert est validé, seul le SuperAdmin peut le modifier
    IF OLD.status = 'validated' AND NEW.status = 'validated' THEN
        IF NOT is_superadmin() THEN
            RAISE EXCEPTION 'Impossible de modifier un transfert validé. Seul le SuperAdmin peut le faire.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_transfer_modification_after_validation
    BEFORE UPDATE ON transfers
    FOR EACH ROW
    EXECUTE FUNCTION prevent_transfer_modification_after_validation();

-- Trigger pour valider que seuls les Admin/SuperAdmin peuvent créer des transferts
CREATE OR REPLACE FUNCTION validate_transfer_creator_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Vérifier que l'utilisateur qui crée le transfert est Admin ou SuperAdmin
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = NEW.created_by 
        AND role IN ('SuperAdmin', 'Admin')
    ) THEN
        RAISE EXCEPTION 'Seuls les Admin et SuperAdmin peuvent créer des transferts';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_transfer_creator_role
    BEFORE INSERT ON transfers
    FOR EACH ROW
    EXECUTE FUNCTION validate_transfer_creator_role();

-- Trigger pour gérer la validation de réception
CREATE OR REPLACE FUNCTION handle_transfer_reception()
RETURNS TRIGGER AS $$
DECLARE
    transfer_record transfers%ROWTYPE;
    quantity_diff INTEGER;
BEGIN
    -- Récupérer les informations du transfert
    SELECT * INTO transfer_record FROM transfers WHERE id = NEW.transfer_id;
    
    -- Vérifier que la réception n'existe pas déjà pour ce transfert
    IF EXISTS (SELECT 1 FROM transfer_receptions WHERE transfer_id = NEW.transfer_id) THEN
        RAISE EXCEPTION 'Une réception existe déjà pour ce transfert';
    END IF;
    
    -- Calculer la différence entre quantité transférée et reçue
    quantity_diff := NEW.received_quantity - transfer_record.quantity;
    
    -- Si les quantités ne correspondent pas, lever une exception
    IF quantity_diff != 0 THEN
        RAISE EXCEPTION 'Quantité reçue (%) ne correspond pas à la quantité transférée (%). Veuillez vérifier ou contacter l''administrateur.', 
            NEW.received_quantity, transfer_record.quantity;
    END IF;
    
    -- Marquer le transfert comme validé
    UPDATE transfers 
    SET status = 'validated', updated_at = now()
    WHERE id = NEW.transfer_id;
    
    -- Diminuer le stock du magasin source
    PERFORM update_product_stock(
        transfer_record.product_id,
        transfer_record.source_store_id,
        -transfer_record.quantity
    );
    
    -- Assigner automatiquement le produit au magasin de destination s'il n'y est pas déjà
    PERFORM assign_product_to_store(
        transfer_record.product_id, 
        transfer_record.destination_store_id, 
        NEW.received_quantity
    );
    
    -- Augmenter le stock du magasin de destination
    PERFORM update_product_stock(
        transfer_record.product_id,
        transfer_record.destination_store_id,
        NEW.received_quantity
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_handle_transfer_reception
    BEFORE INSERT ON transfer_receptions
    FOR EACH ROW
    EXECUTE FUNCTION handle_transfer_reception();

-- Trigger pour valider que seuls les Managers peuvent valider les réceptions
CREATE OR REPLACE FUNCTION validate_transfer_reception_validator_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Vérifier que l'utilisateur qui valide la réception est Manager
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = NEW.validated_by 
        AND role = 'Manager'
    ) THEN
        RAISE EXCEPTION 'Seuls les Managers peuvent valider les réceptions de transferts';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_transfer_reception_validator_role
    BEFORE INSERT ON transfer_receptions
    FOR EACH ROW
    EXECUTE FUNCTION validate_transfer_reception_validator_role();

-- Trigger pour l'historique des transferts
CREATE OR REPLACE FUNCTION log_transfer_history()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO transfer_history (transfer_id, action, new_values, performed_by)
        VALUES (NEW.id, 'created', to_jsonb(NEW), NEW.created_by);
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO transfer_history (transfer_id, action, old_values, new_values, performed_by)
        VALUES (NEW.id, 'updated', to_jsonb(OLD), to_jsonb(NEW), (SELECT id FROM users WHERE auth_id = get_current_user_id()));
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO transfer_history (transfer_id, action, old_values, performed_by)
        VALUES (OLD.id, 'deleted', to_jsonb(OLD), (SELECT id FROM users WHERE auth_id = get_current_user_id()));
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_transfer_history
    AFTER INSERT OR UPDATE OR DELETE ON transfers
    FOR EACH ROW
    EXECUTE FUNCTION log_transfer_history();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Activer RLS
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_receptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_history ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLITIQUES RLS POUR TRANSFERS
-- =====================================================

-- SuperAdmin peut tout faire
CREATE POLICY "SuperAdmin transfers full access" ON transfers
    FOR ALL USING (is_superadmin());

-- Admin peut créer et gérer les transferts de ses magasins
CREATE POLICY "Admin transfers management" ON transfers
    FOR ALL USING (
        is_admin() AND
        (source_store_id = ANY(get_user_stores()) OR destination_store_id = ANY(get_user_stores()))
    );

-- Manager peut voir les transferts de ses magasins (pour validation)
CREATE POLICY "Manager transfers view" ON transfers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_stores us
            JOIN users u ON u.id = us.user_id
            WHERE u.auth_id = get_current_user_id()
            AND u.role = 'Manager'
            AND (us.store_id = transfers.source_store_id OR us.store_id = transfers.destination_store_id)
        )
    );

-- =====================================================
-- POLITIQUES RLS POUR TRANSFER_RECEPTIONS
-- =====================================================

-- SuperAdmin peut tout faire
CREATE POLICY "SuperAdmin transfer receptions full access" ON transfer_receptions
    FOR ALL USING (is_superadmin());

-- Manager peut créer des réceptions pour ses magasins
CREATE POLICY "Manager transfer receptions management" ON transfer_receptions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_stores us
            JOIN users u ON u.id = us.user_id
            JOIN transfers t ON t.id = transfer_receptions.transfer_id
            WHERE u.auth_id = get_current_user_id()
            AND u.role = 'Manager'
            AND us.store_id = t.destination_store_id
        )
    );

-- Tous les utilisateurs autorisés peuvent voir les réceptions
CREATE POLICY "Users can view transfer receptions" ON transfer_receptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM transfers t
            JOIN user_stores us ON (us.store_id = t.source_store_id OR us.store_id = t.destination_store_id)
            JOIN users u ON u.id = us.user_id
            WHERE u.auth_id = get_current_user_id()
            AND t.id = transfer_receptions.transfer_id
        )
    );

-- =====================================================
-- POLITIQUES RLS POUR TRANSFER_HISTORY
-- =====================================================

-- SuperAdmin peut tout voir
CREATE POLICY "SuperAdmin transfer history access" ON transfer_history
    FOR SELECT USING (is_superadmin());

-- Admin peut voir l'historique de ses transferts
CREATE POLICY "Admin transfer history access" ON transfer_history
    FOR SELECT USING (
        is_admin() AND
        transfer_id IN (
            SELECT id FROM transfers 
            WHERE source_store_id = ANY(get_user_stores()) OR destination_store_id = ANY(get_user_stores())
        )
    );

-- Manager peut voir l'historique de ses magasins
CREATE POLICY "Manager transfer history access" ON transfer_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM transfers t
            JOIN user_stores us ON (us.store_id = t.source_store_id OR us.store_id = t.destination_store_id)
            JOIN users u ON u.id = us.user_id
            WHERE u.auth_id = get_current_user_id()
            AND u.role = 'Manager'
            AND t.id = transfer_history.transfer_id
        )
    );

-- =====================================================
-- FONCTIONS DE GESTION
-- =====================================================

-- Fonction pour obtenir les transferts en attente de validation
CREATE OR REPLACE FUNCTION get_pending_transfers(store_uuid UUID DEFAULT NULL)
RETURNS TABLE (
    transfer_id UUID,
    transfer_code TEXT,
    source_store_name TEXT,
    destination_store_name TEXT,
    product_name TEXT,
    product_sku TEXT,
    quantity INTEGER,
    expected_arrival_date DATE,
    created_at TIMESTAMP WITH TIME ZONE,
    created_by_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.transfer_code,
        ss.name,
        ds.name,
        p.name,
        p.sku,
        t.quantity,
        t.expected_arrival_date,
        t.created_at,
        CONCAT(u.first_name, ' ', u.last_name)
    FROM transfers t
    JOIN stores ss ON ss.id = t.source_store_id
    JOIN stores ds ON ds.id = t.destination_store_id
    JOIN products p ON p.id = t.product_id
    JOIN users u ON u.id = t.created_by
    WHERE t.status = 'pending'
    AND (store_uuid IS NULL OR t.destination_store_id = store_uuid)
    ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour valider une réception de transfert
CREATE OR REPLACE FUNCTION validate_transfer_reception(
    p_transfer_id UUID,
    p_received_quantity INTEGER,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    transfer_record transfers%ROWTYPE;
    current_user_id UUID;
BEGIN
    -- Récupérer l'ID de l'utilisateur connecté
    SELECT id INTO current_user_id FROM users WHERE auth_id = get_current_user_id();
    
    -- Vérifier que l'utilisateur est un Manager
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = current_user_id AND role = 'Manager') THEN
        RAISE EXCEPTION 'Seuls les Managers peuvent valider les réceptions de transfert';
    END IF;
    
    -- Récupérer les informations du transfert
    SELECT * INTO transfer_record FROM transfers WHERE id = p_transfer_id;
    
    -- Vérifier que le transfert existe et est en attente
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transfert non trouvé';
    END IF;
    
    IF transfer_record.status != 'pending' THEN
        RAISE EXCEPTION 'Ce transfert a déjà été validé';
    END IF;
    
    -- Vérifier que le Manager a accès au magasin de destination
    IF NOT EXISTS (
        SELECT 1 FROM user_stores us
        WHERE us.user_id = current_user_id
        AND us.store_id = transfer_record.destination_store_id
    ) THEN
        RAISE EXCEPTION 'Vous n''avez pas accès au magasin de destination';
    END IF;
    
    -- Insérer la réception (le trigger gérera la validation et la mise à jour du stock)
    INSERT INTO transfer_receptions (transfer_id, received_quantity, validated_by, notes)
    VALUES (p_transfer_id, p_received_quantity, current_user_id, p_notes);
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir l'historique des transferts
CREATE OR REPLACE FUNCTION get_transfers_history(store_uuid UUID DEFAULT NULL)
RETURNS TABLE (
    transfer_id UUID,
    transfer_code TEXT,
    source_store_name TEXT,
    destination_store_name TEXT,
    product_name TEXT,
    quantity INTEGER,
    status validation_status,
    created_at TIMESTAMP WITH TIME ZONE,
    validated_at TIMESTAMP WITH TIME ZONE,
    created_by_name TEXT,
    validated_by_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.transfer_code,
        ss.name,
        ds.name,
        p.name,
        t.quantity,
        t.status,
        t.created_at,
        tr.received_date,
        CONCAT(uc.first_name, ' ', uc.last_name),
        CONCAT(uv.first_name, ' ', uv.last_name)
    FROM transfers t
    JOIN stores ss ON ss.id = t.source_store_id
    JOIN stores ds ON ds.id = t.destination_store_id
    JOIN products p ON p.id = t.product_id
    JOIN users uc ON uc.id = t.created_by
    LEFT JOIN transfer_receptions tr ON tr.transfer_id = t.id
    LEFT JOIN users uv ON uv.id = tr.validated_by
    WHERE (store_uuid IS NULL OR t.source_store_id = store_uuid OR t.destination_store_id = store_uuid)
    ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour créer un transfert
CREATE OR REPLACE FUNCTION create_transfer(
    p_source_store_id UUID,
    p_destination_store_id UUID,
    p_product_id UUID,
    p_quantity INTEGER,
    p_expected_arrival_date DATE DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    transfer_id UUID;
    current_user_id UUID;
    current_stock INTEGER;
BEGIN
    -- Récupérer l'ID de l'utilisateur connecté
    SELECT id INTO current_user_id FROM users WHERE auth_id = get_current_user_id();
    
    -- Vérifier que l'utilisateur est Admin ou SuperAdmin
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = current_user_id AND role IN ('Admin', 'SuperAdmin')) THEN
        RAISE EXCEPTION 'Seuls les Admin et SuperAdmin peuvent créer des transferts';
    END IF;
    
    -- Vérifier que l'utilisateur a accès aux deux magasins
    IF NOT EXISTS (
        SELECT 1 FROM user_stores us
        WHERE us.user_id = current_user_id
        AND us.store_id IN (p_source_store_id, p_destination_store_id)
    ) THEN
        RAISE EXCEPTION 'Vous n''avez pas accès à l''un des magasins';
    END IF;
    
    -- Vérifier que les magasins sont différents
    IF p_source_store_id = p_destination_store_id THEN
        RAISE EXCEPTION 'Les magasins source et destination doivent être différents';
    END IF;
    
    -- Vérifier le stock disponible
    SELECT current_stock INTO current_stock 
    FROM product_stores 
    WHERE product_id = p_product_id AND store_id = p_source_store_id;
    
    IF current_stock IS NULL OR current_stock < p_quantity THEN
        RAISE EXCEPTION 'Stock insuffisant pour ce transfert';
    END IF;
    
    -- Créer le transfert
    INSERT INTO transfers (
        source_store_id, destination_store_id, product_id, quantity,
        expected_arrival_date, notes, created_by
    )
    VALUES (
        p_source_store_id, p_destination_store_id, p_product_id, p_quantity,
        p_expected_arrival_date, p_notes, current_user_id
    )
    RETURNING id INTO transfer_id;
    
    RETURN transfer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTAIRES
-- =====================================================

COMMENT ON TABLE transfers IS 'Table des transferts entre magasins créés par les Admin';
COMMENT ON TABLE transfer_receptions IS 'Table des validations de réception par les Managers';
COMMENT ON TABLE transfer_history IS 'Historique des modifications de transferts';
COMMENT ON FUNCTION get_pending_transfers(UUID) IS 'Retourne les transferts en attente de validation';
COMMENT ON FUNCTION validate_transfer_reception(UUID, INTEGER, TEXT) IS 'Valide une réception de transfert avec vérification des quantités';
COMMENT ON FUNCTION get_transfers_history(UUID) IS 'Retourne l''historique des transferts';
COMMENT ON FUNCTION create_transfer(UUID, UUID, UUID, INTEGER, DATE, TEXT) IS 'Crée un transfert entre magasins avec vérification du stock';
COMMENT ON FUNCTION validate_transfer_creator_role() IS 'Valide que seuls les Admin/SuperAdmin peuvent créer des transferts';
COMMENT ON FUNCTION validate_transfer_reception_validator_role() IS 'Valide que seuls les Managers peuvent valider les réceptions de transferts'; 