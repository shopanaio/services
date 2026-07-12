# План реализации Python Text Normalizer с gRPC API

## Статус и назначение

Документ описывает отдельный stateless Python-сервис языковой подготовки текста
для Listing search. Сервис выполняет Unicode normalization, locale-aware
tokenization, lemmatization/stemming, stopword filtering, подготовку surface
terms для typo tolerance и query-only spell correction.

Сервис не является search engine, не подключается к Neon/PostgreSQL, не владеет
tenant/store data, synonyms, boosts, ranking или search configuration. Listing
остаётся единственным владельцем search runtime, индекса и результата.

Целевое размещение исходников:

```text
services/text-normalizer/
```

Proto contract должен находиться в общем versioned contracts package, доступном
Python server и generated TypeScript client. Копии `.proto` в двух сервисах
запрещены.

## Целевой результат

- один gRPC API для document, query, synonym и boost normalization;
- одинаковый normalizer contract для всех supported locales;
- locale-specific profiles скрыты за единым интерфейсом;
- deterministic output при одинаковых input, contract version и model revision;
- отдельные primary lexemes и surface typo terms;
- bounded spell candidates для query с confidence и explainable token changes;
- unary API для query и bounded batch API для indexing/configuration apply;
- model загружается один раз при старте worker;
- readiness публикуется только после загрузки и self-check всех configured
  profiles;
- rolling model update не смешивает revisions в serving index;
- raw text и lexemes не попадают в production logs/metrics.

## Архитектурные границы

```text
Catalog snapshot
  -> Listing deterministic mapper
  -> TextNormalizer.NormalizeBatch
  -> Listing write model
  -> PostgreSQL to_tsvector('pg_catalog.simple', prepared_text)

Storefront query
  -> Listing structural normalization and limits
  -> TextNormalizer.Normalize
  -> Listing query plan
  -> PostgreSQL plainto_tsquery/phraseto_tsquery('pg_catalog.simple', ...)

Final PRIMARY zero
  -> TextNormalizer.CorrectQuery
  -> Listing tenant/catalog validation and confidence policy
  -> TextNormalizer.Normalize(corrected query)
  -> полный corrected Listing bundle
```

Listing выполняет tenant authorization, request hashing, limits public input,
identifier/SKU normalization и search orchestration. Python service видит только
opaque request/item IDs, locale, purpose и bounded text.

## Обязательные инварианты

1. `storeId`, user/customer identity и authorization metadata не передаются.
2. Одинаковый `(contractVersion, profileId, modelRevision)` используется для
   document, query, synonym и boost normalization одного serving locale index.
3. Unsupported locale возвращает ошибку; language fallback отсутствует.
4. Primary lexeme и typo term не могут быть пустыми, содержать whitespace,
   control characters или превышать protocol limits.
5. Порядок semantic units и lexemes deterministic и соответствует source order.
6. Stopwords удаляются из primary lexemes симметрично для documents и queries.
7. Surface typo terms не заменяются lemma/stem и не создаются из synonyms.
8. Numbers, product codes и foreign-script tokens сохраняются по profile policy;
   сервис не угадывает SKU и brand identity.
9. Batch response содержит ровно один result либо item error для каждого unique
   request item ID; missing/duplicate IDs являются protocol error.
10. Partial batch success не записывается Listing writer-ом: write model
    принимается только после валидации всего required batch.
11. Raw text не логируется. Безопасные diagnostics используют request ID,
    locale/profile, lengths, counts, duration и error code.
12. Сервис не делает network calls в NLP pipeline и не загружает model во время
    request.
13. Output hash вычисляется по canonical length-prefixed representation, а не по
    нестабильной JSON serialization.
14. Изменение tokenization, normalization, stopwords или model означает новую
    model revision либо contract version; mutable in-place update запрещён.
15. Spell correction применяется только к storefront query после final PRIMARY
    zero; documents, synonyms, boosts и non-zero query автоматически не
    исправляются.
16. Brand, SKU, model name, abbreviation и явно protected source unit не
    исправляются.
17. Correction возвращает bounded candidates, confidence и edit metadata, но не
    принимает окончательное решение: Listing проверяет tenant catalog match и
    применяет policy.
18. Spell correction выполняется над surface forms до lemmatization. Исправленный
    query повторно проходит обычный `Normalize` с той же model revision.
19. Correction не выполняет synonym expansion, transliteration или свободное
    paraphrasing и не может генерировать token вне versioned dictionary.

## 1. gRPC contract

### 1.1. Service API

Начальный proto:

```proto
syntax = "proto3";

package shopana.textnormalizer.v1;

service TextNormalizerService {
  rpc Normalize(NormalizeRequest) returns (NormalizeResponse);
  rpc NormalizeBatch(NormalizeBatchRequest) returns (NormalizeBatchResponse);
  rpc CorrectQuery(CorrectQueryRequest) returns (CorrectQueryResponse);
  rpc GetCapabilities(GetCapabilitiesRequest) returns (GetCapabilitiesResponse);
}

enum NormalizationPurpose {
  NORMALIZATION_PURPOSE_UNSPECIFIED = 0;
  NORMALIZATION_PURPOSE_DOCUMENT = 1;
  NORMALIZATION_PURPOSE_QUERY = 2;
  NORMALIZATION_PURPOSE_SYNONYM = 3;
  NORMALIZATION_PURPOSE_BOOST = 4;
}

message NormalizeRequest {
  string request_id = 1;
  string locale = 2;
  string text = 3;
  NormalizationPurpose purpose = 4;
  string required_contract_version = 5;
  string required_model_revision = 6;
}

message NormalizeResponse {
  string request_id = 1;
  string locale = 2;
  string profile_id = 3;
  string contract_version = 4;
  string model_revision = 5;
  repeated LexicalUnit units = 6;
  string prepared_text = 7;
  string output_hash = 8;
}

message LexicalUnit {
  uint32 source_index = 1;
  string source_text = 2;
  repeated string primary_lexemes = 3;
  repeated string typo_terms = 4;
  bool stopword = 5;
}

message NormalizeBatchRequest {
  repeated NormalizeRequest items = 1;
}

message NormalizeBatchResponse {
  repeated NormalizeBatchItem items = 1;
}

message NormalizeBatchItem {
  string request_id = 1;
  oneof outcome {
    NormalizeResponse result = 2;
    ItemError error = 3;
  }
}

message ItemError {
  string code = 1;
  string safe_message = 2;
  bool retryable = 3;
}

message GetCapabilitiesRequest {}

message GetCapabilitiesResponse {
  string service_version = 1;
  string contract_version = 2;
  repeated ProfileCapability profiles = 3;
  NormalizerLimits limits = 4;
}

message ProfileCapability {
  string locale = 1;
  string profile_id = 2;
  string model_revision = 3;
  bool ready = 4;
  repeated NormalizationPurpose purposes = 5;
}

message NormalizerLimits {
  uint32 max_unary_code_points = 1;
  uint32 max_batch_items = 2;
  uint32 max_batch_code_points = 3;
  uint32 max_units_per_item = 4;
  uint32 max_lexemes_per_item = 5;
}

message CorrectQueryRequest {
  string request_id = 1;
  string locale = 2;
  string text = 3;
  repeated uint32 protected_source_indices = 4;
  string required_contract_version = 5;
  string required_model_revision = 6;
  string required_dictionary_revision = 7;
  uint32 max_candidates = 8;
}

message CorrectQueryResponse {
  string request_id = 1;
  string locale = 2;
  string contract_version = 3;
  string model_revision = 4;
  string dictionary_revision = 5;
  repeated CorrectionCandidate candidates = 6;
}

message CorrectionCandidate {
  string corrected_text = 1;
  double confidence = 2;
  repeated TokenCorrection changes = 3;
}

message TokenCorrection {
  uint32 source_index = 1;
  string original = 2;
  string corrected = 3;
  uint32 edit_distance = 4;
}
```

`prepared_text` является canonical join ordered primary lexemes через один ASCII
space. Listing перепроверяет, что оно совпадает с units и не доверяет ему как
невалидированному opaque text.

`source_text` нужен только для построения typed semantic units внутри Listing и
не должен содержать больше bounded исходного token span. Если planner может
работать только по indices, поле следует удалить из proto до стабилизации v1.

### 1.2. Capabilities

`GetCapabilities` возвращает:

- service/contract version;
- supported canonical locales;
- `profileId` и immutable `modelRevision` для каждой locale;
- supported purposes;
- unary/batch item/text/token limits;
- feature flags: lemma, stem, stopwords, diacritics, typo surface terms;
- spell correction support и immutable dictionary revision;
- readiness конкретного profile без внутренних filesystem paths.

Listing использует capabilities для startup/readiness diagnostics, но не
выбирает произвольную revision на каждый request. Required revision приходит из
active Listing locale index state.

### 1.3. Error mapping

| gRPC status | Причина | Listing behavior |
|---|---|---|
| `INVALID_ARGUMENT` | locale/text/purpose/limit | validation/configuration error |
| `NOT_FOUND` | profile отсутствует | locale capability unavailable |
| `FAILED_PRECONDITION` | contract/model mismatch | `SEARCH_NORMALIZER_UNAVAILABLE` |
| `RESOURCE_EXHAUSTED` | batch/token/output limit | bounded retry после уменьшения indexing batch; query не retry |
| `DEADLINE_EXCEEDED` | deadline | retryable indexing failure; query technical error |
| `UNAVAILABLE` | instance not ready/draining | circuit breaker; no local fallback |
| `INTERNAL` | unexpected pipeline failure | safe technical error + alert |

Item-level errors разрешены только в `NormalizeBatchResponse`. Transport/protocol
failure завершает весь RPC.

`CorrectQuery` не вызывается для normalization/indexing errors и не является
technical fallback. Ошибка correction не должна скрывать уже рассчитанный
PRIMARY zero result; Listing возвращает zero result без correction либо safe
degradation marker согласно public contract.

## 2. Normalization pipeline

### 2.1. Общая последовательность

```text
validate request
  -> Unicode NFKC
  -> normalize apostrophe/dash policy
  -> locale-aware case folding
  -> tokenize with source order
  -> classify script/number/code-like token
  -> mark stopword
  -> lemma/stem searchable language tokens
  -> preserve normalized surface typo term
  -> validate lexemes and limits
  -> canonical prepared_text
  -> canonical output hash
```

Stopword unit сохраняется в response для source-unit diagnostics, но имеет пустой
`primary_lexemes`. Query, оставшийся без primary lexemes, Listing отклоняет как
stopword-only.

Phrase contract — adjacency primary lexemes после stopword filtering. Exact
surface phrase с сохранением gaps удалённых stopwords не входит в v1.

### 2.2. Profile registry

```python
class LanguageProfile(Protocol):
    profile_id: str
    model_revision: str

    def normalize(self, text: str, purpose: Purpose) -> NormalizedText:
        ...
```

Начальные candidates:

| Locale | Baseline | Назначение |
|---|---|---|
| `uk` | `pymorphy3` + `pymorphy3-dicts-uk` | быстрая dictionary lemma |
| `en` | spaCy small pipeline либо Snowball profile | context lemma или deterministic stem |
| `ru` | `pymorphy3` | dictionary lemma |
| fallback | отсутствует | unsupported locale fail-closed |

Конкретный baseline принимается только после corpus benchmark. Переход с
`pymorphy3` на spaCy/Stanza меняет model revision и требует rebuild locale index.

Stopword lists являются versioned assets репозитория. Runtime download или
незаметное обновление dependency-provided list запрещены. E-commerce значимые
слова не добавляются в stopwords без relevance corpus.

### 2.3. Ambiguity и unknown words

- dictionary analyzer выбирает parse по зафиксированной deterministic policy;
- unknown token сохраняется как normalized surface primary lexeme;
- mixed-script и code-like token не прогоняется через language lemmatizer;
- один source token может вернуть несколько primary lexemes только при явно
  versioned compound policy;
- transliteration, synonym expansion, spelling correction и language detection
  не входят в normalization operation.

### 2.4. Spell correction pipeline

Spell correction является отдельной query-only operation:

```text
validate query/revisions
  -> common surface tokenization
  -> exclude protected/short/code-like tokens
  -> SymSpell candidate generation
  -> edit-distance and keyboard features
  -> frequency/bigram scoring
  -> bounded candidate ranking
  -> confidence calibration
  -> token-level change metadata
```

Baseline — SymSpell с `max_edit_distance=1`; distance `2` разрешается только для
длинных tokens после quality/performance corpus. Tokens длиной до трёх code
points по умолчанию не исправляются. Unbounded candidate expansion запрещён.

Correction dictionary хранит surface forms, потому что исправление выполняется
до lemma/stem. Начальный ориентир на locale:

```text
150–300k частотных language surface forms
+ 20–200k versioned commerce/catalog terms
+ protected brands/model names отдельным registry
= около 200–500k correction entries
```

Миллионы неконтролируемых word forms не являются целью: они увеличивают memory,
candidate ambiguity и false corrections. Dictionary build обязан фильтровать
OCR noise, URLs, identifiers и low-frequency garbage. General frequency source,
catalog vocabulary и query/click-derived weights имеют отдельное provenance и
license manifest.

Service может генерировать candidates из общего versioned dictionary, но не
владеет tenant catalog. Listing обязательно проверяет candidates против своего
locale term dictionary/search result. Store-specific query/click frequency может
применяться Listing reranker-ом либо публиковаться как отдельный versioned
dictionary artifact только после отдельного privacy/ownership решения.

Confidence не равен raw SymSpell score. Начальный policy contract:

```text
confidence >= calibrated auto-correct threshold
  -> Listing может выполнить corrected full bundle

confidence между suggest и auto-correct threshold
  -> вернуть "Возможно, вы имели в виду" без автоматической замены

confidence < suggest threshold
  -> correction отсутствует
```

Численные thresholds принимаются только после offline corpus и online metrics.
Редкое, но корректное слово не исправляется, если PRIMARY уже вернул результат.

Spell correction улучшает recall и zero-result rate, но не улучшает ranking
корректно написанного запроса. Synonyms и lemmatization остаются независимыми
слоями:

```text
spell          -> ошибочно написанное слово
lemmatization  -> грамматические формы одного слова
synonyms       -> разные слова с близким значением
```

## 3. Python project structure

```text
services/text-normalizer/
  pyproject.toml
  README.md
  Dockerfile
  proto/
    # только import/reference canonical contracts, не вторая source copy
  src/shopana_text_normalizer/
    main.py
    config.py
    grpc_server.py
    interceptors.py
    contracts/
    pipeline/
      registry.py
      common.py
      result.py
    profiles/
      uk.py
      en.py
      ru.py
    correction/
      symspell.py
      dictionary.py
      ranker.py
      confidence.py
    assets/stopwords/
    observability/
      logging.py
      metrics.py
      tracing.py
    health.py
  scripts/
    download_models.py
    build_model_manifest.py
    build_correction_dictionary.py
    benchmark.py
  tests/
    contract/
    corpus/
    determinism/
    performance/
```

Dependency versions и model artifacts фиксируются lockfile и manifest с SHA-256.
Container build загружает все модели заранее и работает без runtime internet.

## 4. Runtime и deployment

### 4.1. Server

- `grpc.aio` server;
- стандартный gRPC Health Checking service;
- reflection только в development;
- max receive/send message sizes меньше infrastructure defaults и совпадают с
  proto capabilities;
- per-method concurrency semaphore;
- graceful drain: readiness false, stop accepting calls, bounded await in-flight;
- keepalive policy согласована с Listing client и ingress/service mesh;
- gzip отключён по умолчанию для коротких unary query, включается для measured
  batch workload только после benchmark.

Python worker загружает собственную копию моделей. Число workers выбирается по
memory RSS и CPU benchmark; нельзя умножать heavy spaCy/Stanza model вслепую.

### 4.2. Deployment topology

Предпочтительный baseline — отдельный internal service с несколькими replicas,
а не subprocess внутри Listing container. Это позволяет независимо масштабировать
CPU/RAM и обновлять model revision.

Сервис не должен scale-to-zero в storefront critical path. Для query задаётся
короткий deadline; indexing использует больший deadline и bounded batches.

### 4.3. Configuration

Environment/config schema содержит только:

- listen address/port;
- enabled locale profiles;
- paths к immutable model manifest/assets;
- concurrency и batch limits;
- observability endpoints/exporters;
- graceful shutdown timeout.

Model revision не задаётся произвольным ENV string: она вычисляется/проверяется
по committed manifest и artifact hashes.

## 5. Performance contract

Разделить два workload:

### Query unary

- короткий text;
- минимальная tail latency;
- без batching wait;
- model уже resident;
- Listing может применять bounded cache по
  `(locale, contractVersion, modelRevision, normalized input hash)`.

### Query correction

- запускается параллельно с PRIMARY только как speculative bounded work либо
  после final zero; результат до final zero не применяется;
- baseline dictionary 200–500k surface forms и edit distance `1`;
- candidate generation и ranking имеют отдельные limits;
- warm target для `CorrectQuery + Normalize` — initial `p95 <= 15 ms` и
  `p99 <= 30 ms` внутри private network; окончательный SLO принимается только
  после benchmark;
- cache key включает locale, contract/model/dictionary revisions и input hash.

### Indexing batch

- stable item IDs;
- ограничение одновременно по items, input code points и expected tokens;
- один pipeline batch для моделей, поддерживающих native batching;
- response не превышает configured byte limit;
- Listing делит batch только после explicit `RESOURCE_EXHAUSTED` и не делает
  unbounded recursive retries.

Абсолютные SLO фиксируются после benchmark на целевом hardware. Обязательные
gates: отсутствие model load в request, bounded memory, отсутствие throughput
collapse на max batch и стабильный p95/p99 при mixed unary+batch нагрузке.

## 6. Observability и безопасность

Metrics:

- requests/duration/in-flight по method, locale, purpose и status;
- batch items, input code points, token/lexeme/output counts;
- profile readiness и loaded model revision;
- correction dictionary revision, candidates/change counts и protected tokens;
- deadline exceeded, resource exhausted, revision mismatch;
- process CPU/RSS, event-loop lag и worker restarts.

Listing, а не stateless normalizer, агрегирует product/business quality metrics:

- zero-result rate до и после correction;
- доля query с correction candidate;
- auto-correction и suggestion acceptance rate;
- corrected-query CTR/conversion;
- false correction/undo rate;
- corrected bundle latency и доля protected tokens.

Tracing содержит request ID, locale, purpose, contract/model revision и counts.
Raw input, source tokens, primary lexemes, typo terms и prepared text запрещены в
logs, traces и metric labels.

Guardrails:

- internal-only network policy;
- optional workload identity/mTLS согласно platform baseline;
- no database credentials;
- no filesystem writes после startup, кроме platform-required temp area;
- dependency/model checksum verification;
- non-root container и read-only root filesystem;
- request deadlines и cancellation propagation в pipeline;
- fuzzing Unicode/protobuf input и защита от oversized/decompression payload.

## 7. Versioning и rollout моделей

`contractVersion` меняется при несовместимой семантике proto/output. `modelRevision`
меняется при любом результате normalization: tokenizer, stopwords, lemma model,
diacritics или code-token policy.

`dictionaryRevision` меняется при изменении spell vocabulary, frequencies,
bigrams, protected registry или ranker/confidence artifacts. Dictionary update
не требует rebuild document FTS index, но требует compatibility corpus и
координированной activation correction capability.

Rollout новой revision:

1. собрать immutable model image/manifest;
2. запустить replicas, одновременно способные обслуживать required old revision
   либо сохранить отдельный old deployment;
3. проверить capabilities и compatibility corpus;
4. создать новую Listing locale index revision в `UPDATING`;
5. полностью перестроить document rows/term dictionary новой revision;
6. выполнить reconciliation/parity checks;
7. атомарно активировать Listing locale index + runtime configuration revision;
8. направить query с новой required revision;
9. после drain cursor TTL удалить old index/model revision.

Если один process не поддерживает несколько revisions, deployment routing обязан
оставлять old endpoint доступным до activation/drain. Нельзя обновить normalizer
in-place раньше индекса.

## 8. Этапы реализации

### Этап 0. Contract и corpus

1. Зафиксировать canonical proto location и ownership.
2. Утвердить locale, purpose, unit и version semantics.
3. Собрать `uk/en/ru` corpus: inflections, apostrophes, diacritics, mixed script,
   brands, numbers, product codes, stopword-only и typo distance 1.
4. Сравнить candidate libraries по quality, license, RSS и latency.
5. Собрать typo/correction pairs, включая UA-GEC и domain fixtures; внешние
   datasets проходят отдельную license review.
6. Зафиксировать initial profiles, stopword/correction assets и manifests.

### Этап 1. Service skeleton

1. Создать Python project, lockfile и container.
2. Настроить canonical proto generation для Python и TypeScript.
3. Реализовать config validation, gRPC health и graceful shutdown.
4. Добавить structured safe logging, metrics и tracing.

### Этап 2. Pipeline и profiles

1. Реализовать common Unicode/token validation pipeline.
2. Реализовать profile registry без fallback.
3. Добавить initial locale profiles и versioned stopwords.
4. Реализовать correction dictionary builder и protected registry.
5. Реализовать prepared text/output hash.
6. Добавить determinism и golden corpus fixtures.

### Этап 3. gRPC methods

1. Реализовать `Normalize`.
2. Реализовать bounded `NormalizeBatch` с per-item outcomes.
3. Реализовать bounded `CorrectQuery` и token change metadata.
4. Реализовать `GetCapabilities` и profile readiness.
5. Добавить status/error mapping, cancellation и limits.
6. Проверить generated TypeScript client compatibility.

### Этап 4. Listing integration

1. Добавить Listing client adapter и configuration.
2. Подключить unary query normalization.
3. Подключить exact-first correction только после final PRIMARY zero.
4. Добавить protected brand/SKU units, tenant candidate validation и confidence
   policy.
5. Подключить batch document/synonym/boost normalization до DB transaction.
6. Включить contract/model revision в write model, index state и query predicate.
7. Реализовать fail-closed normalization readiness и safe correction degradation.

### Этап 5. Hardening

1. Выполнить correctness corpus и cross-version compatibility checks.
2. Провести unary/batch/mixed load benchmark.
3. Измерить correction precision/recall, false correction и latency на словарях
   200k/500k/1m.
4. Настроить workers, concurrency, deadlines и message limits.
5. Добавить Unicode/protobuf fuzzing и failure injection.
6. Проверить rolling revision rollout, rebuild, activation и rollback.
7. Зафиксировать runbook и alert thresholds.

## 9. Acceptance matrix

| Сценарий | Ожидаемый результат |
|---|---|
| Ukrainian inflections | Одинаковая lemma document/query |
| English/Russian profile | Результат соответствует своему profile без fallback |
| Unknown word | Сохранён normalized surface lexeme |
| Mixed Ukrainian + Latin brand | Ukrainian normalized, Latin token сохранён |
| Number/product code | Не искажён language lemmatizer-ом |
| Stopword-only query | Нет primary lexemes; Listing возвращает validation error |
| Phrase with stopword | Phrase строится по adjacent searchable lexemes после filtering |
| Typo token | Surface typo term сохранён отдельно от lemma |
| PRIMARY имеет result | Spell correction не вызывается |
| PRIMARY final zero | Correction candidates вычисляются bounded operation |
| Protected brand/SKU | Token не изменяется |
| Short/code-like token | Не исправляется согласно policy |
| High-confidence candidate с catalog hits | Listing может выполнить corrected bundle |
| Medium confidence | Только "Возможно, вы имели в виду" |
| Candidate без tenant catalog match | Не используется для automatic correction |
| Correction unavailable | PRIMARY zero возвращается без semantic/local fallback |
| Unsupported locale | `NOT_FOUND`, без substitute profile |
| Required revision mismatch | `FAILED_PRECONDITION` |
| Duplicate batch ID | Protocol-level `INVALID_ARGUMENT` |
| One invalid batch item | Явный item error; Listing не пишет partial model |
| Deadline/cancellation | Work прекращается bounded, no fallback |
| Restart | Тот же input даёт тот же output hash |
| Model rollout | Query revision меняется только после index activation |
| Logs/traces | Raw text и lexemes отсутствуют |

## 10. Definition of Done

- canonical proto и generated Python/TypeScript clients воспроизводимы;
- все advertised profiles загружены до readiness и имеют immutable manifest;
- unary и batch methods соблюдают limits, deadlines и error contract;
- output deterministic и подтверждён golden corpus;
- document/query/synonym/boost parity подтверждена для каждой locale;
- exact-first spell correction имеет calibrated confidence, protected tokens и
  tenant catalog validation;
- correction quality подтверждена typo corpus и метриками false correction;
- Listing fail-closed проверяет contract/model revision;
- PostgreSQL получает только prepared lexemes и использует `pg_catalog.simple`;
- performance/capacity benchmark и operational runbook готовы;
- raw text/lexemes не попадают в telemetry;
- rolling model revision проходит rebuild и atomic activation без mixed serving.

## Открытые риски

1. `pymorphy3` выбирает разбор короткого token без полного контекста; relevance
   corpus должен сравнить его со spaCy/Stanza.
2. Heavy contextual models увеличивают RSS, cold start и tail latency.
3. Stopword policy может удалять важные product terms; списки требуют domain
   review и versioning.
4. Mixed-language titles без language detection могут иметь менее качественные
   lemmas, но silent token loss запрещён.
5. gRPC dependency входит в storefront critical path; capacity/readiness и
   короткие deadlines обязательны.
6. Model revision rollout требует временно хранить/обслуживать две revisions.
7. Лицензии model data могут отличаться от Python package license и должны быть
   проверены до включения artifacts в container.
8. General-language dictionary без catalog/query frequencies может выбирать
   лингвистически корректное, но коммерчески нерелевантное исправление.
9. Слишком большой dictionary повышает RSS и false-positive rate; размер и
   thresholds принимаются benchmark-ом.
10. Automatic correction без exact-first и calibrated confidence способен
    ухудшить поиск редких brands и domain terms.
