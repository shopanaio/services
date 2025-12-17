-- Catalog & Product Filters Schema
-- -------------------------------------------------------------
-- PURPOSE
-- =======
-- Эти объекты образуют полный контур работы «фильтры каталога»:
--   1. ***Админ-панель*** создаёт фильтры, сопоставляет им feature-группы,
--      tag-группы или сток статусы, и при необходимости — объединяет
--      несколько raw-значений в один синоним.
--   2. ***Страница каталога*** запрашивает конфигурацию фильтров, строит UI.
--   3. ***Клиент*** отправляет выбранные значения; бэкенд разворачивает их в
--      `(group_slug,value_slug)` кортежи через таблицу aliases и ищет в
--      соответствующих индексах: `product_option_idx` для опций или
--      `product_tag_idx` для тегов.
--   4. ***Триггеры синхронизации*** гарантируют актуальность индексов:
--      - fn_product_option_idx_sync() для опций товара (product_features.is_option = true)
--      - fn_product_tag_idx_sync() для тегов контейнера (product_containers_tags_links)
--      - fn_product_variant_tag_sync() для синхронизации при добавлении вариантов
--   5. ***Запрос товаров*** использует денормализованные индексы и агрегаты
--      цены/наличия из `product_variants` — максимум производительности.
--
-- Таблицы и их роли
-- -----------------
--  catalog_filters
--      – «метаданные» фильтра: заголовок, тип (price|tag|availability|option),
--        сортировка в UI.  *Одна запись = один блок чекбоксов или слайдер цены.*
--
--  catalog_filter_feature_groups
--      – список feature-групп, чьи значения попадают в фильтр (n:1).
--        Если у товара есть несколько групп «upper_material, sole_material»,
--        можно объединить их в фильтр «Material».
--
--  catalog_filter_tag_groups
--      – список tag-групп для фильтров по тегам (n:1).
--        Позволяет объединить несколько групп тегов в один фильтр.
--
--  catalog_filter_stock_statuses
--      – список сток статусов для фильтров по наличию (n:1).
--        Позволяет выбрать, какие статусы товара будут показаны в фильтре.
--
--  catalog_filter_values
--      – канонические (displayable) значения фильтра. Например «medium».
--
--  catalog_filter_value_aliases
--      – синонимы raw-значений, которые маппятся на canonical value.
--        «M», «middle» → «medium».  *Позволяет хранить в БД короткие слуги,
--        а в UI показывать единый пункт фильтра.*
--
--  product_option_idx
--      – денормализованный индекс всех опционных значений товара.
--        Заполняется триггером, изменения мгновенны.
--
--  product_tag_idx
--      – денормализованный индекс всех тегов для контейнера товара.
--        Синхронизируется через связь container → tags.
--
--  fn_product_option_idx_sync()
--      – триггер на INSERT/UPDATE/DELETE `product_features`.
--        Обновляет `product_option_idx` для строк с `is_option = true`.
--
--  fn_product_tag_idx_sync()
--      – триггер на INSERT/DELETE `product_containers_tags_links`.
--        Обновляет `product_tag_idx` для всех вариантов контейнера.
--
--  fn_product_variant_tag_sync()
--      – триггер на INSERT/DELETE `product_variants`.
--        Синхронизирует теги при добавлении/удалении вариантов.
--
-- Использование на практике
-- -------------------------
-- 1. ***Инициализация каталога (build UI)***
--      -- Для фильтров с values (option, tag)
--      SELECT cf.*, array_agg(cfg.group_slug) AS groups,
--             json_agg(json_build_object('slug',cv.display_slug,
--                                         'title',cv.display_title,
--                                         'aliases', (SELECT array_agg(cfa.value_slug)
--                                                    FROM catalog_filter_value_aliases cfa
--                                                    WHERE cfa.value_id = cv.id))) AS values
--      FROM catalog_filters cf
--      LEFT JOIN catalog_filter_feature_groups cfg ON cfg.filter_id = cf.id
--      LEFT JOIN catalog_filter_values           cv ON cv.filter_id = cf.id
--      WHERE cf.project_id = :project
--        AND cf.is_active
--        AND cf.source_type IN ('option', 'tag')
--      GROUP BY cf.id
--      ORDER BY cf.sort_index;
--
--      -- Для фильтров по сток статусам
--      SELECT cf.*,
--             json_agg(json_build_object('code', ss.code,
--                                        'available', ss.item_available)) AS stock_statuses
--      FROM catalog_filters cf
--      JOIN catalog_filter_stock_statuses cfss ON cfss.filter_id = cf.id
--      JOIN stock_statuses ss ON ss.id = cfss.stock_status_id
--      WHERE cf.project_id = :project
--        AND cf.is_active
--        AND cf.source_type = 'stock_status'
--      GROUP BY cf.id
--      ORDER BY cf.sort_index;
--
-- 2. ***Формирование запроса на список товаров*** (пример)
--      Клиент шлёт canonical display_slug'и. Бэкенд делает:
--         SELECT group_slug, value_slug
--         FROM catalog_filter_value_aliases
--         WHERE (filter_id, display_slug) IN ((:filterId, 'medium'), ...)
--      Затем подставляет полученные кортежи в WHERE → product_option_idx.
--
-- 3. ***Пример запроса с фильтрацией по опциям И тегам***
--      SELECT DISTINCT pv.*
--      FROM product_variants pv
--      JOIN product_variants_categories_links pvcl ON pvcl.product_id = pv.id
--      -- Фильтрация по опциям
--      JOIN product_option_idx poi ON poi.variant_id = pv.id
--      -- Фильтрация по тегам (используем GIN оператор @>)
--      JOIN product_tag_idx pti ON pti.container_id = pv.container_id
--      WHERE pv.project_id = $1
--        AND pvcl.category_id = $2
--        AND pv.in_listing = true
--        -- Опции: размер M или L
--        AND (poi.group_slug, poi.value_slug) IN (('size','m'), ('size','l'))
--        -- Теги: коллекция "summer" И тег "sale" (используем оператор массива @>)
--        AND pti.tags @> ARRAY['collection:summer', 'sale']
--      GROUP BY pv.id
--      HAVING COUNT(DISTINCT poi.group_slug) >= 1;  -- минимум одна опция
--
--      -- Альтернативный вариант для поиска по JSONB группам:
--      AND pti.tag_groups @> '{"collection": ["summer"], "": ["sale"]}'::jsonb
--
-- 4. ***Пример запроса с фильтрацией по сток статусам***
--      SELECT DISTINCT pv.*
--      FROM product_variants pv
--      JOIN product_variants_categories_links pvcl ON pvcl.product_id = pv.id
--      JOIN stock_statuses ss ON ss.id = pv.stock_status
--      WHERE pv.project_id = $1
--        AND pvcl.category_id = $2
--        AND pv.in_listing = true
--        -- Фильтрация по сток статусам: в наличии или под заказ
--        AND ss.code IN ('in_stock', 'on_order');
-- -------------------------------------------------------------
-- Требуемые расширения не требуются для данной схемы
----------------------------------------------------------------
-- 1. Catalog-level filters (UI configuration)
----------------------------------------------------------------
CREATE TABLE
  catalog_filters (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
    title varchar(255) NOT NULL,
    source_type varchar(16) NOT NULL, -- price | tag | availability | option
    option_group_slug varchar(255), -- DEPRECATED: используйте catalog_filter_feature_groups
    is_active boolean NOT NULL DEFAULT true,
    sort_index int NOT NULL DEFAULT 0 CHECK (sort_index >= 0),
    UNIQUE (project_id, sort_index)
  );

----------------------------------------------------------------
-- 1a. Доп. связь «фильтр ↔ несколько групп фич»
--    Позволяет, например, объединить группы
--    "upper_material" и "sole_material" в единый фильтр "Material".
----------------------------------------------------------------
CREATE TABLE
  catalog_filter_feature_groups (
    filter_id uuid REFERENCES catalog_filters (id) ON DELETE CASCADE,
    group_slug varchar(255) NOT NULL,
    sort_index int NOT NULL DEFAULT 0 CHECK (sort_index >= 0),
    PRIMARY KEY (filter_id, group_slug)
  );

----------------------------------------------------------------
-- 1a-tags. Доп. связь «фильтр ↔ несколько групп тегов»
--    Позволяет объединить несколько групп тегов в один фильтр
----------------------------------------------------------------
CREATE TABLE
  catalog_filter_tag_groups (
    filter_id uuid REFERENCES catalog_filters (id) ON DELETE CASCADE,
    group_id uuid REFERENCES tag_groups (id) ON DELETE CASCADE,
    sort_index int NOT NULL DEFAULT 0 CHECK (sort_index >= 0),
    PRIMARY KEY (filter_id, group_id)
  );

----------------------------------------------------------------
-- 1a-stock. Связь «фильтр ↔ сток статусы»
--    Позволяет выбрать, какие сток статусы будут показаны в фильтре
----------------------------------------------------------------
CREATE TABLE
  catalog_filter_stock_statuses (
    filter_id uuid REFERENCES catalog_filters (id) ON DELETE CASCADE,
    stock_status_id uuid REFERENCES stock_statuses (id) ON DELETE CASCADE,
    sort_index int NOT NULL DEFAULT 0 CHECK (sort_index >= 0),
    PRIMARY KEY (filter_id, stock_status_id)
  );

----------------------------------------------------------------
-- 1b. Значения фильтра + алиасы (словарь синонимов)
--    Пример: отображаемое "medium" ↔  alias'ы "m", "middle".
----------------------------------------------------------------
CREATE TABLE
  catalog_filter_values (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
    filter_id uuid REFERENCES catalog_filters (id) ON DELETE CASCADE,
    display_slug varchar(255) NOT NULL, -- canonical slug («medium»)
    display_title varchar(255) NOT NULL, -- локализуемый текст
    sort_index int NOT NULL DEFAULT 0 CHECK (sort_index >= 0),
    UNIQUE (filter_id, display_slug)
  );

-- связь «canonical value ↔ конкретный (group_slug,value_slug)»
CREATE TABLE
  catalog_filter_value_aliases (
    value_id uuid REFERENCES catalog_filter_values (id) ON DELETE CASCADE,
    group_slug varchar(255) NOT NULL,
    value_slug varchar(255) NOT NULL,
    PRIMARY KEY (value_id, group_slug, value_slug)
  );

-- ускоряем обратный поиск alias → canonical
CREATE INDEX idx_cf_value_alias_lookup ON catalog_filter_value_aliases (group_slug, value_slug);

----------------------------------------------------------------
-- 2. Denormalised option index for fast WHERE .. IN (...) queries
----------------------------------------------------------------
-- TODO: при удалении проекта строки здесь не удаляются каскадом.
-- Добавьте FK на projects(id) с ON DELETE CASCADE или очистку через триггер.
CREATE TABLE
  product_option_idx (
    project_id uuid NOT NULL,
    variant_id uuid NOT NULL,
    group_slug varchar(255) NOT NULL,
    value_slug varchar(255) NOT NULL,
    PRIMARY KEY (variant_id, group_slug, value_slug)
  );

-- Equality & range lookups
CREATE INDEX idx_product_option_idx_group_value ON product_option_idx (group_slug, value_slug, variant_id);

----------------------------------------------------------------
-- 2-tags. Denormalised tag index for fast WHERE .. IN (...) queries
----------------------------------------------------------------
-- TODO: при удалении проекта строки здесь не удаляются каскадом.
-- Добавьте FK на projects(id) с ON DELETE CASCADE или очистку через триггер.
CREATE TABLE
  product_tag_idx (
    project_id uuid NOT NULL,
    container_id uuid PRIMARY KEY,
    tags text[] NOT NULL DEFAULT '{}', -- массив тегов в формате "group:tag" или просто "tag"
    tag_groups jsonb NOT NULL DEFAULT '{}' -- {"group_slug": ["tag1", "tag2"], "": ["ungrouped_tag"]}
  );

-- GIN индекс для быстрого поиска по массиву тегов
CREATE INDEX idx_product_tag_idx_tags_gin ON product_tag_idx USING gin (tags);

-- GIN индекс для поиска по JSONB структуре групп
CREATE INDEX idx_product_tag_idx_groups_gin ON product_tag_idx USING gin (tag_groups);

-- B-tree индекс по container_id не нужен: колонка уже является PRIMARY KEY

-- Для быстрого поиска по парам (group_slug, value_slug) используется
-- стандартный B-Tree индекс. Он оптимален для запросов на точное
-- соответствие и `IN (...)`, которые являются основным сценарием
-- фильтрации товаров по опциям.
----------------------------------------------------------------
-- 3. Sync triggers keeping product_option_idx up-to-date
-- ----------------------------------------------------------------
-- CREATE
-- OR REPLACE FUNCTION fn_product_option_idx_sync () RETURNS TRIGGER AS $$
-- DECLARE
--     grp_slug varchar(255);
-- BEGIN
--     -- -------------------------------------------
--     -- DELETE or UPDATE (old value)
--     -- -------------------------------------------
--     IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
--         -- Если старая запись была опцией...
--         IF OLD.is_option THEN
--             -- ...и она была удалена, или стала не-опцией, или изменился ее слаг/группа,
--             -- то необходимо удалить старую запись из индекса.
--             IF TG_OP = 'DELETE' OR
--                NOT NEW.is_option OR
--                OLD.slug <> NEW.slug OR
--                OLD.product_feature_group_id <> NEW.product_feature_group_id
--             THEN
--                 SELECT g.slug INTO grp_slug
--                 FROM product_feature_groups g
--                 WHERE g.id = OLD.product_feature_group_id;

--                 IF FOUND THEN
--                     DELETE FROM product_option_idx
--                     WHERE variant_id = OLD.variant_id
--                       AND group_slug = grp_slug
--                       AND value_slug = OLD.slug;
--                 END IF;
--             END IF;
--         END IF;
--     END IF;

--     -- -------------------------------------------
--     -- INSERT or UPDATE (new value)
--     -- -------------------------------------------
--     IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
--         -- Если новая запись является опцией, добавляем ее в индекс.
--         IF NEW.is_option THEN
--             SELECT g.slug INTO grp_slug
--             FROM product_feature_groups g
--             WHERE g.id = NEW.product_feature_group_id;

--             IF FOUND THEN
--                 INSERT INTO product_option_idx(project_id, variant_id, group_slug, value_slug)
--                 VALUES (NEW.project_id, NEW.variant_id, grp_slug, NEW.slug)
--                 ON CONFLICT (variant_id, group_slug, value_slug) DO NOTHING;
--             END IF;
--         END IF;
--     END IF;

--     IF TG_OP = 'DELETE' THEN
--         RETURN OLD;
--     ELSE
--         RETURN NEW;
--     END IF;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER trg_product_option_idx_sync
-- AFTER INSERT
-- OR
-- UPDATE
-- OR DELETE ON product_features FOR EACH ROW
-- EXECUTE FUNCTION fn_product_option_idx_sync ();

-- ----------------------------------------------------------------
-- -- 3-tags. Sync triggers keeping product_tag_idx up-to-date
-- ----------------------------------------------------------------
-- CREATE
-- OR REPLACE FUNCTION fn_product_tag_idx_sync () RETURNS TRIGGER AS $$
-- DECLARE
--     v_container_id uuid;
--     v_project_id uuid;
-- BEGIN
--     -- Определяем container_id
--     IF TG_OP = 'DELETE' THEN
--         v_container_id := OLD.product_id;
--     ELSE
--         v_container_id := NEW.product_id;
--     END IF;

--     -- Получаем project_id из контейнера
--     SELECT project_id INTO v_project_id FROM product_containers WHERE id = v_container_id;

--     -- Если контейнер не найден (может быть при каскадном удалении), выходим.
--     IF NOT FOUND THEN
--         IF TG_OP = 'DELETE' THEN
--             DELETE FROM product_tag_idx WHERE container_id = v_container_id;
--         END IF;
--         RETURN COALESCE(NEW, OLD);
--     END IF;


--     -- Пересчитываем теги для контейнера
--     WITH container_tags AS (
--         SELECT
--             array_agg(
--                 DISTINCT
--                 CASE
--                     WHEN tg.slug IS NOT NULL THEN tg.slug || ':' || t.slug
--                     ELSE t.slug
--                 END
--             ) as tags,
--             (
--                 SELECT jsonb_object_agg(group_slug, tags_arr)
--                 FROM (
--                     SELECT
--                         COALESCE(tg2.slug, '') AS group_slug,
--                         array_agg(DISTINCT t2.slug ORDER BY t2.slug) AS tags_arr
--                     FROM product_containers_tags_links pctl2
--                     JOIN tags t2 ON t2.id = pctl2.tag_id
--                     LEFT JOIN tag_groups tg2 ON t2.group_id = tg2.id
--                     WHERE pctl2.product_id = v_container_id
--                     GROUP BY COALESCE(tg2.slug, '')
--                 ) grp
--             ) as tag_groups
--         FROM product_containers_tags_links pctl
--         LEFT JOIN tags t ON t.id = pctl.tag_id
--         LEFT JOIN tag_groups tg ON t.group_id = tg.id
--         WHERE pctl.product_id = v_container_id
--     )
--     INSERT INTO product_tag_idx (project_id, container_id, tags, tag_groups)
--     SELECT v_project_id, v_container_id, COALESCE(tags, '{}'), COALESCE(tag_groups, '{}')
--     FROM container_tags
--     ON CONFLICT (container_id) DO UPDATE
--     SET tags = EXCLUDED.tags,
--         tag_groups = EXCLUDED.tag_groups;

--     -- Удаляем запись, если у контейнера не осталось тегов
--     DELETE FROM product_tag_idx
--     WHERE container_id = v_container_id AND cardinality(tags) = 0;

--     RETURN COALESCE(NEW, OLD);
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER trg_product_tag_idx_sync
-- AFTER INSERT
-- OR DELETE ON product_containers_tags_links FOR EACH ROW
-- EXECUTE FUNCTION fn_product_tag_idx_sync ();

-- -- Триггер для обновления индекса при добавлении/удалении вариантов
-- CREATE
-- OR REPLACE FUNCTION fn_product_variant_tag_sync () RETURNS TRIGGER AS $$
-- BEGIN
--     -- При удалении варианта ничего не делаем с индексом тегов,
--     -- так как он привязан к контейнеру.
--     IF TG_OP = 'DELETE' THEN
--         RETURN OLD;
--     END IF;

--     -- При добавлении варианта, если для его контейнера еще нет записи
--     -- в индексе тегов, создаем ее.
--     IF TG_OP = 'INSERT' THEN
--         INSERT INTO product_tag_idx (project_id, container_id, tags, tag_groups)
--         SELECT
--             NEW.project_id,
--             NEW.container_id,
--             COALESCE(array_agg(
--                 DISTINCT
--                 CASE
--                     WHEN tg.slug IS NOT NULL THEN tg.slug || ':' || t.slug
--                     ELSE t.slug
--                 END
--             ), '{}'),
--             COALESCE((
--                 SELECT jsonb_object_agg(group_slug, tags_arr)
--                 FROM (
--                     SELECT
--                         COALESCE(tg2.slug, '') AS group_slug,
--                         array_agg(DISTINCT t2.slug ORDER BY t2.slug) AS tags_arr
--                     FROM product_containers_tags_links pctl2
--                     JOIN tags t2 ON t2.id = pctl2.tag_id
--                     LEFT JOIN tag_groups tg2 ON t2.group_id = tg2.id
--                     WHERE pctl2.product_id = NEW.container_id
--                     GROUP BY COALESCE(tg2.slug, '')
--                 ) grp
--             ), '{}'::jsonb)
--         FROM product_containers_tags_links pctl
--         JOIN tags t ON t.id = pctl.tag_id
--         LEFT JOIN tag_groups tg ON t.group_id = tg.id
--         WHERE pctl.product_id = NEW.container_id
--         ON CONFLICT (container_id) DO NOTHING;
--         RETURN NEW;
--     END IF;

--     RETURN NULL;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER trg_product_variant_tag_sync
-- AFTER INSERT
-- OR DELETE ON product_variants FOR EACH ROW
-- EXECUTE FUNCTION fn_product_variant_tag_sync ();

----------------------------------------------------------------
-- 6. Auxillary performant indexes for price & availability filters
----------------------------------------------------------------
-- (предполагаем, что price размещён в product_variants)
-- Индекс по цене уже создаётся в products.sql

-- Финито.  Теперь запрос вида:
--   SELECT DISTINCT pv.*
--   FROM product_variants pv
--   JOIN product_variants_categories_links pvcl ON pvcl.product_id = pv.id
--   JOIN product_option_idx poi ON poi.variant_id = pv.id
--   WHERE pv.project_id = $1
--     AND pvcl.category_id = $2
--     AND pv.in_listing = true
--     AND (poi.group_slug, poi.value_slug) IN (('color','red'), ('size','m'))
--   GROUP BY pv.id
--   HAVING COUNT(DISTINCT poi.group_slug) = 2;  -- кол-во фильтров
--
-- Или с комбинацией опций и тегов:
--   SELECT DISTINCT pv.*
--   FROM product_variants pv
--   JOIN product_variants_categories_links pvcl ON pvcl.product_id = pv.id
--   JOIN product_option_idx poi ON poi.variant_id = pv.id
--   JOIN product_tag_idx pti ON pti.container_id = pv.container_id
--   WHERE pv.project_id = $1
--     AND pvcl.category_id = $2
--     AND pv.in_listing = true
--     AND (poi.group_slug, poi.value_slug) IN (('color','red'), ('size','m'))
--     -- Используем GIN оператор @> для проверки наличия всех тегов
--     AND pti.tags @> ARRAY['season:summer', 'sale']
--   GROUP BY pv.id
--   HAVING COUNT(DISTINCT poi.group_slug) = 2;  -- 2 опции
-- Исполняется за миллисекунды благодаря GIN индексам.
----------------------------------------------------------------
-- 7. Дополнительные индексы для фильтрации по категориям
----------------------------------------------------------------
-- Композитный индекс для быстрой фильтрации вариантов по категории
CREATE INDEX IF NOT EXISTS idx_product_variants_categories_variant_category ON product_variants_categories_links (category_id, product_variant_id);

-- Индекс для быстрого поиска вариантов в листинге
CREATE INDEX IF NOT EXISTS idx_product_variants_listing_status ON product_variants (project_id, in_listing)
WHERE
  in_listing = true;

-- Материализованное представление для агрегатов по категориям (опционально)
-- CREATE MATERIALIZED VIEW IF NOT EXISTS category_filter_aggregates AS
-- SELECT
--     c.id as category_id,
--     poi.group_slug,
--     poi.value_slug,
--     COUNT(DISTINCT pv.id) as variant_count,
--     MIN(pv.price) as min_price,
--     MAX(pv.price) as max_price
-- FROM categories c
-- JOIN product_variants_categories_links pvcl ON pvcl.category_id = c.id
-- JOIN product_variants pv ON pv.id = pvcl.product_id
-- JOIN product_option_idx poi ON poi.variant_id = pv.id
-- WHERE pv.in_listing = true
-- GROUP BY c.id, poi.group_slug, poi.value_slug;
-- CREATE INDEX idx_category_filter_aggregates
--     ON category_filter_aggregates (category_id, group_slug, value_slug);
----------------------------------------------------------------
-- 8. Оптимизации для схемы "всё привязано к вариантам"
----------------------------------------------------------------
-- Композитный индекс для быстрого подсчета вариантов с опциями в категории
CREATE INDEX IF NOT EXISTS idx_variants_category_options ON product_variants_categories_links (category_id) INCLUDE (product_variant_id);

-- Покрывающий индекс для фильтрации по цене и наличию добавим при появлении поля наличия (qnt)

-- Индекс для быстрого получения всех опций варианта
CREATE INDEX IF NOT EXISTS idx_product_option_variant_lookup ON product_option_idx (variant_id) INCLUDE (group_slug, value_slug);

----------------------------------------------------------------
-- 9. Дополнительные индексы для фильтрации по тегам
----------------------------------------------------------------
-- Дополнительные индексы по project_id и cardinality(tags) добавим при реальной необходимости
