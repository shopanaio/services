CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE
	-- Table for searchable fields
	translations_index (
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		source_id uuid NOT NULL,
		source_type varchar(32) NOT NULL,
		locale_code varchar(16) NOT NULL,
		FOREIGN KEY (project_id, locale_code) REFERENCES locales (project_id, code) ON DELETE CASCADE,
		field_name varchar(32) NOT NULL,
		field_value text NOT NULL,
		PRIMARY KEY (project_id, locale_code, field_name, source_id)
	);

CREATE TABLE
	translations (
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		source_id uuid NOT NULL,
		source_type varchar(32) NOT NULL,
		locale_code varchar(16) NOT NULL,
		FOREIGN KEY (project_id, locale_code) REFERENCES locales (project_id, code) ON DELETE CASCADE,
		field_name varchar(32) NOT NULL,
		field_value text NOT NULL,
		PRIMARY KEY (project_id, source_id, field_name, locale_code)
	);

CREATE
OR REPLACE FUNCTION delete_associated_translations () RETURNS trigger AS $$
DECLARE
    schema_name TEXT;
BEGIN
    -- Get the schema name of the table that triggered the function
    schema_name := TG_TABLE_SCHEMA;

    -- Delete from the translations_index table using the deleted source's ID
    EXECUTE format('DELETE FROM %I.translations_index WHERE source_id = $1', schema_name)
    USING OLD.id;

    -- Delete from the translations table using the deleted source's ID
    EXECUTE format('DELETE FROM %I.translations WHERE source_id = $1', schema_name)
    USING OLD.id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_delete_translations_products
AFTER DELETE ON product_containers FOR EACH ROW
EXECUTE FUNCTION delete_associated_translations ();

CREATE TRIGGER trg_delete_translations_product_variants
AFTER DELETE ON product_variants FOR EACH ROW
EXECUTE FUNCTION delete_associated_translations ();

CREATE TRIGGER trg_delete_translations_categories
AFTER DELETE ON categories FOR EACH ROW
EXECUTE FUNCTION delete_associated_translations ();

CREATE TRIGGER trg_delete_translations_pages
AFTER DELETE ON pages FOR EACH ROW
EXECUTE FUNCTION delete_associated_translations ();

-- product_feature_groups
CREATE TRIGGER trg_delete_translations_product_feature_groups
AFTER DELETE ON product_feature_groups FOR EACH ROW
EXECUTE FUNCTION delete_associated_translations ();

-- product_features
CREATE TRIGGER trg_delete_translations_product_feature_sources
AFTER DELETE ON product_feature_sources FOR EACH ROW
EXECUTE FUNCTION delete_associated_translations ();

-- tags
CREATE TRIGGER trg_delete_translations_tags
AFTER DELETE ON tags FOR EACH ROW
EXECUTE FUNCTION delete_associated_translations ();
