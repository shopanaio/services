ALTER TABLE catalog.warehouses
  ADD COLUMN country_code varchar(2),
  ADD COLUMN province_code varchar(128),
  ADD COLUMN province_name text,
  ADD COLUMN city text,
  ADD COLUMN postal_code varchar(64),
  ADD COLUMN address_line_1 text,
  ADD COLUMN address_line_2 text,
  ADD CONSTRAINT warehouses_country_code_check
    CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$');
