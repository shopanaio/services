# План реализации Search Admin и управляемого storefront search

## Статус и границы

Статус: `proposal`.

Документ является планом реализации требований из
`services/listing/docs/search-admin-must-have.ru.md`. Он описывает целевую
архитектуру backend в `services/listing`, необходимые смежные contracts с
Catalog/Checkout/Orders, Admin UI в `admin/src/domains/discovery/search`,
GraphQL API, хранение данных, применение конфигурации, инкрементальное состояние
поисковых документов, аналитику и текстовые wireframes.

План рассчитан на clean DB: stage/production данных нет. Поэтому существующий
начальный DDL BM25-индекса можно заменить целевым contract без dual-read,
dual-write и legacy conversion. Changeset-файлы вручную не редактируются.

Не входят в план semantic/vector search, spellcheck, ML-reranking,
персонализация, sponsored results и отдельное управление storefront facets.

## Результат в одном абзаце

`pg_search` остаётся единственным механизмом текстового matching и BM25 score,
но перестаёт быть самостоятельным listing engine. Один canonical
`SearchExecutionService` строит version-pinned search plan, получает полный
product candidate set из ParadeDB, а затем передаёт его существующему listing
pipeline, где применяются publication visibility, category scope, canonical
variant filters, price, facets, availability и pagination. Synonyms расширяют
только текстовую часть query plan, SKU/barcode используют отдельные exact/prefix
clauses, fuzzy выполняется вторым полным проходом только после нулевого результата,
boosts добавляют exact curated candidates и меняют relevance ordering, а Admin Preview вызывает тот же execution
path в диагностическом режиме. Настройки storefront читает из последней успешно
применённой immutable revision, а поисковые документы поддерживаются существующим
event-driven listing index workflow.

## Зафиксированные архитектурные решения

1. Search Admin принадлежит bounded context `listing`, а не `catalog` и не новому
   сервису.
2. Admin располагается в domain `Discovery`; пункт `Search` идёт сразу после
   `Facets` и содержит страницы `Overview`, `Preview`, `Synonyms`,
   `Product boosts`, `Settings`, `Analytics`.
3. Storefront и Admin Preview не имеют отдельных реализаций search. Отличаются
   только `executionMode`, analytics side effects и объём diagnostics.
4. `pg_search` отвечает за text/identifier matching и BM25 score. Listing bitmap
   algebra остаётся единственным источником истины для scope, visibility,
   same-variant filters, prices, counts и facets.
5. Все SQL-ветки одного listing request используют один `SearchExecutionContext`:
   applied configuration revision, index schema version и fallback mode.
6. Synonyms, boosts и settings применяются query-time через immutable runtime
   configuration.
7. Fuzzy не смешивается с обычной выдачей. Сначала целиком выполняется primary
   listing; только если его `totalCount = 0`, выполняется такой же listing с fuzzy
   text plan.
8. Product boost делает выбранный Product curated candidate для exact исходной
   phrase, но не обходит scope, visibility, structured filters или out-of-stock
   rules.
9. Product title обязателен. Для MVP вместо отсутствующего в домене product type
    используется локализованное category name.
10. Admin получает только понятные reason codes. SQL, query AST и numeric BM25
    score не входят в public GraphQL contract.

## Фактическая отправная точка

### Что уже реализовано

- инфраструктура закреплена на `paradedb/paradedb:0.24.1-pg17`, а PostgreSQL
  загружает `pg_search` через `shared_preload_libraries`;
- handwritten migration создаёт extension, таблицу
  `listing.product_title_bm25_search_index` и BM25 index;
- на `(product, locale)` хранится localized product title;
- product create/update/delete проходит через существующие DBOS listing index
  workflows;
- search CTE фильтрует `store_id`, `locale`, published state и получает
  `pdb.score(search_id)`;
- полный candidate bitmap пересекается с listing facets, vendor, price и
  canonical variant terms;
- relevance cursor уже содержит availability, score, product ID и filter hash;
- Admin GraphQL уже имеет namespaces `listingQuery` и `listingMutation`;
- Admin Discovery уже содержит модуль Facets и пригодные `DataLayout`, filters,
  AG Grid, modal и listing preview patterns.

Ключевые точки текущего кода:

| Область | Текущий файл |
|---|---|
| BM25 DDL | `services/listing/migrations/domains/0100_listing_index/0101_listing_index__bm25_search.sql` |
| Drizzle model | `services/listing/src/repositories/models/listingIndex.ts` |
| Search rows writer | `services/listing/src/repositories/listing/ProductTitleBm25SearchIndexRepository.ts` |
| Фактический candidate CTE | `services/listing/src/repositories/storefront/sql/compileListingProductMatchesSql.ts` |
| Canonical listing orchestration | `services/listing/src/repositories/storefront/StorefrontListingQueryRepository.ts` |
| Page/relevance ordering | `services/listing/src/repositories/storefront/sql/compilePageQuerySql.ts` |
| Admin listing schema | `services/listing/src/api/graphql-admin/schema/listing.graphql` |
| Discovery registration | `admin/src/domains/discovery/domain.tsx` |
| Facets module pattern | `admin/src/domains/discovery/facets/` |

### Пробелы и обязательные исправления до Search Admin

| Проблема | Последствие | Целевое исправление |
|---|---|---|
| Индексируется только product title | Нельзя включить variant title, SKU, barcode, vendor, category | Новый multi-field search document contract |
| Нет явного query compiler | Multi-token semantics зависят от implicit `@@@` behavior | Versioned `PgSearchQueryCompiler` с явным boolean plan |
| `CATEGORY + query + RELEVANCE` | Page отфильтрован поиском, total/facets считают всю category | Search bitmap всегда входит в `product_matches` |
| `CATEGORY + query + business sort` | Query полностью игнорируется | Candidate bitmap не зависит от выбранного sort |
| Дублирующий repository search SQL почти не используется | Preview и storefront легко разойдутся | Оставить один canonical compiler/executor |
| Default locale без title заменяется handle/ID | Admin не видит отсутствие localized data | Хранить пустой title + explicit coverage flag, без fallback |
| Availability всегда первый sort key | Реализован только неявный `Place last` | Applied `SHOW/PLACE_LAST/HIDE` policy |
| Cursor не знает config revision | Следующая страница может получить другие query-time rules | Pin configuration revision в cursor и filter hash |
| Только per-item listing state | Нет Ready/Updating/Failed и pending/error counters | Search index synchronization state read model |
| Нет persisted analytics | Нельзя связать search, click и purchase | Search request/click/purchase contracts и daily aggregate |

Первый backend milestone обязан исправить обе ошибки `CATEGORY + query` даже если
остальные Search Admin страницы ещё выключены feature flag: Preview нельзя строить
поверх заведомо неконсистентного contract.

## Инварианты целевой системы

1. Любой request tenant-scoped по `ServiceContext.store.id`; `store_id` из input
   не принимается.
2. Locale всегда явная и входит в runtime plan, candidate query, cursor и
   analytics key. Cross-locale fallback отсутствует.
3. Один и тот же `productMatches` используется для page, `totalCount`, configured
   facet counts и virtual facets.
4. Search query никогда не изолируется при target facet isolation.
5. Variant filters пересекаются в variant space до projection в product space,
   как описано в `knowledge/vault/listing/facets-architecture.ru.md`.
6. Fuzzy mode определяется один раз для всего listing result; page не может быть
   fuzzy при exact total/facets или наоборот.
7. Pending/failed authoring changes не видны storefront до atomic activation.
8. SKU/barcode не получают synonym или fuzzy expansion.
9. `HIDE` и `PLACE_LAST` имеют приоритет над boost.
10. Preview не пишет search analytics.
11. Analytics request записывается один раз после успешного storefront result,
    а не по числу внутренних exact/fuzzy SQL attempts.
12. Raw SQL, stack trace, internal weights и score не публикуются в Admin API.

## Целевая схема взаимодействия

```text
Admin mutation
  -> normalized authoring tables
  -> desired revision + DBOS SearchConfigurationApplyWorkflow
  -> compiled immutable runtime revision
  -> atomic active_revision switch

Catalog/project events
  -> existing Listing index workflow
  -> listing bitmap/sort read model
  -> incremental upsert/delete in search document index
  -> synchronization state/pending counters

Storefront/Admin Preview request
  -> resolve active runtime revision once
  -> normalize input and build SearchQueryPlan
  -> pg_search primary candidates + BM25 score
  -> canonical scope/visibility/variant/price/facet bitmap pipeline
  -> total/page/facet branches
  -> if final primary totalCount == 0 and typo tolerance allows:
       rerun the same pipeline with fuzzy text plan
  -> relevance/business ordering + out-of-stock policy + cursor
  -> storefront: one analytics request + opaque tracking tokens
  -> preview: bounded reason diagnostics, no analytics write
```

## Canonical search execution

### 1. `SearchExecutionContext`

До запуска параллельных listing branches сервис один раз разрешает:

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

Runtime revision читается по active pointer и кэшируется ключом
`store:<id>:search-config:<revision>`. Не допускается кэш только по `storeId`:
после activation старый cursor должен ещё уметь адресовать предыдущую retained
revision.

### 2. Нормализация query

Нужен один `SearchQueryNormalizer`, используемый storefront, Admin CRUD,
Preview, boost lookup и analytics:

1. проверить locale против enabled project locales;
2. удалить control characters;
3. применить Unicode NFKC;
4. trim и collapse Unicode whitespace;
5. ограничить display query 128 Unicode code points;
6. получить `lookupKey` через locale-aware case fold;
7. получить tokens тем же tokenizer contract, который закреплён в BM25 DDL;
8. вычислить tenant-scoped query hash для aggregation/dedupe.

```ts
interface NormalizedSearchQuery {
  /** Показывается в Preview и может храниться в analytics. */
  display: string;
  /** Exact identity synonyms/boosts; пользователю отдельно не показывается. */
  lookupKey: string;
  /** Tokens from the pinned pg_search-compatible tokenizer. */
  tokens: readonly string[];
  hash: string;
  codePointLength: number;
}
```

Не удаляются дефисы и другая значимая пунктуация из SKU/barcode. Для identifier
matching дополнительно создаётся identifier-normalized form: NFKC, trim,
case-fold, без произвольного удаления разделителей.

### 3. Query plan, а не конкатенация query string

Новый `SearchQueryPlanBuilder` строит безопасный AST. Raw input не
интерполируется в SQL и не вставляется в ParadeDB query parser syntax.

Упрощённая модель:

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

Для обычного query все semantic units обязательны (`AND`). Один unit может
совпасть через `OR(text fields, original SKU/barcode exact/prefix)`. Поэтому
`nike ABC-123` может найти `nike` в vendor и `ABC-123` в SKU, но не может
совпасть только по SKU, проигнорировав обязательный `nike`. Synonym alternatives
добавляются только в text side того же unit и никогда не становятся identifier
alternatives.

Дополнительный whole-query identifier alternative считается полным совпадением:
запрос буквально равный SKU с пробелом/дефисом не нужно искусственно разбивать.
Итоговый document predicate имеет форму:

```text
OR(
  AND(OR(unit0 text/synonym, unit0 original identifier), ...),
  whole-query SKU/barcode exact/prefix
)
```

Prefix включается от bounded implementation threshold (initially SKU: 3,
barcode: 4 code points); более короткий identifier допускает только exact match.
Thresholds являются engine guardrails, а не Admin settings. Внутренние field
weights задаются code registry, а не Admin input:

| Поле | Начальный внутренний приоритет | Комментарий |
|---|---:|---|
| Product title | 8 | Обязательное и самое сильное text field |
| Variant title | 5 | Несколько localized значений на product |
| Vendor name | 2 | Не подменяет title relevance |
| Category name | 1 | MVP-замена product type |
| SKU exact/prefix | отдельный identifier tier | Не сравнивается напрямую с BM25 text weight |
| Barcode exact/prefix | отдельный identifier tier | Не сравнивается напрямую с BM25 text weight |

Числа являются стартовыми implementation constants и калибруются на fixture
corpus/`EXPLAIN ANALYZE`; Admin их не видит и не редактирует.

### 4. Изоляция ParadeDB API

Проект закреплён на `pg_search 0.24.1`, но эта версия одновременно имеет legacy
и v2 query surfaces. Все engine-specific выражения должны находиться только в
`PgSearchQueryCompiler`:

- текущий implementation path может использовать
  `search_id @@@ paradedb.boolean(...)`, `paradedb.match`, term/phrase/fuzzy
  query objects;
- альтернативный v2 path (`|||`, `&&&`, `===`, `pdb.fuzzy`) не смешивается с
  legacy path внутри одного compiler;
- startup health check читает `pg_extension.extversion` и проверяет supported
  version range;
- schema/index smoke check проверяет наличие обоих BM25 indexes и required
  fields;
- отсутствие/несовместимость extension даёт explicit unhealthy/search unavailable,
  без `ILIKE` fallback.

Перед фиксацией конкретного SQL необходимо закрепить integration fixtures для
официально документированных возможностей:

- match conjunction/disjunction;
- phrase query;
- exact и prefix term по identifier arrays;
- edit distance `1` для всех text tokens;
- score при compound boolean query;
- Unicode/cyrillic tokenization;
- parameterization special characters.

Ссылки на primary documentation:

- https://docs.paradedb.com/documentation/full-text/match
- https://docs.paradedb.com/documentation/full-text/fuzzy
- https://docs.paradedb.com/documentation/sorting/score
- https://docs.paradedb.com/documentation/indexing/indexing-arrays

### 5. Primary candidate relation

Primary pass содержит compound document source и curated source, затем агрегирует
их до одной строки на product:

```text
document_candidates
  = pg_search compound predicate
  = all required semantic units matched across enabled text/identifier fields
    OR whole-query identifier match

boost_candidates
  = active targets for exact original normalized query + locale

primary_candidates
  = UNION ALL(document_candidates, boost_candidates)
  -> GROUP BY product_id
  -> match_priority + boosted + relevance_score
```

`match_priority` фиксирует только технически надёжные tiers:

```text
3 = exact SKU/barcode
2 = prefix SKU/barcode
1 = normal text/synonym BM25 or curated boost candidate
```

Boost-only candidate получает `boosted = true` и neutral/zero text score. Он
становится релевантным по явному merchant rule, но всё равно проходит canonical
scope/visibility/filter pipeline. Благодаря этому quick action из zero-result
query действительно может исправить выдачу.

Физический источник `boost_candidates` — не BM25 document. Runtime product IDs
разрешаются tenant-scoped join-ом к `product_listing_index` в canonical
`product_doc_id`; отсутствующий/deleted ID отбрасывается. Поэтому curated rule
может исправить zero-result или missing-localized-document case, но всё равно
попадает под тот же обязательный `publishedUniverse`, navigation scope,
structured filters и OOS policy. Product ID из runtime snapshot не становится
SQL identifier или доверенным `product_doc_id`.

Нельзя ограничивать canonical candidates скрытым top-K: тот же полный candidate
set нужен exact `totalCount` и facets. Top-K допустим только как отдельная
page-only оптимизация после доказанной parity с exact aggregates.

### 6. Обязательное пересечение с listing pipeline

Search bitmap становится частью product base при любом scope и sort:

```text
navigationScopeProducts
  = global listing universe
    OR category bitmap
    OR future collection scope provider result

scopeProducts
  = publishedUniverse
  & navigationScopeProducts

searchProducts
  = bitmap(primary or fuzzy pg_search candidates)

productBase
  = scopeProducts
  & searchProducts
  & product facet groups
  & vendor filters
  & visibility/out-of-stock HIDE predicate

variantCandidates
  = canonical universal variant terms
  & numeric price candidates

productMatches
  = productBase
  & projectDistinctProducts(variantCandidates), when variant witness exists
```

Page, total, configured facets и virtual facets получают один resolved
`mode`/configuration. Search bitmap никогда не исключается при
facet target isolation.

`publishedUniverse` является обязательным отдельным operand даже для category и
future collection scope: ни scope bitmap, ни BM25 row, ни curated boost не могут
сами доказать storefront publication visibility.

Collection scope добавляется только через canonical listing scope provider.
Search Admin не должен возвращать collection results через отдельный SQL join или
возвращать `collection` posting, пока listing architecture его явно запрещает.
До готовности provider API capabilities не показывает collection selector.

Public listing input также разделяет navigation и query:

```graphql
enum ListingScopeKind {
  GLOBAL
  CATEGORY
  # COLLECTION добавляется только вместе с canonical provider
}

input ListingScopeInput {
  kind: ListingScopeKind!
  categoryId: ID
}

# query остаётся отдельным аргументом listing(..., query: String)
```

`GLOBAL + non-empty query` заменяет текущий semantic `SEARCH` scope.
`CATEGORY + optional query` всегда валиден. `RELEVANCE` по-прежнему требует
non-empty query; без query default sort определяется navigation listing rules.

### 7. Fuzzy fallback

Алгоритм строго последовательный:

1. выполнить полный primary listing bundle;
2. если `totalCount > 0`, вернуть primary без fuzzy;
3. если `totalCount = 0`, typo tolerance включён и query имеет не менее трёх
   code points, построить fuzzy text plan;
4. выполнить полный listing bundle второй раз в `FUZZY` mode;
5. вернуть только fuzzy result; primary и fuzzy candidates не объединять.

Fuzzy plan:

- использует edit distance `1`;
- сохраняет `AND` для всех исходных text units;
- применяется ко всем включённым text fields;
- сохраняет SKU/barcode exact/prefix alternatives в тех же units, но никогда не
  применяет к ним fuzzy;
- не использует edit distance `2`;
- не создаёт или не возвращает corrected query;
- сохраняет exact synonym alternatives, но не fuzzy-расширяет их; distance 1
  применяется только к original text alternative каждого unit. Это не допускает
  combinatorial explosion и выдуманного spellcheck behavior.

Триггером является final `totalCount` после scope, visibility, filters и `HIDE`,
а не raw количество строк ParadeDB. Поэтому exact documents, полностью
исключённые storefront rules, не блокируют полезный fuzzy fallback.

### 8. Synonym expansion

Active runtime revision содержит token trie по locale. Query tokens
сопоставляются longest-match-left-to-right. Найденное multi-token значение
становится одним semantic unit:

```text
query:  "red running shoes"
group:  ["running shoes", "sneakers", "кроссовки"]

AST:
  AND(
    token("red" across enabled text fields),
    OR(
      phrase("running shoes" across enabled text fields),
      phrase("sneakers" across enabled text fields),
      phrase("кроссовки" across enabled text fields)
    )
  )
```

Phrase alternative должна совпасть целиком и в одном field; слова из разных
fields не образуют phrase. Synonyms двунаправленные, locale-scoped и не
применяются к identifier clauses.

### 9. Product boosts и ordering

Boost lookup использует исходный `normalizedQuery.lookupKey`. Synonym expansion
не активирует boost, созданный для другой synonym phrase: иначе изменение одной
группы неожиданно меняло бы unrelated ranking rules.

Active boost targets для exact исходной phrase добавляются в primary candidate
relation как curated results. После этого они обязаны пройти navigation scope,
published visibility, structured filters и out-of-stock policy. Для default
`RELEVANCE` ordering tuple:

```text
availability bucket DESC       # только PLACE_LAST
identifier match_priority DESC
boosted DESC
BM25 relevance_score DESC
product_id ASC
```

При `HIDE` unavailable products удаляются до ordering. При `SHOW` availability
key отсутствует. Если boost candidates после всех filters дают final result,
fuzzy fallback не запускается. При explicit business sort (`PRICE`, `NAME`,
`NEWEST`, ...) curated membership сохраняется, но выбранный пользователем sort
имеет приоритет, а boost flag не переопределяет его. Preview явно показывает,
активно ли boost ranking.

Canonical product availability берётся из существующей listing projection:
product считается available, если существует хотя бы один canonical available
variant. Для `HIDE` membership строится через projection
`system.state=indexable & criterion.availability=available`; derived product
`bool_value` не используется как membership source. Для `PLACE_LAST` этот
derived bool является только ordering key. Boost не меняет эту семантику.

### 10. Cursor stability

Search cursor version повышается и включает:

- normalized query/filter hash;
- locale, currency, scope, filters и sort;
- configuration revision/checksum;
- index schema version;
- execution mode `PRIMARY/FUZZY`;
- conditional availability bucket;
- identifier priority;
- boosted flag для relevance sort;
- business sort keys или relevance score;
- абсолютный ordinal последнего edge;
- `searchRequestId` только для storefront `TRACK`, чтобы pagination сохраняла
  одну analytics journey;
- product ID tie-breaker;
- issued-at/expiry.

Предыдущие runtime revisions сохраняются как минимум до истечения cursor TTL.
Cursor старше retained revisions получает `SEARCH_CURSOR_EXPIRED`, а не
продолжает pagination с другими query-time rules. Инкрементальные изменения
товаров следуют существующей eventual-consistency семантике listing pagination;
план не обещает snapshot search index между отдельными HTTP requests.

### 11. Preview diagnostics

Preview запускает canonical execution с `DO_NOT_TRACK + PREVIEW`. Для page rows
выполняется дополнительный bounded diagnostic query только по returned product
IDs. Он определяет reason codes без публикации numeric score:

- `MATCHED_PRODUCT_TITLE`;
- `MATCHED_VARIANT_TITLE`;
- `MATCHED_SKU_EXACT`;
- `MATCHED_SKU_PREFIX`;
- `MATCHED_BARCODE_EXACT`;
- `MATCHED_BARCODE_PREFIX`;
- `MATCHED_VENDOR`;
- `MATCHED_CATEGORY`;
- `MATCHED_SYNONYM` с group ID/name;
- `FUZZY_FALLBACK_APPLIED` как execution-level reason;
- `PRODUCT_BOOST` с boost ID;
- `OUT_OF_STOCK_PLACED_LAST` при необходимости.

Если title/variant/category localized data для выбранной locale отсутствуют,
Preview возвращает `localizedDataMissing`/coverage hints. Он никогда не берёт
текст из другой locale и не показывает handle/ID как локализованный title.

## Совместное поведение search features

| Feature | Primary text | Identifier exact/prefix | Fuzzy pass | Scope/filters | Explicit business sort |
|---|---|---|---|---|---|
| Searchable field toggle | Да | Да, для SKU/barcode | Да, только text | До listing intersection | Не меняет membership |
| Synonyms | Exact query-time expansion | Никогда | Не расширяются | До listing intersection | Кандидаты сохраняются |
| Typo tolerance | Нет | Никогда | Distance 1 при final zero | Проверка zero после filters | Кандидаты сохраняются |
| Product boost | Exact curated candidates по исходной phrase | Может поднять identifier match, но ниже availability/exact tier | Exact phrase rule сохраняется и в fuzzy execution, если fallback всё же нужен | Все curated products проходят canonical filters | Membership сохраняется, boost rank не переопределяет explicit sort |
| OOS `SHOW` | Membership без изменений | То же | То же | Availability не фильтрует | Availability не сортирует |
| OOS `PLACE_LAST` | Availability первый bucket | То же | То же | Membership без изменений | Bucket остаётся перед business keys |
| OOS `HIDE` | Unavailable исключаются | То же | Fallback решается после exclusion | Входит в product base | Unavailable отсутствуют |
| Facets | Search bitmap всегда сохраняется | То же | Fuzzy bitmap вместо primary | Canonical target isolation | Counts не зависят от sort |

## Search document contract

### Поддерживаемые поля и source readiness

| Public field | Physical source | Состояние сейчас | Что требуется |
|---|---|---|---|
| `PRODUCT_TITLE` | `catalog.product_translation.name` | Уже есть в snapshot/BM25 | Убрать handle/ID fallback, добавить coverage flag |
| `VARIANT_TITLE` | `catalog.variant_translation.title` | Таблица есть, snapshot не выбирает | Расширить Catalog snapshot selection/resolver |
| `SKU` | Catalog variant/inventory SKU | Поле есть, snapshot не выбирает | Зафиксировать canonical source и отдать normalized array |
| `BARCODE` | Catalog variant identifier | Backend-поля сейчас нет | Добавить canonical Catalog storage/API/snapshot; capability до этого `UNAVAILABLE` |
| `VENDOR` | `catalog.vendor.name` | Snapshot содержит только vendor ID | Добавить vendor label и fan-out resync на rename |
| `CATEGORY_NAME` | `catalog.category_translation.name` | Snapshot содержит только category ID | Добавить localized names и fan-out resync на rename/membership |

Must-have считается завершённым только после появления barcode source. До этого
Admin API обязан вернуть `BARCODE = UNAVAILABLE`, а UI не имеет права показывать
его как рабочий enabled field. План предполагает добавление `barcode` в
`CatalogProductVariantSnapshot`; конкретное физическое место в Catalog может
измениться без изменения listing contract.

### Расширение Catalog broker snapshot

Версия `CatalogProductSnapshotVersion` повышается. В selection добавляются:

```ts
interface CatalogProductSnapshot {
  vendor?: { id: string; name: string } | null;
  categories: Array<{
    id: string;
    content: Array<{ locale: string; name: string }>;
  }>;
  variants: CatalogProductVariantSnapshot[];
}

interface CatalogProductVariantSnapshot {
  id: string;
  sku: string | null;
  barcode: string | null;
  content: Array<{ locale: string; title: string | null }>;
  // existing availability/prices/options fields remain
}
```

Listing mapper создаёт по строке search document на каждую enabled locale и
детерминированно deduplicate/sort arrays. Отсутствующий localized title остаётся
пустым; текст другой locale, product handle и UUID не подставляются.

Fan-out события, которые должны re-sync affected products:

- product/variant title changed;
- SKU/barcode changed;
- vendor assignment changed;
- vendor name changed — все products vendor;
- category membership changed;
- category localized name changed — все products category;
- product publish/unpublish/delete;
- enabled project locales changed;
- variant create/update/delete.

Fan-out использует существующий batch listing index workflow и bounded batches,
а не отдельные per-product workflows для каждого reference rename.

### Единый инкрементально обновляемый search document index

Существующий `product_title_bm25_search_index` заменяется одной расширенной
tenant-scoped таблицей `listing.product_search_document`, которая поддерживается
инкрементальными listing workflows.

Концептуальная строка:

```sql
search_id                 uuid not null
store_id                  uuid not null
product_id                uuid not null
product_doc_id            int not null
locale                    varchar(8) not null
kind                      varchar(16) not null
status                    varchar(16) not null
published_at              timestamptz null
product_created_at        timestamptz not null
product_updated_at        timestamptz not null
product_revision          int not null
source_event_sequence     bigint not null
has_localized_title       boolean not null
product_title             text not null
variant_titles            text[] not null
sku_terms                 text[] not null
barcode_terms             text[] not null
vendor_names              text[] not null
category_names            text[] not null
indexed_at                timestamptz not null
updated_at                timestamptz not null

primary key (search_id)
unique (store_id, product_id, locale)
foreign key (store_id, product_doc_id, product_id)
  -> product_listing_index(store_id, product_doc_id, product_id)
```

Один BM25 index включает key field, `store_id`, locale/status/product-doc metadata
и все searchable columns. Text columns используют явно закреплённый
Unicode-compatible tokenizer. SKU/barcode arrays используют whole-value/raw
semantics, чтобы exact и prefix query не превращались в обычный word search.

`search_id` стабилен для `(store, product, locale)`: обычный upsert сохраняет его.
Штатный writer не должен делать delete+insert перед каждым update, как текущий
`replaceForProduct`. Product delete/unpublish и locale removal выполняют
идемпотентный delete/update тем же listing index workflow.

Первичное заполнение clean DB выполняется существующим bootstrap/indexing flow.
Дальше таблица поддерживается только Catalog/project events и reconciliation
конкретных pending products. Изменение физической схемы `pg_search` является
отдельной инфраструктурной migration-задачей, а не функцией Search Admin.

## Backend data model

Все authoring и runtime таблицы tenant-scoped. UUID создаются как UUIDv7, writes
используют transaction-aware `this.connection`, а `store_id` берётся только из
context.

### 1. Configuration control plane

#### `search_configuration_state`

Одна строка на store:

| Колонка | Назначение |
|---|---|
| `store_id` | PK/tenant |
| `desired_revision` | Последний сохранённый authoring revision |
| `active_revision` | Последний успешно применённый runtime revision |
| `applying_revision` | Revision активного apply workflow |
| `apply_status` | `PENDING/APPLYING/APPLIED/FAILED` |
| `last_failed_revision` | Revision последней ошибки |
| `last_error_code/message` | Sanitized admin error, без stack |
| `apply_workflow_id` | DBOS operation reference |
| `updated_at` | State timestamp |

Любая authoring mutation в одной транзакции блокирует state row, увеличивает
`desired_revision`, пишет entity с `changed_revision`, materialize-ит immutable
desired snapshot и создаёт durable apply job. Запуск DBOS после commit может
повторяться: job/outbox, а не in-memory enqueue, является источником восстановления.

#### `search_settings`

| Колонка | Назначение |
|---|---|
| `store_id` | PK |
| `enabled_fields` | Set только supported capability codes |
| `typo_tolerance_enabled` | Default `true` |
| `out_of_stock_policy` | `SHOW/PLACE_LAST/HIDE`, default `PLACE_LAST` |
| `version` | Optimistic concurrency version |
| `changed_revision` | Для application status |
| `updated_by/updated_at` | Audit stamp |

`PRODUCT_TITLE` всегда присутствует. Save отклоняет field, которого нет в
capabilities active index schema.

#### `search_configuration_revision`

Immutable desired snapshot, создаваемый в той же transaction, что authoring
mutation:

| Колонка | Назначение |
|---|---|
| `(store_id, revision)` | PK и точная identity desired state |
| `authoring_json` | Полный normalized settings/synonyms/boosts snapshot |
| `authoring_checksum` | Integrity/dedupe |
| `status` | `PENDING/COMPILING/COMPILED/APPLIED/FAILED/SUPERSEDED` |
| `created_by/created_at` | Audit origin |
| `error_code/message` | Safe compile failure |

Snapshot небольшой и устраняет гонку: workflow revision N никогда не компилирует
mutable authoring rows уже от revision N+1.

#### `search_configuration_apply_job`

Durable transactional outbox/recovery row:

```text
store_id, revision,
status PENDING|CLAIMED|DONE|FAILED|SUPERSEDED,
attempts, available_at, workflow_id,
last_error_code/message, created_at, updated_at,
primary key (store_id, revision)
```

Dispatcher и DBOS workflow idempotently claim job. Несколько быстрых saves могут
быть coalesced к newest revision, но пропущенные rows получают `SUPERSEDED`, а не
выдаются за успешно applied.

#### `search_runtime_configuration`

Immutable copy-on-write snapshot:

| Колонка | Назначение |
|---|---|
| `(store_id, revision)` | PK |
| `checksum` | Hash compiled behavior |
| `settings_json` | Validated settings |
| `synonym_graph_json` | Compiled locale tries/phrase tokens |
| `boost_rules_json` | Normalized phrase -> deduped product IDs |
| `compiler_version` | Search plan compiler contract |
| `created_by/created_at` | Кто инициировал revision |
| `applied_at` | Activation time |

Apply workflow читает только immutable `search_configuration_revision`,
нормализует/валидирует его и создаёт immutable runtime row. Activation выполняет
CAS `desired_revision = compiled_revision`: если появился N+1, N становится
`SUPERSEDED`, active pointer не меняется, а durable job N+1 гарантированно
остаётся runnable. При успешном CAS в той же короткой transaction меняются
`active_revision`, revision/job statuses и cache invalidation marker. Если
compile/apply падает, previous active revision остаётся serving, а affected
resources отображаются `FAILED`.

Per-resource application status вычисляется по `changed_revision`:

```text
changed_revision <= active_revision                 -> APPLIED
changed_revision <= applying_revision               -> APPLYING
last_failed_revision >= changed_revision
  and active_revision < changed_revision            -> FAILED
иначе                                                -> PENDING
```

### 2. Synonyms authoring

#### `search_synonym_group`

```text
store_id, id, name, locale, active,
version, changed_revision,
deleted_at,
created_by, created_at, updated_by, updated_at
```

#### `search_synonym_value`

```text
store_id, id, group_id,
display_value, normalized_value,
token_count, sort_index,
created_at, updated_at
```

#### `search_synonym_claim`

```text
primary key (store_id, locale, normalized_value)
group_id
```

Claim table даёт DB-level гарантию: одно normalized value не может находиться в
двух active groups одной locale. Activation/update/deactivation выполняются в
одной transaction: claims сначала проверяются/блокируются, затем заменяются.

Validation rules:

- locale должна быть enabled;
- минимум два уникальных значения после canonical normalization;
- пустые и normalized duplicates отклоняются с field path;
- maximum 20 values/group, 128 code points/value и bounded token count;
- overlapping phrases разных групп разрешены, но runtime всегда выбирает longest
  token match; exact duplicate запрещён claim table;
- inactive/deleted groups не имеют claims и не входят в runtime snapshot;
- delete является soft tombstone до применения revision, затем скрывается из
  default list;
- typo examples не создаются автоматически и UI объясняет назначение fuzzy.

### 3. Product boosts authoring

#### `search_product_boost`

```text
store_id, id, locale, active,
version, changed_revision, deleted_at,
created_by, created_at, updated_by, updated_at
```

#### `search_product_boost_phrase`

```text
store_id, boost_id, display_phrase, normalized_phrase, sort_index
unique (boost_id, normalized_phrase)
```

#### `search_product_boost_product`

```text
store_id, boost_id, product_id, sort_index
unique (boost_id, product_id)
```

Validation rules:

- минимум одна phrase и один product;
- phrase — exact whole normalized query, не substring;
- maximum 20 phrases и 50 products на boost для MVP;
- product existence/tenant проверяется через Catalog service contract;
- cross-service FK не создаётся;
- удалённый product остаётся видимым в Admin rule с warning, но runtime его
  игнорирует;
- active exact phrase делает target curated candidate до canonical listing
  intersection;
- несколько active boosts для одной phrase объединяют product set;
- один product не получает stacking multiplier от duplicate rules.

### 4. Audit

Entity rows содержат последний audit stamp. Дополнительно append-only
`search_configuration_audit` хранит:

```text
store_id, id, revision,
resource_type, resource_id, action,
before_json, after_json,
actor_id, request_id, created_at
```

В audit не пишутся raw SQL/query AST и чувствительные request headers.

### 5. Index state

#### `search_index_state`

```text
store_id primary key
schema_version
overall_status READY | UPDATING | FAILED
initial_sync_completed_at
last_successful_item_at
last_attempt_at
last_error_code
last_error_message
pending_product_count
failed_pending_product_count
updated_at
```

GraphQL отдельно сообщает `servingAvailable`. State вычисляется так:

- `FAILED`, если extension/index недоступен либо хотя бы один item исчерпал retry
  budget;
- `UPDATING`, пока initial sync не завершён или существует retryable backlog;
- `READY`, когда initial sync завершён и backlog пуст.

Если initial sync уже завершён, `UPDATING/FAILED` может иметь
`servingAvailable=true`: storefront читает успешно синхронизированные документы,
а Admin честно показывает pending/failed products.

#### `search_index_locale_state`

```text
store_id, locale,
expected_products, indexed_products,
published_products,
localized_title_products, missing_localized_title_products,
updated_at,
primary key (store_id, locale)
```

Counters обновляются инкрементально и периодически сверяются с
`product_listing_index`; расхождение создаёт pending item или safe `FAILED`
status, но не запускает массовую административную операцию.

#### `search_index_item_state`

```text
store_id, product_id,
desired_event_sequence, desired_action UPSERT|DELETE,
desired_source_revision,
applied_event_sequence, applied_action UPSERT|DELETE nullable,
status PENDING|APPLIED|FAILED,
attempts, available_at,
last_error_code/message,
updated_at,
primary key (store_id, product_id)
```

Catalog event monotonic upsert-ит desired side. Listing item workflow обновляет
search document и applied side одной transaction. Ошибка оставляет item в
`PENDING`, retry exhaustion переводит его в `FAILED`; событие со старым/equal
sequence является idempotent no-op. Delete хранится как tombstone, чтобы старое
событие не воскресило документ.

### 6. Search analytics facts

Events service используется как transport/retry/DLQ, но не как аналитическое
хранилище: его retention и JSON payload не подходят для отчётов. Facts принадлежат
`listing`.

#### `search_request`

```text
store_id, id, client_search_id, occurred_at,
session_id_hash, customer_id nullable,
locale, normalized_query, query_hash,
scope_kind, scope_id nullable,
execution_fingerprint,
result_count, fallback_applied,
configuration_revision, index_schema_version,
previous_search_request_id nullable,
first_clicked_at nullable, click_count,
first_purchased_at nullable, purchase_count
unique (store_id, session_id_hash, client_search_id)
```

Admin Preview не создаёт row. IP/user-agent/raw headers не сохраняются. Стабильный
anonymous `searchSessionId` должен приходить от first-party storefront cookie;
`requestId`/`correlationId` не являются shopping session.

Storefront SDK создаёт новый UUID `clientSearchId` при явном submit/change query
и повторно использует его при network retry. Unique constraint делает создание
`search_request` идемпотентным в пределах signed session: retry с тем же
fingerprint query/locale/scope/filters/sort возвращает существующий server ID, а
не увеличивает число searches. Повторное использование ID с другим fingerprint
отклоняется как `SEARCH_CLIENT_ID_REUSED`. Новый execution создаёт новый ID;
pagination берёт исходный server ID из подписанного cursor.

#### `search_click`

```text
store_id, id, session_id_hash, client_event_id,
search_request_id, product_id, purchasable_id nullable,
position, occurred_at
unique (store_id, session_id_hash, client_event_id)
```

#### `search_purchase_attribution`

```text
store_id, id,
search_request_id, search_click_id,
order_id, order_line_id,
product_id, purchasable_id nullable,
quantity, occurred_at,
unique (store_id, order_line_id)
```

MVP conversion point — successful `order.created`. Attribution policy — последний
валидный click для конкретной checkout line в окне 7 дней; canonical resolution
происходит до insert, поэтому одна order line не может увеличить purchases для
нескольких clicks. Позже conversion point можно заменить на paid/completed без
изменения search request/click identity.

#### `search_query_daily`

```text
store_id, date, locale, query_hash, normalized_query,
searches, zero_result_searches,
result_count_sum, last_result_count,
searches_with_click, clicks,
searches_with_purchase, purchases,
fuzzy_searches, reformulations,
last_searched_at
```

Daily rollup является пересчитываемой projection из facts. Определения метрик:

- CTR = search requests с минимум одним valid click / matured search requests;
- purchase rate = search requests с attributed order line / search requests,
  matured по 7-day attribution window;
- no results = `result_count = 0`;
- results/no click = `result_count > 0` и нет click после 30-minute maturity
  window;
- reformulation = следующий отличный normalized query той же session в течение
  10 минут;
- average results = `result_count_sum / searches`.

#### `search_query_work_item`

```text
store_id, locale, query_hash, issue_kind ZERO_RESULTS|NO_CLICK,
status OPEN|RESOLVED|IGNORED,
status_revision, note nullable,
resolved_by/resolved_at, ignored_by/ignored_at,
last_observed_at, reopened_at
```

Status не удаляет facts/aggregates. `RESOLVED` автоматически возвращается в
`OPEN`, если после resolution накопилось не менее трёх новых qualifying searches;
`IGNORED` остаётся ignored до ручного reopen.

## Incremental search document lifecycle

1. Catalog/project event monotonic upsert-ит `search_index_item_state.desired_*`.
2. Existing listing item workflow получает актуальный Catalog snapshot.
3. Перед write он повторно проверяет desired sequence/source revision: stale
   snapshot не может пометить более новое состояние как `APPLIED`.
4. В одной transaction обновляются listing rows, search documents всех enabled
   locales и `applied_*` state.
5. Ошибка оставляет item в `PENDING`; DBOS retry использует тот же idempotency key.
6. После исчерпания retry budget item становится `FAILED`, safe error и counters
   видны в Index Status.
7. Более новое событие снова переводит item в `PENDING`; старое/equal событие
   является no-op.

Initial sync использует тот же bounded per-item workflow. Отдельного публичного
массового operation API нет: Index Status показывает его суммарную готовность,
pending products и ошибки.

## Admin GraphQL API

### Namespace

Существующие root namespaces сохраняются:

```graphql
extend type ListingQuery {
  search: SearchAdminQuery!
}

extend type ListingMutation {
  search: SearchAdminMutation!
}
```

Admin вызывает `listingQuery.search.*` и `listingMutation.search.*`. Новые
Node entities получают типы в `GlobalIdEntity`: `SearchSynonymGroup`,
`SearchProductBoost`, `SearchQueryWorkItem`.

### Query surface

```graphql
type SearchAdminQuery {
  capabilities: SearchCapabilities!
  overview(input: SearchOverviewInput!): SearchOverview!
  preview(input: SearchPreviewInput!): SearchPreviewResult!

  settings: SearchSettings!

  synonymGroup(id: ID!): SearchSynonymGroup
  synonymGroups(
    first: Int
    after: String
    where: SearchSynonymGroupWhereInput
    orderBy: [SearchSynonymGroupOrderByInput!]
  ): SearchSynonymGroupConnection!

  productBoost(id: ID!): SearchProductBoost
  productBoosts(
    first: Int
    after: String
    where: SearchProductBoostWhereInput
    orderBy: [SearchProductBoostOrderByInput!]
  ): SearchProductBoostConnection!

  analytics(input: SearchAnalyticsInput!): SearchAnalytics!
  queryMetrics(
    input: SearchAnalyticsInput!
    first: Int
    after: String
    where: SearchQueryMetricWhereInput
    orderBy: [SearchQueryMetricOrderByInput!]
  ): SearchQueryMetricConnection!
  queryWorkItems(
    first: Int
    after: String
    where: SearchQueryWorkItemWhereInput
  ): SearchQueryWorkItemConnection!

  indexStatus: SearchIndexStatus!
}
```

`overview` агрегирует небольшой набор данных для landing page, но не заменяет
paginated Analytics API. Query list endpoints используют Relay cursor pagination
и server-side filters; Admin не загружает всю историю для client-side filtering.

### Capabilities

```graphql
enum SearchCapabilityState {
  READY
  UPDATING
  UNAVAILABLE
}

enum SearchableFieldCode {
  PRODUCT_TITLE
  VARIANT_TITLE
  SKU
  BARCODE
  VENDOR
  CATEGORY_NAME
}

enum SearchNavigationScopeKind {
  GLOBAL
  CATEGORY
  COLLECTION
}

type SearchFieldCapability {
  code: SearchableFieldCode!
  state: SearchCapabilityState!
  mandatory: Boolean!
  defaultEnabled: Boolean!
  unavailableReason: String
}

type SearchCapabilities {
  fields: [SearchFieldCapability!]!
  navigationScopes: [SearchNavigationScopeKind!]!
  supportedLocales: [LocaleCode!]!
  maxQueryLength: Int!
  maxSynonymValues: Int!
  maxBoostProducts: Int!
}
```

UI строит controls только из capabilities. Engine version и SQL
не являются capability fields для обычного администратора.

### Preview contract

Navigation scope отделён от text query:

```graphql
input SearchPreviewScopeInput {
  kind: SearchNavigationScopeKind!
  categoryId: ID
  collectionId: ID
}

enum SearchPreviewConfigurationMode {
  ACTIVE
  SAVED_PENDING
}

input SearchPreviewInput {
  query: String!
  locale: LocaleCode!
  currency: CurrencyCode
  scope: SearchPreviewScopeInput!
  facets: [ListingProductFilter!]
  orderBy: ListingOrderByInput
  first: Int = 24
  after: String
  configurationMode: SearchPreviewConfigurationMode = ACTIVE
}
```

`SAVED_PENDING` доступен только Admin и всегда помечается banner как неактивное
поведение. Для него backend компилирует ephemeral runtime plan из сохранённых
authoring rows тем же compiler, но не меняет active pointer; compile error
возвращается как Admin validation/error state. Storefront parity по умолчанию
означает `ACTIVE`.

```graphql
enum SearchExecutionMode {
  PRIMARY
  FUZZY
}

enum SearchLocaleDataStatus {
  COMPLETE
  PARTIAL
  MISSING
}

enum SearchMatchReasonCode {
  MATCHED_PRODUCT_TITLE
  MATCHED_VARIANT_TITLE
  MATCHED_SKU_EXACT
  MATCHED_SKU_PREFIX
  MATCHED_BARCODE_EXACT
  MATCHED_BARCODE_PREFIX
  MATCHED_VENDOR
  MATCHED_CATEGORY
  MATCHED_SYNONYM
  FUZZY_FALLBACK_APPLIED
  PRODUCT_BOOST
  OUT_OF_STOCK_PLACED_LAST
}

type SearchMatchReason {
  code: SearchMatchReasonCode!
  label: String!
  ruleId: ID
  ruleName: String
}

type SearchPreviewExecution {
  mode: SearchExecutionMode!
  fuzzyFallbackApplied: Boolean!
  boostRankingActive: Boolean!
  configurationRevision: BigInt!
  indexSchemaVersion: Int!
  localeDataStatus: SearchLocaleDataStatus!
  missingLocalizedProducts: Int!
}

type SearchPreviewEdge {
  cursor: String!
  node: Listing!
  position: Int!
  available: Boolean!
  reasons: [SearchMatchReason!]!
}

type SearchPreviewResult {
  normalizedQuery: String!
  totalCount: Int!
  execution: SearchPreviewExecution!
  edges: [SearchPreviewEdge!]!
  pageInfo: PageInfo!
}
```

Position является абсолютной только в пределах доступной cursor depth. Preview
не заявляет, что synonym «изменил позицию на N», если counterfactual query без
synonym не выполнялся; безопасная причина — `Matched synonym`.

### Settings и application state

```graphql
enum SearchOutOfStockPolicy {
  SHOW
  PLACE_LAST
  HIDE
}

enum SearchApplicationStatus {
  PENDING
  APPLYING
  APPLIED
  FAILED
}

type SearchPublicError {
  code: String!
  message: String!
}

type SearchApplicationState {
  status: SearchApplicationStatus!
  desiredRevision: BigInt!
  activeRevision: BigInt
  lastAttemptAt: DateTime
  appliedAt: DateTime
  error: SearchPublicError
}

type SearchFieldSetting {
  code: SearchableFieldCode!
  enabled: Boolean!
  mandatory: Boolean!
  capabilityState: SearchCapabilityState!
}

type SearchSettings {
  version: Int!
  fields: [SearchFieldSetting!]!
  typoToleranceEnabled: Boolean!
  outOfStockPolicy: SearchOutOfStockPolicy!
  application: SearchApplicationState!
  updatedBy: User
  updatedAt: DateTime!
}

input SearchSettingsUpdateInput {
  expectedVersion: Int!
  enabledFields: [SearchableFieldCode!]!
  typoToleranceEnabled: Boolean!
  outOfStockPolicy: SearchOutOfStockPolicy!
}
```

Settings mutation возвращает сохранённые authoring data и новую application
state. Успешный payload ещё не означает `APPLIED`.

### Synonym и boost types

```graphql
type SearchSynonymGroup implements Node {
  id: ID!
  version: Int!
  name: String!
  locale: LocaleCode!
  values: [String!]!
  active: Boolean!
  application: SearchApplicationState!
  updatedBy: User
  updatedAt: DateTime!
}

input SearchSynonymGroupCreateInput {
  name: String!
  locale: LocaleCode!
  values: [String!]!
  active: Boolean = true
}

input SearchSynonymGroupUpdateInput {
  id: ID!
  expectedVersion: Int!
  name: String
  locale: LocaleCode
  values: [String!]
  active: Boolean
}

type SearchProductBoost implements Node {
  id: ID!
  version: Int!
  locale: LocaleCode!
  phrases: [String!]!
  products: [Product!]!
  missingProductIds: [ID!]!
  active: Boolean!
  application: SearchApplicationState!
  updatedBy: User
  updatedAt: DateTime!
}

input SearchProductBoostCreateInput {
  locale: LocaleCode!
  phrases: [String!]!
  productIds: [ID!]!
  active: Boolean = true
}

input SearchProductBoostUpdateInput {
  id: ID!
  expectedVersion: Int!
  locale: LocaleCode
  phrases: [String!]
  productIds: [ID!]
  active: Boolean
}
```

Create/update/delete payloads следуют существующему pattern:

```graphql
type SearchSynonymGroupPayload {
  synonymGroup: SearchSynonymGroup
  application: SearchApplicationState!
  userErrors: [GenericUserError!]!
}
```

Delete возвращает deleted global ID, application state и `userErrors`. Tombstone
может временно отображаться в Admin как `Deleting / Pending`.

### Overview, Analytics и worklist

```graphql
input SearchDateRangeInput {
  from: DateTime!
  to: DateTime!
}

input SearchOverviewInput {
  range: SearchDateRangeInput!
  locale: LocaleCode
}

input SearchAnalyticsInput {
  range: SearchDateRangeInput!
  locale: LocaleCode
}

type SearchAnalyticsSummary {
  searches: BigInt!
  uniqueQueries: BigInt!
  zeroResultRate: Float!
  clickThroughRate: Float!
  purchaseRate: Float!
  dataUpdatedAt: DateTime!
  clicksMatureThrough: DateTime!
  purchasesMatureThrough: DateTime!
}

type SearchQueryMetric {
  normalizedQuery: String!
  locale: LocaleCode!
  searches: BigInt!
  averageResultCount: Float!
  lastResultCount: Int!
  clicks: BigInt!
  purchases: BigInt!
  fuzzySearches: BigInt!
  reformulations: BigInt!
  lastSearchedAt: DateTime!
  workItem: SearchQueryWorkItem
}

enum SearchQueryIssueKind {
  ZERO_RESULTS
  NO_CLICK
}

enum SearchQueryWorkItemStatus {
  OPEN
  RESOLVED
  IGNORED
}

type SearchQueryWorkItem implements Node {
  id: ID!
  query: String!
  locale: LocaleCode!
  issueKind: SearchQueryIssueKind!
  status: SearchQueryWorkItemStatus!
  note: String
  lastObservedAt: DateTime!
  reviewedBy: User
  reviewedAt: DateTime
}

type SearchOverview {
  indexStatus: SearchIndexStatus!
  analytics: SearchAnalyticsSummary!
  topZeroResultQueries: [SearchQueryMetric!]!
  topNoClickQueries: [SearchQueryMetric!]!
}
```

CTR считается только по requests не новее `clicksMatureThrough` (MVP: 30 минут),
а purchase rate — только по requests не новее `purchasesMatureThrough` (MVP:
7 дней). Нельзя считать свежие requests окончательными no-click/no-purchase
outcomes; поздние click/purchase facts пересчитывают daily rollups.

### Index API

```graphql
enum SearchIndexStatusCode {
  READY
  UPDATING
  FAILED
}

type SearchIndexLocaleStatus {
  locale: LocaleCode!
  expectedProducts: Int!
  indexedProducts: Int!
  localizedTitleProducts: Int!
  missingLocalizedTitleProducts: Int!
}

type SearchIndexStatus {
  status: SearchIndexStatusCode!
  servingAvailable: Boolean!
  schemaVersion: Int!
  initialSyncCompletedAt: DateTime
  lastSuccessfulItemAt: DateTime
  lastAttemptAt: DateTime
  pendingProducts: Int!
  failedPendingProducts: Int!
  locales: [SearchIndexLocaleStatus!]!
  lastError: SearchPublicError
}
```

### Mutation surface

```graphql
type SearchAdminMutation {
  settingsUpdate(input: SearchSettingsUpdateInput!): SearchSettingsPayload!

  synonymGroupCreate(input: SearchSynonymGroupCreateInput!): SearchSynonymGroupPayload!
  synonymGroupUpdate(input: SearchSynonymGroupUpdateInput!): SearchSynonymGroupPayload!
  synonymGroupDelete(input: SearchSynonymGroupDeleteInput!): SearchDeletePayload!

  productBoostCreate(input: SearchProductBoostCreateInput!): SearchProductBoostPayload!
  productBoostUpdate(input: SearchProductBoostUpdateInput!): SearchProductBoostPayload!
  productBoostDelete(input: SearchProductBoostDeleteInput!): SearchDeletePayload!

  queryWorkItemUpdate(input: SearchQueryWorkItemUpdateInput!): SearchQueryWorkItemPayload!
}
```

## Storefront analytics integration contracts

Search quality нельзя посчитать только по Admin или server logs. Нужны небольшие
изменения storefront listing, Checkout и Orders.

### Public storefront surface и session context

Listing service получает отдельный `graphql-storefront` server/subgraph, который
переиспользует application services, но не Admin authorization/schema. В public
composition он предоставляет тот же canonical listing field и tracking mutation:

```graphql
input StorefrontSearchJourneyInput {
  clientSearchId: ID!
}

extend type Query {
  listingQuery: ListingStorefrontQuery!
}

extend type Mutation {
  listingMutation: ListingStorefrontMutation!
}

type ListingStorefrontMutation {
  searchResultClickTrack(
    input: SearchResultClickTrackInput!
  ): SearchResultClickTrackPayload!
}

# canonical listing args опущены только для краткости
type ListingStorefrontQuery {
  listing(
    query: String
    searchJourney: StorefrontSearchJourneyInput
    # scope/locale/currency/facets/orderBy/pagination
  ): ListingConnection!
}
```

`searchJourney` разрешён только для non-empty query. Storefront context
middleware разрешает store из trusted host/channel context, а не input, и
проверяет/выдаёт signed SameSite first-party anonymous session cookie. Если
storefront использует отдельный BFF, cookie заверяется BFF и передаётся Listing
через trusted internal header. В обоих вариантах Listing получает stable session
identity, customer ID при наличии и consent/analytics flag; raw cookie не
сохраняется. Click mutation имеет rate limit/CSRF-origin policy и тот же session
binding. Checkout вызывает отдельный authenticated internal action для проверки
checkout attribution token, а не Admin GraphQL.

Нужно зарегистрировать storefront server в Nest/bootstrap, добавить context
middleware, schema/codegen, federation composition/Hive checks и resolver tests.
Без этого `ListingConnection` extensions ниже не считаются реализованным API.

### Search result tracking

После успешного storefront listing `listing` создаёт один `search_request` для
первой страницы нового query. Pagination сохраняет request/journey identity и не
увеличивает `searches`.

Storefront listing принимает служебный `clientSearchId: ID!` вместе с новым
search execution (не как ranking/filter input). Storefront SDK генерирует его
один раз на submit и сохраняет при retry. `searchSessionId` остаётся в
first-party cookie/header и сервер связывает его с request; Admin Preview всегда
использует `DO_NOT_TRACK` и не требует этих значений.

Storefront response получает:

```graphql
extend type ListingConnection {
  searchRequestId: ID
}

extend type ListingEdge {
  searchAttributionToken: String
}
```

Token — opaque signed HMAC со `storeId`, request ID, product ID, position,
configuration revision/index schema version, issued-at и expiry. Клиент не может изменить
product/position без invalid signature.

Click contract:

```graphql
input SearchResultClickTrackInput {
  clientEventId: ID!
  attributionToken: String!
}

type SearchResultClickTrackPayload {
  searchClickId: ID
  checkoutAttributionToken: String
  userErrors: [GenericUserError!]!
}
```

`clientEventId` обеспечивает retry dedupe. Server валидирует store, session,
signature и TTL. `checkoutAttributionToken` — второй signed opaque token, уже
содержащий validated `searchClickId`; именно он передаётся при add-to-cart.

### Checkout line attribution

При add/create line storefront передаёт `checkoutAttributionToken`. Checkout
валидирует его через listing action и сохраняет immutable line-level metadata:

```ts
interface SearchAttribution {
  source: "SEARCH";
  searchRequestId: string;
  searchClickId: string;
  productId: string;
  purchasableId?: string;
}
```

Нельзя использовать checkout-wide `externalSource/externalId`, generic tags или
client-defined purchasable snapshot: разные lines могут иметь разные источники.

### Purchase event

Order line наследует attribution. Orders публикует через transactional outbox
или durable DBOS step idempotent event:

```ts
interface SearchPurchaseAttributedEvent {
  eventType: "searchPurchaseAttributed";
  storeId: string;
  orderId: string;
  checkoutId: string;
  occurredAt: string;
  lines: Array<{
    orderLineId: string;
    productId: string;
    purchasableId?: string;
    quantity: number;
    searchRequestId: string;
    searchClickId: string;
  }>;
}
```

Listing принимает его batch handler, дедуплицирует facts и обновляет rollups.
Generic Events service даёт persistence/retry/DLQ, но его 90-day cleanup не
заменяет listing analytics storage.

## Backend module design

### Целевая структура

```text
services/listing/src/search/
  normalization/
    SearchQueryNormalizer.ts
    SearchPhraseNormalizer.ts
  capabilities/
    SearchFieldRegistry.ts
    SearchCapabilitiesService.ts
  runtime/
    SearchRuntimeConfigurationLoader.ts
    SearchExecutionContextResolver.ts
  planner/
    SearchQueryPlan.ts
    SearchQueryPlanBuilder.ts
    SearchSynonymExpander.ts
    PgSearchQueryCompiler.ts
  execution/
    SearchExecutionService.ts
    SearchExecutionTypes.ts
    SearchMatchDiagnosticsRepository.ts
  configuration/
    SearchConfigurationApplyService.ts
    SearchApplicationStateMapper.ts
  index/
    SearchDocumentBuilder.ts
    SearchIndexAuditService.ts
    SearchIndexStatusService.ts
  analytics/
    SearchAnalyticsService.ts
    SearchAttributionTokenService.ts
    SearchAnalyticsAggregator.ts

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
services/listing/src/api/graphql-storefront/schema/search.graphql
services/listing/src/resolvers/storefront/search/
```

`graphql-storefront` здесь является новым public subgraph surface: в текущем
service есть только `graphql-admin`, поэтому storefront tracking fields/mutation
нельзя оставлять как абстрактное расширение без server registration, context
middleware и generated types.

### Refactor существующего search path

1. `StorefrontProductTitleSearchQueryRepository` перестаёт содержать duplicate
   unused candidate/page SQL.
2. Нормализация переносится в `SearchQueryNormalizer`.
3. `compileSearchCandidateRowsCte` получает compiled engine plan из
   `SearchExecutionContext`.
4. Search candidate bitmap добавляется в `compileProductBaseBitmapSql` при любом
   non-empty query, независимо от scope/sort.
5. `ResolvedListingRequest` получает pinned search execution metadata.
6. `compilePageQuerySql`, total/facets/virtual facets читают один mode.
7. Cursor version и hash расширяются config/schema/mode.
8. Product index writer строит multi-field documents и сохраняет `search_id` на
   update.
9. Default-locale handle/ID fallback удаляется из search content mapper.

### Scripts, workflows и transactions

- CRUD validation/normalization живёт в Scripts, а не resolver;
- mutation resolver декодирует global IDs и запускает Script/DBOS workflow;
- authoring write + immutable desired snapshot + desired revision + audit +
  apply job/outbox выполняются в одной transaction;
- apply workflow имеет deterministic store-scoped operation/workflow ID;
- apply workflow компилирует только immutable revision, активирует её через CAS,
  coalesce-ит superseded saves и всегда догоняет последний `desired_revision`;
- index writes используют existing listing item transaction;
- public error mapper отделяет safe error code/message от internal log context.

### Authorization

Минимальные Casbin resources/actions:

```text
listing.search.read
listing.search.manage
listing.search.analytics.read
```

Пользователь с `read` может Preview и видеть status/settings, но не сохранять.
Analytics требует отдельного permission из-за сохранённых покупательских фраз.

### User error codes

| Code | Сценарий |
|---|---|
| `SEARCH_CONFIGURATION_CONFLICT` | Stale `expectedVersion` |
| `SEARCH_FIELD_UNAVAILABLE` | Field не готов в active schema |
| `SEARCH_LOCALE_UNAVAILABLE` | Locale не enabled |
| `SEARCH_SYNONYM_VALUE_CONFLICT` | Active claim уже принадлежит другой группе |
| `SEARCH_SYNONYM_VALUES_REQUIRED` | После normalization меньше двух values |
| `SEARCH_BOOST_PRODUCTS_REQUIRED` | Нет target products |
| `SEARCH_BOOST_PHRASES_REQUIRED` | Нет phrases |
| `SEARCH_PRODUCT_NOT_FOUND` | Cross-store/deleted target при save |
| `SEARCH_CLIENT_ID_REUSED` | Idempotency ID повторён в session с другим execution fingerprint |
| `SEARCH_INDEX_UNAVAILABLE` | Extension/index недоступен или initial sync ещё не даёт serving data |
| `SEARCH_CURSOR_EXPIRED` | Configuration revision больше не retained |

Field paths следуют GraphQL input, например
`["input", "values", "2"]` или `["input", "enabledFields"]`.

## Observability, privacy и performance guardrails

### Logs/metrics

Search request log содержит только bounded metadata:

- store ID;
- query hash, но не raw query в technical logs;
- locale/scope;
- config revision/index schema version/mode;
- candidate/final cardinalities;
- selected collector;
- fallback applied;
- branch durations/SQL round trips;
- boost/synonym counts без raw values.

Metrics:

- primary/fuzzy latency histograms;
- primary zero/fuzzy hit ratios;
- candidate/final cardinalities;
- config apply duration/failures;
- incremental indexing lag/failures;
- index coverage/pending products;
- analytics ingest/rollup lag;
- expired/invalid tracking tokens.

### Privacy/retention

- normalized query text хранится только в analytics tables с ограниченным RBAC;
- raw IP/user-agent/auth tokens не сохраняются;
- anonymous session хранится salted/rotatable hash;
- fact retention задаётся явно, например 13 месяцев, daily aggregates дольше;
- delete/export policy для customer-linked data согласуется с IAM privacy flow;
- preview/technical logs не дублируют raw query;
- analytics query length ограничен 128 code points.

### Query guardrails

- maximum query tokens;
- maximum synonym units matched per query;
- maximum alternatives per group;
- maximum compound AST clauses;
- timeout/cancellation для Preview;
- никаких unescaped regex/query-parser strings;
- никаких silent truncated synonym alternatives: oversized config получает
  `FAILED` при apply;
- никакого hidden top-K для totals/facets;
- `EXPLAIN ANALYZE` corpus matrices для global/category, filters, fuzzy, arrays,
  boost join и empty result.

### Multi-tenant BM25 behavior

Compatibility fixtures обязаны доказать, что `store_id` predicate исключает
cross-tenant membership/data leakage. Отдельно измеряется влияние общего corpus
на relative BM25 score: обычные writes другого store не должны нарушать
deterministic tie-breaking внутри одного request. Если tenant-local IDF станет
обязательным продуктовым требованием, physical partitioning проектируется
отдельно и не меняет Admin API этого плана.

## Admin UI architecture

### Registration и routes

Новый module регистрируется после Facets:

```tsx
registerModule({
  key: "search",
  domain: "discovery",
  sidebar: {
    label: "Search",
    icon: null,
    order: 6, // Facets = 5
  },
  items: [
    { key: "search-overview", path: "/:orgName/:storeName/search", component: ... },
    { key: "search-preview", path: "/:orgName/:storeName/search/preview", component: ... },
    { key: "search-synonyms", path: "/:orgName/:storeName/search/synonyms", component: ... },
    { key: "search-boosts", path: "/:orgName/:storeName/search/product-boosts", component: ... },
    { key: "search-settings", path: "/:orgName/:storeName/search/settings", component: ... },
    { key: "search-analytics", path: "/:orgName/:storeName/search/analytics", component: ... },
  ],
});
```

Route items не получают собственные sidebar labels: в Discovery остаётся один
пункт `Search`, а страницы переключаются внутренними tabs. Первый item даёт
module path для sidebar. `SearchShell` отвечает за title, tabs, общий application
banner и route navigation.

Sidebar:

```text
Discovery
  Facets
  Search
```

### Целевая структура файлов

```text
admin/src/domains/discovery/search/
  register.tsx
  search-shell/
    search-shell.tsx
    search-tabs.tsx
    application-banner.tsx
  shared/
    components/
      search-status-tag.tsx
      locale-select.tsx
      query-actions-menu.tsx
      search-product-results.tsx
    hooks/
      use-search-capabilities.ts
      use-search-application-state.ts
    mappers/
      search-errors.mapper.ts
  overview/
    graphql/{fragments,queries,operation-types,index}.ts
    hooks/use-search-overview.ts
    page/page.tsx
  preview/
    graphql/{fragments,queries,operation-types,index}.ts
    hooks/use-search-preview.ts
    mappers/search-preview-input.mapper.ts
    page/page.tsx
  synonyms/
    graphql/{fragments,queries,mutations,operation-types,index}.ts
    hooks/
    mappers/
    modals/synonym-group-modal/
    page/page.tsx
  product-boosts/
    graphql/{fragments,queries,mutations,operation-types,index}.ts
    hooks/
    mappers/
    modals/product-boost-modal/
    page/page.tsx
  settings/
    graphql/{fragments,queries,mutations,operation-types,index}.ts
    hooks/
    mappers/
    page/page.tsx
  analytics/
    graphql/{fragments,queries,mutations,operation-types,index}.ts
    hooks/
    page/page.tsx
  index-status/
    graphql/{fragments,queries,operation-types,index}.ts
    hooks/
    modals/index-status-drawer/
```

Правила `knowledge/vault/patterns/admin-graphql-layer.md` обязательны:

- generated API types импортируются напрямую из `@/graphql/types`;
- API output view models не создаются;
- operation response/variables описываются через generated schema types;
- UI-local types разрешены для form state, table filter state и draft rows;
- hooks unwrap `listingQuery.search`/`listingMutation.search`;
- mappers преобразуют только form state -> API input и `userErrors` -> fields;
- cache/refetch policy находится в hooks;
- mock imports не остаются в API-backed hooks.

### Переиспользуемые Admin primitives

| Задача | Переиспользование |
|---|---|
| Page shell/header/toolbar/footer | `DataLayout` |
| Lists, sorting, row actions | Facets AG Grid pattern |
| Search/filter controls | `FilterWidget`, `useFilters` |
| Product selection for boost | `useProductPicker` / `ProductPickerModal` |
| Category scope | Existing category picker pattern |
| Result cards/pagination | Вынести generic части из category `listing-preview-modal` |
| Confirmation/drawers | `ModalLayout`, modal stack, `App.useApp()` |
| Status/alerts | Ant Design `Alert`, `Tag`, `Progress`, `Result` |

Category preview modal нельзя импортировать целиком: он содержит category-specific
state/sort mapping. Нужно вынести reusable `ListingPreviewGrid`, product card и
cursor pagination в shared discovery/listing components с generated API props.

## Text wireframes

Wireframes показывают information hierarchy и состояния, а не pixel-perfect
layout. На desktop content использует доступную ширину `DataLayout`; на узком
экране cards/tables переходят в stack/list.

### Общий Search shell

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Search                                                                       │
│ Manage storefront text search and measure its quality                       │
│                                                                              │
│ Overview | Preview | Synonyms | Product boosts | Settings | Analytics        │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Pending] Saved changes are not active yet. Applying revision 42…            │
│                                              [Open Preview] [View details]    │
├──────────────────────────────────────────────────────────────────────────────┤
│ <active page>                                                                │
└──────────────────────────────────────────────────────────────────────────────┘
```

Global application banner появляется только для `PENDING/APPLYING/FAILED`:

```text
FAILED: Changes could not be applied. Storefront still uses revision 41.
        Safe public error message.                 [Retry] [Preview active]
```

### Overview

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Search overview                         [Locale: All ▼] [Last 30 days ▼]     │
├──────────────────────────────────────────────────────────────────────────────┤
│ INDEX                                                                        │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ ● FAILED — 3 product updates require attention                          │ │
│ │ Last successful update  11 Jul 2026, 10:42                              │ │
│ │ Last attempt            11 Jul 2026, 11:03                              │ │
│ │ Products                9,984 / 10,012       Pending 28 · Failed 3       │ │
│ │ uk  9,984/10,012   en 9,770/10,012   ru 9,801/10,012                   │ │
│ │ “Catalog snapshot was unavailable for 28 products.”                     │ │
│ │                                                       [Index details →] │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│ │ Searches     │ │ No results   │ │ Click rate   │ │ Purchase rate│          │
│ │ 24,310       │ │ 4.8%         │ │ 31.2%        │ │ 6.4%         │          │
│ │ +8.1%        │ │ -0.7 pp      │ │ +1.4 pp      │ │ +0.3 pp      │          │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘          │
├───────────────────────────────────┬──────────────────────────────────────────┤
│ Top searches with no results      │ Results but no clicks                    │
│ Query       Searches  Last        │ Query       Searches Results  Last       │
│ snikers     184       10:44   […] │ winter hat  91       12       10:38  […] │
│ чохол       121       10:40   […] │ red dress   83       44       10:12  […] │
│                                   │                                          │
│ [View all no-result queries →]    │ [View all no-click queries →]            │
└───────────────────────────────────┴──────────────────────────────────────────┘
```

Row actions `[…]`:

```text
Open in Preview
Create synonym group
Create product boost
Mark Resolved
Mark Ignored
```

Если analytics ещё не mature, metric card показывает `Collecting data`, а не
ложный `0%`. Index `UPDATING` показывает expected/indexed и pending counters;
`READY` не показывает error block.

### Preview

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Search preview                                                               │
│ Uses the same matching, visibility, filters and ranking as storefront        │
├──────────────────────────────────────────────────────────────────────────────┤
│ Query                                                                        │
│ [ red running shoes________________________________________ ] [Run preview]  │
│                                                                              │
│ Locale [uk ▼]   Scope [Global ▼]   Sort [Relevance ▼]   [More conditions]   │
│ Configuration [Active revision 41 ▼]                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│ Normalized query: red running shoes                                          │
│ 126 results   [Primary match]   Config r41   Index schema v2                 │
│ Synonym “running shoes ↔ sneakers ↔ кросівки” applied                        │
├──────────────────────────────────────────────────────────────────────────────┤
│ #  Product                         Availability       Why this result         │
│ 1  [img] Red Runner Pro            In stock           Matched product title  │
│                                                       Product boost          │
│ 2  [img] Urban Sneakers            In stock           Matched synonym        │
│                                                       Matched variant title  │
│ 3  [img] Runner Classic            Out of stock       Matched product title  │
│                                                       Placed last            │
│                                                               [Next page →] │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Create synonym from query] [Create product boost]                           │
└──────────────────────────────────────────────────────────────────────────────┘
```

Scope control:

```text
Global
Category   [Choose category…]
Collection [Choose collection…]  # only when capability is READY
```

Fuzzy result:

```text
Normalized query: snikers
18 results   [Fuzzy fallback applied]
No normal token match returned a visible product. Edit distance 1 was used.
The entered query was not corrected or replaced.
```

No results:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ No results for “...” in Ukrainian                                            │
│ Primary and allowed fuzzy fallback returned no visible products.             │
│ 38 products are missing Ukrainian localized title data.                      │
│                                                                              │
│ [Create synonym group] [Create product boost] [Change locale]                │
└──────────────────────────────────────────────────────────────────────────────┘
```

Pending configuration selection is visually distinct:

```text
Warning: Previewing saved revision 42. Storefront still uses revision 41.
```

Preview actions prefill query/locale. Boost action can preselect a product from a
result row or open the product picker. Для `Bundle` действие boost в MVP скрыто:
Product boosts принимают только Catalog `Product`, хотя обычный text search может
возвращать mixed `Listing` results.

### Synonyms list

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Synonyms                                                   [Add synonym group]│
├──────────────────────────────────────────────────────────────────────────────┤
│ [Search by group name or value…] [Locale: All ▼] [State: All ▼] [Apply: All]│
├───────────────────────┬──────────────────────────┬────────┬────────┬──────────┤
│ Group                 │ Values                   │ Locale │ State  │ Apply    │
├───────────────────────┼──────────────────────────┼────────┼────────┼──────────┤
│ Footwear              │ кросівки · кеди · ...   │ uk     │ Active │ Applied  │
│ Laptop sleeves        │ sleeve · case · чохол   │ en     │ Active │ Pending  │
│ Old terminology       │ ...                      │ uk     │ Off    │ Applied  │
└───────────────────────┴──────────────────────────┴────────┴────────┴──────────┘
│ Updated by Alex, 11 Jul 2026                                      row […]    │
└──────────────────────────────────────────────────────────────────────────────┘
```

Row actions:

```text
Edit
Open in Preview
Duplicate
Deactivate / Activate
Delete
```

Delete требует confirmation. `FAILED` row показывает safe error tooltip и
`Retry apply`; inactive row остаётся editable.

### Synonym group modal

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Add synonym group                                              [×]  │
├──────────────────────────────────────────────────────────────────────┤
│ Internal name                                                       │
│ [ Footwear terminology__________________________________________ ]  │
│ Used only in Admin.                                                 │
│                                                                      │
│ Locale [Ukrainian (uk) ▼]                                           │
│                                                                      │
│ Equivalent words or phrases                                         │
│ [кросівки____________________________] [Remove]                      │
│ [кеди________________________________] [Remove]                      │
│ [running shoes_______________________] [Remove]                      │
│ [+ Add value]                                                       │
│                                                                      │
│ [✓] Active                                                          │
│ Typos belong to typo tolerance, not synonym groups.                 │
├──────────────────────────────────────────────────────────────────────┤
│                                    [Cancel] [Save] [Save & Preview] │
└──────────────────────────────────────────────────────────────────────┘
```

Inline validation отмечает empty/duplicate/conflicting value именно у строки:

```text
“кеди” is already used by active group “Casual shoes” in Ukrainian.
```

`Save & Preview` сначала сохраняет, затем открывает Preview в
`SAVED_PENDING` mode с первой phrase; оно не обходит explicit save.

### Product boosts list

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Product boosts                                                [Add boost]    │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Search phrases/products…] [Locale: All ▼] [State: All ▼] [Apply: All ▼]   │
├──────────────────────────┬────────────────────────┬────────┬────────┬─────────┤
│ Exact search phrases     │ Products               │ Locale │ State  │ Apply   │
├──────────────────────────┼────────────────────────┼────────┼────────┼─────────┤
│ running shoes · runners  │ [img] Runner Pro +2    │ en     │ Active │ Applied │
│ червона сукня            │ [img] Red Dress        │ uk     │ Active │ Failed  │
└──────────────────────────┴────────────────────────┴────────┴────────┴─────────┘
```

Нет колонки numeric strength: rule даёт fixed clear priority только в relevance
sort. Missing/deleted target отображается warning chip `Product unavailable` и
не работает в storefront.

### Product boost modal

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Add product boost                                               [×] │
├──────────────────────────────────────────────────────────────────────┤
│ Locale [English (en) ▼]                                             │
│                                                                      │
│ Exact search phrases                                                 │
│ [running shoes________________________] [Remove]                     │
│ [runners______________________________] [Remove]                     │
│ [+ Add phrase]                                                       │
│                                                                      │
│ Products                                                             │
│ [img] Runner Pro                                          [Remove]  │
│ [img] Urban Sneaker                                      [Remove]  │
│ [+ Select products] -> existing ProductPickerModal                    │
│                                                                      │
│ [✓] Active                                                          │
│ Selected products become curated results for these exact phrases.   │
│ Scope, visibility and out-of-stock rules still apply.                │
├──────────────────────────────────────────────────────────────────────┤
│                                    [Cancel] [Save] [Save & Preview] │
└──────────────────────────────────────────────────────────────────────┘
```

### Settings

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Search settings                                                              │
│ Changes require Save and become active after application succeeds.           │
│ Applies to all locales. Synonyms and boosts remain locale-specific.           │
├──────────────────────────────────────────────────────────────────────────────┤
│ SEARCHABLE FIELDS                                                            │
│                                                                              │
│ Product title       Main product name                         [On · locked]  │
│ Variant title       Localized variant names                   [ On ]          │
│ SKU                 Exact and prefix matching                 [ On ]          │
│ Barcode             Exact and prefix matching          [Not indexed yet]    │
│ Vendor              Vendor/brand name                         [ On ]          │
│ Category name       Localized category names                  [ On ]          │
├──────────────────────────────────────────────────────────────────────────────┤
│ TYPO TOLERANCE                                                               │
│ [ On ] Run fuzzy edit-distance-1 only when normal search has no results.     │
│       Query text is never automatically corrected.                           │
├──────────────────────────────────────────────────────────────────────────────┤
│ OUT-OF-STOCK PRODUCTS                                                        │
│ ( ) Show       Keep normal relevance order                                   │
│ (●) Place last Show after available products                                 │
│ ( ) Hide       Exclude from search results                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│ Last changed by Alex, 11 Jul 2026 · Applied revision 41                      │
│                                                     [Preview] [Save changes] │
└──────────────────────────────────────────────────────────────────────────────┘
```

Unsaved changes:

```text
● Unsaved changes                         [Discard] [Save changes]
```

Route leave/browser close вызывает guard. Product title toggle disabled с
explanation. `UNAVAILABLE` capability не рендерится как working switch.

### Analytics

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Search analytics                         [Locale: All ▼] [Last 30 days ▼]    │
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌───────────┐ ┌───────────────┐ ┌──────────┐ ┌───────────────┐              │
│ │ Searches  │ │ Unique queries│ │ CTR      │ │ Purchase rate │              │
│ │ 24,310    │ │ 3,482         │ │ 31.2%    │ │ 6.4%          │              │
│ └───────────┘ └───────────────┘ └──────────┘ └───────────────┘              │
│ CTR is mature through 10:30 today; purchase rate through 4 Jul, 10:30.      │
├──────────────────────────────────────────────────────────────────────────────┤
│ [All] [No results] [No clicks] [Fuzzy] [Reformulated] [Worklist]            │
│ [Search query…] [Review: Open ▼]                                             │
├────────────────┬────────┬─────────┬────────┬──────────┬───────────┬──────────┤
│ Query / locale │Searches│ Avg res │ Clicks │ Purchases│ Last      │ Actions  │
├────────────────┼────────┼─────────┼────────┼──────────┼───────────┼──────────┤
│ snikers · en   │ 184    │ 0.0     │ 0      │ 0        │ 10:44     │ […]      │
│ red dress · en │ 126    │ 42.3    │ 39     │ 7        │ 10:42     │ […]      │
└────────────────┴────────┴─────────┴────────┴──────────┴───────────┴──────────┘
│                                                               [Next page →] │
└──────────────────────────────────────────────────────────────────────────────┘
```

Actions:

```text
Open in Preview
Create synonym group
Create product boost
Mark Resolved
Mark Ignored
Reopen
```

Review modal позволяет optional note. Status меняет только worklist annotation,
не analytics history.

### Index status drawer

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Search index details                                            [×] │
├──────────────────────────────────────────────────────────────────────┤
│ Status        Failed                                                 │
│ Serving       Available                                               │
│ Schema        v2 · pg_search compatible                              │
│ Pending       28 products · 3 failed after retries                   │
│ Initial sync  Completed 10 Jul 2026, 09:15                           │
│ Last success  11 Jul 2026, 10:42 · product update                   │
│ Last attempt  11 Jul 2026, 11:03                                    │
│                                                                      │
│ Locale     Expected    Indexed    Localized title    Missing         │
│ uk         10,012      9,984      9,602              382             │
│ en         10,012      9,770      9,120              650             │
│ ru         10,012      9,801      9,230              571             │
├──────────────────────────────────────────────────────────────────────┤
│                                                               [Close]│
└──────────────────────────────────────────────────────────────────────┘
```

Failed drawer показывает public error отдельно от serving state. Stack trace и
SQL отсутствуют.

### Loading/error/empty states

Все страницы имеют явные состояния:

- initial loading — skeleton, старые Apollo data не очищаются при background
  refetch;
- transport error — `Alert` с `Retry`, сохранённые rows не маскируются пустым
  state;
- empty list — explanation + primary create action;
- mutation validation — field-level errors;
- unexpected mutation error — notification + form draft сохраняется;
- apply pending/failure — отдельный status, не success toast-only;
- stale optimistic version — form предлагает reload, не перезаписывает чужие
  изменения;
- missing capability — disabled/hidden control с понятным explanation;
- destructive delete — confirmation.

На mobile data tables превращаются в cards с actions menu. Preview filter bar и
Settings sections складываются вертикально; primary save action остаётся sticky.

## Implementation phases

Каждая phase оставляет систему в working state и не включает Admin control до
готовности соответствующего backend capability.

### Phase 0. Correctness baseline и engine compatibility

Backend:

1. Зафиксировать `pg_search 0.24.1` compatibility fixtures для compound match,
   arrays, phrase, exact/prefix identifiers, fuzzy distance 1, score и
   обязательный tenant predicate.
2. Ввести `SearchQueryNormalizer` и explicit query length/locale validation.
3. Отделить navigation scope от text predicate во внутренних types:
   `GLOBAL/CATEGORY/(future COLLECTION)` + optional query.
4. Исправить `CATEGORY + query`:
   - search bitmap входит в `productMatches` для page, total, facet и virtual
     facet branches;
   - explicit business sort не отключает text filter.
5. Удалить/свернуть duplicate unused SQL methods из
   `StorefrontProductTitleSearchQueryRepository`.
6. Убрать search-title fallback на handle/UUID.
7. Добавить runtime health diagnostics extension/version/index presence.

Acceptance:

- category search page/total/facets описывают один result set;
- price/name sort меняет только order, а не отменяет query;
- empty/missing localized title не подменяется другой строкой;
- special characters parameterized и не меняют query AST;
- query store A не возвращает documents store B;
- существующий global title search сохраняет deterministic cursor semantics.

### Phase 1. Upstream search content contract

Catalog/broker-types:

1. Повысить Catalog snapshot version.
2. Добавить localized variant titles, SKU, barcode, vendor name и localized
   category names.
3. Добавить canonical barcode storage/API; до этого capability unavailable.
4. Добавить selection/resolver/loaders без N+1 для batch product hydration.
5. Публиковать/классифицировать reference rename и locale change events.
6. Удалить неиспользуемую Catalog Drizzle-модель
   `repositories/models/productTitleBm25SearchIndex.ts`: physical search index
   принадлежит только Listing.

Listing:

1. Добавить `ListingSearchContentSnapshot` в normalized domain snapshot.
2. Детерминированно normalize/deduplicate/sort arrays.
3. Добавить fan-out workflows для vendor/category localized rename.
4. Определить initial `SearchFieldRegistry` и schema version.

Acceptance:

- один hydrated product содержит одинаковый deterministic search snapshot при
  single и batch fetch;
- отсутствующая locale даёт empty localized fields, identifiers сохраняются;
- vendor/category rename обновляет все affected products;
- deleted variant identifiers/title исчезают из следующего write model;
- capabilities отражают реальную готовность каждого source.

### Phase 2. Multi-field BM25 documents и incremental state

Backend:

1. Заменить title-only initial DDL на одну multi-field
   `listing.product_search_document` и BM25 index.
2. Добавить Drizzle model/repository и typed document contract.
3. Сохранять `search_id` при upsert и проверять source revision/sequence
   monotonicity.
4. Добавить index state/locale/item tables.
5. Изменить existing listing item writer: listing rows, search documents и
   applied item state обновляются в одной transaction.
6. Реализовать initial sync тем же bounded item workflow.
7. Реализовать `SearchCapabilities` из document schema/source readiness.

Acceptance:

- enabled fields физически searchable в document index;
- SKU/barcode exact и prefix не проходят fuzzy/token word semantics;
- tenant predicate исключает documents другого store;
- product update atomically меняет listing и search document;
- unavailable index/initial sync даёт explicit status, не `ILIKE` fallback.

### Phase 3. Configuration revisions, Settings и canonical Preview

Backend:

1. Создать `search_configuration_state`, `search_settings`, immutable desired
   revisions, apply job/outbox, runtime revisions и audit.
2. Реализовать DBOS `SearchConfigurationApplyWorkflow`, revision CAS,
   supersede/recovery flow и cache-by-revision.
3. Реализовать field toggles, typo setting, out-of-stock policy.
4. Добавить exact-first/final-zero fuzzy execution mode.
5. Добавить versioned cursor.
6. Реализовать Preview query и bounded diagnostics.

Admin:

1. Зарегистрировать Search module/shell/routes.
2. Реализовать Settings с unsaved guard и application banner.
3. Реализовать Preview с locale/scope/sort, reason codes и quick actions.
4. Вынести reusable listing result grid/pagination из category preview.

Acceptance:

- storefront request pin-ит одну config/schema/mode для всех branches;
- Settings save показывает Pending до activation;
- failed apply сохраняет previous storefront behavior;
- fuzzy запускается только после final zero и не смешивается с primary;
- Preview active mode совпадает со storefront, не пишет analytics и не показывает
  score/SQL/corrected query;
- `SHOW/PLACE_LAST/HIDE` работают для mixed availability и не нарушают variant
  semantics.

### Phase 4. Synonyms и Product boosts

Backend:

1. Создать authoring/claim tables, repositories, Scripts и audit.
2. Добавить normalized conflicts и optimistic concurrency.
3. Компилировать locale synonym trie в runtime revision.
4. Добавить longest phrase expansion в query plan.
5. Компилировать exact original phrase boost map.
6. Добавить boost flag в relevance collector/cursor и diagnostics.

Admin:

1. Synonyms list, filters, modal, activate/deactivate/delete.
2. Product boosts list/modal с existing Product Picker.
3. `Save & Preview`, quick create from Overview/Analytics/Preview.
4. Per-row application/audit states.

Acceptance:

- active normalized synonym value уникален в locale;
- phrases двунаправленные и не затрагивают SKU/barcode;
- fuzzy не применяется ко всем synonym alternatives;
- boost добавляет curated candidate для exact phrase, но не обходит
  scope/visibility/filters/OOS;
- synonym phrase не активирует boost другой phrase;
- explicit business sort не активирует boost ranking;
- delete остаётся pending до application и не создаёт ложное Applied state.

### Phase 5. Index Status и Overview

Backend:

1. Добавить index status query с initial-sync state, per-locale coverage,
   pending/failed counters и sanitized error.
2. Связать status с durable `search_index_item_state` и extension/index health.
3. Добавить периодическую сверку counters с `product_listing_index`.
4. Добавить Overview composition без analytics dependency.

Admin:

1. Index status card/drawer.
2. Overview shell с index state и empty analytics placeholders.

Acceptance:

- initial sync и pending counts переживают process restart;
- successful incremental item уменьшает pending count;
- exhausted retry показывает `FAILED` и safe product-level aggregate error;
- более новое событие может восстановить failed item;
- stale event/snapshot не воскрешает удалённый product.

### Phase 6. Analytics facts и cross-service attribution

Listing/storefront:

1. Добавить/зарегистрировать `graphql-storefront` schema, server, context
   middleware, generated types и federation composition.
2. Добавить first-party anonymous search session/consent contract.
3. Persist один idempotent search request по `clientSearchId` на initial search,
   не на internal attempts/retries/pages.
4. Возвращать signed per-edge attribution token.
5. Добавить session-bound idempotent click tracking.

Checkout/Orders/Events:

1. Добавить typed line-level search attribution.
2. Переносить attribution checkout line -> order line.
3. Публиковать durable `searchPurchaseAttributed` после order creation через
   transactional outbox/DBOS-equivalent.
4. Listing batch handler сохраняет deduped purchase facts.

Analytics backend/Admin:

1. Daily rollup и late-event recomputation.
2. Overview metrics/top issues.
3. Analytics query connection/filters.
4. No-result/no-click worklist и review mutations.
5. Analytics page и quick actions.

Acceptance:

- Preview не влияет на search count;
- pagination не считается новым search;
- duplicate click/order event не удваивает metric;
- CTR и purchase rate считаются по distinct search requests с отдельными
  30-minute/7-day maturity windows;
- одна order line относится только к одному canonical last click;
- review state не удаляет history;
- resolved issue reopen policy и ignored policy работают предсказуемо.

### Phase 7. Hardening и rollout

1. Добавить fixture corpus `uk/en/ru` с short words, Cyrillic, mixed identifiers,
   multiword synonyms, OOS/mixed variants и large candidate sets.
2. Снять performance matrix для global/category, filters, exact zero, fuzzy,
   boosts, arrays и Preview diagnostics.
3. Зафиксировать AST limits/timeouts и autovacuum/VACUUM policy для BM25 tables.
4. Измерить cross-tenant IDF effect shared corpus и задокументировать ranking
   trade-off без изменения membership isolation.
5. Добавить retention/privacy cleanup и aggregate recomputation tooling.
6. Добавить failure injection для apply/incremental indexing/analytics delivery.
7. Включать UI/API по capabilities/feature flag только после initial sync.
8. Удалить старые title-only symbols/docs, которые больше не отражают runtime.

## Основные code touchpoints

| Scope | Файлы/пакеты |
|---|---|
| Shared IDs/types | `packages/shared-graphql-guid`, `packages/broker-types` |
| Catalog snapshot | `services/catalog/src/resolvers/service/*SnapshotResolver.ts`, listing snapshot selection |
| Listing DDL/models | `services/listing/migrations/domains/0100_listing_index/`, `repositories/models/listingIndex.ts` |
| Listing write path | `ListingBuildSyncWriteModelScript`, `ListingWriteIndexActionScript`, batch workflow steps |
| Storefront read path | `repositories/storefront/sql/*`, `StorefrontListingQueryRepository.ts`, cursor/types |
| Storefront GraphQL/tracking | new `services/listing/src/api/graphql-storefront/`, storefront context/resolvers/codegen |
| Admin GraphQL | `services/listing/src/api/graphql-admin/schema/`, `resolvers/admin/` |
| Events transport | `packages/events`, `services/events` |
| Checkout attribution | checkout storefront line input/domain state/snapshot |
| Orders attribution | order line model/create projection + durable event publication |
| Admin navigation/UI | `admin/src/domains/discovery/search/`, `admin/src/domains/modals.tsx` |
| Admin shared picker/preview | `admin/src/shared/components/entity-picker-modal/`, category listing preview components |

## Acceptance scenario matrix

### Matching, scopes и counts

| Scenario | Expected |
|---|---|
| Global `query`, default sort | Full search candidate set, relevance order |
| Category + query | Page/total/facets ограничены одной category + query |
| Category + query + price sort | Query остаётся predicate, price меняет только order |
| Query + variant option + price | Predicates пересекаются в same variant space |
| Selected facet target isolation | Search query никогда не исключается |
| Draft item присутствует в category/boost/BM25 | Обязательный `publishedUniverse` исключает его |
| Empty query in search-only API | Field-level validation error |
| Collection capability unavailable | Selector скрыт, backend не имитирует collection scope |

### Search fields и locale

| Scenario | Expected |
|---|---|
| Disabled vendor field | Vendor text не создаёт candidates |
| Product title toggle attempt | Save rejected/locked |
| Exact SKU | Identifier tier, no synonyms/fuzzy |
| SKU prefix | Prefix tier, deterministic order |
| Barcode field unavailable | Нет working toggle/ignored configuration |
| Missing `uk` title, present `en` | `uk` text search не использует `en`; Preview показывает missing coverage |
| Missing title + exact SKU | SKU может найти product в selected locale, diagnostics отмечает identifier |

### Synonyms, fuzzy и boosts

| Scenario | Expected |
|---|---|
| Search по любому active group value | Находит documents других group values |
| Multiword synonym | Phrase является одним semantic unit |
| Same normalized active value in two groups | Save/activation rejected |
| Primary result exists | Fuzzy pass не запускается |
| Primary raw hit отфильтрован category/OOS Hide | Final zero разрешает fuzzy fallback |
| Query < 3 code points | Fuzzy не запускается |
| Fuzzy result | Original query остаётся неизменным, только flag/reason |
| Boost target не matched text/identifier, но rule exact phrase | Product становится curated candidate и проходит canonical filters |
| Boost target без locale BM25 document | Разрешается через listing index, затем проходит publication/scope/filters |
| Boost target hidden/deleted | Product не появляется |
| Boosted unavailable + `PLACE_LAST` | Ниже available results |
| Boost phrase совпала только через synonym | Boost не активируется |
| Explicit price sort | Boost ranking inactive |

### Application/index state

| Scenario | Expected |
|---|---|
| Settings save | Mutation success + `PENDING`, storefront old revision |
| Apply success | Atomic active revision switch + `APPLIED` |
| Apply failure | `FAILED`, old active revision serving |
| Revision N compiles after N+1 save | N `SUPERSEDED`; CAS не активирует stale behavior, N+1 job остаётся durable |
| Initial sync incomplete | `UPDATING`; coverage и pending count видны |
| Incremental item retries exhausted | Index `FAILED`, уже синхронизированные documents доступны, failed count виден |
| New event after item failure | Item снова `PENDING` и может перейти в `APPLIED` |
| Stale product event | Monotonic sequence делает его no-op |
| Cursor after retention | `SEARCH_CURSOR_EXPIRED` |

### Analytics

| Scenario | Expected |
|---|---|
| Admin Preview | No `search_request` |
| Storefront first page | One request, opaque edge tokens |
| Retried storefront first page | Same `clientSearchId` returns same request; search count unchanged |
| Storefront next page | Same search identity, no extra search count |
| Retried click | Deduped by client event ID |
| Two lines from two searches | Line-level attribution remains distinct |
| Duplicate order event | No duplicate purchase fact |
| Multiple historical clicks for one order line | Canonical last valid click creates exactly one attribution fact |
| Fresh result without click | Provisional, not mature no-click issue |
| Mark work item Resolved/Ignored | Facts/rollups unchanged |

## Readiness/Definition of Done

Search Admin must-have готов, когда одновременно выполнено следующее:

- все declared searchable fields имеют real capability, включая barcode;
- storefront и Preview используют один canonical executor;
- storefront public schema/session context и click mutation реально
  зарегистрированы, а не существуют только как internal repository types;
- global/category query membership одинаков для page/total/facets и всех sorts;
- synonyms/fuzzy/boost/OOS interaction соответствует таблице в этом документе;
- config save/application и incremental index synchronization имеют раздельные
  state machines;
- config apply восстанавливается из durable revision job и не активирует stale
  revision при concurrent save;
- Overview показывает честный Ready/Updating/Failed и per-locale coverage;
- Preview возвращает понятные reasons без score/SQL/corrected query;
- analytics связывает search -> click -> order line и имеет documented metric
  definitions;
- worklist annotations не удаляют history;
- Admin routes находятся в `Discovery -> Search` сразу после `Facets`;
- все UI pages имеют loading/error/empty/pending/failed/unsaved states;
- generated GraphQL types являются единственным API output contract в Admin;
- engine compatibility/performance/privacy decisions подтверждены и
  задокументированы.

## Риски, которые нельзя скрыть реализацией

1. В Catalog пока нет canonical barcode source.
2. Variant titles/SKU/vendor/category labels ещё не входят в listing snapshot.
3. Collection scope отсутствует в canonical listing bitmap contract.
4. Compound/phrase/prefix APIs нужно проверить именно на pinned
   `pg_search 0.24.1`.
5. Общий BM25 corpus может создавать cross-tenant влияние на relative IDF/score,
   хотя `store_id` обязан полностью изолировать membership/data.
6. Incremental indexing требует monotonic revision/tombstone protection.
7. Purchase rate требует изменения Checkout и Orders, а не только listing/Admin.
8. Stable anonymous session требует storefront privacy/consent decision.
9. Любой hidden candidate cap ломает точность total/facets и запрещён без нового
   explicit API contract.
10. `HIDE` должен использовать canonical availability membership; derived sort
    projection недостаточна как source of truth.
