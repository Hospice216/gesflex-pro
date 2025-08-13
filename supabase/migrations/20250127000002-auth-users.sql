-- =====================================================
-- GESFLEX PRO - AUTHENTIFICATION ET UTILISATEURS
-- Gestion des utilisateurs, rôles et invisibilité SuperAdmin
-- =====================================================

-- =====================================================
-- TABLE UTILISATEURS
-- =====================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'Vendeur',
    status user_status NOT NULL DEFAULT 'pending',
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Contraintes
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_name_check CHECK (length(first_name) >= 2 AND length(last_name) >= 2)
);

-- =====================================================
-- TABLE ASSIGNATION UTILISATEURS-MAGASINS
-- =====================================================

CREATE TABLE user_stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    store_id UUID NOT NULL, -- Référence sera ajoutée après création de la table stores
    is_primary BOOLEAN DEFAULT false,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    assigned_by UUID REFERENCES users(id),
    
    -- Contraintes
    CONSTRAINT user_stores_unique UNIQUE(user_id, store_id)
);

-- =====================================================
-- INDEX POUR PERFORMANCE
-- =====================================================

CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_store_id ON user_stores(store_id);
CREATE INDEX idx_users_user_id ON user_stores(user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour créer automatiquement un utilisateur lors de l'inscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (auth_id, email, first_name, last_name, role, status)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', 'Utilisateur'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', 'Nouveau'),
        'Vendeur',
        'pending'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger pour gérer le magasin principal unique par utilisateur
CREATE OR REPLACE FUNCTION ensure_single_primary_store()
RETURNS TRIGGER AS $$
BEGIN
    -- Si on définit un nouveau magasin principal
    IF NEW.is_primary = true THEN
        -- Désactiver tous les autres magasins principaux pour cet utilisateur
        UPDATE user_stores 
        SET is_primary = false 
        WHERE user_id = NEW.user_id 
        AND id != NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_primary_store_trigger
    BEFORE INSERT OR UPDATE ON user_stores
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_primary_store();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Activer RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stores ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLITIQUES RLS POUR USERS
-- =====================================================

-- SuperAdmin peut voir et modifier tous les utilisateurs (sauf lui-même pour l'invisibilité)
CREATE POLICY "SuperAdmin full access" ON users
    FOR ALL USING (
        is_superadmin() AND 
        auth_id != get_current_user_id() -- Invisibilité : ne peut pas se voir lui-même
    );

-- Admin peut voir et modifier tous les utilisateurs (sauf SuperAdmin)
CREATE POLICY "Admin user management" ON users
    FOR ALL USING (
        is_admin() AND 
        role != 'SuperAdmin' -- Admin ne peut pas voir/modifier les SuperAdmin
    );

-- Utilisateurs peuvent voir leur propre profil
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth_id = get_current_user_id());

-- Utilisateurs peuvent modifier leur propre profil (limité)
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth_id = get_current_user_id())
    WITH CHECK (
        auth_id = get_current_user_id() AND
        role = (SELECT role FROM users WHERE auth_id = get_current_user_id()) -- Ne peut pas changer son rôle
    );

-- =====================================================
-- POLITIQUES RLS POUR USER_STORES
-- =====================================================

-- SuperAdmin peut gérer toutes les assignations
CREATE POLICY "SuperAdmin store assignments" ON user_stores
    FOR ALL USING (is_superadmin());

-- Admin peut gérer les assignations (sauf pour SuperAdmin)
CREATE POLICY "Admin store assignments" ON user_stores
    FOR ALL USING (
        is_admin() AND 
        user_id NOT IN (SELECT id FROM users WHERE role = 'SuperAdmin')
    );

-- Utilisateurs peuvent voir leurs propres assignations
CREATE POLICY "Users can view own store assignments" ON user_stores
    FOR SELECT USING (
        user_id = (SELECT id FROM users WHERE auth_id = get_current_user_id())
    );

-- =====================================================
-- FONCTIONS DE GESTION
-- =====================================================

-- Fonction pour assigner automatiquement les Admin à tous les magasins
CREATE OR REPLACE FUNCTION assign_admin_to_all_stores()
RETURNS TRIGGER AS $$
BEGIN
    -- Si c'est un nouveau magasin, assigner tous les Admin
    IF TG_OP = 'INSERT' THEN
        INSERT INTO user_stores (user_id, store_id, assigned_by)
        SELECT id, NEW.id, get_current_user_id()
        FROM users 
        WHERE role IN ('SuperAdmin', 'Admin')
        AND id NOT IN (
            SELECT user_id FROM user_stores WHERE store_id = NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer un SuperAdmin (utilisée une seule fois)
CREATE OR REPLACE FUNCTION create_superadmin(
    p_email TEXT,
    p_first_name TEXT,
    p_last_name TEXT
)
RETURNS UUID AS $$
DECLARE
    user_id UUID;
BEGIN
    -- Vérifier qu'il n'y a pas déjà un SuperAdmin
    IF EXISTS (SELECT 1 FROM users WHERE role = 'SuperAdmin') THEN
        RAISE EXCEPTION 'Un SuperAdmin existe déjà';
    END IF;
    
    -- Créer l'utilisateur SuperAdmin
    INSERT INTO users (email, first_name, last_name, role, status)
    VALUES (p_email, p_first_name, p_last_name, 'SuperAdmin', 'active')
    RETURNING id INTO user_id;
    
    RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTAIRES
-- =====================================================

COMMENT ON TABLE users IS 'Table des utilisateurs avec gestion des rôles et invisibilité SuperAdmin';
COMMENT ON TABLE user_stores IS 'Table d''assignation des utilisateurs aux magasins';
COMMENT ON FUNCTION create_superadmin(TEXT, TEXT, TEXT) IS 'Crée le premier et unique SuperAdmin';
COMMENT ON FUNCTION assign_admin_to_all_stores() IS 'Assigne automatiquement les Admin à tous les magasins';
COMMENT ON FUNCTION ensure_single_primary_store() IS 'Assure qu''un utilisateur n''a qu''un seul magasin principal'; 