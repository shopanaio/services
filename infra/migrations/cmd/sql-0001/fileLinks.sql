CREATE TABLE
  file_links (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    source_id uuid NOT NULL,
    file_id uuid REFERENCES files (id) ON DELETE CASCADE NOT NULL,
    sort_index int NOT NULL,
    PRIMARY KEY (source_id, file_id)
  );

ALTER TABLE file_links
ADD CONSTRAINT idx_file_links_sort_index UNIQUE (source_id, sort_index) DEFERRABLE INITIALLY DEFERRED;

-- Cleanup function to remove file_links for deleted sources
CREATE OR REPLACE FUNCTION delete_associated_file_links () RETURNS trigger AS $$
DECLARE
    schema_name TEXT := TG_TABLE_SCHEMA;
BEGIN
    EXECUTE format('DELETE FROM %I.file_links WHERE source_id = $1', schema_name)
    USING OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Cleanup file_links when product container is deleted
DROP TRIGGER IF EXISTS trg_delete_file_links_products ON product_containers;
CREATE TRIGGER trg_delete_file_links_products
AFTER DELETE ON product_containers FOR EACH ROW
EXECUTE FUNCTION delete_associated_file_links ();

-- Cleanup file_links when product variant is deleted
DROP TRIGGER IF EXISTS trg_delete_file_links_variants ON product_variants;
CREATE TRIGGER trg_delete_file_links_variants
AFTER DELETE ON product_variants FOR EACH ROW
EXECUTE FUNCTION delete_associated_file_links ();
