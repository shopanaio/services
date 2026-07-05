# Фильтрация option facets с несколькими sources через listing index

## Назначение

Документ объясняет частный storefront case:

- один storefront facet типа `option` может быть собран из нескольких catalog
  option sources;
- значения этих options могут быть сгруппированы через
  `facet_value.kind = 'display'`;
- runtime listing index хранит не raw option handles и не row-based token
  tables, а roaring bitmap memberships for resolved
  `facet_id + facet_value_id`;
- filtering and counts must preserve same-variant semantics.

Канонические документы:

- `services/listing/docs/listing-posting-list-search-engine-index.ru.md`
- `services/listing/docs/listing-index-db-schema.ru.md`
- `services/listing/docs/listing-storefront-operations-explained.ru.md`

## Термины

### Catalog option source

Catalog option source - это конкретная option-модель товара, например:

- `size`
- `clothing_size`
- `shoe_size`
- `frame_size`

В facet configuration такие sources хранятся в `catalog.facet_source`.
Для facet типа `option` один storefront facet может выбрать несколько option
sources.

Пример:

```text
facet: Fit Size
facet_source:
  - clothing_size
  - shoe_size
  - frame_size
```

Storefront показывает один фильтр `Fit Size`, но source data приходит из
нескольких catalog options.

### Source value

Source value - значение конкретного catalog source.

Для option facets source value должен быть source-qualified, потому что
одинаковый value handle в разных options может значить разные вещи.

Persisted source value handle:

```text
sourceHandle:valueHandle
```

Examples:

```text
clothing_size:m
shoe_size:m
frame_size:m
```

Если root source value остается public storefront value, его public handle тоже
source-qualified. Если URL должен быть `?fit-size=m`, нужен root display value
with `handle = m`, к которому attached source values.

### Display value

`facet_value.kind = 'display'` - группирующее значение, которое объединяет
несколько source values в одно storefront value.

Example:

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

Storefront видит один value:

```text
Fit Size = M
```

## Что хранит runtime index

Runtime index хранит bitmap row:

```text
store_id
entity_type = variant
field = facet
value_key = <facet_id>:<facet_value_id>
bitmap = roaringbitmap of variant_doc_id
cardinality = rb_cardinality(bitmap)
```

Он не хранит:

- `option_slug`
- `value_slug`
- `source_handle`
- `source_value_enabled`
- `kind`
- `parent_id`
- `product_id`
- `variant_id`

Canonical `variant_id -> variant_doc_id -> product_doc_id` связь живет в
`listing.variant_listing_index`.

Raw handles используются только transient во время sync/rebuild, чтобы resolve
canonical option values into stable `facet_id` / `facet_value_id`. Storefront read
path работает только с resolved ids and roaring bitmaps.

## Как source value резолвится при sync

Допустим есть facet:

```text
facet:
  id = facet_fit_size
  slug = fit-size
  type = option

facet_source:
  facet_id = facet_fit_size
  facet_type = option
  handle = clothing_size

facet_source:
  facet_id = facet_fit_size
  facet_type = option
  handle = shoe_size
```

Facet values:

```text
display_m:
  kind = display
  handle = m
  parent_id = null

source_clothing_size_m:
  kind = source
  handle = clothing_size:m
  parent_id = display_m

source_shoe_size_m:
  kind = source
  handle = shoe_size:m
  parent_id = display_m
```

Variant A has canonical option:

```text
clothing_size = m
```

Sync builds source handle:

```text
clothing_size:m
```

Resolve:

1. Find `facet_source` where `facet_type = 'option'` and
   `handle = 'clothing_size'`.
2. Get `facet_id = facet_fit_size`.
3. Find enabled source `facet_value` with
   `facet_id = facet_fit_size`, `kind = source`, `handle = clothing_size:m`.
4. If source value is missing, disabled or no longer belongs to configured
   source, do not add bitmap membership.
5. If `source.parent_id IS NOT NULL`, resolved value is parent display id.
6. Otherwise resolved value is source value id.

Result:

```text
facet_id = facet_fit_size
facet_value_id = display_m
value_key = facet_fit_size:display_m
```

Sync adds `variant_doc_id` for Variant A to bitmap row:

```text
store_id = project_1
entity_type = variant
field = facet
value_key = facet_fit_size:display_m
```

Variant B with `shoe_size = m` resolves to the same `value_key`, so both variant
doc ids land in the same bitmap row.

## Правило выбора `facet_value_id`

Resolve rule:

```text
source value found and enabled

if source_value.parent_id IS NOT NULL:
  facet_value_id = source_value.parent_id
else:
  facet_value_id = source_value.id
```

`kind = display` itself is not stored in runtime index. Display affects
membership only through source value parent mapping.

If source value disabled, missing or removed from `facet_source`, old bitmap
memberships become stale and must be refreshed.

## Как storefront filter резолвится на read path

Storefront input:

```text
?fit-size=m
```

Read path does not inspect raw option values. It resolves public handles:

```text
facet slug = fit-size
value handle = m
```

Resolver returns:

```text
facet_id = facet_fit_size
facet_type = option
facet_value_id = display_m
value_key = facet_fit_size:display_m
```

For `kind = display`, resolver must check that the display value has at least one
enabled source child. Otherwise the value has no real catalog membership and must
not participate in filters/counts.

Listing query then reads bitmap row:

```sql
SELECT p.bitmap
FROM listing.listing_posting_bitmap p
WHERE p.store_id = :storeId
  AND p.entity_type = 'variant'
  AND p.field = 'facet'
  AND p.value_key = :fitSizeDisplayMValueKey;
```

Missing posting row means empty bitmap for this value.

## Same-variant semantics

Option filters must find one in-stock variant that satisfies all active
variant-level predicates.

Input:

```text
?fit-size=m&color=red&price_lte=10000
```

Correct:

```text
variant_matches =
  fit_size_m_variant_bitmap
  & color_red_variant_bitmap
  & price_lte_variant_bitmap
  & in_stock_variant_bitmap
```

Then:

```text
product_matches = project_variants_to_products(variant_matches)
```

Incorrect:

```text
variant_1 has fit-size = m
variant_2 has color = red
variant_3 has price <= 10000
product passes filter
```

This is not allowed because user expects one purchasable variant matching all
selected options and price.

## OR и AND

Rules:

- OR внутри одного `facet_id`;
- AND между разными `facet_id`;
- all option facet predicates stay in one variant-level bitmap group.

Example:

```text
fit-size=m,l
color=red,blue
```

Semantics:

```text
(fit-size:m OR fit-size:l)
AND
(color:red OR color:blue)
```

Both groups are applied on `variant_doc_id` before projection.

## Deduplication

If one variant has multiple source options resolving to the same display value,
sync must add `variant_doc_id` to the bitmap only once.

Example:

```text
clothing_size = m
shoe_size = m
```

Both resolve to:

```text
facet_id = facet_fit_size
facet_value_id = display_m
value_key = facet_fit_size:display_m
```

Bitmap membership is a set membership, so one `variant_doc_id` appears once in
the roaring bitmap. This prevents double-counting for variants or products.

## Counts для facet с несколькими option sources

Option counts are product cardinality, not variant cardinality.

For facet `fit-size`, count value `m` answers:

```text
How many products have at least one in-stock variant that can yield fit-size=m
after all active filters except active filters from fit-size facet?
```

Rules:

- source values `clothing_size:m`, `shoe_size:m`, `frame_size:m` count as one
  value `display_m`;
- multiple variants of one product with `display_m` count as one product;
- multiple source mappings of one variant with `display_m` count as one variant
  membership;
- facet isolation excludes only the active predicate of the same `facet_id`.

Canonical count shape:

```text
variant_base =
  active option filters except current facet
  & active price bitmap if price filter exists
  & in_stock_variant_bitmap

value_variants = variant_base & option_value_bitmap
value_products = project_variants_to_products(value_variants) & product_base
value_count = rb_cardinality(value_products)
```

For every returned option `facet_id`, query builder builds a count branch that
omits only this facet's active predicate. Branches for multiple option facets may
be unioned in SQL as long as common base bitmaps are reused and one full query per
value is avoided.

Returned values must come from configured visible values that resolve to at
least one enabled source value. Do not aggregate every posting row ever generated
for the project.

## Что происходит при изменении grouping

If source value is moved to another display value, `facet_value.parent_id`
changes.

Example:

```text
before: shoe_size:m -> display_m
after:  shoe_size:m -> display_medium
```

Canonical product/variant may not change, but bitmap membership is stale:

```text
old value_key = facet_fit_size:display_m
new value_key = facet_fit_size:display_medium
```

This must trigger posting refresh:

- for affected variants, if they can be found by source handles;
- otherwise project-level posting rebuild for the affected facet type.

This refresh should not recompute price rows or stock rows. It changes only
resolved bitmap memberships and affected bitmap cardinalities.

Refresh is also required when:

- source `facet_value` is added or removed;
- source `facet_value.enabled` changes;
- source `facet_value.handle` changes;
- source enters or leaves `catalog.facet_source`;
- affected variants/products cannot be found cheaply by source handles.

Changing display label, sort, swatch or public handle does not require rewriting
posting bitmaps if `facet_value_id` remains the same. Storefront
resolve/aggregation still reads current visible values.

## Главный инвариант

Storefront read path works with:

```text
facet_id + facet_value_id -> value_key -> roaring bitmap of variant_doc_id
```

not with:

```text
option_slug + value_slug
```

Multi-source option facet and `kind = display` are resolved before read path.
Runtime listing queries operate on stable ids and set algebra.

