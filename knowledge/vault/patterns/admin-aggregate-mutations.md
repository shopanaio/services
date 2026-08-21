---
tags:
  - admin
  - graphql
  - aggregate
  - mutation
  - dbos
  - workflow
  - transaction
  - events
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
  operations: <Aggregate>UpdateInput
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
2. `operations` может быть nullable для единообразного no-op поведения.
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
- до первого write step проверены auth/tenant scope, ownership и aggregate-wide invariants;
- contract явно определяет atomicity: partial apply допустим только для независимых operations;
  распределённые изменения с необходимой отменой реализуются durable saga с compensation;
- `operationResults` и errors стабильны: сохраняют порядок input, machine-readable code и исходный
  GraphQL field path;
- event запускается как durable child workflow непосредственно из workflow body только после
  фактического commit, включает tenant, actor и subject и не отправляется для no-op или полностью
  неуспешного request;
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

## Связанные документы

- [[patterns/admin-graphql-layer]] — структура Admin GraphQL client layer
- [[packages/dbos/workflows]] — replay и durable step rules
- [[packages/dbos/transactional-steps]] — транзакционная граница database writes
- [[architecture/transactional-outbox]] — durable delivery без custom outbox
- `services/catalog/src/workflows/PRODUCT_UPDATE_WORKFLOW.md` — референс operations и event payload
