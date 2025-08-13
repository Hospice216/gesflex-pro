-- =====================================================
-- GESFLEX PRO – INITIAL CLEAN MIGRATION (CONSOLIDATED)
-- Fresh database schema with corrected FKs, RLS, triggers and seed data
-- Consolidates previous migrations and fixes from scripts/
-- =====================================================

BEGIN;

-- Ensure objects are created in public schema by default
SET search_path = public, pg_temp;

-- =====================================================
-- EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Compatible creation for ENUM types using guarded DO blocks
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'user_role'
  ) THEN
    CREATE TYPE public.user_role AS ENUM ('SuperAdmin','Admin','Manager','Vendeur');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'user_status'
  ) THEN
    CREATE TYPE public.user_status AS ENUM ('pending','active','inactive','rejected');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'validation_status'
  ) THEN
    CREATE TYPE public.validation_status AS ENUM ('pending','validated','rejected');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'payment_method'
  ) THEN
    CREATE TYPE public.payment_method AS ENUM ('cash','card','mobile_money','bank_transfer','check');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'return_status'
  ) THEN
    CREATE TYPE public.return_status AS ENUM ('pending','approved','rejected','completed');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'gamification_type'
  ) THEN
    CREATE TYPE public.gamification_type AS ENUM ('sales_amount','sales_count','holiday_sales','daily_record','achievement');
  END IF;
END $$;

-- =====================================================
-- UTILITY FUNCTIONS
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
END;$$ LANGUAGE plpgsql SECURITY DEFINER;

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
        IF i <= array_length(string_to_array(clean_name, ' '), 1) THEN
            sku := sku || substr(split_part(clean_name, ' ', i), 1, 3);
        END IF;
    END LOOP;
    WHILE EXISTS (SELECT 1 FROM products WHERE sku = sku || CASE WHEN counter > 1 THEN counter::TEXT ELSE '' END) LOOP
        counter := counter + 1;
    END LOOP;
    RETURN sku || CASE WHEN counter > 1 THEN counter::TEXT ELSE '' END;
END;$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN auth.uid();
END;$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'SuperAdmin');
END;$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role IN ('SuperAdmin','Admin'));
END;$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;$$ LANGUAGE plpgsql;

-- =====================================================
-- CORE TABLES: USERS, STORES, SUPPLIERS
-- =====================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_name_check CHECK (length(first_name) >= 2 AND length(last_name) >= 2)
);

CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- Ensure 1:1 mapping between auth.users and public.users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND constraint_name = 'users_auth_id_unique'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_auth_id_unique UNIQUE(auth_id);
  END IF;
END $$;

CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    CONSTRAINT stores_name_check CHECK (length(name) >= 2),
    CONSTRAINT stores_code_check CHECK (length(code) >= 2),
    CONSTRAINT stores_email_check CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_stores_name ON stores(name);
CREATE INDEX idx_stores_code ON stores(code);
CREATE INDEX idx_stores_manager ON stores(manager_id);
CREATE INDEX idx_stores_active ON stores(is_active);

CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    CONSTRAINT suppliers_name_check CHECK (length(name) >= 2),
    CONSTRAINT suppliers_email_check CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_suppliers_name ON suppliers(name);
CREATE INDEX idx_suppliers_email ON suppliers(email);
CREATE INDEX idx_suppliers_active ON suppliers(is_active);

CREATE TABLE user_stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    assigned_by UUID REFERENCES users(id),
    CONSTRAINT user_stores_unique UNIQUE(user_id, store_id)
);

CREATE INDEX idx_user_stores_store_id ON user_stores(store_id);
CREATE INDEX idx_user_stores_user_id ON user_stores(user_id);

CREATE OR REPLACE FUNCTION ensure_single_primary_store()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = true THEN
        UPDATE user_stores SET is_primary = false WHERE user_id = NEW.user_id AND id != NEW.id;
    END IF;
    RETURN NEW;
END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_single_primary_store_trigger ON user_stores;
CREATE TRIGGER ensure_single_primary_store_trigger
    BEFORE INSERT OR UPDATE ON user_stores
    FOR EACH ROW EXECUTE FUNCTION ensure_single_primary_store();

CREATE OR REPLACE FUNCTION assign_admin_to_all_stores()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO user_stores (user_id, store_id, assigned_by)
        SELECT id, NEW.id, NEW.created_by FROM users WHERE role IN ('SuperAdmin','Admin')
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_store_code()
RETURNS TRIGGER AS $$
DECLARE counter INTEGER := 1; new_code TEXT; BEGIN
    IF NEW.code IS NULL OR NEW.code = '' THEN
        LOOP
            new_code := 'STORE-' || to_char(current_date, 'YYYY') || '-' || lpad(counter::TEXT, 3, '0');
            EXIT WHEN NOT EXISTS (SELECT 1 FROM stores WHERE code = new_code);
            counter := counter + 1;
        END LOOP;
        NEW.code := new_code;
    END IF;
    RETURN NEW; END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_stores_updated_at ON stores;
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trigger_assign_admin_to_all_stores ON stores;
CREATE TRIGGER trigger_assign_admin_to_all_stores AFTER INSERT ON stores FOR EACH ROW EXECUTE FUNCTION assign_admin_to_all_stores();
DROP TRIGGER IF EXISTS trigger_generate_store_code ON stores;
CREATE TRIGGER trigger_generate_store_code BEFORE INSERT ON stores FOR EACH ROW EXECUTE FUNCTION generate_store_code();

-- Create user on auth signup
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
END;$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Backfill: ensure profiles exist for all existing auth.users
INSERT INTO public.users (auth_id, email, first_name, last_name, role, status)
SELECT au.id,
       au.email,
       COALESCE(au.raw_user_meta_data->>'first_name','Utilisateur'),
       COALESCE(au.raw_user_meta_data->>'last_name','Nouveau'),
       'Vendeur',
       'pending'
FROM auth.users au
LEFT JOIN public.users pu ON pu.auth_id = au.id
WHERE pu.id IS NULL
ON CONFLICT (auth_id) DO NOTHING;

-- =====================================================
-- CATALOG: UNITS, CATEGORIES, PRODUCTS, PRODUCT_STORES
-- =====================================================
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    symbol TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT units_name_check CHECK (length(name) >= 1),
    CONSTRAINT units_symbol_check CHECK (length(symbol) >= 1)
);

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    icon TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT categories_name_check CHECK (length(name) >= 2)
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    CONSTRAINT products_name_check CHECK (length(name) >= 2),
    CONSTRAINT products_sku_check CHECK (length(sku) >= 3),
    CONSTRAINT products_price_check CHECK (min_sale_price >= 0 AND current_sale_price >= 0),
    CONSTRAINT products_tax_check CHECK (tax_rate >= 0 AND tax_rate <= 100),
    CONSTRAINT products_alert_stock_check CHECK (alert_stock >= 0)
);

CREATE TABLE product_stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    current_stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    max_stock INTEGER,
    is_available BOOLEAN DEFAULT true,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    assigned_by UUID REFERENCES users(id),
    CONSTRAINT product_stores_unique UNIQUE(product_id, store_id),
    CONSTRAINT product_stores_stock_check CHECK (current_stock >= 0),
    CONSTRAINT product_stores_min_stock_check CHECK (min_stock >= 0),
    CONSTRAINT product_stores_max_stock_check CHECK (max_stock IS NULL OR max_stock >= min_stock)
);

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

DROP TRIGGER IF EXISTS update_units_updated_at ON units;
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION generate_product_sku()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sku IS NULL OR NEW.sku = '' THEN NEW.sku := generate_sku(NEW.name); END IF;
    RETURN NEW;
END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_product_sku ON products;
CREATE TRIGGER trigger_generate_product_sku BEFORE INSERT ON products FOR EACH ROW EXECUTE FUNCTION generate_product_sku();

CREATE OR REPLACE FUNCTION validate_product_prices()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.current_sale_price < NEW.min_sale_price THEN
        RAISE EXCEPTION 'Le prix de vente actuel ne peut pas être inférieur au prix minimum de vente';
    END IF;
    RETURN NEW;
END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_product_prices ON products;
CREATE TRIGGER trigger_validate_product_prices BEFORE INSERT OR UPDATE ON products FOR EACH ROW EXECUTE FUNCTION validate_product_prices();

-- =====================================================
-- PURCHASES / ARRIVALS
-- =====================================================
CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    CONSTRAINT purchases_quantity_check CHECK (quantity > 0),
    CONSTRAINT purchases_unit_price_check CHECK (unit_price > 0),
    CONSTRAINT purchases_total_amount_check CHECK (total_amount > 0)
);

CREATE TABLE arrivals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    received_quantity INTEGER NOT NULL,
    received_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    validated_by UUID NOT NULL REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT arrivals_quantity_check CHECK (received_quantity > 0)
);

-- Prevent double validation for the same purchase
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'arrivals_unique_purchase'
  ) THEN
    ALTER TABLE arrivals ADD CONSTRAINT arrivals_unique_purchase UNIQUE(purchase_id);
  END IF;
END $$;

CREATE TABLE purchase_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    performed_by UUID NOT NULL REFERENCES users(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT purchase_history_action_check CHECK (action IN ('created','updated','deleted','validated'))
);

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

DROP TRIGGER IF EXISTS update_purchases_updated_at ON purchases;
CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION generate_purchase_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.purchase_code IS NULL OR NEW.purchase_code = '' THEN NEW.purchase_code := generate_unique_code('PUR'); END IF;
    RETURN NEW;
END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_purchase_code ON purchases;
CREATE TRIGGER trigger_generate_purchase_code BEFORE INSERT ON purchases FOR EACH ROW EXECUTE FUNCTION generate_purchase_code();

CREATE OR REPLACE FUNCTION calculate_purchase_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_amount := NEW.quantity * NEW.unit_price; RETURN NEW;
END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_purchase_total ON purchases;
CREATE TRIGGER trigger_calculate_purchase_total BEFORE INSERT OR UPDATE ON purchases FOR EACH ROW EXECUTE FUNCTION calculate_purchase_total();

-- When an arrival is inserted (validated), ensure product is attributed to store and stock increased
CREATE OR REPLACE FUNCTION ensure_product_store_on_arrival()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
        target_store UUID;
        target_product UUID;
        ordered_qty INTEGER;
BEGIN
    SELECT store_id, product_id, quantity INTO target_store, target_product, ordered_qty FROM purchases WHERE id = NEW.purchase_id;

    -- Validate exact quantity match without divulging nombres
    IF NEW.received_quantity <> ordered_qty THEN
      RAISE EXCEPTION 'Validation impossible: quantité reçue incorrecte';
    END IF;

    -- Create product_stores link if missing
    INSERT INTO product_stores (product_id, store_id, current_stock, assigned_by)
    VALUES (target_product, target_store, 0, NEW.validated_by)
    ON CONFLICT (product_id, store_id) DO NOTHING;

    -- Increase stock by received quantity
    UPDATE product_stores
    SET current_stock = current_stock + NEW.received_quantity
    WHERE product_id = target_product AND store_id = target_store;

    -- Mark purchase as validated to remove it from pending lists
    UPDATE purchases
    SET status = 'validated', updated_at = now()
    WHERE id = NEW.purchase_id AND status = 'pending';

    -- Optional: keep a minimal audit trail of validation
  -- Insert history; RLS allows Manager insert on their store purchases
  INSERT INTO purchase_history (purchase_id, action, old_values, new_values, performed_by)
  VALUES (
    NEW.purchase_id,
    'validated',
    NULL,
    jsonb_build_object('received_quantity', NEW.received_quantity, 'status', 'validated'),
    NEW.validated_by
  );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_ensure_product_store_on_arrival ON arrivals;
CREATE TRIGGER trigger_ensure_product_store_on_arrival
AFTER INSERT ON arrivals
FOR EACH ROW EXECUTE FUNCTION ensure_product_store_on_arrival();

-- =====================================================
-- STORE TRANSFERS (VALIDATION FLOW)
-- =====================================================
-- Clean up legacy/conflicting objects if present when re-running this init script
DROP TABLE IF EXISTS transfer_history CASCADE;
DROP TABLE IF EXISTS transfer_receptions CASCADE;
DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS store_transfers CASCADE;

CREATE TABLE store_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_code TEXT UNIQUE NOT NULL,
    source_store_id UUID NOT NULL REFERENCES stores(id),
    destination_store_id UUID NOT NULL REFERENCES stores(id),
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    notes TEXT,
    status validation_status DEFAULT 'pending',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_store_transfers_source ON store_transfers(source_store_id);
CREATE INDEX idx_store_transfers_dest ON store_transfers(destination_store_id);
CREATE INDEX idx_store_transfers_product ON store_transfers(product_id);
CREATE INDEX idx_store_transfers_status ON store_transfers(status);

-- Auto-update updated_at on changes
DROP TRIGGER IF EXISTS update_store_transfers_updated_at ON store_transfers;
CREATE TRIGGER update_store_transfers_updated_at
BEFORE UPDATE ON store_transfers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate transfer code if missing
CREATE OR REPLACE FUNCTION generate_store_transfer_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transfer_code IS NULL OR NEW.transfer_code = '' THEN
    NEW.transfer_code := generate_unique_code('TRF');
  END IF;
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_store_transfer_code ON store_transfers;
CREATE TRIGGER trigger_generate_store_transfer_code
BEFORE INSERT ON store_transfers
FOR EACH ROW EXECUTE FUNCTION generate_store_transfer_code();

-- Validation réception transfert
CREATE TABLE transfer_receptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES store_transfers(id) ON DELETE CASCADE,
    received_quantity INTEGER NOT NULL CHECK (received_quantity > 0),
    received_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    received_by UUID NOT NULL REFERENCES users(id),
    notes TEXT
);

-- Prevent double reception for the same transfer
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transfer_receptions_unique_transfer'
  ) THEN
    ALTER TABLE transfer_receptions ADD CONSTRAINT transfer_receptions_unique_transfer UNIQUE(transfer_id);
  END IF;
END $$;

CREATE INDEX idx_transfer_receptions_transfer ON transfer_receptions(transfer_id);
CREATE INDEX idx_transfer_receptions_received_by ON transfer_receptions(received_by);

-- On validation (réception), attribuer le produit au magasin destination et incrémenter le stock
CREATE OR REPLACE FUNCTION ensure_product_store_on_transfer_receipt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    dest_store UUID;
    target_product UUID;
    transfer_qty INTEGER;
    src_store UUID;
    tr_status validation_status;
BEGIN
    SELECT destination_store_id, product_id, quantity, source_store_id, status
    INTO dest_store, target_product, transfer_qty, src_store, tr_status
    FROM store_transfers WHERE id = NEW.transfer_id FOR UPDATE;

    IF tr_status <> 'pending' AND tr_status <> 'in_transit' THEN
      RAISE EXCEPTION 'Ce transfert ne peut plus être validé';
    END IF;

    IF NEW.received_quantity <> transfer_qty THEN
      RAISE EXCEPTION 'Validation impossible: quantité reçue incorrecte';
    END IF;

    -- Déduire du stock source (sécurité si non déjà fait côté flux)
    UPDATE product_stores
    SET current_stock = current_stock - transfer_qty
    WHERE product_id = target_product AND store_id = src_store;

    -- Créer le lien pour le magasin destination si absent
    INSERT INTO product_stores (product_id, store_id, current_stock, assigned_by)
    VALUES (target_product, dest_store, 0, NEW.received_by)
    ON CONFLICT (product_id, store_id) DO NOTHING;

    -- Ajouter le stock reçu
    UPDATE product_stores
    SET current_stock = current_stock + transfer_qty
    WHERE product_id = target_product AND store_id = dest_store;

    -- Marquer le transfert comme reçu
    UPDATE store_transfers
    SET status = 'validated', updated_at = now()
    WHERE id = NEW.transfer_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_ensure_product_store_on_transfer_receipt ON transfer_receptions;
CREATE TRIGGER trigger_ensure_product_store_on_transfer_receipt
AFTER INSERT ON transfer_receptions
FOR EACH ROW EXECUTE FUNCTION ensure_product_store_on_transfer_receipt();

-- =====================================================
-- SALES / RETURNS
-- =====================================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT customers_name_check CHECK (length(name) >= 2),
    CONSTRAINT customers_email_check CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    CONSTRAINT sales_amount_check CHECK (subtotal >= 0 AND total_amount >= 0 AND tax_amount >= 0)
);

-- Name the FK for sold_by explicitly as per fix
ALTER TABLE sales
    DROP CONSTRAINT IF EXISTS sales_sold_by_fkey,
    ADD CONSTRAINT sales_created_by_fkey FOREIGN KEY (sold_by) REFERENCES users(id) ON DELETE RESTRICT;

CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    product_name TEXT NOT NULL,
    product_sku TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    discount_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT sale_items_quantity_check CHECK (quantity > 0),
    CONSTRAINT sale_items_price_check CHECK (unit_price >= 0 AND total_price >= 0)
);

CREATE TABLE returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    CONSTRAINT return_items_quantity_check CHECK (returned_quantity > 0),
    CONSTRAINT return_items_price_check CHECK (
        original_unit_price >= 0 AND original_total_price >= 0 AND
        (exchange_unit_price IS NULL OR exchange_unit_price >= 0) AND
        (exchange_total_price IS NULL OR exchange_total_price >= 0)
    )
);

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

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_sales_updated_at ON sales;
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_returns_updated_at ON returns;
CREATE TRIGGER update_returns_updated_at BEFORE UPDATE ON returns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION generate_sale_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sale_code IS NULL OR NEW.sale_code = '' THEN NEW.sale_code := generate_unique_code('V'); END IF;
    RETURN NEW; END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_sale_code ON sales;
CREATE TRIGGER trigger_generate_sale_code BEFORE INSERT ON sales FOR EACH ROW EXECUTE FUNCTION generate_sale_code();

CREATE OR REPLACE FUNCTION generate_return_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.return_code IS NULL OR NEW.return_code = '' THEN NEW.return_code := generate_unique_code('R'); END IF;
    RETURN NEW; END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_return_code ON returns;
CREATE TRIGGER trigger_generate_return_code BEFORE INSERT ON returns FOR EACH ROW EXECUTE FUNCTION generate_return_code();

CREATE OR REPLACE FUNCTION calculate_sale_total()
RETURNS TRIGGER AS $$ BEGIN NEW.total_amount := NEW.subtotal + NEW.tax_amount; RETURN NEW; END;$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_calculate_sale_total ON sales;
CREATE TRIGGER trigger_calculate_sale_total BEFORE INSERT OR UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION calculate_sale_total();

CREATE OR REPLACE FUNCTION calculate_sale_item_total()
RETURNS TRIGGER AS $$ BEGIN NEW.total_price := NEW.quantity * NEW.unit_price; RETURN NEW; END;$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_calculate_sale_item_total ON sale_items;
CREATE TRIGGER trigger_calculate_sale_item_total BEFORE INSERT OR UPDATE ON sale_items FOR EACH ROW EXECUTE FUNCTION calculate_sale_item_total();

CREATE OR REPLACE FUNCTION update_stock_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_store_id UUID;
BEGIN
    SELECT store_id INTO target_store_id FROM sales WHERE id = NEW.sale_id;
    -- Ensure link exists on first sale as well (optional safety)
    INSERT INTO product_stores (product_id, store_id, current_stock)
    VALUES (NEW.product_id, target_store_id, 0)
    ON CONFLICT (product_id, store_id) DO NOTHING;

    UPDATE product_stores
    SET current_stock = current_stock - NEW.quantity
    WHERE product_id = NEW.product_id AND store_id = target_store_id;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trigger_update_stock_on_sale ON sale_items;
CREATE TRIGGER trigger_update_stock_on_sale AFTER INSERT ON sale_items FOR EACH ROW EXECUTE FUNCTION update_stock_on_sale();

-- =====================================================
-- EXPENSES
-- =====================================================
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT expenses_title_check CHECK (length(title) >= 3),
    CONSTRAINT expenses_category_check CHECK (length(category) >= 2)
);

CREATE INDEX idx_expenses_store_id ON expenses(store_id);
CREATE INDEX idx_expenses_created_by ON expenses(created_by);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category);
DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- GAMIFICATION (standardized tables used by frontend)
-- =====================================================
CREATE TABLE gamification_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    min_points INTEGER NOT NULL,
    max_points INTEGER NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    icon TEXT DEFAULT 'star',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT gamification_levels_name_check CHECK (length(name) >= 2),
    CONSTRAINT gamification_levels_points_check CHECK (min_points >= 0 AND max_points > min_points)
);

CREATE TABLE gamification_point_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL,
    points_awarded INTEGER NOT NULL,
    condition_value JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT gamification_point_rules_name_check CHECK (length(name) >= 2),
    CONSTRAINT gamification_point_rules_points_check CHECK (points_awarded >= 0)
);

CREATE TABLE gamification_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT gamification_points_reason_check CHECK (length(reason) >= 2)
);

CREATE TABLE gamification_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    badge_type TEXT NOT NULL,
    required_role TEXT,
    condition_data JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT gamification_badges_name_check CHECK (length(name) >= 2)
);

CREATE TABLE gamification_trophies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    trophy_type TEXT NOT NULL,
    condition_type TEXT NOT NULL,
    condition_value INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT gamification_trophies_name_check CHECK (length(name) >= 2)
);

CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES gamification_badges(id) ON DELETE CASCADE,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    awarded_by UUID REFERENCES users(id),
    achievement_value DECIMAL(10,2),
    CONSTRAINT user_badges_unique UNIQUE(user_id, badge_id)
);

CREATE TABLE user_trophies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trophy_id UUID NOT NULL REFERENCES gamification_trophies(id) ON DELETE CASCADE,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    awarded_by UUID REFERENCES users(id),
    achievement_value DECIMAL(10,2),
    period_month INTEGER,
    period_year INTEGER,
    CONSTRAINT user_trophies_unique UNIQUE(user_id, trophy_id)
);

CREATE INDEX idx_gamification_levels_points ON gamification_levels(min_points, max_points);
CREATE INDEX idx_gamification_point_rules_active ON gamification_point_rules(is_active);
CREATE INDEX idx_gamification_point_rules_event ON gamification_point_rules(event_type);
CREATE INDEX idx_gamification_points_user ON gamification_points(user_id);
CREATE INDEX idx_gamification_points_date ON gamification_points(created_at);
CREATE INDEX idx_gamification_badges_active ON gamification_badges(is_active);
CREATE INDEX idx_gamification_trophies_active ON gamification_trophies(is_active);
CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_user_trophies_user ON user_trophies(user_id);

DROP TRIGGER IF EXISTS update_gamification_levels_updated_at ON gamification_levels;
CREATE TRIGGER update_gamification_levels_updated_at BEFORE UPDATE ON gamification_levels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_gamification_point_rules_updated_at ON gamification_point_rules;
CREATE TRIGGER update_gamification_point_rules_updated_at BEFORE UPDATE ON gamification_point_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_gamification_badges_updated_at ON gamification_badges;
CREATE TRIGGER update_gamification_badges_updated_at BEFORE UPDATE ON gamification_badges FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_gamification_trophies_updated_at ON gamification_trophies;
CREATE TRIGGER update_gamification_trophies_updated_at BEFORE UPDATE ON gamification_trophies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SETTINGS AND CURRENCIES
-- =====================================================
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    setting_type TEXT NOT NULL CHECK (setting_type IN ('string','number','boolean','json')),
    category TEXT NOT NULL CHECK (category IN ('general','currency','sales','inventory','notifications','security','appearance','stores','performance','maintenance','system')),
    description TEXT,
    is_required BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT system_settings_key_check CHECK (length(setting_key) >= 2)
);

CREATE TABLE currencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    "position" TEXT NOT NULL DEFAULT 'after' CHECK ("position" IN ('before','after')),
    decimal_places INTEGER NOT NULL DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT currencies_code_check CHECK (length(code) = 3),
    CONSTRAINT currencies_symbol_check CHECK (length(symbol) BETWEEN 1 AND 5),
    CONSTRAINT currencies_decimal_places_check CHECK (decimal_places BETWEEN 0 AND 4)
);

CREATE INDEX idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX idx_system_settings_category ON system_settings(category);
CREATE INDEX idx_system_settings_public ON system_settings(is_public);
CREATE INDEX idx_currencies_code ON currencies(code);
CREATE INDEX idx_currencies_default ON currencies(is_default);
CREATE INDEX idx_currencies_active ON currencies(is_active);

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_currencies_updated_at ON currencies;
CREATE TRIGGER update_currencies_updated_at BEFORE UPDATE ON currencies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION ensure_single_default_currency()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE currencies SET is_default = false WHERE id != NEW.id;
    END IF;
    RETURN NEW;
END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ensure_single_default_currency ON currencies;
CREATE TRIGGER trigger_ensure_single_default_currency BEFORE INSERT OR UPDATE ON currencies FOR EACH ROW EXECUTE FUNCTION ensure_single_default_currency();

-- =====================================================
-- RLS ENABLE + POLICIES (HARDENED)
-- =====================================================
-- Users: simplify by disabling RLS and using GRANTs
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE arrivals ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
-- transfers table removed; use store_transfers
ALTER TABLE transfer_receptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_point_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_trophies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_trophies ENABLE ROW LEVEL SECURITY;

-- Users access via GRANTs (no RLS)
REVOKE ALL ON TABLE users FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON TABLE users TO authenticated;
GRANT SELECT ON TABLE users TO anon;

-- User_stores RLS
CREATE POLICY "SuperAdmin user_stores all" ON user_stores FOR ALL USING (is_superadmin());
CREATE POLICY "Admin user_stores all" ON user_stores FOR ALL USING (is_admin());
CREATE POLICY "User view own assignments" ON user_stores FOR SELECT USING (user_id = (SELECT id FROM users WHERE auth_id = get_current_user_id()));

-- Stores RLS (hardened per security-hardening.sql)
CREATE POLICY "stores_select_admins" ON stores FOR SELECT USING (is_admin() OR is_superadmin());
CREATE POLICY "stores_select_assigned_for_non_admin" ON stores FOR SELECT USING (
  NOT (is_admin() OR is_superadmin()) AND EXISTS (
    SELECT 1 FROM user_stores us JOIN users u ON u.id = us.user_id
    WHERE u.auth_id = get_current_user_id() AND us.store_id = stores.id
  )
);
CREATE POLICY "stores_insert_admins" ON stores FOR INSERT WITH CHECK (is_admin() OR is_superadmin());
CREATE POLICY "stores_update_admins" ON stores FOR UPDATE USING (is_admin() OR is_superadmin()) WITH CHECK (is_admin() OR is_superadmin());
CREATE POLICY "stores_delete_admins" ON stores FOR DELETE USING (is_admin() OR is_superadmin());

-- Suppliers
CREATE POLICY "SuperAdmin suppliers all" ON suppliers FOR ALL USING (is_superadmin());
CREATE POLICY "Admin suppliers all" ON suppliers FOR ALL USING (is_admin());
CREATE POLICY "Users view active suppliers" ON suppliers FOR SELECT USING (is_active = true AND EXISTS (SELECT 1 FROM users WHERE auth_id = get_current_user_id() AND status = 'active'));

-- Units / Categories / Products / Product_stores
CREATE POLICY "SuperAdmin units all" ON units FOR ALL USING (is_superadmin());
CREATE POLICY "Admin units all" ON units FOR ALL USING (is_admin());
CREATE POLICY "Users view units" ON units FOR SELECT USING (is_active = true AND EXISTS (SELECT 1 FROM users WHERE auth_id = get_current_user_id() AND status = 'active'));

CREATE POLICY "SuperAdmin categories all" ON categories FOR ALL USING (is_superadmin());
CREATE POLICY "Admin categories all" ON categories FOR ALL USING (is_admin());
CREATE POLICY "Users view categories" ON categories FOR SELECT USING (is_active = true AND EXISTS (SELECT 1 FROM users WHERE auth_id = get_current_user_id() AND status = 'active'));

CREATE POLICY "SuperAdmin products all" ON products FOR ALL USING (is_superadmin());
CREATE POLICY "Admin products all" ON products FOR ALL USING (is_admin());

-- Allow insert/update by Admins only (explicit WITH CHECK)
DROP POLICY IF EXISTS "Admin products insert" ON products;
CREATE POLICY "Admin products insert" ON products FOR INSERT WITH CHECK (is_admin() OR is_superadmin());
DROP POLICY IF EXISTS "Admin products update" ON products;
CREATE POLICY "Admin products update" ON products FOR UPDATE USING (is_admin() OR is_superadmin()) WITH CHECK (is_admin() OR is_superadmin());

-- Scope product visibility to the user's stores via product_stores
DROP POLICY IF EXISTS "Users view products" ON products;
DROP POLICY IF EXISTS "Manager products view scoped" ON products;
DROP POLICY IF EXISTS "Vendeur products view scoped" ON products;

CREATE POLICY "Manager products view scoped" ON products FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM user_stores us
    JOIN users u ON u.id = us.user_id
    JOIN product_stores ps ON ps.product_id = products.id AND ps.store_id = us.store_id
    WHERE u.auth_id = get_current_user_id() AND u.role = 'Manager' AND u.status = 'active'
  )
);

CREATE POLICY "Vendeur products view scoped" ON products FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM user_stores us
    JOIN users u ON u.id = us.user_id
    JOIN product_stores ps ON ps.product_id = products.id AND ps.store_id = us.store_id
    WHERE u.auth_id = get_current_user_id() AND u.role = 'Vendeur' AND u.status = 'active'
  )
);

-- Allow product name/SKU reveal when joining from purchases and store_transfers for scoped managers/vendeurs
DROP POLICY IF EXISTS "Manager products view via purchases" ON products;
DROP POLICY IF EXISTS "Vendeur products view via purchases" ON products;
CREATE POLICY "Manager products view via purchases" ON products FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM purchases p
    JOIN users u ON u.auth_id = get_current_user_id()
    JOIN user_stores us ON us.user_id = u.id AND us.store_id = p.store_id
    WHERE u.role = 'Manager' AND p.product_id = products.id
  )
);
CREATE POLICY "Vendeur products view via purchases" ON products FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM purchases p
    JOIN users u ON u.auth_id = get_current_user_id()
    JOIN user_stores us ON us.user_id = u.id AND us.store_id = p.store_id
    WHERE u.role = 'Vendeur' AND p.product_id = products.id
  )
);

DROP POLICY IF EXISTS "Manager products view via transfers" ON products;
DROP POLICY IF EXISTS "Vendeur products view via transfers" ON products;
CREATE POLICY "Manager products view via transfers" ON products FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM store_transfers t
    JOIN users u ON u.auth_id = get_current_user_id()
    JOIN user_stores us ON us.user_id = u.id AND (us.store_id = t.source_store_id OR us.store_id = t.destination_store_id)
    WHERE u.role = 'Manager' AND t.product_id = products.id
  )
);
CREATE POLICY "Vendeur products view via transfers" ON products FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM store_transfers t
    JOIN users u ON u.auth_id = get_current_user_id()
    JOIN user_stores us ON us.user_id = u.id AND (us.store_id = t.source_store_id OR us.store_id = t.destination_store_id)
    WHERE u.role = 'Vendeur' AND t.product_id = products.id
  )
);

CREATE POLICY "SuperAdmin product_stores all" ON product_stores FOR ALL USING (is_superadmin());
CREATE POLICY "Admin product_stores all" ON product_stores FOR ALL USING (is_admin());
CREATE POLICY "Manager product_stores scoped" ON product_stores FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_stores us JOIN users u ON u.id = us.user_id
    WHERE u.auth_id = get_current_user_id() AND u.role = 'Manager' AND us.store_id = product_stores.store_id
  )
);
CREATE POLICY "Vendeur product_stores view" ON product_stores FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_stores us JOIN users u ON u.id = us.user_id
    WHERE u.auth_id = get_current_user_id() AND u.role = 'Vendeur' AND us.store_id = product_stores.store_id
  )
);

-- Purchases / Arrivals / Purchase_history
CREATE POLICY "SuperAdmin purchases all" ON purchases FOR ALL USING (is_superadmin());
CREATE POLICY "Admin purchases mgmt" ON purchases FOR ALL USING (is_admin());
CREATE POLICY "Manager purchases view" ON purchases FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_stores us JOIN users u ON u.id = us.user_id
    WHERE u.auth_id = get_current_user_id() AND u.role = 'Manager' AND us.store_id = purchases.store_id
  )
);

-- Allow managers to mark purchases as validated (limited update)
DROP POLICY IF EXISTS "Manager purchases validate" ON purchases;
CREATE POLICY "Manager purchases validate" ON purchases FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_stores us
    JOIN users u ON u.id = us.user_id
    WHERE u.auth_id = get_current_user_id()
      AND u.role = 'Manager'
      AND us.store_id = purchases.store_id
  )
)
WITH CHECK (
  status = 'validated' AND
  EXISTS (
    SELECT 1 FROM user_stores us
    JOIN users u ON u.id = us.user_id
    WHERE u.auth_id = get_current_user_id()
      AND u.role = 'Manager'
      AND us.store_id = purchases.store_id
  )
);

CREATE POLICY "SuperAdmin arrivals all" ON arrivals FOR ALL USING (is_superadmin());
CREATE POLICY "Manager arrivals insert" ON arrivals FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_stores us JOIN users u ON u.id = us.user_id JOIN purchases p ON p.id = arrivals.purchase_id
    WHERE u.auth_id = get_current_user_id() AND u.role = 'Manager' AND us.store_id = p.store_id
  )
);
CREATE POLICY "Admin arrivals all" ON arrivals FOR ALL USING (is_admin());
CREATE POLICY "Users view arrivals" ON arrivals FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM purchases p JOIN user_stores us ON us.store_id = p.store_id JOIN users u ON u.id = us.user_id
    WHERE u.auth_id = get_current_user_id() AND p.id = arrivals.purchase_id
  )
);

DROP POLICY IF EXISTS "SuperAdmin purchase_history view" ON purchase_history;
DROP POLICY IF EXISTS "Admin purchase_history view" ON purchase_history;
DROP POLICY IF EXISTS "Manager purchase_history view" ON purchase_history;
CREATE POLICY "SuperAdmin purchase_history all" ON purchase_history FOR ALL USING (is_superadmin());
CREATE POLICY "Admin purchase_history all" ON purchase_history FOR ALL USING (is_admin());
CREATE POLICY "Manager purchase_history view" ON purchase_history FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM purchases p JOIN user_stores us ON us.store_id = p.store_id JOIN users u ON u.id = us.user_id
    WHERE u.auth_id = get_current_user_id() AND u.role = 'Manager' AND p.id = purchase_history.purchase_id
  )
);
-- Managers can insert history entries tied to purchases in their stores (for trigger audit)
DROP POLICY IF EXISTS "Manager purchase_history insert" ON purchase_history;
CREATE POLICY "Manager purchase_history insert" ON purchase_history FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM purchases p
    JOIN user_stores us ON us.store_id = p.store_id
    JOIN users u ON u.id = us.user_id
    WHERE u.auth_id = get_current_user_id()
      AND u.role = 'Manager'
      AND p.id = purchase_history.purchase_id
  )
);

-- Customers / Sales / Sale_items / Returns / Return_items
CREATE POLICY "SuperAdmin customers all" ON customers FOR ALL USING (is_superadmin());
CREATE POLICY "Admin customers all" ON customers FOR ALL USING (is_admin());
CREATE POLICY "Users view customers" ON customers FOR SELECT USING (is_active = true AND EXISTS (SELECT 1 FROM users WHERE auth_id = get_current_user_id() AND status = 'active'));

CREATE POLICY "SuperAdmin sales all" ON sales FOR ALL USING (is_superadmin());
CREATE POLICY "Admin sales all" ON sales FOR ALL USING (is_admin());
CREATE POLICY "Manager sales scoped" ON sales FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_stores us JOIN users u ON u.id = us.user_id
    WHERE u.auth_id = get_current_user_id() AND u.role = 'Manager' AND us.store_id = sales.store_id
  )
);
CREATE POLICY "Vendeur sales scoped" ON sales FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_stores us JOIN users u ON u.id = us.user_id
    WHERE u.auth_id = get_current_user_id() AND u.role = 'Vendeur' AND us.store_id = sales.store_id
  )
);

CREATE POLICY "SuperAdmin sale_items all" ON sale_items FOR ALL USING (is_superadmin());
CREATE POLICY "Admin sale_items all" ON sale_items FOR ALL USING (is_admin());
CREATE POLICY "Manager sale_items view" ON sale_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM sales s JOIN user_stores us ON us.store_id = s.store_id JOIN users u ON u.id = us.user_id
    WHERE u.auth_id = get_current_user_id() AND u.role = 'Manager' AND s.id = sale_items.sale_id
  )
);
CREATE POLICY "Vendeur sale_items view" ON sale_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM sales s JOIN user_stores us ON us.store_id = s.store_id JOIN users u ON u.id = us.user_id
    WHERE u.auth_id = get_current_user_id() AND u.role = 'Vendeur' AND s.id = sale_items.sale_id
  )
);

-- Allow Manager/Vendeur to insert sale_items tied to sales in their stores
DROP POLICY IF EXISTS "Manager sale_items insert" ON sale_items;
CREATE POLICY "Manager sale_items insert" ON sale_items FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM sales s
    JOIN user_stores us ON us.store_id = s.store_id
    JOIN users u ON u.id = us.user_id
    WHERE u.auth_id = get_current_user_id()
      AND u.role = 'Manager'
      AND s.id = sale_items.sale_id
  )
);

DROP POLICY IF EXISTS "Vendeur sale_items insert" ON sale_items;
CREATE POLICY "Vendeur sale_items insert" ON sale_items FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM sales s
    JOIN user_stores us ON us.store_id = s.store_id
    JOIN users u ON u.id = us.user_id
    WHERE u.auth_id = get_current_user_id()
      AND u.role = 'Vendeur'
      AND s.id = sale_items.sale_id
  )
);

CREATE POLICY "SuperAdmin returns all" ON returns FOR ALL USING (is_superadmin());
CREATE POLICY "Admin returns all" ON returns FOR ALL USING (is_admin());
CREATE POLICY "Manager returns scoped" ON returns FOR ALL USING (
  EXISTS (
    SELECT 1 FROM sales s JOIN user_stores us ON us.store_id = s.store_id JOIN users u ON u.id = us.user_id
    WHERE u.auth_id = get_current_user_id() AND u.role = 'Manager' AND s.id = returns.original_sale_id
  )
);
CREATE POLICY "Vendeur returns scoped" ON returns FOR ALL USING (
  EXISTS (
    SELECT 1 FROM sales s JOIN user_stores us ON us.store_id = s.store_id JOIN users u ON u.id = us.user_id
    WHERE u.auth_id = get_current_user_id() AND u.role = 'Vendeur' AND s.id = returns.original_sale_id
  )
);

CREATE POLICY "SuperAdmin return_items all" ON return_items FOR ALL USING (is_superadmin());
CREATE POLICY "Admin return_items view" ON return_items FOR ALL USING (is_admin());
CREATE POLICY "Manager return_items view" ON return_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM returns r JOIN sales s ON s.id = r.original_sale_id JOIN user_stores us ON us.store_id = s.store_id JOIN users u ON u.id = us.user_id
    WHERE u.auth_id = get_current_user_id() AND u.role = 'Manager' AND r.id = return_items.return_id
  )
);
CREATE POLICY "Vendeur return_items view" ON return_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM returns r JOIN sales s ON s.id = r.original_sale_id JOIN user_stores us ON us.store_id = s.store_id JOIN users u ON u.id = us.user_id
    WHERE u.auth_id = get_current_user_id() AND u.role = 'Vendeur' AND r.id = return_items.return_id
  )
);

-- Transfers
CREATE POLICY "SuperAdmin store_transfers all" ON store_transfers FOR ALL USING (is_superadmin());
CREATE POLICY "Admin store_transfers all" ON store_transfers FOR ALL USING (is_admin());
CREATE POLICY "Manager store_transfers scoped" ON store_transfers FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_stores us JOIN users u ON u.id = us.user_id
    WHERE u.auth_id = get_current_user_id() AND u.role = 'Manager' AND (us.store_id = store_transfers.source_store_id OR us.store_id = store_transfers.destination_store_id)
  )
);

DROP POLICY IF EXISTS "SuperAdmin transfer_receptions all" ON transfer_receptions;
CREATE POLICY "SuperAdmin transfer_receptions all" ON transfer_receptions FOR ALL USING (is_superadmin());
CREATE POLICY "Admin transfer_receptions all" ON transfer_receptions FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "Manager transfer_receptions insert scoped" ON transfer_receptions;
CREATE POLICY "Manager transfer_receptions insert scoped" ON transfer_receptions FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_stores us JOIN users u ON u.id = us.user_id JOIN store_transfers t ON t.id = transfer_receptions.transfer_id
    WHERE u.auth_id = get_current_user_id() AND u.role = 'Manager' AND us.store_id = t.destination_store_id
  )
);
-- transfers policies removed; use store_transfers policies below
CREATE POLICY "Users view transfer_receptions scoped to their stores" ON transfer_receptions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM store_transfers t JOIN user_stores us ON (us.store_id = t.source_store_id OR us.store_id = t.destination_store_id) JOIN users u ON u.id = us.user_id
    WHERE u.auth_id = get_current_user_id() AND t.id = transfer_receptions.transfer_id
  )
);

-- transfer_history table removed; no policies required

-- Expenses
CREATE POLICY "Admins expenses all" ON expenses FOR ALL USING (is_admin() OR is_superadmin());
CREATE POLICY "Manager expenses all" ON expenses FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'Manager')
);
CREATE POLICY "Vendeur expenses view" ON expenses FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'Vendeur')
);

-- System settings & currencies (hardened)
CREATE POLICY "system_settings_select_all" ON system_settings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "system_settings_insert_admin" ON system_settings FOR INSERT WITH CHECK (is_admin() OR is_superadmin());
CREATE POLICY "system_settings_update_admin" ON system_settings FOR UPDATE USING (is_admin() OR is_superadmin()) WITH CHECK (is_admin() OR is_superadmin());
CREATE POLICY "system_settings_delete_superadmin" ON system_settings FOR DELETE USING (is_superadmin());

CREATE POLICY "SuperAdmin currencies all" ON currencies FOR ALL USING (is_superadmin());
CREATE POLICY "Admin currencies all" ON currencies FOR ALL USING (is_admin());
CREATE POLICY "Users view currencies" ON currencies FOR SELECT USING (is_active = true AND EXISTS (SELECT 1 FROM users WHERE auth_id = get_current_user_id() AND status = 'active'));

-- Gamification RLS
CREATE POLICY "SuperAdmin gamification levels all" ON gamification_levels FOR ALL USING (is_superadmin());
CREATE POLICY "Admin gamification levels all" ON gamification_levels FOR ALL USING (is_admin());
CREATE POLICY "Users view levels" ON gamification_levels FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE auth_id = get_current_user_id() AND status = 'active'));

CREATE POLICY "SuperAdmin gamification rules all" ON gamification_point_rules FOR ALL USING (is_superadmin());
CREATE POLICY "Admin gamification rules all" ON gamification_point_rules FOR ALL USING (is_admin());
CREATE POLICY "Users view rules" ON gamification_point_rules FOR SELECT USING (is_active = true AND EXISTS (SELECT 1 FROM users WHERE auth_id = get_current_user_id() AND status = 'active'));

CREATE POLICY "SuperAdmin gamification points all" ON gamification_points FOR ALL USING (is_superadmin());
CREATE POLICY "Admin gamification points view" ON gamification_points FOR SELECT USING (is_admin());
CREATE POLICY "Users view own gamification points" ON gamification_points FOR SELECT USING (user_id = (SELECT id FROM users WHERE auth_id = get_current_user_id()));

CREATE POLICY "SuperAdmin gamification badges all" ON gamification_badges FOR ALL USING (is_superadmin());
CREATE POLICY "Admin gamification badges all" ON gamification_badges FOR ALL USING (is_admin());
CREATE POLICY "Users view badges" ON gamification_badges FOR SELECT USING (is_active = true AND EXISTS (SELECT 1 FROM users WHERE auth_id = get_current_user_id() AND status = 'active'));

CREATE POLICY "SuperAdmin gamification trophies all" ON gamification_trophies FOR ALL USING (is_superadmin());
CREATE POLICY "Admin gamification trophies all" ON gamification_trophies FOR ALL USING (is_admin());
CREATE POLICY "Users view trophies" ON gamification_trophies FOR SELECT USING (is_active = true AND EXISTS (SELECT 1 FROM users WHERE auth_id = get_current_user_id() AND status = 'active'));

CREATE POLICY "Users view own user_badges" ON user_badges FOR SELECT USING (user_id = (SELECT id FROM users WHERE auth_id = get_current_user_id()));
CREATE POLICY "Users view own user_trophies" ON user_trophies FOR SELECT USING (user_id = (SELECT id FROM users WHERE auth_id = get_current_user_id()));

-- =====================================================
-- SEED DATA (minimal)
-- =====================================================
INSERT INTO units (name, symbol, description) VALUES
('Pièce','pcs','Unité par pièce'),
('Kilogramme','kg','Unité en kilogrammes'),
('Litre','L','Unité en litres')
ON CONFLICT DO NOTHING;

INSERT INTO categories (name, description, color) VALUES
('Alimentation','Produits alimentaires','#10B981'),
('Boissons','Boissons et liquides','#3B82F6'),
('Autres','Autres catégories','#9CA3AF')
ON CONFLICT DO NOTHING;

INSERT INTO currencies (code,name,symbol,"position",decimal_places,is_default,is_active) VALUES
('XOF','Franc CFA','CFA','after',0,true,true),
('EUR','Euro','€','before',2,false,true),
('USD','Dollar US','$','before',2,false,true)
ON CONFLICT DO NOTHING;

INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_required, is_public) VALUES
('app.name','GesFlex Pro','string','general','Nom de l''application',true,true),
('app.version','1.0.0','string','general','Version',true,true),
('app.timezone','Africa/Abidjan','string','general','Fuseau horaire',true,true),
('currency.default','XOF','string','currency','Devise par défaut',true,true),
('currency.symbol','CFA','string','currency','Symbole',false,true),
('currency.position','after','string','currency','Position du symbole',false,true),
('currency.decimal_places','0','number','currency','Décimales',false,true),
('sales.tax_rate','18','number','sales','TVA %',false,true)
ON CONFLICT (setting_key) DO NOTHING;

-- =====================================================
-- FINAL MESSAGE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'GesFlex Pro – Initial clean migration applied';
  RAISE NOTICE 'Tables, FKs, RLS and seeds created successfully';
END$$;

COMMIT;


