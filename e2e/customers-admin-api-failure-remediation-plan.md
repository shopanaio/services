# Customers Admin API E2E Failure Remediation Plan

## 1. Baseline

Дата прогона: 2026-08-17.

Команда:

```bash
NODE_OPTIONS=--experimental-transform-types yarn test tests/customers-admin-api/ --workers 1
```

Результат:

- 214 тестов;
- 161 passed;
- 53 failed;
- 0 skipped;
- 0 flaky;
- длительность 3.6 минуты;
- исправленная DBOS runtime-ошибка `Invalid call to a workflow function from within a step or transaction` не повторилась.

Во время прогона также появлялось `Access denied: workflow:run`. Это не ошибка
исполнения DBOS: запуск дочернего workflow блокирует авторизация `ServiceBroker`.

Исходный интерактивный отчёт:
`e2e/playwright-report/index.html`.

## 2. Ограничения исправления

- Не добавлять backward compatibility и backfill.
- Не ослаблять tenant isolation, RBAC или проверку типов Global ID ради прохождения тестов.
- Доменные и validation-ошибки возвращать через `userErrors`; GraphQL transport errors
  оставлять для неверного GraphQL-документа, scalar coercion и неожиданных runtime failures.
- Дочерние workflow запускать непосредственно из тела родительского workflow, а не
  из `@WorkflowStep` или transaction.
- Недетерминированные вычисления и внешние side effects сохранять в durable steps.
- После каждого исправления запускать только один `.spec.ts` с `--workers 1`.
- Не менять expectations, пока production-контракт не подтверждён как корректный.

## 3. Приоритеты и порядок работ

| Порядок | Трек | Причина приоритета |
| --- | --- | --- |
| 1 | R1 — merge workflow authorization | Блокирует 11 тестов одним дефектом |
| 2 | R2 — revision contract | Порождает каскадные `REVISION_CONFLICT` в нескольких доменах |
| 3 | R3 — Relay `Node` resolution | Даёт runtime GraphQL errors и ломает delete/read проверки |
| 4 | R4 — validation boundary | Неверный слой ошибок скрывает реальные доменные проверки |
| 5 | R5 — data request semantics | Privacy lifecycle должен быть детерминирован и безопасен |
| 6 | R6 — normalization | Влияет на уникальность email, tags, tax IDs и segment query |
| 7 | R7 — query/filter/pagination | Изолированный read-path после стабилизации revisions |
| 8 | R8 — classification lifecycle | Groups, segments, memberships и dependency policy |
| 9 | R9 — event projections and ordering | Включает два timeout и consent evidence order |
| 10 | R10 — address/tax/external references | Остальные entity-specific invariants |

## 4. План по корневым причинам

### R1. Merge workflow получает `FORBIDDEN workflow:run`

Затронуто: 11 тестов `customer-merges.spec.ts`.

Наблюдение:

- `CustomerMergeCreateWorkflow.stepStartProcess()` вызывает
  `ServiceBroker.startWorkflow()`;
- `ServiceBroker.prepareWorkflowStart()` отклоняет запуск с
  `resource=workflow`, `action=run`;
- ошибка выходит как GraphQL `FORBIDDEN`, поэтому merge process не начинается.

План:

1. Проследить trusted caller, который создаёт `CustomerMergeCreateWorkflow`, и
   контекст, передаваемый в `startWorkflow("customers.customerMergeProcess", ...)`.
2. Сравнить вызов с уже работающими parent-child workflow в customers/media.
3. Убедиться, что запуск дочернего workflow выполняется из тела parent workflow,
   а не из `@WorkflowStep`.
4. Передавать сервисный workflow caller через существующий trusted broker path;
   не добавлять обход RBAC и не выдавать клиентскому actor право `workflow:run`.
5. Сохранить deterministic idempotency context: parent workflow ID, стабильный
   `stepId` и merge ID как `callId`.
6. Проверить happy path, invalid participants, duplicate/reverse merge,
   concurrency и read-after-completion.

Проверка:

```bash
NODE_OPTIONS=--experimental-transform-types yarn test tests/customers-admin-api/customer-merges.spec.ts --workers 1
```

### R2. Начальная revision равна `0`, а не `1`

Затронуто напрямую и каскадно: customer query, groups, segments, addresses,
classification, profile и tax tests.

Наблюдение:

- созданные CustomerGroup и CustomerSegment возвращают `revision: 0`;
- Customer aggregate также читается с `revision: 0`;
- tests/helpers продолжают операции с ожидаемой revision, после чего production
  раньше доменной проверки возвращает `REVISION_CONFLICT`;
- segment `definitionRevision` также начинается с `0` и не всегда увеличивается.

План:

1. Зафиксировать единый контракт: первая сохранённая версия aggregate и definition
   имеет revision `1`.
2. Найти DB defaults, create scripts и response mapping для Customer,
   CustomerGroup и CustomerSegment.
3. Исправить production defaults/create path без миграции или backfill: данных
   stage/production нет, совместимость запрещена.
4. Проверить, что успешная mutation увеличивает revision ровно один раз, а no-op
   следует существующему детерминированному контракту.
5. Для segment отдельно проверить `definitionRevision`: менять только при принятом
   изменении definition/query/status, требующем новой materialization.
6. Повторно проверить stale revision после устранения ложных конфликтов.

Проверка по одному файлу:

- `customer-query.spec.ts`;
- `customer-groups.spec.ts`;
- `customer-segments.spec.ts`;
- `customer-update-addresses.spec.ts`;
- `customer-update-classification.spec.ts`;
- `customer-update-profile.spec.ts`;
- `customer-update-tax.spec.ts`.

### R3. GraphQL не разрешает интерфейс `Node`

Затронуто: 3 теста `relay-nodes.spec.ts` и cascade test в
`customer-delete.spec.ts`.

Наблюдение:

- `CustomersQuery.nodes` возвращает объекты без корректного runtime typename;
- Apollo сообщает: `Abstract type "Node" must resolve to an Object type`;
- malformed/missing IDs иногда приводят к общему
  `Failed to resolve field "nodes"` вместо `null` placeholder;
- чтение relation после удаления tag также может пытаться разрешить отсутствующий
  объект как обязательный.

План:

1. Проверить `Node.__resolveType` и mapping всех Customers entity types.
2. Проверить, что type-resolver возвращает типизированный объект/instance либо
   явный `__typename`, совместимый со schema.
3. Для `nodes(ids)` сохранять порядок и дубликаты; missing, malformed,
   cross-store и unsupported IDs преобразовывать в `null` в соответствующей позиции.
4. Не превращать decode/type mismatch в общий resolver exception.
5. Проверить tenant scope до загрузки сущности.
6. Для удалённых optional references возвращать `null`, не runtime GraphQL error.

Проверка:

```bash
NODE_OPTIONS=--experimental-transform-types yarn test tests/customers-admin-api/relay-nodes.spec.ts --workers 1
NODE_OPTIONS=--experimental-transform-types yarn test tests/customers-admin-api/customer-delete.spec.ts --workers 1
```

### R4. Validation выполняется не на том API-слое

Затронуто: groups, segments, tags, addresses, classification, consents, profile и
tax tests.

Наблюдение:

- invalid `DateTime` завершается GraphQL `BAD_USER_INPUT`, хотя mutation contract
  ожидает field-aware `userErrors`;
- oversized tag name доходит до PostgreSQL `varchar(255)`;
- несколько duplicate/conflicting/not-found invariants возвращают success или
  перекрываются `REVISION_CONFLICT`;
- обязательные business invariants не всегда проверяются до repository write.

План:

1. Разделить transport coercion и business validation:
   - syntactically invalid GraphQL scalar остаётся transport error;
   - валидный ISO DateTime с доменно недопустимым значением возвращает `userErrors`.
2. Согласовать fixtures с этим контрактом; production не должен ловить scalar
   coercion error как доменную ошибку.
3. Добавить Zod/script validation до repository calls для длины, пустых значений,
   duplicate IDs, conflicting operations и cross-entity ownership.
4. Выполнять structural/domain validation до optimistic revision check там, где
   контракт требует конкретную input error независимо от текущего aggregate.
5. Маппить database constraint violations только как защитный fallback, а не как
   основной validation path.
6. Проверить атомарность: при любой ошибке не менять aggregate и child rows.

### R5. Customer data request lifecycle

Затронуто: 2 теста `customer-data-requests.spec.ts`.

Проблема A — конфликтующий cancel:

- mutation с cancel и conflicting updates фактически сохраняет `CANCELLED`;
- ожидалось `dataRequest: null` и domain `userErrors` без изменения записи.

План A:

1. Валидировать mutually exclusive cancel/update operations до script write.
2. Возвращать стабильный conflict code и field path.
3. Проверить transaction rollback и отсутствие status event при rejected mutation.

Проблема B — unsupported correction fields:

- workflow сохраняет общий текст `Customer data request processing failed`;
- ожидается безопасная конкретная причина `Unsupported correction fields`.

План B:

1. Проверить сериализацию `CustomerDataRequestProcessError` через границу
   `@WorkflowStep` и replay.
2. Сохранять safe message/code для известных non-retryable domain errors.
3. Для неизвестных исключений продолжать использовать общий безопасный текст.
4. Проверить, что rejection reason детерминирован при replay.

Проверка:

```bash
NODE_OPTIONS=--experimental-transform-types yarn test tests/customers-admin-api/customer-data-requests.spec.ts --workers 1
```

### R6. Нормализация и canonical values

Затронуто: tags, tax identifiers, dynamic segment query и duplicate email path.

Наблюдение:

- full-width Unicode tag `ＶＩＰ` не нормализуется в `VIP`;
- tax ID сохраняется как `UA123-45` вместо `UA12345`;
- dynamic segment canonical query меняет string literal `Engine` на `engine`;
- duplicate checks используют не везде тот же canonicalizer, что persistence.

План:

1. Определить один canonicalizer для каждого value type:
   - tag: Unicode NFKC, trim, whitespace collapse, case-fold только для
     `normalizedName`;
   - tax ID: country/type-aware удаление разрешённых separators и uppercase;
   - email: существующая email normalization;
   - segment query: canonicalize identifiers/keywords, но сохранять значение и
     case string literals.
2. Использовать один и тот же canonical value для uniqueness lookup и write.
3. Валидировать длину после Unicode normalization.
4. Добавить production-level focused tests для full-width Unicode, separators и
   case-sensitive literals.

### R7. Customer filters и Relay pagination

Затронуто: 5 тестов `customer-query.spec.ts`.

Наблюдение:

- `updatedAt` filter поддерживает только `null`, а range/comparison приводит к
  `QueryBuilderError`;
- statistics spend и segment membership filter возвращают пустой результат;
- invalid pagination combinations не всегда отклоняются;
- malformed, foreign-type и filter-mismatched cursors не дают стабильной ошибки.

План:

1. Сопоставить каждый declared GraphQL filter с колонкой/join и поддерживаемыми
   operators в drizzle-query.
2. Добавить date-time comparison mapping для `updatedAt` и остальных declared
   date fields.
3. Проверить tenant-scoped joins для statistics и segment memberships.
4. Валидировать Relay arguments до query execution:
   - `first`/`last`;
   - `after`/`before`;
   - положительный page size;
   - cursor entity type;
   - cursor filter/order fingerprint.
5. Возвращать безопасную GraphQL input error без SQL execution для invalid cursor.

### R8. Groups, segments и classification lifecycle

Затронуто: 11 тестов помимо revision-only каскадов.

План:

1. Groups:
   - проверять duplicate/conflicting membership operations;
   - проверять missing/foreign customer до write;
   - зафиксировать policy удаления default/populated group;
   - возвращать dependency error и не удалять rows при отказе.
2. Segments:
   - разделить MANUAL и DYNAMIC invariants;
   - запрещать ручное назначение DYNAMIC segment;
   - увеличивать `definitionRevision` при принятом изменении definition;
   - при изменении dynamic definition немедленно считать старые RULE memberships
     неактивными до новой materialization;
   - проверять stale revision и active dependencies при delete.
3. Unified classification update:
   - валидировать duplicate/foreign IDs до replacement;
   - empty IDs очищают только разрешённый membership source;
   - expired membership остаётся читаемым, но возвращается inactive;
   - не разыменовывать отсутствующий edge/node в resolver.
4. Concurrency:
   - unique constraint остаётся последней защитой;
   - ожидаемые races маппить в стабильный domain user error.

### R9. Event projections и ordering

Затронуто: 3 statistics/comparison tests и 1 consent test.

План:

1. Statistics timeout:
   - проследить `domain_events` -> dispatcher workflow -> customers handler ->
     statistics projection;
   - проверить DBOS handle completion и отсутствие зависшего broker call;
   - проверить idempotency key и monotonic order revision;
   - не увеличивать E2E timeout до устранения причины зависания.
2. Projection semantics:
   - checkout/refund применяются один раз;
   - duplicate и older revisions не регрессируют projection;
   - суммы сохраняются в minor units и currency scope.
3. Consent evidence:
   - append immutable events в transition order;
   - сортировать connection по deterministic sequence/timestamp + ID;
   - проверить forward/backward Relay pagination.
4. Comparison external references:
   - resolver должен подтверждать наличие Catalog entity;
   - unavailable entity возвращается как `null`, persisted comparison item остаётся.

### R10. Address, profile, tax и external-file invariants

План:

1. Addresses:
   - проверять required normalized values;
   - reject duplicate/conflicting child operations;
   - child ID обязан принадлежать customer и store;
   - direct query и nested connection должны использовать один mapper/shape.
2. Profile:
   - duplicate normalized email должен отклонять всю mutation;
   - `BLOCKED` требует непустой normalized reason;
   - `ACTIVE`/`DISABLED` очищают старый blocked reason.
3. Tax identifiers:
   - canonical uniqueness после tax normalization;
   - VERIFIED требует verification metadata;
   - child IDs tenant/customer scoped;
   - duplicate/conflicting operations отклоняются до write.
4. Tax exemptions/files:
   - certificate file должен существовать и принадлежать текущему store;
   - missing/cross-store file возвращает domain user error;
   - не раскрывать существование foreign file.
5. Все multi-section updates выполнять атомарно и увеличивать customer revision один раз.

## 5. Матрица всех 53 падений

### `customer-data-requests.spec.ts` — 2

| Line | Test | Трек |
| ---: | --- | --- |
| 151 | cancel cannot be combined with conflicting updates | R5 |
| 235 | unsupported correction fields are rejected with a safe reason | R5 |

### `customer-delete.spec.ts` — 1

| Line | Test | Трек |
| ---: | --- | --- |
| 15 | customer delete cascades or tombstones all owned entities consistently | R3 |

### `customer-groups.spec.ts` — 3

| Line | Test | Трек |
| ---: | --- | --- |
| 8 | admin creates an active non-default group | R2 |
| 185 | group membership set rejects duplicates conflicts missing customers and invalid expiry | R4, R8 |
| 373 | deleting default or populated group follows explicit dependency policy | R8 |

### `customer-merges.spec.ts` — 11

Все тесты ниже первично заблокированы R1.

| Line | Test |
| ---: | --- |
| 44 | admin creates and completes a valid customer merge |
| 59 | merge moves or reconciles every supported customer-owned relation |
| 108 | merge conflict resolution is deterministic for duplicate email defaults primary values and memberships |
| 126 | missing cross-store deleted merged redacted or otherwise invalid customers are rejected |
| 134 | reverse or duplicate pending merge is rejected |
| 167 | merge cannot be edited or deleted after processing starts |
| 205 | completed merge has no failure details |
| 212 | completed merge reads preserve status timestamps and resolution |
| 222 | concurrent merge requests involving the same source allow one workflow |
| 232 | merge direct query and ID-filtered list return the same merge |
| 254 | missing malformed and cross-store merge IDs are safe |

### `customer-query.spec.ts` — 5

| Line | Test | Трек |
| ---: | --- | --- |
| 8 | admin gets a customer by global ID with the complete aggregate | R2 |
| 320 | customers filters by profile company locale and date fields | R7 |
| 425 | customers filters by statistics spend and segment membership | R7, R9 |
| 522 | invalid cursor pagination combinations are rejected | R7 |
| 550 | malformed foreign-type and filter-mismatched cursors are rejected safely | R7 |

### `customer-segments.spec.ts` — 5

| Line | Test | Трек |
| ---: | --- | --- |
| 16 | admin creates a manual draft segment without a query | R2 |
| 28 | admin creates a dynamic segment from a valid query | R2, R6 |
| 378 | segment memberships reject duplicate missing foreign customers and invalid expiry | R4, R8 |
| 427 | changing dynamic definition invalidates stale RULE memberships fail-closed | R2, R8 |
| 535 | delete with stale revision or active dependency fails safely | R2, R8 |

### `customer-statistics-and-comparison.spec.ts` — 3

| Line | Test | Трек |
| ---: | --- | --- |
| 77 | order checkout and refund events update the customer statistics projection | R9 |
| 157 | duplicate and older order revisions do not regress projected statistics | R9 |
| 264 | unavailable Catalog entities leave safe nullable references without dropping persisted items | R9 |

### `customer-tags.spec.ts` — 3

| Line | Test | Трек |
| ---: | --- | --- |
| 8 | admin creates a normalized customer tag | R6 |
| 18 | blank oversized and duplicate normalized tag names are rejected | R4, R6 |
| 204 | deleting a tag removes active assignments without deleting customers | R3, R8 |

### `customer-update-addresses.spec.ts` — 4

| Line | Test | Трек |
| ---: | --- | --- |
| 229 | empty required address values are rejected | R2, R4, R10 |
| 296 | duplicate IDs and conflicting update delete operations are rejected | R2, R4, R10 |
| 341 | foreign customer address IDs are returned as NOT_FOUND | R2, R10 |
| 382 | customerAddress direct query and nested connection return the same normalized object | R10 |

### `customer-update-classification.spec.ts` — 3

| Line | Test | Трек |
| ---: | --- | --- |
| 116 | expired group memberships are reported inactive | R8 |
| 155 | empty tag IDs clears tags and duplicate or foreign IDs fail | R2, R4, R8 |
| 203 | dynamic segment cannot be assigned manually | R6, R8 |

### `customer-update-consents.spec.ts` — 2

| Line | Test | Трек |
| ---: | --- | --- |
| 109 | contact point must match the selected channel | R4 |
| 203 | repeated transitions append ordered immutable evidence events | R9 |

### `customer-update-profile.spec.ts` — 2

| Line | Test | Трек |
| ---: | --- | --- |
| 217 | duplicate normalized email is rejected atomically | R2, R4, R6, R10 |
| 284 | BLOCKED requires a non-empty blocked reason | R2, R4, R10 |

### `customer-update-tax.spec.ts` — 6

| Line | Test | Трек |
| ---: | --- | --- |
| 8 | unified update creates tax identifiers with defaults and normalization | R6, R10 |
| 107 | duplicate normalized tax identifier is rejected | R4, R6, R10 |
| 162 | verified identifier requires verification metadata invariants | R4, R10 |
| 255 | missing or cross-store certificate file is rejected safely | R4, R10 |
| 275 | duplicate IDs and conflicting tax operations are rejected | R4, R10 |
| 345 | tax child IDs must belong to the updated customer and current store | R2, R10 |

### `relay-nodes.spec.ts` — 3

| Line | Test | Трек |
| ---: | --- | --- |
| 8 | node resolves every supported customer entity type | R3 |
| 89 | nodes preserves input order and duplicate IDs | R3 |
| 105 | nodes returns null placeholders for missing malformed foreign and unsupported IDs | R3 |

## 6. Definition of done для каждого трека

Трек считается завершённым только если:

1. Исправлена production-причина, а не только expectation/fixture.
2. Domain failures возвращаются через согласованный `userErrors` contract.
3. Mutation остаётся атомарной при отказе.
4. Tenant isolation и Global ID type checks сохранены.
5. Workflow IDs и child calls остаются детерминированными и идемпотентными.
6. Соответствующий `.spec.ts` проходит отдельно с `--workers 1`.
7. После прохождения всех отдельных spec выполняется повторный прогон каталога только
   по явному запросу, поскольку стандартный workflow проекта запрещает запускать
   целую директорию.

## 7. Рекомендуемая последовательность повторных прогонов

1. `customer-merges.spec.ts`
2. `customer-query.spec.ts`
3. `customer-groups.spec.ts`
4. `customer-segments.spec.ts`
5. `relay-nodes.spec.ts`
6. `customer-delete.spec.ts`
7. `customer-data-requests.spec.ts`
8. `customer-tags.spec.ts`
9. `customer-update-addresses.spec.ts`
10. `customer-update-classification.spec.ts`
11. `customer-update-consents.spec.ts`
12. `customer-update-profile.spec.ts`
13. `customer-update-tax.spec.ts`
14. `customer-statistics-and-comparison.spec.ts`

После каждого файла необходимо обновлять эту матрицу: фиксировать commit-independent
описание исправленной причины, остаточные падения и следующий разблокированный трек.
