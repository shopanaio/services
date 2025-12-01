-- =============================================================
-- Keywords & groups for enhanced search
-- =============================================================

-- 1. Группы ключевых слов (чтобы одним сетом связать несколько товаров)
CREATE TABLE search_keyword_groups (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id         uuid PRIMARY KEY ,
    title      varchar(64)
);

-- 2. Сами ключевые слова
CREATE TABLE search_keywords (
    project_id  uuid NOT NULL,
    group_id    uuid NOT NULL REFERENCES search_keyword_groups (id) ON DELETE CASCADE,
    keyword     varchar(64) NOT NULL,
    locale_code locale NOT NULL,  -- язык ключевого слова
    PRIMARY KEY (project_id, locale_code, keyword),
    FOREIGN KEY (project_id, locale_code)
        REFERENCES locales (project_id, code) ON DELETE CASCADE
);

-- 2.1 Полнотекстовый вектор для длинных фраз / синонимов
ALTER TABLE search_keywords DROP COLUMN IF EXISTS search_vector;
ALTER TABLE search_keywords ADD COLUMN search_vector tsvector;

-- Триггерная функция для вычисления search_vector
CREATE OR REPLACE FUNCTION update_search_keywords_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    -- Явное приведение 'simple' к regconfig, чтобы однозначно выбрать
    -- перегрузку to_tsvector(regconfig, text) и избежать ошибки
    -- «function to_tsvector(text, text) does not exist»
    NEW.search_vector := to_tsvector('simple'::regconfig, unaccent(lower(NEW.keyword)));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создание триггера
DROP TRIGGER IF EXISTS t_update_search_vector ON search_keywords;
CREATE TRIGGER t_update_search_vector
BEFORE INSERT OR UPDATE ON search_keywords
FOR EACH ROW EXECUTE FUNCTION update_search_keywords_search_vector();

-- Инициализация существующих данных
UPDATE search_keywords SET keyword = keyword;

-- 2.2 Индексы для быстрого поиска по keywords
CREATE INDEX idx_keywords_trgm
    ON search_keywords USING GIN (lower(keyword) gin_trgm_ops);

CREATE INDEX idx_keywords_fts
    ON search_keywords USING GIN (search_vector);

-- Индекс для быстрой фильтрации по проекту и локали
CREATE INDEX idx_search_keywords_project_locale
    ON search_keywords(project_id, locale_code);

-- 3. Связь «продукт-контейнер ↔ группа ключевых слов»
CREATE TABLE product_containers_search_keyword_groups_links (
    project_id       uuid NOT NULL,
    product_id       uuid REFERENCES product_containers (id) ON DELETE CASCADE,
    keyword_group_id uuid REFERENCES search_keyword_groups (id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, keyword_group_id)
);

CREATE INDEX idx_pcskgl_group
    ON product_containers_search_keyword_groups_links (keyword_group_id);

-- 4. Настройки поиска на уровне проекта
CREATE TABLE search_settings (
    project_id          uuid PRIMARY KEY REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    similarity_threshold float,      -- базовый threshold для similarity()
    weight_keywords      float DEFAULT 0.5  -- вклад keyword-совпадений (0..1)
);
