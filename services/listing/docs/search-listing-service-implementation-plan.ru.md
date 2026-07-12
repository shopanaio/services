# План реализации Search в Listing service

## Статус и назначение

План описывает search runtime Listing service на стандартном PostgreSQL Full
Text Search, универсальной configuration `pg_catalog.simple` и встроенном
Node.js normalization pipeline на `Intl.Segmenter` + `natural`. PostgreSQL не
выполняет locale-specific stemming или stopword filtering: документы, запросы,
synonyms и boost phrases проходят один versioned normalization profile до записи
или compilation.
Исключение — typo vocabulary: он хранит исходные surface terms без normalization
и revision и используется только для query-term expansion. Найденные fuzzy
alternatives нормализуются уже после Levenshtein verification перед compilation
в обычный PostgreSQL FTS query.
Внешний search engine и `pg_search` не используются.

Реализация Catalog snapshot, broker-types и Admin UI не входит в этот план. Они
описаны только как внешние зависимости Listing. Semantic/vector search,
spellcheck, ML-reranking, персонализация, sponsored results и отдельное
управление listing facets остаются вне scope.

Отдельный Python/gRPC normalizer не используется. Unicode normalization,
locale-aware tokenization и stemming выполняются в процессе Listing без сетевого
вызова.

План рассчитан на clean DB: stage/production данных и пользователей нет. Поэтому
начальный title-only DDL можно заменить целевой схемой без dual-read, dual-write
и legacy conversion. Changeset-файлы вручную не редактируются.

## Целевой результат

`listing` становится единственным владельцем runtime search:

- PostgreSQL FTS (`tsvector`, `tsquery`, GIN) выполняет primary text matching;
- runtime search tables используют tenant-scoped composite GIN indexes, в которых
  `store_id` является индексируемой колонкой вместе с search value;
- Node.js normalization pipeline выполняет Unicode normalization,
  locale-aware tokenization через `Intl.Segmenter`, stemming через locale-specific
  stemmer из `natural` и stopword filtering для всех supported locales;
- PostgreSQL для всех locale использует только explicit `pg_catalog.simple` над
  уже подготовленным текстом;
- `ts_rank_cd` вычисляет внутренний deterministic relevance rank, но не
  объявляется BM25 score;
- SKU ищется отдельными exact/prefix predicates и B-tree indexes;
- typo tolerance использует `pg_trgm` для индексируемого отбора surface terms,
  `fuzzystrmatch.levenshtein_less_equal` для окончательной проверки distance `1`,
  затем нормализует подтверждённые alternatives и выполняет полнотекстовый поиск
  тем же `tsvector`/GIN contract, что и PRIMARY;
- canonical listing bitmap pipeline остаётся источником истины для publication,
  navigation scope, same-variant filters, prices, availability, totals и facets;
- listing вызывает `SearchExecutionService`;
- settings, synonyms и boosts изменяются короткими атомарными транзакциями и
  загружаются напрямую из authoring tables или их точечных cache entries;
- typo-tolerant search выбирается только когда PRIMARY search candidate set после
  обязательного `publishedUniverse` пуст, но до применения category scope,
  facets, price, availability и других пользовательских Listing filters;
- search indexes обновляются существующим event-driven listing workflow;
- backend публикует Admin GraphQL для управления, Preview и status;
- все ветки одного request используют один immutable request-level configuration
  context и один фактический PostgreSQL search contract; persisted global
  configuration snapshot не создаётся;
- все ветки одной search attempt используют один execution mode.
- query использует текущий code-level normalization contract/profile revision и
  выбирает только physical rows с теми же значениями.

## PostgreSQL search stack

Обязательный database contract:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
CREATE EXTENSION IF NOT EXISTS btree_gin;
```

PostgreSQL FTS является встроенной возможностью и не требует extension.
Единственная разрешённая FTS configuration — `pg_catalog.simple`; неявный
`default_text_search_config`, locale-specific PostgreSQL dictionaries и
`unaccent` в database search path запрещены. Accent/diacritic policy является
частью versioned normalization contract.

Locale registry связывает locale не с PostgreSQL configuration, а с локальным
normalization profile и его revision. Unsupported profile не подменяется
другим языком и не advertised в capabilities.

Начальные normalization profiles:

| Locale | Tokenizer | Stemmer |
|---|---|---|
| `uk` | `Intl.Segmenter('uk', { granularity: 'word' })` | `natural.PorterStemmerUk` |
| `ru` | `Intl.Segmenter('ru', { granularity: 'word' })` | `natural.PorterStemmerRu` |
| `en` | `Intl.Segmenter('en', { granularity: 'word' })` | `natural.PorterStemmer` |

Версии Node.js/ICU и `natural`, правила NFKC/apostrophe/dash/case folding,
stopword assets и SKU/code-like classification входят в immutable profile
revision. Обновление любого из этих компонентов требует compatibility corpus.

## Обязательные инварианты

1. Tenant всегда определяется через `ServiceContext.store.id`; `storeId` не
   принимается из public input.
2. Locale обязательна и входит в search row identity, query plan, cursor и
   configuration. Cross-locale fallback отсутствует.
3. `publishedUniverse` применяется независимо от FTS, SKU, category scope и boost.
4. Один `productMatches` используется page, `totalCount`, configured facets и
   virtual facets.
5. Search bitmap сохраняется при любом sort и никогда не исключается target
   facet isolation.
6. Variant filters пересекаются в variant space до projection в product space по
   contract `knowledge/vault/listing/facets-architecture.ru.md`.
7. Typo-tolerant mode выбирается один раз для всего result bundle; нельзя смешивать
   PRIMARY page с FUZZY total/facets.
   Пустой итоговый Listing после category/price/facet/OOS-фильтров не является
   основанием для переключения с PRIMARY на FUZZY.
8. SKU не получает synonym, stemming или typo expansion.
9. Boost не обходит scope, publication, structured filters или OOS policy.
10. `HIDE` компилируется как canonical availability predicate в variant space до
    projection; `PLACE_LAST` использует только derived product ordering bucket.
    Оба режима имеют приоритет над boost.
11. Изменение settings, synonym group или boost становится видимым только после
    commit соответствующей атомарной транзакции; после commit инвалидируется
    только затронутый cache key.
12. Listing не раскрывает SQL, AST, internal weights, `ts_rank_cd`, trigram
    similarity или edit distance.
13. Search indexes подчиняются canonical `listing_index_item_state`: stale и
    noop action не изменяют physical rows, а stale Catalog event/snapshot не
    может откатить latest item state или воскресить удалённые search rows.
14. Phrase совпадает только внутри одного logical field element. Текст разных
    variants/categories и разных fields не может совместно удовлетворить phrase.
15. Typo candidate prefilter не может превращаться в hidden top-K. Все прошедшие
    зафиксированный trigram predicate terms проверяются Levenshtein; подтверждённые
    alternatives компилируются в FTS query, а все совпавшие с ним документы
    участвуют в exact Listing totals/facets.
16. `gin_fuzzy_search_limit` для Listing connections равен `0`: случайная усечённая
    выборка GIN недопустима.
17. Document, query, synonym и boost normalization используют один contract
    version и locale profile revision; несовпадение с active index fail-closed.
18. Локальный normalization pipeline выполняется до открытия database transaction:
    нормализованный результат входит в deterministic write model до final writer.
19. Phrase означает смежность нормализованных searchable lexemes после
    симметричного stopword filtering и только внутри одного element; exact
    surface phrase с учётом удалённых stopwords не обещается.
20. Каждый runtime search query содержит direct equality predicate
    `store_id = $boundStoreId`, совпадающий с tenant-колонкой tenant-scoped
    composite GIN. FTS и trigram lookup обязаны применять tenant predicate внутри
    того же index condition; получение cross-tenant GIN candidates с последующей
    heap-фильтрацией запрещено.

## Целевая схема выполнения

```text
Listing
  -> normalize locale/query/input
  -> load settings, locale synonyms and applicable boosts once into SearchRequestContext
  -> normalize query через versioned Node.js normalization profile
  -> resolve current code-level normalization profile revision
  -> build safe SearchQueryPlan
  -> derive PRIMARY SearchAttemptContext
  -> compile PostgreSQL PRIMARY candidates and intersect with publishedUniverse
  -> materialize PRIMARY search-visible candidate bitmap
  -> when PRIMARY search candidate bitmap is empty and typo tolerance is allowed:
       derive FUZZY SearchAttemptContext from the same request context
       resolve pg_trgm vocabulary candidates + exact Levenshtein verification
       normalize verified alternatives and compile expanded PostgreSQL FTS query
       materialize FUZZY search candidate bitmap
  -> choose one PRIMARY or FUZZY mode and one immutable SearchCandidateContract
  -> use its membership bitmap in every Listing membership branch
  -> use its ranked candidate relation only in relevance page ordering
  -> calculate page + total + facets once from one productMatches contract
  -> apply relevance/business ordering and OOS policy
  -> return Listing
```

## 1. Canonical search execution

### 1.1. Нормализация и локальная lexicalization

Создать единый `SearchQueryNormalizer`, используемый Listing, synonyms и boosts:

1. validate locale по enabled project locales;
2. удалить control characters;
3. из очищенной, но ещё не нормализованной строки выделить ordered surface terms
   для typo vocabulary/query; сохранить исходный Unicode и регистр без NFKC,
   case folding, stemming и stopword filtering;
4. применить Unicode NFKC;
5. trim и collapse Unicode whitespace;
6. ограничить display query 128 Unicode code points;
7. построить locale-aware case-folded `lookupKey`;
8. вычислить tenant-scoped query hash через length-prefixed tuple;
9. сегментировать normalized text через `Intl.Segmenter(locale, { granularity:
   'word' })`, сохранив source order, offsets и `isWordLike`;
10. классифицировать SKU/code-like/mixed-script tokens, применить versioned
   stopwords и locale-specific stemmer из `natural` только к searchable language
   tokens;
11. проверить output limits, contract version, locale/profile revision и
    deterministic output hash.

```ts
interface NormalizedSearchQuery {
  readonly display: string;
  readonly lookupKey: string;
  readonly hash: string;
  readonly codePointLength: number;
}

interface LexicalizedSearchQuery {
  readonly originalUnits: readonly SearchLexicalUnit[];
  readonly identifierForm: string;
  readonly wholeQueryPrimaryText: string;
  readonly normalizationContractVersion: string;
  readonly profileRevision: string;
}

interface SearchLexicalUnit {
  readonly sourceIndex: number;
  readonly sourceText: string;
  readonly ftsLexemes: readonly string[];
  readonly typoTerms: readonly string[];
}
```

Normalization pipeline возвращает ordered semantic units, prepared primary lexemes и
отдельные surface typo terms. Primary lexemes получаются тем же locale profile
revision, которым построены document vectors. Surface typo term — точная surface
строка token, выделенная tokenizer из source/query до NFKC, case folding,
stemming и stopword filtering. Dictionary не нормализует и не версионирует term;
он используется только для trigram/Levenshtein comparison. Только после выбора
verified alternative эта строка проходит обычный query normalization pipeline и
превращается в primary lexemes для expanded FTS. PostgreSQL не является
источником lexicalization.

Stopwords удаляются локальным pipeline до PostgreSQL одинаково для document/query
и до построения обязательных semantic units (`requiredUnits`). Удалённый stopword
не создаёт отдельный required unit и не превращает обычный запрос в validation
error. Source position удалённого token сохраняется только в normalization
metadata для deterministic hashing и diagnostics.

`wholeQueryPrimaryText` собирается только из validated primary lexemes и
передаётся в `plainto_tsquery('pg_catalog.simple', $boundText)`. Phrase
компилируется из подготовленной последовательности через
`phraseto_tsquery('pg_catalog.simple', $boundText)` и означает normalized-token
phrase после удаления stopwords.

Validation error до выполнения listing branches возвращается, если после
stopword filtering в запросе не осталось ни одного searchable semantic unit или
если query распался в недопустимое число lexemes. Silent deletion обязательного
non-stopword unit запрещён.

Для identifiers дополнительно строится NFKC/trim/case-fold форма без удаления
дефисов, пробелов и других значимых разделителей SKU.

### 1.2. Request и attempt contexts

До запуска параллельных listing branches один раз разрешать immutable request
context:

```ts
interface SearchRequestContext {
  readonly storeId: string;
  readonly locale: string;
  readonly normalizedQuery: NormalizedSearchQuery;
  readonly lexicalizedQuery: LexicalizedSearchQuery;
  readonly configuration: SearchRequestConfiguration;
  readonly diagnosticsMode: "NONE" | "PREVIEW";
}

interface SearchAttemptContext {
  readonly request: SearchRequestContext;
  readonly mode: "PRIMARY" | "FUZZY";
}

interface SearchRequestConfiguration {
  readonly settings: SearchSettings;
  readonly synonyms: CompiledLocaleSynonyms;
  readonly boosts: readonly ApplicableProductBoost[];
}
```

Request без cursor всегда начинает с `PRIMARY`. Если materialized PRIMARY
search candidate bitmap после `publishedUniverse` пуст, но до category scope и
пользовательских filters, и typo tolerance разрешён, создаётся `FUZZY` attempt со
ссылкой на тот же request context. Continuation выполняет только mode из cursor
и не делает повторный PRIMARY probe.

`SearchRequestConfiguration` один раз загружает settings, locale-scoped synonyms
и applicable boosts из обычных таблиц или точечных caches и используется всеми
ветками текущего request. Это immutable application object, а не persisted
database snapshot. Cursor не закрепляет configuration: continuation загружает
актуальные committed значения на момент нового request. Физический search index
не версионируется. Глобальная версия, связывающая settings, все synonyms и все
boosts, отсутствует: каждый resource атомарен независимо, а request фиксирует
именно те committed resource values, которые loader загрузил для него.

### 1.3. Engine-neutral query plan

Создать typed AST и `SearchQueryPlanBuilder`. Raw input запрещено
интерполировать в `to_tsquery` syntax.

```ts
type SearchClause =
  | {
      kind: "ftsTerms";
      text: string;
      lexemes: readonly string[];
      fields: readonly SearchTextField[];
    }
  | {
      kind: "ftsPhrase";
      text: string;
      fields: readonly SearchTextField[];
      requireSameElement: true;
    }
  | {
      kind: "synonym";
      groupId: string;
      alternatives: readonly SearchClause[];
    }
  | {
      kind: "typoTerms";
      terms: readonly string[];
      fields: readonly SearchTextField[];
      maxDistance: 1;
      requireSameElement: boolean;
    }
  | { kind: "identifierExact"; value: string }
  | { kind: "identifierPrefix"; value: string };

interface SearchQueryPlan {
  readonly requiredUnits: ReadonlyArray<{
    index: number;
    primaryAlternatives: readonly SearchClause[];
    originalTypoAlternative: SearchClause | null;
    originalIdentifierAlternatives: readonly SearchClause[];
  }>;
  readonly wholeQueryIdentifierAlternatives: readonly SearchClause[];
  readonly matchedSynonymGroupIds: readonly string[];
  readonly applicableBoostProductIds: readonly string[];
}

interface VerifiedTypoAlternative {
  readonly inputTerm: string;
  readonly vocabularyTerm: string;
  readonly editDistance: 0 | 1;
  readonly trigramSimilarity: number;
  readonly ftsLexemes: readonly string[];
}

interface ExpandedFuzzySearchQueryPlan extends SearchQueryPlan {
  readonly verifiedAlternativesByUnit: ReadonlyMap<
    number,
    readonly VerifiedTypoAlternative[]
  >;
}
```

`SearchQueryPlan` не содержит database-derived product matches. Для FUZZY
dictionary lookup сначала создаёт полный `VerifiedTypoAlternative[]` в пределах
request guardrails; затем application normalizer заполняет `ftsLexemes`, и
builder создаёт immutable `ExpandedFuzzySearchQueryPlan`. Guardrail overflow
завершает attempt technical error и не усекает alternatives. Пустой набор
alternatives хотя бы одного обязательного unit означает пустой FUZZY result без
FTS scan.

Boolean semantics:

```text
unitMatch[i] = OR(
  requiredUnits[i].primaryAlternatives,
  requiredUnits[i].originalIdentifierAlternatives
)

semanticMatch = AND(unitMatch[0..n])
wholeQueryIdentifierMatch = OR(wholeQueryIdentifierAlternatives)
documentMatch = OR(semanticMatch, wholeQueryIdentifierMatch)
```

Один required unit может быть удовлетворён одним field element, а разные units
могут быть удовлетворены разными elements одного product. Phrase и multi-token
typo alternative всегда требуют один `field + element_id`.

Identifier clauses строятся только из original normalized query/span. Synonym
не создаёт identifier или typo alternatives. Initial SKU prefix threshold —
3 code points; короче допускается только exact.

### 1.4. PostgreSQL FTS compiler

Engine-specific SQL изолировать в versioned `PostgresFtsQueryCompiler`.
Compiler получает только typed plan, attempt context и bound parameters.

PRIMARY matching использует:

- `search_vector @@ tsquery`;
- `plainto_tsquery('pg_catalog.simple', $boundPreparedText)` для terms и
  `phraseto_tsquery('pg_catalog.simple', $boundPreparedText)` для phrase;
- typed `tsquery` AND/OR composition;
- tenant-scoped composite GIN index на `(store_id, search_vector)` через
  `btree_gin`;
- `ts_rank_cd` для rank отдельного field element с последующим умножением на
  numeric field weight из request configuration;
- отдельную identifier relation для SKU exact/prefix.

Начальные field weights:

```text
product title = 8
variant title = 5
vendor name   = 2
category name = 1
```

Каждый logical field element хранится отдельной row, поэтому PostgreSQL weight
classes `A`–`D` и `setweight` не используются. `search_settings` содержит mapping
`field -> positive finite numeric weight`, один раз загружаемый в request context. Compiler
вычисляет rank отдельной row через `ts_rank_cd(search_vector, tsquery)` и умножает
его на weight соответствующего field. Изменение numeric weight не изменяет
physical `tsvector`, не требует database migration или перестроения search rows и
начинает действовать после commit атомарного settings update и cache invalidation.

Rank product вычисляется без multiplicity bias:

```text
element_rank = ts_rank_cd(search_vector, tsquery) * runtimeWeight(field)
unit_rank = MAX(element_rank всех alternatives/elements одного required unit)
relevance_rank = SUM(unit_rank по satisfied required units)
```

Количество variants/categories не должно само по себе повышать product rank.
`NULL`, NaN и infinite rank завершают attempt как engine error.

#### Расширение набора полей и изменение весов

`SearchFieldRegistry` является единственным code-level registry поддерживаемых
текстовых полей. Для каждого поля он фиксирует:

- стабильный `field` key;
- source в `ListingSearchContentSnapshot`;
- правило построения stable `elementId`;
- участие в PRIMARY и FUZZY search;
- limits и readiness requirements.

Добавление нового logical field, например `collection_name`, не требует изменения
схемы `product_search_text` или vocabulary: новое значение хранится в
существующей колонке `field`, а каждое значение коллекции — отдельным element с
`element_id = collection_id`. Для добавления поля необходимо последовательно:

1. добавить source в versioned Catalog snapshot и
   `ListingSearchContentSnapshot`;
2. добавить deterministic mapping значений и stable element identity;
3. зарегистрировать field key в `SearchFieldRegistry`;
4. включить поле в document normalization/write model и query planner;
5. классифицировать source events и reference fan-out для изменений этого поля;
6. добавить поле в compatibility corpus, limits, capabilities и field readiness.

`search_settings.enabledFields` может включать только поля, уже известные
`SearchFieldRegistry` и готовые для соответствующих tenant/locale. Admin settings
не создают новые field types и не меняют physical index contract. Неизвестное или
неготовое поле отклоняется как `unavailable field`.

Для каждого enabled field settings задают независимый positive finite numeric
weight в пределах зафиксированных limits. Например, после появления готового
`collection_name` runtime mapping может содержать
`{ product_title: 8, collection_name: 3 }`. Добавление mapping или изменение
`collection_name: 3 -> 4` выполняется обычным optimistic update
`search_settings.version` в одной транзакции и инвалидирует только settings cache;
DDL migration, `setweight` или изменение существующих `search_vector` не нужны.

Compiler обязан параметризовать values, помещать `store_id` и locale predicates
в каждый text/identifier/vocabulary subquery и не иметь `ILIKE` fallback. Lexeme arrays
используются для validation/limits, но не сериализуются в raw `to_tsquery` syntax.
Prepared text принимается только из validated normalization output; исходный
пользовательский text никогда не передаётся в PostgreSQL FTS functions.

### 1.5. Typo compiler

`PostgresTypoQueryCompiler` работает только в `FUZZY` mode. Dictionary является
только vocabulary для query expansion и не содержит postings или product
identity:

1. Берёт только original `typoTerms`; synonym и SKU не расширяются.
2. Ищет tenant/locale vocabulary candidates через `pg_trgm` operator и GIN.
3. Применяет length band `abs(char_length(term)-char_length(input)) <= 1`.
4. Для каждого кандидата обязательно проверяет
   `levenshtein_less_equal(term, input, 1) <= 1`.
5. Возвращает все verified alternatives без `LIMIT`/top-K`; dictionary lookup
   сам по себе не создаёт product candidates.
6. `SearchQueryNormalizer` нормализует verified surface alternatives тем же
   profile, что document vectors, и строит bounded primary lexemes.
7. Compiler формирует typed expanded FTS clause: OR alternatives внутри одного
   required unit, AND между обязательными units.
8. Выполняет expanded query через `search_vector @@ tsquery` и тот же composite
   GIN `(store_id, search_vector)`, который обслуживает PRIMARY.
9. Для multi-token unit применяет единый expanded `tsquery` к одной row
   `field + element_id`; разные rows не могут совместно удовлетворить unit или
   phrase.
10. Агрегирует совпавшие FTS elements в product relation без candidate cap.

`product_search_term` и собственный term-to-product posting index не создаются.
Связь expanded lexeme с products уже хранится PostgreSQL GIN над
`product_search_text.search_vector`. Dictionary решает только задачу поиска
близких surface forms; stale dictionary term безопасен для correctness, потому
что expanded FTS query не найдёт отсутствующий lexeme в document index.

Единый `pg_trgm.similarity_threshold` фиксируется в database configuration
для execution role Listing и не изменяется в runtime queries. Compatibility
corpus обязан доказать recall distance-1 примеров для всех поддерживаемых
locale/Unicode classes при этом пороге. Если безопасный единый indexable
threshold не подтверждён, typo tolerance не advertised; нельзя
компенсировать риск full dictionary scan или скрытым top-K.

Индексируемый predicate использует `%` operator. При старте Listing
проверяет фактический `pg_trgm.similarity_threshold`; несовместимое значение
помечает typo search capability как unavailable.

Начальные ограничения:

```text
minimum whole query length: 4 code points
minimum typo term length:   4 code points
maximum typo term length:  64 code points
maximum typo terms:         8
maximum edit distance:      1
```

FUZZY relevance tuple до Listing ordering:

```text
total_edit_distance ASC
minimum_trigram_similarity DESC
expanded_fts_rank DESC
product_id ASC
```

`expanded_fts_rank` вычисляется `ts_rank_cd` по тому же expanded query, который
определил FUZZY membership; dictionary similarity не создаёт membership сама.

### 1.6. Candidate relation

Логическая форма PRIMARY relation:

```text
fts_unit_matches(product_id, product_doc_id, unit_index, unit_rank)
identifier_candidates(product_id, product_doc_id, identifier_priority)
boost_candidates(product_id, product_doc_id)

semantic_candidates =
  GROUP fts/identifier unit matches BY product
  HAVING every required unit satisfied

candidate_rows =
  semantic_candidates
  UNION ALL whole-query identifier candidates
  UNION ALL boost candidates

resolved_candidates = GROUP BY product_id, product_doc_id
  identifier_priority = MAX(exact=3, prefix=2, text/boost=1)
  boosted            = BOOL_OR(boost candidate)
  relevance_rank      = MAX/SUM deterministic primary rank
```

FUZZY использует аналогичную FTS relation, скомпилированную из verified и затем
нормализованных vocabulary alternatives. Dictionary rows не входят в product
relation и не заменяют `search_vector @@ expanded_tsquery`. Boost lookup остаётся
exact по original `lookupKey + locale` и не активируется исправленной формой.

`SearchExecutionService` материализует не только bitmap, а immutable contract
выбранной attempt:

```ts
interface SearchCandidateContract {
  readonly request: SearchRequestContext;
  readonly attempt: SearchAttemptContext;
  readonly plan: SearchQueryPlan;
  readonly membershipBitmap: RoaringBitmap;
}
```

`membershipBitmap` строится как exact bitmap всех resolved `product_doc_id` и
является единственным search membership predicate для page, `totalCount`,
configured facets и virtual facets. Candidate cap и estimate до Listing
totals/facets запрещены.

Executor получает bitmap из PostgreSQL один раз в canonical serialized
`roaringbitmap` representation и передаёт его как bound parameter во все
параллельные branch statements. Session-local temporary table не используется,
поэтому correctness не зависит от того, какое connection pool выдаст каждой
branch. Serialization/deserialization обязаны сохранять exact cardinality и
doc IDs; размер payload, время materialization и bind/decode latency входят в
metrics и statement/request resource guardrails. Превышение resource guardrail
завершает attempt technical error, но не усекает candidate set.

Bitmap намеренно не содержит ordering metadata. Для relevance page branch
`PostgresFtsQueryCompiler` или `PostgresTypoQueryCompiler` компилирует из того же
contract ranked candidate relation:

```text
PRIMARY:
  product_doc_id, product_id,
  identifier_priority, boosted, relevance_rank

FUZZY:
  product_doc_id, product_id,
  boosted, total_edit_distance,
  minimum_trigram_similarity, expanded_fts_rank
```

Ranked relation не определяет membership самостоятельно: page всегда пересекает
её `product_doc_id` с `membershipBitmap`, затем с canonical `productMatches` и
только после этого применяет ordering/cursor/limit. Она не передаётся в Node.js
как unbounded array и не используется `totalCount` или facets. При business sort
page использует только `membershipBitmap`; search rank keys не вычисляются, если
они не нужны для diagnostics.

Повторная SQL compilation ranked relation обязана использовать те же immutable
request context, attempt mode, загруженные configuration values и query plan. Она не может
повторно выбирать PRIMARY/FUZZY, расширять membership или запускать fallback.

Для request без cursor executor сначала materialize-ит PRIMARY
`SearchCandidateContract.membershipBitmap`
после обязательного пересечения с `publishedUniverse`. Именно пустота этого bitmap
выбирает FUZZY mode. Category scope, facets, price, availability и другие
пользовательские Listing predicates в mode probe не входят. Draft/неопубликованный
candidate не считается найденным storefront-результатом и не блокирует FUZZY.
FUZZY bitmap также пересекается с `publishedUniverse`. После выбора mode один
immutable `SearchCandidateContract` передаётся всем Listing branches; PRIMARY и
FUZZY candidate sets и ordering metadata не объединяются.

### 1.7. Listing intersection

Non-empty query всегда входит в `productBase`, независимо от navigation scope и
selected sort:

```text
scopeProducts = publishedUniverse & navigationScopeProducts
searchProducts = SearchCandidateContract.membershipBitmap

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

`HIDE` всегда создаёт variant witness. `SHOW` и `PLACE_LAST` не добавляют
availability predicate в membership; `PLACE_LAST` использует derived product
availability projection только как ordering key.

`GLOBAL + query` заменяет legacy `SEARCH` scope. `CATEGORY + optional query`
валиден всегда. `RELEVANCE` требует non-empty query; business sort меняет
ordering, но не membership.

### 1.8. Согласованность SQL branches

Page, `totalCount`, configured facets и virtual facets выполняются отдельными
`READ COMMITTED` statements. Общий exported snapshot не требуется.

Один `productMatches` означает общий deterministic compilation contract: каждая
branch получает одинаковые normalized input, request/attempt contexts, plan,
`membershipBitmap`, scope и filters. Relevance page branch дополнительно
компилирует ranked relation из того же `SearchCandidateContract` и обязательно
ограничивает её materialized membership bitmap.

Page, `totalCount` и facets не обязаны читать один physical PostgreSQL snapshot:
concurrent indexing может привести к чтению разных committed canonical Listing
состояний. Однако search membership текущего request не пересчитывается по
отдельности в branches: переданный bitmap остаётся одинаковым. Executor не
сравнивает и не повторяет branches.

Ошибка FTS, trigram, Levenshtein или любой обязательной Listing branch завершает
attempt. Technical error не запускает FUZZY fallback.

### 1.9. Exact-first выбор search mode

1. Для первой страницы materialize-ить exact PRIMARY search candidate bitmap,
   пересечённый с обязательным `publishedUniverse`, но без category scope и
   пользовательских Listing filters.
2. Если PRIMARY bitmap непуст, выбрать `PRIMARY` независимо от того, сколько
   товаров останется после category, facets, price или OOS policy.
3. Только если PRIMARY bitmap пуст, typo tolerance включён и limits пройдены,
   построить FUZZY plan из того же primary plan и materialize-ить FUZZY bitmap.
4. Создать один `SearchCandidateContract` выбранного mode и выполнить с ним
   полный Listing bundle ровно один раз.
5. PRIMARY и FUZZY candidate sets не объединять.
6. Continuation выполняет только mode cursor с committed configuration нового request
   и materialize-ит candidate bitmap этого mode без дополнительного probe.

Решение о FUZZY принимается исключительно по пустоте опубликованного PRIMARY
search candidate bitmap. Итоговый `totalCount`, длина page и причины исключения
кандидатов пользовательскими Listing filters на выбор mode не влияют.

### 1.10. Synonyms

Request context хранит locale-scoped token trie, построенный при cache fill из
нормализованных synonym rows. Expander применяет longest-match-left-to-right.
Multi-token synonym становится одним semantic unit;
phrase должна совпасть целиком в одном field element. Группы двунаправленные.

Synonyms нормализуются и валидируются до короткой write transaction, сохраняются
готовыми rows и собираются в trie при cache fill, а не через PostgreSQL thesaurus. Synonyms
не меняют identifier clauses, не получают typo expansion и не активируют boosts
другой phrase.

Каждое synonym value нормализуется локальным Node.js pipeline до write
transaction. Row хранит prepared lexemes, contract version и profile revision;
изменение normalization profile требует отдельного bounded synonym migration,
но не глобальной compilation settings/boosts.

### 1.11. Boosts и ordering

Default PRIMARY relevance ordering:

```text
availability_bucket DESC  # только PLACE_LAST
identifier_priority DESC  # exact SKU=3, prefix SKU=2, text/boost=1
boosted DESC
relevance_rank DESC
product_id ASC
```

Default FUZZY ordering:

```text
availability_bucket DESC  # только PLACE_LAST
boosted DESC
total_edit_distance ASC
minimum_trigram_similarity DESC
expanded_fts_rank DESC
product_id ASC
```

При business sort boost и internal relevance keys не переопределяют выбранный
ordering. Все boost-only products проходят canonical publication, scope,
filters и OOS policy.

### 1.12. Cursor

Повысить cursor version и включить:

- normalized request hash, locale, currency, scope, filters и sort;
- execution mode;
- conditional availability bucket;
- полный фактический PRIMARY или FUZZY ordering tuple;
- ordinal/product tie-breaker, issued-at и expiry.

Float rank/similarity кодируются без округления в стабильном binary/decimal
representation. Просроченный cursor возвращает `SEARCH_CURSOR_EXPIRED`.
Cursor не обязан закреплять configuration version или snapshot search
index. Continuation использует configuration и committed search rows, актуальные
на момент нового HTTP request. Поэтому при изменении configuration, search rows,
publication или ordering keys между страницами отдельные товары могут быть
пропущены либо повторно появиться на следующей странице. Это ожидаемая
weak-consistency семантика pagination, а не engine/cursor error. Cursor гарантирует
только корректное декодирование request fingerprint, execution mode и ordering
tuple; стабильный snapshot всего result set между HTTP requests не обещается.

### 1.13. Listing diagnostics

Preview вызывает тот же executor с `diagnosticsMode: "PREVIEW"`. Дополнительный
bounded query работает только по product IDs текущей page и возвращает reason
codes:

- product/variant title;
- SKU exact/prefix;
- vendor/category;
- synonym/boost;
- typo fallback;
- OOS placed last.

SQL, AST, lexemes, rank, trigram similarity и edit distance не публикуются.

### 1.14. Limits

Начальные code constants:

| Limit | Значение |
|---|---:|
| Normalized query | 128 Unicode code points |
| Original query units | 16 |
| Tokens в synonym value | 8 |
| Synonym groups в request | 8 |
| Alternatives semantic unit | 24 |
| Leaf clauses в plan | 256 |
| SKU prefix minimum | 3 code points |
| Typo query minimum | 4 code points |
| Typo term minimum | 4 code points |
| Typo terms | 8 |
| Typo edit distance | 1 |

Превышение limit возвращает validation error; truncation запрещён.

Несовместимый или неготовый фактический PostgreSQL search contract возвращает
`SEARCH_INDEX_UNAVAILABLE`.

### 1.15. Нормативный top-level алгоритм

```ts
async function executeSearchListing(input: NormalizedListingInput) {
  const request = await resolveAndLexicalizeSearchRequestContext(input);
  const primaryPlan = buildPrimaryPlan(request);

  if (input.cursor?.mode === "FUZZY") {
    const fuzzyPlan = await buildExpandedTypoPlan({
      request,
      primaryPlan,
      verifiedAlternatives: await resolveVerifiedTypoAlternatives({
        request,
        primaryPlan,
      }),
    });
    const candidates = await materializeSearchCandidates({
      request,
      attempt: { request, mode: "FUZZY" },
      plan: fuzzyPlan,
    });
    return runFullBundle({
      request,
      attempt: { request, mode: "FUZZY" },
      candidates,
      input,
    });
  }

  const primaryCandidates = await materializeSearchCandidates({
    request,
    attempt: { request, mode: "PRIMARY" },
    plan: primaryPlan,
  });

  if (
    input.cursor?.mode === "PRIMARY" ||
    !isEmpty(primaryCandidates.membershipBitmap) ||
    !request.configuration.settings.typoToleranceEnabled ||
    !canRunTypoAttempt(request.lexicalizedQuery)
  ) {
    return runFullBundle({
      request,
      attempt: { request, mode: "PRIMARY" },
      candidates: primaryCandidates,
      input,
    });
  }

  const fuzzyPlan = await buildExpandedTypoPlan({
    request,
    primaryPlan,
    verifiedAlternatives: await resolveVerifiedTypoAlternatives({
      request,
      primaryPlan,
    }),
  });
  const fuzzyCandidates = await materializeSearchCandidates({
    request,
    attempt: { request, mode: "FUZZY" },
    plan: fuzzyPlan,
  });

  return runFullBundle({
    request,
    attempt: { request, mode: "FUZZY" },
    candidates: fuzzyCandidates,
    input,
  });
}
```

## 2. Search document index

### 2.1. Нормализованный Listing snapshot

Добавить `ListingSearchContentSnapshot` в normalized product snapshot. Для
каждой enabled locale builder создаёт deterministic arrays: trim, validate,
deduplicate, stable sort. Missing localized title остаётся пустым с explicit
coverage flag; handle, UUID и другая locale не подставляются.

Каждое значение получает stable `elementId`:

```text
product title  -> product ID
variant title  -> variant ID
vendor name    -> vendor ID
category name  -> category ID
SKU            -> variant ID
```

После snapshot mapping все searchable elements группируются по locale и
нормализуются локальной bounded batch operation. Результат сортируется обратно по
stable `elementId`; missing/duplicate/unknown IDs, превышение limits или profile
revision mismatch завершают build до открытия write transaction. Normalized
payload и normalization metadata входят в `writeModelHash`.

### 2.2. Physical contract

#### Tenant-scoped indexes

Runtime search tables создаются как обычные PostgreSQL tables без
partitioning. Tenant isolation поисковых кандидатов обеспечивается составными
GIN indexes через extension `btree_gin`: `store_id` входит в тот же индекс и в
тот же index condition, что и FTS/trigram predicate.

Text table имеет composite GIN и дополнительный B-tree scope index:

```sql
CREATE INDEX product_search_text_store_vector_gin
  ON listing.product_search_text
  USING gin (store_id, search_vector);
```

```text
(store_id, locale, normalization_contract_version,
 normalization_profile_revision, field)
```

Term vocabulary имеет tenant-scoped composite trigram GIN и B-tree на
tenant/locale:

```sql
CREATE INDEX search_term_dictionary_store_term_trgm_gin
  ON listing.search_term_dictionary
  USING gin (store_id, term gin_trgm_ops);
```

Identifier table имеет indexes, описанные ниже. Primary/unique keys всегда
включают `store_id` как часть tenant identity и FK contract. Vocabulary не имеет
surrogate `term_id`, sequence или FK на products: его identity —
`(store_id, locale, term)`.

Bound `store_id` передаётся как uuid без function/cast на indexed column.
Обязательные `EXPLAIN` fixtures подтверждают, что FTS использует composite
`(store_id, search_vector)` GIN, а typo lookup — composite
`(store_id, term gin_trgm_ops)` GIN; план, извлекающий cross-tenant GIN
candidates и фильтрующий tenant только после index scan, contract не проходит.

#### Canonical product document

Отдельная `product_search_document` не создаётся. Canonical product document —
существующая `listing.product_listing_index`. Search не копирует `kind`,
`status`, publication timestamps, product timestamps, revision или lifecycle
state. Publication, scope, product identity и `product_doc_id` всегда берутся из
canonical Listing pipeline.

Product-bound search tables являются только специализированными locale-scoped
indexes. Они хранят `product_doc_id` как денормализованный bitmap key, но
защищают его composite FK. Term vocabulary не является product-bound table и
этого ключа/FK не имеет:

```text
FK (store_id, product_doc_id, product_id)
  -> product_listing_index(store_id, product_doc_id, product_id)
  ON DELETE CASCADE
```

`product_doc_id` не является второй product identity и не обновляется отдельно
от item transaction. Отдельный `search_id` не используется.

#### Logical text elements

```text
listing.product_search_text
  store_id uuid not null
  product_id uuid not null
  product_doc_id int not null
  locale varchar(8) not null
  field varchar(32) not null
  element_id uuid not null
  prepared_text text not null
  normalization_contract_version varchar(32) not null
  normalization_profile_revision varchar(64) not null
  search_vector tsvector not null

  PK (store_id, product_id, locale, field, element_id)
  FK (store_id, product_doc_id, product_id)
    -> product_listing_index(store_id, product_doc_id, product_id)
```

Одна row содержит одно logical value. `prepared_text` — bounded строка из
ordered primary lexemes, полученных от normalization pipeline; raw localized source text в
search table не хранится. `search_vector` строится writer-ом только через
`to_tsvector('pg_catalog.simple', prepared_text)` без `setweight`; composite GIN
создаётся на `(store_id, search_vector)`. Numeric field weight в physical row и `tsvector` не хранится:
его разрешает compiler из request configuration при вычислении rank.
Query relation всегда фильтрует active contract/model revision вместе с
`store_id` и locale.

Собственные SQL functions для выбора веса, нормализации, lexicalization, stemming
или query compilation не создаются.
Database contract использует только встроенные PostgreSQL functions и functions
обязательных extensions: `to_tsvector`, `plainto_tsquery`,
`phraseto_tsquery`, `ts_rank_cd`, `levenshtein_less_equal`, а также
операторы `pg_trgm`. Добавление custom SQL function требует отдельного изменения
этого architecture contract и не может быть неявной implementation detail.

#### Identifiers

```text
listing.product_search_identifier
  store_id uuid not null
  product_id uuid not null
  product_doc_id int not null
  locale varchar(8) not null
  element_id uuid not null
  kind varchar(16) not null  # SKU
  normalized_value text not null

  PK (store_id, product_id, locale, kind, element_id)
  FK (store_id, product_doc_id, product_id)
    -> product_listing_index(store_id, product_doc_id, product_id)
```

B-tree indexes обеспечивают tenant/locale exact и `text_pattern_ops` prefix.

#### Typo term vocabulary и expanded FTS

```text
listing.search_term_dictionary
  store_id uuid not null
  locale varchar(8) not null
  term text not null
  code_point_length smallint not null

  PK (store_id, locale, term)
```

Dictionary индексируется composite GIN `(store_id, term gin_trgm_ops)`;
tenant/locale B-tree обслуживает дополнительный scope. Surface typo terms
формируются tokenizer из source values отдельно от primary stems и сохраняются
без NFKC, case folding, stemming, stopword filtering или profile versioning,
затем deduplicate и stable sort по исходной строке.
Dictionary не знает products, fields и elements и не дублирует PostgreSQL
postings. После Levenshtein verification подтверждённые terms нормализуются в
Node.js primary lexemes и компилируются в expanded `tsquery`; product membership
разрешается исключительно через `product_search_text.search_vector`.

Удаление/изменение term не требует полной переиндексации search documents.
Vocabulary пополняется при обычном item write и очищается bounded reconciliation.
Stale vocabulary rows допустимы: они могут породить лишнюю FTS alternative, но не
ложный product match. Cleanup влияет на размер и latency dictionary, а не на
correctness результатов.

Наличие localized title определяется существованием `field=product_title`
element. Диагностика при необходимости вычисляет aggregate coverage on demand и
не использует её как serving gate.

Один giant concatenated text column как единственный source запрещён: он ломает
same-element phrase semantics и создаёт ranking bias по числу values.

### 2.3. Write lifecycle

1. Product event или bounded reference/locale fan-out запускает существующий
   Listing item reindex mechanism и canonical item-scoped `eventSequence`.
2. Single/batch workflow получает Catalog/project snapshot, batch-нормализует
   searchable elements локальным Node.js pipeline и строит единый write model: prepared
   text elements, identifiers и surface typo terms vocabulary всех enabled locales. Product
   metadata повторно в search model не копируется.
3. Все search rows входят в deterministic `writeModelHash`.
4. Final writer первым write-side operation блокирует
   `listing_index_item_state` и повторяет canonical stale/noop/conflict decision.
5. Только для `applied` в той же transaction обновляются listing rows, postings,
   prices, sorts, search rows и latest item state.
6. Term vocabulary rows могут быть idempotently upserted независимо от item row
   replacement; они не входят в product membership и stale term безопасен.
7. Ошибка любой physical write откатывает item transaction.
8. Delete каскадно удаляет elements/identifiers и атомарно записывает
   `lifecycle_status=deleted`.
9. Locale removal удаляет отсутствующие locale rows обычным item sync path.
10. Unsupported locale/profile, invalid output или internal normalization error не
    открывает write transaction и переводит item attempt в retryable failure;
    предыдущие search rows остаются.

Отдельного search item workflow, event sequence, tombstone или freshness state
нет.

## 3. Backend data model

Все таблицы tenant-scoped; UUID — UUIDv7; repositories используют
transaction-aware `this.connection` и context store.

### 3.1. Configuration control plane

- `search_settings`: enabled fields, independent numeric field weights, typo
  tolerance, OOS policy и optimistic version;
- synonym и boost tables являются одновременно authoring и runtime source;
- persisted compiled configuration snapshot, global revision, apply job и
  activation state не создаются.

Каждая mutation до transaction выполняет bounded normalization и внешнюю
validation, затем в короткой transaction блокирует только изменяемый resource,
проверяет его optimistic `version`, записывает rows и audit. После commit
инвалидируется только соответствующий cache key:

```text
settings                       -> search:settings:{storeId}
synonyms одного locale         -> search:synonyms:{storeId}:{locale}
один product boost             -> search:boost:{storeId}:{locale}:{boostId}
```

Cache fill читает committed rows и строит только локальную in-memory структуру:
settings object, synonym trie или boost lookup. Эти структуры не записываются в
PostgreSQL и не требуют общей compilation/activation.

### 3.2. Synonyms

Создать `search_synonym_group`, `search_synonym_value` и
`search_synonym_claim`. Claim PK `(store_id, locale, normalized_value)` даёт
DB-level уникальность active value.

Validation: enabled locale, 2–20 unique values, 128 code points/value и bounded
token count. Script batch-нормализует каждое value через текущий локальный
normalization profile до transaction; value без valid primary lexemes, с profile
mismatch или invalid output отклоняется validation error и ничего не записывает.

### 3.3. Product boosts

Создать `search_product_boost`, `search_product_boost_phrase` и
`search_product_boost_product`. MVP: 1–20 phrases, 1–50 products. Phrase — exact
normalized whole query, подготовленный тем же текущим Node.js profile/revision.
Product проверяется tenant-scoped через внешний Catalog contract; cross-service
FK отсутствует. Rules объединяют product set без stacking.

### 3.4. Audit

Append-only `search_configuration_audit` хранит resource type/id/version,
action, before/after JSON, actor, request и timestamp. Raw query, SQL, lexemes,
AST и headers не сохраняются.

Canonical item freshness остаётся в `listing_index_item_state`. Operational
status вычисляется on demand из canonical item/workflow state, доступности
PostgreSQL extensions и metrics; отдельная aggregate database projection не
поддерживается. Reconciliation сверяет text elements, identifiers, vocabulary
coverage, canonical product rows, item state и DBOS state и публикует результат
в observability, а не в отдельную search status table.

## 4. Module and code structure

```text
services/listing/src/search/
  normalization/
    profiles/
    tokenization/
    stemming/
    stopwords/
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
  SearchTextElementRepository.ts
  SearchIdentifierRepository.ts
  SearchTermRepository.ts

services/listing/src/scripts/search/
  SearchSettingsUpdateScript.ts
  SearchSynonymGroup*Script.ts
  SearchProductBoost*Script.ts

services/listing/src/api/graphql-admin/schema/search.graphql
services/listing/src/resolvers/admin/search/
```

Resolvers только decode global IDs, проверяют authorization и вызывают
Scripts/services. Validation/normalization находятся в Scripts; data access — в
repositories. Configuration mutations используют короткие repository
transactions и не запускают DBOS workflow.

## 5. GraphQL backend Listing

Сохранить namespaces `listingQuery.search` и `listingMutation.search`.

Queries:

- `capabilities`;
- `settings`;
- `listing`;
- paginated `synonymGroup(s)`;
- paginated `productBoost(s)`;
- `indexStatus`;
- `overview`.

Mutations:

- `settingsUpdate`;
- synonym group create/update/delete;
- product boost create/update/delete.

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

Technical logs содержат store ID, query hash, locale/scope, загруженные resource
versions, attempt mode, candidate/final cardinalities,
collector, typo flag, branch duration и counts synonyms/boosts. Raw query и
lexemes запрещены.

Metrics:

- primary/fuzzy bundle latency;
- FTS and identifier candidate cardinality;
- trigram vocabulary candidates, Levenshtein verified alternatives и expanded
  FTS candidate cardinality;
- term vocabulary size и stale-term ratio;
- GIN pending-list/search latency и autovacuum lag;
- tenant-scoped composite GIN usage, cross-tenant candidate amplification и
  index size/skew;
- configuration transaction/cache-fill duration и failures;
- indexing lag/failures и общий reconciliation drift.
- normalization single/batch duration, failures, output size,
  contract/profile mismatch и normalization throughput.

Guardrails:

- statement timeout/cancellation на каждой branch;
- no raw `to_tsquery` interpolation;
- no silent truncation;
- no candidate top-K до totals/facets;
- `gin_fuzzy_search_limit = 0`;
- bounded units/alternatives/terms;
- no full tenant term dictionary scan;
- no cross-locale or cross-tenant term lookup;
- no FTS/trigram plan, извлекающий cross-tenant GIN candidates;
- GIN `fastupdate` и pending-list limits фиксируются benchmark-ом, не догадкой.
- normalization input/output limits и fail-closed profile resolution не допускают
  silent cross-locale fallback или вызов PostgreSQL locale dictionaries.

## 7. Пошаговая реализация

### Этап 0. External gates, normalization contract и PostgreSQL baseline

Обязательные gates:

| Gate | Внешний контракт | Критерий |
|---|---|---|
| G1 Product snapshot | Localized product/variant titles, vendor/category names, SKU | Versioned snapshot опубликован |
| G2 Lifecycle events | Content, assignment, publication/delete, variants | Каждое изменение классифицировано в canonical Listing action |
| G3 Reference fan-out | Bounded affected product IDs для rename | Cursor/batch/retry contract определён |
| G4 Text normalization | Versioned Node.js contract, `Intl.Segmenter`, locale-specific `natural` stemmers и profile revisions | Compatibility corpus и runtime contract утверждены |

До этапа 1:

1. Зафиксировать supported PostgreSQL major.
2. Добавить DDL/smoke fixtures для FTS, GIN, `btree_gin`, `pg_trgm`, `fuzzystrmatch` и
   единственной explicit configuration `pg_catalog.simple`.
3. Зафиксировать tenant-scoped composite GIN contracts и `EXPLAIN`-проверки
   применения `store_id` внутри FTS/trigram index condition.
4. Зафиксировать TypeScript contract, profile versioning, single/batch limits,
   deterministic hashing, readiness и error mapping.
5. Проверить normalization profiles `uk/en/ru`: NFKC, apostrophes, diacritics,
   special characters, normalized-token phrase semantics, stems,
   stopwords, surface typo terms, arrays/elements и SKU preservation.
6. Зафиксировать distance-1 corpus и единый безопасный trigram threshold.
7. Подтвердить, что execution role видит required extensions и
   `pg_catalog.simple`.
8. Исправить `CATEGORY + query` для page/total/facets и business sorts.
9. Удалить handle/UUID fallback.

Готовность: unsupported locale/profile не advertised; tenant leakage
отсутствует; raw input parameterized; normalization deterministic; typo prefilter
recall подтверждён corpus-ом.

### Этап 1. Listing search content contract

1. Принять новую версию Catalog snapshot.
2. Добавить `ListingSearchContentSnapshot` и deterministic mapper.
3. Добавить `SearchFieldRegistry` и element identity.
4. Подключить event classification и bounded fan-out.
5. Возвращать capabilities из фактической source readiness.

Готовность: single/batch hydration одинаковы; missing locale не получает
fallback; removed variant/category data исчезает.

### Этап 2. Universal PostgreSQL FTS indexes

1. Удалить initial title-search table и создать непартиционированные
   text/identifier/vocabulary search tables; `product_listing_index`
   остаётся canonical product document.
2. Зафиксировать `pg_catalog.simple` во всех generated expressions и SQL
   compilers; не создавать locale text-search configurations.
3. Добавить tenant-scoped composite GIN FTS/trigram и B-tree identifier indexes;
   отдельный term-to-product mapping не создавать.
4. Добавить `EXPLAIN` fixtures, доказывающие применение bound `store_id` внутри
   composite GIN index condition без cross-tenant candidate scan.
5. Добавить Drizzle models и repositories.
6. Повысить Listing sync write-model version и hash.
7. Записывать search rows только после canonical item-state decision.
8. Добавить reconciliation diagnostics без persisted aggregate state.

Готовность: phrase не пересекает elements; SKU не stemmed; stale/noop не пишет;
failed transaction сохраняет previous search rows/item state; engine не имеет
`ILIKE` fallback.

### Этап 3. Configuration persistence

1. Создать settings, synonym, boost и audit tables; configuration state,
   revision, apply job и persisted runtime snapshot не создавать.
2. Реализовать repositories через `this.connection` и context store.
3. Реализовать отдельную короткую optimistic transaction для каждого settings,
   synonym group и product boost resource.
4. Добавить normalization/validation settings.
5. Записывать audit в той же transaction.
6. Опубликовать GraphQL settings/application state.

### Этап 4. Request configuration и точечные caches

1. Реализовать `SearchRequestConfigurationLoader`, который один раз на request
   загружает settings, synonyms текущего locale и applicable boosts.
2. Batch-нормализовать/валидировать synonym values и boost phrases до write
   transaction и сохранять prepared values в resource rows.
3. Реализовать раздельные cache entries для settings, locale synonyms и каждого
   boost; persisted compiled snapshot не создавать.
4. После commit инвалидировать только cache key изменённого resource.
5. При cache miss строить in-memory synonym trie/boost lookup из committed rows;
   cache fill не изменяет database state.

Готовность: добавление одного boost product не перечитывает и не пересобирает
settings/synonyms/другие boosts; все ветки request используют один загруженный
immutable context; rollback не инвалидирует cache и не меняет serving.

### Этап 5. Normalization pipeline, PRIMARY planner и PostgreSQL FTS compiler

1. Создать engine-neutral AST и limits.
2. Реализовать profile registry, `Intl.Segmenter` adapter, locale-specific
   `natural` stemmers, versioned stopwords и SKU/code-like preservation.
3. Реализовать query normalization и bounded batch document normalization с
   единым deterministic output contract.
4. Реализовать `PostgresFtsQueryCompiler` на `pg_catalog.simple` для
   prepared lexeme/phrase и exact/prefix SKU.
5. Реализовать per-unit matching и multiplicity-neutral rank aggregation.
6. Зафиксировать supported PostgreSQL/normalization contract и full candidate
   relation без top-K.
7. Добавить `EXPLAIN ANALYZE` и cross-language compatibility corpus.

Готовность: exact boolean form сохранена; tenant/locale predicates обязательны;
phrase same-element; ranking deterministic; неготовый или несовместимый
PostgreSQL contract возвращает `SEARCH_INDEX_UNAVAILABLE`.

Unsupported profile, normalization failure или revision mismatch возвращает
`SEARCH_NORMALIZATION_FAILED`; PostgreSQL locale-dictionary и cross-locale
fallback запрещены.

### Этап 6. Canonical Listing executor

1. Создать `SearchExecutionService` и единый request context.
2. Встроить candidates в `productMatches` для GLOBAL/CATEGORY.
3. Обеспечить одинаковую membership algebra для всех branches.
4. Реализовать `SearchCandidateContract`: exact membership bitmap для всех
   branches и ranked relation для relevance page.
5. Сохранить membership bitmap при target isolation/business sort.
6. Пересекать ranked relation с тем же membership bitmap и `productMatches` до
   cursor/limit.
7. Добавить PRIMARY relevance ordering без boosts/OOS policy.

### Этап 7. OOS policy и versioned cursor

1. Реализовать SHOW/HIDE/PLACE_LAST canonical semantics.
2. Добавить conditional availability bucket.
3. Повысить cursor version и включить полный fingerprint/ordering tuple.
4. Реализовать issued-at и expiry cursor без configuration pinning.
5. Проверить pagination для relevance и business sorts, включая допустимые
   пропуски/повторы при изменении configuration или search rows между requests.

### Этап 8. Typo tolerance

1. Реализовать idempotent term vocabulary upsert и bounded stale-term cleanup без
   product mappings, surrogate term ID и sequence.
2. Реализовать `pg_trgm` vocabulary candidate compiler без top-K.
3. Добавить mandatory `levenshtein_less_equal(..., 1)` verifier и Node.js
   normalization verified alternatives в primary lexemes.
4. Компилировать alternatives в expanded FTS `tsquery` и выполнять FUZZY
   membership/rank через существующий `(store_id, search_vector)` GIN.
5. Запускать FUZZY только когда PRIMARY search candidate bitmap после
   `publishedUniverse` пуст, но до category scope и пользовательских filters.
6. После выбора mode выполнять полный result bundle один раз на том же request
   context и immutable `SearchCandidateContract`.
7. Добавить FUZZY cursor ordering и continuation semantics.
8. Добавить timeout, candidate-work и dictionary-scan guardrails.

Готовность: synonym/SKU не typo-expand; все terms обязательны; expanded query
использует canonical FTS GIN; same-element сохраняется; primary/fuzzy sets не
смешиваются; filtered zero при непустом PRIMARY не запускает FUZZY; technical
error — нет.

### Этап 9. Synonyms

1. Создать synonym authoring/value/claim tables.
2. Реализовать Scripts и optimistic concurrency.
3. Собирать locale trie при cache fill из prepared synonym rows.
4. Добавить longest-match-left-to-right и phrase semantics.
5. Опубликовать GraphQL CRUD/diagnostics.

### Этап 10. Product boosts

1. Создать boost/phrase/product tables.
2. Реализовать tenant-scoped product validation.
3. Собирать exact original lookup map при cache fill конкретного boost/locale.
4. Добавить boost-only candidates/cursor/Preview reason.
5. Опубликовать GraphQL CRUD.

### Этап 11. Status и Overview backend

1. Реализовать status service и GraphQL.
2. Вычислять status on demand из canonical item state, DBOS, PostgreSQL
   extensions и observability metrics.
3. Показывать extension/normalization health и фактический backlog/failure.
4. Добавить periodic reconciliation diagnostics без записи aggregate status row.
5. Реализовать Overview composition.

### Этап 12. Hardening и rollout

1. Создать `uk/en/ru` corpus с identifiers, synonyms, OOS, missing locale и
   large candidate sets.
2. Снять `EXPLAIN ANALYZE` matrix для FTS, phrase, category, filters, typo,
   boosts, diagnostics и term dictionary skew.
3. Зафиксировать statement timeouts, GIN/autovacuum policy и trigram threshold.
4. Добавить failure injection для configuration transaction, post-commit cache
   invalidation и item indexing.
5. Проверить privacy и tenant-isolated membership/performance.
6. Включать capabilities по фактически доступным extensions, code-level profiles
   и source contracts без persisted locale readiness row.
7. Удалить title-only/legacy search symbols после перехода.

## 8. Основные Listing touchpoints

| Область | Файлы |
|---|---|
| Search DDL | `services/listing/migrations/domains/0100_listing_index/` |
| Models | `services/listing/src/repositories/models/listingIndex.ts` и новые search models |
| Legacy writer to replace | `services/listing/src/repositories/listing/ProductTitleBm25SearchIndexRepository.ts` |
| Listing write path | `ListingBuildSyncWriteModelScript`, `ListingWriteIndexActionScript`, batch workflow steps |
| Item freshness | `ListingIndexItemStateRepository`, `listing_index_item_state` |
| Candidate SQL | `services/listing/src/repositories/storefront/sql/compileListingProductMatchesSql.ts` |
| Orchestration | `services/listing/src/repositories/storefront/StorefrontListingQueryRepository.ts` |
| Page/cursor | `compilePageQuerySql.ts` и listing request/cursor types |
| Admin GraphQL | `services/listing/src/api/graphql-admin/schema/`, resolvers |
| New search modules | `services/listing/src/search/`, `repositories/search/`, `scripts/search/` |

## 9. Acceptance matrix

| Сценарий | Ожидаемый результат |
|---|---|
| Global query | Полный FTS candidate set, deterministic relevance order |
| Category + query | Page/total/facets ограничены category и query |
| Category + business sort | Query остаётся predicate |
| Query + option + price | Same-variant semantics |
| HIDE + option + price | Один variant одновременно available и соответствует filters |
| Facet target isolation | Search bitmap сохраняется |
| Relevance page | Ranked relation пересекается с тем же membership bitmap до cursor/limit |
| Business sort + query | Использует search membership bitmap без обязательного вычисления rank |
| Draft в FTS/boost | `publishedUniverse` исключает product |
| Phrase variant title | Совпадает только внутри одного variant title element |
| Phrase across variants | Не совпадает |
| Exact/prefix SKU | Identifier tier без stemming/synonym/typo |
| Missing locale title | Нет fallback; SKU ещё может найти product |
| Stemmed primary form | Document и query используют один Node.js profile/revision и PostgreSQL `simple` |
| Stopword-only query | Validation error, не broad listing |
| Normalization failure | `SEARCH_NORMALIZATION_FAILED`, без PostgreSQL locale-dictionary/cross-locale fallback |
| Profile revision mismatch | Rows другой revision исключаются обязательным predicate; cross-profile fallback отсутствует |
| Special tsquery characters | Bound values, без parser injection |
| PRIMARY нашёл candidate, filters исключили его | Пустой PRIMARY Listing; FUZZY не запускается |
| PRIMARY нашёл только draft candidate | Candidate исключён `publishedUniverse`; FUZZY разрешён |
| PRIMARY candidate set пуст | FUZZY запускается до применения Listing filters |
| Query/token короче typo minimum | FUZZY не запускается |
| Typo distance 1 | Vocabulary term подтверждён Levenshtein, normalized alternative включён в expanded FTS query и найден через `search_vector` |
| Typo distance > 1 | Levenshtein verifier исключает candidate |
| SKU typo | Не находится через FUZZY |
| Synonym typo | Synonym alternative не fuzzy-expand |
| FUZZY multi-token | Все original terms обязательны; phrase span same-element |
| Query/AST превышает limit | Validation error без truncation |
| PRIMARY cursor | Только PRIMARY с committed configuration нового request |
| FUZZY cursor | Сразу FUZZY без primary probe с committed configuration нового request |
| Configuration/index изменились между страницами | Continuation остаётся валидной; пропуск или повтор товара допустим |
| Boost-only product | Проходит publication/scope/filters/OOS |
| Boost + business sort | Boost ranking выключен |
| Settings transaction rollback | Committed settings и cache serving не меняются |
| Concurrent update одного resource | Optimistic version conflict; чужие settings/synonyms/boosts не затрагиваются |
| Добавление product в boost | Меняется только boost row и инвалидируется cache этого boost |
| Stale product event | Search rows не меняются |
| GIN unavailable/`simple` contract missing | `SEARCH_INDEX_UNAVAILABLE`, no fallback |
| `gin_fuzzy_search_limit` | `0`, totals/facets не получают random subset |
| Tenant-scoped GIN | FTS/trigram index condition включает bound `store_id`; cross-tenant candidates не извлекаются |
| Expired configuration cursor | `SEARCH_CURSOR_EXPIRED` |

## 10. Definition of Done

- все advertised fields имеют реальный source, текущий code-level normalization
  profile revision и GIN index на `pg_catalog.simple`;
- page/total/facets используют одинаковый membership compilation contract при
  любом scope/sort;
- primary FTS, phrase, identifiers, synonyms, typo tolerance, boosts и OOS
  соблюдают interaction rules;
- typo tolerance использует indexable trigram vocabulary candidates, exact
  Levenshtein verification и expanded FTS по canonical `search_vector` без
  hidden top-K или отдельного product mapping;
- runtime search tables не partitioned, а storefront plans подтверждают
  tenant-scoped composite GIN scan по bound `store_id`;
- configuration mutations атомарны на уровне resource, audit пишется в той же
  transaction, а cache invalidation после commit является точечной;
- persisted global configuration snapshot/apply state отсутствует; document sync
  использует canonical Listing item workflow без дублирующего freshness state;
- optimistic conflict и stale item event не перезаписывают новое состояние;
- status вычисляется из фактических extension/item/workflow/metrics sources без
  persisted aggregate projection;
- GraphQL authorization, pagination, user errors и application states реализованы;
- correctness, failure и performance matrices подтверждены;
- legacy title-only search table/repository/symbols удалены.

## Открытые риски

1. Listing зависит от расширенного Catalog snapshot и reference fan-out.
2. PostgreSQL FTS relevance — `ts_rank_cd`, а не BM25; quality необходимо
   подтвердить corpus-ом.
3. Качество `Intl.Segmenter` + `natural` stemmer различается по locale; каждый profile
   требует собственного compatibility/relevance corpus и не может молча
   использовать profile другого языка.
4. GIN write amplification, pending list и autovacuum могут влиять на latency.
5. Единый trigram threshold обязан сохранять distance-1 recall
   поддерживаемых tokens;
   слишком низкий threshold создаёт большой candidate set.
6. Term vocabulary может иметь сильный tenant/locale skew и требует bounded
   cleanup, indexes и performance corpus; stale terms ухудшают expansion latency,
   но не создают product match без подтверждения canonical FTS index.
7. Hidden candidate cap нарушает exact totals/facets и запрещён.
8. `HIDE` обязан пересекать availability с OPTION/criteria/price до projection.
9. Collection scope нельзя имитировать до canonical listing scope provider.
10. High-frequency rename/locale fan-out требует bounded batching и наблюдаемого
    backlog.
11. `Intl.Segmenter` следует Unicode/ICU boundaries, которые могут не сохранять
    commerce identifiers (`USB-C`, `AB-123`, model codes); они требуют отдельной
    versioned classification/preservation policy и corpus coverage.
12. Общие composite GIN indexes могут иметь tenant skew и write contention;
    tenant-scoped index condition не заменяет per-store performance gates.

## 11. Строгий порядок выполнения по слоям

Следующий порядок нормативный для реализации backend-части Search. Переход к
следующему слою разрешён только после полного завершения и проверки контракта
предыдущего слоя для всего согласованного search data model. Нельзя заранее
создавать SDL, резолверы или временный доступ к БД в обход незавершённых слоёв.

1. **Миграция и физическая база данных.** Сначала добавить handwritten SQL в
   `services/listing/migrations/domains/0100_listing_index/`: extensions,
   непартиционированные таблицы, tenant-scoped composite GIN indexes, generated expressions, constraints,
   indexes и DB-level invariants для search index, configuration, synonyms,
   boosts и audit. Term vocabulary не получает surrogate ID,
   sequence или product mapping: product postings принадлежат только FTS GIN над
   `product_search_text.search_vector`. Таблицы `search_configuration_state`,
   `search_configuration_revision`, `search_configuration_apply_job` и
   `search_runtime_configuration` не создаются. На этом же шаге удалить или заменить
   legacy title-only physical contract. Gate слоя: физическая схема полностью
   определена, tenant isolation и UUIDv7 rules соблюдены, все необходимые
   PostgreSQL contracts выражены в DDL.
2. **Drizzle models.** После фиксации DDL отразить каждую таблицу, колонку,
   constraint-relevant type и relation в
   `services/listing/src/repositories/models/`, добавить `$inferSelect` /
   `$inferInsert` types и exports из model index. Drizzle models обязаны точно
   повторять уже принятую физическую схему; они не подменяют handwritten
   Listing migrations. Gate слоя: ни одна search-таблица или используемая
   колонка не остаётся без типизированной Drizzle model.
3. **Репозитории — каждый отдельно и до конца.** Реализовать репозитории в
   следующем строгом порядке:
   1. `SearchTextElementRepository`;
   2. `SearchIdentifierRepository`;
   3. `SearchTermRepository`;
   4. `SearchSettingsRepository`;
   5. `SearchSynonymRepository`;
   6. `SearchProductBoostRepository`;
   7. изменения существующих `ListingIndexItemStateRepository`,
       `StorefrontListingQueryRepository` и Listing write repositories.

   Каждый repository считается завершённым только когда покрывает весь свой
   read/write contract, использует transaction-aware `this.connection`, всегда
   ограничивает данные текущим `store_id` и подключён к repository aggregator.
   Нельзя переходить к API с частично реализованными repositories или читать
   search tables из scripts/services через raw connection в обход repository.
4. **Изменение GraphQL API SDL.** Только после стабилизации repository contracts
   добавить `search.graphql`: namespaces `listingQuery.search` и
   `listingMutation.search`, queries, mutations, inputs, payloads, connections,
   status/application-state types и обязательные user error codes. После SDL
   обновить generated GraphQL types обычным project codegen flow. Gate слоя:
   subgraph SDL композируется, а generated types полностью описывают новый API.
5. **Резолверы.** Затем реализовать query, mutation, entity, connection и payload
   resolvers в `services/listing/src/resolvers/admin/search/`, подключить их к
   GraphQL resolver registry и Casbin permissions. Резолверы только декодируют
   global IDs, выполняют authorization, формируют resolver objects и делегируют
   операцию в Script/service; validation, normalization и data access в
   резолверы не переносятся.
6. **Интеграция с репозиториями.** Последним шагом связать готовые резолверы через
   Scripts/services и, только где требуется durable orchestration, DBOS workflows
   с готовыми repositories и включить их в canonical Listing flows:
   configuration transactions/cache invalidation, item indexing,
   search execution, synonyms, boosts, status и overview. Нормативная цепочка
   вызова: `GraphQL resolver -> Script/service/workflow -> Repository -> DB`;
   прямой вызов repository или raw SQL из GraphQL resolver запрещён. Gate слоя:
   каждый SDL operation достигает нужного repository только через свой
   application contract, а write operations сохраняют transaction, stale-event
   и tenant-isolation invariants.

Итоговая последовательность без исключений:

`миграция/БД -> Drizzle models -> каждый repository -> GraphQL SDL/codegen -> resolvers -> интеграция Scripts/services/workflows с repositories`.
