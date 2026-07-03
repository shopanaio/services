# Implementation plan: heavy OR optimization для option facet counts

## Статус

Документ описывает implementation-ready изменение для
`services/listing/src/repositories/storefront/sql/compileFacetCountsQuerySql.ts`.

Цель - сохранить текущую storefront semantics, но заменить дорогой
candidate-oriented signature lookup на facet-oriented reuse для тяжелых OR
запросов.

## Runtime semantics

Option facet counts отвечают на вопрос:

```text
Сколько products имеют хотя бы один storefront-eligible in-stock variant,
который одновременно удовлетворяет:

- product scope;
- product-level filters;
- active option filters, кроме изолируемой current facet;
- candidate bucket value текущей option facet;
- active price filter, если он есть, на том же variant.
```

OR внутри одной option facet:

```text
color = red OR black OR white
```

AND между разными option facets:

```text
color IN (...) AND size IN (...) AND material IN (...)
```

Facet isolation всегда по `facet_id`, не по `facet_type` и не по slug.

## Current path

Текущий signature-based path строит required sets для каждого candidate value:

```text
candidate value -> required option combination -> matching signatures -> product bitmap
```

В коде это соответствует CTE:

```text
option_required_set_arrays
option_required_set_values
option_matching_signature_rows
option_matching_signature_keys
option_signature_product_bitmaps
option_signature_price_product_bitmaps
option_signature_facet_counts
```

При тяжелом OR количество signature checks растет как:

```text
sum over option facets:
  visible bucket count of current facet
  *
  product(selected value counts from active option facets except current facet)
```

Пример:

```text
selected:
color    = 5
size     = 6
material = 4
style    = 3

visible buckets:
color    = 15
size     = 30
material = 10
style    = 35
```

Current path:

```text
color    15 * (6 * 4 * 3) = 1 080
size     30 * (5 * 4 * 3) = 1 800
material 10 * (5 * 6 * 3) =   900
style    35 * (5 * 6 * 4) = 4 200

total = 7 980 candidate-combination signature checks
```

## New heavy path

Для heavy OR нужно перейти на facet-oriented reuse:

```text
target facet -> base signatures -> bucket values -> counts
```

Для `Size`:

```text
1. Найти base signatures, которые подходят под active color/material/style.
2. Разложить эти signatures по visible Size bucket values.
3. Для каждого bucket value сделать OR product_bitmap signatures.
4. Пересечь с product scope/product filters и посчитать product cardinality.
```

Heavy path:

```text
color    base combinations = 6 * 4 * 3 =  72
size     base combinations = 5 * 4 * 3 =  60
material base combinations = 5 * 6 * 3 =  90
style    base combinations = 5 * 6 * 4 = 120

total = 342 base signature checks
```

Экономия на дорогом signature lookup:

```text
7 980 / 342 = 23.3x
```

После этого остается bucket expansion:

```text
base signatures -> listing_option_signature_value by current facet_id
```

Эта работа линейна по найденным base signatures и не повторяет поиск signatures
для каждого bucket value.

## Correct OR matching rule

Нельзя искать signatures так:

```sql
WHERE sv.value_key IN (:all_selected_values_except_current_facet)
GROUP BY sv.signature_key
HAVING COUNT(DISTINCT sv.value_key) = :selected_value_count
```

Это неверно для OR. Если выбрано:

```text
color = red OR black OR white
size = S OR M
```

signature должен содержать:

```text
one selected color AND one selected size
```

а не все 5 selected values.

Правильная проверка base signatures:

```text
signature matches target facet base
  when it contains at least one selected value
  from every active option facet except target facet
```

SQL equivalent:

```sql
HAVING COUNT(DISTINCT required_facet_id) = required_facet_count
```

## Strategy guard

Heavy path должен быть закрыт feature flag-ом и использоваться только для
запросов, где:

- feature flag включен;
- есть active option OR;
- оценка candidate checks выше threshold.

Feature flag обязателен, потому новый path меняет физический SQL план для
storefront runtime. Начальный rollout должен уметь быстро вернуть старый
candidate path без code rollback.

Начальный flag:

```ts
const LISTING_HEAVY_OPTION_FACET_COUNTS_ENABLED_DEFAULT = false;
```

Рекомендуемое имя runtime config/env:

```text
LISTING_HEAVY_OPTION_FACET_COUNTS_ENABLED
```

SQL compiler не должен читать `process.env` напрямую. Значение flag нужно
передавать в `ListingSqlRequest`, например:

```ts
interface ListingSqlRequest {
  // ...
  heavyOptionFacetCountsEnabled: boolean;
}
```

Начальное значение в production-like окружениях должно быть `false`. Включение
делать явно через config/env после проверки query plan и parity на fixtures.

Начальный threshold:

```ts
const HEAVY_OPTION_FACET_CHECK_THRESHOLD = 1000;
```

Guard должен учитывать реальные visible bucket counts из SQL CTE
`option_facet_values`, потому TypeScript знает active selected values, но не
знает runtime candidate buckets.

### TypeScript helper

Добавить в `compileFacetCountsQuerySql.ts` рядом с
`compileOptionRequiredCombinationSetSql`.

```ts
const HEAVY_OPTION_FACET_CHECK_THRESHOLD = 1000;
const MAX_OPTION_FACET_CHECK_ESTIMATE = Number.MAX_SAFE_INTEGER;

interface OptionFacetCombinationEstimate {
  defaultCombinationCount: number;
  hasOptionOr: boolean;
  perActiveFacet: readonly {
    facetId: string;
    combinationCount: number;
  }[];
}

function buildOptionFacetCombinationEstimate(
  request: ListingSqlRequest
): OptionFacetCombinationEstimate {
  const groups = request.request.filterPlan.optionFacetGroups
    .map((group) => ({
      facetId: group.facetId,
      selectedValueCount: new Set(group.valueKeys).size,
    }))
    .filter((group) => group.selectedValueCount > 0);

  const selectedCounts = groups.map((group) => group.selectedValueCount);
  const defaultCombinationCount = multiplyClamped(selectedCounts);

  return {
    defaultCombinationCount,
    hasOptionOr: groups.some((group) => group.selectedValueCount > 1),
    perActiveFacet: groups.map((group) => ({
      facetId: group.facetId,
      combinationCount: multiplyClamped(
        groups
          .filter((other) => other.facetId !== group.facetId)
          .map((other) => other.selectedValueCount)
      ),
    })),
  };
}

function multiplyClamped(values: readonly number[]): number {
  return values.reduce((acc, value) => {
    if (acc >= MAX_OPTION_FACET_CHECK_ESTIMATE) {
      return MAX_OPTION_FACET_CHECK_ESTIMATE;
    }

    const next = acc * value;
    return Number.isSafeInteger(next)
      ? next
      : MAX_OPTION_FACET_CHECK_ESTIMATE;
  }, 1);
}
```

### Strategy CTE helper

Добавить helper, который использует `option_facet_values`, поэтому вставлять
его нужно после объявления `option_facet_values`.

```ts
function compileOptionFacetCountStrategySql(
  request: ListingSqlRequest
): SQL {
  const estimate = buildOptionFacetCombinationEstimate(request);
  const estimateRows = estimate.perActiveFacet.map(
    (row) =>
      sql`(${row.facetId}::uuid, ${row.combinationCount}::numeric)`
  );

  return sql`
    option_facet_combination_estimates AS (
      ${valuesOrEmpty(
        estimateRows,
        "estimate_values",
        sql`facet_id, combination_count`,
        sql`SELECT
          NULL::uuid AS facet_id,
          NULL::numeric AS combination_count
        WHERE false`
      )}
    ),
    option_facet_bucket_counts AS (
      SELECT
        ofv.facet_id,
        COUNT(*)::numeric AS bucket_count
      FROM option_facet_values ofv
      GROUP BY ofv.facet_id
    ),
    option_candidate_check_estimate AS (
      SELECT
        COALESCE(
          SUM(
            bucket_counts.bucket_count
            * COALESCE(
                estimates.combination_count,
                ${estimate.defaultCombinationCount}::numeric
              )
          ),
          0::numeric
        ) AS candidate_combination_checks,
        ${estimate.hasOptionOr}::boolean AS has_option_or
      FROM option_facet_bucket_counts bucket_counts
      LEFT JOIN option_facet_combination_estimates estimates
        ON estimates.facet_id = bucket_counts.facet_id
    ),
    option_facet_count_strategy AS (
      SELECT
        candidate_combination_checks,
        ${request.heavyOptionFacetCountsEnabled}::boolean
          AND has_option_or
          AND candidate_combination_checks
            > ${HEAVY_OPTION_FACET_CHECK_THRESHOLD}::numeric
          AS use_heavy_signature_path
      FROM option_candidate_check_estimate
    )
  `;
}
```

Пример оценки из секции выше:

```text
defaultCombinationCount = 5 * 6 * 4 * 3 = 360

per active facet:
color    = 6 * 4 * 3 = 72
size     = 5 * 4 * 3 = 60
material = 5 * 6 * 3 = 90
style    = 5 * 6 * 4 = 120

SQL bucket counts:
color    = 15
size     = 30
material = 10
style    = 35

candidate_combination_checks =
  15 * 72 + 30 * 60 + 10 * 90 + 35 * 120 = 7 980

use_heavy_signature_path = true
```

Если feature flag выключен:

```text
use_heavy_signature_path = false
```

независимо от `candidate_combination_checks`.

## Integration points

В начале `compileFacetCountsQuerySql`:

```ts
export function compileFacetCountsQuerySql(request: ListingSqlRequest) {
  const optionRequiredCombinationSetSql =
    compileOptionRequiredCombinationSetSql(request);
  const optionFacetCountStrategySql =
    compileOptionFacetCountStrategySql(request);

  return sql`
    WITH
    ${compileCoreListingSql(request)},
    ...
    option_facet_values AS (...),
    ...
    ${optionFacetCountStrategySql},
    ${optionRequiredCombinationSetSql},
    ...
  `;
}
```

Candidate path оставить, но отключать через strategy:

```sql
option_signature_base_state AS (
  SELECT
    ofv.value_key,
    COALESCE(sfs.has_value AND sfs.value = false, false) AS force_zero,
    NOT strategy.use_heavy_signature_path
      AND NOT COALESCE(sfs.has_value AND sfs.value = false, false)
      AS signature_lookup_enabled
  FROM option_facet_values ofv
  JOIN option_candidate_combination_set combination_set
    ON combination_set.value_key = ofv.value_key
  CROSS JOIN stock_filter_state sfs
  CROSS JOIN option_facet_count_strategy strategy
)
```

Финальный CTE заменить с:

```sql
option_facet_counts AS (
  SELECT * FROM option_signature_facet_counts
)
```

на:

```sql
option_facet_counts AS (
  SELECT * FROM option_signature_facet_counts
  UNION ALL
  SELECT * FROM option_heavy_signature_facet_counts
)
```

## Heavy SQL CTE shape

Добавить CTE после candidate signature bitmaps или перед
`option_facet_counts`.

```sql
option_heavy_targets AS (
  SELECT DISTINCT
    ofv.facet_id AS target_facet_id
  FROM option_facet_values ofv
  CROSS JOIN option_facet_count_strategy strategy
  WHERE strategy.use_heavy_signature_path
),
option_active_filter_values AS (
  SELECT DISTINCT
    rf.facet_id,
    rf.value_key
  FROM resolved_facets rf
  WHERE rf.facet_type = 'OPTION'
),
option_heavy_required_values AS (
  SELECT
    target.target_facet_id,
    active.facet_id AS required_facet_id,
    active.value_key
  FROM option_heavy_targets target
  JOIN option_active_filter_values active
    ON active.facet_id <> target.target_facet_id
),
option_heavy_required_counts AS (
  SELECT
    target.target_facet_id,
    COUNT(DISTINCT required.required_facet_id)::int AS required_facet_count
  FROM option_heavy_targets target
  LEFT JOIN option_heavy_required_values required
    ON required.target_facet_id = target.target_facet_id
  GROUP BY target.target_facet_id
),
option_heavy_base_signatures AS (
  SELECT
    counts.target_facet_id,
    os.signature_key
  FROM option_heavy_required_counts counts
  JOIN input i ON true
  JOIN listing.listing_option_signature os
    ON os.project_id = i.project_id
  WHERE counts.required_facet_count = 0

  UNION ALL

  SELECT
    required.target_facet_id,
    sv.signature_key
  FROM option_heavy_required_values required
  JOIN input i ON true
  JOIN option_heavy_required_counts counts
    ON counts.target_facet_id = required.target_facet_id
   AND counts.required_facet_count > 0
  JOIN listing.listing_option_signature_value sv
    ON sv.project_id = i.project_id
   AND sv.value_key = required.value_key
  GROUP BY
    required.target_facet_id,
    sv.signature_key,
    counts.required_facet_count
  HAVING COUNT(DISTINCT required.required_facet_id)
    = counts.required_facet_count
),
option_heavy_bucket_signatures AS (
  SELECT DISTINCT
    ofv.facet_id,
    ofv.facet_type,
    ofv.value_key,
    base.signature_key
  FROM option_heavy_base_signatures base
  JOIN input i ON true
  JOIN listing.listing_option_signature_value sv
    ON sv.project_id = i.project_id
   AND sv.signature_key = base.signature_key
   AND sv.facet_id = base.target_facet_id
  JOIN option_facet_values ofv
    ON ofv.facet_id = base.target_facet_id
   AND ofv.value_key = sv.value_key
)
```

Why this is correct:

- `option_heavy_required_values` excludes current target facet.
- `COUNT(DISTINCT required_facet_id)` implements OR within each required facet.
- `option_heavy_bucket_signatures` adds the candidate bucket value by expanding
  base signatures only through values of the current target facet.
- `option_facet_values` limits returned buckets to visible configured display
  values.

## Heavy count without price

```sql
option_heavy_signature_product_bitmaps AS (
  SELECT
    bucket.value_key,
    COALESCE(
      rb_or_agg(os.product_bitmap) FILTER (WHERE os.product_bitmap IS NOT NULL),
      ${emptyRoaringBitmapSql()}
    ) AS bitmap
  FROM option_heavy_bucket_signatures bucket
  JOIN input i ON true
  JOIN listing.listing_option_signature os
    ON os.project_id = i.project_id
   AND os.signature_key = bucket.signature_key
  GROUP BY bucket.value_key
)
```

`listing_option_signature.product_bitmap` уже deduplicated по `product_doc_id`
и построен только из storefront-eligible in-stock variants.

## Heavy count with active price

Для active price filter нельзя использовать только
`listing_option_signature.product_bitmap`: price должен совпасть с variant, у
которого есть нужная option signature.

Нужно считать через `listing.variant_listing_price_index`:

```sql
option_heavy_signature_price_product_bitmaps AS (
  SELECT
    bucket.value_key,
    COALESCE(
      rb_build_agg(vp.product_doc_id)
        FILTER (WHERE vp.product_doc_id IS NOT NULL),
      ${emptyRoaringBitmapSql()}
    ) AS bitmap
  FROM option_heavy_bucket_signatures bucket
  JOIN input i
    ON i.price_filter_json <> '{}'::jsonb
  LEFT JOIN listing.variant_listing_price_index vp
    ON vp.project_id = i.project_id
   AND vp.signature_key = bucket.signature_key
   AND vp.currency = i.currency
   AND vp.has_price = true
   AND vp.price_minor IS NOT NULL
   AND vp.variant_doc_id IS NOT NULL
   AND vp.product_doc_id IS NOT NULL
   AND vp.product_id IS NOT NULL
   AND (
     NOT (i.price_filter_json ? 'minPriceMinor')
     OR vp.price_minor >= (i.price_filter_json->>'minPriceMinor')::bigint
   )
   AND (
     NOT (i.price_filter_json ? 'maxPriceMinor')
     OR vp.price_minor <= (i.price_filter_json->>'maxPriceMinor')::bigint
   )
  GROUP BY bucket.value_key
)
```

`rb_build_agg(vp.product_doc_id)` naturally deduplicates products in the bitmap,
so multiple priced variants of the same product do not double-count.

## Heavy final counts

```sql
option_heavy_signature_facet_counts AS (
  SELECT
    ofv.facet_id,
    ofv.facet_type,
    ofv.value_key,
    CASE
      WHEN COALESCE(sfs.has_value AND sfs.value = false, false) THEN 0
      WHEN i.price_filter_json <> '{}'::jsonb
      THEN rb_cardinality(
        COALESCE(price_bitmaps.bitmap, ${emptyRoaringBitmapSql()})
        & option_count_product_scope.bitmap
      )::int
      ELSE rb_cardinality(
        COALESCE(signature_bitmaps.bitmap, ${emptyRoaringBitmapSql()})
        & option_count_product_scope.bitmap
      )::int
    END AS count
  FROM option_facet_values ofv
  CROSS JOIN input i
  CROSS JOIN stock_filter_state sfs
  CROSS JOIN option_count_product_scope
  CROSS JOIN option_facet_count_strategy strategy
  LEFT JOIN option_heavy_signature_product_bitmaps signature_bitmaps
    ON signature_bitmaps.value_key = ofv.value_key
  LEFT JOIN option_heavy_signature_price_product_bitmaps price_bitmaps
    ON price_bitmaps.value_key = ofv.value_key
  WHERE strategy.use_heavy_signature_path
)
```

`in_stock = false` сохраняет текущую behavior: option signature index построен
из in-stock variants, поэтому option counts forced to zero.

## Required index

Существующий индекс:

```sql
CREATE INDEX idx_listing_option_signature_value_lookup
  ON listing.listing_option_signature_value (
    project_id,
    value_key,
    signature_key
  );
```

хорош для lookup по selected `value_key`, но heavy bucket expansion делает join:

```sql
project_id + facet_id + signature_key -> value_key
```

Добавить migration, если `EXPLAIN` показывает scan/hash на большой части
`listing_option_signature_value`:

```sql
CREATE INDEX idx_listing_option_signature_value_facet_signature
  ON listing.listing_option_signature_value (
    project_id,
    facet_id,
    signature_key,
    value_key
  );
```

В Drizzle model:

```ts
index("idx_listing_option_signature_value_facet_signature").on(
  table.projectId,
  table.facetId,
  table.signatureKey,
  table.valueKey
)
```

## Example with real data shape

Visible bucket values:

```text
Size:
S, M, L, XL
```

Active filters:

```text
Color: black OR navy
Material: cotton OR wool
```

Signatures:

```text
sig1: color:black, size:S, material:cotton -> products {1, 2}
sig2: color:black, size:M, material:wool   -> products {2, 3}
sig3: color:navy,  size:M, material:cotton -> products {4}
sig4: color:red,   size:L, material:cotton -> products {5}
```

For target facet `Size`:

```text
base requirement:
  one of Color {black, navy}
  AND one of Material {cotton, wool}

base signatures:
  sig1, sig2, sig3

bucket expansion:
  S -> sig1
  M -> sig2, sig3
  L -> none
  XL -> none

counts before product scope:
  S = cardinality({1, 2}) = 2
  M = cardinality({2, 3} OR {4}) = 3
  L = 0
  XL = 0
```

`sig4` is excluded because it has `color:red`, which does not match the active
Color OR group.

## Implementation steps

1. Add `HEAVY_OPTION_FACET_CHECK_THRESHOLD`,
   `buildOptionFacetCombinationEstimate`,
   `multiplyClamped` and `compileOptionFacetCountStrategySql` to
   `compileFacetCountsQuerySql.ts`.
2. Add `heavyOptionFacetCountsEnabled` to `ListingSqlRequest` and populate it
   from listing runtime config/env. Default must be `false`.
3. Insert `${optionFacetCountStrategySql}` after `option_facet_values` exists.
4. Update `option_signature_base_state` so candidate path runs only when
   `NOT strategy.use_heavy_signature_path`.
5. Add heavy CTEs:
   - `option_heavy_targets`;
   - `option_active_filter_values`;
   - `option_heavy_required_values`;
   - `option_heavy_required_counts`;
   - `option_heavy_base_signatures`;
   - `option_heavy_bucket_signatures`;
   - `option_heavy_signature_product_bitmaps`;
   - `option_heavy_signature_price_product_bitmaps`;
   - `option_heavy_signature_facet_counts`.
6. Change `option_facet_counts` to `UNION ALL` candidate and heavy counts.
7. Add the facet/signature lookup index if query plan needs it.
8. Keep existing result mapper unchanged. Output columns stay:
   `facet_id`, `facet_type`, `value_key`, `count`.

## Verification matrix

Compare old candidate path and new heavy path on the same fixtures:

```text
1. no option filters
   expected: strategy false, candidate path only

2. feature flag disabled
   expected: strategy false, candidate path only, regardless of estimate

3. feature flag enabled, one option facet, one selected value
   expected: strategy false

4. feature flag enabled, one option facet, multiple selected values
   expected: heavy may enable only if candidate estimate > threshold

5. feature flag enabled, multiple option facets with OR values
   expected: heavy true when estimated checks > threshold

6. active product facets + active option facets
   expected: product filters apply through option_count_product_scope

7. active price filter + active option OR
   expected: counts use variant_listing_price_index, not signature product_bitmap

8. active in_stock=false
   expected: option counts are zero

9. merged/source display values
   expected: counts use resolved display value_key from option_facet_values

10. target facet is also active
   expected: filters from target facet are isolated out before bucket expansion

11. target facet is inactive
    expected: base uses all active option groups
```

Не запускать `test` или `tsc` по проектному правилу. Для проверки новой версии
кода запускать только build через project tooling, когда implementation уже
сделана.

## Rollback

Rollback безопасный:

```text
1. set LISTING_HEAVY_OPTION_FACET_COUNTS_ENABLED=false
2. candidate path becomes the only producer again
3. heavy CTEs return no rows
```

Временный code switch:

```sql
option_facet_count_strategy AS (
  SELECT
    candidate_combination_checks,
    false AS use_heavy_signature_path
  FROM option_candidate_check_estimate
)
```
