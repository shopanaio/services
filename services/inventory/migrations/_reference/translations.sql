-- =============================================================================
-- INVENTORY SERVICE: TRANSLATIONS (i18n)
-- =============================================================================
--
-- Multi-language support for product content, options, features, and warehouses.
-- Each entity has a separate translation table with (entity_id, locale) as PK.
--
-- Design decisions:
-- - Separate table per entity (not EAV) for type safety and performance
-- - slug fields remain in main tables (invariant, used for filtering)
-- - name/title fields in translation tables (displayed to users)
-- - CASCADE delete ensures orphaned translations are cleaned up
-- - project_id on all tables for multi-tenant isolation
--
-- Supported locales: uk, en, ru, de, fr (extensible)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PRODUCT TRANSLATIONS
-- -----------------------------------------------------------------------------
-- Main product content: title, description, SEO fields

CREATE TABLE product_translation (
  project_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  locale varchar(8) NOT NULL,

  -- Content
  title text NOT NULL,

  -- Description in multiple formats
  description_text text,   -- Plain text (for search, Typesense)
  description_html text,   -- Rendered HTML (for storefront)
  description_json jsonb,  -- EditorJS blocks state

  -- Short summary
  excerpt text,

  -- SEO
  seo_title varchar(255),
  seo_description text,

  PRIMARY KEY (product_id, locale)
);

CREATE INDEX idx_product_translation_project
  ON product_translation (project_id);

CREATE INDEX idx_product_translation_project_locale
  ON product_translation (project_id, locale);

-- -----------------------------------------------------------------------------
-- VARIANT TRANSLATIONS (optional)
-- -----------------------------------------------------------------------------
-- Only if variants need custom names beyond auto-generated from options

CREATE TABLE variant_translation (
  project_id uuid NOT NULL,
  variant_id uuid NOT NULL REFERENCES variant(id) ON DELETE CASCADE,
  locale varchar(8) NOT NULL,

  title text,

  PRIMARY KEY (variant_id, locale)
);

CREATE INDEX idx_variant_translation_project
  ON variant_translation (project_id);

-- -----------------------------------------------------------------------------
-- OPTION TRANSLATIONS
-- -----------------------------------------------------------------------------
-- Translates option names: "Color" -> "Колір" / "Цвет"

CREATE TABLE product_option_translation (
  project_id uuid NOT NULL,
  option_id uuid NOT NULL REFERENCES product_option(id) ON DELETE CASCADE,
  locale varchar(8) NOT NULL,

  name text NOT NULL,

  PRIMARY KEY (option_id, locale)
);

CREATE INDEX idx_product_option_translation_project
  ON product_option_translation (project_id);

-- -----------------------------------------------------------------------------
-- OPTION VALUE TRANSLATIONS
-- -----------------------------------------------------------------------------
-- Translates option values: "Red" -> "Червоний" / "Красный"

CREATE TABLE product_option_value_translation (
  project_id uuid NOT NULL,
  option_value_id uuid NOT NULL REFERENCES product_option_value(id) ON DELETE CASCADE,
  locale varchar(8) NOT NULL,

  name text NOT NULL,

  PRIMARY KEY (option_value_id, locale)
);

CREATE INDEX idx_product_option_value_translation_project
  ON product_option_value_translation (project_id);

-- -----------------------------------------------------------------------------
-- FEATURE TRANSLATIONS
-- -----------------------------------------------------------------------------
-- Translates feature names: "Brand" -> "Бренд", "Material" -> "Матеріал"

CREATE TABLE product_feature_translation (
  project_id uuid NOT NULL,
  feature_id uuid NOT NULL REFERENCES product_feature(id) ON DELETE CASCADE,
  locale varchar(8) NOT NULL,

  name text NOT NULL,

  PRIMARY KEY (feature_id, locale)
);

CREATE INDEX idx_product_feature_translation_project
  ON product_feature_translation (project_id);

-- -----------------------------------------------------------------------------
-- FEATURE VALUE TRANSLATIONS
-- -----------------------------------------------------------------------------
-- Translates feature values: "Leather" -> "Шкіра" / "Кожа"

CREATE TABLE product_feature_value_translation (
  project_id uuid NOT NULL,
  feature_value_id uuid NOT NULL REFERENCES product_feature_value(id) ON DELETE CASCADE,
  locale varchar(8) NOT NULL,

  name text NOT NULL,

  PRIMARY KEY (feature_value_id, locale)
);

CREATE INDEX idx_product_feature_value_translation_project
  ON product_feature_value_translation (project_id);

-- -----------------------------------------------------------------------------
-- WAREHOUSE TRANSLATIONS
-- -----------------------------------------------------------------------------
-- Translates warehouse display names

CREATE TABLE warehouse_translation (
  project_id uuid NOT NULL,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  locale varchar(8) NOT NULL,

  name text NOT NULL,

  PRIMARY KEY (warehouse_id, locale)
);

CREATE INDEX idx_warehouse_translation_project
  ON warehouse_translation (project_id);


-- =============================================================================
-- EXAMPLE QUERIES
-- =============================================================================

-- Get product with translation (specific locale)
-- SELECT
--   p.id,
--   p.project_id,
--   p.published_at,
--   pt.title,
--   pt.description,
--   pt.seo_title
-- FROM product p
-- LEFT JOIN product_translation pt
--   ON pt.product_id = p.id AND pt.locale = 'uk'
-- WHERE p.id = $1;

-- Get product with fallback locale
-- SELECT
--   p.id,
--   COALESCE(pt.title, pt_fallback.title) as title,
--   COALESCE(pt.description, pt_fallback.description) as description
-- FROM product p
-- LEFT JOIN product_translation pt
--   ON pt.product_id = p.id AND pt.locale = $2
-- LEFT JOIN product_translation pt_fallback
--   ON pt_fallback.product_id = p.id AND pt_fallback.locale = 'uk'
-- WHERE p.id = $1;

-- Get all translations for a product
-- SELECT locale, title, description
-- FROM product_translation
-- WHERE product_id = $1
-- ORDER BY locale;

-- Upsert translation (create or update)
-- INSERT INTO product_translation (project_id, product_id, locale, title, description)
-- VALUES ($1, $2, $3, $4, $5)
-- ON CONFLICT (product_id, locale)
-- DO UPDATE SET
--   title = EXCLUDED.title,
--   description = EXCLUDED.description;

-- Get options with translations for a product
-- SELECT
--   po.id,
--   po.slug,
--   po.display_type,
--   pot.name as display_name
-- FROM product_option po
-- LEFT JOIN product_option_translation pot
--   ON pot.option_id = po.id AND pot.locale = $2
-- WHERE po.product_id = $1;

-- Get option values with translations
-- SELECT
--   pov.id,
--   pov.slug,
--   pov.sort_index,
--   povt.name as display_name
-- FROM product_option_value pov
-- LEFT JOIN product_option_value_translation povt
--   ON povt.option_value_id = pov.id AND povt.locale = $2
-- WHERE pov.option_id = $1
-- ORDER BY pov.sort_index;
