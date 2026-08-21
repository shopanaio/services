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
  - packages/dbos/workflows
  - packages/dbos/transactional-steps
  - architecture/transactional-outbox
---

# Admin Aggregate Update Mutations

## Решение

Все изменения уже существующего aggregate root через Admin GraphQL API должны проходить через
одну объединённую мутацию:

```graphql
<aggregate>Update(
  <aggregate>Id: ID!
  operations: <Aggregate>UpdateInput
): <Aggregate>UpdatePayload!
```

`operations` описывает все допустимые изменения самого aggregate root и принадлежащих ему
сущностей. Отдельные admin-мутации для изменения полей, статуса, порядка, связей или CRUD
дочерних сущностей запрещены.

Эталон паттерна — `productUpdate` и `ProductUpdateWorkflow`: resolver преобразует GraphQL input в
упорядоченные внутренние operations, запускает один durable workflow, workflow применяет operations
отдельными durable steps, собирает `operationResults` и после успешных изменений публикует
`productUpdated`.

## Область действия

Правило обязательно для всех Admin API bounded contexts и всех записей, принадлежащих aggregate:

- patch полей aggregate root;
- изменение lifecycle/status, publish/unpublish и soft delete;
- добавление, изменение, удаление и переупорядочивание owned entities;
- изменение assignment/link сущностей, которыми владеет aggregate;
- пакетные изменения нескольких частей aggregate в одном запросе.

После создания aggregate любой его write path должен быть выражен как operation в
`<aggregate>Update`. Нельзя добавлять, например, `variantUpdate`, `categoryMove`,
`productPublish` или `<child>Create` как отдельный публичный write path, если действие принадлежит
aggregate и может быть представлено его update operation.

`<aggregate>Create` допускается только как bootstrap-команда, потому что aggregate root ещё не
существует. Иное отдельное имя мутации допускается только для самостоятельной semantic command,
которая не является изменением одного существующего aggregate. Такое исключение должно быть
явно обосновано в архитектурном документе bounded context. Удобство UI или исторически
существующий CRUD endpoint не являются обоснованием.

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

Контракт должен соблюдать следующие правила:

1. Идентификатор aggregate root передаётся отдельно от `operations`.
2. `operations` может быть nullable для единообразного no-op поведения.
3. Порядок элементов в массивах является частью контракта и сохраняется resolver-ом и workflow.
4. `OperationResult` содержит стабильный `type`, `applied`, при необходимости `entityId`, а также
   `errors` с путём к исходному полю `operations`.
5. `userErrors` содержит агрегированный список ошибок из `operationResults` и request-level
   ошибок.
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
5. запуском `<service>.<aggregate>Update` через `broker.runWorkflow()`;
6. преобразованием workflow result обратно в GraphQL payload.

Workflow ID/idempotency context должен быть детерминированным для логического admin request. Один и
тот же повторно доставленный request не должен запускать второй набор изменений.

Прямой вызов write script/repository из resolver запрещён. Публикация `<aggregate>Updated` из
resolver также запрещена: между commit и emit возникнет недолговечный разрыв, который невозможно
надёжно восстановить после падения процесса.

## Durable workflow

Каждая `<aggregate>Update` реализуется как зарегистрированный DBOS `@Workflow` и запускается через
service broker. Workflow является единственным orchestration write path для aggregate.

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

Workflow body должен быть replay-safe. Генерация ID, времени, случайных значений и любые другие
недетерминированные действия выполняются внутри durable step, чтобы replay получил сохранённый
результат.

### Критерии качества workflow

- workflow имеет единственный broker-registered `@Workflow` entry point и детерминированный
  idempotency context с tenant scope; повтор одного логического request не создаёт второй набор
  изменений;
- body replay-safe: порядок, ветвления и аргументы steps зависят только от input и сохранённых
  step results; ID, время, random и другие nondeterministic values создаются только в durable step;
- все значимые этапы имеют отдельную durable step boundary, а database writes выполняются только
  в `@TransactionalStep()`;
- transactional step атомарно коммитит local domain writes и DBOS checkpoint, содержит только
  local database work и выпускает exception наружу;
- broker calls, S3, HTTP, email и прочие external side effects выполняются в отдельных durable
  steps только после local commit; каждый вызов имеет стабильный idempotency context
  (`parentWorkflowId`, `stepId`, `callId`);
- `broker.runWorkflow()` и `broker.runSaga()` нельзя вызывать из `@WorkflowStep()` или
  `@TransactionalStep()`; child workflow/saga запускается непосредственно из workflow body после
  завершения нужного step;
- retry policy применяется только к transient errors и ограничена backoff/attempts; business,
  validation и timeout errors не retry-ятся как transient; критичные ошибки delivery нельзя
  логировать и проглатывать;
- до первого write step проверены auth/tenant scope, ownership и aggregate-wide invariants;
- contract явно определяет atomicity: partial apply допустим только для независимых operations;
  распределённые изменения с необходимой отменой реализуются durable saga с compensation;
- `operationResults` и errors стабильны: сохраняют порядок input, machine-readable code и исходный
  GraphQL field path;
- event публикуется отдельным durable delivery step только после фактического commit, включает
  tenant, actor и subject и не отправляется для no-op или полностью неуспешного request;
- в workflow и его write path отсутствуют CAS/optimistic-lock preconditions;
- workflow ID, step ID, aggregate ID и tenant доступны в logs/traces; изменения кода не должны
  менять смысл уже сохранённых steps при replay существующих executions.

## Сквозной запрет CAS

Compare-and-swap (CAS) и optimistic locking полностью запрещены на write path независимо от того,
на каком слое скрыта проверка.

Общее project-wide правило определено в [[patterns/no-cas]] и обязательно для всех сервисов.

Запрет обязателен для всех слоёв:

- schema/migrations не добавляют `version`, `revision`, `lock_version`, timestamp или hash column,
  предназначенные для CAS;
- SQL и Drizzle updates/deletes не добавляют expected version/revision/timestamp/hash в `WHERE` и
  не выполняют предварительную read-compare-write проверку;
- repositories, mutation builders и scripts не принимают CAS token, не создают stale-object
  conflicts и не превращают affected-row count в optimistic-lock semantics;
- workflows и broker contracts не передают expected state token между steps или сервисами;
- GraphQL schema, resolvers, REST/internal API, events и clients не выставляют CAS precondition,
  включая `expectedVersion`, `expectedRevision`, `If-Match` и ETag для writes;
- UI не хранит и не отправляет version/revision как условие применения изменений и не предлагает
  retry flow, основанный на обновлении CAS token.

Технические sequence/revision/version identifiers допустимы только как immutable provenance,
порядок событий, версия формата или idempotency metadata. Они не могут приниматься от caller-а или
сравниваться с текущим mutable state как precondition для write. Проверка tenant scope, identity и
ожидаемой кардинальности affected rows остаётся обязательной, но mismatch является not-found,
scope или integrity error, а не CAS conflict.

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
- exception должен выйти из step; нельзя преобразовывать инфраструктурный сбой в успешный
  checkpoint с failure value;
- broker calls, child workflows, другие сервисы, S3, email, webhooks и любые внешние side effects
  внутри `@TransactionalStep()` запрещены;
- DB write нельзя помещать в обычный `@WorkflowStep()`;
- `@TransactionalStep()` нельзя оборачивать в `DBOS.runStep()`.

Если одна публичная operation содержит несколько тесно связанных database writes, они остаются
одним transactional step. Если операции независимы и контракт допускает partial apply, каждая
получает отдельный transactional step и отдельный `OperationResult`. Семантика atomicity должна
быть определена до реализации, а не случайно зависеть от количества scripts.

Distributed operation, требующая компенсации уже завершённых внешних действий, моделируется
durable saga. Она не отменяет правило: локальные database writes всё равно выполняются только в
`@TransactionalStep()`, вызванном из saga body, а внешние вызовы — в отдельных durable saga steps.

## Ошибки и partial apply

До первого write step workflow должен выполнить всю проверку, необходимую для предотвращения
предсказуемо некорректного batch: ownership, ссылки между owned entities и aggregate-wide
инварианты.

Business/validation error конкретной operation возвращается в её `OperationResult.errors`.
Ранее закоммиченные независимые operations не откатываются автоматически. Если контракт разрешает
продолжение, workflow выполняет следующие operations и возвращает полный ordered result. Если
инвариант требует all-or-nothing, связанные изменения должны быть объединены в одну operation и
один transactional step либо реализованы saga с явно определённой компенсацией.

Infrastructure exception не маскируется под `userErrors`: он должен позволить DBOS повторить или
восстановить workflow согласно retry policy.

## Публикация aggregate event

После фактического изменения aggregate workflow обязан публиковать доменное событие
`<aggregate>Updated`. Публикация выполняется после завершения всех соответствующих database
transactions и отдельно от них.

Предпочтительный путь соответствует `ProductUpdateWorkflow`:

```ts
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
```

Требования к событию:

- emit запускается как durable child workflow или отдельный durable external step;
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
- resolver, последовательно вызывающий несколько write scripts или repositories;
- DB write в обычном `@WorkflowStep()`;
- broker/event emit внутри `@TransactionalStep()`;
- event emit после возврата из недолговечного resolver без durable parent workflow;
- один внешний side effect и database write в общей транзакционной функции;
- CAS/optimistic locking на любом слое от database schema и repository до workflow, API и UI;
- version/revision/timestamp/hash predicate, read-compare-write или affected-row conflict,
  используемые как CAS precondition;
- custom outbox table, publish queue или polling worker;
- альтернативный внутренний endpoint, обходящий aggregate workflow для той же операции.

## Review checklist

Перед добавлением или изменением Admin mutation необходимо проверить:

1. Все writes существующего aggregate доступны через одну `<aggregate>Update` с `operations`.
2. Owned entity CRUD и lifecycle changes представлены operations, а не отдельными mutations.
3. Resolver только декодирует/map-ит input и запускает durable workflow.
4. Workflow зарегистрирован как `<service>.<aggregate>Update` и имеет детерминированную
   idempotency identity.
5. Каждая database operation выполняется в `@TransactionalStep()`.
6. Aggregate-wide инварианты проверены до несовместимых writes.
7. `operationResults` сохраняют порядок input и точные GraphQL error paths.
8. External calls отсутствуют внутри transactional steps.
9. `<aggregate>Updated` публикуется durable после commit и только при реальных изменениях.
10. Повторный request или workflow replay не дублирует writes и события.
11. Новый endpoint не создаёт второй write path к тому же aggregate.
12. Любое исключение из unified mutation rule документировано как отдельное архитектурное решение.
13. На write path нет CAS columns, predicates, tokens, stale-object conflicts или client retry
    protocol.

## Связанные документы

- [[patterns/admin-graphql-layer]] — структура Admin GraphQL client layer
- [[packages/dbos/workflows]] — replay и durable step rules
- [[packages/dbos/transactional-steps]] — транзакционная граница database writes
- [[architecture/transactional-outbox]] — durable delivery без custom outbox
- `services/catalog/src/workflows/PRODUCT_UPDATE_WORKFLOW.md` — референс operations и event payload
