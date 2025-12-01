-- =============================================================
-- Suggestions infrastructure: logging and popular queries
-- =============================================================

-- 1. Логи поисковых запросов (для сбора статистики)
-- TODO: при удалении проекта строки здесь не удаляются каскадом.
-- Добавьте FK на projects(id) с ON DELETE CASCADE или очистку через триггер.
CREATE TABLE IF NOT EXISTS search_queries_log (
    project_id   uuid NOT NULL,
    locale_code  locale NOT NULL,
    query        text        NOT NULL,
    hits         int         DEFAULT 1,
    created_at   timestamp   DEFAULT NOW(),
    last_searched timestamp  DEFAULT NOW(),
    results_count int        DEFAULT 0,
    avg_response_time_ms float,
    PRIMARY KEY (project_id, locale_code, query)
);

-- Индекс для анализа популярных запросов
CREATE INDEX IF NOT EXISTS idx_search_log_hits
    ON search_queries_log(project_id, locale_code, hits DESC);

-- Индекс для анализа медленных запросов
CREATE INDEX IF NOT EXISTS idx_search_log_response_time
    ON search_queries_log(avg_response_time_ms DESC)
    WHERE avg_response_time_ms IS NOT NULL;

-- 2. Функция upsert для инкремента счётчика с расширенной статистикой
CREATE OR REPLACE FUNCTION record_search_query(
    p_project_id  uuid,
    p_locale_code locale,
    p_query       text,
    p_results_count int DEFAULT NULL,
    p_response_time_ms float DEFAULT NULL
) RETURNS void AS $$
BEGIN
    INSERT INTO search_queries_log(
        project_id, locale_code, query, hits,
        results_count, avg_response_time_ms
    )
    VALUES (
        p_project_id, p_locale_code, p_query, 1,
        COALESCE(p_results_count, 0), p_response_time_ms
    )
    ON CONFLICT (project_id, locale_code, query)
    DO UPDATE SET
        hits = search_queries_log.hits + 1,
        last_searched = NOW(),
        results_count = COALESCE(p_results_count, search_queries_log.results_count),
        avg_response_time_ms = CASE
            WHEN search_queries_log.avg_response_time_ms IS NULL THEN p_response_time_ms
            WHEN p_response_time_ms IS NULL THEN search_queries_log.avg_response_time_ms
            ELSE (search_queries_log.avg_response_time_ms * (search_queries_log.hits - 1) + p_response_time_ms) / search_queries_log.hits
        END;
END;
$$ LANGUAGE plpgsql;

-- 3. Материализованное представление ТОП-100 популярных запросов на проект/язык
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_popular_suggestions AS
SELECT project_id, locale_code, query AS suggestion, hits
FROM (
    SELECT project_id, locale_code, query, hits,
           row_number() OVER (PARTITION BY project_id, locale_code ORDER BY hits DESC) AS rn
    FROM search_queries_log
) t WHERE rn <= 100;

-- Индекс для быстрого поиска prefix/fuzzy по popular suggestions
CREATE INDEX IF NOT EXISTS idx_mv_popular_suggestions_trgm
    ON mv_popular_suggestions USING GIN (lower(suggestion) gin_trgm_ops);

-- 4. Планировщик: REFRESH MATERIALIZED VIEW nightly (вне SQL, например cron)
--   REFRESH MATERIALIZED VIEW CONCURRENTLY mv_popular_suggestions;
