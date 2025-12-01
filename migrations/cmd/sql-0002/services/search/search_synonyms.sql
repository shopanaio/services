-- =============================================================
-- Поддержка синонимов для улучшения поиска
-- =============================================================

-- 1. Таблица синонимов
CREATE TABLE IF NOT EXISTS search_synonyms (
    project_id uuid NOT NULL,
    locale_code locale NOT NULL,
    term varchar(255) NOT NULL,
    synonym varchar(255) NOT NULL,
    weight float DEFAULT 0.8, -- вес синонима относительно основного термина
    PRIMARY KEY (project_id, locale_code, term, synonym),
    FOREIGN KEY (project_id, locale_code)
        REFERENCES locales (project_id, code) ON DELETE CASCADE
);

-- 2. Индексы для быстрого поиска синонимов
CREATE INDEX IF NOT EXISTS idx_synonyms_term_trgm
    ON search_synonyms USING GIN (lower(term) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_synonyms_synonym_trgm
    ON search_synonyms USING GIN (lower(synonym) gin_trgm_ops);

-- 3. Функция для получения всех синонимов термина
CREATE OR REPLACE FUNCTION get_term_synonyms(
    p_project_id uuid,
    p_locale_code locale,
    p_term text
)
RETURNS TABLE (synonym text, weight float) AS $$
BEGIN
    RETURN QUERY
    -- Прямые синонимы (term -> synonym)
    SELECT s.synonym::text, s.weight
    FROM search_synonyms s
    WHERE s.project_id = p_project_id
      AND s.locale_code = p_locale_code
      AND lower(s.term) = lower(p_term)

    UNION

    -- Обратные синонимы (synonym -> term)
    SELECT s.term::text AS synonym, s.weight
    FROM search_synonyms s
    WHERE s.project_id = p_project_id
      AND s.locale_code = p_locale_code
      AND lower(s.synonym) = lower(p_term)

    UNION

    -- Сам термин с весом 1.0
    SELECT p_term AS synonym, 1.0 AS weight;
END;
$$ LANGUAGE plpgsql;

-- 4. Функция расширения запроса с учетом синонимов
CREATE OR REPLACE FUNCTION expand_query_with_synonyms(
    p_project_id uuid,
    p_locale_code locale,
    p_query text
)
RETURNS text AS $$
DECLARE
    v_expanded_query text;
    v_term record;
    v_synonym record;
    v_syn_count int := 0;     -- счетчик добавленных синонимов
    c_max_syn   int := 200;  -- жёсткий предел
BEGIN
    v_expanded_query := '';

    -- Разбиваем запрос на слова и для каждого находим синонимы
    FOR v_term IN
        SELECT unnest(string_to_array(p_query, ' ')) AS word
    LOOP
        -- Добавляем все синонимы через OR
        v_expanded_query := v_expanded_query || '(' || v_term.word;

        FOR v_synonym IN
            SELECT synonym FROM get_term_synonyms(p_project_id, p_locale_code, v_term.word)
            WHERE synonym != v_term.word
        LOOP
            v_expanded_query := v_expanded_query || ' OR ' || v_synonym.synonym;
            v_syn_count := v_syn_count + 1;
            IF v_syn_count >= c_max_syn THEN
                EXIT; -- выходим из внутреннего цикла, лимит достигнут
            END IF;
        END LOOP;

        v_expanded_query := v_expanded_query || ') ';

        -- если лимит достигнут – прекращаем добавлять оставшиеся слова
        IF v_syn_count >= c_max_syn THEN
            EXIT; -- завершаем внешний цикл
        END IF;
    END LOOP;

    RETURN trim(v_expanded_query);
END;
$$ LANGUAGE plpgsql;

-- 5. Примеры использования синонимов
-- INSERT INTO search_synonyms (project_id, locale_code, term, synonym, weight) VALUES
-- (project_id, 'ru', 'телефон', 'смартфон', 0.9),
-- (project_id, 'ru', 'ноутбук', 'лэптоп', 0.9),
-- (project_id, 'en', 'phone', 'smartphone', 0.9),
-- (project_id, 'en', 'laptop', 'notebook', 0.9);
