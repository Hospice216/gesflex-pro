-- =====================================================
-- GESFLEX PRO - MIGRATION DE BASE
-- Setup initial avec extensions, types et fonctions utilitaires
-- =====================================================

-- Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TYPES PERSONNALISÉS
-- =====================================================

-- Type pour les rôles utilisateurs
CREATE TYPE user_role AS ENUM (
    'SuperAdmin',
    'Admin', 
    'Manager',
    'Vendeur'
);

-- Type pour les statuts utilisateurs
CREATE TYPE user_status AS ENUM (
    'pending',
    'active',
    'inactive',
    'rejected'
);

-- Type pour les statuts de validation
CREATE TYPE validation_status AS ENUM (
    'pending',
    'validated',
    'rejected'
);

-- Type pour les méthodes de paiement
CREATE TYPE payment_method AS ENUM (
    'cash',
    'card',
    'mobile_money',
    'bank_transfer',
    'check'
);

-- Type pour les états de retour
CREATE TYPE return_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'completed'
);

-- Type pour les types de gamification
CREATE TYPE gamification_type AS ENUM (
    'sales_amount',
    'sales_count',
    'holiday_sales',
    'daily_record',
    'achievement'
);

-- =====================================================
-- FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour générer des codes uniques (7 caractères aléatoires)
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
$$ LANGUAGE plpgsql;

-- Fonction pour générer un SKU basé sur le nom du produit
CREATE OR REPLACE FUNCTION generate_sku(product_name TEXT)
RETURNS TEXT AS $$
DECLARE
    clean_name TEXT;
    sku TEXT;
    counter INTEGER := 1;
BEGIN
    -- Nettoyer le nom (enlever caractères spéciaux, espaces multiples)
    clean_name := upper(regexp_replace(product_name, '[^a-zA-Z0-9\s]', '', 'g'));
    clean_name := regexp_replace(clean_name, '\s+', ' ', 'g');
    clean_name := trim(clean_name);
    
    -- Prendre les 3 premiers mots, max 3 caractères chacun
    sku := '';
    FOR i IN 1..3 LOOP
        IF i <= array_length(string_to_array(clean_name, ' '), 1) THEN
            sku := sku || substr(split_part(clean_name, ' ', i), 1, 3);
        END IF;
    END LOOP;
    
    -- Ajouter un numéro si le SKU existe déjà
    WHILE EXISTS (SELECT 1 FROM products WHERE sku = sku || CASE WHEN counter > 1 THEN counter::TEXT ELSE '' END) LOOP
        counter := counter + 1;
    END LOOP;
    
    RETURN sku || CASE WHEN counter > 1 THEN counter::TEXT ELSE '' END;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir l'ID de l'utilisateur connecté
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour vérifier si l'utilisateur est SuperAdmin
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE auth_id = auth.uid() 
        AND role = 'SuperAdmin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour vérifier si l'utilisateur est Admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE auth_id = auth.uid() 
        AND role IN ('SuperAdmin', 'Admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les magasins de l'utilisateur
CREATE OR REPLACE FUNCTION get_user_stores()
RETURNS UUID[] AS $$
DECLARE
    user_role user_role;
    user_stores UUID[];
BEGIN
    SELECT role INTO user_role FROM users WHERE auth_id = auth.uid();
    
    CASE user_role
        WHEN 'SuperAdmin', 'Admin' THEN
            -- SuperAdmin et Admin voient tous les magasins
            SELECT array_agg(id) INTO user_stores FROM stores;
        WHEN 'Manager' THEN
            -- Manager voit ses magasins assignés
            SELECT array_agg(store_id) INTO user_stores 
            FROM user_stores 
            WHERE user_id = (SELECT id FROM users WHERE auth_id = auth.uid());
        WHEN 'Vendeur' THEN
            -- Vendeur voit son magasin assigné
            SELECT array_agg(store_id) INTO user_stores 
            FROM user_stores 
            WHERE user_id = (SELECT id FROM users WHERE auth_id = auth.uid());
        ELSE
            user_stores := '{}';
    END CASE;
    
    RETURN COALESCE(user_stores, '{}');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS ET FONCTIONS DE MISE À JOUR
-- =====================================================

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTAIRES
-- =====================================================

COMMENT ON FUNCTION generate_unique_code(TEXT) IS 'Génère un code unique avec préfixe et 7 caractères aléatoires';
COMMENT ON FUNCTION generate_sku(TEXT) IS 'Génère un SKU basé sur le nom du produit';
COMMENT ON FUNCTION get_current_user_id() IS 'Retourne l''ID de l''utilisateur connecté';
COMMENT ON FUNCTION is_superadmin() IS 'Vérifie si l''utilisateur est SuperAdmin';
COMMENT ON FUNCTION is_admin() IS 'Vérifie si l''utilisateur est Admin ou SuperAdmin';
COMMENT ON FUNCTION get_user_stores() IS 'Retourne les magasins accessibles à l''utilisateur selon son rôle';
COMMENT ON FUNCTION update_updated_at_column() IS 'Met à jour automatiquement le champ updated_at'; 