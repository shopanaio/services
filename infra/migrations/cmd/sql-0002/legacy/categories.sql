CREATE TABLE
  categories (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY ,
    slug varchar(255) NOT NULL,
    listing_type varchar(32) NOT NULL,
    listing_order_by varchar(32) NOT NULL,
    listing_order_by_status boolean NOT NULL DEFAULT false,
    listing_children boolean NOT NULL DEFAULT false,
    cover_id uuid REFERENCES files (id),
    parent_id uuid REFERENCES categories (id) ON DELETE CASCADE,
    status varchar(32) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
  );

-- Уникальность slug только среди «живых» (soft-delete поддержка)
CREATE UNIQUE INDEX idx_categories_slug ON categories (project_id, slug)
WHERE deleted_at IS NULL;

CREATE INDEX idx_categories_parent_id ON categories (parent_id);

CREATE INDEX idx_categories_listing_type ON categories (listing_type);

CREATE INDEX idx_categories_listing_children ON categories (listing_children);

CREATE INDEX idx_categories_status ON categories (status);

CREATE INDEX idx_categories_cover_id ON categories (cover_id);

-- Индексы для soft-delete
CREATE INDEX idx_categories_deleted_at ON categories (deleted_at) WHERE deleted_at IS NOT NULL;

CREATE TABLE
  categories_tags_links (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    category_id uuid REFERENCES categories (id) ON DELETE CASCADE,
    tag_id uuid REFERENCES tags (id) ON DELETE CASCADE,
    PRIMARY KEY (category_id, tag_id)
  );

-- Быстрый выбор категорий по тегу
CREATE INDEX IF NOT EXISTS idx_categories_tags_links_tag_id ON categories_tags_links (tag_id);

CREATE TABLE
  categories_labels_links (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    category_id uuid REFERENCES categories (id) ON DELETE CASCADE,
    label_id uuid REFERENCES labels (id) ON DELETE CASCADE,
    PRIMARY KEY (category_id, label_id)
  );

-- Быстрый выбор категорий по лейблу
CREATE INDEX IF NOT EXISTS idx_categories_labels_links_label_id ON categories_labels_links (label_id);

-- Function to validate category cycle
CREATE
OR REPLACE FUNCTION validate_category_cycle (
  p_schema text,
  p_category_id uuid,
  p_parent_id uuid
) RETURNS void AS $$
DECLARE
    rec record;
BEGIN
    -- Если родитель не указан, проверка не требуется
    IF p_parent_id IS NULL THEN
        RETURN;
    END IF;

    EXECUTE format(
      'WITH RECURSIVE ancestry AS (
           SELECT id, parent_id
             FROM %I.categories
            WHERE id = $1
         UNION ALL
           SELECT c.id, c.parent_id
             FROM %I.categories c
             JOIN ancestry a ON c.id = a.parent_id
       )
       SELECT 1 FROM ancestry WHERE id = $2 LIMIT 1',
      p_schema, p_schema)
    INTO rec
    USING p_parent_id, p_category_id;

    IF rec IS NOT NULL THEN
        RAISE EXCEPTION 'Cycle detected: category % cannot have parent % because it is in its own ancestry', p_category_id, p_parent_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE
OR REPLACE FUNCTION trg_validate_category_cycle () RETURNS trigger AS $$
DECLARE
    schema_name text := TG_TABLE_SCHEMA;  -- получаем имя схемы из контекста триггера
BEGIN
    EXECUTE format('SELECT %I.validate_category_cycle($1, $2, $3)', schema_name)
        USING schema_name, NEW.id, NEW.parent_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_category_cycle_trigger BEFORE INSERT
OR
UPDATE ON categories FOR EACH ROW
EXECUTE FUNCTION trg_validate_category_cycle ();

--
CREATE
OR REPLACE FUNCTION trg_validate_primary_category_on_links_deferred () RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  schema_name text := TG_TABLE_SCHEMA;
  pid         uuid;
  cont_id     uuid;
BEGIN
  -- 1) Берём product_id из NEW или OLD
  pid := COALESCE(NEW.product_variant_id, OLD.product_variant_id);
  IF pid IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- 2) Динамически обращаемся к таблице product_variants в нужной схеме
  EXECUTE format(
    'SELECT pv.container_id
       FROM %I.product_variants pv
      WHERE pv.id = $1',
    schema_name
  )
  INTO cont_id
  USING pid;
  IF cont_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- 3) Создаём temp-таблицу один раз за сессию
  IF NOT EXISTS (
    SELECT 1
      FROM pg_class c
     WHERE c.relname = 'temp_validated_containers'
       AND c.relpersistence = 't'
  ) THEN
    EXECUTE
      'CREATE TEMP TABLE temp_validated_containers (
         container_id uuid PRIMARY KEY
       ) ON COMMIT DELETE ROWS';
  END IF;

  -- 4) Если этот контейнер ещё не проверялся, — проверяем и помечаем
  IF NOT EXISTS (
       SELECT 1
         FROM temp_validated_containers
        WHERE container_id = cont_id
     )
  THEN
    INSERT INTO temp_validated_containers(container_id)
      VALUES (cont_id);

    -- 5) Вызываем вашу функцию-валидатор с правильной схемой
    EXECUTE format(
      'SELECT %I.validate_container_primary_category($1, $2)',
      schema_name
    )
    USING schema_name, cont_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Привязка триггера к таблице связей вариантов и категорий (деф. отложенный)
-- Привязка триггера выполняется после создания таблицы связей в products.sql
