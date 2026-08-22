---
tags:
  - admin
  - graphql
  - aggregate
  - mutation
  - dbos
  - workflow
  - batch
  - transaction
  - events
  - audit
related:
  - patterns/no-cas
  - patterns/admin-graphql-layer
  - packages/dbos/idempotency
  - packages/dbos/workflows
  - packages/dbos/transactional-steps
  - architecture/transactional-outbox
---

# Admin Aggregate Mutations

## Решение

Все изменения уже существующего aggregate root через Admin GraphQL API, кроме удаления самого
aggregate root, должны проходить через одну объединённую мутацию:

```graphql
<aggregate>Update(
  <aggregate>Id: ID!
  operations: <Aggregate>UpdateInput!
): <Aggregate>UpdatePayload!
```

`operations` описывает все допустимые изменения самого aggregate root и принадлежащих ему сущностей.
Отдельные admin-мутации для изменения полей, статуса, порядка, связей или CRUD дочерних сущностей
запрещены.

Удаление самого aggregate root не является update operation. Оно всегда выражается отдельной
мутацией `<aggregate>Delete`, которая запускает отдельный durable `<Aggregate>DeleteWorkflow` и
после успешного transactional commit публикует `<aggregate>Deleted`. Это правило действует и для
soft delete, и для physical delete корня. Удаление owned entities внутри сохраняемого aggregate
остаётся частью `<aggregate>Update` operations.

Эталон паттерна — `productUpdate` и `ProductUpdateWorkflow`: resolver преобразует GraphQL input в
упорядоченные внутренние operations, запускает один durable workflow, workflow применяет operations
отдельными durable steps, собирает `operationResults` и после успешных изменений публикует
`productUpdated`.

## Область действия

Правило обязательно для всех Admin API bounded contexts и всех записей, принадлежащих aggregate:

- patch полей aggregate root;
- изменение lifecycle/status и publish/unpublish, кроме удаления aggregate root;
- добавление, изменение, удаление и переупорядочивание owned entities;
- изменение assignment/link сущностей, которыми владеет aggregate;
- пакетные изменения нескольких частей aggregate в одном запросе.

После создания aggregate любой его write path, кроме удаления самого aggregate root, должен быть
выражен как operation в `<aggregate>Update`. Нельзя добавлять, например, `variantUpdate`,
`categoryMove`, `productPublish` или `<child>Create` как отдельный публичный write path, если
действие принадлежит aggregate и может быть представлено его update operation.

`<aggregate>Create` допускается только как bootstrap-команда, потому что aggregate root ещё не
существует. Она также обязана запускать зарегистрированный durable workflow; после успешного
transactional commit workflow публикует `<aggregate>Created`. `<aggregate>Delete` является второй
обязательной lifecycle-командой и не моделируется полем или operation внутри `<aggregate>Update`.
Иное отдельное имя мутации допускается только для самостоятельной semantic command, которая не
является изменением одного существующего aggregate. Такое исключение должно быть явно обосновано в
архитектурном документе bounded context. Удобство UI или исторически существующий CRUD endpoint не
являются обоснованием.

## Структура файлов и доменная терминология

Каждый concrete workflow размещается в собственной папке. Папка является изолированной единицей
реализации команды и содержит сам workflow, все используемые только им scripts и отдельную папку
`dto` со всеми контрактами workflow и его scripts.

Типовая структура:

```text
workflows/
  product-update/
    ProductUpdateWorkflow.ts
    scripts/
      ProductUpdateFieldsScript.ts
      ProductVariantCreateScript.ts
    dto/
      ProductUpdateInput.ts
      ProductUpdateOperation.ts
      ProductUpdateResult.ts
      ProductUpdateStepResult.ts
```

Имена файлов и дополнительные уровни группировки могут следовать соглашениям конкретного сервиса,
но граница владения остаётся обязательной:

- workflow-файл не размещается в общей плоской папке вместе с другими workflows;
- все scripts, вызываемые этим workflow, находятся внутри папки этого workflow;
- script принадлежит ровно одному workflow и не импортируется другим workflow;
- переиспользование script между workflows запрещено; общую бизнес-логику необходимо вынести в
  явно названный stateless domain service, policy, calculator или другой подходящий компонент, а
  каждый workflow вызывает её через собственный script;
- папка `dto` содержит все immutable input, operation, plan, step result, workflow result и другие
  контракты, которыми обмениваются workflow и его scripts;
- DTO и внутренние контракты одного workflow не используются как неявный публичный контракт другого
  workflow; действительно общий технический контракт должен находиться в соответствующем shared
  package и не содержать бизнес-специфичную модель конкретной команды.

В concrete business domain запрещено использовать `aggregate` как имя бизнес-сущности или часть
имени бизнес-контракта. В коде, DTO, operations, scripts, GraphQL contract, error paths и событиях
используются реальные названия доменных сущностей: например, `ProductUpdateWorkflow`, `productId`,
`ProductUpdateInput`, а не `AggregateWorkflow`, `aggregateId` или `AggregateDto`.

Термин `aggregate` допустим только в обобщённой архитектурной документации и generic
infrastructure/shared-kernel abstractions, таких как `AggregateUpdateWorkflow`, где он обозначает
архитектурный паттерн, а не сущность конкретного bounded context. При реализации в сервисе generic
параметры и hooks должны быть выражены через названия соответствующих доменных сущностей и команд.

## Multi-aggregate batch mutations

Эталон multi-aggregate batch mutation — `productBulkUpdate` и durable
`ProductBulkEditWorkflow`. Batch является отдельной asynchronous job command: mutation валидирует и
нормализует request, запускает durable coordinator и возвращает job, а прогресс и результаты
отдельных operations читаются через job items. Batch не возвращает синхронный массив aggregate
payloads и не удерживает GraphQL request до завершения всех child updates.

Batch endpoint не создаёт новый domain write path. Для каждого aggregate он использует тот же
GraphQL-to-domain mapper, тот же ordered список internal operations и тот же зарегистрированный
`<aggregate>Update` workflow, что и одиночная mutation. Batch-specific handlers могут управлять
только lifecycle job/items, cancellation, supersession и progress; дублировать domain operations
отдельными scripts или repositories запрещено.

Типовой публичный контракт:

```graphql
input ExampleBulkUpdateInput {
  examples: [ExampleBulkUpdateItem!]!
}

input ExampleBulkUpdateItem {
  exampleId: ID!
  operations: ExampleUpdateInput!
}

type ExampleBulkUpdatePayload {
  job: ExampleBulkUpdateJob
  userErrors: [BulkUpdateUserError!]!
}

type ExampleBulkUpdateJob implements Node {
  id: ID!
  status: BulkUpdateJobStatus!
  createdAt: DateTime!
  startedAt: DateTime
  finishedAt: DateTime
  progress: BulkUpdateJobProgress!
  items(
    first: Int
    after: String
    statusFilter: [BulkUpdateItemStatus!]
  ): BulkUpdateItemConnection!
}

type BulkUpdateItem implements Node {
  id: ID!
  aggregateId: ID!
  operationType: String!
  operationIndex: Int!
  status: BulkUpdateItemStatus!
  errors: [BulkUpdateUserError!]!
  cancelReason: BulkUpdateCancelReason
}
```

Job lifecycle содержит как минимум `QUEUED`, `RUNNING`, `COMPLETED` и `CANCELLED`. Lifecycle item
содержит `PENDING`, `RUNNING`, `SUCCEEDED`, `FAILED`, `CANCELLED` и `SUPERSEDED`. Progress строится
из durable item states, а не из in-memory counters coordinator workflow. GraphQL payload содержит
только ошибки, из-за которых job не была создана; business/execution errors после durable start
сохраняются в соответствующих job items.

### Request mapping и создание job

1. Batch input обязательно и не может быть пустым. Bounded context задаёт явный максимум aggregate
   items и суммарных public operations; для product bulk update — не более 100 products и 500
   operations.
2. Aggregate ID каждого item передаётся отдельно от обязательного `operations`. Пустой
   `operations`, пустые operation-массивы и item без допустимой operation отклоняются до durable
   start.
3. Resolver декодирует все global IDs и применяет canonical single-update mapper ко всем items. Он
   сохраняет исходные item/operation positions в metadata и до запуска workflow возвращает полный
   список syntactic/request-level ошибок. Resolver не пишет job, item или aggregate rows напрямую.
4. Tenant ownership и aggregate-wide prevalidation, требующая database reads, выполняется durable
   coordinator step до создания исполняемых items или запуска первого child update. Ошибка общей
   prevalidation не допускает aggregate writes.
5. Повторяющиеся aggregate IDs детерминированно группируются в один aggregate operation stream.
   Порядок определяется парой `(inputItemPosition, operationPosition)`; сортировка только по локальному
   operation index запрещена. Политика grouping и отображение исходных positions документируются в
   публичном контракте.

Coordinator запускается как зарегистрированный durable workflow через broker с `time-window`
idempotency context: tenant organization, стабильное semantic operation name, transport-assigned
`requestTimestamp`, `windowMs: 5_000` и нормализованный ordered batch content. `requestId`, actor,
timestamp и другие volatile transport values не входят в content. Повторный semantic request в
пределах окна получает ту же job и не создаёт второй набор job items.

Job ID, item IDs, fence tokens и другие nondeterministic values создаются внутри durable
transactional step. Создание job, всех её items и aggregate fences коммитится атомарно вместе с
DBOS checkpoint. Coordinator не обращается к repository напрямую: job lifecycle mutations
выполняются через local scripts внутри `@TransactionalStep()`.

### Group execution, fencing и supersession

После durable job creation coordinator группирует items по aggregate ID. Для каждого aggregate
существует один fence token текущей job. Новая job, затрагивающая тот же aggregate, атомарно заменяет
fence и переводит ещё не применённые items предыдущей job в `SUPERSEDED`. Старый coordinator обязан
проверить durable item/fence state перед child start и не может применить superseded operation.

Операции одного aggregate передаются одним ordered списком в canonical `<aggregate>Update` child
workflow. Child invocation использует `source: "workflow"`, parent `DBOS.workflowID`, стабильные
`stepId`/`callId` и ту же partitioned queue с key `storeId:aggregateType:aggregateId`, что и одиночный
update. Batch-wide queue key, случайный child workflow ID, child-entity key и обход canonical queue
запрещены.

После child completion coordinator сопоставляет каждый `operationResult` с job item по сохранённой
public position, а не по неявному порядку database rows или длине response. Успех переводит item в
`SUCCEEDED`, business failure — в `FAILED` с сохранёнными errors. Отсутствующий, лишний или
дублированный child result является workflow invariant error и не маскируется успешным status.

Atomicity существует внутри каждой public operation или dependent operation group одного aggregate.
Разные aggregate groups коммитятся независимо; failure одного aggregate не откатывает уже
завершённые groups. Job status `COMPLETED` означает, что все items достигли terminal state, а не то,
что все operations успешно применены. Cancellation останавливает только ещё не начатые items и не
откатывает committed changes.

Каждый canonical child workflow самостоятельно публикует `<aggregate>Updated` после своего commit и
формирует audit только по фактически применённым operations этого aggregate. Bulk coordinator не
публикует подменяющее aggregate lifecycle event и не дублирует child events. Отдельное событие
завершения job допустимо только как lifecycle event самой job и не заменяет aggregate events/audit.

## GraphQL-контракт

GraphQL не поддерживает input unions, поэтому публичные operations моделируются полями
`<Aggregate>UpdateInput`. Для повторяемых действий используются массивы action-based inputs.

```graphql
input ExampleUpdateInput {
  fields: ExampleFieldsInput
  status: ExampleStatus
  children: [ExampleChildOperationInput!]
  links: [ExampleLinkOperationInput!]
}

input ExampleChildOperationInput {
  action: ExampleChildOperationAction!
  childId: ID
  values: ExampleChildValuesInput
}

enum ExampleChildOperationAction {
  CREATE
  UPDATE
  DELETE
  MOVE
}

type ExampleUpdatePayload {
  example: Example
  operationResults: [OperationResult!]!
  userErrors: [GenericUserError!]!
}
```

Удаление aggregate root имеет отдельный контракт и не использует `ExampleUpdateInput`:

```graphql
type Mutation {
  exampleDelete(exampleId: ID!): ExampleDeletePayload!
}

type ExampleDeletePayload {
  deletedExampleId: ID
  userErrors: [GenericUserError!]!
}
```

Delete input может содержать только параметры самой delete-команды. В него нельзя переносить update
operations или CRUD owned entities.

Контракт должен соблюдать следующие правила:

1. Идентификатор aggregate root передаётся отдельно от `operations`.
2. `operations` обязательно (`!`) и не может быть пустым. GraphQL input object с нулём
   заданных operation-полей, а также пустые operation-массивы, если они не представляют
   допустимую operation, отклоняются как request-level validation error до запуска workflow.
3. Порядок элементов в массивах является частью контракта и сохраняется resolver-ом и workflow.
4. `OperationResult` содержит стабильный `type`, `applied`, при необходимости `entityId`, а также
   `errors` с путём к исходному полю `operations`.
5. `userErrors` содержит агрегированный список ошибок из `operationResults` и request-level ошибок.
6. В публичный Admin GraphQL input и payload нельзя добавлять `expectedRevision`, `expectedVersion`,
   ETag или иной CAS token. Сквозной запрет CAS определён ниже.

Одна публичная operation может вызывать несколько внутренних scripts. Деление на scripts — деталь
реализации и само по себе не создаёт дополнительные элементы `operationResults`.

## Resolver boundary

Admin resolver не выполняет domain writes и не публикует события. Его обязанности ограничены:

1. декодированием global IDs и синтаксической проверкой request;
2. преобразованием GraphQL input в типизированный упорядоченный список внутренних operations;
3. сохранением GraphQL field path в metadata каждой operation;
4. созданием tenant/store/user context;
5. запуском `<service>.<aggregate>Update` или `<service>.<aggregate>Delete` через
   `broker.runWorkflow()`;
6. преобразованием workflow result обратно в GraphQL payload.

Root workflow каждой Admin aggregate mutation — `<aggregate>Create`, `<aggregate>Update` и
`<aggregate>Delete` — обязан запускаться с `time-window` idempotency context. Один и тот же semantic
request, повторно доставленный в пределах окна, не должен запускать второй набор изменений.

### Очередь и последовательность update

Каждый `<aggregate>Update` root workflow запускается через partitioned DBOS queue. Partition key
обязан однозначно определять aggregate instance: минимум `storeId`, стабильный тип aggregate и
decoded aggregate ID. Например: `${storeId}:product:${productId}`. Одинаковый key гарантирует
последовательное выполнение update-workflows одного aggregate; разные aggregate могут исполняться
параллельно в пределах общей concurrency очереди.

Очередь регистрируется с `partitionQueue: true`. Её `concurrency` и `workerConcurrency` задают
общую пропускную способность очереди, а не отменяют последовательность одной partition. Нельзя
использовать store-wide key, случайный key или key дочерней entity: они соответственно создают
лишнюю сериализацию либо допускают одновременную запись в один aggregate.

Time-window idempotency разрешается registry до постановки в очередь. Повторный semantic request
в пределах окна присоединяется к уже существующему queued/running workflow либо получает его
сохранённый result и **не создаёт новую queue entry**. Поэтому для root update нельзя добавлять
`workflowId`, `deduplicationID`, локальную deduplication-проверку или отдельный mutex: identity
целиком выводится из `time-window` context.

```ts
const result = await broker.runWorkflow(
  "catalog.productUpdate",
  workflowInput,
  {
    source: "time-window",
    organizationId: ctx.store.organizationId,
    resourceId: productId,
    operation: "productUpdate",
    content: workflowInput.operations,
    requestTimestamp: ctx.requestTimestamp,
    windowMs: 5_000,
  },
  {
    adminContext: ctx.adminContext,
    queueName: "catalog_aggregate_mutations",
    enqueueOptions: {
      queuePartitionKey: `${ctx.store.id}:product:${productId}`,
    },
  },
);
```

`catalog_aggregate_mutations` в примере — имя service-level очереди; конкретное имя выбирается
сервисом, но оно должно быть зарегистрировано как partitioned queue. Референс реализации
partition key и queue start: `services/listing/src/handlers/listingIndexWorkflowEnqueue.ts` и
`services/listing/src/workflows/listingIndexWorkflowHelpers.ts`.

Прямой вызов write script/repository из resolver запрещён. Публикация `<aggregate>Updated`,
`<aggregate>Created` или `<aggregate>Deleted` из resolver также запрещена: между commit и emit
возникнет недолговечный разрыв, который невозможно надёжно восстановить после падения процесса.

### Time-window idempotency

Admin aggregate mutation resolver обязан использовать новый DBOS context:

```ts
await broker.runWorkflow(
  "example.exampleUpdate",
  workflowInput,
  {
    source: "time-window",
    organizationId: ctx.store.organizationId,
    resourceId: aggregateId,
    operation: "exampleUpdate",
    content: workflowInput.operations,
    requestTimestamp: ctx.requestTimestamp,
    windowMs: 5_000,
  },
  { adminContext: ctx.adminContext },
);
```

Контракт обязателен для `<aggregate>Create`, `<aggregate>Update` и `<aggregate>Delete`:

- `requestTimestamp` назначается один раз на gateway/Fastify boundary и берётся из request-scoped
  `ServiceContext`; resolver и workflow не вызывают `Date.now()` для idempotency;
- `windowMs` для Admin aggregate mutations равен `5_000`;
- `organizationId` обязателен для tenant isolation;
- `resourceId` для update/delete равен decoded aggregate root ID; для create используется
  детерминированная business identity команды, а если root ID создаётся внутри workflow — store ID
  вместе с уникальным operation name;
- `operation` является стабильным qualified semantic name команды без timestamp или request ID;
- `content` содержит только нормализованный semantic input команды: mapped operations для update,
  create input для create и параметры delete-команды для delete;
- `requestId`, `requestTimestamp`, actor/user metadata, tracing headers и другие volatile transport
  values запрещено включать в `content` или `contentHash`;
- одинаковый semantic hash в пределах пяти секунд возвращает сохранённый результат завершённого
  workflow либо присоединяется к уже выполняющемуся workflow; второй workflow не запускается;
- после окончания окна тот же semantic request получает новую workflow identity и может быть
  выполнен снова;
- невалидные timestamp/window/content завершаются `INVALID_TIME_WINDOW_IDEMPOTENCY_CONTEXT`, а не
  fallback-ом на случайный workflow ID.

Разрешение соседних временных buckets и durable start сериализуются внутри `WorkflowRegistry` одним
PostgreSQL advisory lock по semantic identity. Resolver не реализует собственные lookup, mutex,
cache debounce или округление timestamp.

`source: "content"`, content с вложенным `requestId`, resolver-generated UUID и явный
`options.workflowId` запрещены для root workflow Admin aggregate mutation. Это правило не меняет
idempotency дочерних workflow: child workflow/event publication по-прежнему используют
`source: "workflow"` с parent `DBOS.workflowID`, стабильными `stepId` и `callId`.

## Durable workflow

Каждая `<aggregate>Update` реализуется как зарегистрированный DBOS `@Workflow` и запускается через
service broker. Update-workflow является единственным orchestration write path для изменений
сохраняемого aggregate. Отдельные lifecycle-мутации `<aggregate>Create` и `<aggregate>Delete`
следуют тем же правилам durable execution и transactional steps и публикуют соответственно
`<aggregate>Created` и `<aggregate>Deleted`.

Типовой порядок выполнения:

```text
Admin resolver
  -> map and validate input
  -> <service>.<aggregate>Update durable workflow
       -> durable pre-validation
       -> transactional operation step 1
       -> transactional operation step 2
       -> ...
       -> durable <aggregate>Updated publication
  -> aggregate + operationResults + userErrors
```

Удаление имеет независимый durable path:

```text
Admin resolver
  -> decode and validate delete command
  -> <service>.<aggregate>Delete durable workflow
       -> durable pre-validation
       -> transactional aggregate delete step
       -> durable <aggregate>Deleted publication
  -> deleted aggregate ID + userErrors
```

`<Aggregate>DeleteWorkflow` не наследует `AggregateUpdateWorkflow` и не подменяет delete вызовом
update-workflow. Delete-workflow обязан соблюдать те же требования к replay safety, tenant scope,
transactional boundaries, idempotency и durable event publication.

Workflow body должен быть replay-safe. Генерация ID, времени, случайных значений и любые другие
недетерминированные действия выполняются внутри durable step, чтобы replay получил сохранённый
результат.

### Базовый контракт AggregateUpdateWorkflow

Все новые Admin update-workflows с массивом operations обязаны наследовать `AggregateUpdateWorkflow`
из `@shopana/shared-kernel`:

```ts
import {
  AggregateUpdateWorkflow,
  type AggregateOperationPlanItem,
  type AggregateOperationRef,
  type AggregatePrevalidation,
} from "@shopana/shared-kernel";

class ExampleUpdateWorkflow extends AggregateUpdateWorkflow<
  ExampleUpdateInput,
  ExampleOperation,
  OperationResult,
  ExampleChanges,
  ExampleUpdateResult
> {
  @Workflow("exampleUpdate")
  async run(input: ExampleUpdateInput): Promise<ExampleUpdateResult> {
    return this.executeAggregateUpdate(input);
  }

  // Реализации domain-specific hooks приведены ниже.
}
```

Базовый класс не заменяет `@Workflow`, `@Policy` или service-local `@TransactionalStep()`: они
остаются на concrete workflow. Он фиксирует общий lifecycle:

```text
prevalidateAggregate
  -> planOperations
  -> applyPlanItem для каждого plan item в input order
  -> merge checkpointed changes
  -> successResult (event только при actual changes)
```

Concrete workflow обязан реализовать следующие hooks:

| Hook                                                   | Назначение и ограничения                                                                                                                                                                                                     |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `operations(input)`                                    | Возвращает immutable ordered список internal operations. Позиция элемента в этом списке — его публичная identity.                                                                                                            |
| `prevalidateAggregate(input)`                          | Выполняет durable prevalidation через `@WorkflowStep()` и `kernel.runScript()`: tenant/ownership, aggregate-wide invariants, взаимные зависимости operations. До первого write.                                              |
| `planOperations(refs)`                                 | Возвращает execution plan. Каждый index input обязан присутствовать ровно один раз и в исходном порядке. Batch допускается только как группа **непрерывных** positions.                                                      |
| `applyPlanItem(input, item)`                           | Запускает только local `@TransactionalStep()` methods и возвращает `Map<position, DurableStepResult>`. Map обязан содержать один результат для каждой позиции group; результат нельзя сопоставлять по порядку ответа script. |
| `mergeChanges` / `initialChanges` / `hasActualChanges` | Восстанавливают event change hints исключительно из checkpointed step results. `null` changes означает no-op.                                                                                                                |
| `prevalidationFailure`                                 | Формирует ordered failure results без writes.                                                                                                                                                                                |
| `successResult`                                        | Формирует payload и после всех commits запускает child workflow/saga для event или external delivery.                                                                                                                        |

`AggregateUpdateWorkflow` проверяет plan и результаты runtime-инвариантами: все позиции должны быть
покрыты ровно один раз, batch positions должны быть непрерывны, и handler обязан вернуть outcome для
каждой позиции. Поэтому запрещены `results.push(...)`, индексное сопоставление batch-ответов и
отложенное выполнение operation вне её plan group.

#### Partial apply и atomicity

Partial apply допустим только между независимыми public operations. Каждая operation или явно
объявленная dependent batch group должна иметь один transactional apply boundary. Внутри apply:

- business validation выполняется до первого write (предпочтительно в `prevalidateAggregate`);
- successful result возвращается только после всех связанных local writes;
- если после первого write обнаружена ошибка, она не превращается в `applied: false`: exception
  выходит из `@TransactionalStep()`, чтобы DBOS откатил transaction и checkpoint;
- handler не вызывает broker, HTTP, storage или другой service.

Если swap или иной algorithm требует перестановки database writes, он моделируется contiguous batch
group. Внутренний порядок SQL может отличаться от input только внутри этой группы, но
`OperationResult` и ошибки всегда возвращаются по исходной `position`.

### Критерии качества workflow

- workflow имеет единственный broker-registered `@Workflow` entry point; root Admin aggregate
  mutation запускает его только с `source: "time-window"`, tenant scope, transport-assigned
  `requestTimestamp`, `windowMs: 5_000` и semantic content без volatile metadata;
- `<aggregate>Update` запускается в partitioned queue с key, однозначно определяющим aggregate
  instance (`storeId:aggregateType:aggregateId`); одинаковый key выполняется последовательно, а
  time-window duplicate не создаёт вторую queue entry;
- body replay-safe: порядок, ветвления и аргументы steps зависят только от input и сохранённых step
  results; ID, время, random и другие nondeterministic values создаются только в durable step;
- все значимые этапы имеют отдельную durable step boundary, а database writes выполняются только в
  `@TransactionalStep()`;
- workflow не обращается к `repository` напрямую, включая pre-validation и read-only steps: каждый
  local database step вызывает script через `kernel.runScript(..., workflowContext)`; это
  восстанавливает `ServiceContext` и tenant scope при DBOS replay;
- transactional step атомарно коммитит local domain writes и DBOS checkpoint, содержит только local
  database work и выпускает exception наружу;
- direct broker calls, S3, HTTP, email и прочие external side effects выполняются в отдельных
  `@SideEffectStep()` только после local commit; это настоящий durable DBOS step с retry/timeout, и
  каждый вызов имеет стабильный idempotency context, если это поддерживает target;
- `broker.runWorkflow()` и `broker.runSaga()` нельзя вызывать из `@WorkflowStep()`,
  `@SideEffectStep()` или `@TransactionalStep()`; метод запуска child workflow/saga помечается
  metadata-only декоратором `@ChildWorkflowStep()` и вызывается непосредственно из workflow body
  после завершения нужного step со стабильными `parentWorkflowId`, `stepId` и `callId`;
- retry policy применяется только к transient errors и ограничена backoff/attempts; business,
  validation и timeout errors не retry-ятся как transient; критичные ошибки delivery нельзя
  логировать и проглатывать;
- concrete workflow отвечает только за orchestration: планирование operations, вызов durable steps,
  сбор checkpointed change hints и запуск post-commit delivery. Сложная domain validation,
  расчёты и преобразования выносятся в типизированные scripts/services; workflow не становится
  service locator-ом или monolithic обработчиком всех правил aggregate;
- зависимости workflow (kernel, repository bridge, scripts/services) передаются явно через DI.
  `getInstance()`, mutable global singleton и скрытое получение runtime dependency внутри workflow
  запрещены;
- dispatch internal operations должен быть исчерпывающим (`switch` по discriminated union с
  `assertNever`). Нельзя определять тип operation через `startsWith`, string matching или
  отправлять неизвестный type в default handler другой operation;
- read boundary типобезопасен: тип query однозначно определяет тип результата. Запрещено
  приводить `unknown` к произвольному generic `T` на границе `runScript`; для этого используется
  discriminated query/result map либо отдельные типизированные read scripts;
- input workflow, execution plan и checkpointed results immutable (`readonly`). Workflow и scripts
  не мутируют caller-owned arrays, objects или accumulator; change hints всегда возвращаются из
  durable step result;
- prevalidation и apply не создают N+1 database calls: IDs собираются и читаются batch-запросами,
  где это возможно; расчёты cardinality/combinations проверяют переполнение и safe-integer range;
- до первого write step проверены auth/tenant scope, ownership и aggregate-wide invariants;
- contract явно определяет atomicity: partial apply допустим только для независимых operations;
  распределённые изменения с необходимой отменой реализуются durable saga с compensation;
- `operationResults` и errors стабильны: сохраняют порядок input, machine-readable code и исходный
  GraphQL field path;
- event запускается как durable child workflow непосредственно из workflow body только после
  фактического commit, включает tenant, actor и subject и не отправляется для no-op или полностью
  неуспешного request; aggregate lifecycle event содержит обязательный sanitised `payload.audit`,
  собранный из checkpointed step results;
- в workflow и его write path отсутствуют CAS/optimistic-lock preconditions;
- workflow ID, step ID, aggregate ID и tenant доступны в logs/traces; изменения кода не должны
  менять смысл уже сохранённых steps при replay существующих executions.

## Сквозной запрет CAS

Compare-and-swap (CAS) и optimistic locking полностью запрещены на write path независимо от того, на
каком слое скрыта проверка.

Общее project-wide правило определено в [[patterns/no-cas]] и обязательно для всех сервисов.

Запрет обязателен для всех слоёв:

- schema/migrations не добавляют `version`, `revision`, `lock_version`, timestamp или hash column,
  предназначенные для CAS;
- SQL и Drizzle updates/deletes не добавляют expected version/revision/timestamp/hash в `WHERE` и не
  выполняют предварительную read-compare-write проверку;
- repositories, mutation builders и scripts не принимают CAS token, не создают stale-object
  conflicts и не превращают affected-row count в optimistic-lock semantics;
- workflows и broker contracts не передают expected state token между steps или сервисами;
- GraphQL schema, resolvers, REST/internal API, events и clients не выставляют CAS precondition,
  включая `expectedVersion`, `expectedRevision`, `If-Match` и ETag для writes;
- UI не хранит и не отправляет version/revision как условие применения изменений и не предлагает
  retry flow, основанный на обновлении CAS token.

Технические sequence/revision/version identifiers допустимы только как immutable provenance, порядок
событий, версия формата или idempotency metadata. Они не могут приниматься от caller-а или
сравниваться с текущим mutable state как precondition для write. Проверка tenant scope, identity и
ожидаемой кардинальности affected rows остаётся обязательной, но mismatch является not-found, scope
или integrity error, а не CAS conflict.

## Транзакционные steps

Каждая operation, которая пишет в PostgreSQL сервиса, выполняется в отдельном
`@TransactionalStep()`. Step атомарно коммитит domain writes и DBOS completion checkpoint в
`dbos.transaction_completion`.

```ts
@TransactionalStep({
  txManager: (self: ExampleUpdateWorkflow) => self.kernel.repository.txManager,
  bridge: (self: ExampleUpdateWorkflow) =>
    self.kernel.repository.dbosTransactionBridge,
})
private async stepUpdateFields(
  params: ExampleUpdateParams,
  context: RunScriptContext,
): Promise<OperationResult> {
  return this.kernel.runScript(ExampleUpdateScript, params, context);
}
```

Обязательные свойства транзакционного step:

- внутри находится только database work текущего сервиса;
- все записи, необходимые для инвариантов одной operation, выполняются в одной транзакции;
- вложенные scripts/repositories переиспользуют текущую DBOS transaction;
- exception должен выйти из step; нельзя преобразовывать инфраструктурный сбой в успешный checkpoint
  с failure value;
- broker calls, child workflows, другие сервисы, S3, email, webhooks и любые внешние side effects
  внутри `@TransactionalStep()` запрещены;
- DB write нельзя помещать в обычный `@WorkflowStep()`;
- `@TransactionalStep()` нельзя оборачивать в `DBOS.runStep()`.

Если одна публичная operation содержит несколько тесно связанных database writes, они остаются одним
transactional step. Если операции независимы и контракт допускает partial apply, каждая получает
отдельный transactional step и отдельный `OperationResult`. Семантика atomicity должна быть
определена до реализации, а не случайно зависеть от количества scripts.

Distributed operation, требующая компенсации уже завершённых внешних действий, моделируется durable
saga. Она не отменяет правило: локальные database writes всё равно выполняются только в
`@TransactionalStep()`, вызванном из saga body, а внешние вызовы — в отдельных durable saga steps.

## Ошибки и partial apply

До первого write step workflow должен выполнить всю проверку, необходимую для предотвращения
предсказуемо некорректного batch: ownership, ссылки между owned entities и aggregate-wide
инварианты.

Business/validation error конкретной operation возвращается в её `OperationResult.errors`. Ранее
закоммиченные независимые operations не откатываются автоматически. Если контракт разрешает
продолжение, workflow выполняет следующие operations и возвращает полный ordered result. Если
инвариант требует all-or-nothing, связанные изменения должны быть объединены в одну operation и один
transactional step либо реализованы saga с явно определённой компенсацией.

Infrastructure exception не маскируется под `userErrors`: он должен позволить DBOS повторить или
восстановить workflow согласно retry policy.

## Публикация aggregate event

После фактического изменения aggregate update-workflow обязан публиковать доменное событие
`<aggregate>Updated`; create-workflow после создания публикует `<aggregate>Created`, а
delete-workflow после удаления публикует `<aggregate>Deleted`. Публикация выполняется после
завершения всех соответствующих database transactions и отдельно от них.

Предпочтительный путь соответствует `ProductUpdateWorkflow`:

```ts
@ChildWorkflowStep()
private async emitExampleUpdated(input: Input, changes: Changes): Promise<void> {
  await this.broker.runWorkflow(
    "events.emit",
    {
      eventType: "exampleUpdated",
      payload: {
        exampleId: input.exampleId,
        storeId: input.context.storeId,
        reasons: getExampleUpdatedReasons(changes),
      },
      context: {
        organizationId: input.context.organizationId,
        userId: input.context.userId,
      },
      subject: { type: "example", id: input.exampleId },
      actor: input.context.userId
        ? { type: "user", id: input.context.userId }
        : undefined,
      emitKey: `example:${input.exampleId}`,
    },
    {
      source: "workflow",
      workflowId: DBOS.workflowID!,
      stepId: "emitExampleUpdated",
      callId: input.exampleId,
    },
  );
}
```

Требования к событию:

- метод emit помечается `@ChildWorkflowStep()`, который хранит только semantic metadata и не создаёт
  DBOS step; метод вызывается непосредственно из parent workflow body после завершения
  соответствующих transactional steps;
- idempotency context выводится из parent `DBOS.workflowID`, стабильного `stepId` и `callId`;
- событие содержит tenant/store context, aggregate ID, actor и subject;
- payload содержит только контрактно необходимые change hints/reasons или partial deltas;
- событие публикуется, если хотя бы одна operation действительно изменила состояние;
- при partial apply событие описывает только успешно применённые изменения;
- no-op, pre-validation failure и полностью неуспешный request событие не публикуют;
- сбой публикации не должен теряться: durable execution обязано возобновить delivery после
  восстановления процесса;
- custom outbox tables и polling publishers запрещены.

### Audit contract aggregate mutation event

Каждое событие `<aggregate>Created`, `<aggregate>Updated` и `<aggregate>Deleted`, опубликованное
Admin aggregate mutation workflow, обязано содержать стандартизированный `payload.audit`. Отдельное
событие только для audit и прямой вызов `audit.*` из mutation workflow запрещены: audit service
строит append-only projection как durable subscriber существующих aggregate lifecycle events.

Минимальный контракт:

```ts
interface AggregateMutationAudit {
  readonly kind: "aggregate-mutation";
  readonly schemaVersion: 1;
  readonly storeId: string;
  readonly action: "CREATE" | "UPDATE" | "DELETE";
  readonly command: string;
  readonly aggregate: {
    readonly type: string;
    readonly id: string;
  };
  readonly operations: readonly AggregateMutationAuditOperation[];
}

interface AggregateMutationAuditOperation {
  readonly position: number;
  readonly type: string;
  readonly action: "CREATE" | "UPDATE" | "DELETE" | "MOVE" | "LINK" | "UNLINK";
  readonly target?: {
    readonly type: string;
    readonly id: string;
  };
  readonly changes: readonly AggregateMutationAuditChange[];
}

interface AggregateMutationAuditChange {
  readonly path: string;
  readonly kind: "SET" | "ADD" | "REMOVE" | "MOVE";
  readonly before?: SanitizedAuditValue;
  readonly after?: SanitizedAuditValue;
}
```

Audit envelope формируется по следующим правилам:

- update-workflow собирает audit operations исключительно из checkpointed результатов
  `@TransactionalStep()`, а не из исходного GraphQL input и не через повторное чтение aggregate
  после commit;
- transactional step возвращает audit fact вместе с `OperationResult` и change hints; fact должен
  описывать только фактически закоммиченные изменения этой public operation;
- `payload.audit.operations` сохраняет input `position`; при partial apply включает только
  operations с `applied: true`, которые действительно изменили состояние;
- owned entity указывается в `target`, но event `subject` и `audit.aggregate` всегда указывают на
  aggregate root;
- create/delete используют одну synthetic operation с `position: 0`; delete не выполняет post-commit
  read удалённой записи;
- raw GraphQL input, полный entity snapshot, `OperationResult.errors`, request metadata и
  произвольный domain event payload нельзя копировать в audit envelope;
- `actor` находится в стандартном event envelope и берётся из trusted workflow context: Admin user,
  service или system; имя, email и другие actor snapshots в audit payload не помещаются;
- event timestamp, event ID и monotonic subject sequence назначает events service; mutation workflow
  не генерирует их для audit самостоятельно;
- no-op, prevalidation failure и полностью неуспешный request не создают aggregate event и audit
  entry; аудит неуспешных попыток относится к отдельному security/activity contract;
- отсутствие обязательного audit envelope или невалидный audit field contract является ошибкой
  durable event publication и не должно молча игнорироваться.

#### PII masking

PII и secrets должны быть удалены или замаскированы producer-ом до вызова `events.emit`.
Маскирование только в audit event handler запрещено, потому что events service уже сохраняет event
payload до dispatch subscriber-ам.

Каждый bounded context определяет code-owned allowlist audit fields:

- значение non-PII поля может быть сохранено только при явном разрешении policy;
- для PII сохраняются только semantic path/action и значение со state `MASKED` или `OMITTED`;
- passwords, credentials, tokens, payment secrets и аналогичные secret fields не включаются;
- неизвестный field path обрабатывается fail-closed и не превращается в автоматически разрешённое
  audit value;
- audit service повторно валидирует envelope при ingestion, но эта проверка является вторым рубежом
  и не заменяет producer-side sanitisation.

Audit facts являются частью durable step result: workflow replay восстанавливает их из checkpoint,
не вычисляет заново из текущего состояния и не меняет уже опубликованный исторический смысл.

Побочные действия, зависящие от события, выполняются подписчиками. Они не должны создавать второй
прямой write path к aggregate владельца.

## Запрещённые варианты

- отдельные CRUD mutations для owned entities aggregate;
- отдельные `publish`, `unpublish`, `move`, `attach`, `detach`, `setMedia` mutations вместо
  operations;
- удаление aggregate root через `<aggregate>Update` operation вместо отдельной `<aggregate>Delete`
  mutation и durable workflow;
- resolver, последовательно вызывающий несколько write scripts или repositories;
- `<aggregate>Create`, который пишет напрямую, не запускает durable workflow или не публикует
  `<aggregate>Created` после commit;
- `<aggregate>Delete`, который пишет напрямую, не запускает durable workflow или не публикует
  `<aggregate>Deleted` после commit;
- DB write в обычном `@WorkflowStep()`;
- `broker.runWorkflow()` или `broker.runSaga()` внутри `@WorkflowStep()`, `@SideEffectStep()` или
  `@TransactionalStep()`;
- broker/event emit внутри `@TransactionalStep()`;
- event emit после возврата из недолговечного resolver без durable parent workflow;
- aggregate lifecycle event без обязательного sanitised `payload.audit`;
- построение audit envelope из raw mutation input, post-commit aggregate read или непроверенного
  event payload вместо checkpointed transactional step results;
- маскирование PII только в audit consumer после сохранения исходного event payload;
- отдельный audit event или прямой вызов `audit.*` из mutation workflow вместо durable subscription
  на существующее `<aggregate>Created|Updated|Deleted` событие;
- один внешний side effect и database write в общей транзакционной функции;
- CAS/optimistic locking на любом слое от database schema и repository до workflow, API и UI;
- version/revision/timestamp/hash predicate, read-compare-write или affected-row conflict,
  используемые как CAS precondition;
- custom outbox table, publish queue или polling worker;
- `source: "content"`, request ID, resolver-generated UUID или explicit workflow ID как idempotency
  identity root Admin aggregate mutation;
- вычисление `requestTimestamp` внутри resolver/workflow или включение timestamp в semantic content
  hash;
- локальный cache/mutex/status lookup вместо атомарного time-window resolution в `WorkflowRegistry`;
- запуск `<aggregate>Update` без partitioned queue, с partition key шире или уже aggregate instance,
  либо с повторной queue entry для time-window duplicate;
- альтернативный внутренний endpoint, обходящий aggregate workflow для той же операции.
- batch mutation, которая дублирует single-aggregate operations отдельными scripts/repositories или
  используется как альтернативный write path одного aggregate без документированной semantic
  command;
- batch input без non-empty validation, явных size limits, полной request-level prevalidation и
  стабильного соответствия input positions результатам и error paths;
- batch coordinator с одним batch-wide partition key, обходом child aggregate queue, случайной
  child identity или заявленной all-or-nothing atomicity поверх независимо коммитящих workflows;
- синхронное выполнение всех aggregate groups в рамках GraphQL response вместо durable job,
  in-memory progress либо execution errors, которые не сохраняются в job items;
- overlapping batch jobs без aggregate fence/supersession contract либо применение operation после
  перехода соответствующего item в `CANCELLED` или `SUPERSEDED`;
- workflow-файл или принадлежащие ему scripts вне собственной папки workflow;
- переиспользование одного script несколькими workflows либо импорт DTO одного workflow другим
  workflow как способ разделить бизнес-контракт;
- использование `aggregate` в именах concrete business-domain сущностей, DTO, scripts, operations,
  GraphQL contracts, событий или идентификаторов вместо фактического имени доменной сущности.

## Review checklist

Перед добавлением или изменением Admin mutation необходимо проверить:

1. Все writes сохраняемого aggregate доступны через одну `<aggregate>Update` с `operations`;
   удаление самого aggregate root доступно только через отдельную `<aggregate>Delete`.
2. Owned entity CRUD и lifecycle changes, кроме удаления aggregate root, представлены operations, а
   не отдельными mutations.
3. Resolver только декодирует/map-ит input и запускает durable workflow, включая lifecycle-команды
   `<aggregate>Create` и `<aggregate>Delete`.
4. Каждый workflow зарегистрирован как `<service>.<aggregate>Update`, `<service>.<aggregate>Create`
   или `<service>.<aggregate>Delete`; root resolver запускает его с `source: "time-window"`,
   `organizationId`, semantic `resourceId`/`operation`/`content`, transport-assigned
   `requestTimestamp` и `windowMs: 5_000`.
5. Каждая database operation выполняется в `@TransactionalStep()`.
6. Aggregate-wide инварианты проверены до несовместимых writes.
7. `operationResults` сохраняют порядок input и точные GraphQL error paths.
8. Direct external calls находятся в `@SideEffectStep()`, а child workflows/sagas помечены
   `@ChildWorkflowStep()` и запускаются из workflow body; внутри transactional steps их нет.
9. `<aggregate>Updated`, `<aggregate>Created` или `<aggregate>Deleted` публикуется durable после
   commit и только при фактическом изменении, создании или удалении.
10. Повторный semantic request в пределах пяти секунд получает тот же result/in-flight workflow;
    workflow replay не дублирует writes и события, duplicate не создаёт новую queue entry, а
    volatile request metadata не входит в hash.
11. `<aggregate>Update` запускается в зарегистрированной partitioned queue с key
    `storeId:aggregateType:aggregateId`; concurrent updates одного aggregate исполняются по
    порядку, а разных aggregate могут исполняться параллельно.
12. Новый endpoint не создаёт второй write path к тому же aggregate.
13. Любое исключение из unified mutation rule документировано как отдельное архитектурное решение.
14. На write path нет CAS columns, predicates, tokens, stale-object conflicts или client retry
    protocol.
15. Новый workflow с operations наследует `AggregateUpdateWorkflow`; plan покрывает каждую input
    position ровно один раз, а batch outcomes сопоставлены по position, не по порядку ответа script.
16. Workflow не содержит domain-реализацию всех operations: его зависимости внедрены через DI,
    dispatch исчерпывающий, а сложные validation/calculation вынесены в типизированные scripts или
    services.
17. Workflow input и results immutable; read scripts типобезопасны, без cast `unknown as T`.
18. Для batch input заданы ограничения размера; prevalidation не содержит N+1 reads и проверяет
    переполнение вычислений combinations/cardinality.
19. Aggregate lifecycle event содержит валидный `payload.audit`; update audit facts восстановлены из
    checkpointed step results, сохраняют input position и включают только фактически применённые
    изменения.
20. Audit values проходят producer-side allowlist и PII masking до `events.emit`; raw input, full
    snapshots, secrets и volatile request metadata в audit envelope отсутствуют.
21. Multi-aggregate batch mutation реализована как durable asynchronous job с persistent job/item
    lifecycle, progress, cancellation и execution errors, доступными после mutation response.
22. Batch items используют canonical mapper, internal operations и `<aggregate>Update` child
    workflow; resolver и coordinator не выполняют aggregate domain writes напрямую.
23. Batch input non-empty и bounded по aggregate items и суммарным operations; все IDs,
    request-level invariants и canonical mapping проверены до durable start, а database
    prevalidation завершена до первого child update.
24. Duplicates группируются детерминированно по `(inputItemPosition, operationPosition)`; job items
    сохраняют public identity/path каждой operation, а child results сопоставляются по position.
25. Job/items/fences создаются в durable transactional step; overlapping jobs используют aggregate
    fence и `SUPERSEDED`, cancellation не откатывает committed operations.
26. Coordinator использует `time-window` idempotency без volatile content; child workflows имеют
    stable parent-derived identity и canonical aggregate partition key.
27. Partial apply между aggregates явно отражён terminal item statuses; aggregate events и audit
    публикуются каждым child workflow только после его commit и не дублируются coordinator-ом.
28. Каждый concrete workflow находится в собственной папке вместе со всеми принадлежащими ему
    scripts и отдельной папкой `dto`; scripts не переиспользуются между workflows.
29. Concrete business-domain код и контракты используют имена доменных сущностей и не вводят
    `aggregate` как имя сущности, DTO, operation, script, события или идентификатора.

## Связанные документы

- [[patterns/admin-graphql-layer]] — структура Admin GraphQL client layer
- [[packages/dbos/workflows]] — replay и durable step rules
- [[packages/dbos/transactional-steps]] — транзакционная граница database writes
- [[architecture/transactional-outbox]] — durable delivery без custom outbox
- `services/catalog/src/workflows/PRODUCT_UPDATE_WORKFLOW.md` — референс operations и event payload
