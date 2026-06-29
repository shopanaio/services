# План поискового BM25 индекса по названию товара через pg_search

## Контекст

`docs/listing/listing-index-redesign-plan.ru.md` отделяет listing read model от
full-text search. `product_listing_index` и `variant_listing_index` отвечают за
scope, filters, facets, counts, pagination и sort.

Этот документ описывает отдельный BM25 индекс только для поиска по названию
товара. Индекс не ищет по description, SEO, handle, vendor, tags, features,
options или другим полям. Текстовый поиск возвращает candidate set и BM25 score,
а финальная видимость, variant-correct filters, facet counts и business sort
остаются в listing SQL pipeline.

Техническая база: ParadeDB `pg_search` extension. На момент проверки
документации ParadeDB v0.24.1:

- extension устанавливается как `pg_search`, требует `shared_preload_libraries = 'pg_search'` и `CREATE EXTENSION pg_search`;
- индекс создается через `USING bm25 (...) WITH (key_field = '...')`;
- key field должен быть уникальным, первым полем BM25 index и row identifier;
- для scoring используется `pdb.score(<key_field>)`;
- match disjunction использует `|||`;
- fuzzy можно подключать через cast вида `::pdb.fuzzy(n)`.

Источники:

- https://docs.paradedb.com/deploy/self-hosted/extension
- https://docs.paradedb.com/documentation/indexing/create-index
- https://docs.paradedb.com/documentation/full-text/match
- https://docs.paradedb.com/documentation/full-text/fuzzy
- https://docs.paradedb.com/documentation/sorting/score
- https://docs.paradedb.com/documentation/sorting/topk

## Цели

1. Добавить PostgreSQL-native BM25 search без Typesense/Elasticsearch.
2. Искать только по product title в выбранной locale.
3. Сохранить разделение: BM25 индекс ищет название, listing index фильтрует и
   считает фасеты.
4. Поддержать multi-tenant и locale-aware поиск: `project_id` + `locale`.
5. Возвращать стабильный relevance sort в общем listing contract:
   `in_stock DESC, relevance_score DESC, product_id ASC`.
6. Обеспечить полный и project-scoped rebuild индекса из
   `catalog.product_translation`.

## Не цели

- Не искать по description, excerpt, SEO title/description.
- Не искать по handle.
- Не искать по vendor, tags, features, options, categories.
- Не хранить в BM25 индексе facet/source handles.
- Не переносить category/listing/facet фильтрацию в `pg_search`.
- Не строить semantic/vector search.
- Не внедрять Metarank или персонализацию.
- Не делать cross-service global search.
- Не смешивать этот индекс со старыми `catalog.product_search_index` /
  `catalog.variant_search_index`.

## Расширение и окружение

`pg_search` является инфраструктурной зависимостью PostgreSQL instance, а не
обычной SQL-only миграцией.

Требования:

```conf
shared_preload_libraries = 'pg_search'
```

```sql
CREATE EXTENSION IF NOT EXISTS pg_search;
```

Deployment rules:

- В локальном docker/dev окружении добавить образ или init step с установленным
  `pg_search`.
- В self-hosted/prod окружении extension должен быть установлен до миграций
  catalog.
- Миграция catalog может выполнять `CREATE EXTENSION IF NOT EXISTS pg_search`,
  но не может сама поменять `shared_preload_libraries`.
- Если extension недоступен, storefront search должен явно падать при старте
  сервиса или миграции, а не молча переключаться на `ILIKE`.

## Новая схема

Создать отдельную таблицу:

- `catalog.product_title_bm25_search_index`

Одна строка на project + product + locale. Валюта не входит в search index:
цена и доступность остаются в listing index.

```sql
CREATE TABLE catalog.product_title_bm25_search_index (
  search_id              uuid NOT NULL,
  project_id             uuid NOT NULL,
  product_id             uuid NOT NULL REFERENCES catalog.product(id) ON DELETE CASCADE,
  locale                 varchar(8) NOT NULL,

  kind                   catalog.product_kind NOT NULL,
  status                 varchar(16) NOT NULL, -- 'published' | 'draft'
  published_at           timestamptz,
  product_created_at     timestamptz NOT NULL,
  product_updated_at     timestamptz NOT NULL,
  product_revision       int NOT NULL DEFAULT 0,

  title                  text NOT NULL DEFAULT '',

  indexed_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (project_id, product_id, locale),
  UNIQUE (search_id)
);
```

Column semantics:

- `search_id` is the BM25 key field. It must be globally unique and stable for
  `(project_id, product_id, locale)`. Use deterministic UUID or preserve the
  generated value on upsert.
- `status` mirrors product visibility. Soft-deleted products are deleted from the
  index.
- `title` comes only from `catalog.product_translation.name` for the same
  `product_id`, `project_id` and `locale`.
- Empty or missing title rows should be indexed as `title = ''` only if the
  locale is enabled for the project. They will not match normal text queries.

Ordinary indexes:

```sql
CREATE INDEX idx_product_title_bm25_project_locale_product
  ON catalog.product_title_bm25_search_index (project_id, locale, product_id);

CREATE INDEX idx_product_title_bm25_visible
  ON catalog.product_title_bm25_search_index (project_id, locale, published_at DESC, product_id)
  WHERE status = 'published';
```

BM25 index:

```sql
CREATE INDEX idx_product_title_bm25_search
  ON catalog.product_title_bm25_search_index
  USING bm25 (
    search_id,
    project_id,
    locale,
    status,
    kind,
    product_id,
    title,
    published_at,
    product_created_at
  )
  WITH (key_field = 'search_id');
```

Notes:

- `title` is the only searchable text field.
- `project_id`, `locale`, `status`, `kind` are included so tenant, locale and
  visibility filters stay inside the BM25 query.
- Before implementation, verify that the selected `pg_search` version accepts
  `uuid`, `varchar` and `timestamptz` fields in `USING bm25`. If `uuid` is not
  accepted as key field, replace `search_id uuid` with `search_key text` and
  keep it unique. If non-text fields are not accepted for indexed filters, keep
  only supported fields in BM25 index and apply unsupported filters in the SQL
  wrapper before joining listing index.

## Tokenizers и языки

Phase 1:

- использовать default unicode tokenizer для mixed `uk/en/ru`;
- не включать stemming как обязательный шаг, пока не выбрана стратегия для
  украинского и русского языков;
- fuzzy делать только fallback по названию, а не основным запросом.

## Query flow

### 1. Normalize input

Storefront input:

- `query`
- `locale`
- listing scope: category, collection или global catalog search
- structured filters: facets, price, in_stock, vendor
- sort
- pagination

Normalizer:

1. trim query;
2. collapse whitespace;
3. empty query means ordinary listing without BM25 candidate set;
4. cap query length, for example 128 chars;
5. parameterize query; never interpolate raw user input into SQL.

### 2. BM25 candidate relation

For relevance sort and exact facet/total semantics, the search relation must
represent all title matches for the normalized query inside project + locale +
visibility. It is part of the SQL pipeline, not a TypeScript in-memory list.

Baseline exact shape:

```sql
WITH search_candidates AS (
  SELECT
    ptsi.product_id,
    pdb.score(ptsi.search_id) AS bm25_score
  FROM catalog.product_title_bm25_search_index ptsi
  WHERE ptsi.project_id = :projectId
    AND ptsi.locale = :locale
    AND ptsi.status = 'published'
    AND ptsi.title ||| :query
)
```

Do not apply a hard top-K `LIMIT` to this relation when it feeds `base_all`,
facet counts or `totalCount`. A limited candidate relation changes storefront
semantics: counts would describe only top-K title matches, not the full title
query result.

Optional page preselection optimization:

- A separate `page_candidates` CTE may use top-K/top-N only after exact
  `totalCount` and facet aggregation semantics are preserved.
- If the implementation deliberately chooses capped search semantics for large
  catalogs, the cap must become part of the API contract and observability; do
  not silently mix capped candidates with exact listing counts.
- Initial implementation should prefer exact semantics, then use
  `EXPLAIN ANALYZE` to decide whether a page-only top-K optimization is needed.

For relevance ordering of page rows, sort after the listing pipeline applies
scope, visibility, structured filters and availability bucket.

### 3. Join with listing pipeline

`search_candidates` becomes an optional candidate set inside the existing listing
SQL flow:

```sql
base_all AS (
  SELECT
    pli.*,
    sp.manual_rank,
    sc.bm25_score AS relevance_score
  FROM scope_products sp
  JOIN catalog.product_listing_index pli
    ON pli.product_id = sp.product_id
   AND pli.project_id = :projectId
   AND pli.currency = :currency
  JOIN search_candidates sc
    ON sc.product_id = pli.product_id
  WHERE pli.status = 'published'
)
```

When query is empty, omit `search_candidates` and run normal listing.

Important:

- BM25 narrows the product universe only when `query` is present.
- Facet aggregation still uses `base_all` after applying search candidate set, so
  counts reflect the current title query plus scope.
- Facet isolation works exactly as in the listing index plan; title query is not
  a facet and is never isolated out.
- Variant-level filters still use `variant_listing_index` and must remain one
  grouped predicate over the same variant row.

### 4. Sort and cursor rules

If `query` is present and client sort is `relevance` or omitted:

```sql
ORDER BY in_stock DESC, relevance_score DESC, product_id ASC
```

If client explicitly selects business sort (`price`, `newest`, `name`, `manual`):

- keep the BM25 candidate set as a filter;
- sort by the selected listing sort;
- use `relevance_score DESC` only as optional tie-breaker before
  `product_id ASC`.

Example:

```sql
ORDER BY in_stock DESC, min_price_minor ASC NULLS LAST, relevance_score DESC, product_id ASC
```

Cursor pagination:

- Relevance cursor includes `in_stock`, `relevance_score` and `product_id`.
- Business-sort cursors include the selected listing sort keys, optional
  `relevance_score` tie-breaker and `product_id`.
- Cursor filter hash includes normalized `query`, `project_id`, `locale`,
  `currency`, listing scope, structured filters and selected sort. A cursor from
  one query/scope/filter set must not be reused for another result set.
- Do not use offset to derive search depth. Pagination stays keyset/cursor based
  as in the listing index plan.

## Fuzzy fallback

Primary query should be exact token BM25 over `title`. Fuzzy should run only when
primary candidate count is too low.

Policy:

1. Run primary title BM25.
2. If candidate count is `< fuzzyThreshold` and query length is within safe
   bounds, run fuzzy title query.
3. Merge candidates with primary candidates, preserving primary rank first.

Example fuzzy CTE:

```sql
fuzzy_candidates AS (
  SELECT
    ptsi.product_id,
    pdb.score(ptsi.search_id) * 0.75 AS bm25_score
  FROM catalog.product_title_bm25_search_index ptsi
  WHERE ptsi.project_id = :projectId
    AND ptsi.locale = :locale
    AND ptsi.status = 'published'
    AND ptsi.title ||| (:query)::pdb.fuzzy(1)
  ORDER BY pdb.score(ptsi.search_id) DESC, ptsi.product_id ASC
  LIMIT :fuzzyCandidateLimit
)
```

If fuzzy candidates feed `base_all`, the same exact-vs-capped rule applies as
for primary candidates: do not silently use a fuzzy top-K relation for
`totalCount` or facet counts. `fuzzyCandidateLimit` is acceptable only for a
page-only optimization after exact semantics are preserved, or for an explicit
capped-search API contract.

Avoid `fuzzy(2)` by default for short queries and non-Latin text until measured.

## Write operations and sync lifecycle

Add repositories:

- `ProductTitleBm25SearchIndexRepository`
- `ProductTitleSearchQueryRepository`

Add scripts:

- `SyncProductTitleBm25SearchIndexScript`
- `DeleteProductTitleBm25SearchIndexScript`
- `RebuildProductTitleBm25SearchIndexScript`

`SyncProductTitleBm25SearchIndexScript`:

1. Load product by `product_id` with `project_id` from context.
2. If product is deleted/missing, delete all locale rows for product in the same
   `project_id`.
3. Load enabled project locales.
4. Load `catalog.product_translation.name` per enabled locale.
5. Upsert one row per product/locale with only `title` as searchable text.
6. Preserve `search_id` for existing `(project_id, product_id, locale)` rows.
7. Delete rows for locales no longer enabled.

`RebuildProductTitleBm25SearchIndexScript`:

1. Supports full rebuild and project-scoped rebuild modes.
2. Full rebuild truncates `catalog.product_title_bm25_search_index`.
3. Project-scoped rebuild deletes rows by `project_id`, then rebuilds only that
   project. This mode is used for enabled locale changes.
4. Process products in batches.
5. Sync title search index for every active and draft product in scope.
6. Log project count, product count, locale count, skipped rows and duration.
7. Run `VACUUM ANALYZE catalog.product_title_bm25_search_index` after large
   rebuild if operationally acceptable.

## Event coverage

Events that must refresh title BM25 index:

- Product created/updated/deleted.
- Product publish/unpublish.
- Product translation name changed.
- Project enabled locales changed: rebuild title BM25 index for project.

Events that do not require title BM25 refresh:

- product description/excerpt changed;
- product SEO changed;
- product handle changed;
- vendor changed;
- tag assignment or tag label changed;
- feature/value changed;
- option/value changed;
- category assignment or category label changed;
- price changed;
- inventory/stock changed;
- currency settings changed;
- facet configuration changed.

## GraphQL/API contract

Storefront listing input should get an explicit text query field:

```graphql
input CatalogListingInput {
  query: String
  sort: CatalogListingSort
  filters: [CatalogListingFilterInput!]
  first: Int
  after: String
}
```

Sort enum:

```graphql
enum CatalogListingSortField {
  RELEVANCE
  MANUAL
  NEWEST
  CREATED
  NAME
  PRICE
}
```

Rules:

- `query` means product title query only.
- `RELEVANCE` is valid only when `query` is non-empty.
- If `query` is non-empty and sort is omitted, default to `RELEVANCE`.
- If `query` is empty and sort is `RELEVANCE`, return validation error.

## Implementation order

1. Add infrastructure documentation/config for `pg_search` in local PostgreSQL.
2. Add Drizzle model for `product_title_bm25_search_index`.
3. Generate migration with `CREATE EXTENSION IF NOT EXISTS pg_search`, table,
   ordinary indexes and BM25 index.
4. Add `ProductTitleBm25SearchIndexRepository`.
5. Add sync/delete/rebuild scripts.
6. Wire only product lifecycle, publish/unpublish, product translation name and
   project locale event handlers.
7. Add `ProductTitleSearchQueryRepository` with raw SQL BM25 CTE methods.
8. Integrate optional `search_candidates` into `ListingQueryRepository`.
9. Add storefront GraphQL `query` and `RELEVANCE` sort handling.
10. Add observability: query text hash, candidate count, result count, duration,
    fuzzy fallback flag.
11. Run project-scoped rebuild for locale changes and full rebuild for initial
    rollout.
12. Compare `EXPLAIN ANALYZE` for relevance and explicit business sort flows.

## Acceptance criteria

- Full rebuild recreates all project/product/locale title search rows from
  `catalog.product_translation.name`.
- Project-scoped rebuild deletes and recreates only rows for the selected
  `project_id`.
- Search query with `query` uses BM25 candidate CTE over `title` only.
- No description, SEO, handle, vendor, tag, feature, option or category text is
  stored in the BM25 search table.
- Query results are tenant-isolated by `project_id` and locale-isolated by
  `locale`.
- Relevance sort is deterministic and availability-first:
  `in_stock DESC, relevance_score DESC, product_id ASC`.
- Explicit business sorts still work after title search narrows candidates.
- Cursor pagination for relevance includes `in_stock`, `relevance_score`,
  `product_id` and a hash of query/scope/filters/currency/locale/sort.
- Facet counts and `totalCount` reflect the full title query + scope + active
  filters, not an unannounced top-K subset.
- Facet isolation does not remove the title query.
- Variant-level filters remain variant-correct through `variant_listing_index`.
- Product price/stock/currency/facet changes do not trigger title BM25 resync.
- Missing `pg_search` fails startup or migration clearly.

## Deferred optimization

- Prefix/autocomplete title index.
- Locale-specific tokenizer/stemmer for title.
- Synonyms for title queries only.
- Search query logs and popular title suggestions.
- Read replica dedicated to search if BM25 workload competes with transactional
  catalog writes.
