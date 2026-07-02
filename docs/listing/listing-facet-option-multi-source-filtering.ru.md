# Фильтрация option facets с несколькими sources через listing index

## Назначение

Документ объясняет частный, но важный случай storefront filtering:

- один storefront facet типа `OPTION` может быть собран из нескольких catalog
  options;
- значения этих options могут быть сгруппированы через
  `facet_value.kind = 'display'`;
- listing index хранит не raw option handles, а готовые postings
  `(facet_id, facet_value_id)`;
- фильтрация должна сохранять same-variant semantics.

Этот документ дополняет:

- `docs/listing/listing-index-redesign-plan.ru.md`;
- `docs/listing/listing-storefront-operations-explained.ru.md`;
- `docs/listing/listing-index-sync-freshness.ru.md`.

## Термины

### Catalog option source

Catalog option source — это конкретная option-модель товара, например:

- `size`;
- `clothing_size`;
- `shoe_size`;
- `frame_size`.

В facet configuration такие sources хранятся в `catalog.facet_source`.
В DB это `catalog.facet_source.handle` вместе с `facet_type = 'option'`.
Для facet типа `OPTION` один facet может выбрать несколько option sources.

Пример:

```text
facet: Fit Size
facet_source:
  - clothing_size
  - shoe_size
  - frame_size
```

Это значит: storefront показывает один фильтр `Fit Size`, но данные для него
берутся из нескольких catalog options.

### Source value

Source value — это значение конкретного catalog source.

Для option facets source value должен быть source-qualified, потому что
одинаковый value handle в разных options может значить разные вещи.
В `catalog.facet_value.handle` для `kind = 'source'` это persisted handle в
формате:

```text
sourceHandle:valueHandle
```

Примеры source value handles:

```text
clothing_size:m
shoe_size:m
frame_size:m
```

Не достаточно хранить только `m`, потому что без source prefix невозможно
понять, из какой option пришло значение.

Важно: source-qualified handle является handle source value. Если такой source
value остается root (`parent_id IS NULL`), то его публичный storefront
`valueHandle` тоже будет source-qualified, например `clothing_size:m`. Если
публичный URL должен быть `?fit-size=m`, нужен root display value с
`handle = m`, к которому attached source values.

### Display value

`facet_value.kind = 'display'` — это группирующее значение. Оно объединяет
несколько source values в одно storefront value.

Пример:

```text
display value:
  id = display_m
  handle = m
  kind = display
  parent_id = null

source values:
  clothing_size:m -> parent_id = display_m
  shoe_size:m     -> parent_id = display_m
  frame_size:m    -> parent_id = display_m
```

На storefront пользователь видит один value:

```text
Fit Size = M
```

Но под ним могут находиться source values из разных options.

## Что хранит token

Option facet postings лежат в catalog.listing_posting_bitmap variant facet postings.

Token хранит:

```ts
{
  project_id: string;
  product_id: string;
  variant_id: string;
  facet_id: string;
  facet_value_id: string;
}
```

Смысл строки:

```text
variant_id имеет storefront facet value facet_value_id внутри facet_id
```

Для option filters token обязательно variant-level, потому что `color`, `size`,
`price` и другие variant-level predicates должны матчиться на одном и том же
variant.

Token не хранит:

- `option_slug`;
- `value_slug`;
- `source_handle`;
- `source_value_enabled`;
- `kind`;
- `parent_id`.

Эти поля используются во время sync/rebuild, но не нужны на storefront read
path. Read path получает уже resolved ids.

Из этого следует важное правило: token generation должен применять все проверки
source value пригодности до записи token. После записи token уже нельзя понять,
из какого конкретного source value он был получен. Если disabled source child
будет записан как token на display group, storefront read path не сможет
исключить именно этот child.

## Как token резолвится при sync

Допустим есть facet:

```text
facet:
  id = facet_fit_size
  slug = fit-size
  type = OPTION

facet_source:
  facet_id = facet_fit_size
  facet_type = 'option'
  handle = clothing_size

facet_source:
  facet_id = facet_fit_size
  facet_type = 'option'
  handle = shoe_size
```

Есть facet values:

```text
facet_value:
  id = display_m
  facet_id = facet_fit_size
  kind = display
  handle = m
  parent_id = null

facet_value:
  id = source_clothing_size_m
  facet_id = facet_fit_size
  kind = source
  handle = clothing_size:m
  parent_id = display_m

facet_value:
  id = source_shoe_size_m
  facet_id = facet_fit_size
  kind = source
  handle = shoe_size:m
  parent_id = display_m
```

Variant A имеет canonical option:

```text
clothing_size = m
```

Sync строит source handle:

```text
clothing_size:m
```

Дальше sync делает resolve:

```text
1. Найти facet_source, где facet_type = 'option' и handle = clothing_size.
2. Получить facet_id = facet_fit_size.
3. Найти facet_value:
   facet_id = facet_fit_size
   kind = source
   handle = clothing_size:m
   enabled = true
4. Если source value не найден или disabled, token не создается.
5. Если source.parent_id IS NOT NULL:
   resolved facet_value_id = source.parent_id
6. Если source.parent_id IS NULL:
   resolved facet_value_id = source.id
```

Для Variant A результат:

```text
facet_id = facet_fit_size
facet_value_id = display_m
```

В catalog.listing_posting_bitmap variant facet postings записывается:

```text
project_id = project_1
product_id = product_1
variant_id = variant_a
facet_id = facet_fit_size
facet_value_id = display_m
```

Variant B имеет canonical option:

```text
shoe_size = m
```

Он проходит тот же resolve:

```text
shoe_size:m -> source_shoe_size_m -> parent display_m
```

И получает token:

```text
project_id = project_1
product_id = product_2
variant_id = variant_b
facet_id = facet_fit_size
facet_value_id = display_m
```

Итог: разные catalog options приводятся к одному storefront facet value.

## Правило выбора `facet_value_id`

Для token generation правило должно быть однозначным:

```text
source value найден и source_value.enabled = true

если source_value.parent_id IS NOT NULL:
  token.facet_value_id = source_value.parent_id
иначе:
  token.facet_value_id = source_value.id
```

`kind = display` сам по себе не хранится в token. Display влияет на token
через `parent_id` source value.

Если source value привязан к display group, token ссылается на display id.
Если source value не привязан к display group, token ссылается на root source
id.

Если source value disabled, отсутствует или больше не входит в configured
`facet_source` этого facet, token для него не пишется. Изменение этих условий
делает старые postings stale и требует refresh.

## Как storefront filter резолвится на read path

Storefront input может быть:

```text
?fit-size=m
```

Read path не ищет raw option values. Он сначала resolve-ит публичные handles:

```text
facet slug: fit-size
value handle: m
```

Resolve:

```sql
SELECT id
FROM catalog.facet
WHERE project_id = :projectId
  AND slug = 'fit-size';
```

Результат:

```text
facet_id = facet_fit_size
```

Потом:

```sql
SELECT fv.id, fv.kind
FROM catalog.facet_value fv
WHERE fv.project_id = :projectId
  AND fv.facet_id = :facetFitSizeId
  AND fv.handle = 'm'
  AND fv.parent_id IS NULL
  AND fv.enabled = true
  AND (
    fv.kind = 'source'
    OR EXISTS (
      SELECT 1
      FROM catalog.facet_value child
      WHERE child.project_id = fv.project_id
        AND child.facet_id = fv.facet_id
        AND child.parent_id = fv.id
        AND child.kind = 'source'
        AND child.enabled = true
    )
  );
```

Результат:

```text
facet_value_id = display_m
```

`parent_id IS NULL` означает root storefront value. Root value может быть:

- `kind = source`, если source value сам является storefront value;
- `kind = display`, если value является группой для нескольких source values.

Для `kind = display` resolver должен считать value пригодным для storefront
только если у него есть enabled source children через `parent_id`. Иначе
display group не имеет реальных catalog values и не должна участвовать в
фильтрах/counts. В реальной реализации resolve должен быть batch query, а не
N запросов по values.

После этого listing query работает только по posting bitmap. Запрос ниже является
фрагментом: он должен быть ограничен текущим listing scope (`base` /
collection/search scope, published visibility, vendor/product-level filters):

```sql
SELECT DISTINCT vlt.product_id
FROM base b
JOIN catalog.listing_posting_bitmap vlt
  ON vlt.project_id = :projectId
 AND vlt.product_id = b.product_id
JOIN catalog.variant_listing_index vli
  ON vli.project_id = vlt.project_id
 AND vli.variant_id = vlt.variant_id
WHERE vlt.project_id = :projectId
  AND vlt.facet_id = :facetFitSizeId
  AND vlt.facet_value_id = :displayMValueId
  AND vli.in_stock = true;
```

Так находятся все products, у которых есть in-stock variant с любым source
option value, сгруппированным в `display_m`.

## Same-variant semantics

Для option filters важно не просто найти product, у которого где-то есть
нужные values. Нужно найти один variant, который удовлетворяет всем
variant-level predicates.

Пример storefront input:

```text
?fit-size=m&color=red&price_lte=10000
```

Правильно:

```text
Найти один in-stock variant, у которого:
  - есть token fit-size = m;
  - есть token color = red;
  - есть price row <= 10000.
```

Неправильно:

```text
variant_1 имеет fit-size = m
variant_2 имеет color = red
variant_3 имеет price <= 10000
product проходит фильтр
```

Так делать нельзя, потому что пользователь ожидает покупаемый вариант, который
одновременно соответствует выбранным options и price.

SQL shape должен якорить predicates к одному `variant_id` и оставаться внутри
текущего listing scope:

```sql
SELECT vli.product_id
FROM base b
JOIN catalog.variant_listing_index vli
  ON vli.project_id = :projectId
 AND vli.product_id = b.product_id
JOIN catalog.listing_posting_bitmap fit_size
  ON fit_size.project_id = vli.project_id
 AND fit_size.variant_id = vli.variant_id
 AND fit_size.facet_id = :fitSizeFacetId
 AND fit_size.facet_value_id = ANY(:fitSizeValueIds)
JOIN catalog.listing_posting_bitmap color
  ON color.project_id = vli.project_id
 AND color.variant_id = vli.variant_id
 AND color.facet_id = :colorFacetId
 AND color.facet_value_id = ANY(:colorValueIds)
JOIN catalog.variant_listing_price_index price
  ON price.project_id = vli.project_id
 AND price.variant_id = vli.variant_id
 AND price.currency = :defaultCurrency
WHERE vli.project_id = :projectId
  AND vli.in_stock = true
  AND price.has_price = true
  AND price.price_minor <= :priceLte
GROUP BY vli.product_id;
```

## OR и AND

Правила combinatorics:

- OR внутри одного `facet_id`;
- AND между разными `facet_id`;
- все option facet predicates должны оставаться в одном variant-level group.

Пример:

```text
fit-size=m,l
color=red,blue
```

Семантика:

```text
(fit-size = m OR fit-size = l)
AND
(color = red OR color = blue)
```

Но обе группы должны проверяться на одном и том же in-stock variant.

## Deduplication

Если один variant имеет несколько source options, которые resolve-ятся в один
и тот же display value, token не должен задваиваться.

Пример variant:

```text
clothing_size = m
shoe_size = m
```

Оба source handles могут resolve-иться в:

```text
facet_id = facet_fit_size
facet_value_id = display_m
```

catalog.listing_posting_bitmap variant facet postings имеет primary key:

```text
(project_id, variant_id, facet_id, facet_value_id)
```

Поэтому для одного variant останется одна строка:

```text
variant_id = variant_a
facet_id = facet_fit_size
facet_value_id = display_m
```

Это важно для counts: product/variant не должен считаться дважды только потому,
что несколько source values ведут в одну display group.

## Counts для facet с несколькими option sources

Option counts считаются по catalog.listing_posting_bitmap variant facet postings, но результат должен
быть product cardinality, а не variant cardinality.

Для facet `fit-size` count value `m` должен отвечать на вопрос:

```text
Сколько products имеют хотя бы один in-stock variant, который после всех
активных filters, кроме active filter самого fit-size facet, может дать
fit-size = m?
```

При этом:

- source values `clothing_size:m`, `shoe_size:m`, `frame_size:m` считаются как
  один value `display_m`;
- несколько variants одного product с `display_m` дают count `1`;
- несколько source mappings одного variant с `display_m` дают count `1`;
- facet isolation исключает только active filter того же `facet_id`, а не все
  option facets.

Типовой shape для одного возвращаемого option facet. Пример ниже показывает
случай, где активны `color` и `price_lte`; если такого active filter нет,
соответствующий `EXISTS` не генерируется.

```sql
WITH option_variant_postings AS (
  SELECT
    vli.product_id,
    vlt.facet_id,
    vlt.facet_value_id
  FROM base b
  JOIN catalog.variant_listing_index vli
    ON vli.project_id = :projectId
   AND vli.product_id = b.product_id
  JOIN catalog.listing_posting_bitmap vlt
    ON vlt.project_id = :projectId
   AND vlt.variant_id = vli.variant_id
   AND vlt.facet_id = :fitSizeFacetId
   AND vlt.facet_value_id = ANY(:fitSizeVisibleValueIds::uuid[])
  WHERE vli.project_id = :projectId
    AND vli.in_stock = true
    -- active fit-size predicate omitted by facet isolation
    -- other active option predicates stay anchored to the same variant_id
    AND EXISTS (
      SELECT 1
      FROM catalog.listing_posting_bitmap color_filter
      WHERE color_filter.project_id = :projectId
        AND color_filter.variant_id = vli.variant_id
        AND color_filter.facet_id = :colorFacetId
        AND color_filter.facet_value_id = ANY(:colorValueIds::uuid[])
    )
    -- active price predicate also stays anchored to the same variant_id
    AND EXISTS (
      SELECT 1
      FROM catalog.variant_listing_price_index price
      WHERE price.project_id = :projectId
        AND price.variant_id = vli.variant_id
        AND price.currency = :defaultCurrency
        AND price.has_price = true
        AND price.price_minor <= :priceLte
    )
),
option_product_values AS (
  SELECT
    vlt.product_id,
    vlt.facet_id,
    vlt.facet_value_id
  FROM option_variant_postings vlt
  GROUP BY vlt.product_id, vlt.facet_id, vlt.facet_value_id
)
SELECT
  facet_id,
  facet_value_id,
  COUNT(*) AS product_count
FROM option_product_values
GROUP BY facet_id, facet_value_id;
```

Для каждого возвращаемого option `facet_id` строится отдельная ветка, которая
исключает только active predicate этого же `facet_id`. Ветки для нескольких
option facets можно объединять через `UNION ALL`.

`:fitSizeVisibleValueIds` должен приходить из configured visible values этого
facet, которые резолвятся хотя бы в один enabled source value. Нельзя
агрегировать все postings, когда-либо сгенерированные для project.

`GROUP BY product_id, facet_id, facet_value_id` нужен, чтобы counts были по
products и не double-count-или несколько variants или несколько source mappings.

## Что происходит при изменении grouping

Если source value перепривязали к другому display value, меняется
`facet_value.parent_id`.

Пример было:

```text
shoe_size:m -> display_m
```

Стало:

```text
shoe_size:m -> display_medium
```

Canonical product/variant мог не измениться, но listing token уже stale:

```text
старый token: facet_value_id = display_m
новый token: facet_value_id = display_medium
```

Поэтому изменение source/display grouping должно запускать token refresh:

- для affected variants, если можно найти variants по source handles;
- либо project token rebuild, если affected set нельзя дешево вычислить.

Этот refresh не должен пересчитывать price rows или stock rows. Он меняет
только roaring posting tables.

Такой же token refresh нужен не только при изменении grouping:

- source `facet_value` добавили или удалили;
- source `facet_value.enabled` изменился;
- source `facet_value.handle` изменился;
- source перестал входить или начал входить в `catalog.facet_source` этого
  facet;
- affected variants/products нельзя дешево найти по source handles.

Изменение display label, sort, swatch или public handle само по себе не требует
переписывать postings, потому что token хранит display/root `facet_value_id`.
Но storefront resolve/aggregation должен читать актуальные visible values.

## Главный инвариант

Storefront read path работает с:

```text
facet_id + facet_value_id
```

а не с:

```text
option_slug + value_slug
```

Multi-source option facet и `kind = display` полностью разворачиваются до
read path:

```text
catalog option source/value
  -> facet_source
  -> facet_value kind=source
  -> optional parent display group
  -> catalog.listing_posting_bitmap variant facet postings(facet_id, facet_value_id)
```

Благодаря этому storefront query не знает, из какой конкретной catalog option
пришло значение. Он фильтрует по одному configured facet и одному resolved
facet value, а listing index уже содержит все варианты, которые должны
попадать в эту группу.
