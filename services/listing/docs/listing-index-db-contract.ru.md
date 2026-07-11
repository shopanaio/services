# Listing index DB contract

Статус: `CURRENT`  
Дата: 2026-07-11

Фактический clean-DB contract после universal variant-term cutover. Источник
DDL: `migrations/domains/0100_listing_index/0100_listing_index__tables.sql`.

## Posting kinds

| entity_type | field | value_key | bitmap doc ID |
|---|---|---|---|
| product | category | category UUID | product_doc_id |
| product | vendor | vendor UUID | product_doc_id |
| product | facet | facet UUID + `:` + value UUID | product_doc_id |
| variant | term | `JSON.stringify(["v1", fieldKey, valueKey])` | variant_doc_id |
| variant | variant_product | product UUID | variant_doc_id |

DB constraint запрещает `variant + facet` и `product + term`.

## Term invariants

- universe: `system.state=indexable`;
- каждый term bitmap — subset universe;
- available/unavailable intersection пуст, union равен universe;
- declared rows сохраняются с empty roaring bitmap;
- `cardinality = rb_cardinality(bitmap)`;
- registry version `2026-07-11.v1`, encoding version `v1`.

## Price

`variant_listing_price_index` хранит rows всех indexable variants независимо
от criterion state. В таблице нет availability, delivery или signature columns.
Range/sort пересекают price variant IDs с canonical matching bitmap.

Criterion-neutral indexes покрывают price ASC/DESC и per-product minimum.

## Removed structures

`listing_option_signature*` удалены. Legacy variant OPTION postings
`field=facet` не поддерживаются, не читаются и не мигрируются.

## Snapshot и migration policy

Storefront branches выполняются последовательно в одной
`REPEATABLE READ READ ONLY` transaction. Universal terms используют
существующие posting columns/PK, поэтому отдельная migration не создаётся:
initial clean-DB DDL обновлён. Conversion/reindex старого локального index вне
scope.
