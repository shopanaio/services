-- =============================================================
-- Главный файл миграции для полнотекстового поиска
-- Выполняет все компоненты в правильном порядке
-- =============================================================
-- Финальная оптимизация - создание комбинированной функции поиска
-- =============================================================
-- Универсальная комбинированная функция поиска
-- =============================================================
CREATE
OR REPLACE FUNCTION advanced_search (
    p_project_id uuid,
    p_query text,
    p_locale_code varchar(16) DEFAULT NULL,
    p_options jsonb DEFAULT '{}'::jsonb,
    p_source_type varchar(16) DEFAULT NULL
) RETURNS TABLE (
    source_type varchar(16),
    source_id uuid,
    relevance_score float,
    matched_field varchar(32),
    matched_value text,
    match_details jsonb
) AS $$
DECLARE
    -- Параметры из p_options
    v_similarity_threshold float := COALESCE((p_options->>'similarity_threshold')::float, 0.3);
    v_limit               int   := COALESCE((p_options->>'limit')::int, 20);

    -- Расширенный TS-запрос
    v_expanded_query tsquery;
    -- Запрос, расширенный синонимами
    v_query_with_synonyms text;
    -- (stop words не используются)

    -- Для логирования
    v_start_time    timestamp;
    v_results_count int;
BEGIN
    v_start_time := clock_timestamp();

    --------------------------------------------------------------------------
    -- 0. Убираем кастомные стоп-слова проекта (если заданы)
    --------------------------------------------------------------------------
    --   0.1 Очищаем строку от стоп-слов
    --   0.2 Если после очистки строка пустая, используем исходную строку
    v_query_with_synonyms := expand_query_with_synonyms(
        p_project_id,
        p_locale_code,
        p_query
    );

    --------------------------------------------------------------------------
    -- 1. Формируем расширенный TS-запрос из исходной строки
    --------------------------------------------------------------------------
    --   1.1 Превращаем расширенную строку в tsquery
    v_expanded_query := websearch_to_tsquery(
        get_ts_config(p_locale_code),   -- выбираем конфигурацию по локали
        v_query_with_synonyms           -- исходная строка + синонимы
    );

    --------------------------------------------------------------------------
    -- 2-4. Полнотекстовый + Fuzzy-/Prefix-поиск, объединение и сортировка
    --------------------------------------------------------------------------
    RETURN QUERY
    WITH
    /* --- Объединяем сырые результаты из обоих источников --- */
    all_results AS (
        -- Полнотекстовый поиск
        SELECT
            ti.source_type,
            ti.source_id,
            ts_rank_cd(ti.search_vector, v_expanded_query) AS relevance_score,
            ti.field_name                                 AS matched_field,
            ti.field_value                                AS matched_value,
            jsonb_build_object('search_method', 'fulltext') AS match_details
        FROM translations_index ti
        WHERE ti.project_id = p_project_id
          AND (p_locale_code IS NULL OR ti.locale_code = p_locale_code)
          AND ti.search_vector @@ v_expanded_query

        UNION ALL

        -- Fuzzy-поиск
        SELECT
            f.source_type,
            f.source_id,
            f.relevance_score,
            f.matched_field,
            f.matched_value,
            jsonb_build_object('search_method', 'fuzzy') AS match_details
        FROM fuzzy_search_records(
            p_project_id,
            p_query,             -- исходная строка запроса
            p_locale_code,
            v_similarity_threshold,
            v_limit
        ) f
    ),

    /* --- Ранжируем результаты, чтобы выбрать лучший для каждого source_id --- */
    ranked_results AS (
        SELECT
            ar.*,
            ROW_NUMBER() OVER(PARTITION BY ar.source_id ORDER BY ar.relevance_score DESC) as rn
        FROM all_results ar
    )

    /* --- Выбираем уникальные записи с наивысшим рангом --- */
    SELECT
        rr.source_type,
        rr.source_id,
        rr.relevance_score,
        rr.matched_field,
        rr.matched_value,
        rr.match_details
    FROM ranked_results rr
    WHERE rr.rn = 1
      AND (p_source_type IS NULL OR rr.source_type = p_source_type)
    ORDER BY rr.relevance_score DESC
    LIMIT v_limit;

    --------------------------------------------------------------------------
    -- 5. Логирование запроса
    --------------------------------------------------------------------------
    GET DIAGNOSTICS v_results_count = ROW_COUNT;

    PERFORM record_search_query(
        p_project_id,
        p_locale_code,
        p_query,
        v_results_count,
        EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)
    );
END;
$$ LANGUAGE plpgsql;

-- Создание индексов для оптимизации advanced_search
CREATE INDEX IF NOT EXISTS idx_translations_combined ON translations_index (project_id, source_type, source_id);

-- 12. Гранты (настройте под свои требования)
-- GRANT EXECUTE ON FUNCTION advanced_search TO app_user;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_user;
-- 13. Инициализация данных
-- Загрузка стоп-слов по умолчанию для всех проектов
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN SELECT DISTINCT id FROM projects
    LOOP
        PERFORM load_default_stop_words(r.id);
    END LOOP;
END $$;

-- 14. Фиксация search_path для всех созданных в этой схеме функций
--     После выполнения миграции каждая функция будет жёстко обращаться
--     к объектам именно текущей схемы, независимо от search_path сессии.
DO $$
DECLARE
    v_schema text := current_schema();
    r record;
BEGIN
    -- Проходим по всем функциям, принадлежащим текущей схеме, исключая функции, являющиеся частью расширений.
    FOR r IN
        SELECT p.oid::regprocedure AS sig
        FROM   pg_proc p
        WHERE  p.pronamespace = v_schema::regnamespace
          AND NOT EXISTS (
                SELECT 1
                FROM   pg_depend
                WHERE  classid = 'pg_proc'::regclass
                  AND  objid = p.oid
                  AND  deptype = 'e'
            )
    LOOP
        EXECUTE format(
            'ALTER FUNCTION %s SET search_path = %I, pg_catalog;',
            r.sig, v_schema
        );
    END LOOP;
END$$;
