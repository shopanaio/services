-- Снимок маркетинговой атрибуции для заказа (1:1 с orders).
CREATE TABLE IF NOT EXISTS
  order_marketing_details (
    -- Идентификатор заказа. PK = FK → orders.id (связь 1:1); каскадное удаление.
    order_id uuid PRIMARY KEY REFERENCES orders (id) ON DELETE CASCADE,
    -- Сырый реферер (URL источника перехода), если есть.
    source_referrer text,
    -- UTM Source — источник трафика (пример: google, newsletter).
    utm_source text,
    -- UTM Medium — тип канала (пример: cpc, email, social).
    utm_medium text,
    -- UTM Campaign — название кампании (пример: spring_sale_2025).
    utm_campaign text,
    -- UTM Term — ключевое слово/доп. маркер (обычно для платного поиска).
    utm_term text,
    -- UTM Content — вариант креатива/ссылки для A/B-разметки.
    utm_content text,
    -- Момент создания записи атрибуции.
    created_at timestamptz NOT NULL DEFAULT now()
  );
