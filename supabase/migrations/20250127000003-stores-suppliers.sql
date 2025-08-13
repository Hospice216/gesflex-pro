-- =====================================================
-- GESFLEX PRO - MAGASINS ET FOURNISSEURS
-- Gestion des magasins, fournisseurs et assignation automatique des Admin
-- =====================================================

-- =====================================================
-- TABLE FOURNISSEURS
-- =====================================================

CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    contact_person TEXT,
    tax_number TEXT,
    payment_terms TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Contraintes
    CONSTRAINT suppliers_name_check CHECK (length(name) >= 2),
    CONSTRAINT suppliers_email_check CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- =====================================================
-- TABLE MAGASINS
-- =====================================================

CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    manager_id UUID REFERENCES users(id),
    opening_hours TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Contraintes
    CONSTRAINT stores_name_check CHECK (length(name) >= 2),
    CONSTRAINT stores_code_check CHECK (length(code) >= 2),
    CONSTRAINT stores_email_check CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- =====================================================
-- AJOUTER LA RÉFÉRENCE MANQUANTE DANS USER_STORES
-- =====================================================

ALTER TABLE user_stores 
ADD CONSTRAINT user_stores_store_id_fkey 
FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;

-- =====================================================
-- INDEX POUR PERFORMANCE
-- =====================================================

CREATE INDEX idx_suppliers_name ON suppliers(name);
CREATE INDEX idx_suppliers_email ON suppliers(email);
CREATE INDEX idx_suppliers_active ON suppliers(is_active);
CREATE INDEX idx_stores_name ON stores(name);
CREATE INDEX idx_stores_code ON stores(code);
CREATE INDEX idx_stores_manager ON stores(manager_id);
CREATE INDEX idx_stores_active ON stores(is_active);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stores_updated_at
    BEFORE UPDATE ON stores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour assigner automatiquement les Admin aux nouveaux magasins
CREATE TRIGGER trigger_assign_admin_to_all_stores
    AFTER INSERT ON stores
    FOR EACH ROW
    EXECUTE FUNCTION assign_admin_to_all_stores();

-- Trigger pour générer automatiquement le code du magasin
CREATE OR REPLACE FUNCTION generate_store_code()
RETURNS TRIGGER AS $$
DECLARE
    counter INTEGER := 1;
    new_code TEXT;
BEGIN
    -- Si le code n'est pas fourni, le générer
    IF NEW.code IS NULL OR NEW.code = '' THEN
        LOOP
            new_code := 'STORE-' || to_char(current_date, 'YYYY') || '-' || lpad(counter::TEXT, 3, '0');
            
            -- Vérifier si le code existe déjà
            IF NOT EXISTS (SELECT 1 FROM stores WHERE code = new_code) THEN
                NEW.code := new_code;
                EXIT;
            END IF;
            
            counter := counter + 1;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_store_code
    BEFORE INSERT ON stores
    FOR EACH ROW
    EXECUTE FUNCTION generate_store_code();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Activer RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLITIQUES RLS POUR SUPPLIERS
-- =====================================================

-- SuperAdmin peut tout faire
CREATE POLICY "SuperAdmin suppliers full access" ON suppliers
    FOR ALL USING (is_superadmin());

-- Admin peut gérer les fournisseurs
CREATE POLICY "Admin suppliers management" ON suppliers
    FOR ALL USING (is_admin());

-- Tous les utilisateurs actifs peuvent voir les fournisseurs actifs
CREATE POLICY "Users can view active suppliers" ON suppliers
    FOR SELECT USING (
        is_active = true AND
        EXISTS (SELECT 1 FROM users WHERE auth_id = get_current_user_id() AND status = 'active')
    );

-- =====================================================
-- POLITIQUES RLS POUR STORES
-- =====================================================

-- SuperAdmin peut tout faire
CREATE POLICY "SuperAdmin stores full access" ON stores
    FOR ALL USING (is_superadmin());

-- Admin peut gérer tous les magasins
CREATE POLICY "Admin stores management" ON stores
    FOR ALL USING (is_admin());

-- Manager peut voir et modifier ses magasins assignés
CREATE POLICY "Manager stores access" ON stores
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_stores us
            JOIN users u ON u.id = us.user_id
            WHERE u.auth_id = get_current_user_id()
            AND u.role = 'Manager'
            AND us.store_id = stores.id
        )
    );

-- Vendeur peut voir son magasin assigné
CREATE POLICY "Vendeur store access" ON stores
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_stores us
            JOIN users u ON u.id = us.user_id
            WHERE u.auth_id = get_current_user_id()
            AND u.role = 'Vendeur'
            AND us.store_id = stores.id
        )
    );

-- =====================================================
-- FONCTIONS DE GESTION
-- =====================================================

-- Fonction pour obtenir les magasins d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_accessible_stores(user_uuid UUID)
RETURNS TABLE (
    store_id UUID,
    store_name TEXT,
    store_code TEXT,
    user_role user_role
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.code,
        u.role
    FROM stores s
    JOIN user_stores us ON us.store_id = s.id
    JOIN users u ON u.id = us.user_id
    WHERE u.id = user_uuid
    AND s.is_active = true
    ORDER BY s.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour assigner un utilisateur à un magasin
CREATE OR REPLACE FUNCTION assign_user_to_store(
    p_user_id UUID,
    p_store_id UUID,
    p_is_primary BOOLEAN DEFAULT false
)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_role user_role;
BEGIN
    -- Vérifier les permissions
    SELECT role INTO current_user_role FROM users WHERE auth_id = get_current_user_id();
    
    IF current_user_role NOT IN ('SuperAdmin', 'Admin') THEN
        RAISE EXCEPTION 'Permissions insuffisantes pour assigner un utilisateur à un magasin';
    END IF;
    
    -- Vérifier que l'utilisateur n'est pas SuperAdmin (sauf si c'est le SuperAdmin qui fait l'opération)
    IF current_user_role != 'SuperAdmin' AND 
       EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND role = 'SuperAdmin') THEN
        RAISE EXCEPTION 'Impossible d''assigner un SuperAdmin à un magasin';
    END IF;
    
    -- Si c'est un magasin primaire, désactiver les autres
    IF p_is_primary THEN
        UPDATE user_stores 
        SET is_primary = false 
        WHERE user_id = p_user_id;
    END IF;
    
    -- Insérer ou mettre à jour l'assignation
    INSERT INTO user_stores (user_id, store_id, is_primary, assigned_by)
    VALUES (p_user_id, p_store_id, p_is_primary, (SELECT id FROM users WHERE auth_id = get_current_user_id()))
    ON CONFLICT (user_id, store_id) 
    DO UPDATE SET 
        is_primary = EXCLUDED.is_primary,
        assigned_by = EXCLUDED.assigned_by,
        assigned_at = now();
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTAIRES
-- =====================================================

COMMENT ON TABLE suppliers IS 'Table des fournisseurs de l''entreprise';
COMMENT ON TABLE stores IS 'Table des magasins avec assignation automatique des Admin';
COMMENT ON FUNCTION get_user_accessible_stores(UUID) IS 'Retourne les magasins accessibles à un utilisateur';
COMMENT ON FUNCTION assign_user_to_store(UUID, UUID, BOOLEAN) IS 'Assigne un utilisateur à un magasin avec permissions'; 