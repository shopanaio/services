CREATE TABLE
    product_groups (
        project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
        -- owner of the group
        product_id uuid NOT NULL REFERENCES product_containers (id) ON DELETE CASCADE,
        -- group id
        id uuid PRIMARY KEY ,
        -- can select multiple products
        is_multiple boolean NOT NULL,
        -- at least one product is required
        is_required boolean NOT NULL,
        -- products are shown as variants
        is_variants_level boolean NOT NULL,
        -- can add subset of variants and sort them
        managed_variants boolean NOT NULL,
        -- sort index within the product
        sort_index int NOT NULL
    );

ALTER TABLE product_groups
ADD CONSTRAINT const_product_groups_sort_index UNIQUE (product_id, sort_index) DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX idx_product_groups_product_id ON product_groups (product_id);

CREATE TABLE
    product_group_items (
        project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
        id uuid PRIMARY KEY ,
        variant_id uuid NOT NULL REFERENCES product_variants (id) ON DELETE CASCADE,
        group_id uuid NOT NULL REFERENCES product_groups (id) ON DELETE CASCADE,
        -- Mode of price markup for the group
        price_type text NOT NULL,
        price_amount_value int, -- NULL when free or base, -- NOT NULL when fixed markup
        price_percentage_value float, -- NOT NULL when percentage markup
        -- Maximum quantity for this item in the group
        max_quantity int,
        sort_index int NOT NULL
    );

ALTER TABLE product_group_items
ADD CONSTRAINT const_product_group_items_sort_index UNIQUE (group_id, sort_index) DEFERRABLE INITIALLY DEFERRED;

CREATE UNIQUE INDEX idx_product_group_items_variant_id ON product_group_items (variant_id, group_id);

CREATE INDEX idx_product_group_items_group_id ON product_group_items (group_id);

-- Function to validate variant deletion
CREATE
OR REPLACE FUNCTION validate_variant_deletion (p_schema text, p_variant_id uuid) RETURNS void AS $$
DECLARE
    rec record;
BEGIN
    FOR rec IN EXECUTE format(
        'SELECT pg.id AS group_id, pg.is_required
         FROM %I.product_group_items pgi
         JOIN %I.product_groups pg ON pgi.group_id = pg.id
         WHERE pgi.variant_id = $1',
         p_schema, p_schema)
    USING p_variant_id
    LOOP
        IF rec.is_required THEN
            RAISE EXCEPTION 'cannot delete variant %, since it is required in the group %', p_variant_id, rec.group_id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent deletion of required variants
CREATE
OR REPLACE FUNCTION trg_prevent_variant_deletion_if_required_group () RETURNS trigger AS $$
DECLARE
    schema_name text;
BEGIN
    schema_name := TG_TABLE_SCHEMA;  -- Получаем имя схемы из контекста триггера

    EXECUTE format('SELECT %I.validate_variant_deletion($1, $2)', schema_name)
        USING schema_name, OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_variant_deletion_if_required_group BEFORE DELETE ON product_variants FOR EACH ROW
EXECUTE FUNCTION trg_prevent_variant_deletion_if_required_group ();

-- Function to cleanup empty groups
CREATE
OR REPLACE FUNCTION trg_cleanup_empty_groups () RETURNS trigger AS $$
DECLARE
    r record;
    v_schema text;
    v_count int;
BEGIN
    v_schema := TG_TABLE_SCHEMA;

    FOR r IN
        SELECT DISTINCT d.group_id
        FROM deleted_items d
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I.product_group_items WHERE group_id = $1', v_schema)
        INTO v_count USING r.group_id;

        IF v_count = 0 THEN
            EXECUTE format('DELETE FROM %I.product_groups WHERE id = $1 AND is_required = false', v_schema)
            USING r.group_id;
        END IF;
    END LOOP;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_empty_groups
AFTER DELETE ON product_group_items REFERENCING OLD TABLE AS deleted_items FOR EACH STATEMENT
EXECUTE FUNCTION trg_cleanup_empty_groups ();

-- Function to validate recursive variant
CREATE
OR REPLACE FUNCTION validate_recursive_variant (p_schema text, p_group_id uuid, p_variant_id uuid) RETURNS void AS $$
DECLARE
    group_container uuid;
    variant_container uuid;
    rec record;
BEGIN
    -- Получаем контейнер группы (из product_groups.product_id)
    EXECUTE format('SELECT product_id FROM %I.product_groups WHERE id = $1', p_schema)
        INTO group_container USING p_group_id;
    IF group_container IS NULL THEN
        RAISE EXCEPTION 'Группа с id % не найдена или product_id не задан', p_group_id;
    END IF;

    -- Получаем контейнер варианта (из product_variants.container_id)
    EXECUTE format('SELECT container_id FROM %I.product_variants WHERE id = $1', p_schema)
        INTO variant_container USING p_variant_id;
    IF variant_container IS NULL THEN
        RAISE EXCEPTION 'Вариант с id % не найден или container_id не задан', p_variant_id;
    END IF;

    -- Прямая проверка: если контейнеры совпадают, это уже ошибка
    IF variant_container = group_container THEN
        RAISE EXCEPTION 'Прямая рекурсия: контейнер варианта (%) совпадает с контейнером группы (%)', variant_container, group_container;
    END IF;

    -- Рекурсивный запрос: ищем, существует ли путь от контейнера варианта (начало цепочки)
    -- до контейнера группы. Если да, то добавление нового элемента (ребра)
    -- завершит цикл.
    EXECUTE format(
      'WITH RECURSIVE chain AS (
           SELECT $1::uuid AS container_id
         UNION
           SELECT pv.container_id
           FROM %I.product_groups pg
           JOIN %I.product_group_items pgi ON pg.id = pgi.group_id
           JOIN %I.product_variants pv ON pgi.variant_id = pv.id
           JOIN chain c ON pg.product_id = c.container_id
       )
       SELECT 1 FROM chain WHERE container_id = $2 LIMIT 1',
       p_schema, p_schema, p_schema)
    INTO rec
    USING variant_container, group_container;

    IF rec IS NOT NULL THEN
         RAISE EXCEPTION 'Рекурсивная зависимость обнаружена: добавление связи от контейнера группы (%) к контейнеру варианта (%) создаст цикл', group_container, variant_container;
    END IF;

    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check recursive variant
CREATE
OR REPLACE FUNCTION trg_check_recursive_variant () RETURNS trigger AS $$
DECLARE
    schema_name text := TG_TABLE_SCHEMA;  -- имя схемы, в которой находится таблица
BEGIN
    -- Вызываем функцию валидации, передавая схему, group_id и variant_id.
    EXECUTE format('SELECT %I.validate_recursive_variant($1, $2, $3)', schema_name)
        USING schema_name, NEW.group_id, NEW.variant_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_recursive_variant BEFORE INSERT
OR
UPDATE ON product_group_items FOR EACH ROW
EXECUTE FUNCTION trg_check_recursive_variant ();

-- Function to validate variant container unique in groups
CREATE
OR REPLACE FUNCTION validate_variant_container_unique_in_groups (p_schema text, p_group_id uuid, p_variant_id uuid) RETURNS void AS $$
DECLARE
    group_product uuid;
    variant_container uuid;
    rec record;
BEGIN
    -- Получаем родительский контейнер группы
    EXECUTE format('SELECT product_id FROM %I.product_groups WHERE id = $1', p_schema)
        INTO group_product USING p_group_id;
    IF group_product IS NULL THEN
        RAISE EXCEPTION 'Группа с id % не найдена или product_id не задан', p_group_id;
    END IF;

    -- Получаем контейнер варианта
    EXECUTE format('SELECT container_id FROM %I.product_variants WHERE id = $1', p_schema)
        INTO variant_container USING p_variant_id;
    IF variant_container IS NULL THEN
        RAISE EXCEPTION 'Вариант с id % не найден или container_id не задан', p_variant_id;
    END IF;

    -- Проверяем, что данный вариант (его контейнер) не присутствует в других группах
    -- того же родительского продукта (group_product)
    EXECUTE format(
      'WITH new_data AS (
           SELECT $1::uuid AS group_product, $2::uuid AS variant_container
       )
       SELECT 1
       FROM %I.product_group_items pgi
       JOIN %I.product_groups pg ON pgi.group_id = pg.id
       JOIN %I.product_variants pv ON pgi.variant_id = pv.id
       CROSS JOIN new_data nd
       WHERE pg.product_id = nd.group_product
         AND pv.container_id = nd.variant_container
         AND pgi.group_id <> $3
       LIMIT 1',
       p_schema, p_schema, p_schema)
    INTO rec
    USING group_product, variant_container, p_group_id;

    IF rec IS NOT NULL THEN
        RAISE EXCEPTION 'Невозможно добавить вариант с контейнером %, так как он уже присутствует в другой группе родительского продукта %', variant_container, group_product;
    END IF;

    RETURN;
END;
$$ LANGUAGE plpgsql;

CREATE
OR REPLACE FUNCTION trg_validate_variant_container_unique_in_groups () RETURNS trigger AS $$
DECLARE
    schema_name text := TG_TABLE_SCHEMA;
BEGIN
    -- Вызываем функцию валидации, передавая схему, group_id и variant_id.
    EXECUTE format('SELECT %I.validate_variant_container_unique_in_groups($1, $2, $3)', schema_name)
        USING schema_name, NEW.group_id, NEW.variant_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_variant_container_unique_in_groups BEFORE INSERT
OR
UPDATE ON product_group_items FOR EACH ROW
EXECUTE FUNCTION trg_validate_variant_container_unique_in_groups ();
