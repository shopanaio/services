CREATE TABLE
	feature_flags (
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
		name varchar(255) NOT NULL,
		slug varchar(255) NOT NULL,
		description text,
		created_at timestamptz NOT NULL DEFAULT now()
	);

CREATE TABLE
	feature_flags_links (
		project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
		source_id uuid NOT NULL,
		flag uuid NOT NULL REFERENCES feature_flags (id) ON DELETE CASCADE,
		PRIMARY KEY (project_id, source_id, flag)
	);

-- =====================================
-- Индексы для быстрого поиска и выборок
-- =====================================
-- Уникальный slug внутри проекта
CREATE UNIQUE INDEX idx_feature_flags_slug ON feature_flags (project_id, slug);

-- Быстрый каскад удаления по source_id из триггера
CREATE INDEX IF NOT EXISTS idx_feature_flags_links_source_id ON feature_flags_links (source_id);

-- ====================================================================
-- TRIGGERS: автоматическое удаление ссылок feature flags при удалении
-- связанной сущности (product, category, page и пр.)
-- ====================================================================
CREATE
OR REPLACE FUNCTION delete_associated_feature_flags () RETURNS trigger AS $$
DECLARE
    schema_name TEXT;
BEGIN
    -- Определяем схему, в которой находится вызывающая таблица
    schema_name := TG_TABLE_SCHEMA;

    -- Удаляем записи линков по source_id удалённой сущности
    EXECUTE format('DELETE FROM %I.feature_flags_links WHERE source_id = $1', schema_name)
    USING OLD.id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Продукты (контейнеры)
CREATE TRIGGER trg_delete_feature_flags_products
AFTER DELETE ON product_containers FOR EACH ROW
EXECUTE FUNCTION delete_associated_feature_flags ();

-- Категории
CREATE TRIGGER trg_delete_feature_flags_categories
AFTER DELETE ON categories FOR EACH ROW
EXECUTE FUNCTION delete_associated_feature_flags ();

-- Страницы (CMS)
CREATE TRIGGER trg_delete_feature_flags_pages
AFTER DELETE ON pages FOR EACH ROW
EXECUTE FUNCTION delete_associated_feature_flags ();

-- Варианты продуктов
CREATE TRIGGER trg_delete_feature_flags_variants
AFTER DELETE ON product_variants FOR EACH ROW
EXECUTE FUNCTION delete_associated_feature_flags ();
