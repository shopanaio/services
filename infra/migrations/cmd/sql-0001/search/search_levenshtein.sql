-- =============================================================
-- Поддержка поиска с опечатками (расстояние Левенштейна)
-- =============================================================

-- 0. Расширение для работы с fuzzy string matching
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

-- 1. Функция нормализованного расстояния Левенштейна (0-1)
CREATE OR REPLACE FUNCTION normalized_levenshtein(
    str1 text,
    str2 text
)
RETURNS float AS $$
DECLARE
    max_len int;
    distance int;
BEGIN
    max_len := GREATEST(length(str1), length(str2));

    IF max_len = 0 THEN
        RETURN 1.0;
    END IF;

    distance := levenshtein(lower(str1), lower(str2));

    -- Нормализуем расстояние к диапазону 0-1 (0 = идентичны, 1 = полностью разные)
    RETURN 1.0 - (distance::float / max_len::float);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Функция поиска с учетом опечаток
CREATE OR REPLACE FUNCTION fuzzy_search_with_typos(
    p_project_id uuid,
    p_query text,
    p_locale_code varchar(16) DEFAULT NULL,
    p_typo_threshold float DEFAULT 0.7, -- минимальное сходство (0.7 = до 30% опечаток)
    p_limit int DEFAULT 20
)
RETURNS TABLE (
    source_type varchar(16),
    source_id uuid,
    relevance_score float,
    matched_field varchar(32),
    matched_value text,
    typo_distance int
) AS $$
DECLARE
    -- [!] ПРЕДУПРЕЖДЕНИЕ О ПРОИЗВОДИТЕЛЬНОСТИ:
    -- Эта функция использует levenshtein(), которая является ресурсоемкой и не
    -- может использовать индексы GIN/GiST для ускорения.
    -- Она должна использоваться с осторожностью, предпочтительно как
    -- фоллбэк-механизм, когда поиск по триграммам (similarity) не дал
    -- результатов. Использование на больших таблицах без предварительной
    -- фильтрации может вызвать значительное замедление.
    -- Оптимизация по длине строки (length BETWEEN ...) частично смягчает
    -- проблему, но не решает ее полностью.

    v_query_words text[];
    v_word text;
BEGIN
    -- Разбиваем запрос на слова для поиска по частям
    v_query_words := string_to_array(lower(trim(p_query)), ' ');

    RETURN QUERY
    WITH typo_matches AS (
        -- Поиск по заголовкам с учетом опечаток
        SELECT
            ti.source_type,
            ti.source_id,
            ti.field_name AS matched_field,
            ti.field_value AS matched_value,
            -- Вычисляем общую релевантность как среднее по всем словам
            (SELECT AVG(
                GREATEST(
                    normalized_levenshtein(word, ti.field_value),
                    -- Также проверяем подстроки для частичных совпадений
                    CASE
                        WHEN position(word IN lower(ti.field_value)) > 0 THEN 0.9
                        ELSE 0
                    END
                )
            ) FROM unnest(v_query_words) AS word) AS relevance_score,
            -- Минимальное расстояние Левенштейна среди всех слов
            (SELECT MIN(levenshtein(word, lower(ti.field_value)))
             FROM unnest(v_query_words) AS word) AS typo_distance
        FROM translations_index ti
        WHERE ti.project_id = p_project_id
          AND (p_locale_code IS NULL OR ti.locale_code = p_locale_code)
          AND ti.field_name = 'TITLE'
          -- Быстрая фильтрация по префиксу/триграмму, чтобы задействовать GIN(trgm)
          AND lower(ti.field_value) % lower(p_query)  -- задействует idx_title_prefix_trgm
          -- Дополнительная фильтрация по длине для отсечения заведомо неподходящих
          AND length(ti.field_value) BETWEEN length(p_query) - 3 AND length(p_query) + 3

        UNION ALL

        -- Поиск по ключевым словам с учетом опечаток
        SELECT
            'PROD_VARIANT' AS source_type,
            pcskgl.product_id AS source_id,
            'keyword' AS matched_field,
            sk.keyword AS matched_value,
            normalized_levenshtein(p_query, sk.keyword) AS relevance_score,
            levenshtein(lower(p_query), lower(sk.keyword)) AS typo_distance
        FROM search_keywords sk
        JOIN product_containers_search_keyword_groups_links pcskgl
            ON pcskgl.keyword_group_id = sk.group_id
        WHERE sk.project_id = p_project_id
          AND (p_locale_code IS NULL OR sk.locale_code = p_locale_code)
          -- Быстрая триграм-фильтрация по индексу idx_keywords_prefix_trgm
          AND lower(sk.keyword) % lower(p_query)
          -- Предварительная фильтрация по длине
          AND length(sk.keyword) BETWEEN length(p_query) - 3 AND length(p_query) + 3
    )
    SELECT
        source_type,
        source_id,
        MAX(relevance_score) AS relevance_score,
        (array_agg(matched_field ORDER BY relevance_score DESC))[1]::varchar(32) AS matched_field,
        (array_agg(matched_value ORDER BY relevance_score DESC))[1]::text AS matched_value,
        MIN(typo_distance) AS typo_distance
    FROM typo_matches
    WHERE relevance_score >= p_typo_threshold
    GROUP BY source_type, source_id
    ORDER BY relevance_score DESC, typo_distance
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 3. Комбинированная функция поиска с опечатками для подсказок
CREATE OR REPLACE FUNCTION fuzzy_suggestions_with_typos(
    p_project_id uuid,
    p_query text,
    p_locale_code varchar(16) DEFAULT NULL,
    p_typo_threshold float DEFAULT 0.7
)
RETURNS TABLE (
    suggestion text,
    similarity_score float,
    suggestion_type varchar(20),
    typo_distance int
) AS $$
BEGIN
    RETURN QUERY
    -- Точные префиксные совпадения (без опечаток)
    SELECT DISTINCT
        ti.field_value AS suggestion,
        1.0 AS similarity_score,
        'exact_prefix' AS suggestion_type,
        0 AS typo_distance
    FROM translations_index ti
    WHERE ti.project_id = p_project_id
      AND (p_locale_code IS NULL OR ti.locale_code = p_locale_code)
      AND ti.field_name = 'TITLE'
      AND unaccent(lower(ti.field_value)) ILIKE unaccent(lower(p_query)) || '%'

    UNION ALL

    -- Совпадения с опечатками
    SELECT DISTINCT
        ti.field_value AS suggestion,
        normalized_levenshtein(p_query, ti.field_value) AS similarity_score,
        'typo_match' AS suggestion_type,
        levenshtein(lower(p_query), lower(ti.field_value)) AS typo_distance
    FROM translations_index ti
    WHERE ti.project_id = p_project_id
      AND (p_locale_code IS NULL OR ti.locale_code = p_locale_code)
      AND ti.field_name = 'TITLE'
      AND length(ti.field_value) BETWEEN length(p_query) - 2 AND length(p_query) + 2
      AND normalized_levenshtein(p_query, ti.field_value) >= p_typo_threshold

    ORDER BY typo_distance, similarity_score DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- 4. Индекс для оптимизации поиска по длине строки
CREATE INDEX IF NOT EXISTS idx_translations_field_value_length
    ON translations_index (length(field_value))
    WHERE field_name = 'TITLE';
