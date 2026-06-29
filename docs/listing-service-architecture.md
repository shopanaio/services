# Архитектура сервиса листинга

Высокопроизводительный товарный листинг с фасетной фильтрацией, полнотекстовым поиском и персонализированным ранжированием через Metarank.

## Обзор

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Сервис листинга                               │
│                              (Node.js)                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                 ┌──────────────────┴──────────────────┐
                 ▼                                     ▼
┌─────────────────────────────┐         ┌─────────────────────────────────┐
│         PostgreSQL          │         │           Typesense             │
│                             │         │                                 │
│  • Фасеты (GIN-индексы)     │         │  • Полнотекстовый поиск (BM25)      │
│  • Фильтры (цена, склад)   │         │  • Толерантность к опечаткам               │
│  • Подсчеты фасетов             │         │  • Поддержка нескольких языков       │
│  • Источник истины          │         │  • Оценки релевантности         │
└─────────────────────────────┘         └─────────────────────────────────┘
                 │                                     │
                 └──────────────────┬──────────────────┘
                                    ▼
                              ┌───────────┐
                              │ Пересечение │
                              └───────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────────┐
                    │           Metarank              │
                    │    (Персонализированное ранжирование)       │
                    │                                 │
                    │  • Модели LightGBM / XGBoost    │
                    │  • Real-time персонализация    │
                    │  • Обучение на кликах/покупках      │
                    └─────────────────────────────────┘
```

## Компоненты

### 1. PostgreSQL - фасетная фильтрация

Отвечает за всю структурированную фильтрацию и подсчет фасетов через GIN-индексы для операций с массивами.

**Зоны ответственности:**
- Фильтрация по категориям, тегам, характеристикам и опциям
- Фильтрация по ценовому диапазону и наличию на складе
- Подсчет значений фасетов для UI
- Источник истины для товарных данных

### 2. Typesense - полнотекстовый поиск

Отдельный поисковый движок для текстовых запросов с учетом опечаток и поддержкой нескольких языков.

**Зоны ответственности:**
- BM25-поиск по названиям и описаниям товаров
- Толерантность к опечаткам ("nikee" -> "nike")
- Поддержка нескольких локалей (uk, en, ru)
- Возврат оценок релевантности для ранжирования

### 3. Metarank (персонализированное ранжирование)

Открытый feature store и сервис ранжирования для real-time персонализации.

**Зоны ответственности:**
- Переранжирование кандидатов обученными моделями (LightGBM/XGBoost)
- Объединение BM25-оценок с поведенческими сигналами
- Real-time персонализация на основе истории пользователя
- Обучение на кликах, добавлениях в корзину и покупках

**Ссылки:**
- GitHub: https://github.com/metarank/metarank
- Документация: https://docs.metarank.ai

---

## Схема базы данных

### PostgreSQL: индекс поиска товаров

```sql
-- =============================================================
-- Сервис листинга: индекс поиска товаров
-- Только фасеты и фильтры, без текстового контента
-- =============================================================

CREATE TABLE product_search_index (
    -- Идентификаторы
    project_id uuid NOT NULL,
    product_id uuid PRIMARY KEY,

    -- =========================================================
    -- PRICE
    -- =========================================================
    min_price_minor bigint,              -- минимальная цена варианта в центах
    max_price_minor bigint,              -- максимальная цена варианта в центах

    -- =========================================================
    -- STOCK
    -- =========================================================
    in_stock boolean NOT NULL DEFAULT false,
    total_stock int NOT NULL DEFAULT 0,

    -- =========================================================
    -- ФАСЕТЫ (массивы с GIN-индексами)
    -- =========================================================

    -- UUID тегов для фильтрации
    tag_ids uuid[] DEFAULT '{}',

    -- Характеристики в виде строк "slug:value"
    -- Пример: ['brand:nike', 'material:leather', 'gender:men']
    feature_slugs text[] DEFAULT '{}',

    -- Опции в виде строк "slug:value"
    -- Пример: ['color:red', 'size:xl', 'size:l']
    option_slugs text[] DEFAULT '{}',

    -- Все ID категорий, включая родительские категории
    category_ids uuid[] DEFAULT '{}',

    -- =========================================================
    -- СИГНАЛЫ СОРТИРОВКИ
    -- =========================================================
    popularity_score float NOT NULL DEFAULT 0,   -- 0-1, из аналитики
    published_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),

    -- =========================================================
    -- МЕТАДАННЫЕ СИНХРОНИЗАЦИИ
    -- =========================================================
    updated_at timestamptz NOT NULL DEFAULT now(),

    -- =========================================================
    -- ОГРАНИЧЕНИЯ
    -- =========================================================
    CONSTRAINT fk_product FOREIGN KEY (product_id)
        REFERENCES product(id) ON DELETE CASCADE
);

-- =============================================================
-- ИНДЕКСЫ
-- =============================================================

-- Изоляция проекта (все запросы фильтруются по project_id)
CREATE INDEX idx_psi_project ON product_search_index (project_id);

-- GIN-индексы для containment/overlap-запросов по массивам
CREATE INDEX idx_psi_tags ON product_search_index USING GIN (tag_ids);
CREATE INDEX idx_psi_features ON product_search_index USING GIN (feature_slugs);
CREATE INDEX idx_psi_options ON product_search_index USING GIN (option_slugs);
CREATE INDEX idx_psi_categories ON product_search_index USING GIN (category_ids);

-- Запросы по ценовому диапазону
CREATE INDEX idx_psi_price_range ON product_search_index (project_id, min_price_minor, max_price_minor);

-- Фильтр наличия на складе (partial index для товаров в наличии)
CREATE INDEX idx_psi_in_stock ON product_search_index (project_id, in_stock)
    WHERE in_stock = true;

-- Индексы сортировки
CREATE INDEX idx_psi_popularity ON product_search_index (project_id, popularity_score DESC);
CREATE INDEX idx_psi_published ON product_search_index (project_id, published_at DESC NULLS LAST);
CREATE INDEX idx_psi_price_asc ON product_search_index (project_id, min_price_minor ASC);
CREATE INDEX idx_psi_price_desc ON product_search_index (project_id, min_price_minor DESC);
CREATE INDEX idx_psi_created ON product_search_index (project_id, created_at DESC);
```

### Typesense: текстовая коллекция товаров

```json
{
  "name": "products",
  "fields": [
    {"name": "id", "type": "string"},
    {"name": "project_id", "type": "string", "facet": false},

    {"name": "title_uk", "type": "string", "locale": "uk"},
    {"name": "title_en", "type": "string", "locale": "en", "optional": true},
    {"name": "title_ru", "type": "string", "locale": "ru", "optional": true},

    {"name": "description_uk", "type": "string", "locale": "uk", "optional": true},
    {"name": "description_en", "type": "string", "locale": "en", "optional": true},
    {"name": "description_ru", "type": "string", "locale": "ru", "optional": true},

    {"name": "keywords", "type": "string", "optional": true}
  ],
  "token_separators": ["-", "_"],
  "symbols_to_index": ["&"]
}
```

---

## Поток запроса

### Стратегия параллельного выполнения

```
Запрос: GET /products?q=nike&category=shoes&color=red&in_stock=true&locale=uk

t=0ms   ──┬── PostgreSQL: стартует фасетная фильтрация
          └── Typesense: стартует текстовый поиск (параллельно)

t=15ms ──── Typesense возвращает: 2 000 ID + BM25-оценки

t=20ms ──── PostgreSQL возвращает: 5 000 ID, подходящих под фильтры
          │
t=21ms ──── Пересечение: 800 ID (присутствуют в обоих результатах)
          │
          ├── PostgreSQL: стартует запрос подсчета фасетов (параллельно)
          └── Metarank: стартует персонализированное ранжирование (параллельно)

t=35ms ──── Подсчеты фасетов готовы

t=50ms ──── Metarank возвращает: top 50 персонализированных ID
          │
t=51ms ──── Ответ отправлен клиенту

Итого: ~51ms (против ~95ms при последовательном выполнении)
```

### Диаграмма потока

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. ПАРАЛЛЕЛЬНО: PostgreSQL + Typesense                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   PostgreSQL                          Typesense                     │
│   ┌─────────────────────┐            ┌─────────────────────┐        │
│   │ SELECT product_id   │            │ POST /search        │        │
│   │ FROM psi            │            │ q: "nike"           │        │
│   │ WHERE               │            │ query_by: title_uk  │        │
│   │   category @> [X]   │            │ filter_by:          │        │
│   │   AND options @>    │            │   project_id: X     │        │
│   │     ['color:red']   │            │                     │        │
│   │   AND in_stock      │            │                     │        │
│   └─────────────────────┘            └─────────────────────┘        │
│            │                                   │                    │
│            ▼                                   ▼                    │
│   [id1,id2,id3,id4,id5...]          [id2,id3,id6,id7...] + scores  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. ПЕРЕСЕЧЕНИЕ                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   pgSet = new Set(pgIDs)                                            │
│   result = tsIDs.filter(id => pgSet.has(id))                        │
│                                                                     │
│   → [id2, id3] (сохраняет порядок Typesense по BM25)                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. ПАРАЛЛЕЛЬНО: подсчет фасетов + Metarank                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   PostgreSQL                          Metarank                      │
│   ┌─────────────────────┐            ┌─────────────────────┐        │
│   │ SELECT              │            │ POST /rank/:model   │        │
│   │   unnest(tag_ids),  │            │ {                   │        │
│   │   count(*)          │            │   user: "user123",  │        │
│   │ FROM psi            │            │   session: "sess1", │        │
│   │ WHERE product_id    │            │   items: [...]      │        │
│   │   = ANY($matched)   │            │ }                   │        │
│   │ GROUP BY 1          │            │                     │        │
│   └─────────────────────┘            └─────────────────────┘        │
│            │                                   │                    │
│            ▼                                   ▼                    │
│   { tag_a: 15, tag_b: 8 }            [id3, id2] (персонализировано)     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. ОТВЕТ                                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   {                                                                 │
│     "products": ["id3", "id2"],                                     │
│     "facets": {                                                     │
│       "tags": [{"id": "tag_a", "count": 15}, ...],                  │
│       "features": [...],                                            │
│       "options": [...]                                              │
│     },                                                              │
│     "total": 800                                                    │
│   }                                                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Инкрементальный recall с условиями остановки

### Проблема

Typesense возвращает только первые N кандидатов, отсортированных по BM25. После пересечения с PostgreSQL-фильтрами может остаться слишком мало результатов, хотя релевантные товары есть ниже в ранжировании Typesense.

Пример: пользователь ищет "nike red women" с фильтрами. Typesense возвращает 2000 кандидатов, но только 50 проходят PostgreSQL-фильтры. При этом еще 500 подходящих товаров находятся на позициях 2001-10000.

### Решение

Инкрементально загружать страницы из Typesense, пока не будет достаточно результатов или пока не сработает условие остановки.

### Цель

- Получить минимум `offset + limit` товаров после фильтрации
- Сохранить корректный порядок BM25-ранжирования
- Предсказуемое время выполнения (50-120ms)
- Без бесконечных циклов и DDoS-нагрузки на Typesense

### Параметры алгоритма

```typescript
interface IncrementalRecallConfig {
  target: number;           // offset + limit (сколько результатов нужно)
  perPage: number;          // кандидатов на страницу Typesense (500-2000)
  maxPages: number;         // максимум страниц для загрузки (5-10)
  timeout: number;          // защитный timeout в ms (50-100)
  stopEarlyFactor: number;  // порог плотности (0.1-0.2)
}
```

### Шаги алгоритма

#### Шаг 0: подготовка

```typescript
const pgSet = new Set(await queryPostgres(filters)); // Получить все подходящие ID из PostgreSQL
const matched: TypesenseHit[] = [];
let page = 1;
let candidateCount = 0;
const startTime = Date.now();
```

#### Шаг 1: загрузить первую страницу

```typescript
const tsResult = await typesense.search({ page: 1, per_page: perPage });
candidateCount += tsResult.hits.length;
const intersected = tsResult.hits.filter(hit => pgSet.has(hit.id));
matched.push(...intersected);
```

Проверить условия остановки.

#### Шаг 2: основной цикл

```typescript
while (!shouldStop()) {
  page++;
  const tsResult = await typesense.search({ page, per_page: perPage });

  if (tsResult.hits.length === 0) break; // Typesense исчерпан

  candidateCount += tsResult.hits.length;
  const intersected = tsResult.hits.filter(hit => pgSet.has(hit.id));
  matched.push(...intersected);
}
```

### Условия остановки

Цикл останавливается, когда выполняется ЛЮБОЕ из условий:

#### 1. Достаточно результатов

```typescript
if (matched.length >= target) STOP;
```

#### 2. Typesense исчерпан

```typescript
if (hits.length < perPage) STOP; // Достигнут конец результатов
```

#### 3. Достигнут максимум страниц

```typescript
if (page >= maxPages) STOP;
```

#### 4. Защитный timeout

```typescript
if (Date.now() - startTime > timeout) STOP;
```

#### 5. Адаптивная ранняя остановка

Если плотность пересечения высокая (много результатов на страницу), можно остановиться раньше:

```typescript
// Если эта страница дала много результатов, скорее всего diversity уже достаточно
if (intersected.length >= perPage * stopEarlyFactor) {
  // Высокая плотность - можно остановиться, если результатов достаточно
  if (matched.length >= target * 1.5) STOP;
}
// Если плотность низкая, продолжаем загружать страницы
```

### Диаграмма потока

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Поток incremental recall                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   PostgreSQL                    Typesense                                │
│   ┌──────────────────┐         ┌──────────────────────────────────────┐ │
│   │ Получить все подходящие │         │ Page 1: hits[0..999]     ──────┐     │ │
│   │ ID товаров      │         │ Page 2: hits[1000..1999] ──────┼──┐  │ │
│   │                  │         │ Page 3: hits[2000..2999] ──────┼──┼─┐│ │
│   │ → pgSet (5000)   │         │ ...                            │  │ ││ │
│   └────────┬─────────┘         └────────────────────────────────┼──┼─┼┘ │
│            │                                                    │  │ │  │
│            └────────────────────────┬───────────────────────────┘  │ │  │
│                                     ▼                              │ │  │
│                              ┌─────────────┐                       │ │  │
│                              │ Пересечение 1 │ ◄─────────────────────┘ │  │
│                              └──────┬──────┘                         │  │
│                                     │ matched += 80                  │  │
│                                     │                                │  │
│                                     │ matched.length < target?       │  │
│                                     │ YES → fetch next page          │  │
│                                     ▼                                │  │
│                              ┌─────────────┐                         │  │
│                              │ Пересечение 2 │ ◄───────────────────────┘  │
│                              └──────┬──────┘                            │
│                                     │ matched += 65                     │
│                                     │                                   │
│                                     │ matched.length >= target?         │
│                                     │ YES → STOP                        │
│                                     ▼                                   │
│                              ┌─────────────┐                            │
│                              │ Результат: 145 │                            │
│                              │ (отсортировано по  │                            │
│                              │  BM25 rank) │                            │
│                              └─────────────┘                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Реализация на TypeScript

```typescript
interface IncrementalRecallResult {
  hits: TypesenseHit[];
  metrics: {
    pagesLoaded: number;
    candidatesTotal: number;
    intersectionTotal: number;
    timeMs: number;
  };
}

async function incrementalRecall(
  req: SearchRequest,
  pgSet: Set<string>,
  config: IncrementalRecallConfig
): Promise<IncrementalRecallResult> {
  const { target, perPage, maxPages, timeout, stopEarlyFactor } = config;

  const matched: TypesenseHit[] = [];
  let page = 0;
  let candidateCount = 0;
  const startTime = Date.now();

  const queryBy = [`title_${req.locale}`, `description_${req.locale}`, 'keywords'].join(',');

  while (true) {
    page++;

    // Загрузить следующую страницу из Typesense
    const tsResult = await typesense.collections('products').documents().search({
      q: req.query!,
      query_by: queryBy,
      filter_by: `project_id:${req.projectId}`,
      page,
      per_page: perPage,
      prefix: false,
    });

    const hits = (tsResult.hits ?? []).map(hit => ({
      id: hit.document.id as string,
      score: hit.text_match_info?.score ?? 0,
    }));

    candidateCount += hits.length;

    // Пересечь с множеством PostgreSQL
    const intersected = hits.filter(hit => pgSet.has(hit.id));
    matched.push(...intersected);

    // Рассчитать плотность для адаптивной остановки
    const density = hits.length > 0 ? intersected.length / hits.length : 0;

    // Условие остановки 1: достаточно результатов
    if (matched.length >= target) break;

    // Условие остановки 2: Typesense исчерпан
    if (hits.length < perPage) break;

    // Условие остановки 3: максимум страниц
    if (page >= maxPages) break;

    // Условие остановки 4: timeout
    if (Date.now() - startTime > timeout) break;

    // Условие остановки 5: высокая плотность + буфер
    if (density >= stopEarlyFactor && matched.length >= target * 1.5) break;
  }

  return {
    hits: matched,
    metrics: {
      pagesLoaded: page,
      candidatesTotal: candidateCount,
      intersectionTotal: matched.length,
      timeMs: Date.now() - startTime,
    },
  };
}
```

### Интеграция с ListingService

```typescript
// В ListingService.search()

private async queryTypesenseIncremental(
  req: SearchRequest,
  pgSet: Set<string>,
  target: number
): Promise<{ hits: TypesenseHit[] }> {
  const config: IncrementalRecallConfig = {
    target,
    perPage: 1000,
    maxPages: 10,
    timeout: 100,
    stopEarlyFactor: 0.15,
  };

  const result = await this.incrementalRecall(req, pgSet, config);

  // Логировать метрики для мониторинга
  this.logger.info({
    query: req.query,
    pages: result.metrics.pagesLoaded,
    candidates: result.metrics.candidatesTotal,
    matched: result.metrics.intersectionTotal,
    timeMs: result.metrics.timeMs,
  }, 'incremental_recall_complete');

  return { hits: result.hits };
}
```

### Метрики

```typescript
// Метрики Prometheus
listing_recall_pages_total              // Всего загружено страниц
listing_recall_candidates_total         // Всего кандидатов Typesense
listing_recall_intersection_total       // Подходящие после пересечения
listing_recall_duration_ms              // Время, потраченное на фазу recall
listing_recall_density                  // Соотношение пересечения к кандидатам
listing_recall_stop_reason{reason}      // Почему цикл остановился (enough/exhausted/timeout/pages/density)
```

### Преимущества

| Преимущество | Описание |
|---------|-------------|
| Нет потерянных результатов | Релевантные товары за пределами первой страницы находятся |
| Ограниченная задержка | Timeout и лимиты страниц не дают запросам становиться медленными |
| Предсказуемая нагрузка | Максимум кандидатов = perPage x maxPages |
| Дружественно к ML | Достаточное разнообразие кандидатов для Metarank |
| Наблюдаемость | Метрики показывают поведение recall |

### Рекомендуемая конфигурация

| Размер каталога | perPage | maxPages | timeout | stopEarlyFactor |
|--------------|---------|----------|---------|-----------------|
| < 10k | 500 | 5 | 50ms | 0.2 |
| 10k-100k | 1000 | 8 | 80ms | 0.15 |
| 100k-1M | 2000 | 10 | 100ms | 0.1 |
| > 1M | 2000 | 10 | 100ms | 0.1 + Redis cache |

---

## Стратегия сортировки

| `sortBy` | Metarank | Typesense | PostgreSQL ORDER BY | Описание |
|----------|----------|-----------|---------------------|-------------|
| `recommended` | да | нет | `popularity_score DESC` | Персонализированный просмотр, Metarank переранжирует лучших кандидатов |
| `relevance` | да | да | - | Текстовый поиск + персонализация: BM25-оценки -> Metarank |
| `price_asc` | нет | нет* | `min_price_minor ASC` | Строгий порядок по цене |
| `price_desc` | нет | нет* | `min_price_minor DESC` | Строгий порядок по цене |
| `newest` | нет | нет* | `published_at DESC` | Строгий порядок по дате |
| `popularity` | нет | нет* | `popularity_score DESC` | Предварительно рассчитанная популярность |

\* Typesense все равно используется при текстовом запросе, но только для фильтрации (пересечения), а не для сортировки.

### Почему не всегда использовать Metarank?

1. **Намерение пользователя**: когда пользователь выбирает "Цена: от низкой к высокой", он ожидает именно такой порядок
2. **Задержка**: Metarank добавляет ~30ms, что лишнее для строгих сортировок
3. **Предсказуемость**: пользователи ожидают стабильный порядок при сортировке по цене/дате

### Поток по sortBy

```
┌─────────────────────────────────────────────────────────────────┐
│                        sortBy = recommended                     │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL (фасеты) ──────────────────┐                        │
│                                        ├──► Metarank ──► Результат │
│  (без Typesense, без query)              │                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  sortBy = relevance + query                     │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL (фасеты) ───┐                                       │
│                         ├──► Пересечение ──► Metarank ──► Result  │
│  Typesense (BM25) ──────┘                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       sortBy = price_asc                        │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL (фасеты + ORDER BY price) ─────────────────► Result │
│                                                                 │
│  (без Metarank, уже отсортировано)                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  sortBy = price_asc + query                     │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL (фасеты) ───┐                                       │
│                         ├──► Пересечение ──► Сортировка по цене ──► Результат
│  Typesense (фильтр) ────┘                                       │
│                                                                 │
│  (Typesense только для фильтрации, затем пересортировка по цене)         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Технологический стек

- **Среда выполнения**: Node.js
- **База данных**: PostgreSQL + Knex.js (query builder)
- **Поиск**: Typesense
- **Ранжирование**: Metarank
- **Кеш + очередь**: Redis + BullMQ
- **API**: GraphQL (Apollo Federation)
- **HTTP**: Fastify

---

## GraphQL Federation

Сервис листинга экспонирует категории и ID товаров. Полные товарные данные резолвятся через Federation из Inventory service.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Apollo Gateway                              │
│                    (Admin / Storefront API)                         │
└─────────────────────────────────────────────────────────────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ Сервис листинга │   │Inventory Service│   │ Другие сервисы │
│                 │   │                 │   │                 │
│ • Категории     │   │ • Product       │   │ • Orders        │
│ • Поиск         │   │ • Variant       │   │ • Users         │
│ • Фасеты        │   │ • Pricing       │   │ • ...           │
│ • Product IDs   │   │ • Stock         │   │                 │
│   (references)  │   │ • Images        │   │                 │
└─────────────────┘   └─────────────────┘   └─────────────────┘
```

### Схема (сервис листинга)

```graphql
# listing/schema.graphql

extend schema
  @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@external", "@requires", "@shareable"])

# =============================================================
# Product reference (резолвится Inventory service)
# =============================================================

type Product @key(fields: "id", resolvable: false) {
  id: ID!
}

# =============================================================
# Категории
# =============================================================

type Category @key(fields: "id") {
  id: ID!
  slug: String!
  parentId: ID
  parent: Category
  children: [Category!]!

  # Листинг с фильтрами
  products(
    filter: ProductFilterInput
    sort: ProductSortInput
    pagination: PaginationInput
  ): ProductListingResult!
}

# =============================================================
# Поиск и листинг
# =============================================================

type Query {
  # Поиск товаров по всем категориям
  searchProducts(input: SearchProductsInput!): ProductListingResult!

  # Получить категорию по ID или slug
  category(id: ID, slug: String): Category

  # Получить дерево категорий
  categories(parentId: ID): [Category!]!
}

# =============================================================
# Входные типы
# =============================================================

input SearchProductsInput {
  query: String
  locale: Locale!
  categoryIds: [ID!]
  tagIds: [ID!]
  features: [String!]      # ["brand:nike", "material:leather"]
  options: [String!]       # ["color:red", "size:xl"]
  minPrice: Int
  maxPrice: Int
  inStock: Boolean
  sort: ProductSortInput
  pagination: PaginationInput
}

input ProductFilterInput {
  tagIds: [ID!]
  features: [String!]
  options: [String!]
  minPrice: Int
  maxPrice: Int
  inStock: Boolean
}

input ProductSortInput {
  field: ProductSortField!
  direction: SortDirection!
}

enum ProductSortField {
  RELEVANCE
  PRICE
  POPULARITY
  NEWEST
}

enum SortDirection {
  ASC
  DESC
}

input PaginationInput {
  limit: Int = 50
  offset: Int = 0
}

enum Locale {
  UK
  EN
  RU
}

# =============================================================
# Результаты
# =============================================================

type ProductListingResult {
  # ID товаров (резолвятся в полный Product через Inventory/Federation)
  products: [Product!]!

  # Counts фасетов для UI фильтров
  facets: Facets!

  # Общее количество (для пагинации)
  total: Int!
}

type Facets {
  tags: [FacetCount!]!
  features: [FacetCount!]!
  options: [FacetCount!]!
  categories: [FacetCount!]!
  priceRanges: [PriceRangeFacet!]!
}

type FacetCount {
  value: String!
  label: String
  count: Int!
}

type PriceRangeFacet {
  min: Int!
  max: Int!
  count: Int!
}
```

### Резолверы

```typescript
// graphql/resolvers.ts

import { Resolvers } from './generated/types';
import { ListingService } from '../listing.service';
import { Kernel } from '../kernel';

export function createResolvers(kernel: Kernel): Resolvers {
  const listingService = new ListingService(kernel);

  return {
    Query: {
      searchProducts: async (_, { input }, ctx) => {
        const result = await listingService.search({
          projectId: ctx.projectId,
          locale: input.locale.toLowerCase(),
          query: input.query,
          userId: ctx.userId,
          sessionId: ctx.sessionId,
          categoryIds: input.categoryIds,
          tagIds: input.tagIds,
          features: input.features,
          options: input.options,
          minPrice: input.minPrice,
          maxPrice: input.maxPrice,
          inStock: input.inStock,
          sortBy: mapSort(input.sort),
          limit: input.pagination?.limit ?? 50,
          offset: input.pagination?.offset ?? 0,
        });

        return {
          // Вернуть product references (Federation резолвит полные данные)
          products: result.productIds.map(id => ({ __typename: 'Product', id })),
          facets: result.facets,
          total: result.total,
        };
      },

      category: async (_, { id, slug }, ctx) => {
        return kernel.db('category')
          .where('project_id', ctx.projectId)
          .where(builder => {
            if (id) builder.where('id', id);
            if (slug) builder.where('slug', slug);
          })
          .whereNull('deleted_at')
          .first();
      },

      categories: async (_, { parentId }, ctx) => {
        return kernel.db('category')
          .where('project_id', ctx.projectId)
          .where('parent_id', parentId ?? null)
          .whereNull('deleted_at')
          .orderBy('sort_order');
      },
    },

    Category: {
      parent: async (category, _, ctx) => {
        if (!category.parent_id) return null;
        return kernel.db('category')
          .where('id', category.parent_id)
          .first();
      },

      children: async (category, _, ctx) => {
        return kernel.db('category')
          .where('parent_id', category.id)
          .whereNull('deleted_at')
          .orderBy('sort_order');
      },

      products: async (category, { filter, sort, pagination }, ctx) => {
        const result = await listingService.search({
          projectId: ctx.projectId,
          locale: ctx.locale,
          categoryIds: [category.id],
          tagIds: filter?.tagIds,
          features: filter?.features,
          options: filter?.options,
          minPrice: filter?.minPrice,
          maxPrice: filter?.maxPrice,
          inStock: filter?.inStock,
          sortBy: mapSort(sort),
          limit: pagination?.limit ?? 50,
          offset: pagination?.offset ?? 0,
        });

        return {
          products: result.productIds.map(id => ({ __typename: 'Product', id })),
          facets: result.facets,
          total: result.total,
        };
      },
    },

    // Federation: резолвить Product references
    Product: {
      __resolveReference: (ref) => {
        // Вернуть reference как есть, Inventory service его зарезолвит
        return { id: ref.id };
      },
    },
  };
}

function mapSort(sort?: { field: string; direction: string }): string | undefined {
  if (!sort) return 'recommended';

  const field = sort.field.toLowerCase();
  const dir = sort.direction.toLowerCase();

  if (field === 'relevance') return 'relevance';
  if (field === 'price') return dir === 'asc' ? 'price_asc' : 'price_desc';
  if (field === 'popularity') return 'popularity';
  if (field === 'newest') return 'newest';

  return 'recommended';
}
```

### Настройка Apollo Server

```typescript
// graphql/server.ts

import { ApolloServer } from '@apollo/server';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { fastifyApolloDrainPlugin } from '@as-integrations/fastify';
import { gql } from 'graphql-tag';
import { readFileSync } from 'fs';
import { createResolvers } from './resolvers';
import { Kernel } from '../kernel';

export async function createGraphQLServer(kernel: Kernel, app: FastifyInstance) {
  const typeDefs = gql(readFileSync('./schema.graphql', 'utf-8'));
  const resolvers = createResolvers(kernel);

  const server = new ApolloServer({
    schema: buildSubgraphSchema({ typeDefs, resolvers }),
    plugins: [fastifyApolloDrainPlugin(app)],
  });

  await server.start();

  return server;
}
```

### Примеры запросов

**Storefront: поиск с фасетами**
```graphql
query SearchProducts($input: SearchProductsInput!) {
  searchProducts(input: $input) {
    products {
      id
      # Эти поля резолвятся Inventory service через Federation:
      title
      slug
      images { url }
      price { amount currency }
      inStock
    }
    facets {
      tags { value label count }
      features { value count }
      options { value count }
      priceRanges { min max count }
    }
    total
  }
}
```

**Storefront: страница категории**
```graphql
query CategoryPage($slug: String!, $filter: ProductFilterInput, $pagination: PaginationInput) {
  category(slug: $slug) {
    id
    slug
    children { id slug }

    products(filter: $filter, pagination: $pagination) {
      products {
        id
        title
        price { amount }
      }
      facets {
        options { value count }
      }
      total
    }
  }
}
```

**Admin: управление категориями**
```graphql
# Admin mutations будут в отдельной admin schema
mutation CreateCategory($input: CreateCategoryInput!) {
  createCategory(input: $input) {
    id
    slug
  }
}
```

### Поток Federation

```
1. Client -> Gateway: searchProducts(query: "nike")

2. Gateway -> Listing:
   searchProducts возвращает { products: [{ id: "p1" }, { id: "p2" }], facets, total }

3. Gateway -> Inventory (Federation):
   Резолвит Product entities по ID
   Возвращает полные товарные данные (title, images, price и т.д.)

4. Gateway -> Client:
   Объединенный response с полными товарными данными + фасетами
```

---

## Реализация на Node.js

### Типы

```typescript
// types.ts

export interface SearchRequest {
  projectId: string;
  locale: 'uk' | 'en' | 'ru';

  // Текстовый поиск
  query?: string;

  // Персонализация (для Metarank)
  userId?: string;
  sessionId?: string;

  // Фасетные фильтры
  categoryIds?: string[];
  tagIds?: string[];
  features?: string[];      // ['brand:nike', 'material:leather']
  options?: string[];       // ['color:red', 'size:xl']

  // Диапазонные фильтры
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;

  // Сортировка
  // - recommended: персонализация Metarank (default)
  // - relevance: BM25 + Metarank (когда есть query)
  // - price_asc/price_desc/newest: строгая DB-сортировка, без Metarank
  sortBy?: 'recommended' | 'relevance' | 'price_asc' | 'price_desc' | 'popularity' | 'newest';

  // Пагинация
  limit?: number;
  offset?: number;
}

export interface SearchResponse {
  productIds: string[];
  facets: FacetResults;
  total: number;
}

export interface FacetResults {
  tags: FacetCount[];
  features: FacetCount[];
  options: FacetCount[];
  categories: FacetCount[];
  priceRanges: PriceRangeFacet[];
}

export interface FacetCount {
  value: string;
  count: number;
}

export interface PriceRangeFacet {
  min: number;
  max: number;
  count: number;
}

export interface TypesenseHit {
  id: string;
  score: number;
}

// Типы Metarank API
// См.: https://docs.metarank.ai/reference/api

export interface MetarankItem {
  id: string;
  // Значения features, извлеченные из product
  price?: number;
  popularity?: number;
  bm25_score?: number;
  in_stock?: boolean;
  // Добавить больше features при необходимости
}

export interface MetarankRankRequest {
  user?: string;           // ID пользователя для персонализации
  session?: string;        // ID сессии
  items: MetarankItem[];   // Items для ранжирования
}

export interface MetarankRankResponse {
  items: Array<{
    id: string;
    score: number;
  }>;
  took: number;
}
```

### Kernel (контейнер зависимостей)

```typescript
// kernel/index.ts

import Knex from 'knex';
import { Redis } from 'ioredis';
import { Queue } from 'bullmq';
import Typesense from 'typesense';
import pino from 'pino';

export interface Kernel {
  db: Knex;
  redis: Redis;
  syncQueue: Queue;
  typesense: Typesense.Client;
  metarankUrl: string;
  metarankModel: string;
  logger: pino.Logger;
}

export async function createKernel(): Promise<Kernel> {
  const db = Knex({
    client: 'pg',
    connection: process.env.DATABASE_URL,
    pool: { min: 2, max: 20 },
  });

  const redis = new Redis(process.env.REDIS_URL);

  const typesense = new Typesense.Client({
    nodes: [{
      host: process.env.TYPESENSE_HOST ?? 'localhost',
      port: 8108,
      protocol: 'http'
    }],
    apiKey: process.env.TYPESENSE_API_KEY!,
  });

  return {
    db,
    redis,
    syncQueue: new Queue('sync', { connection: redis }),
    typesense,
    metarankUrl: process.env.METARANK_URL ?? 'http://localhost:8080',
    metarankModel: process.env.METARANK_MODEL ?? 'xgboost',
    logger: pino(),
  };
}

export async function destroyKernel(kernel: Kernel): Promise<void> {
  await kernel.syncQueue.close();
  await kernel.redis.quit();
  await kernel.db.destroy();
}
```

### Сервис листинга

```typescript
// listing.service.ts

import { Knex } from 'knex';
import Typesense from 'typesense';
import axios from 'axios';
import { Kernel } from './kernel';
import {
  SearchRequest,
  SearchResponse,
  FacetResults,
  TypesenseHit,
  MetarankItem,
  MetarankRankRequest,
  MetarankRankResponse,
} from './types';

export class ListingService {
  private db: Knex;
  private typesense: Typesense.Client;
  private metarankUrl: string;
  private metarankModel: string;

  constructor(kernel: Kernel) {
    this.db = kernel.db;
    this.typesense = kernel.typesense;
    this.metarankUrl = kernel.metarankUrl;
    this.metarankModel = kernel.metarankModel;
  }

  async search(req: SearchRequest): Promise<SearchResponse> {
    const limit = req.limit ?? 50;
    const hasTextQuery = !!req.query?.trim();

    // =========================================================
    // ФАЗА 1: параллельно PostgreSQL + Typesense
    // =========================================================

    const [pgResult, tsResult] = await Promise.all([
      this.queryPostgres(req),
      hasTextQuery ? this.queryTypesense(req) : null,
    ]);

    const pgIds = pgResult.productIds;
    const pgIdSet = new Set(pgIds);

    // =========================================================
    // ФАЗА 2: пересечение
    // =========================================================

    let matchedIds: string[];
    let scores: Record<string, number> = {};

    if (hasTextQuery && tsResult) {
      // Пересечение: сохранить порядок Typesense (по BM25 score)
      matchedIds = [];
      for (const hit of tsResult.hits) {
        if (pgIdSet.has(hit.id)) {
          matchedIds.push(hit.id);
          scores[hit.id] = hit.score;
        }
      }
    } else {
      // Нет текстового query: использовать только результаты PostgreSQL
      matchedIds = pgIds;
    }

    if (matchedIds.length === 0) {
      return {
        productIds: [],
        facets: this.emptyFacets(),
        total: 0,
      };
    }

    // =========================================================
    // ФАЗА 3: пересортировка при необходимости (price/date + query)
    // =========================================================

    // При сортировке по цене/дате вместе с query нужно повторно выбрать
    // из PostgreSQL с правильным ORDER BY, используя matched IDs как фильтр
    let sortedIds = matchedIds;
    if (hasTextQuery && this.needsResort(req.sortBy)) {
      sortedIds = await this.resortByField(req.projectId, matchedIds, req.sortBy!);
    }

    // =========================================================
    // ФАЗА 4: параллельно counts фасетов + ранжирование
    // =========================================================

    const useMetarank = this.shouldUseMetarank(req.sortBy, hasTextQuery);

    const [facets, rankedIds] = await Promise.all([
      this.getFacetCounts(req.projectId, matchedIds),
      useMetarank
        ? this.rankWithMetarank(req, sortedIds, scores, limit)
        : sortedIds.slice(0, limit),
    ]);

    return {
      productIds: rankedIds,
      facets,
      total: matchedIds.length,
    };
  }

  // ===========================================================
  // PostgreSQL: фасетная фильтрация (Knex)
  // ===========================================================

  private async queryPostgres(
    req: SearchRequest
  ): Promise<{ productIds: string[] }> {
    let query = this.db('product_search_index')
      .select('product_id')
      .where('project_id', req.projectId);

    // Фильтр категорий (ANY - overlap)
    if (req.categoryIds?.length) {
      query = query.whereRaw('category_ids && ?::uuid[]', [req.categoryIds]);
    }

    // Фильтр тегов (ANY - overlap)
    if (req.tagIds?.length) {
      query = query.whereRaw('tag_ids && ?::uuid[]', [req.tagIds]);
    }

    // Фильтр характеристик (ALL - contains)
    if (req.features?.length) {
      query = query.whereRaw('feature_slugs @> ?::text[]', [req.features]);
    }

    // Фильтр опций (ANY - overlap)
    if (req.options?.length) {
      query = query.whereRaw('option_slugs && ?::text[]', [req.options]);
    }

    // Ценовой диапазон
    if (req.minPrice !== undefined) {
      query = query.where('min_price_minor', '>=', req.minPrice);
    }
    if (req.maxPrice !== undefined) {
      query = query.where('min_price_minor', '<=', req.maxPrice);
    }

    // Фильтр наличия
    if (req.inStock === true) {
      query = query.where('in_stock', true);
    }

    // ORDER BY
    const [orderCol, orderDir] = this.getOrderBy(req.sortBy);
    query = query.orderByRaw(`${orderCol} ${orderDir} NULLS LAST`);
    query = query.limit(10000);

    const rows = await query;
    return {
      productIds: rows.map((r: any) => r.product_id),
    };
  }

  private getOrderBy(sortBy?: string): [string, string] {
    switch (sortBy) {
      case 'price_asc':
        return ['min_price_minor', 'ASC'];
      case 'price_desc':
        return ['min_price_minor', 'DESC'];
      case 'newest':
        return ['published_at', 'DESC'];
      case 'popularity':
      default:
        return ['popularity_score', 'DESC'];
    }
  }

  // ===========================================================
  // Typesense: полнотекстовый поиск
  // ===========================================================

  private async queryTypesense(
    req: SearchRequest
  ): Promise<{ hits: TypesenseHit[] }> {
    const queryBy = [
      `title_${req.locale}`,
      `description_${req.locale}`,
      'keywords',
    ].join(',');

    const result = await this.typesense
      .collections('products')
      .documents()
      .search({
        q: req.query!,
        query_by: queryBy,
        filter_by: `project_id:${req.projectId}`,
        per_page: 10000,
        prefix: false,
        typo_tokens_threshold: 1,
      });

    const hits: TypesenseHit[] = (result.hits ?? []).map((hit) => ({
      id: hit.document.id as string,
      score: hit.text_match_info?.score ?? 0,
    }));

    return { hits };
  }

  // ===========================================================
  // PostgreSQL: counts фасетов
  // ===========================================================

  private async getFacetCounts(
    projectId: string,
    productIds: string[]
  ): Promise<FacetResults> {
    if (productIds.length === 0) {
      return this.emptyFacets();
    }

    // Выполнить все facet queries параллельно
    const [tags, features, options, categories, priceRanges] =
      await Promise.all([
        this.countFacet(projectId, productIds, 'tag_ids'),
        this.countFacet(projectId, productIds, 'feature_slugs'),
        this.countFacet(projectId, productIds, 'option_slugs'),
        this.countFacet(projectId, productIds, 'category_ids'),
        this.countPriceRanges(projectId, productIds),
      ]);

    return { tags, features, options, categories, priceRanges };
  }

  private async countFacet(
    projectId: string,
    productIds: string[],
    column: string
  ): Promise<{ value: string; count: number }[]> {
    const rows = await this.db.raw(`
      SELECT value, count(*)::int as count
      FROM product_search_index, unnest(${column}) AS value
      WHERE project_id = ? AND product_id = ANY(?)
      GROUP BY value
      ORDER BY count DESC
      LIMIT 100
    `, [projectId, productIds]);

    return rows.rows;
  }

  private async countPriceRanges(
    projectId: string,
    productIds: string[]
  ): Promise<{ min: number; max: number; count: number }[]> {
    const rows = await this.db.raw(`
      SELECT
        floor(min_price_minor / 100000) * 100000 as range_min,
        floor(min_price_minor / 100000) * 100000 + 99999 as range_max,
        count(*)::int as count
      FROM product_search_index
      WHERE project_id = ?
        AND product_id = ANY(?)
        AND min_price_minor IS NOT NULL
      GROUP BY range_min, range_max
      ORDER BY range_min
    `, [projectId, productIds]);

    return rows.rows.map((r: any) => ({
      min: r.range_min,
      max: r.range_max,
      count: r.count,
    }));
  }

  // ===========================================================
  // Metarank: персонализированное ранжирование
  // ===========================================================

  private async rankWithMetarank(
    req: SearchRequest,
    productIds: string[],
    scores: Record<string, number>,
    limit: number
  ): Promise<string[]> {
    // Взять лучших кандидатов для ранжирования
    const candidates = productIds.slice(0, 500);

    // Собрать Metarank items с features
    const items: MetarankItem[] = candidates.map((id) => ({
      id,
      bm25_score: scores[id] ?? 0,
      // Добавить больше features из cache/db при необходимости
    }));

    try {
      const response = await axios.post<MetarankRankResponse>(
        `${this.metarankUrl}/rank/${this.metarankModel}`,
        {
          user: req.userId,       // Опционально: для персонализации
          session: req.sessionId, // Опционально: session-based features
          items,
        } as MetarankRankRequest,
        { timeout: 5000 }
      );

      return response.data.items
        .slice(0, limit)
        .map((item) => item.id);
    } catch (error) {
      // Fallback: вернуть по BM25 score
      console.error('Metarank failed, falling back to BM25:', error);
      return candidates.slice(0, limit);
    }
  }

  // ===========================================================
  // Вспомогательные методы
  // ===========================================================

  /**
   * Определить, нужно ли использовать Metarank для ранжирования.
   *
   * Использовать Metarank когда:
   * - sortBy is 'recommended' (персонализировано browsing)
   * - sortBy = 'relevance' И есть поисковый query
   *
   * Не использовать Metarank когда:
   * - sortBy = price_asc/price_desc (пользователь ожидает строгий порядок по цене)
   * - sortBy = newest (пользователь ожидает строгий порядок по дате)
   * - sortBy = popularity (использовать предварительно рассчитанный score)
   */
  private shouldUseMetarank(
    sortBy: string | undefined,
    hasTextQuery: boolean
  ): boolean {
    const sort = sortBy ?? 'recommended';

    switch (sort) {
      case 'recommended':
        return true;  // Всегда персонализировать для recommended
      case 'relevance':
        return hasTextQuery;  // BM25 + Metarank при поиске
      case 'price_asc':
      case 'price_desc':
      case 'newest':
      case 'popularity':
        return false;  // Строгая сортировка, без персонализации
      default:
        return false;
    }
  }

  /**
   * Проверить, нужна ли пересортировка после пересечения Typesense.
   * Нужно, когда пользователь хочет строгий порядок (price, date), но также есть query.
   */
  private needsResort(sortBy: string | undefined): boolean {
    return ['price_asc', 'price_desc', 'newest', 'popularity'].includes(sortBy ?? '');
  }

  /**
   * Re-fetch ID товаров from PostgreSQL with proper ORDER BY.
   * Используется, когда есть результаты пересечения, но нужна строгая сортировка.
   */
  private async resortByField(
    projectId: string,
    productIds: string[],
    sortBy: string
  ): Promise<string[]> {
    if (productIds.length === 0) return [];

    const orderBy = this.getOrderByClause(sortBy);

    const result = await this.db.query(
      `SELECT product_id
       FROM product_search_index
       WHERE project_id = $1 AND product_id = ANY($2)
       ORDER BY ${orderBy}`,
      [projectId, productIds]
    );

    return result.rows.map((r) => r.product_id);
  }

  private getOrderByClause(sortBy: string): string {
    switch (sortBy) {
      case 'price_asc':
        return 'min_price_minor ASC NULLS LAST';
      case 'price_desc':
        return 'min_price_minor DESC NULLS LAST';
      case 'newest':
        return 'published_at DESC NULLS LAST';
      case 'popularity':
        return 'popularity_score DESC';
      default:
        return 'popularity_score DESC';
    }
  }

  private emptyFacets(): FacetResults {
    return {
      tags: [],
      features: [],
      options: [],
      categories: [],
      priceRanges: [],
    };
  }
}
```

### Sync Service

```typescript
// sync.service.ts

import { Knex } from 'knex';
import Typesense from 'typesense';
import { Kernel } from './kernel';

interface ProductText {
  product_id: string;
  project_id: string;
  locale: string;
  title: string;
  description?: string;
  keywords?: string;
}

export class SyncService {
  private db: Knex;
  private typesense: Typesense.Client;

  constructor(kernel: Kernel) {
    this.db = kernel.db;
    this.typesense = kernel.typesense;
  }

  // ===========================================================
  // Синхронизация Product в Search Index (PostgreSQL)
  // ===========================================================

  async syncProductIndex(productId: string): Promise<void> {
    await this.db.raw(`
      INSERT INTO product_search_index (
        project_id, product_id,
        min_price_minor, max_price_minor,
        in_stock, total_stock,
        tag_ids, feature_slugs, option_slugs, category_ids,
        popularity_score, published_at, updated_at
      )
      SELECT
        p.project_id,
        p.id,

        -- Цены из variants
        (SELECT MIN(vpc.amount_minor)
         FROM variant_prices_current vpc
         JOIN variant v ON v.id = vpc.variant_id
         WHERE v.product_id = p.id AND v.deleted_at IS NULL),

        (SELECT MAX(vpc.amount_minor)
         FROM variant_prices_current vpc
         JOIN variant v ON v.id = vpc.variant_id
         WHERE v.product_id = p.id AND v.deleted_at IS NULL),

        -- Остатки
        EXISTS(
          SELECT 1 FROM warehouse_stock ws
          JOIN variant v ON v.id = ws.variant_id
          WHERE v.product_id = p.id
            AND v.deleted_at IS NULL
            AND ws.quantity_on_hand > 0
        ),

        COALESCE((
          SELECT SUM(ws.quantity_on_hand)::int
          FROM warehouse_stock ws
          JOIN variant v ON v.id = ws.variant_id
          WHERE v.product_id = p.id AND v.deleted_at IS NULL
        ), 0),

        -- Теги
        COALESCE((
          SELECT array_agg(pt.tag_id)
          FROM product_tags pt
          WHERE pt.product_id = p.id
        ), '{}'),

        -- Характеристики как slug:value
        COALESCE((
          SELECT array_agg(pf.slug || ':' || pfv.slug)
          FROM product_feature pf
          JOIN product_feature_value pfv ON pfv.feature_id = pf.id
          WHERE pf.product_id = p.id
        ), '{}'),

        -- Опции как slug:value
        COALESCE((
          SELECT array_agg(DISTINCT po.slug || ':' || pov.slug)
          FROM variant v
          JOIN product_option_variant_link povl ON povl.variant_id = v.id
          JOIN product_option po ON po.id = povl.option_id
          JOIN product_option_value pov ON pov.id = povl.option_value_id
          WHERE v.product_id = p.id AND v.deleted_at IS NULL
        ), '{}'),

        -- Категории (включая родителей через recursive CTE)
        COALESCE((
          SELECT array_agg(DISTINCT cat_id)
          FROM (
            SELECT ci.category_id as cat_id FROM category_item ci WHERE ci.product_id = p.id
            UNION
            SELECT c.parent_id as cat_id FROM category_item ci
            JOIN category c ON c.id = ci.category_id
            WHERE ci.product_id = p.id AND c.parent_id IS NOT NULL
          ) all_cats
        ), '{}'),

        -- Популярность (placeholder - реализовать на основе аналитики)
        0.5,

        p.published_at,
        now()

      FROM product p
      WHERE p.id = ? AND p.deleted_at IS NULL

      ON CONFLICT (product_id) DO UPDATE SET
        min_price_minor = EXCLUDED.min_price_minor,
        max_price_minor = EXCLUDED.max_price_minor,
        in_stock = EXCLUDED.in_stock,
        total_stock = EXCLUDED.total_stock,
        tag_ids = EXCLUDED.tag_ids,
        feature_slugs = EXCLUDED.feature_slugs,
        option_slugs = EXCLUDED.option_slugs,
        category_ids = EXCLUDED.category_ids,
        popularity_score = EXCLUDED.popularity_score,
        published_at = EXCLUDED.published_at,
        updated_at = now()
    `, [productId]);
  }

  // ===========================================================
  // Синхронизация Product в Typesense (только текст)
  // ===========================================================

  async syncProductText(productId: string): Promise<void> {
    const texts = await this.db('product_translations as pt')
      .join('product as p', 'p.id', 'pt.product_id')
      .select(
        'pt.product_id',
        'p.project_id',
        'pt.locale',
        'pt.title',
        'pt.description',
        'pt.keywords'
      )
      .where('pt.product_id', productId)
      .whereNull('p.deleted_at') as ProductText[];

    if (texts.length === 0) {
      // Product удален - удалить из Typesense
      try {
        await this.typesense.collections('products').documents(productId).delete();
      } catch {
        // Игнорировать, если не найдено
      }
      return;
    }

    const projectId = texts[0].project_id;

    // Собрать документ со всеми локалями
    const doc: Record<string, any> = {
      id: productId,
      project_id: projectId,
    };

    for (const t of texts) {
      doc[`title_${t.locale}`] = t.title;
      if (t.description) {
        doc[`description_${t.locale}`] = t.description;
      }
      if (t.keywords) {
        doc['keywords'] = t.keywords;
      }
    }

    await this.typesense.collections('products').documents().upsert(doc);
  }

  // ===========================================================
  // Полная синхронизация (PostgreSQL index + Typesense)
  // ===========================================================

  async syncProduct(productId: string): Promise<void> {
    await Promise.all([
      this.syncProductIndex(productId),
      this.syncProductText(productId),
    ]);
  }

  // ===========================================================
  // Удаление из обоих хранилищ
  // ===========================================================

  async deleteProduct(productId: string): Promise<void> {
    await Promise.all([
      this.db('product_search_index').where('product_id', productId).delete(),
      this.typesense
        .collections('products')
        .documents(productId)
        .delete()
        .catch(() => {}),
    ]);
  }

  // ===========================================================
  // Batch-синхронизация (для initial load или recovery)
  // ===========================================================

  async syncAllProducts(projectId: string, batchSize = 100): Promise<void> {
    let offset = 0;

    while (true) {
      const rows = await this.db('product')
        .select('id')
        .where('project_id', projectId)
        .whereNull('deleted_at')
        .orderBy('id')
        .limit(batchSize)
        .offset(offset);

      if (rows.length === 0) break;

      await Promise.all(rows.map((row) => this.syncProduct(row.id)));

      offset += batchSize;
      console.log(`Synced ${offset} products...`);
    }
  }
}
```

### Database triggers (опционально)

```sql
-- =============================================================
-- Триггеры для автоматической синхронизации
-- Вызывайте их из приложения или используйте pg_notify + worker
-- =============================================================

-- Notify-функция
CREATE OR REPLACE FUNCTION notify_product_change()
RETURNS TRIGGER AS $$
DECLARE
  product_id uuid;
BEGIN
  -- Получить product_id из разных таблиц
  IF TG_TABLE_NAME = 'product' THEN
    product_id := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME = 'variant' THEN
    product_id := COALESCE(NEW.product_id, OLD.product_id);
  ELSIF TG_TABLE_NAME IN ('item_pricing', 'warehouse_stock') THEN
    SELECT v.product_id INTO product_id
    FROM variant v
    WHERE v.id = COALESCE(NEW.variant_id, OLD.variant_id);
  ELSIF TG_TABLE_NAME IN ('product_feature', 'product_option', 'category_item', 'product_tags') THEN
    product_id := COALESCE(NEW.product_id, OLD.product_id);
  ELSIF TG_TABLE_NAME = 'product_translations' THEN
    product_id := COALESCE(NEW.product_id, OLD.product_id);
  END IF;

  -- Отправить notification
  IF product_id IS NOT NULL THEN
    PERFORM pg_notify('product_changed', product_id::text);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Применить triggers к релевантным таблицам
CREATE TRIGGER trg_product_change AFTER INSERT OR UPDATE OR DELETE ON product
FOR EACH ROW EXECUTE FUNCTION notify_product_change();

CREATE TRIGGER trg_variant_change AFTER INSERT OR UPDATE OR DELETE ON variant
FOR EACH ROW EXECUTE FUNCTION notify_product_change();

CREATE TRIGGER trg_pricing_change AFTER INSERT OR UPDATE OR DELETE ON item_pricing
FOR EACH ROW EXECUTE FUNCTION notify_product_change();

CREATE TRIGGER trg_stock_change AFTER INSERT OR UPDATE OR DELETE ON warehouse_stock
FOR EACH ROW EXECUTE FUNCTION notify_product_change();

CREATE TRIGGER trg_feature_change AFTER INSERT OR UPDATE OR DELETE ON product_feature
FOR EACH ROW EXECUTE FUNCTION notify_product_change();

CREATE TRIGGER trg_feature_value_change AFTER INSERT OR UPDATE OR DELETE ON product_feature_value
FOR EACH ROW EXECUTE FUNCTION notify_product_change();

CREATE TRIGGER trg_option_change AFTER INSERT OR UPDATE OR DELETE ON product_option
FOR EACH ROW EXECUTE FUNCTION notify_product_change();

CREATE TRIGGER trg_category_item_change AFTER INSERT OR UPDATE OR DELETE ON category_item
FOR EACH ROW EXECUTE FUNCTION notify_product_change();

CREATE TRIGGER trg_translation_change AFTER INSERT OR UPDATE OR DELETE ON product_translations
FOR EACH ROW EXECUTE FUNCTION notify_product_change();
```

### Notification listener (Node.js)

```typescript
// sync.worker.ts

import { Client } from 'pg';
import { SyncService } from './sync.service';

export class SyncWorker {
  private client: Client;
  private debounceMap = new Map<string, NodeJS.Timeout>();
  private debounceMs = 500;

  constructor(
    private connectionString: string,
    private syncService: SyncService
  ) {
    this.client = new Client({ connectionString });
  }

  async start(): Promise<void> {
    await this.client.connect();
    await this.client.query('LISTEN product_changed');

    this.client.on('notification', (msg) => {
      if (msg.channel === 'product_changed' && msg.payload) {
        this.handleProductChange(msg.payload);
      }
    });

    console.log('Sync worker started, listening for product changes...');
  }

  private handleProductChange(productId: string): void {
    // Debounce: дождаться стабилизации быстрых изменений
    const existing = this.debounceMap.get(productId);
    if (existing) {
      clearTimeout(existing);
    }

    const timeout = setTimeout(async () => {
      this.debounceMap.delete(productId);

      try {
        await this.syncService.syncProduct(productId);
        console.log(`Synced product ${productId}`);
      } catch (error) {
        console.error(`Failed to sync product ${productId}:`, error);
        // TODO: добавить в retry queue
      }
    }, this.debounceMs);

    this.debounceMap.set(productId, timeout);
  }

  async stop(): Promise<void> {
    await this.client.end();
  }
}
```

---

## Очередь задач (BullMQ + Redis)

Для надежной обработки событий с retry используйте BullMQ вместе с существующим Redis.

### Настройка очереди

```typescript
// queue/sync.queue.ts

import { Queue, Worker, Job } from 'bullmq';
import { Kernel } from '../kernel';
import { SyncService } from '../sync.service';

// Типы задач
interface SyncProductJob {
  productId: string;
}

interface SyncAllJob {
  projectId: string;
}

type SyncJobData = SyncProductJob | SyncAllJob;

export function createSyncQueue(kernel: Kernel): Queue<SyncJobData> {
  return new Queue('sync', {
    connection: kernel.redis,
    defaultJobOptions: {
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  });
}

export function startSyncWorker(kernel: Kernel): Worker<SyncJobData> {
  const syncService = new SyncService(kernel);

  const worker = new Worker<SyncJobData>(
    'sync',
    async (job: Job<SyncJobData>) => {
      kernel.logger.info({ jobId: job.id, name: job.name }, 'processing job');

      switch (job.name) {
        case 'sync-product':
          await syncService.syncProduct((job.data as SyncProductJob).productId);
          break;

        case 'delete-product':
          await syncService.deleteProduct((job.data as SyncProductJob).productId);
          break;

        case 'sync-all':
          await syncService.syncAllProducts((job.data as SyncAllJob).projectId);
          break;
      }
    },
    {
      connection: kernel.redis,
      concurrency: 10,
    }
  );

  worker.on('completed', (job) => {
    kernel.logger.debug({ jobId: job.id }, 'job completed');
  });

  worker.on('failed', (job, err) => {
    kernel.logger.error({ jobId: job?.id, err: err.message }, 'job failed');
  });

  return worker;
}
```

### Добавление задач

```typescript
// inventory/scripts/update-product.ts

export async function updateProduct(
  kernel: Kernel,
  productId: string,
  data: UpdateProductData
): Promise<void> {
  // Обновить в базе данных
  await kernel.db('product').where('id', productId).update(data);

  // Добавить в sync queue с дедупликацией
  await kernel.syncQueue.add(
    'sync-product',
    { productId },
    {
      jobId: `sync:${productId}`,  // Ключ дедупликации
      delay: 500,                   // Debounce: ждать 500ms
    }
  );
}
```

### Паттерны очереди

```typescript
// Дедупликация: один product не синхронизируется дважды
await queue.add('sync-product', { productId }, {
  jobId: `sync:${productId}`,
});

// Debounce: подождать 500ms перед обработкой
await queue.add('sync-product', { productId }, {
  jobId: `sync:${productId}`,
  delay: 500,
});

// Приоритет: срочная синхронизация
await queue.add('sync-product', { productId }, {
  priority: 1,  // 1 = самый высокий
});

// Batch-добавление
await queue.addBulk([
  { name: 'sync-product', data: { productId: '1' } },
  { name: 'sync-product', data: { productId: '2' } },
  { name: 'sync-product', data: { productId: '3' } },
]);

// Запланированная задача (cron)
await queue.add('sync-all', { projectId }, {
  repeat: { cron: '0 3 * * *' },  // Каждую ночь в 3:00
});
```

### Ограничение частоты

```typescript
const worker = new Worker('sync', processor, {
  connection: kernel.redis,
  concurrency: 10,
  limiter: {
    max: 100,       // Максимум 100 задач
    duration: 1000, // В секунду
  },
});
```

### Dashboard (опционально)

```typescript
// admin/queues.ts

import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';

export function setupQueueDashboard(app: FastifyInstance, kernel: Kernel) {
  const serverAdapter = new FastifyAdapter();

  createBullBoard({
    queues: [new BullMQAdapter(kernel.syncQueue)],
    serverAdapter,
  });

  serverAdapter.setBasePath('/admin/queues');
  app.register(serverAdapter.registerPlugin(), { prefix: '/admin/queues' });
}
```

### Альтернатива: pg-boss (только PostgreSQL)

Если не хотите использовать Redis для очередей:

```typescript
import PgBoss from 'pg-boss';

const boss = new PgBoss(process.env.DATABASE_URL);
await boss.start();

// Добавить задачу
await boss.send('sync-product', { productId }, {
  singletonKey: productId,  // Дедупликация
  retryLimit: 5,
});

// Worker
await boss.work('sync-product', { teamConcurrency: 10 }, async (job) => {
  await syncService.syncProduct(job.data.productId);
});
```

### Альтернатива: SQLite (один процесс)

Для простых single-process deployments:

```typescript
import BetterQueue from 'better-queue';
import SqliteStore from 'better-queue-sqlite';

const queue = new BetterQueue(
  async (task, done) => {
    try {
      await syncService.syncProduct(task.productId);
      done(null, task);
    } catch (err) {
      done(err);
    }
  },
  {
    store: new SqliteStore({ path: './data/queue.sqlite' }),
    concurrent: 10,
    maxRetries: 5,
  }
);

queue.push({ productId: '123' });
```

### Сравнение вариантов очереди

| Возможность | BullMQ (Redis) | pg-boss (PostgreSQL) | SQLite |
|---------|---------------|---------------------|--------|
| Персистентность | да | да | да |
| Распределенность | да | да | нет, один процесс |
| Dashboard | да, Bull Board | нет | нет |
| Cron-задачи | да | да | нет |
| Rate limiting | да | да | нет |
| Дедупликация | да, jobId | да, singletonKey | нет, вручную |
| Дополнительная инфраструктура | Redis | нет | нет |

---

## Интеграция Metarank

### Feedback-события

Metarank обучается на пользовательских взаимодействиях. Отправляйте эти события для обучения модели ранжирования:

```typescript
// metarank.events.ts

import axios from 'axios';

export class MetarankEvents {
  constructor(private metarankUrl: string) {}

  // Когда пользователь видит результаты поиска
  async trackRanking(
    user: string | undefined,
    session: string,
    items: string[],
    query?: string
  ): Promise<void> {
    await axios.post(`${this.metarankUrl}/feedback`, {
      event: 'ranking',
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      user,
      session,
      fields: query ? [{ name: 'query', value: query }] : [],
      items: items.map((id, idx) => ({ id, position: idx + 1 })),
    });
  }

  // Когда пользователь кликает по товару
  async trackClick(
    user: string | undefined,
    session: string,
    itemId: string,
    rankingId: string
  ): Promise<void> {
    await axios.post(`${this.metarankUrl}/feedback`, {
      event: 'interaction',
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      user,
      session,
      type: 'click',
      item: itemId,
      ranking: rankingId,
    });
  }

  // Когда пользователь добавляет в корзину
  async trackAddToCart(
    user: string | undefined,
    session: string,
    itemId: string,
    rankingId?: string
  ): Promise<void> {
    await axios.post(`${this.metarankUrl}/feedback`, {
      event: 'interaction',
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      user,
      session,
      type: 'cart',
      item: itemId,
      ranking: rankingId,
    });
  }

  // Когда пользователь покупает
  async trackPurchase(
    user: string | undefined,
    session: string,
    itemIds: string[]
  ): Promise<void> {
    for (const itemId of itemIds) {
      await axios.post(`${this.metarankUrl}/feedback`, {
        event: 'interaction',
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        user,
        session,
        type: 'purchase',
        item: itemId,
      });
    }
  }
}
```

### Конфигурация Metarank

Пример `config.yml` для Metarank:

```yaml
# metarank/config.yml

state:
  type: redis
  host: redis
  port: 6379

features:
  # Item features (из ваших данных)
  - name: popularity
    type: number
    scope: item
    source: metadata.popularity

  - name: price
    type: number
    scope: item
    source: metadata.price

  - name: bm25_score
    type: number
    scope: item
    source: ranking.bm25_score

  # Interaction features (обучаемые)
  - name: item_click_count
    type: interaction_count
    scope: item
    interaction: click

  - name: user_click_count
    type: interaction_count
    scope: user
    interaction: click

  - name: ctr
    type: rate
    scope: item
    top: click
    bottom: impression

models:
  xgboost:
    type: lambdamart
    backend: xgboost
    features:
      - popularity
      - price
      - bm25_score
      - item_click_count
      - ctr
    weights:
      click: 1
      cart: 3
      purchase: 5
```

### Docker Compose

```yaml
# docker-compose.yml

services:
  metarank:
    image: metarank/metarank:latest
    ports:
      - "8080:8080"
    volumes:
      - ./metarank/config.yml:/config.yml
    command: ["serve", "--config", "/config.yml"]
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

---

## Граничные случаи

### 1. Пустой текстовый запрос

```typescript
if (!req.query?.trim()) {
  // Пропустить Typesense, использовать только результаты PostgreSQL
  matchedIds = pgIds;
  // Сортировать по указанному полю или popularity
}
```

### 2. Пустое пересечение

```typescript
if (matchedIds.length === 0 && tsResult?.hits.length > 0) {
  // Текстовые совпадения есть, но ни одно не проходит фильтры
  // Варианты:
  // a) Вернуть пустые результаты
  // b) Предложить убрать фильтры
  // c) Вернуть результаты Typesense с флагом "filter mismatch"
}
```

### 3. Typesense недоступен

```typescript
try {
  tsResult = await this.queryTypesense(req);
} catch (error) {
  console.error('Typesense unavailable:', error);
  // Fallback: использовать PostgreSQL ILIKE search (медленнее)
  tsResult = await this.fallbackTextSearch(req);
}
```

### 4. Metarank недоступен

```typescript
try {
  rankedIds = await this.rankWithMetarank(req, productIds, scores, limit);
} catch (error) {
  console.error('Metarank unavailable:', error);
  // Fallback: вернуть по BM25-оценке или popularity
  rankedIds = productIds.slice(0, limit);
}
```

---

## Соображения по производительности

### PostgreSQL

1. **GIN-индексы** оптимизированы для array containment (`@>`) и overlap (`&&`)
2. **Partial indexes** для частых фильтров (`in_stock = true`)
3. **LIMIT 10000** при получении кандидатов для ограничения памяти
4. **Пул соединений** через pg-pool

### Typesense

1. **per_page: 10000** - получить достаточно кандидатов для пересечения
2. **prefix: false** - точное совпадение слов для лучшей точности
3. **filter_by project_id** - изоляция по tenant

### Пересечение

1. Использовать `Set` для O(1) lookup
2. Сохранять порядок Typesense (по BM25 score)
3. Эффективно по памяти до 100k кандидатов

### Подсчеты фасетов

1. Выполнять facet queries параллельно
2. LIMIT 100 на тип фасета
3. Рассмотреть кеширование для запросов с высоким трафиком

---

## Мониторинг

### Ключевые метрики

```typescript
// Перцентили latency
listing_search_duration_ms{phase="postgres"}
listing_search_duration_ms{phase="typesense"}
listing_search_duration_ms{phase="intersection"}
listing_search_duration_ms{phase="facets"}
listing_search_duration_ms{phase="metarank"}
listing_search_duration_ms{phase="total"}

// Количества
listing_search_candidates{source="postgres"}
listing_search_candidates{source="typesense"}
listing_search_candidates{source="intersection"}

// Ошибки
listing_search_errors{phase="typesense"}
listing_search_errors{phase="metarank"}
```

---

## Будущие улучшения

1. **Кеширование**: Redis для горячих подсчетов фасетов и популярных поисковых запросов
2. **Понимание запроса**: извлекать фильтры из естественного языка (например, "red nike under $100")
3. **A/B-тестирование**: сравнивать модели Metarank через feature flags
4. **Roaring bitmaps**: для 1M+ товаров, более быстрые подсчеты фасетов
5. **Векторный поиск**: добавить семантический поиск через Typesense vectors или pgvector
