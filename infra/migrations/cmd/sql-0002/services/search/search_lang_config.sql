-- =============================================================
-- Кеширование языковых конфигураций для оптимизации поиска
-- =============================================================
-- 1. Таблица маппинга локалей к конфигурациям полнотекстового поиска
CREATE TABLE IF NOT EXISTS
    search_language_configs (
        locale_code locale PRIMARY KEY,
        ts_config regconfig NOT NULL,
        description text
    );

-- 2. Заполнение стандартных конфигураций
INSERT INTO
    search_language_configs (locale_code, ts_config, description)
VALUES
    ('ru', 'russian', 'Русский язык'),
    ('en', 'english', 'English language'),
    ('de', 'german', 'Deutsche Sprache'),
    ('fr', 'french', 'Langue française'),
    ('es', 'spanish', 'Idioma español'),
    ('it', 'italian', 'Lingua italiana'),
    ('pt', 'portuguese', 'Língua portuguesa'),
    ('nl', 'dutch', 'Nederlandse taal'),
    ('sv', 'swedish', 'Svenska språket'),
    ('no', 'norwegian', 'Norsk språk'),
    ('da', 'danish', 'Dansk sprog'),
    ('fi', 'finnish', 'Suomen kieli'),
    ('tr', 'turkish', 'Türk dili') ON CONFLICT (locale_code)
DO NOTHING;

-- 3. Функция для получения конфигурации (с кешированием)
CREATE OR REPLACE FUNCTION get_ts_config(p_locale_code locale)
RETURNS regconfig AS $$
DECLARE
    v_config regconfig;
BEGIN
    -- Пытаемся найти конфигурацию в таблице
    SELECT ts_config INTO v_config
    FROM search_language_configs
    WHERE locale_code = p_locale_code;

    -- Если не нашли, возвращаем 'simple'
    IF v_config IS NULL THEN
        v_config := 'simple'::regconfig;
    END IF;

    RETURN v_config;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Столбец search_vector и механизм его обновления через триггер ------
-- Если колонки ещё нет (новая установка) — создаём; при апгрейде она
-- уже присутствует, тогда команда ничего не сделает.
ALTER TABLE translations_index
    ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Функция для обновления search_vector при INSERT/UPDATE
CREATE OR REPLACE FUNCTION update_translations_index_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := setweight(
        to_tsvector(
            get_ts_config(NEW.locale_code),
            unaccent(lower(NEW.field_value))
        ),
        CASE NEW.field_name
            WHEN 'TITLE' THEN 'A'::"char"
            ELSE 'D'::"char"
        END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Пересоздаём триггер (idempotent)
DROP TRIGGER IF EXISTS t_update_search_vector ON translations_index;
CREATE TRIGGER t_update_search_vector
BEFORE INSERT OR UPDATE ON translations_index
FOR EACH ROW EXECUTE FUNCTION update_translations_index_search_vector();

-- Инициализируем search_vector для уже существующих строк (если есть)
UPDATE translations_index SET field_value = field_value;

-- 5. Индекс GIN по search_vector ------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_translations_search_vector
    ON translations_index USING GIN (search_vector);

-- 6. Функция для добавления новой языковой конфигурации
CREATE OR REPLACE FUNCTION add_language_config(
    p_locale_code locale,
    p_ts_config text,
    p_description text DEFAULT NULL
) RETURNS void AS $$
BEGIN
    INSERT INTO search_language_configs (locale_code, ts_config, description)
    VALUES (p_locale_code, p_ts_config::regconfig, p_description)
    ON CONFLICT (locale_code)
    DO UPDATE SET
        ts_config = EXCLUDED.ts_config,
        description = EXCLUDED.description;

    -- После добавления новой конфигурации нужно обновить search_vector
    -- для записей с этим locale_code
    UPDATE translations_index
    SET field_value = field_value
    WHERE locale_code = p_locale_code;
END;
$$ LANGUAGE plpgsql;
