CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE
	i18n (
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		record_id uuid NOT NULL,
		record_type varchar(32) NOT NULL,
		locale_code locale NOT NULL,
		FOREIGN KEY (project_id, locale_code) REFERENCES locales (project_id, code) ON DELETE CASCADE,
		field_name varchar(32) NOT NULL,
		field_value text NOT NULL,
		PRIMARY KEY (project_id, record_id, field_name, locale_code)
	);

CREATE
OR REPLACE FUNCTION delete_associated_translations () RETURNS trigger AS $$
DECLARE
    schema_name TEXT;
BEGIN
    -- Get the schema name of the table that triggered the function
    schema_name := TG_TABLE_SCHEMA;

    -- Delete from the i18n table using the deleted record's ID
    EXECUTE format('DELETE FROM %I.i18n WHERE record_id = $1', schema_name)
    USING OLD.id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Example trigger to add for a table which uses translations
-- CREATE TRIGGER trg_delete_translations_products
-- AFTER DELETE ON product_containers FOR EACH ROW
-- EXECUTE FUNCTION delete_associated_translations ();

-- tags
CREATE TRIGGER trg_delete_translations_tags
AFTER DELETE ON tags FOR EACH ROW
EXECUTE FUNCTION delete_associated_translations ();

-- Индексы для оптимизации производительности
-- Составной индекс для быстрой фильтрации по проекту и типу записи
CREATE INDEX idx_i18n_project_record_type ON i18n(project_id, record_type);

-- Индекс для быстрого поиска по record_id (используется в триггерах)
CREATE INDEX idx_i18n_record_id ON i18n(record_id);

-- Индекс для локалей (полезен для фильтрации по языку)
CREATE INDEX idx_i18n_locale ON i18n(locale_code);

-- Составной индекс для типичных запросов: проект + запись + локаль
CREATE INDEX idx_i18n_project_record_locale ON i18n(project_id, record_id, locale_code);
