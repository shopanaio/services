CREATE TYPE dimension_unit AS ENUM('mm', 'cm', 'm', 'in', 'ft', 'yd');

CREATE TABLE
  item_dimensions (
    variant_id uuid PRIMARY KEY,
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    -- Width, Length, Height in mm
    w_mm int NOT NULL DEFAULT 0,
    l_mm int NOT NULL DEFAULT 0,
    h_mm int NOT NULL DEFAULT 0,
    -- Display unit to sho in UI (needs to be converted from/to mm)
    display_unit dimension_unit NOT NULL,
    CONSTRAINT product_variant_shipping_settings_fk FOREIGN KEY (variant_id) REFERENCES variant (id) ON DELETE CASCADE,
    CHECK (
      w_mm > 0
      AND l_mm > 0
      AND h_mm > 0
    )
  );

CREATE TYPE weight_unit AS ENUM('g', 'kg', 'lb', 'oz');

CREATE TABLE
  item_weight (
    variant_id uuid PRIMARY KEY,
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    -- weight in grams
    weight_gr int NOT NULL DEFAULT 0,
    -- Display unit to show in UI (needs to be converted from/to grams)
    display_unit weight_unit NOT NULL DEFAULT 'g',
    CONSTRAINT product_variant_shipping_settings_fk FOREIGN KEY (variant_id) REFERENCES variant (id) ON DELETE CASCADE,
    CHECK (weight_gr > 0)
  );
