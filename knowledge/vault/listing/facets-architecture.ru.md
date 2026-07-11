---
tags: [listing, facets, architecture, storefront]
related: [architecture/overview, patterns/repository]
---

# Архитектура Listing Facets

Актуальный contract после перехода на universal variant-term index. Модель
рассчитана на clean DB; dual-read, dual-write и legacy variant facet postings
отсутствуют.

## Слои и public input

Facet configuration хранит публичные slug/handle, labels, порядок, swatches и
configured OPTION/TAG/FEATURE values. Listing index хранит product postings,
universal variant terms, typed price index, sort/search rows и mapping
variant-to-product. Storefront query собирает page, total, counts и virtual
facets из одного canonical contract.

`available` имеет три режима:

```text
input отсутствует -> ALL, availability predicate отсутствует
true              -> AVAILABLE
false             -> UNAVAILABLE
```

Virtual availability facet возвращает оба declared states (`true`, `false`),
включая count `0`. Mixed product может входить в оба isolated buckets.

## Physical postings

| entity_type | field | value_key | bitmap |
|---|---|---|---|
| product | category | category UUID | product_doc_id |
| product | vendor | vendor UUID | product_doc_id |
| product | facet | `<facetId>:<facetValueId>` | product_doc_id |
| variant | term | `JSON.stringify(["v1", fieldKey, valueKey])` | variant_doc_id |
| variant | variant_product | product UUID | variant_doc_id |

Product `field=facet` используется только TAG/FEATURE. `variant + facet` и
`product + term` запрещены repository и DB constraints.

## Universal variant terms

```ts
interface ListingVariantTerm {
  readonly fieldKey: string;
  readonly valueKey: string;
}
```

Начальный registry:

| fieldKey | valueKey | Domain |
|---|---|---|
| `system.state` | `indexable` | declared, retain empty |
| `criterion.availability` | `available`, `unavailable` | declared, retain empty |
| `criterion.delivery.ready` | `true`, `false`, `unknown` | reference definition |
| `option:<facetId>` | `<facetValueId>` | configured stable UUIDs |

Rules:

- field/value trimmed, non-empty и case-sensitive;
- labels и mutable handles не входят в identity;
- OPTION принимает только resolved facet/value UUID;
- declared domain отклоняет unknown value;
- terms deduplicate и сортируются до hashing/write;
- raw broker/public payload не принимает encoded key.

Для нового criterion нужно определить semantics/unknown policy, добавить
normalized upstream field, registry definition/materializer и при необходимости
public mapper. DB column/table, новый bitmap compiler и отдельная projection не
нужны.

## Universe и availability

В runtime index входят только variants со `status=active`. Каждый indexable
variant находится в `system.state=indexable` и ровно в одном availability
state. Canonical availability определяется только `availableForSale`; quantity
`0` не меняет backorder state.

`criterion.availability` — единственный canonical source of truth. Product
availability является производной проекцией: `true`, если существует хотя бы
один canonical available variant; товар без active variants получает `false`.
Значение хранится в `listing_posting_product_sort.bool_value` для ordering и
diagnostics. В `product_listing_index` и `variant_listing_index` колонок
`in_stock` нет.
`variant_listing_price_index` содержит priced rows всех indexable variants
независимо от availability.

## Canonical query

```text
productBase = published scope & product TAG/FEATURE/vendor filters

variantTermCandidates =
  system.state=indexable
  & AND(OR(values внутри каждой variant term group))

variantCandidates = variantTermCandidates & numeric price candidates

productMatches =
  variant witness exists
    ? productBase & projectDistinctProducts(variantCandidates)
    : productBase
```

Availability, OPTION и future criteria компилируются одинаково. PRICE остаётся
typed numeric index. Все predicates пересекаются в variant space до projection,
поэтому predicates разных variants одного product не склеиваются. Page и total
используют один `compileProductMatchesBitmapSql` contract. Product без active
variants остаётся в ALL, но исключается при variant witness.

## Counts и metadata

Target isolation исключает только target group:

```text
candidateVariants = allOtherGroups & targetValue & numericCandidates
count = cardinality(productBase & projectDistinctProducts(candidateVariants))
```

Counts — distinct products. OPTION, availability и future criterion используют
один algebra. Product TAG/FEATURE сохраняют текущий variant witness. Selected
configured value остаётся при count `0`; unselected zero скрывается. Internal
`system.*` terms не публикуются. OPTION metadata остаётся в
`facet`/`facet_value`, а boolean metadata задаётся registry.

PRICE virtual facet исключает только active price range и считает min/max по
price rows variants, matching remaining terms.

## Sort и cursor

Matched-price collector стартует от `productMatches` и выбирает минимальную
цену только среди canonical matching variants. ASC/DESC меняет итоговый порядок,
но не eligible set. Product без eligible price остаётся в page с `NULLS LAST`.
Availability aggregate разрешён только как ordering component. Cursor повторяет
nullable DB tuple и содержит product/variant tie-breakers.

## Write path

`ListingBuildSyncWriteModelScript` создаёт version `2`: active variants,
canonical sorted terms и criterion-neutral price rows. Single и batch writers
в одной item transaction обновляют rows, price, sort, projection, postings и
item state.

Term changes сливаются по encoded key:

```text
bitmap = (bitmap - removedVariantDocIds) | addedVariantDocIds
```

Keys/doc IDs сортируются; hot key обновляется один раз на batch. Empty declared
universe/availability rows сохраняются, empty OPTION rows удаляются.

Option signature tables, repository, DDL, wiring и SQL strategies удалены:
same-variant parity/benefit не были доказаны, canonical term path является
единственным correctness source.

## Snapshot, observability и audit

Один listing request выполняет normalization, page, total, metadata, virtual
facets и counts отдельными statements без общей transaction. До включения
параллельного orchestration branches запускаются последовательно; каждый
statement использует собственный `READ COMMITTED` snapshot.

Request log содержит число groups/terms, cardinality term/numeric/final variant
candidates, projected products, collector и snapshot strategy без raw payload.

`ListingPostingBitmapRepository.auditVariantTermIndex()` bounded-проверяет:
cardinality, subset universe, availability partition, mapping, price subset,
наличие и non-null availability sort projection, parity с canonical terms,
одинаковое availability-значение во всех sort rows товара и registry
divergence.

## DB decision

Существующих posting columns и PK
`(store_id, entity_type, field, value_key)` достаточно. Criterion-specific
columns не добавляются. Price indexes остаются criterion-neutral. Initial DDL
обновлён для clean DB; conversion/reindex старого listing index вне scope.
