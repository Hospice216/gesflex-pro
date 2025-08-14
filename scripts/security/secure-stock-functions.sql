-- Ensure stock-update functions run with elevated privileges to bypass RLS safely
-- Run this in Supabase SQL editor if you are getting RLS errors on product_stores during sales/arrivals/transfers

SET search_path = public, pg_temp;

-- 1) Arrival validation: ensure product->store link and stock increment
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

    IF NEW.received_quantity <> ordered_qty THEN
      RAISE EXCEPTION 'Validation impossible: quantité reçue incorrecte';
    END IF;

    INSERT INTO product_stores (product_id, store_id, current_stock, assigned_by)
    VALUES (target_product, target_store, 0, NEW.validated_by)
    ON CONFLICT (product_id, store_id) DO NOTHING;

    UPDATE product_stores
    SET current_stock = current_stock + NEW.received_quantity
    WHERE product_id = target_product AND store_id = target_store;

    UPDATE purchases
    SET status = 'validated', updated_at = now()
    WHERE id = NEW.purchase_id AND status = 'pending';

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

-- 2) Transfer reception: ensure product->dest_store link, stock moves, status update
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

    UPDATE product_stores
    SET current_stock = current_stock - transfer_qty
    WHERE product_id = target_product AND store_id = src_store;

    INSERT INTO product_stores (product_id, store_id, current_stock, assigned_by)
    VALUES (target_product, dest_store, 0, NEW.received_by)
    ON CONFLICT (product_id, store_id) DO NOTHING;

    UPDATE product_stores
    SET current_stock = current_stock + transfer_qty
    WHERE product_id = target_product AND store_id = dest_store;

    UPDATE store_transfers
    SET status = 'validated', updated_at = now()
    WHERE id = NEW.transfer_id;

    RETURN NEW;
END;
$$;

-- 3) Sale item insert: ensure product->store link exists and decrement stock
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

    INSERT INTO product_stores (product_id, store_id, current_stock)
    VALUES (NEW.product_id, target_store_id, 0)
    ON CONFLICT (product_id, store_id) DO NOTHING;

    UPDATE product_stores
    SET current_stock = current_stock - NEW.quantity
    WHERE product_id = NEW.product_id AND store_id = target_store_id;
    RETURN NEW;
END;
$$;


