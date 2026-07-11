# План реализации Search в Listing service

## Статус и назначение

Статус: `proposal`.

Документ выделяет из
`services/listing/docs/search-admin-implementation-plan.ru.md` самостоятельный
план изменений только для bounded context `listing` и каталога
`services/listing`. Он покрывает storefront search, backend Search Admin,
поисковые документы, конфигурацию, индексацию, аналитику и эксплуатационные
контракты.

Реализация Catalog snapshot, broker-types и Admin UI не входит в этот план.
Они описаны только как внешние зависимости Listing. Semantic/vector search,
spellcheck, ML-reranking, персонализация, sponsored results и отдельное управление
storefront facets также остаются вне scope.

План рассчитан на clean DB: stage/production данных и пользователей нет. Поэтому
начальный title-only DDL можно заменить целевой схемой без dual-read, dual-write
и legacy conversion. Changeset-файлы вручную не редактируются.

## Целевой результат

`listing` становится единственным владельцем runtime search:

- `pg_search` выполняет text/identifier matching и вычисляет BM25 score;
- canonical listing bitmap pipeline остаётся источником истины для publication,
  navigation scope, same-variant filters, prices, availability, totals и facets;
- storefront и Admin Preview вызывают один `SearchExecutionService`;
- settings, synonyms и boosts применяются из immutable versioned runtime revision;
- fuzzy выполняется отдельным полным проходом только после final zero result;
- search documents обновляются существующим event-driven listing workflow;
- backend публикует Admin GraphQL для управления, Preview, status и analytics;
- все ветки одного request используют pinned configuration revision, index schema
  version и execution mode.

## Обязательные инварианты

1. Tenant всегда определяется через `ServiceContext.store.id`; `storeId` не
   принимается из public input.
2. Locale обязательна и входит в document identity, query plan, cursor,
   configuration и analytics key. Cross-locale fallback отсутствует.
3. `publishedUniverse` применяется независимо от BM25, category scope и boost.
4. Один `productMatches` используется page, `totalCount`, configured facets и
   virtual facets.
5. Search bitmap сохраняется при любом sort и никогда не исключается target
   facet isolation.
6. Variant filters пересекаются в variant space до projection в product space по
   contract `knowledge/vault/listing/facets-architecture.ru.md`.
7. Fuzzy mode выбирается один раз для всего result bundle; нельзя смешивать exact
   page с fuzzy total/facets.
8. SKU не получает synonym или fuzzy expansion.
9. Boost не обходит scope, publication, structured filters или OOS policy.
10. `HIDE` и `PLACE_LAST` имеют приоритет над boost.
11. Pending/failed authoring revision не влияет на storefront до atomic
    activation.
12. Preview не пишет analytics и не раскрывает SQL, AST, internal weights или
    numeric BM25 score.
13. Analytics fact создаётся один раз после успешного первого storefront result,
    а не для pagination или внутренних exact/fuzzy attempts.
14. Stale Catalog event/snapshot не может воскресить удалённый document или
    пометить более новую desired sequence как applied.

## Внешние зависимости Listing

До включения всех searchable fields Listing должен получать versioned Catalog
product snapshot со следующими данными:

```ts
interface CatalogProductSnapshot {
  vendor?: { id: string; name: string } | null;
  categories: Array<{
    id: string;
    content: Array<{ locale: string; name: string }>;
  }>;
  variants: Array<{
    id: string;
    sku: string | null;
    content: Array<{ locale: string; title: string | null }>;
  }>;
}
```

Listing ожидает события для product/variant title, SKU, vendor assignment/name,
category membership/name, publication/delete, enabled locales и variant
create/update/delete. Vendor/category rename должен приходить как bounded fan-out
affected product IDs либо как событие, из которого Listing может безопасно
сформировать bounded batch reconciliation.

До готовности конкретного source `SearchCapabilitiesService` возвращает field как
`UPDATING` или `UNAVAILABLE`; backend не имитирует данные handle/UUID или другой
locale. Collection scope не публикуется до появления canonical listing scope
provider.

## Целевая схема выполнения

```text
Storefront listing / Admin Preview
  -> normalize locale/query/input
  -> resolve pinned runtime revision and index schema
  -> build safe SearchQueryPlan
  -> compile pg_search primary candidate relation
  -> intersect with canonical listing scope/filter pipeline
  -> calculate page + total + facets from one productMatches contract
  -> when final primary totalCount = 0 and fuzzy is allowed:
       rerun the whole bundle with FUZZY plan
  -> apply relevance/business ordering and OOS policy
  -> storefront: return listing and record one analytics fact
  -> preview: return listing plus bounded reason diagnostics, no analytics
```

## 1. Canonical search execution

### 1.1. Нормализация

Создать единый `SearchQueryNormalizer`, используемый storefront, Preview,
synonyms, boosts и analytics:

1. validate locale по enabled project locales;
2. удалить control characters;
3. применить Unicode NFKC;
4. trim и collapse Unicode whitespace;
5. ограничить display query 128 Unicode code points;
6. построить locale-aware case-folded `lookupKey`;
7. получить tokens tokenizer-ом, совместимым с pinned BM25 DDL;
8. вычислить tenant-scoped query hash.

```ts
interface NormalizedSearchQuery {
  readonly display: string;
  readonly lookupKey: string;
  readonly tokens: readonly string[];
  readonly hash: string;
  readonly codePointLength: number;
}
```

Для identifiers дополнительно строится NFKC/trim/case-fold форма без удаления
дефисов, пробелов и других значимых разделителей SKU.

### 1.2. Execution context

До запуска параллельных listing branches один раз разрешать:

```ts
interface SearchExecutionContext {
  readonly storeId: string;
  readonly locale: string;
  readonly normalizedQuery: NormalizedSearchQuery;
  readonly configurationRevision: number;
  readonly runtimeConfigurationChecksum: string;
  readonly indexSchemaVersion: number;
  readonly mode: "PRIMARY" | "FUZZY";
  readonly analyticsMode: "TRACK" | "DO_NOT_TRACK";
  readonly diagnosticsMode: "NONE" | "PREVIEW";
}
```

Runtime snapshot кэшируется по
`store:<storeId>:search-config:<revision>`, а не только по store. Старые revisions
удерживаются не меньше cursor TTL.

### 1.3. Query plan

Создать typed AST и `SearchQueryPlanBuilder`. Raw query запрещено
интерполировать в SQL или ParadeDB parser string.

```ts
type SearchClause =
  | { kind: "token"; token: string; fields: SearchTextField[] }
  | { kind: "phrase"; tokens: string[]; fields: SearchTextField[] }
  | { kind: "synonym"; groupId: string; alternatives: SearchClause[] }
  | { kind: "identifierExact"; value: string; fields: IdentifierField[] }
  | { kind: "identifierPrefix"; value: string; fields: IdentifierField[] };

interface SearchQueryPlan {
  requiredUnits: Array<{
    index: number;
    textAlternatives: SearchClause[];
    originalIdentifierAlternatives: SearchClause[];
  }>;
  wholeQueryIdentifierAlternatives: SearchClause[];
  matchedSynonymGroupIds: string[];
  applicableBoostProductIds: string[];
}
```

Все semantic units обязательны (`AND`); внутри unit text, synonym и original SKU
alternatives объединяются через `OR`. Whole-query SKU exact/prefix является
отдельным полным alternative. Initial prefix threshold для SKU — 3 code points;
короче допускается только exact.

Начальные internal weights: product title `8`, variant title `5`, vendor `2`,
category `1`. SKU exact/prefix использует отдельный identifier tier. Эти значения
являются code constants, не Admin settings.

### 1.4. Изоляция ParadeDB

Весь engine-specific SQL разместить в versioned `PgSearchQueryCompiler`.
Внутри одной версии compiler нельзя смешивать legacy `@@@` API и v2 operators.
Compiler обязан:

- параметризовать пользовательские values;
- компилировать AND/OR, phrase, exact, prefix и fuzzy clauses;
- добавлять обязательный `store_id` и locale predicate;
- возвращать product identity, identifier tier и BM25 score;
- соблюдать AST/alternative/token limits;
- завершаться explicit `SEARCH_INDEX_UNAVAILABLE`, а не `ILIKE` fallback.

Startup health check проверяет `pg_extension.extversion`, supported version range,
наличие таблицы/indexes и required fields.

### 1.5. Candidate relation

```text
documentCandidates = pg_search compound predicate
boostCandidates    = active products for exact original lookupKey + locale

primaryCandidates = UNION ALL
  -> tenant-scoped resolve product_id to product_doc_id
  -> GROUP BY product
  -> matchPriority + boosted + relevanceScore
```

`matchPriority`: exact SKU `3`, prefix SKU `2`, text/synonym/curated `1`.
Boost-only candidate получает neutral score, но затем проходит canonical listing
pipeline. Hidden top-K до totals/facets запрещён.

### 1.6. Listing intersection

Исправить существующий read path так, чтобы non-empty query всегда входил в
`productBase`, независимо от navigation scope и selected sort:

```text
scopeProducts = publishedUniverse & navigationScopeProducts
searchProducts = bitmap(resolved primary/fuzzy candidates)

productBase = scopeProducts
  & searchProducts
  & product facet groups
  & vendor filters
  & optional HIDE availability membership

variantCandidates = universal variant terms & numeric price candidates

productMatches = productBase
  & projectDistinctProducts(variantCandidates) when variant witness exists
```

`GLOBAL + query` заменяет внутренний legacy `SEARCH` scope.
`CATEGORY + optional query` валиден всегда. `RELEVANCE` требует non-empty query;
business sort меняет ordering, но не membership.

### 1.7. Fuzzy fallback

1. Выполнить полный primary bundle.
2. При `totalCount > 0` вернуть primary.
3. При final zero, enabled typo tolerance и query длиной не менее 3 code points
   построить fuzzy plan.
4. Повторить весь listing bundle в `FUZZY` mode.
5. Вернуть только fuzzy result, не объединяя candidate sets.

Distance фиксирован на `1`; AND semantics сохраняется; fuzzy применяется только
к original text alternatives. SKU и synonym alternatives не fuzzy-expand.

### 1.8. Synonyms

Runtime revision хранит locale-scoped token trie. Expander применяет
longest-match-left-to-right. Multi-token synonym становится одним semantic unit;
phrase должна совпасть целиком в одном field. Группы двунаправленные. Synonyms не
меняют identifier clauses и не активируют boosts другой phrase.

### 1.9. Boosts и ordering

Boost lookup выполняется только по исходному `lookupKey`. Default relevance tuple:

```text
availability bucket DESC  # только PLACE_LAST
identifier priority DESC
boosted DESC
BM25 score DESC
product_id ASC
```

При `SHOW` availability key отсутствует. При `HIDE` unavailable candidates
исключаются через canonical variant availability membership. При business sort
boost сохраняет membership, но не переопределяет выбранный ordering.

### 1.10. Cursor

Повысить cursor version и включить normalized request hash, locale, currency,
scope, filters, sort, configuration revision/checksum, index schema version,
mode, conditional availability bucket, identifier priority, boosted flag,
relevance/business keys, ordinal, product tie-breaker, issued-at и expiry.

Отсутствующая retained revision возвращает `SEARCH_CURSOR_EXPIRED`. Между HTTP
requests сохраняется существующая eventual-consistency semantics product index;
snapshot search index не обещается.

### 1.11. Preview diagnostics

Preview вызывает тот же executor с `DO_NOT_TRACK + PREVIEW`. Дополнительный
bounded query выполняется только по product IDs текущей page и возвращает reason
codes: product/variant title, SKU exact/prefix, vendor, category, synonym, boost,
fuzzy fallback и OOS placed last. Numeric score, SQL и AST не публикуются.

## 2. Search document index

### 2.1. Нормализованный Listing snapshot

Добавить `ListingSearchContentSnapshot` в normalized product snapshot. Для каждой
enabled locale builder создаёт deterministic arrays: trim, validate,
deduplicate, stable sort. Missing localized title остаётся пустым с explicit
coverage flag; handle, UUID и другая locale не подставляются.

### 2.2. Physical contract

Заменить `listing.product_title_bm25_search_index` таблицей
`listing.product_search_document`:

```text
search_id uuid PK
store_id uuid not null
product_id uuid not null
product_doc_id int not null
locale varchar(8) not null
kind/status varchar not null
published_at timestamptz null
product_created_at/product_updated_at timestamptz not null
product_revision int not null
source_event_sequence bigint not null
has_localized_title boolean not null
product_title text not null
variant_titles text[] not null
sku_terms text[] not null
vendor_names text[] not null
category_names text[] not null
indexed_at/updated_at timestamptz not null

UNIQUE (store_id, product_id, locale)
FK (store_id, product_doc_id, product_id)
  -> product_listing_index(store_id, product_doc_id, product_id)
```

`search_id` стабилен при upsert. Text fields используют pinned Unicode tokenizer;
SKU — whole-value/raw semantics. Один BM25 index содержит key, tenant/locale/status
metadata и searchable fields.

### 2.3. Write lifecycle

1. Catalog/project event monotonic upsert-ит desired item state.
2. Existing listing item workflow получает актуальный Catalog snapshot.
3. Builder повторно сверяет desired sequence/revision.
4. В одной transaction обновляются listing rows, documents всех enabled locales
   и applied item state.
5. Ошибка оставляет `PENDING`; retry использует стабильный idempotency key.
6. Retry exhaustion переводит item в `FAILED` с sanitized error.
7. Более новое событие снова переводит item в `PENDING`; старое/equal — no-op.

Product delete и locale removal выполняют idempotent delete. Tombstone sequence
не позволяет старому upsert воскресить row. Initial sync использует тот же
bounded per-item workflow, а reference rename — existing batch workflow.

## 3. Backend data model

Все таблицы tenant-scoped; UUID — UUIDv7; repositories используют
transaction-aware `this.connection` и context store.

### 3.1. Configuration control plane

- `search_configuration_state`: desired/active/applying revisions, apply status,
  last failed revision/error, workflow ID;
- `search_settings`: enabled fields, typo tolerance, OOS policy, optimistic
  version, changed revision, audit stamp;
- `search_configuration_revision`: immutable normalized authoring JSON,
  checksum, lifecycle status and safe compile error;
- `search_configuration_apply_job`: durable outbox/recovery row with attempts,
  availability and workflow identity;
- `search_runtime_configuration`: immutable compiled settings, synonym trie,
  boost map, compiler version and activation metadata.

Authoring mutation в одной transaction блокирует state, проверяет optimistic
version, изменяет resource, увеличивает desired revision, сохраняет полный
immutable desired snapshot, audit и apply job.

Apply workflow читает только immutable revision. Activation выполняется CAS по
`desired_revision`; superseded revision не меняет active pointer. Previous active
revision продолжает serving при compile/apply failure.

### 3.2. Synonyms

Создать `search_synonym_group`, `search_synonym_value` и
`search_synonym_claim`. Claim PK `(store_id, locale, normalized_value)` даёт
DB-level уникальность active value в locale.

Validation: enabled locale, минимум 2 unique normalized values, максимум 20,
128 code points/value, bounded token count. Inactive/deleted groups не имеют
claims. Delete — soft tombstone до применения revision.

### 3.3. Product boosts

Создать `search_product_boost`, `search_product_boost_phrase` и
`search_product_boost_product`. Ограничения MVP: минимум 1 phrase/product,
максимум 20 phrases и 50 products; phrase — exact normalized whole query;
product проверяется tenant-scoped через внешний Catalog contract; cross-service
FK отсутствует. Несколько rules объединяют product set без stacking multiplier.

### 3.4. Audit

Append-only `search_configuration_audit` хранит revision, resource/action,
before/after JSON, actor, request и timestamp. Raw SQL, query AST и request
headers не сохраняются.

### 3.5. Index state

- `search_index_state`: schema version, `READY/UPDATING/FAILED`, initial sync,
  last attempt/success, safe error, pending/failed counters;
- `search_index_locale_state`: expected/indexed/published products и localized
  title coverage;
- `search_index_item_state`: desired/applied event sequences/actions/revisions,
  attempts, retry time and status.

`servingAvailable` вычисляется отдельно: после initial sync частичный backlog
может давать `UPDATING/FAILED`, но успешно синхронизированные documents остаются
доступны.

### 3.6. Analytics

- `search_request`: normalized query/hash, locale/scope, execution fingerprint,
  result count, fuzzy flag, config/schema revisions и unique request dedupe key;
- `search_query_daily`: пересчитываемая daily projection searches, zero results,
  result sum, fuzzy count and last searched;
- `search_query_work_item`: `ZERO_RESULTS`, `OPEN/RESOLVED/IGNORED`, note and
  review timestamps.

Preview, subsequent cursor pages и повторная доставка одного request не создают
новый fact. `RESOLVED` может reopen после трёх новых qualifying searches;
`IGNORED` reopen только вручную. Review status не изменяет facts/rollups.

## 4. Module and code structure

```text
services/listing/src/search/
  normalization/
  capabilities/
  runtime/
  planner/
  execution/
  configuration/
  index/
  analytics/

services/listing/src/repositories/search/
  SearchSettingsRepository.ts
  SearchSynonymRepository.ts
  SearchProductBoostRepository.ts
  SearchConfigurationRevisionRepository.ts
  SearchConfigurationApplyJobRepository.ts
  SearchRuntimeConfigurationRepository.ts
  SearchDocumentRepository.ts
  SearchIndexItemStateRepository.ts
  SearchIndexStateRepository.ts
  SearchAnalyticsRepository.ts

services/listing/src/scripts/search/
  SearchSettingsUpdateScript.ts
  SearchSynonymGroup*Script.ts
  SearchProductBoost*Script.ts
  SearchQueryWorkItemUpdateScript.ts

services/listing/src/workflows/
  SearchConfigurationApplyWorkflow.ts
  SearchAnalyticsAggregateWorkflow.ts

services/listing/src/api/graphql-admin/schema/search.graphql
services/listing/src/resolvers/admin/search/
```

Resolvers только decode global IDs, проверяют authorization и вызывают
Scripts/services. Validation и normalization находятся в Scripts; data access —
в repositories; durable orchestration — в DBOS workflows.

## 5. GraphQL backend Listing

Сохранить namespaces `listingQuery.search` и `listingMutation.search`.

### Queries

- `capabilities`;
- `settings`;
- `preview`;
- paginated `synonymGroup(s)`;
- paginated `productBoost(s)`;
- `indexStatus`;
- `overview`;
- `analytics`, paginated `queryMetrics` и `queryWorkItems`.

### Mutations

- `settingsUpdate`;
- synonym group create/update/delete;
- product boost create/update/delete;
- query work item update.

Все mutations возвращают entity/application state и `userErrors`. Node entities
получают global ID. Lists используют server-side filtering и Relay cursors.

Preview input разделяет query и navigation scope; поддерживает active и saved
pending configuration modes. Pending preview компилирует ephemeral runtime plan,
не активирует его и не пишет analytics.

Минимальные Casbin permissions:

```text
listing.search.read
listing.search.manage
listing.search.analytics.read
```

Обязательные user error codes: configuration conflict, unavailable field/locale,
synonym conflict/required values, boost products/phrases required, product not
found, index unavailable и cursor expired. Error field paths повторяют GraphQL
input paths.

## 6. Observability, privacy and guardrails

Technical logs содержат store ID, query hash, locale/scope, revision/schema/mode,
candidate/final cardinalities, collector, fuzzy flag, branch duration и counts
synonyms/boosts. Raw query в technical logs запрещён.

Metrics: primary/fuzzy latency, zero/hit ratio, cardinalities, config apply
duration/failures, indexing lag/failures/coverage, analytics rollup lag.

Guardrails: maximum tokens, synonym units, alternatives, AST clauses, Preview
timeout/cancellation, no unescaped parser strings, no silent truncation and no
hidden top-K. Analytics query retention задаётся явно; IP, user agent, auth data
не сохраняются.

Compatibility corpus должен доказать tenant membership isolation. Влияние общего
BM25 corpus на relative IDF измеряется отдельно; tenant-local IDF/partitioning не
входит в этот plan.

## 7. Пошаговая реализация

### Этап 0. Correctness baseline и pg_search compatibility

1. Добавить integration fixtures для pinned `pg_search 0.24.1`: boolean compound,
   phrase, arrays, exact/prefix SKU, fuzzy distance 1, score, Cyrillic/Unicode,
   special characters и tenant predicate.
2. Реализовать normalizer и explicit query/locale validation.
3. Разделить navigation scope и optional query во внутренних Listing types.
4. Исправить `CATEGORY + query` для page/total/facets и business sorts.
5. Свернуть duplicate search SQL в
   `StorefrontProductTitleSearchQueryRepository`.
6. Удалить handle/UUID fallback.
7. Добавить extension/index health diagnostics.

Готовность: category result set согласован между всеми branches; sort не удаляет
query predicate; tenant leakage отсутствует; special characters parameterized.

### Этап 1. Listing search content contract

1. Принять новую версию Catalog snapshot.
2. Добавить `ListingSearchContentSnapshot` и deterministic mapper.
3. Добавить `SearchFieldRegistry` и schema version.
4. Подключить event classification и bounded fan-out для reference/locales.
5. Возвращать capabilities из фактической source readiness.

Готовность: single/batch hydration создают одинаковый snapshot; missing locale не
получает fallback; removed variant data исчезает; unsupported field не включается.

### Этап 2. Multi-field documents и index state

1. Заменить initial DDL на `product_search_document` и BM25 indexes.
2. Добавить Drizzle models и repositories.
3. Реализовать stable `search_id` upsert и monotonic sequence guard.
4. Добавить index state/locale/item tables.
5. Встроить document write и applied state в listing item transaction.
6. Подключить bounded initial sync/reconciliation.

Готовность: все ready fields searchable; SKU сохраняет identifier semantics;
product write атомарно меняет listing/document; unavailable engine не имеет
fallback.

### Этап 3. Configuration и canonical executor

1. Создать configuration/settings/revision/job/runtime/audit tables.
2. Реализовать authoring transaction и DBOS apply workflow с CAS/coalescing.
3. Реализовать revision-addressed runtime cache.
4. Создать AST builder, synonym-free primary compiler и canonical executor.
5. Добавить OOS settings, exact-first fuzzy и versioned cursor.
6. Реализовать Preview diagnostics и GraphQL settings/preview/capabilities.

Готовность: один request pin-ит revision/schema/mode; failed apply оставляет
старое behavior; Preview совпадает со storefront и ничего не трекает.

### Этап 4. Synonyms и boosts

1. Создать authoring/claim/boost tables и repositories.
2. Реализовать Scripts с normalization, validation и optimistic concurrency.
3. Компилировать synonym trie и exact phrase boost map в runtime revision.
4. Добавить longest phrase expansion, curated candidates, cursor fields и reason
   diagnostics.
5. Опубликовать GraphQL CRUD и application state.

Готовность: active claim уникален; SKU/fuzzy не получают synonym expansion;
boost проходит canonical filters и не переопределяет business sort.

### Этап 5. Index Status и Overview backend

1. Реализовать status service и GraphQL index status.
2. Связать status с durable item state и engine health.
3. Добавить periodic counter reconciliation.
4. Реализовать Overview composition, не зависящую от analytics readiness.

Готовность: state переживает restart; retries/pending/failed отражаются честно;
новое событие восстанавливает failed item; stale event не воскрешает product.

### Этап 6. Analytics backend

1. Записывать idempotent fact после первого успешного storefront execution.
2. Реализовать daily rollup/recomputation workflow.
3. Добавить overview metrics, analytics connections и filters.
4. Реализовать zero-result worklist/review mutations.
5. Добавить retention cleanup.

Готовность: Preview/pagination не увеличивают count; dedupe работает; review не
меняет history; rollup воспроизводим из facts.

### Этап 7. Hardening и rollout

1. Создать `uk/en/ru` corpus с identifiers, multiword synonyms, OOS/mixed
   variants, missing locale data и large candidate sets.
2. Снять `EXPLAIN ANALYZE` matrix для global/category, filters, fuzzy, boosts,
   arrays и diagnostics.
3. Зафиксировать limits/timeouts и BM25 VACUUM/autovacuum policy.
4. Добавить failure injection для config apply, item indexing и analytics.
5. Проверить privacy/retention и cross-tenant IDF trade-off.
6. Включать GraphQL capabilities только после соответствующей readiness.
7. Удалить title-only symbols и устаревшие docs после перехода.

## 8. Основные Listing touchpoints

| Область | Файлы |
|---|---|
| BM25 DDL | `services/listing/migrations/domains/0100_listing_index/` |
| Models | `services/listing/src/repositories/models/listingIndex.ts` и новые search models |
| Current writer | `services/listing/src/repositories/listing/ProductTitleBm25SearchIndexRepository.ts` |
| Listing write path | `ListingBuildSyncWriteModelScript`, `ListingWriteIndexActionScript`, batch workflow steps |
| Candidate SQL | `services/listing/src/repositories/storefront/sql/compileListingProductMatchesSql.ts` |
| Orchestration | `services/listing/src/repositories/storefront/StorefrontListingQueryRepository.ts` |
| Page/cursor | `services/listing/src/repositories/storefront/sql/compilePageQuerySql.ts` и listing request/cursor types |
| Admin GraphQL | `services/listing/src/api/graphql-admin/schema/`, `services/listing/src/resolvers/admin/` |
| New search modules | `services/listing/src/search/`, `repositories/search/`, `scripts/search/` |

## 9. Acceptance matrix

| Сценарий | Ожидаемый результат |
|---|---|
| Global query | Полный candidate set, relevance order |
| Category + query | Page/total/facets ограничены category и query |
| Category + query + price/name sort | Query остаётся predicate |
| Query + option + price | Variant predicates имеют same-variant semantics |
| Facet target isolation | Search bitmap сохраняется |
| Draft in BM25/boost | `publishedUniverse` исключает product |
| Exact/prefix SKU | Identifier tier без synonym/fuzzy |
| Missing locale title | Нет cross-locale fallback; SKU ещё может найти product |
| Primary raw hit отфильтрован scope/OOS | Final zero разрешает fuzzy pass |
| Query короче 3 code points | Fuzzy не запускается |
| Boost-only product | Проходит publication/scope/filters/OOS |
| Boost + business sort | Membership сохраняется, boost ranking выключен |
| Settings save/apply fail | Old active revision продолжает serving |
| Concurrent revisions N/N+1 | N не активируется после появления N+1 |
| Index retry exhausted | Status failed, safe error, synced documents доступны |
| Stale product event | Monotonic guard делает no-op |
| Expired configuration cursor | `SEARCH_CURSOR_EXPIRED` |
| Preview | Нет analytics fact и internal diagnostics leakage |
| Storefront pagination | Не создаёт новый search fact |

## 10. Definition of Done для Listing service

- все advertised fields имеют реальный source и BM25 capability;
- storefront и Preview используют один executor;
- query membership одинаков для page/total/facets при любом scope/sort;
- synonyms/fuzzy/boost/OOS соблюдают зафиксированные interaction rules;
- config application и document synchronization имеют независимые durable state
  machines;
- stale revision и stale product event не активируют устаревшее состояние;
- index status показывает честные readiness, backlog, failures и locale coverage;
- Preview возвращает bounded reason codes без score/SQL/AST;
- analytics facts idempotent, privacy/retention определены;
- GraphQL authorization, pagination, user errors и application states реализованы;
- compatibility, failure and performance matrices подтверждены до rollout;
- title-only repository/table/symbols удалены после завершения migration path.

## Открытые риски

1. Listing зависит от расширенного Catalog snapshot и reference fan-out событий.
2. Compound/phrase/prefix API необходимо подтвердить на pinned
   `pg_search 0.24.1` до фиксации production SQL.
3. Shared BM25 corpus может влиять на tenant-relative IDF, хотя membership обязан
   быть полностью tenant-isolated.
4. Hidden candidate cap нарушит exact totals/facets и запрещён.
5. `HIDE` обязан использовать canonical variant availability membership, а не
   derived sort projection.
6. Collection scope нельзя имитировать до canonical listing scope provider.
7. High-frequency vendor/category rename fan-out требует bounded batching,
   monotonic sequence и наблюдаемого backlog.
