-- =============================================================
-- Поддержка стоп-слов на уровне проекта
-- =============================================================

-- 1. Таблица стоп-слов
CREATE TABLE IF NOT EXISTS project_stop_words (
    project_id uuid NOT NULL,
    locale_code locale NOT NULL,
    word varchar(64) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp DEFAULT NOW(),
    PRIMARY KEY (project_id, locale_code, word),
    FOREIGN KEY (project_id, locale_code)
        REFERENCES locales (project_id, code) ON DELETE CASCADE
);

-- 2. Индексы для быстрой фильтрации
CREATE INDEX IF NOT EXISTS idx_stop_words_active
    ON project_stop_words(project_id, locale_code, is_active)
    WHERE is_active = true;

-- 3. Функция для очистки запроса от стоп-слов
CREATE OR REPLACE FUNCTION remove_stop_words(
    p_project_id uuid,
    p_locale_code locale,
    p_query text
)
RETURNS text AS $$
DECLARE
    v_clean_query text;
BEGIN
    -- Выполняем всю операцию одним запросом для максимальной производительности.
    -- Используем LEFT JOIN для поиска и исключения стоп-слов.
    -- Это намного эффективнее, чем проверка каждого слова в цикле.
    SELECT string_agg(q.word, ' ')
    INTO v_clean_query
    FROM unnest(string_to_array(lower(trim(p_query)), ' ')) AS q(word)
    LEFT JOIN project_stop_words psw
        ON psw.project_id = p_project_id
        AND psw.locale_code = p_locale_code
        AND psw.is_active = true
        AND psw.word = q.word
    WHERE psw.word IS NULL AND q.word != ''; -- Оставляем только те слова, для которых не нашлось стоп-слова

    RETURN v_clean_query;
END;
$$ LANGUAGE plpgsql;

-- 4. Функция массовой загрузки стоп-слов
CREATE OR REPLACE FUNCTION bulk_load_stop_words(
    p_project_id uuid,
    p_locale_code locale,
    p_words text[]
)
RETURNS void AS $$
BEGIN
    INSERT INTO project_stop_words (project_id, locale_code, word)
    SELECT p_project_id, p_locale_code, unnest(p_words)
    ON CONFLICT (project_id, locale_code, word) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 5. Предзагруженные стоп-слова для основных языков
CREATE OR REPLACE FUNCTION load_default_stop_words(
    p_project_id uuid
)
RETURNS void AS $$
BEGIN
    -- Русские стоп-слова
    PERFORM bulk_load_stop_words(p_project_id, 'ru', ARRAY[
        'и', 'в', 'во', 'не', 'что', 'он', 'на', 'я', 'с', 'со', 'как', 'а', 'то', 'все',
        'она', 'так', 'его', 'но', 'да', 'ты', 'к', 'у', 'же', 'вы', 'за', 'бы', 'по',
        'только', 'ее', 'мне', 'было', 'вот', 'от', 'меня', 'еще', 'нет', 'о', 'из',
        'ему', 'теперь', 'когда', 'даже', 'ну', 'вдруг', 'ли', 'если', 'уже', 'или',
        'ни', 'быть', 'был', 'него', 'до', 'вас', 'нибудь', 'опять', 'уж', 'вам'
    ]);

    -- Английские стоп-слова
    PERFORM bulk_load_stop_words(p_project_id, 'en', ARRAY[
        'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for',
        'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his',
        'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my',
        'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if',
        'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like',
        'time', 'no', 'just', 'him', 'know', 'take', 'into', 'year', 'your'
    ]);

    -- Немецкие стоп-слова
    PERFORM bulk_load_stop_words(p_project_id, 'de', ARRAY[
        'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einer', 'einen',
        'einem', 'eines', 'und', 'oder', 'aber', 'als', 'bei', 'zu', 'von', 'mit',
        'nach', 'auf', 'in', 'an', 'für', 'über', 'unter', 'vor', 'hinter', 'neben',
        'zwischen', 'durch', 'um', 'ohne', 'gegen', 'bis', 'während', 'wegen'
    ]);

    -- Французские стоп-слова
    PERFORM bulk_load_stop_words(p_project_id, 'fr', ARRAY[
        'le', 'de', 'un', 'être', 'et', 'à', 'il', 'avoir', 'ne', 'je', 'son', 'que',
        'se', 'qui', 'ce', 'dans', 'en', 'du', 'elle', 'au', 'pour', 'pas', 'que',
        'vous', 'par', 'sur', 'faire', 'plus', 'dire', 'me', 'on', 'mon', 'lui',
        'nous', 'comme', 'mais', 'pouvoir', 'avec', 'tout', 'y', 'aller', 'voir',
        'bien', 'où', 'sans', 'tu', 'ou', 'leur', 'homme', 'si', 'deux', 'mari'
    ]);
END;
$$ LANGUAGE plpgsql;

-- 6. Обновленная функция поиска с учетом стоп-слов
CREATE OR REPLACE FUNCTION fuzzy_search_records_with_stopwords(
    p_project_id uuid,
    p_query text,
    p_locale_code locale DEFAULT NULL,
    p_similarity_threshold float DEFAULT 0.3,
    p_limit int DEFAULT 20,
    p_use_stop_words boolean DEFAULT true
)
RETURNS TABLE (
    source_type varchar(16),
    source_id uuid,
    relevance_score float,
    matched_field varchar(32),
    matched_value text
) AS $$
DECLARE
    v_clean_query text;
BEGIN
    -- Очищаем запрос от стоп-слов если нужно
    IF p_use_stop_words THEN
        v_clean_query := remove_stop_words(p_project_id, p_locale_code, p_query);
        -- Если после очистки запрос пустой, используем оригинальный
        IF v_clean_query = '' OR v_clean_query IS NULL THEN
            v_clean_query := p_query;
        END IF;
    ELSE
        v_clean_query := p_query;
    END IF;

    -- Вызываем основную функцию поиска с очищенным запросом
    RETURN QUERY
    SELECT * FROM fuzzy_search_records(
        p_project_id,
        v_clean_query,
        p_locale_code,
        p_similarity_threshold,
        p_limit
    );
END;
$$ LANGUAGE plpgsql;
