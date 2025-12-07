-- Trigger function: prevent deletion of default variant
-- Allows deletion only when the entire product is being deleted (CASCADE)
CREATE OR REPLACE FUNCTION inventory.prevent_default_variant_deletion()
RETURNS TRIGGER AS $$
DECLARE
  product_exists boolean;
BEGIN
  -- Only check default variants
  IF OLD.is_default = false THEN
    RETURN OLD;
  END IF;

  -- For UPDATE: prevent soft-delete of default variant
  IF TG_OP = 'UPDATE' THEN
    -- Check if this is a soft-delete attempt (setting deleted_at)
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      -- Check if product still exists and is not being deleted
      SELECT EXISTS(
        SELECT 1 FROM inventory.product
        WHERE id = OLD.product_id
        AND deleted_at IS NULL
      ) INTO product_exists;

      IF product_exists THEN
        RAISE EXCEPTION 'Cannot delete default variant. Delete the product or assign another default variant first.'
          USING ERRCODE = 'P0001',
                HINT = 'Use product delete or change is_default on another variant';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- For DELETE: prevent hard-delete of default variant
  IF TG_OP = 'DELETE' THEN
    -- Check if product still exists (if not, this is a CASCADE delete)
    SELECT EXISTS(
      SELECT 1 FROM inventory.product WHERE id = OLD.product_id
    ) INTO product_exists;

    IF product_exists THEN
      RAISE EXCEPTION 'Cannot delete default variant. Delete the product or assign another default variant first.'
        USING ERRCODE = 'P0001',
              HINT = 'Use product delete or change is_default on another variant';
    END IF;
    RETURN OLD;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger for UPDATE (soft-delete protection)
CREATE TRIGGER trg_prevent_default_variant_soft_delete
  BEFORE UPDATE ON inventory.variant
  FOR EACH ROW
  WHEN (OLD.is_default = true AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
  EXECUTE FUNCTION inventory.prevent_default_variant_deletion();

-- Trigger for DELETE (hard-delete protection)
CREATE TRIGGER trg_prevent_default_variant_hard_delete
  BEFORE DELETE ON inventory.variant
  FOR EACH ROW
  WHEN (OLD.is_default = true)
  EXECUTE FUNCTION inventory.prevent_default_variant_deletion();

-- Add comment for documentation
COMMENT ON FUNCTION inventory.prevent_default_variant_deletion() IS
  'Prevents deletion (soft or hard) of the default variant unless the product itself is being deleted';
