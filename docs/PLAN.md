# Catalog: категории, коллекции и фасеты - план реализации

## Обзор

Три отдельные доменные концепции внутри сервиса **catalog**:

| Концепция | Роль | Кто управляет |
|---------|------|------------|
| **Category** | Стабильная таксономия, каркас навигации, SEO-страницы | Контент-менеджеры |
| **Collection** | Мерчандайзинговые группы товаров: ручные или основанные на правилах | Мерчандайзеры, маркетологи |
| **Facet** | Конфигурация отображения фасетов: группы, порядок, UI-типы, подписи, на уровне проекта | Администраторы каталога |

Товары назначаются в категории явно: вручную, bulk-операциями или импортом.
Коллекции собирают товары правилами или ручным выбором.
Фасеты на collection PLP вычисляются на лету из присутствующих товаров и рендерятся согласно настройке фасетов на уровне проекта.

**Область Phase 1:** только PostgreSQL. Без Typesense, без full-text search, без algorithmic collections.
**Область валют Phase 1:** listing price filters/sort/range работают в одной валюте, base currency магазина.

**Важно для корректности listing:** фильтры делятся на:
- **Product-level** ограничения: быстрые, через `catalog.product_search_index`: `TAG/FEATURE/STATUS`.
- **Variant-level** ограничения: корректные для комбинаций опций, через `catalog.variant_search_index`: `OPTION`, `price`, `in_stock`.

`STATUS` в `product_search_index` выводится из состояния catalog:
- `published`, когда `product.published_at IS NOT NULL AND product.deleted_at IS NULL`
- `draft` во всех остальных случаях

`CATEGORY` не является storefront facet/filter на category PLP. Категория используется как навигационный контекст и как поле правил для collections, основанных на правилах.

---

## 1. Категории - что меняется

Categories уже существуют (`catalog.category`, `product_category`). Этот план добавляет:

### 1.1 Порядок товаров внутри категории

Товарам внутри категории нужен явный порядок для drag & drop мерчандайзером. Сейчас в `product_category` есть `sortIndex` (integer). Заменяем его на `lexo_rank` для O(1) reorder:

```sql
-- ALTER product_category:
--   DROP sort_index
--   ADD lexo_rank varchar(64) COLLATE "C" NOT NULL
--   ADD INDEX idx_product_category_rank (category_id, lexo_rank)
```

**Почему lexo_rank вместо sortIndex:** integer sort требует переписывать O(N) строк при reorder. Lexo_rank вставляет midpoint string между двумя соседями - обновляется одна строка.

Чтобы скрыть товар из категории, нужно удалить строку `product_category`. Флаг `excluded` не нужен: категории управляются явно людьми.

**Примечание по миграции:** при замене `sort_index` на `lexo_rank` выполнить one-time backfill в порядке `sort_index, product_id`, и только после успешного backfill удалить `sort_index`.

### 1.2 Настройки сортировки категории

Добавить preference сортировки в category:

```sql
-- ALTER category:
--   ADD default_sort varchar(32) NOT NULL DEFAULT 'manual'
--   ADD default_sort_direction varchar(4) NOT NULL DEFAULT 'asc'
```

Значения: `'manual'`, `'price'`, `'newest'`, `'name'`

### 1.3 SEO категории

Новая таблица с той же структурой, что и `product_seo`:

```sql
catalog.category_seo (
  category_id       uuid NOT NULL,
  locale            varchar(8) NOT NULL,
  project_id        uuid NOT NULL,
  
  -- SEO fields (for search engines)
  seo_title         varchar(70),
  seo_description   varchar(160),
  
  -- Open Graph fields (for social media)
  og_title          varchar(95),
  og_description    text,
  og_image_id       uuid,
  
  PRIMARY KEY (category_id, locale),
  FOREIGN KEY (category_id)
    REFERENCES catalog.category(id)
    ON DELETE CASCADE
)
CREATE INDEX idx_category_seo_project_locale ON catalog.category_seo (project_id, locale);
```

---

## 2. Коллекции

**Collection** - именованная группа товаров для мерчандайзинга или маркетинга, независимая от дерева категорий.

### 2.1 Типы коллекций

| Тип | Как выбираются товары |
|------|--------------------------|
| **manual** | Admin явно добавляет товары и упорядочивает их через lexo_rank |
| **rule** | Система вычисляет условия относительно `product_search_index` |

### 2.2 Схема базы данных

```sql
catalog.collection (
  id                uuid PRIMARY KEY,
  project_id        uuid NOT NULL,
  handle            varchar(255),
  type              varchar(16) NOT NULL,  -- 'manual' | 'rule'
  
  -- Sort
  -- For 'rule' collections, 'manual' is not valid (no lexo_rank). Enforced by CHECK constraint.
  -- DB default is safe for RULE; MANUAL collections are set to 'manual' by application default.
  default_sort      varchar(32) NOT NULL DEFAULT 'newest',
  default_sort_direction varchar(4) NOT NULL DEFAULT 'asc',
  
  -- Scheduling
  effective_from       timestamptz,
  effective_to         timestamptz,
  CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from),
  
  -- Publication
  published_at      timestamptz,
  
  -- Timestamps
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz,
  
  UNIQUE(project_id, handle) WHERE deleted_at IS NULL AND handle IS NOT NULL,
  CHECK (type != 'rule' OR default_sort != 'manual')
)

-- Active scheduled collections lookup
CREATE INDEX idx_collection_scheduling
  ON catalog.collection (project_id, effective_from, effective_to)
  WHERE deleted_at IS NULL AND published_at IS NOT NULL;
```

```sql
catalog.collection_translation (
  collection_id     uuid NOT NULL,
  locale            varchar(8) NOT NULL,
  project_id        uuid NOT NULL,
  name              text NOT NULL,
  description_text  text,
  description_html  text,
  description_json  text,
  PRIMARY KEY (collection_id, locale),
  FOREIGN KEY (collection_id)
    REFERENCES catalog.collection(id)
    ON DELETE CASCADE
)
CREATE INDEX idx_collection_translation_project_locale
  ON catalog.collection_translation (project_id, locale);
```

```sql
catalog.collection_seo (
  collection_id     uuid NOT NULL,
  locale            varchar(8) NOT NULL,
  project_id        uuid NOT NULL,
  
  -- SEO fields (for search engines)
  seo_title         varchar(70),
  seo_description   varchar(160),
  
  -- Open Graph fields (for social media)
  og_title          varchar(95),
  og_description    text,
  og_image_id       uuid,
  
  PRIMARY KEY (collection_id, locale),
  FOREIGN KEY (collection_id)
    REFERENCES catalog.collection(id)
    ON DELETE CASCADE
)
CREATE INDEX idx_collection_seo_project_locale ON catalog.collection_seo (project_id, locale);
```

```sql
catalog.collection_media (
  collection_id     uuid NOT NULL,
  file_id           uuid NOT NULL,
  project_id        uuid NOT NULL,
  sort_index        int NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, file_id),
  FOREIGN KEY (collection_id)
    REFERENCES catalog.collection(id)
    ON DELETE CASCADE
)
```

### 2.3 Элементы коллекции только для manual collections

```sql
catalog.collection_item (
  collection_id     uuid NOT NULL,
  project_id        uuid NOT NULL,
  product_id        uuid NOT NULL REFERENCES catalog.product(id) ON DELETE CASCADE,
  lexo_rank         varchar(64) COLLATE "C" NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, product_id),
  FOREIGN KEY (collection_id)
    REFERENCES catalog.collection(id)
    ON DELETE CASCADE
)

CREATE INDEX idx_collection_item_rank
  ON catalog.collection_item (collection_id, lexo_rank);
```

**Для manual collections:** все товары находятся в `collection_item` с `lexo_rank`.
**Для rule collections:** товары вычисляются из rules, строк `collection_item` нет. Чтобы убрать товар из rule collection, нужно изменить rules или атрибуты товара.

### 2.4 Правила коллекций

```sql
catalog.collection_rule (
  id                uuid PRIMARY KEY,
  collection_id     uuid NOT NULL,
  project_id        uuid NOT NULL,
  field             varchar(64) NOT NULL,   -- 'tag', 'price', 'option', 'feature', 'in_stock', 'category', 'created_at'
  operator          varchar(16) NOT NULL,   -- 'eq', 'gt', 'gte', 'lt', 'lte', 'in', 'all', 'contains', 'between'
  value             jsonb NOT NULL,          -- scalar or array depending on operator
  sort_index        int NOT NULL DEFAULT 0,  -- for stable UI display order (rules are AND-ed, order is semantically irrelevant)
  
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  
  -- Rules within a collection are AND-ed by default
  -- Future: rule_group for OR groups
  FOREIGN KEY (collection_id)
    REFERENCES catalog.collection(id)
    ON DELETE CASCADE
)

CREATE INDEX idx_collection_rule_collection ON catalog.collection_rule(collection_id);
```

**Группы правил:**
- `product-level`: `tag`, `feature`, `category`, `created_at`
- `variant-level`: `option`, `price`, `in_stock`

**Примеры:**
```json
{ "field": "tag", "operator": "in", "value": ["sale", "new-arrival"] }
{ "field": "price", "operator": "between", "value": [1000, 5000] }
{ "field": "in_stock", "operator": "eq", "value": true }
{ "field": "feature", "operator": "in", "value": ["material:cotton"] }
{ "field": "category", "operator": "in", "value": ["shoes", "running"] }
```

Rules вычисляются относительно `product_search_index`, а variant-correct predicates (`option`, `price`, `in_stock`) резолвятся через `variant_search_index`.

**Контракт вычисления правил (нормативно):**
- Product-level fields (`tag`, `feature`, `category`, `created_at`) вычисляются на `product_search_index`.
- Variant-bound fields (`option`, `price`, `in_stock`) MUST компилироваться в один `EXISTS` по `variant_search_index`.
- Независимые `EXISTS` blocks для каждого variant-bound rule запрещены, потому что они могут совпасть с разными variants одного товара и дать false positives.
- Авторитетная SQL-семантика определена в §9.

---

## 3. Фасеты на уровне проекта

### 3.1 Основная идея

Facet setup определяет, **какие** фасеты и значения разрешены на PLP, и как они отображаются. Данные товаров используются только для counts. Setup контролирует:

- Какие фасеты показывать и в каком порядке
- Группировку, например "Main filters", "Material & Care"
- UI type для каждого фасета: multi-select checkboxes, single-select, range slider, boolean toggle, color swatches
- Label overrides и порядок значений
- Какие values доступны, только enabled `facet_value` для discrete facets
- Display rules: минимум distinct values для показа, collapse threshold
- Список фасетов идет из `facet`; список values для `TAG`/`FEATURE`/`OPTION` идет из enabled `facet_value`; `PRICE`/`IN_STOCK` - computed facets без строк `facet_value`; counts вычисляются из base product set и обновляются при изменении filters

Raw option/feature/tag values из products никогда не возвращаются в storefront. Наружу отдаются только настроенные `facet_value` entries.

**Контракт значений по типам (нормативно):**
- `TAG` / `FEATURE` / `OPTION` - discrete facets: используют `facet_value` + `facet_value_source_handle` mappings.
- `PRICE` - range facet: не использует `facet_value` или `facet_value_source_handle`.
- `IN_STOCK` - boolean facet: не использует `facet_value` или `facet_value_source_handle`.
- Любая попытка `FacetValueCreate/Update` для `PRICE` или `IN_STOCK` должна падать на validation в scripts.

Setup задается per-project: один плоский список facets на проект.

### 3.2 Схема базы данных

```sql
catalog.facet (
  id                uuid PRIMARY KEY,
  project_id        uuid NOT NULL,
  
  -- What product attribute this maps to
  facet_type        varchar(32) NOT NULL,  -- 'price', 'tag', 'feature', 'option', 'in_stock'
  
  -- Display & selection behavior
  ui_type           varchar(16) NOT NULL DEFAULT 'checkbox',  -- 'checkbox' | 'radio' | 'dropdown' | 'range' | 'boolean'
  selection_mode    varchar(16) NOT NULL DEFAULT 'multi',     -- 'single' | 'multi'
  sort_index        int NOT NULL DEFAULT 0,
  
  -- Multi-select facets always use OR (overlap) across selected values.
  -- Ignored when selection_mode = 'single' (only one value, no logic needed).
  -- Between different facets — filters are combined with AND.
  --
  -- ui_type behavior:
  -- | ui_type    | selection_mode | Notes                               |
  -- |------------|----------------|-------------------------------------|
  -- | checkbox   | multi          | Uses OR (overlap)                   |
  -- | checkbox   | single         | Exact match on single value         |
  -- | radio      | single         | Exact match on single value         |
  -- | dropdown   | single         | Exact match on single value         |
  -- | dropdown   | multi          | Uses OR (overlap)                   |
  -- | range      | —              | BETWEEN min AND max (numeric only)  |
  -- | boolean    | —              | Exact match (true/false)            |
  --
  -- 'range' and 'boolean' ignore selection_mode.
  --
  -- Swatch: only via facet_value.swatch_id (facet_swatch). No implicit fallback from
  -- product_option_swatch or other source tables.
  
  -- Rules
  min_values        int NOT NULL DEFAULT 1,            -- hide facet if fewer distinct values
  max_values_visible int NOT NULL DEFAULT 10,          -- "show more" threshold
  value_sort        varchar(16) NOT NULL DEFAULT 'count', -- 'count', 'alpha', 'custom'
  -- Slug (frontend-provided, backend-validated)
  slug              varchar(255) NOT NULL,
  
  -- SEO
  indexable         boolean NOT NULL DEFAULT false,      -- whether filter combinations generate indexable URLs
  
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(project_id, slug)
)

catalog.facet_translation (
  facet_id          uuid NOT NULL,
  locale            varchar(8) NOT NULL,
  project_id        uuid NOT NULL,
  label             text NOT NULL,                       -- display label override (e.g., "Colour" instead of "color")
  PRIMARY KEY (facet_id, locale),
  FOREIGN KEY (facet_id)
    REFERENCES catalog.facet(id)
    ON DELETE CASCADE
)
CREATE INDEX idx_facet_translation_project_locale
  ON catalog.facet_translation (project_id, locale);
```

`facet_source_handle` намеренно удален. `facet_value_source_handle` - единственная source mapping table в этом плане.

---

### 3.3 Значения фасетов

Настройка значений внутри фасета: custom label, порядок, swatch, объединение source values.

```sql
-- Same structure as product_option_swatch (intentional duplication — separate domain, same shape)
catalog.facet_swatch (
  id                uuid PRIMARY KEY,
  project_id        uuid NOT NULL,
  swatch_type       varchar(32) NOT NULL,  -- 'color' | 'gradient' | 'image'
  color_one         varchar(32),
  color_two         varchar(32),
  image_id          uuid,
  metadata          jsonb
)

catalog.facet_value (
  id                uuid PRIMARY KEY,
  project_id        uuid NOT NULL,
  facet_id          uuid NOT NULL,
  slug              varchar(255) NOT NULL,           -- frontend-provided, unique per facet
  swatch_id         uuid REFERENCES catalog.facet_swatch(id) ON DELETE SET NULL,
  sort_index        int NOT NULL DEFAULT 0,
  enabled           boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  
  FOREIGN KEY (facet_id)
    REFERENCES catalog.facet(id)
    ON DELETE CASCADE,
  UNIQUE(facet_id, slug)
)

catalog.facet_value_source_handle (
  id                uuid PRIMARY KEY,
  project_id        uuid NOT NULL,
  facet_id          uuid NOT NULL,
  facet_value_id    uuid NOT NULL,
  facet_type        varchar(32) NOT NULL, -- denormalized from facet for uniqueness scope
  source_handle     text NOT NULL, -- option/feature composite slug or tag handle
  created_at        timestamptz NOT NULL DEFAULT now(),

  FOREIGN KEY (facet_id)
    REFERENCES catalog.facet(id)
    ON DELETE CASCADE,
  FOREIGN KEY (facet_value_id)
    REFERENCES catalog.facet_value(id)
    ON DELETE CASCADE,
  UNIQUE(project_id, facet_id, source_handle), -- one source handle -> one facet value inside facet
  UNIQUE(project_id, facet_type, source_handle), -- one source handle -> one facet for this type
  UNIQUE(facet_value_id, source_handle)
)
CREATE INDEX idx_facet_value_source_handle_project_value
  ON catalog.facet_value_source_handle (project_id, facet_value_id);
CREATE INDEX idx_facet_value_source_handle_project_type_source
  ON catalog.facet_value_source_handle (project_id, facet_type, source_handle);

catalog.facet_value_translation (
  facet_value_id    uuid NOT NULL,
  locale            varchar(8) NOT NULL,
  project_id        uuid NOT NULL,
  label             text NOT NULL,
  PRIMARY KEY (facet_value_id, locale),
  FOREIGN KEY (facet_value_id)
    REFERENCES catalog.facet_value(id)
    ON DELETE CASCADE
)
CREATE INDEX idx_facet_value_translation_project_locale
  ON catalog.facet_value_translation (project_id, locale);
```

**Назначение:**
- `facet_swatch` - визуальный swatch для значения фасета, аналог `product_option_swatch`.
- `facet_value` - настроенное значение: порядок, enabled, swatch.
- `facet_value_source_handle` - единственный source mapping (`source_handle -> facet_value`) с DB-level уникальностью:
  - в пределах `project_id + facet_id`
  - и в пределах `project_id + facet_type`, чтобы один source_handle не попадал в два фасета одного типа
- `facet_value_translation` - display label для storefront без source fallback.

**Резолюция label и swatch:**

| Приоритет | Label | Swatch |
|-----------|-------|--------|
| 1 | `facet_value_translation` | `facet_swatch` через `facet_value.swatch_id` |

Source translations и product option swatches не используются в storefront responses.

Если `facet_value` не создан, значение не показывается на storefront.

---

### 3.4 Резолюция slug - сохраненные slugs, генерируются приложением

Slugs живут на `facet.slug` и `facet_value.slug`, а не в translation tables. Facet является одной entity независимо от locale: "Цвет", "Color", "Farbe" используют общий slug `color`. Slug не зависит от locale.

#### Почему slug хранится, а не вычисляется

- **Поддержка всех языков.** SQL `IMMUTABLE` functions не умеют корректно обрабатывать CJK, Arabic, Hindi, Thai, Georgian и т.д. Slug приходит с frontend, admin выбирает URL-friendly identifier.
- **Locale-independent.** Slug принадлежит entity, а не translation. Один facet = один slug во всех locales.
- **DB uniqueness явная.** `UNIQUE(project_id, slug)` на `facet`, `UNIQUE(facet_id, slug)` на `facet_value`, плюс constraints link-table для source handles.

#### Источник slug

Slug передается frontend (admin UI) при create и update. Backend валидирует format (`^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`) и uniqueness. Auto-generation нет: admin отвечает за выбор понятного и URL-safe slug.

#### Получение slugs для API responses

```sql
-- Facet slugs
SELECT f.id, f.slug, ft.label
FROM facet f
JOIN facet_translation ft ON ft.facet_id = f.id
WHERE f.project_id = :projectId
  AND ft.project_id = f.project_id
  AND ft.locale = :locale;

-- Facet value slugs
SELECT fv.id, fv.slug, fvt.label
FROM facet_value fv
JOIN facet_value_translation fvt ON fvt.facet_value_id = fv.id
WHERE fv.facet_id = :facetId
  AND fvt.project_id = fv.project_id
  AND fvt.locale = :locale;
```

#### Резолюция slug -> search index handle для filter inputs

Storefront передает строки `facetSlug:valueSlug` через единое поле `ProductFiltersInput.facets`. Все facet types (`tag`, `feature`, `option`) используют один canonical resolution path через `facet` + `facet_value` + `facet_value_source_handle`:

```sql
-- Resolve (facetSlug, valueSlug) -> (facet_id, facet_type, source_handles)
SELECT
  f.id AS facet_id,
  f.facet_type,
  fv.id AS facet_value_id,
  array_agg(fvsh.source_handle ORDER BY fvsh.source_handle) AS source_handles
FROM facet f
JOIN facet_value fv
  ON fv.facet_id = f.id
  AND fv.project_id = f.project_id
  AND fv.enabled = true
JOIN facet_value_source_handle fvsh
  ON fvsh.facet_value_id = fv.id
  AND fvsh.facet_id = f.id
  AND fvsh.project_id = f.project_id
  AND fvsh.facet_type = f.facet_type
WHERE f.project_id = :projectId
  AND f.slug = :facetSlug
  AND fv.slug = :valueSlug
GROUP BY f.id, f.facet_type, fv.id;
```

`valueSlug` должен резолвиться в существующую enabled строку `facet_value`. Если строка не найдена, filter value считается invalid и должен игнорироваться.

`facet_type` определяет, какую index column query использует: `TAG` -> `product_search_index.tag_handles`, `FEATURE` -> `product_search_index.feature_slugs`, `OPTION` -> `variant_search_index.option_slugs`. Multi-select facets используют CNF: OR внутри одного facet, AND между facets. Single-select facets используют exact match.

Lookup использует `UNIQUE(project_id, slug)` на `facet`, `UNIQUE(facet_id, slug)` на `facet_value` и indexed join к `facet_value_source_handle` (`project_id + facet_type + source_handle`). Results кешируются per request.

---

## 4. Product Search Index

Denormalized **product-level** таблица для быстрых queries. Используется category PLPs (product listing), collection rule evaluation и collection faceted filtering.

**Product name в этом index отсутствует.** Product names multilingual и живут в `product_translation`. Sort-by-name использует JOIN на `product_translation` во время query, см. §5. Это не дублирует translatable content в index и оставляет search index language-agnostic. Это важно, потому что отдельный search service будет иметь собственный index, а Typesense уже хранит per-locale titles для full-text search.

```sql
catalog.product_search_index (
  project_id        uuid NOT NULL,
  product_id        uuid PRIMARY KEY REFERENCES catalog.product(id) ON DELETE CASCADE,
  status            varchar(16) NOT NULL DEFAULT 'draft', -- derived: 'published' | 'draft'
  tag_handles       text[] DEFAULT '{}',   -- tag handles (project-wide unique), e.g., {'sale', 'new-arrival'}
  feature_slugs     text[] DEFAULT '{}',  -- composite 'feature_slug:value_slug', e.g., {'material:cotton', 'brand:nike'}
  category_handles  text[] DEFAULT '{}',  -- category handles (project-wide unique), e.g., {'shoes', 'running'}
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
)
```

Indexes: GIN на arrays, B-tree на status/created_at, плюс:

```sql
CREATE INDEX idx_product_search_index_project_status
  ON catalog.product_search_index (project_id, status);
```

### Variant Search Index для OPTION и variant-bound filters

Denormalized **variant-level** таблица для корректной option combination filtering и variant-bound facets.

```sql
catalog.variant_search_index (
  project_id        uuid NOT NULL,
  variant_id        uuid PRIMARY KEY REFERENCES catalog.variant(id) ON DELETE CASCADE,
  product_id        uuid NOT NULL REFERENCES catalog.product(id) ON DELETE CASCADE,
  price_currency    varchar(3) NOT NULL, -- Phase 1: store base currency only
  price_minor       bigint,
  in_stock          boolean NOT NULL DEFAULT false,
  total_stock       int NOT NULL DEFAULT 0,
  option_slugs      text[] DEFAULT '{}',  -- composite 'option_slug:value_slug', e.g., {'color:red', 'size:42'}
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
)
```

Indexes:

```sql
CREATE INDEX idx_variant_search_index_project_product
  ON catalog.variant_search_index (project_id, product_id);

CREATE INDEX idx_variant_search_index_project_in_stock
  ON catalog.variant_search_index (project_id, in_stock);

CREATE INDEX idx_variant_search_index_project_price
  ON catalog.variant_search_index (project_id, price_currency, price_minor);

CREATE INDEX idx_variant_search_index_option_slugs_gin
  ON catalog.variant_search_index USING GIN (option_slugs);
```

### Lookup slug -> composite handle для storefront filter inputs

Search index и facets хранят **slugs/handles**, не UUIDs. Variant search index хранит composite slugs (`option_slug:value_slug`) для options, а facets мапят display slugs в source composite handles через `facet_value_source_handle`.

Storefront передает facet filters через единое поле `ProductFiltersInput.facets` как строки `facetSlug:valueSlug`. Resolution идет через facets, см. §3.4:
1. `facet.slug` -> `facet_type`
2. `facet_value.slug` -> rows в `facet_value_source_handle`, только configured values
3. Query соответствующей index column:
   - `TAG` -> `product_search_index.tag_handles`
   - `FEATURE` -> `product_search_index.feature_slugs`
   - `OPTION` -> `variant_search_index.option_slugs`

`CATEGORY` намеренно исключен из storefront facet filters в Phase 1.

Unconfigured values не разрешены для storefront filtering. Если `valueSlug` не имеет matching `facet_value` row, filter value игнорируется.

### Поток синхронизации

`SyncProductIndexScript` запускается на productCreated/Updated/Deleted events:
1. Load product + categories -> collect `category.handle` values -> `category_handles`
2. Load product tags -> collect `tag.handle` values -> `tag_handles`
3. Load product features + values -> build `feature.slug + ':' + featureValue.slug` composites -> `feature_slugs`
4. Compute `status` from `product.published_at/deleted_at`
5. UPSERT into `product_search_index` with slug/handle arrays

Translation data не синхронизируется: index содержит только structured/numeric fields и slugs/handles.

`SyncVariantIndexScript` запускается из product lifecycle events (`productCreated`, `productDeleted`, `productUpdated`) и смотрит `productUpdated.payload.variants`, чтобы определить affected variants:
1. Load variant + parent product_id
2. Load variant option values -> build `option.slug + ':' + optionValue.slug` composites -> `option_slugs`
3. Load variant price in store base currency (`price_currency`, `price_minor`)
4. Broker call `inventory.getOffers` для stock, scoped by variant
5. UPSERT into `variant_search_index`, 1 row per variant

---

## 5. PLP Query Flow для Category и Collection

### 5.1 Category PLP

```text
QueryCategoryProductsScript:
  Input: { categoryId, locale, filters?, sort?, pagination }
  
  1. Load category -> get default_sort
  2. Build query:
       product_category pc
       JOIN product_search_index psi ON pc.product_id = psi.product_id
       WHERE pc.category_id = :categoryId
         AND psi.status = 'published'
         AND [apply product-level filters: TAG/FEATURE]
         AND [apply variant-level filters via EXISTS on variant_search_index when OPTION and/or PRICE and/or in_stock filters are present]
  3. Apply sort:
       'manual' -> ORDER BY pc.lexo_rank ASC, psi.product_id ASC
       'price'  -> ORDER BY min matched variant price ASC NULLS LAST, psi.product_id ASC
       'newest' -> ORDER BY psi.created_at DESC, psi.product_id ASC
       'name'   -> LEFT JOIN product_translation pt
                     ON pt.product_id = psi.product_id AND pt.locale = :locale
                   ORDER BY pt.title ASC NULLS LAST, psi.product_id ASC
  4. Paginate (Relay cursor)
  5. Compute facet aggregations (see 5.3)
  6. Return { products, facets, totalCount, pageInfo }
```

Sort `name` делает JOIN к `product_translation` по request locale. У `product_translation` composite PK `(product_id, locale)`, поэтому join index-only. LEFT JOIN гарантирует, что товары без translation для request locale все равно попадут в выдачу, с сортировкой в конец через `NULLS LAST`.

**Семантика variant filters для Category PLP:**
- `TAG/FEATURE/STATUS` остаются product-level, на `product_search_index`.
- `OPTION`, `price` и `in_stock` filters должны быть variant-correct:
  - Применяются как `EXISTS (SELECT 1 FROM variant_search_index vsi WHERE vsi.project_id = psi.project_id AND vsi.product_id = psi.product_id AND [variant predicates])`.
  - Все активные variant predicates (`OPTION`, `price`, `in_stock`) должны быть внутри одного EXISTS.

**Семантика price sort для Category PLP:**
- Определить `sort_price_minor` как MIN(`vsi.price_minor`) среди variants, которые проходят active variant predicates (CTE `min_price_per_product`) и `vsi.price_currency = :priceCurrency`, затем сортировать по нему.

### 5.2 Collection PLP

```text
QueryCollectionProductsScript:
  Input: { collectionId, locale, filters?, sort?, pagination }
  
  1. Load collection -> type, rules, default_sort
  2. Check collection availability:
     - `deleted_at IS NULL`
     - `published_at IS NOT NULL AND published_at <= now()`
     - `(effective_from IS NULL OR effective_from <= now())`
     - `(effective_to   IS NULL OR effective_to   >  now())`
  2.1 For both manual and rule collections, products are restricted to `psi.status = 'published'`.
  3. Resolve product set by type:
     
     manual:
       SELECT ci.product_id
       FROM collection_item ci
       JOIN product_search_index psi ON psi.product_id = ci.product_id
       WHERE ci.collection_id = :collectionId
         AND ci.project_id = :projectId
         AND psi.project_id = :projectId
         AND psi.status = 'published'
       ORDER BY ci.lexo_rank
       
     rule:
       Compile rules into:
         - product-level predicates on product_search_index
         - variant-level predicates in ONE EXISTS over variant_search_index
       (single EXISTS is mandatory to avoid cross-variant false positives)
  
  4. Apply facet filters from user
  5. Sort:
       'manual' -> ORDER BY ci.lexo_rank ASC, psi.product_id ASC
       'price'  -> ORDER BY min matched variant price ASC NULLS LAST, psi.product_id ASC
       'newest' -> ORDER BY psi.created_at DESC, psi.product_id ASC
       'name'   -> LEFT JOIN product_translation pt
                     ON pt.product_id = psi.product_id AND pt.locale = :locale
                   ORDER BY pt.title ASC NULLS LAST, psi.product_id ASC
  6. Paginate
  7. Compute facet aggregations (see 5.3)
  8. Return { products, facets, totalCount, pageInfo }
```

### 5.3 Вычисление фасетов

Для заданного product set из category или collection.

**Note on category:** `category_handles` хранится в `product_search_index` для collection rule evaluation, например "all products in category X", но category **не является** facet type. Categories - ось навигации, а не filterable attribute на PLP. `FacetType` enum: `PRICE | TAG | FEATURE | OPTION | IN_STOCK`, без `CATEGORY`. Array `category_handles` не unnested при facet aggregation.

Три ключевых момента:

1. **Стабильный список facets/values** - выводится из base product set: category/collection без user filters. Список фасетов и values не меняется при изменении filters, меняются только counts.
2. **Facet isolation** - counts для каждого facet вычисляются **без** filter этого же facet, но со всеми остальными facet filters. Это позволяет пользователю видеть sibling values и переключаться между ними. Стандартный паттерн e-commerce.
3. **Merged values** - когда один `facet_value` мапится на несколько строк `facet_value_source_handle`, counts должны объединяться в одно display value.

#### 5.3.1 Подход одним query с boolean filter columns

Вместо N+1 отдельных queries нужно держать один product base scan и:
- вычислить product-level pass booleans из `product_search_index` (`TAG/FEATURE`)
- вычислить **variant pass set** из `variant_search_index`, когда активен любой variant-scoped filter (`OPTION`/`price`/`in_stock`)
- считать `TAG/FEATURE` facet counts от product base, с примененным variant pass set
- считать `OPTION` facet counts от variant index, но возвращать `COUNT(DISTINCT product_id)`, чтобы не считать products дважды

**Step 1: Base CTE с per-facet-id boolean columns, без user filters**

Один boolean на каждый активный **product-level facet_id**. Multi-select использует OR внутри facet.

Если у facet **нет selected values**, не создавать его `passes_*` boolean и не применять этот facet filter в product query, то есть считать `TRUE`. Никогда не использовать `array && '{}'`.

```sql
-- Example: user selected Color=[Red, Blue], Size=[42], Material=[Cotton], Tags=[Sale],
-- price $10–$50, in_stock=true.

WITH base_all AS (
  SELECT
    psi.product_id,
    psi.tag_handles,
    psi.feature_slugs
  FROM product_search_index psi
  JOIN product_category pc ON pc.product_id = psi.product_id
  WHERE psi.project_id = :projectId
    AND pc.category_id = :categoryId
    AND psi.status = 'published'
),
-- Only used when variant filters are active (OPTION, price, in_stock).
-- Materialize once per request to avoid per-product correlated subqueries.
passes_variant_products AS (
  SELECT DISTINCT vsi.product_id
  FROM variant_search_index vsi
  JOIN base_all b ON b.product_id = vsi.product_id
  WHERE vsi.project_id = :projectId
    -- OPTION CNF: OR within each option facet, AND between option facets
    AND (vsi.option_slugs && ARRAY['color:red','color:blue']::text[]) -- Color
    AND (vsi.option_slugs && ARRAY['size:42']::text[])                -- Size
    AND (vsi.price_currency = :priceCurrency)
    AND (:priceMin IS NULL OR vsi.price_minor >= :priceMin)
    AND (:priceMax IS NULL OR vsi.price_minor <= :priceMax)
    AND (:inStock IS NULL OR vsi.in_stock = :inStock)
),
base AS (
  SELECT
    base_all.*,

    -- One boolean per active product-level facet_id.
    -- Example aliases are generated from facet IDs in request context.
    (base_all.feature_slugs && ARRAY['material:cotton']::text[])             AS passes_f_feature_material,
    (base_all.tag_handles && ARRAY['sale']::text[])                          AS passes_f_tag_sale,

    -- Variant pass: when variant filters are active, product must have at least one passing variant.
    (NOT :variantFiltersActive OR pvp.product_id IS NOT NULL)                 AS passes_variant
  FROM base_all
  LEFT JOIN passes_variant_products pvp ON pvp.product_id = base_all.product_id
)
```

`base_all` задает стабильную universe без user filters. `base` добавляет boolean filter columns для counts, но не фильтрует rows. Это гарантирует, что списки facet/value стабильны, а counts меняются с filters. Когда variant filters не активны, `passes_variant` должен считаться `TRUE`, а `passes_variant_products` нужно полностью пропускать.

**Step 2: Aggregation с facet isolation через FILTER**

Counts для каждого facet вычисляются со всеми остальными filters, но **без predicate именно этого facet_id**. Это сохраняет sibling values видимыми даже когда несколько facets имеют один type, например два `FEATURE` facets.

```sql
WITH unnested AS (
  -- Features
  SELECT b.product_id,
         b.passes_f_feature_material, b.passes_f_tag_sale, b.passes_variant,
         sv.slug AS sv_slug, 'feature' AS facet_type
  FROM base b, unnest(b.feature_slugs) AS sv(slug)

  UNION ALL

  -- Tags
  SELECT b.product_id,
         b.passes_f_feature_material, b.passes_f_tag_sale, b.passes_variant,
         sv.slug AS sv_slug, 'tag' AS facet_type
  FROM base b, unnest(b.tag_handles) AS sv(slug)
),
mapped AS (
  SELECT
    u.product_id,
    u.facet_type,
    f.id AS facet_id,
    fv.id AS facet_value_id,
    fv.slug AS value_slug,
    u.passes_f_feature_material, u.passes_f_tag_sale, u.passes_variant
  FROM unnested u
  -- Canonical source mapping: source_handle -> facet_value -> facet
  JOIN facet_value_source_handle fvsh
    ON fvsh.project_id = :projectId
    AND fvsh.facet_type = u.facet_type
    AND fvsh.source_handle = u.sv_slug
  JOIN facet_value fv
    ON fv.id = fvsh.facet_value_id
    AND fv.facet_id = fvsh.facet_id
    AND fv.enabled = true
  JOIN facet f
    ON f.id = fv.facet_id
    AND f.id = fvsh.facet_id
    AND f.project_id = :projectId
    AND f.facet_type = fvsh.facet_type
),
counts AS (
  SELECT
    m.facet_id,
    m.facet_value_id,
    m.value_slug,
    COUNT(DISTINCT m.product_id)
      FILTER (WHERE
        m.passes_variant
        AND (m.facet_id = :facetId_feature_material OR m.passes_f_feature_material)
        AND (m.facet_id = :facetId_tag_sale OR m.passes_f_tag_sale)
      ) AS cnt
  FROM mapped m
  GROUP BY m.facet_id, m.facet_value_id, m.value_slug
)

SELECT
  facet_id,
  facet_value_id,
  value_slug,
  cnt
FROM counts
```

`FILTER` predicate генерируется per request из active facet IDs:
- включить все active product-level facet booleans
- для `m.facet_id` текущей строки пропустить только свой boolean через `(m.facet_id = :currentFacetId OR passes_f_<facetId>)`
- никогда не branch only by `facet_type`

**OPTION facet counts (variant-correct):** вычислять из `variant_search_index`, но возвращать `COUNT(DISTINCT product_id)`.
Facet isolation все равно применяется по `facet_id`: для counts одного OPTION facet опускается только option predicate этого facet, но сохраняются:
- все active product-level filters (`TAG/FEATURE/STATUS`)
- все остальные active OPTION predicates
- variant-bound `price` и `in_stock` predicates

**Только configured values:** counts и value lists строятся только из enabled `facet_value` rows. Любое source value без `facet_value` mapping игнорируется.

**Step 3: Price range, in-stock count и total с facet isolation**

Total count использует все active filters.

Для корректности с OPTION filters, aggregations `PRICE` и `IN_STOCK` должны вычисляться из `variant_search_index`, scoped to eligible product set:
- `PRICE` range: исключить price predicate (facet isolation), сохранить все остальные active filters (product-level + OPTION + in_stock).
- `IN_STOCK` count: исключить in_stock predicate (facet isolation), сохранить все остальные active filters (product-level + OPTION + price).

```sql
SELECT
  -- Total count: all filters applied (no isolation — this is the result count)
  COUNT(*) FILTER (WHERE passes_f_feature_material AND passes_f_tag_sale AND passes_variant) AS total_count
FROM base
```

**Почему это работает:**
- Один sequential scan `product_search_index`, base CTE materialized один раз.
- Когда variant filters активны: один scan `variant_search_index`, чтобы materialize `passes_variant_products`.
- `FILTER (WHERE ...)` - Postgres aggregate clause: без subqueries и дополнительных scans.
- Facet isolation: из FILTER conjunction пропускается один boolean на facet **ID**.
- Когда facet filters не активны, все `passes_X` columns отсутствуют и FILTER clauses опускаются - это превращается в обычный `COUNT(*)`.
- Cost: каждый facet добавляет 1 boolean column + 1 COUNT column.

#### 5.3.2 Дедупликация объединенных values

Для discrete facets (`TAG`/`FEATURE`/`OPTION`) counts группируются по `facet_value.id` **после** mapping source values в `facet_value`, используя `COUNT(DISTINCT product_id)`. Это предотвращает double-counting, когда у товара несколько source slugs мапятся на одно display value. Values без `facet_value` mapping исключаются из results.

#### 5.3.3 Сборка результата

Aggregated data собирается с учетом project `facet` setup:
- Какие facets включать, только определенные в `facet`.
- Порядок через `facet.lexo_rank`.
- UI type и selection mode.
- Facet inclusion решается по base set без user filters: скрывать facet только если в base set меньше distinct configured values с `count > 0`, чем `min_values`.
- Value lists для `TAG`/`FEATURE`/`OPTION` выводятся из enabled `facet_value` rows и остаются стабильными; values с `count = 0` остаются в списке, обычно disabled.
- `PRICE` собирается из computed `priceRange`, без `facet_value` list.
- `IN_STOCK` собирается из computed boolean counts, без `facet_value` list.
- Value count limits (`max_values_visible`).
- Labels из `facet_value_translation`, без source fallback.
- Slugs из `facet.slug` и, для discrete facets, `facet_value.slug`, для `FacetResult.slug` и `FacetResultValue.slug`.

---

## 6. Структура файлов - новые и измененные файлы

### Новые файлы

```text
src/repositories/models/
  searchIndex.ts                        # product_search_index
  variantSearchIndex.ts                 # variant_search_index
  collection.ts                         # collection, collection_item, collection_rule, collection_translation, collection_media
  facet.ts                              # facet, facet_translation, facet_swatch,
                                        # facet_value, facet_value_source_handle, facet_value_translation

src/repositories/
  listing/SearchIndexRepository.ts      # product_search_index CRUD + TAG/FEATURE facet queries
  listing/VariantSearchIndexRepository.ts # variant_search_index CRUD + OPTION facet queries
  collection/CollectionRepository.ts    # collection CRUD
  collection/CollectionItemRepository.ts # manual items: add/remove/reorder
  collection/CollectionRuleRepository.ts # rules CRUD
  facet/FacetRepository.ts              # facet CRUD
  facet/FacetValueRepository.ts         # facet_value CRUD + translations
  facet/FacetSwatchRepository.ts        # facet_swatch CRUD

src/scripts/
  search-index/
    SyncProductIndexScript.ts
    SyncVariantIndexScript.ts
    RebuildProductIndexScript.ts          # full rebuild/backfill for product_search_index
    RebuildVariantIndexScript.ts          # full rebuild/backfill for variant_search_index
  
  collection/
    CollectionCreateScript.ts
    CollectionUpdateScript.ts
    CollectionDeleteScript.ts
    CollectionAddProductsScript.ts       # manual only: add products with lexo_rank
    CollectionRemoveProductsScript.ts    # manual only: remove products
    CollectionMoveProductScript.ts       # manual only: lexo_rank reorder
    CollectionRebalanceScript.ts         # manual only: rebalance lexo_ranks
    CollectionUpdateRulesScript.ts       # rule only: replace rule set
    QueryCollectionProductsScript.ts     # both types: filtered, sorted, paginated query

  category/
    QueryCategoryProductsScript.ts       # category PLP: products + facets
    CategoryMoveProductScript.ts         # reorder product in category
    CategoryRebalanceScript.ts
    CategoryUpdateSortScript.ts          # update default_sort + default_sort_direction

  facet/
    FacetCreateScript.ts
    FacetUpdateScript.ts
    FacetDeleteScript.ts
    FacetValueCreateScript.ts
    FacetValueUpdateScript.ts
    FacetValueDeleteScript.ts
    FacetSwatchCreateScript.ts
    FacetSwatchUpdateScript.ts
    FacetSwatchDeleteScript.ts
    ResolveFacetsScript.ts               # compute facet display from project facets

src/resolvers/admin/
  CollectionResolver.ts
  CollectionQueryResolver.ts
  CollectionMutationResolver.ts
  FacetResolver.ts
  FacetValueResolver.ts
  FacetSwatchResolver.ts
  FacetQueryResolver.ts
  FacetMutationResolver.ts

src/loaders/
  CollectionLoader.ts
  FacetLoader.ts
  FacetValueLoader.ts
  FacetSwatchLoader.ts

src/api/graphql-admin/schema/
  collection.graphql
  facet.graphql
```

### Измененные файлы

```text
src/repositories/models/index.ts           # export new model files
src/repositories/models/categories.ts      # add lexo_rank to product_category; add default_sort to category
src/repositories/models/features.ts        # add slug to product_feature and product_feature_value
src/repositories/models/seo.ts             # add category_seo, collection_seo (same structure as product_seo)
src/repositories/Repository.ts             # add new repositories
src/repositories/translation/TranslationRepository.ts # add category/collection SEO accessors
src/loaders/Loader.ts                      # add new loaders
src/loaders/CategoryLoader.ts              # add categorySeo loader
src/handlers/index.ts                      # add search index sync handlers
src/api/graphql-admin/schema/base.graphql  # add collection/facet queries & mutations to CatalogQuery/CatalogMutation
src/api/graphql-admin/schema/category.graphql  # add categoryProducts, defaultSort, seo fields to Category
src/api/graphql-admin/schema/seo.graphql   # add generic Seo/SeoInput types
src/resolvers/admin/CategoryResolver.ts    # add new field resolvers
src/resolvers/admin/QueryResolver.ts       # wire new collection/facet queries
src/resolvers/admin/MutationResolver.ts    # wire new collection/facet mutations
```

---

## 7. GraphQL-схема

### 7.1 Расширения Category в `category.graphql`

```graphql
# Add to Category type:
defaultSort: ProductSortBy!
defaultSortDirection: SortDirection!
seo: Seo

"""Товары категории с сортировкой, фильтрацией и pagination."""
categoryProducts(
  first: Int
  after: String
  last: Int
  before: String
  filters: ProductFiltersInput
  sort: ProductSortInput
): CategoryProductConnection!
```

```graphql
type CategoryProductConnection {
  edges: [CategoryProductEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
  facets: Facets
}

type CategoryProductEdge {
  node: Product!
  cursor: String!
}

input CategoryMoveProductInput { categoryId: ID!, productId: ID!, afterProductId: ID, beforeProductId: ID }
input CategoryRebalanceInput { categoryId: ID! }
input CategoryUpdateSortInput { id: ID!, defaultSort: ProductSortBy!, defaultSortDirection: SortDirection }

type CategoryMoveProductPayload { category: Category, userErrors: [GenericUserError!]! }
type CategoryRebalancePayload { category: Category, userErrors: [GenericUserError!]! }
type CategoryUpdateSortPayload { category: Category, userErrors: [GenericUserError!]! }

# Add to CategoryCreateInput / CategoryUpdateInput:
#   seo: SeoInput
```

### 7.2 Collection в `collection.graphql`

```graphql
type Collection implements Node @key(fields: "id") {
  id: ID!
  handle: String
  type: CollectionType!
  name: String!
  description: Description
  media: [CollectionMediaItem!]!
  seo: Seo
  
  defaultSort: ProductSortBy!
  defaultSortDirection: SortDirection!
  
  activeFrom: DateTime
  activeTo: DateTime
  isActive: Boolean!
  
  publishedAt: DateTime
  isPublished: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
  
  rules: [CollectionRule!]!
  
  products(
    first: Int, after: String, last: Int, before: String
    filters: ProductFiltersInput
    sort: ProductSortInput
  ): CollectionProductConnection!
  
  productsCount: Int!
}

enum CollectionType { MANUAL RULE }

type CollectionRule {
  id: ID!
  field: String!
  operator: String!
  value: JSON!
  sortIndex: Int!
}

type CollectionProductConnection {
  edges: [CollectionProductEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
  facets: Facets
}

type CollectionProductEdge {
  node: Product!
  cursor: String!
}

# Inputs:
input CollectionCreateInput {
  handle: String
  type: CollectionType!
  name: String!
  description: DescriptionInput
  media: [CollectionMediaInput!]
  seo: SeoInput
  defaultSort: ProductSortBy
  defaultSortDirection: SortDirection
  activeFrom: DateTime
  activeTo: DateTime
  publish: Boolean
}

input CollectionUpdateInput {
  id: ID!
  handle: String
  name: String
  description: DescriptionInput
  media: [CollectionMediaInput!]
  seo: SeoInput
  defaultSort: ProductSortBy
  defaultSortDirection: SortDirection
  activeFrom: DateTime
  activeTo: DateTime
  publish: Boolean
}

input CollectionMediaInput { fileId: ID!, sortIndex: Int }
input CollectionDeleteInput { id: ID! }
input CollectionAddProductsInput { collectionId: ID!, productIds: [ID!]! }
input CollectionRemoveProductsInput { collectionId: ID!, productIds: [ID!]! }
input CollectionMoveProductInput { collectionId: ID!, productId: ID!, afterProductId: ID, beforeProductId: ID }
input CollectionUpdateRulesInput { collectionId: ID!, rules: [CollectionRuleInput!]! }
input CollectionRuleInput { field: String!, operator: String!, value: JSON! }
```

`CollectionCreateInput.defaultSort` optional и имеет type-aware defaults:
- `type=MANUAL` -> default `MANUAL`
- `type=RULE` -> default `NEWEST`

`CollectionUpdateInput.defaultSort` должен валидироваться против collection type:
- `RULE` collections не могут использовать `MANUAL`

### 7.3 Facets в `facet.graphql`

```graphql
type Facet implements Node {
  id: ID!
  facetType: FacetType!
  """Для TAG/FEATURE/OPTION: выводится из distinct source keys в facet_value_source_handle. Empty для PRICE, IN_STOCK."""
  sourceHandles: [String!]!
  slug: String!
  label: String!
  uiType: FacetUIType!
  selectionMode: FacetSelectionMode!
  sortIndex: Int!
  minValues: Int!
  maxValuesVisible: Int!
  valueSort: FacetValueSort!
  indexable: Boolean!
  values: [FacetValue!]!
}

enum FacetType { PRICE TAG FEATURE OPTION IN_STOCK }
enum FacetUIType { CHECKBOX RADIO DROPDOWN RANGE BOOLEAN }
enum FacetSelectionMode { SINGLE MULTI }
enum FacetValueSort { COUNT ALPHA CUSTOM }

# Phase 1 constraint:
# - RANGE uiType is supported only for facetType=PRICE
# - BOOLEAN uiType is supported only for facetType=IN_STOCK
# - `facet_value` + `sourceHandles` are supported only for facetType in {TAG, FEATURE, OPTION}
# - FacetValueCreate/Update for PRICE or IN_STOCK must fail validation

type FacetValue implements Node {
  id: ID!
  facet: Facet!
  slug: String!
  label: String!
  sourceHandles: [String!]!
  swatch: FacetSwatch
  sortIndex: Int!
  enabled: Boolean!
}

type FacetSwatch implements Node {
  id: ID!
  swatchType: SwatchType!
  colorOne: String
  colorTwo: String
  file: File
  metadata: JSON
}

# Inputs:
input FacetCreateInput { facetType: FacetType!, slug: String!, uiType: FacetUIType, selectionMode: FacetSelectionMode, label: String!, sortIndex: Int }
input FacetUpdateInput { id: ID!, slug: String, uiType: FacetUIType, selectionMode: FacetSelectionMode, label: String, sortIndex: Int, minValues: Int, maxValuesVisible: Int, valueSort: FacetValueSort, indexable: Boolean }
input FacetDeleteInput { id: ID! }

# `sourceHandles` is required for TAG/FEATURE/OPTION and forbidden for PRICE/IN_STOCK.
input FacetValueCreateInput { facetId: ID!, slug: String!, label: String!, sourceHandles: [String!], swatchId: ID, sortIndex: Int, enabled: Boolean }
input FacetValueUpdateInput { id: ID!, slug: String, label: String, sourceHandles: [String!], swatchId: ID, sortIndex: Int, enabled: Boolean }
input FacetValueDeleteInput { id: ID! }

input FacetSwatchCreateInput { swatchType: SwatchType!, colorOne: String, colorTwo: String, fileId: ID, metadata: JSON }
input FacetSwatchUpdateInput { id: ID!, swatchType: SwatchType, colorOne: String, colorTwo: String, fileId: ID, metadata: JSON }
input FacetSwatchDeleteInput { id: ID! }

type FacetValueCreatePayload { facetValue: FacetValue, userErrors: [GenericUserError!]! }
type FacetValueUpdatePayload { facetValue: FacetValue, userErrors: [GenericUserError!]! }
type FacetValueDeletePayload { deletedFacetValueId: ID, userErrors: [GenericUserError!]! }

type FacetSwatchCreatePayload { facetSwatch: FacetSwatch, userErrors: [GenericUserError!]! }
type FacetSwatchUpdatePayload { facetSwatch: FacetSwatch, userErrors: [GenericUserError!]! }
type FacetSwatchDeletePayload { deletedFacetSwatchId: ID, userErrors: [GenericUserError!]! }
```

### 7.4 Общие типы

```graphql
"""
Generic SEO and Open Graph metadata. Используется Category, Collection и Product.
Заменяет старые per-entity SEO types; ProductSeo сохраняется как alias для backward compatibility.
Locale резолвится из request context header, без locale argument на field.
"""
type Seo {
  seoTitle: String
  seoDescription: String
  ogTitle: String
  ogDescription: String
  ogImage: File
}

input SeoInput {
  seoTitle: String
  seoDescription: String
  ogTitle: String
  ogDescription: String
  ogImageId: ID
}

"""Backward compatibility: existing Product.seo returns this. Same shape as Seo."""
type ProductSeo {
  seoTitle: String
  seoDescription: String
  ogTitle: String
  ogDescription: String
  ogImage: File
}

type CollectionMediaItem {
  file: File!
  sortIndex: Int!
}

enum SortDirection { ASC DESC }

input ProductFiltersInput {
  """
  Unified facet filters. Формат: 'facetSlug:valueSlug'.
  Работает для всех discrete facet types (tag, feature, option), резолвится через facet.slug + facet_value.slug, см. §3.4.
  Несколько values для одного facetSlug комбинируются через OR (overlap).
  Разные facetSlugs всегда AND-ed together.
  """
  facets: [String!]
  """
  Range facet filters.
  Phase 1 поддерживает только `price` facetSlug.
  Price также можно передавать через shorthand поля priceMinMinor/priceMaxMinor.
  Все price fields в minor units base currency магазина.
  """
  ranges: [FacetRangeFilterInput!]
  """Shorthand для price range filter. Эквивалент ranges: [{ facetSlug: "price", min: X, max: Y }]."""
  priceMinMinor: BigInt
  priceMaxMinor: BigInt
  inStock: Boolean
}

input FacetRangeFilterInput {
  """Slug RANGE-type facet. В Phase 1 валиден только 'price'."""
  facetSlug: String!
  min: BigInt
  max: BigInt
}

input ProductSortInput {
  by: ProductSortBy!
  direction: SortDirection
}

enum ProductSortBy { MANUAL PRICE NEWEST NAME }


"""Computed facet results для страницы product listing."""
type Facets {
  priceRange: PriceRange
  groups: [FacetResultGroup!]!
}

type FacetResultGroup {
  name: String
  collapsed: Boolean!
  facets: [FacetResult!]!
}

type FacetResult {
  facetType: FacetType!
  """Facet slug: используется в filter inputs как facetSlug часть 'facetSlug:valueSlug'."""
  slug: String!
  label: String!
  uiType: FacetUIType!
  selectionMode: FacetSelectionMode!
  values: [FacetResultValue!]!
  totalCount: Int!
}

type FacetResultValue {
  """Value slug: используется в filter inputs как valueSlug часть 'facetSlug:valueSlug'."""
  slug: String!
  label: String
  count: Int!
  """Swatch из FacetSwatch. Присутствует только когда у facet_value есть swatch override."""
  swatch: FacetSwatch
}

type PriceRange {
  minMinor: BigInt!
  maxMinor: BigInt!
}
```

### 7.5 Добавления CatalogQuery / CatalogMutation в `base.graphql`

```graphql
# CatalogQuery:
categoryProducts(categoryId: ID!, first: Int, after: String, last: Int, before: String, filters: ProductFiltersInput, sort: ProductSortInput): CategoryProductConnection!

collection(id: ID!): Collection
collectionByHandle(handle: String!): Collection
collections(first: Int, after: String, last: Int, before: String): CollectionConnection!

"""Preview: evaluate rules and return matching product count without creating a collection."""
collectionRulesPreviewCount(rules: [CollectionRuleInput!]!): Int!

facet(id: ID!): Facet
facets: [Facet!]!

facetValue(id: ID!): FacetValue
facetValues(facetId: ID!): [FacetValue!]!

facetSwatch(id: ID!): FacetSwatch
facetSwatches: [FacetSwatch!]!

# CatalogMutation:
collectionCreate(input: CollectionCreateInput!): CollectionCreatePayload!
collectionUpdate(input: CollectionUpdateInput!): CollectionUpdatePayload!
collectionDelete(input: CollectionDeleteInput!): CollectionDeletePayload!
collectionAddProducts(input: CollectionAddProductsInput!): CollectionAddProductsPayload!
collectionRemoveProducts(input: CollectionRemoveProductsInput!): CollectionRemoveProductsPayload!
collectionMoveProduct(input: CollectionMoveProductInput!): CollectionMoveProductPayload!
collectionUpdateRules(input: CollectionUpdateRulesInput!): CollectionUpdateRulesPayload!

facetCreate(input: FacetCreateInput!): FacetCreatePayload!
facetUpdate(input: FacetUpdateInput!): FacetUpdatePayload!
facetDelete(input: FacetDeleteInput!): FacetDeletePayload!

facetValueCreate(input: FacetValueCreateInput!): FacetValueCreatePayload!
facetValueUpdate(input: FacetValueUpdateInput!): FacetValueUpdatePayload!
facetValueDelete(input: FacetValueDeleteInput!): FacetValueDeletePayload!

facetSwatchCreate(input: FacetSwatchCreateInput!): FacetSwatchCreatePayload!
facetSwatchUpdate(input: FacetSwatchUpdateInput!): FacetSwatchUpdatePayload!
facetSwatchDelete(input: FacetSwatchDeleteInput!): FacetSwatchDeletePayload!

categoryMoveProduct(input: CategoryMoveProductInput!): CategoryMoveProductPayload!
categoryRebalance(input: CategoryRebalanceInput!): CategoryRebalancePayload!
categoryUpdateSort(input: CategoryUpdateSortInput!): CategoryUpdateSortPayload!
```

---

## 8. Алгоритм упорядочивания

Одинаковый подход `lexo_rank` для товаров категории и collection items.

**Manual sort:** `ORDER BY lexo_rank ASC`

**Alternative sorts:** `JOIN product_search_index` для price/created_at; `JOIN product_translation` для name, locale-aware. `lexo_rank` сохраняется для переключения обратно на manual.
Все non-manual sorts должны включать deterministic tie-breaker `product_id ASC` для стабильной Relay pagination.

**Drag & drop:** `newRank = midpoint(afterRank, beforeRank)`, single row UPDATE.

**Rebalance:** когда любой `lexo_rank` становится длиннее 48 chars, ranks всех items переназначаются равномерно.

---

## 9. Вычисление правил коллекции

Rules в `collection_rule` вычисляются в первую очередь относительно `product_search_index`, с variant-correct обработкой OPTION, `price` и `in_stock` через `variant_search_index`:

```sql
-- Compilation model:
-- 1) Product-level predicates are added directly to psi WHERE.
-- 2) All variant-bound predicates are merged into ONE EXISTS block.
--    This guarantees one-and-the-same variant satisfies option/price/in_stock together.
--
-- Product-level fields: tag, feature, category, created_at
-- Variant-bound fields: option, price, in_stock
--
-- Independent EXISTS per variant-bound rule is forbidden:
-- it can produce false positives across different variants.
--
-- Counterexample:
--   rule A: option in ['color:red']
--   rule B: price between [1000, 2000]
-- Product has variant V1(color:red, price=5000) and V2(color:blue, price=1500).
-- Two separate EXISTS return true, but no single variant satisfies A and B together.

SELECT psi.product_id
FROM product_search_index psi
WHERE psi.project_id = :projectId
  AND psi.status = 'published'

  -- Product-level rules
  AND (:tagInIsEmpty OR psi.tag_handles && :tagInValues::text[])
  AND (:tagAllIsEmpty OR psi.tag_handles @> :tagAllValues::text[])
  AND (:featureInIsEmpty OR psi.feature_slugs && :featureInValues::text[])
  AND (:categoryInIsEmpty OR psi.category_handles && :categoryInValues::text[])
  AND (:createdFrom IS NULL OR psi.created_at >= :createdFrom)
  AND (:createdTo   IS NULL OR psi.created_at <  :createdTo)

  -- Variant-bound rules (single EXISTS block, only when at least one is active)
  AND (
    NOT :hasVariantRules
    OR EXISTS (
      SELECT 1
      FROM variant_search_index vsi
      WHERE vsi.project_id = psi.project_id
        AND vsi.product_id = psi.product_id
        AND (:optionInIsEmpty OR vsi.option_slugs && :optionInValues::text[])
        AND vsi.price_currency = :priceCurrency
        AND (:priceMin IS NULL OR vsi.price_minor >= :priceMin)
        AND (:priceMax IS NULL OR vsi.price_minor <= :priceMax)
        AND (:inStock IS NULL OR vsi.in_stock = :inStock)
    )
  );

-- Operator semantics for array fields:
--   'in'       → && (overlap, ANY match)  — product has at least one of the values
--   'all'      → @> (contains, ALL match) — product has all of the values
--   'contains' → && (overlap)             — alias for 'in' on array fields
--
-- Scalar operator semantics:
--   field=price      : eq, gt, gte, lt, lte, between (on vsi.price_minor)
--   field=created_at : eq, gt, gte, lt, lte, between (on psi.created_at)
--   field=in_stock   : eq (on vsi.in_stock)
-- Any unsupported (field, operator) pair must fail validation in CollectionUpdateRulesScript.

-- { field: "tag", operator: "in", value: ["sale", "new-arrival"] }
--   → psi.tag_handles && ARRAY['sale','new-arrival']::text[]
--     (product has "sale" OR "new-arrival" — any match)

-- { field: "tag", operator: "all", value: ["sale", "new-arrival"] }
--   → psi.tag_handles @> ARRAY['sale','new-arrival']::text[]
--     (product has BOTH "sale" AND "new-arrival")

-- { field: "price", operator: "between", value: [1000, 5000] }
--   → inside the shared EXISTS:
--       vsi.price_minor BETWEEN 1000 AND 5000

-- { field: "in_stock", operator: "eq", value: true }
--   → inside the shared EXISTS:
--       vsi.in_stock = true

-- { field: "feature", operator: "in", value: ["material:cotton", "material:linen"] }
--   → psi.feature_slugs && ARRAY['material:cotton', 'material:linen']::text[]
--     (composite slug used directly — no facet_value lookup needed)

-- { field: "option", operator: "in", value: ["color:red", "color:blue"] }
--   → inside the shared EXISTS:
--       vsi.option_slugs && ARRAY['color:red', 'color:blue']::text[]

-- { field: "category", operator: "in", value: ["shoes", "running"] }
--   → psi.category_handles && ARRAY['shoes', 'running']::text[]

-- All rules AND-ed together
```

Поля `value` в rules хранят handles/slugs, не UUIDs: tag handles, composite option/feature slugs, category handles.

Все rules AND-ed together.

---

## 10. Broker-зависимости

Один внешний call:

```typescript
broker.call<Inventory.GetOffersResult, Inventory.GetOffersParams>(
  "inventory.getOffers", { storeId, variantIds }
);
```

Все остальное локально для catalog.

---

## 11. Порядок реализации

### Rollout contract (обязательно)

`ProductFiltersInput.facets` (`facetSlug:valueSlug`) нельзя expose, пока facet mapping не работает полностью.

Required atomic rollout slice:
1. DB + models для `facet`, `facet_value`, `facet_value_source_handle`
2. Admin CRUD и наполнение data для facet mappings
3. Runtime resolver `facetSlug:valueSlug -> source_handle[]`
4. Listing query integration с использованием resolved source handles
5. Public GraphQL exposure `ProductFiltersInput.facets`

До step 5 держать `facets` за feature flag или не включать в public schema.

### Phase 0: инфраструктура slug

У `product_option` и `product_option_value` уже есть columns `slug`. У `category` и `tag` уже есть columns `handle`. Slugs нужно добавить только для features.

**Текущие columns `product_feature`:** `id`, `project_id`, `product_id`, `index` (int[]), `is_group`, `parent_id`. Slug отсутствует.
**Текущие columns `product_feature_value`:** `id`, `project_id`, `feature_id`, `index` (int). Slug отсутствует.

1. **Добавить column `slug` в `product_feature`:**
   ```sql
   ALTER TABLE catalog.product_feature
     ADD COLUMN slug varchar(255) NOT NULL;
   CREATE UNIQUE INDEX product_feature_product_id_slug_uniq
     ON catalog.product_feature (product_id, slug);
   ```
   Тот же pattern, что `product_option.slug`: unique per product.

2. **Добавить column `slug` в `product_feature_value`:**
   ```sql
   ALTER TABLE catalog.product_feature_value
     ADD COLUMN slug varchar(255) NOT NULL;
   CREATE UNIQUE INDEX product_feature_value_feature_id_slug_uniq
     ON catalog.product_feature_value (feature_id, slug);
   ```
   Тот же pattern, что `product_option_value.slug`: unique per feature.

3. **Добавить slug validation utility** - shared helper для validation slug format (`^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`). Note: regex разрешает single-char slugs, например "s", "m", "l" для sizes.

4. **Backfill existing feature slugs** - one-time migration для legacy rows:
   - Slugs для существующих records генерируются только для migration bootstrap.
   - Runtime create/update остается frontend-provided slug only.
   - **Collision handling:** добавлять `-2`, `-3` и т.д. в том же parent scope.
   - Запустить как one-time data migration после schema migration.

5. **Обновить Drizzle models** - добавить `slug` в `productFeature` и `productFeatureValue` в `src/repositories/models/features.ts`.

6. **Обновить feature CRUD scripts** - требовать `slug` при create, разрешить update. Валидировать format и uniqueness.

7. **Сгенерировать и применить migration**

### Phase 1A: Search Index + Category Products

1. **Drizzle models:** `searchIndex.ts` - product_search_index
2. **Drizzle models:** `variantSearchIndex.ts` - variant_search_index
3. **Alter `product_category`:** добавить `lexo_rank`, backfill из `sortIndex`, переключить reads/writes на `lexo_rank`, затем удалить `sortIndex`
4. **Alter `category`:** добавить `default_sort`, `default_sort_direction`
5. **Category SEO:** добавить model `category_seo` + TranslationRepository + loader/resolver wiring
6. **Сгенерировать migration**
7. **SearchIndexRepository** - upsert, delete, base listing predicates
8. **VariantSearchIndexRepository** - upsert, delete, variant predicate helpers
9. **SyncProductIndexScript** - build index row from local data
10. **SyncVariantIndexScript** - upsert per-variant rows from local data + inventory broker
11. **Event handlers**:
    - productCreated -> sync both indexes for the full product
    - productUpdated -> sync both indexes using changed product + changed variants from partial payload
    - productDeleted -> delete from both indexes
12. **Category product scripts:** QueryCategoryProductsScript, CategoryMoveProductScript, CategoryRebalanceScript, CategoryUpdateSortScript
13. **Listing query foundation:** apply OPTION + `price` + `in_stock` через `variant_search_index` EXISTS/CTE; оставить TAG/FEATURE/STATUS product-level
14. **GraphQL:** extend Category type, add category product + sort/SEO mutations
15. **Resolvers & loaders**
16. **Build**
17. **Запустить one-time backfill/rebuild scripts для обоих indexes перед включением listing queries**
18. **Regenerate GraphQL admin generated types/resolver signatures и исправить compile errors**

### Phase 1B: фасеты

1. **Drizzle models:** `facet.ts`
2. **Сгенерировать migration**
3. **Facet repositories:** FacetRepository, FacetValueRepository, FacetSwatchRepository
4. **Facet scripts:** Facet CRUD, FacetValue CRUD, FacetSwatch CRUD, ResolveFacetsScript
5. **Listing integration, требуется до public `filters.facets`:** переключить listing facet resolution/counting на configured `facet`/`facet_value` mappings, включая `facetSlug:valueSlug -> source_handle[]` resolution
6. **GraphQL:** facet.graphql (FacetValue + FacetSwatch), add to CatalogQuery/CatalogMutation
7. **Resolvers & loaders**
8. **Build**
9. **Regenerate GraphQL admin generated types/resolver signatures и исправить compile errors**

### Phase 1C: коллекции

1. **Drizzle models:** `collection.ts`
2. **Сгенерировать migration**
3. **Collection repositories:** CollectionRepository, CollectionItemRepository, CollectionRuleRepository
4. **Collection scripts:** CRUD, add/remove/move/rebalance (manual), rules (rule), QueryCollectionProductsScript; implement rule compiler split (`product-level` vs `variant-level`) with single shared `EXISTS` for all variant-level predicates
5. **GraphQL:** collection.graphql (inputs incl. SEO/media), add to CatalogQuery/CatalogMutation
6. **Resolvers & loaders**
7. **Build**
8. **Regenerate GraphQL admin generated types/resolver signatures и исправить compile errors**

---

## 12. Reference files внутри Catalog

| Pattern | Reference File |
|---------|---------------|
| Drizzle model | `src/repositories/models/categories.ts` |
| Repository | `src/repositories/category/CategoryRepository.ts` |
| Repository aggregator | `src/repositories/Repository.ts` |
| Script | `src/scripts/product/ProductCreateScript.ts` |
| Event handler | `src/handlers/index.ts` |
| GraphQL schema | `api/graphql-admin/schema/category.graphql` |
| Resolver (type) | `src/resolvers/admin/CategoryResolver.ts` |
| Resolver (query) | `src/resolvers/admin/QueryResolver.ts` |
| Resolver (mutation) | `src/resolvers/admin/MutationResolver.ts` |
| Loader | `src/loaders/CategoryLoader.ts` |
| Translation model | `src/repositories/models/translations.ts` |
| SEO model | `src/repositories/models/seo.ts` |
| Media model | `src/repositories/models/media.ts` |
| Broker types | `packages/broker-types/src/actions/inventory.ts` |
| Event types | `packages/events/src/types.ts` |
