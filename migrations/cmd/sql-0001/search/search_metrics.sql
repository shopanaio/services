-- =============================================================
-- Метрики и мониторинг для поисковой системы
-- =============================================================

-- 1. Представление для анализа производительности поиска
CREATE OR REPLACE VIEW v_search_performance_metrics AS
SELECT
    project_id,
    locale_code,
    date_trunc('hour', last_searched) AS hour,
    COUNT(*) AS queries_count,
    AVG(avg_response_time_ms) AS avg_response_time,
    MAX(avg_response_time_ms) AS max_response_time,
    MIN(avg_response_time_ms) AS min_response_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY avg_response_time_ms) AS p95_response_time,
    SUM(hits) AS total_searches,
    AVG(results_count) AS avg_results_count,
    COUNT(*) FILTER (WHERE results_count = 0) AS zero_results_count
FROM search_queries_log
WHERE last_searched >= NOW() - INTERVAL '7 days'
GROUP BY project_id, locale_code, date_trunc('hour', last_searched);

-- 2. Представление для анализа популярных запросов без результатов
CREATE OR REPLACE VIEW v_zero_results_queries AS
SELECT
    project_id,
    locale_code,
    query,
    hits,
    last_searched
FROM search_queries_log
WHERE results_count = 0
    AND hits >= 3  -- показываем только часто искомые
ORDER BY hits DESC, last_searched DESC;

-- 3. Представление для анализа медленных запросов
CREATE OR REPLACE VIEW v_slow_queries AS
SELECT
    project_id,
    locale_code,
    query,
    avg_response_time_ms,
    hits,
    last_searched
FROM search_queries_log
WHERE avg_response_time_ms > 100  -- запросы медленнее 100мс
ORDER BY avg_response_time_ms DESC;

-- 4. Функция для получения статистики использования индексов
CREATE OR REPLACE FUNCTION get_search_index_stats()
RETURNS TABLE (
    index_name text,
    table_name text,
    index_size text,
    index_scans bigint,
    index_tup_read bigint,
    index_tup_fetch bigint,
    last_used timestamp
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.indexrelname::text AS index_name,
        i.relname::text AS table_name,
        pg_size_pretty(pg_relation_size(i.indexrelid)) AS index_size,
        i.idx_scan AS index_scans,
        i.idx_tup_read AS index_tup_read,
        i.idx_tup_fetch AS index_tup_fetch,
        (SELECT MAX(last_idx_scan) FROM pg_stat_user_indexes WHERE indexrelid = i.indexrelid) AS last_used
    FROM pg_stat_user_indexes i
    WHERE i.schemaname = current_schema()
        AND i.indexrelname LIKE '%search%'
    ORDER BY i.idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- 5. Функция для анализа качества поиска
CREATE OR REPLACE FUNCTION analyze_search_quality(
    p_project_id uuid,
    p_locale_code varchar(16) DEFAULT NULL,
    p_date_from timestamp DEFAULT NOW() - INTERVAL '30 days',
    p_date_to timestamp DEFAULT NOW()
)
RETURNS TABLE (
    metric_name text,
    metric_value numeric,
    metric_description text
) AS $$
BEGIN
    RETURN QUERY
    -- Общее количество поисков
    SELECT
        'total_searches'::text,
        SUM(hits)::numeric,
        'Общее количество поисковых запросов'::text
    FROM search_queries_log
    WHERE project_id = p_project_id
        AND (p_locale_code IS NULL OR locale_code = p_locale_code)
        AND last_searched BETWEEN p_date_from AND p_date_to

    UNION ALL

    -- Уникальные запросы
    SELECT
        'unique_queries'::text,
        COUNT(*)::numeric,
        'Количество уникальных поисковых запросов'::text
    FROM search_queries_log
    WHERE project_id = p_project_id
        AND (p_locale_code IS NULL OR locale_code = p_locale_code)
        AND last_searched BETWEEN p_date_from AND p_date_to

    UNION ALL

    -- Процент запросов без результатов
    SELECT
        'zero_results_percentage'::text,
        ROUND((COUNT(*) FILTER (WHERE results_count = 0) * 100.0 / NULLIF(COUNT(*), 0)), 2)::numeric,
        'Процент запросов без результатов'::text
    FROM search_queries_log
    WHERE project_id = p_project_id
        AND (p_locale_code IS NULL OR locale_code = p_locale_code)
        AND last_searched BETWEEN p_date_from AND p_date_to

    UNION ALL

    -- Средняя скорость ответа
    SELECT
        'avg_response_time_ms'::text,
        ROUND(AVG(avg_response_time_ms)::numeric, 2),
        'Среднее время ответа (мс)'::text
    FROM search_queries_log
    WHERE project_id = p_project_id
        AND (p_locale_code IS NULL OR locale_code = p_locale_code)
        AND last_searched BETWEEN p_date_from AND p_date_to
        AND avg_response_time_ms IS NOT NULL

    UNION ALL

    -- 95-й перцентиль времени ответа
    SELECT
        'p95_response_time_ms'::text,
        ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY avg_response_time_ms)::numeric, 2),
        '95-й перцентиль времени ответа (мс)'::text
    FROM search_queries_log
    WHERE project_id = p_project_id
        AND (p_locale_code IS NULL OR locale_code = p_locale_code)
        AND last_searched BETWEEN p_date_from AND p_date_to
        AND avg_response_time_ms IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- 6. Функция для получения рекомендаций по оптимизации
CREATE OR REPLACE FUNCTION get_search_optimization_hints(
    p_project_id uuid
)
RETURNS TABLE (
    hint_type text,
    hint_message text,
    severity text
) AS $$
BEGIN
    RETURN QUERY
    -- Проверка наличия большого количества запросов без результатов
    SELECT
        'zero_results'::text,
        'Обнаружено ' || COUNT(*) || ' популярных запросов без результатов. Рассмотрите добавление синонимов или контента.',
        'warning'::text
    FROM v_zero_results_queries
    WHERE project_id = p_project_id
        AND hits >= 10
    HAVING COUNT(*) > 5

    UNION ALL

    -- Проверка медленных запросов
    SELECT
        'slow_queries'::text,
        'Обнаружено ' || COUNT(*) || ' медленных запросов (>200мс). Проверьте использование индексов.',
        'critical'::text
    FROM v_slow_queries
    WHERE project_id = p_project_id
        AND avg_response_time_ms > 200
    HAVING COUNT(*) > 0

    UNION ALL

    -- Проверка устаревших индексов
    SELECT
        'unused_indexes'::text,
        'Индекс ' || index_name || ' не использовался более 30 дней. Рассмотрите его удаление.',
        'info'::text
    FROM get_search_index_stats()
    WHERE index_scans = 0
        OR last_used < NOW() - INTERVAL '30 days'

    UNION ALL

    -- Проверка размера таблицы логов
    SELECT
        'log_table_size'::text,
        'Таблица search_queries_log превышает 1GB. Рассмотрите архивацию старых записей.',
        'warning'::text
    WHERE pg_relation_size('search_queries_log') > 1073741824;  -- 1GB
END;
$$ LANGUAGE plpgsql;

-- 7. Процедура для очистки старых логов
CREATE OR REPLACE FUNCTION cleanup_old_search_logs(
    p_days_to_keep int DEFAULT 90
) RETURNS void AS $$
BEGIN
    DELETE FROM search_queries_log
    WHERE last_searched < NOW() - (p_days_to_keep || ' days')::interval
        AND hits < 5;  -- сохраняем популярные запросы дольше

    -- Обновляем материализованное представление после очистки
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_popular_suggestions;
END;
$$ LANGUAGE plpgsql;
