# План реализации QueryCollectionProductsScript

## Текущие проблемы

1. **In-memory пагинация** - все данные загружаются в память, затем обрезаются (строки 297-311)
2. **Только forward пагинация** - поддержка только `after`/`first`, нет `before`/`last`
3. **Нестабильные курсоры** - курсор = base64(productId), не учитывает sort order
4. **totalCount неэффективен** - считается после загрузки всех данных в память

---

## Шаг 1: Обновить DTO для полной Relay спецификации

```typescript
// dto/index.ts
export interface CollectionProductsQueryParams {
  collectionId: string;
  locale: string;
  // Forward pagination
  first?: number;
  after?: string;
  // Backward pagination
  last?: number;
  before?: string;
  filters?: ProductFiltersInput;
  sort?: ProductSortInput;
  skipPublishCheck?: boolean;
  includeDrafts?: boolean;
}
```

---

## Шаг 2: Реализовать keyset-based пагинацию

Вместо offset-based пагинации использовать keyset cursor:

```typescript
interface CursorData {
  id: string;
  sortValue: string | number | null; // значение по которому сортируем
}

// Кодирование
encodeCursor(data: CursorData): string {
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}

// Декодирование
decodeCursor(cursor: string): CursorData | null {
  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
```

---

## Шаг 3: SQL-level пагинация с LIMIT/OFFSET

Заменить in-memory slice на SQL:

```typescript
// Добавить WHERE условия для курсора
if (cursorData && sortBy === "newest") {
  conditions.push(sql`
    (${productSearchIndex.createdAt}, ${productSearchIndex.productId})
    ${direction === "desc" ? sql`<` : sql`>`}
    (${cursorData.sortValue}, ${cursorData.id})
  `);
}

// Использовать LIMIT в запросе
.limit(first + 1) // +1 для определения hasNextPage
```

---

## Шаг 4: Эффективный подсчёт totalCount

Отдельный COUNT запрос:

```typescript
const [{ count }] = await this.repository.db
  .select({ count: sql<number>`count(*)` })
  .from(productSearchIndex)
  .where(and(...finalConditions));
```

---

## Шаг 5: Поддержка backward пагинации

```typescript
// Для last/before - инвертировать сортировку, затем реверсировать результат
const isBackward = params.last !== undefined;
const limit = isBackward ? params.last : params.first;

// Инвертируем направление для backward
const effectiveDirection = isBackward
  ? (direction === "asc" ? "desc" : "asc")
  : direction;

// После получения - реверсируем результат
if (isBackward) {
  edges.reverse();
}
```

---

## Шаг 6: Поддержка Rule-based коллекций

Коллекции бывают двух типов: `manual` и `rule`. Для rule-based нужна специальная обработка.

### RuleContext

```typescript
interface RuleContext {
  tagIn: string[];      // tag IN (любой из списка)
  tagAll: string[];     // tag ALL (все из списка)
  featureIn: string[];  // feature IN
  categoryIn: string[]; // category IN
  optionIn: string[];   // variant option IN
  createdFrom?: string; // created_at >= date
  createdTo?: string;   // created_at < date
  priceMin?: number;    // variant price >= min
  priceMax?: number;    // variant price <= max
  inStock?: boolean;    // variant in_stock = true/false
}
```

### Компиляция правил

```typescript
private compileRules(rules: CollectionRuleInput[]): RuleContext {
  // Поддерживаемые поля и операторы:
  // - tag: in, contains, all
  // - feature: in, contains
  // - category: in, contains
  // - option: in, contains
  // - price: eq, gt, gte, lt, lte, between
  // - in_stock: eq
  // - created_at: eq, gt, gte, lt, lte, between
}
```

### SQL условия для rule-based

```typescript
private appendRuleProductConditions(conditions: SQL[], ctx: RuleContext): void {
  // Product-level условия (из product_search_index)
  if (ctx.tagIn.length > 0) {
    conditions.push(sql`tag_handles && ${ctx.tagIn}`);  // ANY match
  }
  if (ctx.tagAll.length > 0) {
    conditions.push(sql`tag_handles @> ${ctx.tagAll}`); // ALL match
  }
  if (ctx.featureIn.length > 0) {
    conditions.push(sql`feature_slugs && ${ctx.featureIn}`);
  }
  if (ctx.categoryIn.length > 0) {
    conditions.push(sql`category_handles && ${ctx.categoryIn}`);
  }
  if (ctx.createdFrom) {
    conditions.push(sql`created_at >= ${ctx.createdFrom}`);
  }
  if (ctx.createdTo) {
    conditions.push(sql`created_at < ${ctx.createdTo}`);
  }
}
```

### Variant-level условия для правил

```typescript
// Для price, option, inStock - нужен EXISTS subquery на variant_search_index
if (ctx.optionIn.length > 0 || ctx.priceMin || ctx.priceMax || ctx.inStock !== undefined) {
  conditions.push(sql`exists (
    select 1 from catalog.variant_search_index vsi
    where vsi.product_id = psi.product_id
      and vsi.price_currency = ${currency}
      ${ctx.optionIn.length > 0 ? sql`and vsi.option_slugs && ${ctx.optionIn}` : sql``}
      ${ctx.priceMin ? sql`and vsi.price_minor >= ${ctx.priceMin}` : sql``}
      ${ctx.priceMax ? sql`and vsi.price_minor <= ${ctx.priceMax}` : sql``}
      ${ctx.inStock !== undefined ? sql`and vsi.in_stock = ${ctx.inStock}` : sql``}
  )`);
}
```

### Отличие от manual коллекций

| Аспект | Manual | Rule-based |
|--------|--------|------------|
| Источник продуктов | `collection_item` таблица | Динамический запрос по правилам |
| Сортировка `manual` | Используется `lexo_rank` | Fallback на `newest` |
| Добавление продуктов | Явное через API | Автоматически по правилам |

---

## Шаг 7: Структура итогового решения

```
QueryCollectionProductsScript.ts
├── execute()
│   ├── validateCollection()
│   ├── resolveFilters()
│   ├── buildBaseConditions()
│   ├── buildRuleConditions()       // rule-based collections
│   ├── buildCursorConditions()     // keyset pagination
│   ├── executeCountQuery()         // отдельный count
│   ├── executeDataQuery()          // с LIMIT
│   ├── buildEdges()
│   └── buildFacets()
│
├── Rule helpers
│   ├── compileRules(CollectionRuleInput[])
│   ├── appendRuleProductConditions()
│   └── buildVariantExistsCondition()
│
├── Cursor helpers
│   ├── encodeCursor(CursorData)
│   ├── decodeCursor(string)
│   └── buildCursorWhereClause()
│
└── Pagination helpers
    ├── determinePageInfo()
    └── handleBackwardPagination()
```

---

## Шаг 8: Примеры SQL запросов

### Manual коллекция с forward пагинацией

```sql
-- Count query
SELECT count(*)
FROM catalog.product_search_index psi
WHERE psi.project_id = $1
  AND psi.status = 'published'
  AND EXISTS (
    SELECT 1 FROM catalog.collection_item ci
    WHERE ci.project_id = $1
      AND ci.collection_id = $2
      AND ci.product_id = psi.product_id
  );

-- Data query (sort: manual, first: 10, after: cursor)
SELECT
  psi.product_id,
  ci.lexo_rank,
  pt.title as name
FROM catalog.product_search_index psi
LEFT JOIN catalog.product_translation pt
  ON pt.project_id = psi.project_id
  AND pt.product_id = psi.product_id
  AND pt.locale = $3
INNER JOIN catalog.collection_item ci
  ON ci.project_id = psi.project_id
  AND ci.product_id = psi.product_id
  AND ci.collection_id = $2
WHERE psi.project_id = $1
  AND psi.status = 'published'
  -- Keyset cursor condition
  AND (ci.lexo_rank, psi.product_id) > ($cursor_rank, $cursor_id)
ORDER BY ci.lexo_rank ASC, psi.product_id ASC
LIMIT 11;  -- first + 1 for hasNextPage
```

### Rule-based коллекция с фильтрами

```sql
-- Rule: tag IN ('sale', 'new') AND price BETWEEN 1000 AND 5000
SELECT
  psi.product_id,
  psi.created_at,
  pt.title as name,
  (
    SELECT min(vsi.price_minor)::bigint
    FROM catalog.variant_search_index vsi
    WHERE vsi.project_id = $1
      AND vsi.product_id = psi.product_id
      AND vsi.price_currency = $currency
  ) as min_price
FROM catalog.product_search_index psi
LEFT JOIN catalog.product_translation pt
  ON pt.project_id = psi.project_id
  AND pt.product_id = psi.product_id
  AND pt.locale = $locale
WHERE psi.project_id = $1
  AND psi.status = 'published'
  -- Rule conditions
  AND psi.tag_handles && ARRAY['sale', 'new']
  AND EXISTS (
    SELECT 1 FROM catalog.variant_search_index vsi
    WHERE vsi.project_id = $1
      AND vsi.product_id = psi.product_id
      AND vsi.price_currency = $currency
      AND vsi.price_minor >= 1000
      AND vsi.price_minor <= 5000
  )
  -- User facet filters (on top of rules)
  AND psi.feature_slugs && ARRAY['organic']
  -- Keyset cursor
  AND (psi.created_at, psi.product_id) < ($cursor_created, $cursor_id)
ORDER BY psi.created_at DESC, psi.product_id ASC
LIMIT 21;
```

### Backward пагинация (last: 10, before: cursor)

```sql
-- Инвертируем сортировку, затем реверсируем результат в коде
SELECT * FROM (
  SELECT
    psi.product_id,
    psi.created_at
  FROM catalog.product_search_index psi
  WHERE psi.project_id = $1
    AND psi.status = 'published'
    -- before cursor: инвертированное условие
    AND (psi.created_at, psi.product_id) > ($cursor_created, $cursor_id)
  ORDER BY psi.created_at ASC, psi.product_id DESC  -- инвертированный order
  LIMIT 11
) sub
ORDER BY created_at DESC, product_id ASC;  -- восстанавливаем порядок
```

### Facets aggregation query

```sql
-- Собираем все уникальные теги/фичи для фасетов
SELECT
  unnest(psi.tag_handles) as tag_handle,
  count(*) as product_count
FROM catalog.product_search_index psi
WHERE psi.project_id = $1
  AND psi.status = 'published'
  AND psi.product_id = ANY($base_product_ids)
GROUP BY tag_handle;
```

---

## Шаг 9: Тестирование

1. Forward пагинация: `first: 10, after: cursor`
2. Backward пагинация: `last: 10, before: cursor`
3. Сортировка: manual, newest, name, price
4. Фильтры: facets, price range, inStock
5. Rule-based: tag in, tag all, feature, category, price range, in_stock, created_at
6. Edge cases: пустая коллекция, deleted collection, unpublished
