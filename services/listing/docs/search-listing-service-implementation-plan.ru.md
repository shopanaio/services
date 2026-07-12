# План реализации Search в Listing service

## Статус и назначение

План описывает search runtime Listing service на стандартном PostgreSQL Full
Text Search, универсальной configuration `pg_catalog.simple` и встроенном
Node.js normalization pipeline на `Intl.Segmenter` + `natural`. PostgreSQL не
выполняет locale-specific stemming или stopword filtering: документы, запросы,
synonyms и boost phrases проходят один versioned normalization profile до записи
или compilation.
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
- high-cardinality runtime search tables изначально hash-partitioned
  по `store_id` и используют aligned partition layout;
- Node.js normalization pipeline выполняет Unicode normalization,
  locale-aware tokenization через `Intl.Segmenter`, stemming через locale-specific
  stemmer из `natural` и stopword filtering для всех supported locales;
- PostgreSQL для всех locale использует только explicit `pg_catalog.simple` над
  уже подготовленным текстом;
- `ts_rank_cd` вычисляет внутренний deterministic relevance rank, но не
  объявляется BM25 score;
- SKU ищется отдельными exact/prefix predicates и B-tree indexes;
- typo tolerance использует `pg_trgm` для индексируемого отбора терминов и
  `fuzzystrmatch.levenshtein_less_equal` для окончательной проверки distance `1`;
- canonical listing bitmap pipeline остаётся источником истины для publication,
  navigation scope, same-variant filters, prices, availability, totals и facets;
- listing вызывает `SearchExecutionService`;
- settings, synonyms и boosts применяются из текущей atomically activated runtime configuration;
- typo-tolerant search выбирается только когда PRIMARY search candidate set после
  обязательного `publishedUniverse` пуст, но до применения category scope,
  facets, price, availability и других пользовательских Listing filters;
- search indexes обновляются существующим event-driven listing workflow;
- backend публикует Admin GraphQL для управления, Preview и status;
- все ветки одного request используют один загруженный runtime configuration
  snapshot и один фактический PostgreSQL search contract;
- все ветки одной search attempt используют один execution mode.
- query обслуживается только normalization contract/profile revision, для которой
  активный locale index имеет состояние `READY`.

## PostgreSQL search stack

Обязательный database contract:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
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
11. Pending/failed authoring revision не влияет на listing до atomic activation.
12. Listing не раскрывает SQL, AST, internal weights, `ts_rank_cd`, trigram
    similarity или edit distance.
13. Search indexes подчиняются canonical `listing_index_item_state`: stale и
    noop action не изменяют physical rows, а stale Catalog event/snapshot не
    может откатить latest item state или воскресить удалённые search rows.
14. Phrase совпадает только внутри одного logical field element. Текст разных
    variants/categories и разных fields не может совместно удовлетворить phrase.
15. Typo candidate prefilter не может превращаться в hidden top-K. Все прошедшие
    зафиксированный trigram predicate кандидаты проверяются Levenshtein и участвуют
    в exact Listing totals/facets.
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
    `store_id = $boundStoreId`, позволяющий PostgreSQL pruning всех
    нецелевых hash partitions. Scan всех tenant partitions в storefront
    request запрещён.

## Целевая схема выполнения

```text
Listing
  -> normalize locale/query/input
  -> resolve one SearchRequestContext from the active runtime configuration
  -> normalize query через versioned Node.js normalization profile
  -> validate profile revision against active locale index
  -> build safe SearchQueryPlan
  -> derive PRIMARY SearchAttemptContext
  -> compile PostgreSQL PRIMARY candidates and intersect with publishedUniverse
  -> materialize PRIMARY search-visible candidate bitmap
  -> when PRIMARY search candidate bitmap is empty and typo tolerance is allowed:
       derive FUZZY SearchAttemptContext from the same request context
       compile pg_trgm term candidates + exact Levenshtein verification
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
3. применить Unicode NFKC;
4. trim и collapse Unicode whitespace;
5. ограничить display query 128 Unicode code points;
6. построить locale-aware case-folded `lookupKey`;
7. вычислить tenant-scoped query hash через length-prefixed tuple;
8. сегментировать normalized text через `Intl.Segmenter(locale, { granularity:
   'word' })`, сохранив source order, offsets и `isWordLike`;
9. классифицировать SKU/code-like/mixed-script tokens, применить versioned
   stopwords и locale-specific stemmer из `natural` только к searchable language
   tokens;
10. проверить output limits, contract version, locale/profile revision и
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
отдельные normalized surface typo terms. Primary lexemes получаются тем же
locale profile revision, которым построены document vectors. Surface typo term
не заменяется stem: это сохраняет корректный Levenshtein contract для
опечаток. PostgreSQL не является источником lexicalization.

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
  readonly runtimeConfiguration: CompiledSearchRuntimeConfiguration;
  readonly diagnosticsMode: "NONE" | "PREVIEW";
}

interface SearchAttemptContext {
  readonly request: SearchRequestContext;
  readonly mode: "PRIMARY" | "FUZZY";
}
```

Request без cursor всегда начинает с `PRIMARY`. Если materialized PRIMARY
search candidate bitmap после `publishedUniverse` пуст, но до category scope и
пользовательских filters, и typo tolerance разрешён, создаётся `FUZZY` attempt со
ссылкой на тот же request context. Continuation выполняет только mode из cursor
и не делает повторный PRIMARY probe.

Active runtime configuration загружается один раз при создании request context и
используется всеми ветками текущего request. Cursor не закрепляет configuration:
continuation использует runtime configuration, активную на момент нового request.
Физический search index не версионируется.

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
```

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
- GIN index на `search_vector`;
- `ts_rank_cd` с fixed field weights;
- отдельную identifier relation для SKU exact/prefix.

Начальные веса `ts_rank_cd`:

```text
A = product title = 8
B = variant title = 5
C = vendor name   = 2
D = category name = 1
```

PostgreSQL принимает четыре weight classes, поэтому physical field element
получает ровно одну class. Веса являются code constants, не Admin settings.

Rank product вычисляется без multiplicity bias:

```text
unit_rank = MAX(rank всех alternatives/elements одного required unit)
relevance_rank = SUM(unit_rank по satisfied required units)
```

Количество variants/categories не должно само по себе повышать product rank.
`NULL`, NaN и infinite rank завершают attempt как engine error.

Compiler обязан параметризовать values, помещать `store_id` и locale predicates
в каждый text/identifier/term subquery и не иметь `ILIKE` fallback. Lexeme arrays
используются для validation/limits, но не сериализуются в raw `to_tsquery` syntax.
Prepared text принимается только из validated normalization output; исходный
пользовательский text никогда не передаётся в PostgreSQL FTS functions.

### 1.5. Typo compiler

`PostgresTypoQueryCompiler` работает только в `FUZZY` mode:

1. Берёт только original `typoTerms`; synonym и SKU не расширяются.
2. Ищет tenant/locale term candidates через `pg_trgm` operator и GIN.
3. Применяет length band `abs(char_length(term)-char_length(input)) <= 1`.
4. Для каждого кандидата обязательно проверяет
   `levenshtein_less_equal(term, input, 1) <= 1`.
5. Требует совпадения всех terms обязательного unit.
6. Для multi-token unit требует один `field + element_id`.
7. Агрегирует element matches в product relation без `LIMIT`/top-K.

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
primary_fts_rank DESC
product_id ASC
```

`primary_fts_rank` является optional secondary signal по exact surviving lexemes;
он не меняет fuzzy membership.

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

FUZZY использует аналогичную relation из verified term matches. Boost lookup
остаётся exact по original `lookupKey + locale` и не активируется исправленной
формой.

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
  minimum_trigram_similarity, primary_fts_rank
```

Ranked relation не определяет membership самостоятельно: page всегда пересекает
её `product_doc_id` с `membershipBitmap`, затем с canonical `productMatches` и
только после этого применяет ordering/cursor/limit. Она не передаётся в Node.js
как unbounded array и не используется `totalCount` или facets. При business sort
page использует только `membershipBitmap`; search rank keys не вычисляются, если
они не нужны для diagnostics.

Повторная SQL compilation ranked relation обязана использовать те же immutable
request context, attempt mode, runtime revision и query plan. Она не может
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
6. Continuation выполняет только mode cursor с active configuration нового request
   и materialize-ит candidate bitmap этого mode без дополнительного probe.

Решение о FUZZY принимается исключительно по пустоте опубликованного PRIMARY
search candidate bitmap. Итоговый `totalCount`, длина page и причины исключения
кандидатов пользовательскими Listing filters на выбор mode не влияют.

### 1.10. Synonyms

Active runtime configuration хранит locale-scoped token trie. Expander применяет
longest-match-left-to-right. Multi-token synonym становится одним semantic unit;
phrase должна совпасть целиком в одном field element. Группы двунаправленные.

Synonyms компилируются application planner-ом, а не PostgreSQL thesaurus, чтобы
они оставались immutable частью atomically activated runtime configuration. Synonyms
не меняют identifier clauses, не получают typo expansion и не активируют boosts
другой phrase.

Каждое synonym value нормализуется локальным Node.js pipeline при configuration
apply. Compiled runtime revision хранит prepared lexemes, contract version и
profile revision; изменение normalization profile требует повторной compilation до
activation.

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
primary_fts_rank DESC
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
Cursor не обязан закреплять runtime configuration revision или snapshot search
index. Continuation использует configuration и committed index state, актуальные
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
    const candidates = await materializeSearchCandidates({
      request,
      attempt: { request, mode: "FUZZY" },
      plan: buildTypoPlan(primaryPlan),
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
    !request.runtimeConfiguration.typoToleranceEnabled ||
    !canRunTypoAttempt(request.lexicalizedQuery)
  ) {
    return runFullBundle({
      request,
      attempt: { request, mode: "PRIMARY" },
      candidates: primaryCandidates,
      input,
    });
  }

  const fuzzyCandidates = await materializeSearchCandidates({
    request,
    attempt: { request, mode: "FUZZY" },
    plan: buildTypoPlan(primaryPlan),
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

#### Tenant partitioning

High-cardinality runtime search tables создаются как aligned PostgreSQL
hash-partitioned tables по `store_id`:

- `product_search_text`;
- `product_search_identifier`;
- `search_term_dictionary`;
- `product_search_term`.

Начальный `SEARCH_RUNTIME_PARTITION_COUNT` равен `32`. Все четыре
таблицы используют одинаковые modulus/remainder bounds, чтобы rows
одного store попадали в одинаковый partition ordinal. Изменение
partition count требует controlled rebuild и не является runtime setting.

```sql
CREATE TABLE listing.product_search_text (
  ...
) PARTITION BY HASH (store_id);

CREATE TABLE listing.product_search_text_p00
  PARTITION OF listing.product_search_text
  FOR VALUES WITH (MODULUS 32, REMAINDER 0);
-- p01 ... p31
```

Каждая text partition имеет локальный GIN на `search_vector` и B-tree
scope index:

```text
(store_id, locale, normalization_contract_version,
 normalization_profile_revision, field)
```

Dictionary partitions имеют локальный `gin_trgm_ops` на `term` и B-tree
на tenant/locale/revision. Identifier и mapping partitions имеют локальные
indexes, описанные ниже. Primary/unique keys всегда включают
partition key `store_id`.

`search_term_dictionary` использует composite primary key
`(store_id, term_id)`, а не global `term_id` PK. `term_id` выделяется общей
explicit PostgreSQL sequence для всех partitions, но database identity и FK
contract включают `store_id`.

Bound `store_id` передаётся как uuid без function/cast на partition column,
чтобы plan-time или execution-time partition pruning оставлял одну
partition каждой runtime table. Partitioning ограничивает cross-tenant
work, но не делит один крупный store: per-store scale по-прежнему
проверяется отдельно.

#### Canonical product document

Отдельная `product_search_document` не создаётся. Canonical product document —
существующая `listing.product_listing_index`. Search не копирует `kind`,
`status`, publication timestamps, product timestamps, revision или lifecycle
state. Publication, scope, product identity и `product_doc_id` всегда берутся из
canonical Listing pipeline.

Search tables являются только специализированными locale-scoped indexes. Они
хранят `product_doc_id` как денормализованный bitmap key, но защищают его
composite FK:

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
`setweight(to_tsvector('pg_catalog.simple', prepared_text), weightFor(field))`;
GIN index создаётся на vector. Weight однозначно выводится из field registry и
отдельно в row не хранится. Query relation всегда фильтрует active contract/model
revision вместе с `store_id` и locale.

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

#### Typo term dictionary и mapping

```text
listing.search_term_dictionary
  term_id bigint not null default nextval('listing.search_term_id_seq')
  store_id uuid not null
  locale varchar(8) not null
  term text not null
  code_point_length smallint not null
  normalization_contract_version varchar(32) not null
  normalization_profile_revision varchar(64) not null

  UNIQUE (
    store_id,
    locale,
    normalization_contract_version,
    normalization_profile_revision,
    term
  )
  PK (store_id, term_id)
  UNIQUE (store_id, locale, term_id)

listing.product_search_term
  store_id uuid not null
  product_id uuid not null
  product_doc_id int not null
  locale varchar(8) not null
  field varchar(32) not null
  element_id uuid not null
  term_id bigint not null

  PK (store_id, product_id, locale, field, element_id, term_id)
  FK (store_id, product_doc_id, product_id)
    -> product_listing_index(store_id, product_doc_id, product_id)
  FK (store_id, locale, term_id)
    -> search_term_dictionary(store_id, locale, term_id)
```

Dictionary `term` индексируется `gin_trgm_ops`; tenant/locale/revision B-tree index
разрешает BitmapAnd или tenant prefilter. Mapping имеет indexes по `term_id` и
`product_doc_id`. Surface typo terms формируются локальным pipeline отдельно от
primary stems, затем deduplicate и stable sort. Orphan dictionary terms
удаляются bounded cleanup-ом и не влияют на correctness.

Наличие localized title определяется существованием `field=product_title`
element; отдельный per-product coverage row не создаётся. Aggregate coverage
вычисляется reconciliation и хранится только в `search_index_locale_state`.

Один giant concatenated text column как единственный source запрещён: он ломает
same-element phrase semantics и создаёт ranking bias по числу values.

### 2.3. Write lifecycle

1. Product event или bounded reference/locale fan-out запускает существующий
   Listing item reindex mechanism и canonical item-scoped `eventSequence`.
2. Single/batch workflow получает Catalog/project snapshot, batch-нормализует
   searchable elements локальным Node.js pipeline и строит единый write model: prepared
   text elements, identifiers и surface typo terms всех enabled locales. Product
   metadata повторно в search model не копируется.
3. Все search rows входят в deterministic `writeModelHash`.
4. Final writer первым write-side operation блокирует
   `listing_index_item_state` и повторяет canonical stale/noop/conflict decision.
5. Только для `applied` в той же transaction обновляются listing rows, postings,
   prices, sorts, search rows и latest item state.
6. Term dictionary rows могут быть upserted до mapping replacement, но mapping и
   item state меняются атомарно; orphan term безопасен.
7. Ошибка любой physical write откатывает item transaction.
8. Delete каскадно удаляет elements/identifiers/mappings и атомарно записывает
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

- `search_configuration_state`: desired/active/applying revisions и apply status;
- `search_settings`: enabled fields, typo tolerance, OOS policy и optimistic version;
- `search_configuration_revision`: immutable authoring JSON и checksum;
- `search_configuration_apply_job`: durable outbox/recovery row;
- `search_runtime_configuration`: compiled settings, synonym trie, boost map и
  activation metadata.

Authoring mutation атомарно блокирует state, проверяет optimistic version,
увеличивает desired revision, сохраняет snapshot, audit и apply job. Activation
выполняется CAS по desired revision. Failed/superseded revision не меняет active
pointer.

### 3.2. Synonyms

Создать `search_synonym_group`, `search_synonym_value` и
`search_synonym_claim`. Claim PK `(store_id, locale, normalized_value)` даёт
DB-level уникальность active value.

Validation: enabled locale, 2–20 unique values, 128 code points/value и bounded
token count. Runtime compiler batch-нормализует каждое value через active локальный
normalization profile; value без valid primary lexemes, с revision mismatch или
invalid output отклоняется safe compile error.

### 3.3. Product boosts

Создать `search_product_boost`, `search_product_boost_phrase` и
`search_product_boost_product`. MVP: 1–20 phrases, 1–50 products. Phrase — exact
normalized whole query, подготовленный тем же active Node.js profile/revision.
Product проверяется tenant-scoped через внешний Catalog contract; cross-service
FK отсутствует. Rules объединяют product set без stacking.

### 3.4. Audit

Append-only `search_configuration_audit` хранит revision, resource/action,
before/after JSON, actor, request и timestamp. Raw query, SQL, lexemes, AST и
headers не сохраняются.

### 3.5. Index state

- `search_index_state`: `READY/UPDATING/FAILED`, last attempt/success, safe error
  и counters;
- `search_index_locale_state`: expected/indexed/published products, localized
  title coverage, text/identifier/term readiness, active normalization contract
  version/profile revision и synchronization progress.

Canonical item freshness остаётся в `listing_index_item_state`. Search state —
только aggregate operational projection. Reconciliation сверяет text elements,
identifiers, term mappings, canonical product rows, item state и DBOS state.

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
  SearchConfigurationRevisionRepository.ts
  SearchConfigurationApplyJobRepository.ts
  SearchRuntimeConfigurationRepository.ts
  SearchTextElementRepository.ts
  SearchIdentifierRepository.ts
  SearchTermRepository.ts
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
Scripts/services. Validation/normalization находятся в Scripts; data access — в
repositories; durable orchestration — в DBOS workflows.

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

Technical logs содержат store ID, query hash, locale/scope, runtime revision,
attempt mode, candidate/final cardinalities,
collector, typo flag, branch duration и counts synonyms/boosts. Raw query и
lexemes запрещены.

Metrics:

- primary/fuzzy bundle latency;
- FTS and identifier candidate cardinality;
- trigram dictionary candidates и Levenshtein verified candidates;
- term dictionary/mapping size;
- GIN pending-list/search latency и autovacuum lag;
- runtime partition pruning, partitions scanned и per-partition GIN size/skew;
- configuration apply duration/failures;
- indexing lag/failures/locale coverage.
- normalization single/batch duration, failures, output size,
  contract/profile mismatch и per-locale throughput.

Guardrails:

- statement timeout/cancellation на каждой branch;
- no raw `to_tsquery` interpolation;
- no silent truncation;
- no candidate top-K до totals/facets;
- `gin_fuzzy_search_limit = 0`;
- bounded units/alternatives/terms;
- no full tenant term dictionary scan;
- no cross-locale or cross-tenant term lookup;
- no storefront scan более одной aligned runtime partition на table;
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
2. Добавить DDL/smoke fixtures для FTS, GIN, `pg_trgm`, `fuzzystrmatch` и
   единственной explicit configuration `pg_catalog.simple`.
3. Зафиксировать aligned hash partition layout с modulus `32` и
   smoke-проверку partition pruning для bound `store_id`.
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

### Этап 2. Universal PostgreSQL FTS indexes и index state

1. Удалить initial title-search table и создать aligned hash-partitioned
   text/identifier/dictionary/mapping search tables; `product_listing_index`
   остаётся canonical product document.
2. Зафиксировать `pg_catalog.simple` во всех generated expressions и SQL
   compilers; не создавать locale text-search configurations.
3. Добавить GIN FTS/trigram и B-tree identifier/mapping indexes.
4. Добавить partition-local scope indexes и `EXPLAIN` fixtures, доказывающие
   pruning до одной partition на runtime table.
5. Добавить Drizzle models и repositories.
6. Повысить Listing sync write-model version и hash.
7. Записывать search rows только после canonical item-state decision.
8. Добавить aggregate index/locale state и reconciliation.

Готовность: phrase не пересекает elements; SKU не stemmed; stale/noop не пишет;
failed transaction сохраняет previous search rows/item state; engine не имеет
`ILIKE` fallback.

### Этап 3. Configuration persistence

1. Создать configuration/settings/revision/job/runtime/audit tables.
2. Реализовать repositories через `this.connection` и context store.
3. Реализовать optimistic authoring transaction.
4. Добавить normalization/validation settings.
5. Опубликовать GraphQL settings/application state.

### Этап 4. Configuration apply и runtime revisions

1. Реализовать DBOS apply workflow с retry, CAS activation и coalescing.
2. Компилировать immutable runtime configuration.
3. Batch-нормализовать/валидировать synonym values через active локальный profile.
4. Реализовать cache active runtime configuration с invalidation после activation.
5. Добавить recovery apply jobs и safe compile errors.

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
   пропуски/повторы при изменении configuration или index state между requests.

### Этап 8. Typo tolerance

1. Реализовать term dictionary/mapping write path.
2. Реализовать `pg_trgm` candidate compiler без top-K.
3. Добавить mandatory `levenshtein_less_equal(..., 1)` verifier.
4. Запускать FUZZY только когда PRIMARY search candidate bitmap после
   `publishedUniverse` пуст, но до category scope и пользовательских filters.
5. После выбора mode выполнять полный result bundle один раз на том же request
   context и immutable `SearchCandidateContract`.
6. Добавить FUZZY cursor ordering и continuation semantics.
7. Добавить timeout, candidate-work и dictionary-scan guardrails.

Готовность: synonym/SKU не typo-expand; все terms обязательны; same-element
сохраняется; primary/fuzzy sets не смешиваются; filtered zero при непустом PRIMARY
не запускает FUZZY; technical error — нет.

### Этап 9. Synonyms

1. Создать synonym authoring/value/claim tables.
2. Реализовать Scripts и optimistic concurrency.
3. Компилировать locale trie в runtime revision.
4. Добавить longest-match-left-to-right и phrase semantics.
5. Опубликовать GraphQL CRUD/diagnostics.

### Этап 10. Product boosts

1. Создать boost/phrase/product tables.
2. Реализовать tenant-scoped product validation.
3. Компилировать exact original lookup map.
4. Добавить boost-only candidates/cursor/Preview reason.
5. Опубликовать GraphQL CRUD.

### Этап 11. Index Status и Overview backend

1. Реализовать status service и GraphQL.
2. Связать status с canonical item state, DBOS и PostgreSQL search health.
3. Разделить extension/normalization health, locale/profile readiness, field readiness
   и backlog/failure.
4. Добавить periodic counter reconciliation.
5. Реализовать Overview composition.

### Этап 12. Hardening и rollout

1. Создать `uk/en/ru` corpus с identifiers, synonyms, OOS, missing locale и
   large candidate sets.
2. Снять `EXPLAIN ANALYZE` matrix для FTS, phrase, category, filters, typo,
   boosts, diagnostics и term dictionary skew.
3. Зафиксировать statement timeouts, GIN/autovacuum policy и trigram threshold.
4. Добавить failure injection для config apply и item indexing.
5. Проверить privacy и tenant-isolated membership/performance.
6. Включать capabilities только после readiness.
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
| Profile revision mismatch | Query fail-closed до READY/atomic activation соответствующего locale index |
| Special tsquery characters | Bound values, без parser injection |
| PRIMARY нашёл candidate, filters исключили его | Пустой PRIMARY Listing; FUZZY не запускается |
| PRIMARY нашёл только draft candidate | Candidate исключён `publishedUniverse`; FUZZY разрешён |
| PRIMARY candidate set пуст | FUZZY запускается до применения Listing filters |
| Query/token короче typo minimum | FUZZY не запускается |
| Typo distance 1 | Trigram candidate подтверждён Levenshtein и найден |
| Typo distance > 1 | Levenshtein verifier исключает candidate |
| SKU typo | Не находится через FUZZY |
| Synonym typo | Synonym alternative не fuzzy-expand |
| FUZZY multi-token | Все original terms обязательны; phrase span same-element |
| Query/AST превышает limit | Validation error без truncation |
| PRIMARY cursor | Только PRIMARY с active configuration нового request |
| FUZZY cursor | Сразу FUZZY без primary probe с active configuration нового request |
| Configuration/index изменились между страницами | Continuation остаётся валидной; пропуск или повтор товара допустим |
| Boost-only product | Проходит publication/scope/filters/OOS |
| Boost + business sort | Boost ranking выключен |
| Settings apply fail | Previous active revision serving |
| Concurrent revisions N/N+1 | N не активируется после N+1 |
| Stale product event | Search rows не меняются |
| GIN unavailable/`simple` contract missing | `SEARCH_INDEX_UNAVAILABLE`, no fallback |
| `gin_fuzzy_search_limit` | `0`, totals/facets не получают random subset |
| Tenant partition pruning | Каждая runtime table читает только partition bound `store_id` |
| Expired configuration cursor | `SEARCH_CURSOR_EXPIRED` |

## 10. Definition of Done

- все advertised fields имеют реальный source, ready normalization profile
  revision и GIN index на `pg_catalog.simple`;
- page/total/facets используют одинаковый membership compilation contract при
  любом scope/sort;
- primary FTS, phrase, identifiers, synonyms, typo tolerance, boosts и OOS
  соблюдают interaction rules;
- typo tolerance использует indexable trigram candidates и exact Levenshtein
  verification без hidden top-K;
- runtime search tables имеют aligned hash partitioning, а storefront plans
  подтверждают pruning до одной partition на table;
- configuration apply имеет durable state machine, а document sync использует
  canonical Listing item workflow без дублирующего freshness state;
- stale revision/event не активируют устаревшее состояние;
- status честно показывает extension/normalization/index/locale readiness;
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
6. Term dictionary может иметь сильный tenant/locale skew и требует bounded
   cleanup, indexes и performance corpus.
7. Hidden candidate cap нарушает exact totals/facets и запрещён.
8. `HIDE` обязан пересекать availability с OPTION/criteria/price до projection.
9. Collection scope нельзя имитировать до canonical listing scope provider.
10. High-frequency rename/locale fan-out требует bounded batching и наблюдаемого
    backlog.
11. `Intl.Segmenter` следует Unicode/ICU boundaries, которые могут не сохранять
    commerce identifiers (`USB-C`, `AB-123`, model codes); они требуют отдельной
    versioned classification/preservation policy и corpus coverage.
12. Fixed hash modulus может дать skew между partitions; его изменение требует
    controlled rebuild. Partitioning по `store_id` не разбивает rows одного very
    large store и не заменяет per-store performance gates.
