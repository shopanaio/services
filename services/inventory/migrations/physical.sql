CREATE TYPE dimension_unit AS ENUM('mm', 'cm', 'm', 'in', 'ft', 'yd');

CREATE TABLE
  item_dimensions (
    variant_id uuid PRIMARY KEY,
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    -- Width, Length, Height in mm
    w_mm int NOT NULL,
    l_mm int NOT NULL,
    h_mm int NOT NULL,
    -- Display unit to show in UI (needs to be converted from/to mm)
    display_unit dimension_unit NOT NULL,
    CONSTRAINT item_dimensions_variant_fk FOREIGN KEY (variant_id) REFERENCES variant (id) ON DELETE CASCADE,
    CHECK (
      w_mm > 0
      AND l_mm > 0
      AND h_mm > 0
    )
  );

CREATE INDEX idx_item_dimensions_project_id ON item_dimensions (project_id);

CREATE TYPE weight_unit AS ENUM('g', 'kg', 'lb', 'oz');

CREATE TABLE
  item_weight (
    variant_id uuid PRIMARY KEY,
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    -- weight in grams
    weight_gr int NOT NULL,
    -- Display unit to show in UI (needs to be converted from/to grams)
    display_unit weight_unit NOT NULL DEFAULT 'g',
    CONSTRAINT item_weight_variant_fk FOREIGN KEY (variant_id) REFERENCES variant (id) ON DELETE CASCADE,
    CHECK (weight_gr > 0)
  );

CREATE INDEX idx_item_weight_project_id ON item_weight (project_id);
