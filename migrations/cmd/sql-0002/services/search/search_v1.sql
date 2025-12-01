-- ============================================
-- search_v1.sql — Расширенный поиск (multilang, fuzzy, prefix)
-- ============================================
-- ---------------------------------------------------------------------------
-- 0. Расширения
-- ---------------------------------------------------------------------------
-- Расширение pg_trgm включает функции similarity(), % оператор и GIN-индекс
-- gin_trgm_ops, необходимые для трёхграммного fuzzy/prefix-поиска.
-- unaccent убирает диакритические знаки, позволяя искать "café" по запросу
-- "cafe" и минимизируя различия в алфавитах.
-- 0. Расширения --------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE EXTENSION IF NOT EXISTS unaccent;

-- 0.1 Обёртка immutable для unaccent, чтобы её можно было использовать
--     в выражении GENERATED STORED (требует IMMUTABLE функций).
CREATE
OR REPLACE FUNCTION immutable_unaccent (text) RETURNS text AS $$
    SELECT unaccent('unaccent', $1);
$$ LANGUAGE SQL IMMUTABLE STRICT;

-- 1. Генерируемый tsvector в translations_index ------------------------------
-- Колонка `search_vector` собирает индексируемый текст из поля `field_value`.
--  • Выбор конфигурации зависит от locale_code, чтобы стемминг и стоп-слова
--    работали корректно для RU/DE/FR/EN.  Для неизвестных — fallback 'simple'.
--  • setweight() расставляет веса: A > B > C, т.е. title важнее description.
--  • GENERATED ALWAYS STORED гарантирует, что значение пересчитается
--    автоматически при INSERT/UPDATE без триггеров.
-- search_vector колонка уже создаётся и поддерживается триггером в
-- search_lang_config.sql, поэтому добавление GENERATED-колонки здесь
-- убрано, чтобы избежать конфликтов и требований к IMMUTABLE выражению.
-- 2. Индексы -----------------------------------------------------------------
-- Полнотекстовый индекс с весами
-- Полнотекстовый GIN-индекс по search_vector.  Используется оператор @@ и
-- функция ts_rank_cd() для быстрых полнотекстовых запросов с ранжированием.
CREATE INDEX IF NOT EXISTS idx_translations_search_vector ON translations_index USING GIN (search_vector);

-- Индекс на keywords уже создаётся как GIN(lower(keyword)) в searchKeyword.sql

-- Трёхграммный индекс для заголовков (title)
-- Специализированный трёхграммный индекс только для записей field_name='title'.
-- Позволяет моментально отдавать подсказки при вводе первых символов заголовка.
CREATE INDEX IF NOT EXISTS idx_title_prefix_trgm ON translations_index USING GIN (lower(field_value) gin_trgm_ops)
WHERE
    field_name = 'TITLE';

-- Дополнительные индексы для оптимизации производительности
-- Составной индекс для быстрой фильтрации по проекту и локали
CREATE INDEX IF NOT EXISTS idx_translations_project_locale ON translations_index (project_id, locale_code);

-- Индекс для быстрого поиска по source_id (для DISTINCT ON оптимизации)
CREATE INDEX IF NOT EXISTS idx_translations_source_id ON translations_index (source_id);

-- 3. Функции -----------------------------------------------------------------
-- ===========================================================================
-- 3.A  Универсальный поиск по translations_index
--      Возвращает кортежи (source_type, source_id) + meta, без привязки к
--      продукту. Приложение само сделает JOIN к нужной сущности.
-- ===========================================================================
DROP FUNCTION IF EXISTS fuzzy_search_records (uuid, text, varchar, float, int);

CREATE
OR REPLACE FUNCTION fuzzy_search_records (
    p_project_id uuid,
    p_query text,
    p_locale_code locale DEFAULT NULL,
    p_similarity_threshold float DEFAULT 0.3,
    p_limit int DEFAULT 20
) RETURNS TABLE (
    source_type varchar(16),
    source_id uuid,
    relevance_score float,
    matched_field varchar(32),
    matched_value text
) AS $$
DECLARE
    -- Очистка запроса: trim + lower, чтобы поиск был регистро-независим
    v_q   text  := trim(lower(p_query));
    -- Длина очищённого запроса – нужна для адаптивного порога similarity
    v_len int   := char_length(v_q);
    -- Итоговый порог similarity, рассчитывается динамически
    v_thr float;
BEGIN
    -- 1. Выбор порога similarity (v_thr) по длине запроса.
    --    Чем короче строка, тем слабее порог (допускаем меньше триграмм).
    --    set_limit НЕ используется – всё локально в WHERE.
    IF v_len = 1 THEN
        v_thr := 0.2;
    ELSIF v_len = 2 THEN
        v_thr := 0.1;
    ELSIF v_len = 3 THEN
        v_thr := 0.12;
    ELSE
        v_thr := p_similarity_threshold;
    END IF;

    RETURN QUERY
    -- 2. Предварительная фильтрация (CTE base): сразу ограничиваем выборку
    --    проектом и локалью, чтобы минимизировать объём работы GIN-индекса.
    WITH base AS (
        SELECT *
        FROM translations_index ti
        WHERE ti.project_id = p_project_id
          AND (p_locale_code IS NULL OR ti.locale_code = p_locale_code)
    ),
    -- 3. Fuzzy-поиск: similarity() > v_thr.
    fuzzy AS (
        SELECT
            b.source_type,
            b.source_id,
            similarity(lower(b.field_value), v_q) AS score,
            b.field_name                          AS matched_field,
            b.field_value                         AS matched_value
        FROM base b
        WHERE v_len > 2  -- избегаем дорогого fuzzy для 1–2 символов
          AND similarity(lower(b.field_value), v_q) > v_thr
    ),
    -- 4. Prefix-поиск по TITLE через ILIKE '%'. Даём максимальный score = 1.0.
    prefix AS (
        SELECT
            b.source_type,
            b.source_id,
            1.0::float                      AS score,
            'TITLE'::varchar(32)            AS matched_field,
            b.field_value                   AS matched_value
        FROM base b
        WHERE b.field_name = 'TITLE'
          AND immutable_unaccent(lower(b.field_value)) ILIKE (immutable_unaccent(v_q) || '%')
    ),
    -- [NEW] 5. Базовый набор ключевых слов, привязанных к продуктам ----------
    kw_base AS (
        SELECT
            'PROD_VARIANT'::varchar(16)      AS source_type,
            pv.id                            AS source_id,  -- default variant ID
            sk.keyword                       AS field_value
        FROM search_keywords sk
        JOIN product_containers_search_keyword_groups_links l
            ON l.keyword_group_id = sk.group_id
        JOIN product_variants pv
            ON pv.container_id = l.product_id
           AND pv.sort_index = 0                 -- «дефолтный» вариант
           -- Нужно добавить в варинт поле is_searchable чтобы возвращать только то что нужно
        WHERE sk.project_id = p_project_id
          AND l.project_id = p_project_id
          AND (p_locale_code IS NULL OR sk.locale_code = p_locale_code)
    ),
    -- 6. Fuzzy-поиск по ключевым словам (similarity)
    kw_fuzzy AS (
        SELECT
            kb.source_type,
            kb.source_id,
            similarity(lower(kb.field_value), v_q) AS score,
            'keyword'::varchar(32)                AS matched_field,
            kb.field_value                         AS matched_value
        FROM kw_base kb
        WHERE v_len > 2
          AND similarity(lower(kb.field_value), v_q) > v_thr
    ),
    -- 7. Prefix-поиск по ключевым словам
    kw_prefix AS (
        SELECT
            kb.source_type,
            kb.source_id,
            1.0::float                            AS score,
            'keyword'::varchar(32)                AS matched_field,
            kb.field_value                         AS matched_value
        FROM kw_base kb
        WHERE immutable_unaccent(lower(kb.field_value)) ILIKE (immutable_unaccent(v_q) || '%')
    ),
    -- 8. Объединяем все источники без удаления дубликатов
    combined AS (
        SELECT * FROM fuzzy
        UNION ALL SELECT * FROM prefix
        UNION ALL SELECT * FROM kw_fuzzy
        UNION ALL SELECT * FROM kw_prefix
    )
    -- 9. Агрегация по (source_type, source_id):
    --    • MAX(score) – итоговая релевантность
    --    • ARRAY_AGG(...) – берём поле/значение топ-совпадения
    SELECT
        c.source_type,
        c.source_id,
        MAX(c.score)                                               AS relevance_score,
        (ARRAY_AGG(c.matched_field ORDER BY c.score DESC))[1]      AS matched_field,
        (ARRAY_AGG(c.matched_value ORDER BY c.score DESC))[1]      AS matched_value
    FROM combined c
    GROUP BY c.source_type, c.source_id
    ORDER BY relevance_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ===========================================================================
-- 3.B  Универсальные подсказки (suggestions) без привязки к entity
-- ===========================================================================
CREATE
OR REPLACE FUNCTION fuzzy_suggestions_records (
    p_project_id uuid,
    p_query text,
    p_locale_code locale DEFAULT NULL,
    p_similarity_threshold float DEFAULT 0.3
) RETURNS TABLE (
    suggestion text,
    similarity_score float,
    suggestion_type varchar(20)
) AS $$
DECLARE
    -- Очистка запроса: trim + lower, чтобы поиск был регистро-независим
    v_q text := trim(lower(p_query));
    -- Длина очищённого запроса
    v_len int := char_length(v_q);
    -- аналогично: можем понизить порог для коротких строк
    v_similarity float := p_similarity_threshold;
BEGIN
    IF v_len <= 3 THEN
        v_similarity := 0.1;
    END IF;

    RETURN QUERY
    -- 1) Prefix-совпадения по заголовку (начинается с query)
    SELECT DISTINCT
        ti.field_value                    AS suggestion,
        1.0                               AS similarity_score,
        'title_prefix'                    AS suggestion_type
    FROM translations_index ti
    WHERE ti.project_id = p_project_id
      AND (p_locale_code IS NULL OR ti.locale_code = p_locale_code)
      AND ti.field_name = 'TITLE'
      AND (
          -- Для коротких запросов (1–2 символа) используем точный префикс через left()
          (v_len <= 2 AND left(immutable_unaccent(lower(ti.field_value)), v_len) = immutable_unaccent(v_q))
          -- Для более длинных запросов используем ILIKE
          OR (v_len > 2 AND immutable_unaccent(lower(ti.field_value)) ILIKE immutable_unaccent(v_q) || '%')
      )

    UNION ALL

    -- 2) Fuzzy-совпадения по заголовку/описанию (similarity)
    SELECT DISTINCT
        ti.field_value                    AS suggestion,
        similarity(lower(ti.field_value), v_q) AS similarity_score,
        'translation'                     AS suggestion_type
    FROM translations_index ti
    WHERE ti.project_id = p_project_id
      AND (p_locale_code IS NULL OR ti.locale_code = p_locale_code)
      AND similarity(lower(ti.field_value), v_q) > v_similarity
      AND lower(ti.field_value) <> v_q

    UNION ALL

    -- 3) Prefix-match по ключевым словам
    SELECT DISTINCT
        sk.keyword                       AS suggestion,
        1.0                              AS similarity_score,
        'keyword_prefix'                 AS suggestion_type
    FROM search_keywords sk
    WHERE sk.project_id = p_project_id
      AND (p_locale_code IS NULL OR sk.locale_code = p_locale_code)
      AND immutable_unaccent(lower(sk.keyword)) ILIKE immutable_unaccent(v_q) || '%'

    UNION ALL

    -- 4) Fuzzy-совпадения по ключевым словам
    SELECT DISTINCT
        sk.keyword                       AS suggestion,
        similarity(lower(sk.keyword), v_q)  AS similarity_score,
        'keyword'                        AS suggestion_type
    FROM search_keywords sk
    WHERE sk.project_id = p_project_id
      AND (p_locale_code IS NULL OR sk.locale_code = p_locale_code)
      AND similarity(lower(sk.keyword), v_q) > v_similarity
      AND lower(sk.keyword) <> v_q

    UNION ALL

    -- 5) Popular suggestions based on historical queries
    SELECT DISTINCT
        ps.suggestion                  AS suggestion,
        0.9                            AS similarity_score,  -- вес популярного
        'popular'                      AS suggestion_type
    FROM mv_popular_suggestions ps
    WHERE ps.project_id = p_project_id
      AND (p_locale_code IS NULL OR ps.locale_code = p_locale_code)
      AND immutable_unaccent(lower(ps.suggestion)) ILIKE immutable_unaccent(v_q) || '%'

    ORDER BY similarity_score DESC, suggestion
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;
