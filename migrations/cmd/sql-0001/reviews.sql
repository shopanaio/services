-- =====================================================================
-- Reviews & Rating subsystem (Production-ready version)
-- Этот скрипт расширяет модель отзывов интернет-магазина: enum-статус,
-- счётчик отзывов, поддержка «полезен/не полезен», медиа, ответов и т.д.
-- Все новые объекты снабжены комментариями для будущих разработчиков.
-- =====================================================================
-- ---------------------------------------------------------------------
-- 1. Таблица товаров (product_containers) — агрегированные данные
-- ---------------------------------------------------------------------
-- average_rating  – усреднённая оценка 0-5 с точностью до 0.01
-- review_count    – количество подтверждённых (APPROVED) отзывов
-- ---------------------------------------------------------------------
ALTER TABLE product_containers
ADD COLUMN IF NOT EXISTS average_rating numeric(3, 2) NOT NULL DEFAULT 0 CHECK (
  average_rating >= 0
  AND average_rating <= 5
);

ALTER TABLE product_containers
ADD COLUMN IF NOT EXISTS review_count int NOT NULL DEFAULT 0 CHECK (review_count >= 0);

-- ---------------------------------------------------------------------
-- 2. Enum-тип для статуса отзыва (удобнее расширять, чем CHECK-constraint)
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_status') THEN
        CREATE TYPE review_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    END IF;
END$$;

-- ---------------------------------------------------------------------
-- 3. Основная таблица отзывов
-- ---------------------------------------------------------------------
-- verified_purchase – отметка «Проверенный покупатель»
-- language_code     – ISO 639-1, полезно для мультиязычных витрин
-- edited_at         – время последнего редактирования отзыва
-- Ограничение UNIQUE (product_id, customer_id) не допускает дубликатов
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS
  reviews (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    -- товар
    product_id uuid REFERENCES product_containers (id) ON DELETE CASCADE,
    product_variant_id uuid REFERENCES product_variants (id) ON DELETE SET NULL,
    customer_id uuid REFERENCES customers (id) ON DELETE CASCADE,
    display_name varchar(255),
    status review_status NOT NULL DEFAULT 'PENDING',
    rating numeric(2, 1) NOT NULL CHECK (
      rating >= 1
      AND rating <= 5
    ),
    title varchar(255),
    message text,
    pros text,
    cons text,
    verified_purchase boolean NOT NULL DEFAULT false,
    helpful_yes int NOT NULL DEFAULT 0 CHECK (helpful_yes >= 0),
    helpful_no  int NOT NULL DEFAULT 0 CHECK (helpful_no  >= 0),
    language_code varchar(16) REFERENCES locale_codes (code),
    edited_at timestamptz,
    CONSTRAINT reviews_product_customer_uniq UNIQUE (product_id, customer_id),
    CONSTRAINT status_approved_requires_product_id CHECK (status <> 'APPROVED' OR product_id IS NOT NULL),
    CONSTRAINT status_approved_requires_customer_id CHECK (status <> 'APPROVED' OR customer_id IS NOT NULL)
  );

-- Полезные индексы для типичных выборок
CREATE INDEX IF NOT EXISTS idx_reviews_product_status ON reviews (product_id, status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reviews_customer ON reviews (customer_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reviews_project ON reviews (project_id);

CREATE INDEX IF NOT EXISTS idx_reviews_created_desc ON reviews (product_id, created_at DESC) WHERE deleted_at IS NULL;

-- Индекс только для одобренных отзывов (быстрый расчёт рейтинг-страницы)
CREATE INDEX idx_reviews_product_approved ON reviews (product_id) WHERE status = 'APPROVED' AND deleted_at IS NULL;

-- ---------------------------------------------------------------------
-- 4. Голоса «полезен/не полезен»
-- ---------------------------------------------------------------------
-- Храним каждый голос отдельно, чтобы избежать повторного голосования
-- и иметь возможность детально анализировать поведение.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS
  review_votes (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    review_id uuid REFERENCES reviews (id) ON DELETE CASCADE NOT NULL,
    customer_id uuid REFERENCES customers (id) ON DELETE CASCADE NOT NULL,
    is_helpful boolean NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    PRIMARY KEY (review_id, customer_id)
  );

CREATE INDEX IF NOT EXISTS idx_review_votes_review_helpful ON review_votes (review_id, is_helpful) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------
-- 5. Ответы/комментарии на отзывы (продавец, поддержка и т.д.)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS
  review_comments (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
    review_id uuid REFERENCES reviews (id) ON DELETE CASCADE NOT NULL,
    author_id uuid REFERENCES customers (id) ON DELETE CASCADE NOT NULL,
    parent_id uuid REFERENCES review_comments (id) ON DELETE CASCADE,
    message text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    edited_at timestamptz,
    deleted_at timestamptz
  );

CREATE INDEX IF NOT EXISTS idx_review_comments_review ON review_comments (review_id);

-- Ускоряем выборку только «живых» комментариев
CREATE INDEX IF NOT EXISTS idx_review_comments_active ON review_comments (review_id) WHERE deleted_at IS NULL;

-- Индекс для дерева комментариев
CREATE INDEX idx_review_comments_parent ON review_comments (parent_id) WHERE deleted_at IS NULL;

-- Индекс для сортировки комментариев по дате
CREATE INDEX idx_review_comments_created_desc ON review_comments (review_id, created_at DESC) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------
-- 6. Медиа-вложения к отзыву (фото/видео)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS
  review_media (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    review_id uuid REFERENCES reviews (id) ON DELETE CASCADE NOT NULL,
    file_id uuid REFERENCES files (id) ON DELETE CASCADE NOT NULL,
    sort_index int NOT NULL DEFAULT 0,
    deleted_at timestamptz,
    PRIMARY KEY (review_id, file_id)
  );

CREATE INDEX IF NOT EXISTS idx_review_media_review ON review_media (review_id) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------
-- 7. Функция и триггеры для актуализации среднего рейтинга и количества отзывов
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_product_rating (p_product_id uuid) RETURNS VOID AS $$
DECLARE
    v_new_rating numeric(3, 2);
    v_current_rating numeric(3, 2);
    v_new_count int;
    v_current_count int;
BEGIN
    SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0), COUNT(*)
      INTO v_new_rating, v_new_count
    FROM reviews
    WHERE product_id = p_product_id
      AND status = 'APPROVED'
      AND deleted_at IS NULL;

    SELECT average_rating, review_count
      INTO v_current_rating, v_current_count
    FROM product_containers
    WHERE id = p_product_id;

    IF v_new_rating IS DISTINCT FROM v_current_rating OR v_new_count IS DISTINCT FROM v_current_count THEN
        UPDATE product_containers
        SET average_rating = v_new_rating,
            review_count  = v_new_count
        WHERE id = p_product_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- -------------------------------
-- 7.4 Триггер-обёртки
-- -------------------------------
CREATE OR REPLACE FUNCTION trg_update_rating_after_insert () RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'APPROVED' THEN
        PERFORM update_product_rating(NEW.product_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_update_rating_after_update () RETURNS TRIGGER AS $$
BEGIN
    IF ((OLD.status = 'APPROVED' AND OLD.deleted_at IS NULL)
        OR (NEW.status = 'APPROVED' AND NEW.deleted_at IS NULL)) THEN
        PERFORM update_product_rating(NEW.product_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_update_rating_after_delete () RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'APPROVED' THEN
        PERFORM update_product_rating(OLD.product_id);
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- -------------------------------
-- 7.5 Привязываем функции к таблице reviews
-- -------------------------------
DROP TRIGGER IF EXISTS reviews_ai_update_product_rating ON reviews;

DROP TRIGGER IF EXISTS reviews_au_update_product_rating ON reviews;

DROP TRIGGER IF EXISTS reviews_ad_update_product_rating ON reviews;

CREATE TRIGGER reviews_ai_update_product_rating
AFTER INSERT ON reviews FOR EACH ROW
EXECUTE FUNCTION trg_update_rating_after_insert ();

CREATE TRIGGER reviews_au_update_product_rating
AFTER
UPDATE ON reviews FOR EACH ROW
EXECUTE FUNCTION trg_update_rating_after_update ();

CREATE TRIGGER reviews_ad_update_product_rating
AFTER DELETE ON reviews FOR EACH ROW
EXECUTE FUNCTION trg_update_rating_after_delete ();

-- ---------------------------------------------------------------------
-- 8. Функция и триггеры для актуализации счётчиков helpful_yes / helpful_no
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_review_helpful_counts (p_review_id uuid) RETURNS VOID AS $$
DECLARE
    v_yes int;
    v_no int;
    v_current_yes int;
    v_current_no int;
BEGIN
    -- Считаем голоса, учитывая soft-delete (deleted_at IS NULL)
    SELECT
        COUNT(*) FILTER (WHERE is_helpful AND deleted_at IS NULL),
        COUNT(*) FILTER (WHERE NOT is_helpful AND deleted_at IS NULL)
      INTO v_yes, v_no
    FROM review_votes
    WHERE review_id = p_review_id;

    SELECT helpful_yes, helpful_no
      INTO v_current_yes, v_current_no
    FROM reviews
    WHERE id = p_review_id;

    IF v_yes IS DISTINCT FROM v_current_yes OR v_no IS DISTINCT FROM v_current_no THEN
        UPDATE reviews
        SET helpful_yes = v_yes,
            helpful_no  = v_no
        WHERE id = p_review_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- -------------------------------
-- 8.4 Триггер-обёртки
-- -------------------------------
CREATE OR REPLACE FUNCTION trg_update_helpful_after_insert () RETURNS TRIGGER AS $$
BEGIN
    -- После вставки нового голоса
    PERFORM update_review_helpful_counts(NEW.review_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_update_helpful_after_update () RETURNS TRIGGER AS $$
BEGIN
    -- При изменении или soft-delete
    PERFORM update_review_helpful_counts(NEW.review_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_update_helpful_after_delete () RETURNS TRIGGER AS $$
BEGIN
    -- При hard-delete
    PERFORM update_review_helpful_counts(OLD.review_id);
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- -------------------------------
-- 8.5 Привязываем функции к таблице review_votes
-- -------------------------------
DROP TRIGGER IF EXISTS review_votes_ai_update_helpful ON review_votes;

DROP TRIGGER IF EXISTS review_votes_au_update_helpful ON review_votes;

DROP TRIGGER IF EXISTS review_votes_ad_update_helpful ON review_votes;

CREATE TRIGGER review_votes_ai_update_helpful
AFTER INSERT ON review_votes FOR EACH ROW
EXECUTE FUNCTION trg_update_helpful_after_insert ();

CREATE TRIGGER review_votes_au_update_helpful
AFTER
UPDATE ON review_votes FOR EACH ROW
EXECUTE FUNCTION trg_update_helpful_after_update ();

CREATE TRIGGER review_votes_ad_update_helpful
AFTER DELETE ON review_votes FOR EACH ROW
EXECUTE FUNCTION trg_update_helpful_after_delete ();
