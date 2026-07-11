# План реализации Search в Listing service

## Статус и назначение

Статус: `proposal`.

Реализация Catalog snapshot, broker-types и Admin UI не входит в этот план.
Они описаны только как внешние зависимости Listing. Semantic/vector search,
spellcheck, ML-reranking, персонализация, sponsored results и отдельное управление
listing facets также остаются вне scope.

План рассчитан на clean DB: stage/production данных и пользователей нет. Поэтому
начальный title-only DDL можно заменить целевой схемой без dual-read, dual-write
и legacy conversion. Changeset-файлы вручную не редактируются.

## Целевой результат

`listing` становится единственным владельцем runtime search:

- `pg_search` выполняет text/identifier matching и вычисляет BM25 score;
- canonical listing bitmap pipeline остаётся источником истины для publication,
  navigation scope, same-variant filters, prices, availability, totals и facets;
- listing вызываeт `SearchExecutionService`;
- settings, synonyms и boosts применяются из immutable versioned runtime revision;
- fuzzy выполняется отдельным полным проходом только после final zero result;
- search documents обновляются существующим event-driven listing workflow;
- backend публикует Admin GraphQL для управления, Preview и status;
- все ветки одного request используют pinned configuration revision и index
  schema version; все ветки одной search attempt используют один execution mode.

## Обязательные инварианты

1. Tenant всегда определяется через `ServiceContext.store.id`; `storeId` не
   принимается из public input.
2. Locale обязательна и входит в document identity, query plan, cursor и
   configuration. Cross-locale fallback отсутствует.
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
10. `HIDE` компилируется как canonical availability predicate в variant space до
    projection; `PLACE_LAST` использует только derived product ordering bucket.
    Оба режима имеют приоритет над boost.
11. Pending/failed authoring revision не влияет на listing до atomic
    activation.
12. Listing не раскрывает SQL, AST, internal weights или numeric BM25 score.
13. Search documents подчиняются canonical `listing_index_item_state`: stale и
    noop action не изменяют physical rows, а stale Catalog event/snapshot не
    может откатить latest item state или воскресить удалённый document.

## Целевая схема выполнения

```text
Listing
  -> normalize locale/query/input
  -> resolve one pinned SearchRequestContext with runtime revision and index schema
  -> build safe SearchQueryPlan
  -> derive PRIMARY SearchAttemptContext from the pinned request context
  -> compile pg_search primary candidate relation
  -> intersect with canonical listing scope/filter pipeline
  -> calculate PRIMARY page + total + facets from one productMatches contract
  -> when final primary totalCount = 0 and fuzzy is allowed:
       derive FUZZY SearchAttemptContext from the same pinned request context
       rerun the whole bundle with FUZZY plan
  -> apply relevance/business ordering and OOS policy
  -> return Listing
```

## 1. Canonical search execution

### 1.1. Нормализация

Создать единый `SearchQueryNormalizer`, используемый Listing,
synonyms и boosts:

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

### 1.2. Request и attempt contexts

До запуска параллельных listing branches один раз разрешать immutable request
context. Он содержит состояние, которое запрещено повторно разрешать между
`PRIMARY` и `FUZZY` attempts:

```ts
interface SearchRequestContext {
  readonly storeId: string;
  readonly locale: string;
  readonly normalizedQuery: NormalizedSearchQuery;
  readonly configurationRevision: number;
  readonly runtimeConfigurationChecksum: string;
  readonly runtimeConfiguration: CompiledSearchRuntimeConfiguration;
  readonly compatibility: SearchCompatibilityTuple;
  readonly indexSchemaVersion: number;
  readonly diagnosticsMode: "NONE" | "PREVIEW";
}

interface SearchAttemptContext {
  readonly request: SearchRequestContext;
  readonly mode: "PRIMARY" | "FUZZY";
}
```

Для request без cursor executor всегда создаёт `PRIMARY` attempt. Если final
primary `totalCount = 0` и fuzzy разрешён, он создаёт новый `FUZZY` attempt,
ссылающийся на тот же `SearchRequestContext`. Continuation request создаёт только
attempt того mode, который записан в cursor. Runtime configuration, checksum и
index schema между attempts повторно не читаются. Page, total и все facets внутри
одной attempt обязаны получать один и тот же `SearchAttemptContext`; смешивание
modes внутри result bundle запрещено.

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
  | { kind: "fuzzyToken"; token: string; fields: SearchTextField[]; distance: 1 }
  | { kind: "all"; clauses: SearchClause[]; requireSameField: boolean }
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

Верхнеуровневая boolean-семантика фиксирована и не определяется compiler-ом:

```text
unitMatch[i] = OR(
  requiredUnits[i].textAlternatives,
  requiredUnits[i].originalIdentifierAlternatives
)

semanticMatch = AND(unitMatch[0], unitMatch[1], ..., unitMatch[n])

wholeQueryIdentifierMatch = OR(wholeQueryIdentifierAlternatives)

documentMatch = OR(semanticMatch, wholeQueryIdentifierMatch)
```

`requiredUnits` после нормализации обязан быть непустым, и каждый `unitMatch`
обязан содержать хотя бы одну alternative. Пустой
`wholeQueryIdentifierAlternatives` компилируется как `FALSE`, а не удаляет
`semanticMatch`. Таким образом, все semantic units обязательны (`AND`), внутри
каждого unit text, synonym и identifier alternatives объединяются через `OR`, а
exact/prefix совпадение полного исходного SKU может самостоятельно удовлетворить
весь `documentMatch`. Synonym clause раскрывается только внутри alternative того
unit, из которого она была построена, и не создаёт новую top-level ветку.

Initial prefix threshold для SKU — 3 code points; короче допускается только
exact. Identifier clauses строятся только из original normalized query/tokens:
synonym expansion не создаёт identifier alternatives.

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

variantTermCandidates = system.state=indexable
  & selected universal variant term groups
  & criterion.availability=available when HIDE

variantCandidates = variantTermCandidates & numeric price candidates

productMatches = productBase
  & projectDistinctProducts(variantCandidates) when variant witness exists
```

`HIDE` всегда создаёт variant witness и пересекается с OPTION, future criteria и
price до projection. Поэтому product не проходит фильтрацию, если один variant
available, а другой соответствует остальным variant predicates. `SHOW` и
`PLACE_LAST` не добавляют availability predicate в membership; `PLACE_LAST`
использует derived product availability projection только как ordering key.

`GLOBAL + query` заменяет внутренний legacy `SEARCH` scope.
`CATEGORY + optional query` валиден всегда. `RELEVANCE` требует non-empty query;
business sort меняет ordering, но не membership.

### 1.7. Согласованность SQL branches

Request-level snapshot consistency между page, `totalCount`, configured facets и
virtual facets не требуется. Branches могут выполняться параллельно отдельными
statements в текущей `READ COMMITTED` semantics без общей transaction и без
экспортированного PostgreSQL snapshot.

Один `productMatches` означает общий deterministic SQL compilation contract:
каждая branch получает одинаковые normalized input, `SearchRequestContext`,
`SearchAttemptContext`, scope и filter plan и компилирует одинаковую membership
algebra. Это не означает чтение одной физической версии Listing index.

При concurrent indexing между statements допустимо, что page, `totalCount` и
facet counts отражают разные committed состояния. Executor не повторяет branches,
не сравнивает их результаты и не открывает координирующую read transaction.
Eventual consistency существующего Listing index является частью Listing
contract.

### 1.8. Fuzzy fallback

1. Для первой страницы выполнить полный primary bundle.
2. При `totalCount > 0` вернуть primary.
3. При final zero, enabled typo tolerance и query длиной не менее 3 code points
   построить fuzzy plan.
4. Повторить весь listing bundle в `FUZZY` mode.
5. Вернуть только fuzzy result, не объединяя candidate sets.
6. Для continuation request не выбирать mode заново: `PRIMARY` cursor выполняет
   только primary bundle, `FUZZY` cursor — только fuzzy bundle на retained
   revision из cursor.

Distance фиксирован на `1`; AND semantics сохраняется; fuzzy применяется только
к original text alternatives. SKU и synonym alternatives не fuzzy-expand.

### 1.9. Synonyms

Runtime revision хранит locale-scoped token trie. Expander применяет
longest-match-left-to-right. Multi-token synonym становится одним semantic unit;
phrase должна совпасть целиком в одном field. Группы двунаправленные. Synonyms не
меняют identifier clauses и не активируют boosts другой phrase.

### 1.10. Boosts и ordering

Boost lookup выполняется только по исходному `lookupKey`. Default relevance tuple:

```text
availability bucket DESC  # только PLACE_LAST
identifier priority DESC
boosted DESC
BM25 score DESC
product_id ASC
```

При `SHOW` availability key отсутствует. При `HIDE` canonical
`criterion.availability=available` пересекается с остальными variant predicates
до projection в product space. При `PLACE_LAST` derived product availability
projection используется только для ordering и не становится membership source.
При business sort boost сохраняет membership, но не переопределяет выбранный
ordering.

### 1.11. Cursor

Повысить cursor version и включить normalized request hash, locale, currency,
scope, filters, sort, configuration revision/checksum, index schema version,
mode, conditional availability bucket, identifier priority, boosted flag,
relevance/business keys, ordinal, product tie-breaker, issued-at и expiry.

Отсутствующая retained revision возвращает `SEARCH_CURSOR_EXPIRED`. Между HTTP
requests сохраняется существующая eventual-consistency semantics product index;
snapshot search index не обещается.

### 1.12. Listing diagnostics

Listing вызывает тот же executor с `diagnosticsMode: "PREVIEW"` в pinned request
context. Дополнительный
bounded query выполняется только по product IDs текущей page и возвращает reason
codes: product/variant title, SKU exact/prefix, vendor, category, synonym, boost,
fuzzy fallback и OOS placed last. Numeric score, SQL и AST не публикуются.

### 1.13. Нормативный алгоритм `listing + query`

Этот раздел является execution contract. Предыдущие подразделы определяют
компоненты, а приведённый ниже алгоритм фиксирует их порядок, входы, результаты и
поведение на пустых множествах. Физическая форма SQL/CTE может меняться между
global и segmented bitmap implementations, но observable membership, ranking,
counts и cursor tuple должны оставаться эквивалентными.

#### 1.13.1. Начальные limits и versioned compatibility tuple

Начальные limits являются code constants, применяются до SQL compilation и не
могут изменяться Admin settings:

| Limit | Значение |
|---|---:|
| Нормализованный query | 128 Unicode code points |
| Original query tokens | 16 |
| Tokens в одном synonym value | 8 |
| Раскрытых synonym groups в request | 8 |
| Alternatives в одном semantic unit | 24 |
| Всего leaf clauses в plan | 256 |
| SKU prefix minimum | 3 Unicode code points |
| Fuzzy minimum query length | 3 Unicode code points |
| Fuzzy edit distance | 1 |

Превышение limit возвращает validation error до обращения к `pg_search`;
truncation query, tokens, synonym alternatives или AST запрещён. Изменение
normalization/tokenization либо смысла clause требует новой версии
compatibility tuple:

```ts
interface SearchCompatibilityTuple {
  readonly pgSearchVersion: string;
  readonly documentSchemaVersion: number;
  readonly compilerVersion: number;
  readonly tokenizerVersion: number;
  readonly normalizerVersion: number;
}
```

Runtime revision с tuple, не поддерживаемым текущим process, не обслуживается и
возвращает `SEARCH_INDEX_UNAVAILABLE`.

#### 1.13.2. Routing и нормализация request

Public Listing input сначала нормализуется независимо от search:

1. Получить `storeId` только из `ServiceContext`; проверить locale, currency,
   scope, filters, sort, page size и cursor shape.
2. Отделить navigation scope (`GLOBAL` или `CATEGORY`) от optional `query`.
   Внутренний legacy scope `SEARCH` после migration не создаётся.
3. Отсутствующий `query`, `null` или строка, ставшая пустой после normalization,
   означает обычный Listing без search predicate. Для него `RELEVANCE` является
   validation error.
4. Для non-empty query удалить Unicode control characters, выполнить NFKC,
   trim и collapse Unicode whitespace. Если результат длиннее 128 code points,
   вернуть validation error, не обрезать строку.
5. Построить `lookupKey` через pinned ICU locale-aware full case folding. Отдельно
   построить identifier form из исходного NFKC/trim/case-fold значения: whitespace
   внутри SKU и значимые separators не удаляются и не заменяются.
6. Tokenize `lookupKey` tokenizer-ом из compatibility tuple. Пустой token set для
   non-empty display query является validation error. Порядок и offsets tokens
   сохраняются.
7. Вычислить query hash как SHA-256 от length-prefixed tuple
   `(storeId, locale, normalizerVersion, lookupKey)`. Простая конкатенация без
   length prefix запрещена.
8. Нормализовать filters в canonical `FilterPlan`: OR значений внутри одной
   группы, AND между группами; availability/OPTION/future criteria становятся
   variant term groups, price остаётся numeric variant predicate.

Для первой страницы executor один раз читает active configuration pointer и
index state. Для continuation request он берёт revision, checksum, index schema
и mode из cursor и загружает соответствующую retained runtime revision, даже
если она уже не active. Отсутствующая retained revision возвращает
`SEARCH_CURSOR_EXPIRED`; молча перейти на новую active revision запрещено.
После загрузки executor создаёт `SearchRequestContext`. Несовпадение checksum,
schema или compatibility tuple завершает request до запуска параллельных
branches. Все attempts и branches получают этот объект по ссылке; повторное
чтение active pointer запрещено.

#### 1.13.3. Построение PRIMARY plan

Planner обходит original tokens слева направо:

1. В текущей позиции найти в locale synonym trie самое длинное совпадение.
   Благодаря `search_synonym_claim` одно normalized value принадлежит не более
   чем одной active group. Если совпадения нет, span состоит из одного token.
2. Создать ровно один required semantic unit на span. Unit не может быть пустым.
3. Добавить original text alternative: `token` для одного token либо `phrase`
   для multi-token span. Phrase требует полного совпадения tokens в одном
   searchable field и одном array element; совпадения, распределённые по разным
   fields или разным elements одного array field, phrase не удовлетворяют.
4. При найденной synonym group добавить каждое другое normalized value группы
   как `token` или `phrase` alternative этого же unit. Synonym не создаёт новый
   top-level unit и не меняет число обязательных units.
5. Из identifier form исходного span добавить `identifierExact`. Если длина span
   не меньше трёх code points, добавить `identifierPrefix`. Эти clauses строятся
   только из original span, никогда из synonym value.
6. Из полного identifier form query независимо построить
   `wholeQueryIdentifierAlternatives`: exact всегда, prefix только от трёх code
   points. Эта ветка может самостоятельно удовлетворить весь document match.
7. Получить boost product IDs только по exact original `lookupKey + locale`.
   Synonym value, identifier normalization и исправленная fuzzy форма boost не
   активируют.
8. Проверить per-unit и total limits. После построения plan массивы сортируются
   только там, где порядок не участвует в semantics; required units всегда
   сохраняют original token order.

Результирующая semantics неизменна:

```text
unitMatch[i] = OR(original text, synonym alternatives, original identifier)
semanticMatch = AND(unitMatch[0..n])
wholeIdentifierMatch = OR(whole-query exact, whole-query prefix)
documentMatch = semanticMatch OR wholeIdentifierMatch
```

Enabled fields runtime revision ограничивают fields clause, но не могут удалить
последнюю alternative required unit. Если после применения capabilities хотя бы
один unit пуст, plan не исполняется и возвращается safe configuration error.

#### 1.13.4. Компиляция candidate relation

`PgSearchQueryCompiler` получает только typed plan, attempt context и bound
parameters. Compiler не принимает raw query string. Для каждого attempt он
строит логически следующую relation без `LIMIT`/top-K:

```text
document_candidates(
  product_id,
  match_priority,       # exact SKU=3, prefix SKU=2, text/synonym/fuzzy=1
  relevance_score
)

boost_candidates(
  product_id,
  match_priority=1,
  relevance_score=0,
  boosted=true
)

candidate_rows = document_candidates UNION ALL boost_candidates

resolved_candidates =
  candidate_rows
  JOIN product_listing_index USING (store_id, product_id)
  GROUP BY product_id, product_doc_id
  SELECT
    MAX(match_priority)                         AS identifier_priority,
    BOOL_OR(boosted)                            AS boosted,
    COALESCE(MAX(document relevance_score), 0)  AS relevance_score
```

Обязательные predicates `store_id = request.storeId` и
`locale = request.locale` входят внутрь engine query, а не только во внешний
join. `product_listing_index` на этом этапе используется для tenant-scoped
identity resolution; publication проверяется отдельно canonical bitmap pipeline.
Поскольку physical contract хранит один document на `(store, product, locale)`,
`MAX(document relevance_score)` однозначен; aggregation также защищает relation
от duplicate rows compound query и пересечения с boost candidates. `NULL`, NaN
и infinite score compiler обязан отклонить как engine error.

`searchProducts` строится как exact bitmap всех `product_doc_id` из
`resolved_candidates`. Пустая relation даёт canonical empty bitmap. Rank columns
не входят в bitmap и сохраняются в relation для page collector и cursor.

#### 1.13.5. Canonical membership compilation

Для каждого SQL branch compiler строит одну и ту же membership algebra из
immutable normalized input, request context, attempt context и query plan:

```text
publishedUniverse = bitmap(all published product_doc_id текущего store)

navigationScopeProducts =
  GLOBAL   -> publishedUniverse
  CATEGORY -> category product posting

scopeProducts = publishedUniverse & navigationScopeProducts

searchProducts = bitmap(resolved_candidates)

productBase = scopeProducts
  & searchProducts
  & AND(OR(values каждой TAG/FEATURE group))
  & OR(selected vendors)                       # если filter присутствует

variantTermGroups =
  selected OPTION/availability/future criterion groups
  + criterion.availability=available           # только для OOS HIDE

variantTermCandidates = system.state=indexable
  & AND(OR(values каждой variantTermGroup))

variantCandidates = variantTermCandidates
  & priceCandidates                             # если price filter присутствует

variantWitness =
  variantTermGroups не пусты OR price filter присутствует

productMatches =
  variantWitness
    ? productBase & projectDistinctProducts(variantCandidates)
    : productBase
```

`searchProducts` обязателен в `productBase` для любого non-empty query при любом
scope и sort. Ни business sort, ни facet target isolation не могут заменить или
удалить его. Missing posting row трактуется как empty bitmap; required group с
нулём найденных postings делает `productMatches` empty, а не исчезает из AND.

`HIDE` хранится в plan как policy predicate отдельно от пользовательского
availability filter, даже если оба компилируются в один canonical term. Поэтому
target isolation может убрать пользовательскую группу, но никогда не убирает
OOS policy. `SHOW` и `PLACE_LAST` не добавляют variant membership predicate.

Global и segmented bitmap compiler обязаны возвращать одинаковый logical
`productMatches`. В segmented implementation все операции выполняются по
segment, missing segment означает empty, total суммирует cardinality
непересекающихся product segments, а projection остаётся exact. Segment ID не
попадает в request hash или cursor.

#### 1.13.6. Выполнение result bundle

Одна search attempt запускает следующие branches параллельно отдельными
`READ COMMITTED` statements:

```text
page
totalCount
configured facets metadata + counts
virtual availability facet
virtual price facet
```

Ошибка любой обязательной branch завершает всю attempt; partial Listing не
возвращается и fuzzy после technical error не запускается.

Branch rules:

- `totalCount` — exact `rb_cardinality(productMatches)` либо сумма exact segment
  cardinalities. Candidate cap и estimate вместо результата запрещены.
- `page` — выбрать только products из `productMatches`, применить keyset seek,
  взять `first + 1`, вернуть первые `first`, а лишнюю row использовать только для
  `hasNextPage`.
- TAG/FEATURE count — удалить только target product facet group, сохранить
  search bitmap, остальные product groups и общий variant witness, затем
  пересечь target value posting и посчитать distinct products.
- OPTION/future criterion count — удалить только target user group, сохранить
  search bitmap, остальные term groups, price и OOS `HIDE`, добавить target
  value в variant space, после чего выполнить exact projection и distinct
  product count.
- Availability count — изолировать только пользовательский availability filter;
  OOS `HIDE`, если активен, остаётся policy predicate. Поэтому при `HIDE`
  unavailable count закономерно равен `0`.
- Price bounds — исключить только selected price range, сохранить search,
  product predicates и все variant term predicates; `MIN/MAX` считать по price
  rows matching variants, а не по всем variants прошедших products.

Все branch compilers получают один `MembershipPlan`. Допустимо повторно
скомпилировать эквивалентные CTE в отдельных statements; недопустимо заново
нормализовать query, разрешать config revision или менять attempt mode.

#### 1.13.7. Ordering, page и cursor

Для `RELEVANCE` ordering tuple имеет точную форму:

```text
availability_bucket DESC   # только PLACE_LAST: available=1, unavailable=0
identifier_priority DESC   # exact=3, prefix=2, text/synonym/fuzzy/boost-only=1
boosted DESC
relevance_score DESC
product_id ASC
```

При `SHOW` availability component отсутствует; при `HIDE` unavailable products
уже исключены membership. Boost-only product получает score `0`. Exact/prefix
identifier tier сильнее boost и BM25. Любое равенство полностью разрешается
`product_id ASC`.

Для business sort используются только conditional `PLACE_LAST` bucket,
business keys и существующие product/variant tie-breakers. `boosted` и
`relevance_score` не входят в business ordering. Matched-price collector выбирает
variant/price только из `variantCandidates`, соответствующих тому же
`productMatches`, и не расширяет membership.

Cursor кодирует значения полного фактического ordering tuple без округления
score, плюс request hash, locale, currency, scope/filter/sort fingerprint,
configuration revision/checksum, index schema, attempt mode, issued-at и expiry.
Decode выполняется до SQL compilation. Несовпадение любого fingerprint field
возвращает invalid cursor; отсутствие retained runtime revision —
`SEARCH_CURSOR_EXPIRED`. Seek predicate является строгим lexicographic
«после cursor» для того же tuple; offset pagination запрещена.

#### 1.13.8. Exact-first fuzzy retry

Top-level executor работает следующим образом:

```ts
async function executeSearchListing(input: NormalizedListingInput) {
  const request = await pinSearchRequestContext(input);
  const primaryPlan = buildPrimaryPlan(request);

  if (input.cursor?.mode === "FUZZY") {
    return await runFullBundle({
      request,
      attempt: { request, mode: "FUZZY" },
      plan: buildFuzzyPlan(primaryPlan),
      input,
    });
  }

  const primary = await runFullBundle({
    request,
    attempt: { request, mode: "PRIMARY" },
    plan: primaryPlan,
    input,
  });

  if (
    input.cursor?.mode === "PRIMARY" ||
    primary.totalCount > 0 ||
    !request.runtimeConfiguration.typoToleranceEnabled ||
    request.normalizedQuery.codePointLength < 3
  ) {
    return primary;
  }

  const fuzzyPlan = buildFuzzyPlan(primaryPlan);
  return await runFullBundle({
    request,
    attempt: { request, mode: "FUZZY" },
    plan: fuzzyPlan,
    input,
  });
}
```

На первой странице cursor отсутствует: executor всегда начинает с PRIMARY и
может перейти в FUZZY только по final zero. Continuation request обязан повторить
mode cursor: `PRIMARY` не переключается в fuzzy даже при новом zero, а `FUZZY`
не выполняет повторный primary probe. Cursor другого mode не применяется к
результату attempt.

`buildFuzzyPlan` не перечитывает config и не меняет required unit boundaries.
Он сохраняет exact original, synonym и identifier alternatives и добавляет:

- для single-token original alternative — `fuzzyToken(distance=1)`;
- для multi-token original span — `all` из `fuzzyToken(distance=1)` каждого
  original token с `requireSameField=true`.

Таким образом, fuzzy не применяется к synonym или SKU, все original tokens
остаются обязательными, а tokens одного исходного multi-token span не могут
совпасть в разных fields. Fuzzy result не объединяется с primary candidates.
Решение о fallback принимается исключительно по возвращённому final primary
`totalCount`; raw engine hits, primary page length и candidate cardinality его не
блокируют. Если fuzzy также пуст, возвращается полный FUZZY bundle с нулевыми
page/counts и cursor mode `FUZZY`.

#### 1.13.9. Consistency и deterministic replay

Branches одной attempt могут увидеть разные committed версии Listing index в
рамках существующей eventual-consistency модели. Executor не сравнивает branch
results и не повторяет bundle. При этом одинаковые normalized input,
`SearchRequestContext`, `SearchAttemptContext`, `SearchQueryPlan` и
`MembershipPlan` обязаны порождать одинаковую SQL semantics.

Для compatibility corpus сохраняются normalized input, compatibility tuple,
runtime checksum, mode и ожидаемые product IDs/order/counts без raw SQL. Replay
должен доказывать equivalence page membership, total и target-isolated facets
для global и segmented physical compilers.

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

Search document не хранит собственный event sequence и не принимает решение о
freshness. Последняя применённая item revision хранится только в canonical
`listing.listing_index_item_state`; документ получает её защиту за счёт записи в
той же Listing item transaction.

### 2.3. Write lifecycle

1. Product event или bounded reference/locale fan-out запускает существующий
   Listing item reindex mechanism. Он создаёт обычный
   `syncSellableItem`/`deleteSellableItem` action и назначает canonical
   item-scoped `eventSequence`, effective idempotency key и payload hash; search
   не генерирует собственную sequence.
2. Существующий single/batch Listing workflow получает актуальный Catalog/project
   snapshot и строит единый write model, включающий search documents всех enabled
   locales. Нормализованные documents входят в deterministic `writeModelHash`,
   сохраняемый как `listing_index_item_state.payload_hash` после apply.
3. Final writer открывает существующую Listing item transaction, первым
   write-side operation блокирует `listing_index_item_state` и повторно выполняет
   canonical `ignored_stale`/`noop`/revision-conflict/`applied` decision.
4. Только для `applied` в той же transaction обновляются product/variant rows,
   postings, prices, sorts, search documents и latest
   `listing_index_item_state`. `noop` и `ignored_stale` не пишут search rows.
5. Ошибка любой physical write откатывает всю transaction вместе с item state;
   retry и retry exhaustion остаются ответственностью существующего DBOS Listing
   workflow и его durable history.
6. Product delete удаляет все его search documents и атомарно записывает
   `lifecycle_status=deleted`. Locale removal выполняется обычным sync/reindex:
   writer удаляет отсутствующие locale rows и сохраняет item как `indexed`.

Initial sync, reconciliation, vendor/category rename и locale changes используют
те же single/batch reindex paths. Отдельного `search_index_item_state`, search
tombstone или независимого search item workflow нет.

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
  title coverage.

Canonical item freshness и applied lifecycle не дублируются: их источником
остаётся существующий `listing_index_item_state` с event sequence, payload hash,
idempotency identity и `indexed/deleted` status. Pending/running/failed attempts
берутся из durable DBOS state существующих Listing sync/delete/batch workflows.
`search_index_state` и `search_index_locale_state` являются только агрегированными
operational/readiness projections; periodic reconciliation сверяет их с
`product_listing_index`, `product_search_document`, canonical item state и DBOS
workflow state.

`servingAvailable` вычисляется отдельно: после initial sync частичный backlog
может давать `UPDATING/FAILED`, но успешно синхронизированные documents остаются
доступны.

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

services/listing/src/repositories/search/
  SearchSettingsRepository.ts
  SearchSynonymRepository.ts
  SearchProductBoostRepository.ts
  SearchConfigurationRevisionRepository.ts
  SearchConfigurationApplyJobRepository.ts
  SearchRuntimeConfigurationRepository.ts
  SearchDocumentRepository.ts
  SearchIndexStateRepository.ts

services/listing/src/scripts/search/
  SearchSettingsUpdateScript.ts
  SearchSynonymGroup*Script.ts
  SearchProductBoost*Script.ts

services/listing/src/workflows/
  SearchConfigurationApplyWorkflow.ts

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
- `listing`;
- paginated `synonymGroup(s)`;
- paginated `productBoost(s)`;
- `indexStatus`;
- `overview`;

### Mutations

- `settingsUpdate`;
- synonym group create/update/delete;
- product boost create/update/delete.

Все mutations возвращают entity/application state и `userErrors`. Node entities
получают global ID. Lists используют server-side filtering и Relay cursors.

Минимальные Casbin permissions:

```text
listing.search.read
listing.search.manage
```

Обязательные user error codes: configuration conflict, unavailable field/locale,
synonym conflict/required values, boost products/phrases required, product not
found, index unavailable и cursor expired. Error field paths повторяют GraphQL
input paths.

## 6. Observability, privacy and guardrails

Technical logs содержат store ID, query hash, locale/scope, request-level
revision/schema, attempt-level mode, candidate/final cardinalities, collector,
fuzzy flag, branch duration и counts synonyms/boosts. Raw query в technical logs
запрещён.

Metrics: primary/fuzzy latency, cardinalities, config apply duration/failures и
indexing lag/failures/coverage.

Guardrails: maximum tokens, synonym units, alternatives, AST clauses, Listing
timeout/cancellation, no unescaped parser strings, no silent truncation and no
hidden top-K. Raw query, IP, user agent и auth data не сохраняются.

Compatibility corpus должен доказать tenant membership isolation. Влияние общего
BM25 corpus на relative IDF измеряется отдельно; tenant-local IDF/partitioning не
входит в этот plan.

## 7. Пошаговая реализация

### Этап 0. External dependency gates, correctness baseline и pg_search compatibility

До начала этапа 1 должны быть выполнены обязательные external dependency gates.
Их реализация находится вне scope Listing, но версия и готовность каждого
контракта должны быть подтверждены до подключения multi-field documents.

| Gate | Внешний контракт | Критерий прохождения |
|---|---|---|
| G1. Product snapshot | Versioned Catalog snapshot содержит localized product title, vendor ID/name, categories ID/localized name и variants ID/SKU/localized title | Broker type/version опубликован; Listing hydration может запросить snapshot по product ID и проверить его версию |
| G2. Product lifecycle events | Product/variant title, SKU, vendor assignment, category membership, publication/delete и variant create/update/delete | Для каждого изменения определён event classification в обычный `syncSellableItem` или `deleteSellableItem` action |
| G3. Reference fan-out | Vendor/category rename позволяет bounded получить affected product IDs | Определены cursor/batch contract, upper bounds, retry и continuation semantics без отдельного search workflow |
| G4. Locale lifecycle | Project предоставляет versioned enabled locales и события enable/disable | Locale change запускает bounded reindex affected products; removed locale rows удаляются canonical sync writer-ом |

Целевой snapshot contract:

```ts
interface CatalogProductSnapshot {
  content: Array<{ locale: string; title: string | null }>;
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

Vendor/category rename и locale change используют существующий Listing item
action contract и bounded batch workflow; отдельный search writer, search event
sequence или search item workflow не создаются. Collection scope имеет отдельный
gate и не публикуется до появления canonical listing scope provider.

До прохождения gate конкретного source `SearchCapabilitiesService` возвращает
соответствующее field как `UPDATING` или `UNAVAILABLE`; backend не имитирует
данные через handle, UUID или другую locale. Непройденный gate запрещает
advertise соответствующей capability и не может быть обойдён mock/fallback
данными.

После фиксации gates выполнить correctness baseline:

1. Добавить integration fixtures для pinned `pg_search 0.24.1`: boolean compound,
   phrase, arrays, exact/prefix SKU, fuzzy distance 1, score, Cyrillic/Unicode,
   special characters и tenant predicate.
2. Реализовать normalizer и explicit query/locale validation.
3. Разделить navigation scope и optional query во внутренних Listing types.
4. Исправить `CATEGORY + query` для page/total/facets и business sorts.
5. Свернуть duplicate search SQL в
   `ListingProductTitleSearchQueryRepository`.
6. Удалить handle/UUID fallback.
7. Добавить extension/index health diagnostics.

Готовность: G1–G4 имеют зафиксированные versioned contracts и подтверждённых
owners; непрошедшие field gates отражаются в capabilities; все category branches
используют один membership compilation contract; sort не удаляет query predicate;
tenant leakage отсутствует; special characters parameterized. Межветочная
snapshot consistency не проверяется.

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
3. Повысить версию Listing sync write model, включить deterministic search
   documents в `writeModelJson` и `writeModelHash`, реализовать stable `search_id`
   upsert; repository не принимает отдельный event sequence и не решает freshness.
4. Добавить только aggregate `search_index_state` и
   `search_index_locale_state`; item-level state не дублировать.
5. Расширить single и batch final writers: search documents записываются только
   после canonical decision под lock `listing_index_item_state` и до atomic
   upsert latest item state.
6. Подключить bounded initial sync/reconciliation через существующие Listing
   `syncSellableItem`/batch reindex paths.

Готовность: все ready fields searchable; SKU сохраняет identifier semantics;
product write атомарно меняет listing/document/latest item state; stale/noop не
пишут documents; failed transaction сохраняет previous documents и previous item
state; unavailable engine не имеет fallback.

### Этап 3. Configuration persistence

1. Создать configuration/settings/revision/job/runtime/audit tables.
2. Реализовать repositories через transaction-aware `this.connection` и context
   store.
3. Реализовать authoring transaction: optimistic version, desired revision,
   immutable snapshot, audit и apply job.
4. Добавить нормализацию и validation settings.
5. Опубликовать GraphQL `settings`, `settingsUpdate` и application state.

Готовность: concurrent mutation получает configuration conflict; desired revision
и audit записываются атомарно; незавершённая revision не влияет на Listing.

### Этап 4. Configuration apply и runtime revisions

1. Реализовать DBOS apply workflow с retry, CAS activation и coalescing.
2. Компилировать immutable runtime configuration из сохранённой authoring
   revision.
3. Реализовать загрузку runtime revision из DB и revision-addressed cache.
4. Зафиксировать retention contract не короче cursor TTL и safe cleanup старых
   revisions.
5. Добавить recovery незавершённых apply jobs и safe compile errors.

Готовность: failed apply оставляет previous active revision; superseded revision
не активируется; cache miss восстанавливается из DB; restart не меняет active
behavior.

### Этап 5. Primary query planner и pg_search compiler

1. Создать typed AST, limits и synonym-free `SearchQueryPlanBuilder` по
   нормативному алгоритму 1.13.1–1.13.4.
2. Реализовать versioned `PgSearchQueryCompiler` для token/phrase и exact/prefix
   SKU без fuzzy.
3. Зафиксировать compatibility tuple: extension, document schema, compiler,
   tokenizer и normalizer versions.
4. Реализовать полный candidate relation без hidden top-K.
5. Добавить compiler integration corpus и query-shape performance baseline.

Готовность: пользовательские значения параметризованы; tenant/locale predicates
обязательны; compiler сохраняет точную форму
`OR(AND(unitMatch...), wholeQueryIdentifierMatch)` и правила пустых веток;
identifier tier стабилен; unsupported engine/schema combination возвращает
`SEARCH_INDEX_UNAVAILABLE`.

### Этап 6. Canonical Listing executor

1. Создать `SearchExecutionService` и один раз построить pinned
   `SearchRequestContext`: с active runtime revision для первой страницы либо с
   retained revision/checksum/schema из cursor для continuation.
2. Встроить search candidates в canonical `productMatches` для GLOBAL и CATEGORY
   по membership algorithm 1.13.5.
3. Обеспечить одинаковый membership contract для page, total, configured facets
   и virtual facets.
4. Сохранить search bitmap при target facet isolation и business sort.
5. Добавить `RELEVANCE` ordering без boosts и OOS policy.

Готовность: query не теряется при scope/sort; page, total и facets используют
одинаковую membership algebra без гарантии общего DB snapshot; same-variant
filters сохраняют canonical semantics; Listing использует один pinned request
context на всех параллельных branches и attempts.

### Этап 7. OOS policy и versioned cursor

1. Реализовать `SHOW` без availability membership, `HIDE` как canonical
   `criterion.availability=available` в variant space и `PLACE_LAST` через
   derived product availability ordering projection.
2. Добавить conditional availability bucket в ordering и cursor.
3. Повысить cursor version и включить request/config/schema/order fingerprint;
   первая страница использует active revision, continuation — retained revision
   и mode из cursor.
4. Реализовать expiry и `SEARCH_CURSOR_EXPIRED` для недоступной revision.
5. Проверить pagination для relevance и всех business sorts.

Готовность: `HIDE` пересекает availability, OPTION, future criteria и price до
projection и не склеивает predicates разных variants; `PLACE_LAST` стабилен
между страницами; cursor нельзя применить к изменённому request или несовместимой
revision/schema.

### Этап 8. Exact-first fuzzy fallback

1. Добавить fuzzy clauses только для original text alternatives.
2. Запускать fuzzy после final primary `totalCount = 0` и minimum query length.
3. Создавать `FUZZY` attempt из того же pinned `SearchRequestContext` и повторять
   полный result bundle в одном `FUZZY` mode без повторного resolve
   configuration/schema.
4. Включить mode и fuzzy ordering keys в cursor.
5. Для continuation выполнять только mode cursor без повторного выбора
   PRIMARY/FUZZY.
6. Добавить latency, concurrency и statement-timeout guardrails.

Готовность: primary и fuzzy sets не смешиваются; SKU/synonyms не fuzzy-expand;
page, total и facets используют один mode; отфильтрованный raw primary hit не
блокирует fuzzy fallback.

### Этап 10. Synonyms

1. Создать synonym authoring/value/claim tables и repositories.
2. Реализовать Scripts с normalization, validation и optimistic concurrency.
3. Компилировать locale-scoped synonym trie в runtime revision.
4. Добавить longest-match-left-to-right и multi-token phrase semantics.
5. Опубликовать GraphQL CRUD, application state и reason diagnostics.

Готовность: active claim уникален в store/locale; SKU и fuzzy не получают synonym
expansion; новая конфигурация влияет на serving только после atomic activation.

### Этап 11. Product boosts

1. Создать boost/phrase/product tables и repositories.
2. Реализовать tenant-scoped product validation и bounded Scripts.
3. Компилировать exact original lookup phrase map в runtime revision.
4. Добавить boost-only candidates, cursor flag и Preview reason diagnostics.
5. Опубликовать GraphQL CRUD и application state.

Готовность: boost не обходит publication/scope/filters/OOS; rules не stack-ятся;
boost влияет на relevance, но не переопределяет выбранный business sort.

### Этап 12. Index Status и Overview backend

1. Реализовать status service и GraphQL index status.
2. Связать status с canonical `listing_index_item_state`, durable DBOS state
   существующих Listing indexing workflows и engine health.
3. Разделить engine availability, initial locale readiness, field readiness и
   backlog/failure status.
4. Добавить periodic counter reconciliation.
5. Реализовать Overview composition для search configuration и index status.

Готовность: aggregate state переживает restart; retries/pending/failed берутся из
существующего durable Listing workflow state; новое событие повторно запускает
canonical item reindex; stale/noop action не меняет search documents и не
воскрешает product; неполный initial locale sync не рекламируется как ready.

### Этап 13. Hardening и rollout

1. Создать `uk/en/ru` corpus с identifiers, multiword synonyms, OOS/mixed
   variants, missing locale data и large candidate sets.
2. Снять `EXPLAIN ANALYZE` matrix для global/category, filters, fuzzy, boosts,
   arrays и diagnostics.
3. Подтвердить limits из 1.13.1 на performance corpus, зафиксировать timeouts и
   BM25 VACUUM/autovacuum policy; изменение limit требует version bump.
4. Добавить failure injection для config apply и item indexing.
5. Проверить privacy и cross-tenant IDF trade-off.
6. Включать GraphQL capabilities только после соответствующей readiness.
7. Удалить title-only symbols и устаревшие docs после перехода.

## 8. Основные Listing touchpoints

| Область | Файлы |
|---|---|
| BM25 DDL | `services/listing/migrations/domains/0100_listing_index/` |
| Models | `services/listing/src/repositories/models/listingIndex.ts` и новые search models |
| Current writer | `services/listing/src/repositories/listing/ProductTitleBm25SearchIndexRepository.ts` |
| Listing write path | `ListingBuildSyncWriteModelScript`, `ListingWriteIndexActionScript`, batch workflow steps |
| Item freshness state | `ListingIndexItemStateRepository` и `listing_index_item_state` |
| Candidate SQL | `services/listing/src/repositories/listing/sql/compileListingProductMatchesSql.ts` |
| Orchestration | `services/listing/src/repositories/listing/ListingQueryRepository.ts` |
| Page/cursor | `services/listing/src/repositories/listing/sql/compilePageQuerySql.ts` и listing request/cursor types |
| Admin GraphQL | `services/listing/src/api/graphql-admin/schema/`, `services/listing/src/resolvers/admin/` |
| New search modules | `services/listing/src/search/`, `repositories/search/`, `scripts/search/` |

## 9. Acceptance matrix

| Сценарий | Ожидаемый результат |
|---|---|
| Global query | Полный candidate set, relevance order |
| Category + query | Page/total/facets ограничены category и query |
| Category + query + price/name sort | Query остаётся predicate |
| Query + option + price | Variant predicates имеют same-variant semantics |
| HIDE + option + price | Product проходит только при одном variant, одновременно available и соответствующем option/price |
| Facet target isolation | Search bitmap сохраняется |
| Draft in BM25/boost | `publishedUniverse` исключает product |
| Exact/prefix SKU | Identifier tier без synonym/fuzzy |
| Missing locale title | Нет cross-locale fallback; SKU ещё может найти product |
| Primary raw hit отфильтрован scope/OOS | Final zero разрешает fuzzy pass |
| Query короче 3 code points | Fuzzy не запускается |
| Query/AST превышает limit | Validation error без truncation и без обращения к engine |
| PRIMARY cursor после изменения index | Выполняется только PRIMARY; mode не переключается на FUZZY |
| FUZZY cursor | Сразу выполняется FUZZY на retained revision без primary probe |
| Boost-only product | Проходит publication/scope/filters/OOS |
| Boost + business sort | Membership сохраняется, boost ranking выключен |
| Settings save/apply fail | Old active revision продолжает serving |
| Concurrent revisions N/N+1 | N не активируется после появления N+1 |
| Index retry exhausted | Existing DBOS Listing workflow status failed; previous committed documents доступны |
| Stale product event | Canonical `listing_index_item_state` guard возвращает `ignored_stale`, documents не меняются |
| Expired configuration cursor | `SEARCH_CURSOR_EXPIRED` |

## 10. Definition of Done для Listing service

- все advertised fields имеют реальный source и BM25 capability;
- page/total/facets используют одинаковый membership compilation contract при
  любом scope/sort; общий DB snapshot и равенство результатов при concurrent
  indexing не гарантируются;
- synonyms/fuzzy/boost/OOS соблюдают зафиксированные interaction rules;
- configuration apply имеет собственную durable state machine, а document
  synchronization использует canonical Listing item workflow и
  `listing_index_item_state` без дублирующего search item state;
- stale revision и stale product event не активируют устаревшее состояние;
- index status показывает честные readiness, backlog, failures и locale coverage;
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
5. `HIDE` обязан пересекать canonical variant availability с OPTION/criteria и
   price до projection, а не использовать derived product sort projection.
6. Collection scope нельзя имитировать до canonical listing scope provider.
7. High-frequency vendor/category rename fan-out требует bounded batching,
   monotonic sequence и наблюдаемого backlog.
