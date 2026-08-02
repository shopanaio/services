---
tags:
  - dbos
  - workflow
  - transaction
  - drizzle
  - postgres-js
  - shared-kernel
  - architecture
related:
  - packages/dbos/index
  - packages/dbos/workflows
  - packages/shared-kernel/transaction-manager
  - patterns/repository
  - configuration/bootstrap-config
---

# Tech Spec: TransactionalStep для DBOS + Drizzle + TransactionManager

## Цель

Добавить `@TransactionalStep()` для workflow-методов, которые пишут в PostgreSQL через Drizzle и должны атомарно коммитить:

- изменения service database;
- DBOS checkpoint/result в `dbos.transaction_completion`.

Внутри `@TransactionalStep()` существующие scripts/repositories с `@Transactional()` должны использовать transaction, открытую DBOS datasource, через существующий `TransactionManager`. Переписывать бизнес-логику script/repository слоя и переводить сервисы с `postgres-js` на `node-postgres` не требуется.

## Исследование

### DBOS transactions и datasources

Официальная документация DBOS `Transactions & Datasources` фиксирует:

- DBOS transaction — специальный workflow step для database access;
- user writes и DBOS checkpoint коммитятся одной database transaction;
- transaction callback должен использовать instance `dataSource.client`;
- instance client проверяет принадлежность активной transaction конкретному datasource;
- datasource требует таблицу `dbos.transaction_completion` в user database.

Документ: <https://docs.dbos.dev/typescript/tutorials/transaction-tutorial>

### `@dbos-inc/postgres-datasource@4.23.6`

Shopana использует `postgres@3.4.7` и `drizzle-orm/postgres-js`, поэтому основным datasource выбирается `@dbos-inc/postgres-datasource@4.23.6`, а не `@dbos-inc/drizzle-datasource`.

Проверенные свойства package:

- использует `postgres@^3.4.7`;
- `dataSource.client` имеет тип `postgres.TransactionSql`;
- `TransactionSql` наследует `Sql`;
- `runTransaction()` открывает `postgres-js` transaction;
- output checkpoint записывается тем же `TransactionSql` до commit;
- при ошибке user transaction откатывается, затем datasource durable-записывает serialized error;
- instance `dataSource.client` проверяет owner datasource;
- datasource автоматически повторяет PostgreSQL serialization failures с SQLSTATE `40001`;
- datasource регистрируется в DBOS в constructor и должен быть создан до `DBOS.launch()`;
- datasource владеет отдельным connection pool и закрывает его через `DBOS.shutdown()`.

`PostgresDataSource` не принимает уже созданный shared `Sql`, поэтому создаёт отдельный pool. Это не нарушает атомарность: repository calls внутри transactional step получают Drizzle client, построенный непосредственно поверх активного `dataSource.client`. Shared pool в этой execution path не используется.

### Совместимость с Drizzle Postgres.js

Текущий `drizzle-orm/postgres-js@0.45.1` принимает `TClient extends Sql`. Так как DBOS предоставляет `TransactionSql extends Sql`, transaction client можно обернуть без смены драйвера:

```ts
const txDb = drizzle(dataSource.client, { schema });
```

Полученный `PostgresJsDatabase<typeof schema>` использует активный DBOS transaction client. Это не cross-driver adapter и не runtime shim: DBOS datasource, Drizzle и существующие repositories работают через один `postgres-js` driver.

### Как datasource пишет checkpoint

Для write transaction внутри workflow datasource:

1. Получает `workflowID` и `stepID` из DBOS context.
2. Проверяет `dbos.transaction_completion` по `(workflow_id, function_num)`.
3. Если output/error уже сохранён, callback повторно не выполняется.
4. Открывает `postgres-js` transaction.
5. Выполняет callback с доступным `dataSource.client`.
6. До commit записывает serialized output через тот же transaction client.
7. При throw откатывает user writes.
8. После rollback записывает serialized error отдельным запросом.
9. При replay возвращает cached output или повторно бросает cached error.

Следствие: transaction callback должен throw при любой ошибке. Возвращать failure-value из callback запрещено, иначе datasource сочтёт transaction успешной и закоммитит изменения.

### Ограничение DBOS transition

Datasource `runTransaction()` сам является DBOS transaction-step. Его нельзя вызывать из callback обычного `DBOS.runStep()`.

Запрещённая форма:

```ts
DBOS.runStep(() => dataSource.runTransaction(...));
```

`@TransactionalStep()` должен напрямую вызывать datasource `runTransaction()` из workflow body.

## Текущее состояние Shopana

### Database layer

Сервисы используют:

- shared `postgres-js` client из `DatabaseModule`;
- `drizzle-orm/postgres-js`;
- service-specific `PostgresJsDatabase<typeof schema>`;
- один `TransactionManager` на aggregate `Repository`;
- repository queries через `txManager.getConnection()`.

Эта архитектура сохраняется.

### TransactionManager

`TransactionManager` содержит собственный instance-local `AsyncLocalStorage`:

- разные manager instances не видят transaction context друг друга;
- `run()` повторно использует transaction только внутри того же manager;
- при отсутствии store `run()` открывает transaction через root service database.

Для parent transaction injection не нужен `owner: symbol`: ALS уже изолирован по manager instance. Нужен только метод `runWithExistingTransaction()`.

### WorkflowStep

`@WorkflowStep()` вызывает `DBOS.runStep()` и для timeout/non-retryable failure возвращает internal failure result из step callback. Этот pattern нельзя переиспользовать для `@TransactionalStep()`, потому что failure-value означает успешный transaction callback.

## Architecture Decisions

### AD-1. Сохраняем Postgres.js

`@TransactionalStep()` использует `@dbos-inc/postgres-datasource@4.23.6`.

Не выполняются:

- миграция shared database layer на `pg.Pool`;
- перевод service databases на `drizzle-orm/node-postgres`;
- ретипизация всех repositories;
- изменение существующего timestamp behavior.

`@dbos-inc/drizzle-datasource` и `node-postgres` не входят в scope этой реализации.

### AD-2. Bridge создаёт service-typed Drizzle client

Datasource предоставляет raw `TransactionSql`. Bridge преобразует его в существующий service `Database` через переданную factory:

```ts
export interface DbosTransactionBridge<TDatabase, TConfig> {
  runTransaction<TResult>(
    options: TConfig & { name: string },
    callback: (db: TDatabase) => Promise<TResult>,
  ): Promise<TResult>;
}

export class PostgresDbosTransactionBridge<
  TDatabase,
  TConfig extends PostgresTransactionOptions,
> implements DbosTransactionBridge<TDatabase, TConfig> {
  constructor(
    private readonly dataSource: PostgresDataSource,
    private readonly createDatabase: (client: TransactionSql) => TDatabase,
  ) {}

  runTransaction<TResult>(
    options: TConfig & { name: string },
    callback: (db: TDatabase) => Promise<TResult>,
  ): Promise<TResult> {
    return this.dataSource.runTransaction(
      () => callback(this.createDatabase(this.dataSource.client)),
      options,
    );
  }
}
```

Service factory не должна использовать singleton cache root database:

```ts
export function createTransactionalDatabase(
  client: TransactionSql,
): Database {
  return drizzle(client, { schema });
}
```

Root `createDatabase(client: Sql)` может сохранять существующее singleton behavior. Transaction factory всегда создаёт scoped lightweight Drizzle wrapper поверх DBOS client.

### AD-3. TransactionManager получает external transaction injection

Добавляется:

```ts
runWithExistingTransaction<TResult>(
  tx: TTransaction,
  fn: () => Promise<TResult>,
): Promise<TResult>;
```

Rules:

- если store отсутствует, метод создаёт ALS context `{ tx, depth: 1 }` и выполняет `fn`;
- если store содержит тот же `tx`, разрешается nested reuse с increment/decrement `depth`;
- если store содержит другой `tx`, метод бросает configuration error;
- метод не открывает transaction и не вызывает `this.db.transaction()`;
- transaction lifecycle полностью принадлежит DBOS datasource.

Owner identity не добавляется. Ошибка, при которой script использует другой `TransactionManager`, проверяется repository wiring и integration scenario: instance-local owner не способен обнаружить context другого manager.

### AD-4. TransactionalStep напрямую вызывает datasource transaction

Execution shape:

```ts
bridge.runTransaction(
  { name: stepName, isolationLevel },
  (txDb) =>
    txManager.runWithExistingTransaction(txDb, () =>
      stepContextStorage.run(
        { signal: new AbortController().signal },
        () => originalMethod.apply(self, args),
      ),
    ),
);
```

`@TransactionalStep()`:

- не вызывает `DBOS.runStep()`;
- не поддерживает `retry` / `retriesAllowed`;
- не поддерживает `accessMode: "read only"`;
- не возвращает internal failure values;
- требует active workflow context;
- разрешает только database work без external side effects.

DBOS transaction numbering, replay и checkpointing предоставляет datasource `runTransaction()`.

### AD-5. JavaScript timeout в transaction запрещён

Текущий `withTimeout()` отклоняет wrapper promise и abort-ит signal, но не гарантирует фактическую остановку script/repository operation. После timeout бизнес-код может продолжить работу с уже откатываемым или закрытым transaction client.

Поэтому первая версия `@TransactionalStep()` не имеет `timeoutMs` и не использует `withTimeout()`.

Для совместимости с существующим `getSignal()` decorator создаёт never-aborted `AbortSignal` и помещает его в `stepContextStorage`. Этот signal документирует отсутствие cancellation и никогда не используется как timeout mechanism.

Допустимые будущие механизмы должны проектироваться отдельно:

- PostgreSQL `SET LOCAL statement_timeout`;
- PostgreSQL `SET LOCAL lock_timeout`;
- гарантированная driver-level cancellation;
- ожидание полного завершения/cancellation callback до выхода из transaction scope.

Простого `Promise.race()` или cooperative `AbortSignal` недостаточно.

### AD-6. Failure semantics

Обязательное поведение:

- success: user writes и `transaction_completion.output` коммитятся атомарно;
- thrown error: user writes откатываются, datasource сохраняет `transaction_completion.error`;
- replay success: callback не выполняется, возвращается cached output;
- replay error: callback не выполняется, бросается cached error;
- PostgreSQL serialization failures с SQLSTATE `40001` повторяются внутри datasource;
- остальные ошибки durable-кэшируются и не могут быть повторно исполнены для того же `(workflowID, stepID)`.

Нельзя выполнять external API, broker, S3, email или webhook внутри `@TransactionalStep()`: database retry может повторно выполнить callback до checkpoint.

### AD-7. Workflow context обязателен

Если `DBOS.workflowID === undefined`, decorator бросает configuration error до вызова bridge.

Вне workflow datasource может выполнить обычную database transaction без durable checkpoint, что противоречит контракту `@TransactionalStep()`.

### AD-8. Datasource lifecycle

`PostgresDataSource` регистрируется глобально в DBOS в момент construction. Поэтому:

- datasource создаётся во время Nest `onModuleInit` / Kernel creation;
- datasource должен быть создан до `WorkflowModule.onApplicationBootstrap()` и `DBOS.launch()`;
- lazy construction при первом workflow call запрещён;
- datasource name должен быть уникален во всём bootstrap process, например `catalog-db`;
- повторное создание другого datasource с тем же name запрещено;
- lifecycle pool принадлежит DBOS: initialize выполняется при `DBOS.launch()`, destroy — при `DBOS.shutdown()`;
- service/Kernel не вызывает `end()` для datasource pool.

Bridge остаётся service-specific и хранится рядом с service repository runtime. Отдельный global registry поверх DBOS registry не добавляется.

### AD-9. Datasource получает явную database configuration

`PostgresDataSource` создаёт собственный pool и требует те же host/port/user/password/database и совместимые pool limits, что service database. Credentials нельзя извлекать из уже созданного shared `Sql` или дублировать через чтение environment variables внутри service.

Shared database module должен экспортировать immutable normalized datasource options через отдельный injection token, например:

```ts
export const DATABASE_CONNECTION_OPTIONS = Symbol(
  "DATABASE_CONNECTION_OPTIONS",
);

export interface DatabaseConnectionOptions {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  max: number;
  idle_timeout: number;
  connect_timeout: number;
  max_lifetime: number;
}
```

Pilot service получает options через DI и создаёт `PostgresDataSource` до DBOS launch. Provider не экспортирует mutable `postgres.Options` instance и не логирует credentials.

Datasource pool limit учитывается в общем connection budget процесса. Нельзя автоматически копировать shared pool `max: 30` для каждого service datasource; pilot получает отдельный явно выбранный малый limit.

### AD-10. DBOS schema устанавливается миграцией

`dbos.transaction_completion` должна находиться в той же physical database, что и service tables, участвующие в transaction.

Schema/table добавляются обычной project migration. Runtime auto-create не является deployment strategy и не заменяет migration.

Требования:

- migration соответствует SQL из DBOS SDK `4.23.6`;
- migration создаёт schema/table идемпотентно в service database;
- application role после migration не обязана иметь `CREATE SCHEMA` / `CREATE TABLE`;
- datasource startup только проверяет наличие schema/table;
- changeset file вручную не редактируется.

Если несколько service schemas находятся в одной physical database, один `dbos.transaction_completion` может использоваться несколькими datasources: ключ `(workflow_id, function_num)` принадлежит DBOS workflow execution.

## Proposed API

### TransactionManager

```ts
class TransactionManager<TDatabase, TTransaction = TDatabase> {
  getConnection(): TDatabase | TTransaction;

  run<TResult>(fn: () => Promise<TResult>): Promise<TResult>;

  runWithExistingTransaction<TResult>(
    tx: TTransaction,
    fn: () => Promise<TResult>,
  ): Promise<TResult>;
}
```

`runWithDbosTransaction()` не добавляется: DBOS-specific orchestration принадлежит `@shopana/dbos` bridge/decorator, а shared `TransactionManager` знает только об external transaction object.

### Bridge

```ts
interface DbosTransactionBridge<TDatabase, TConfig> {
  runTransaction<TResult>(
    options: TConfig & { name: string },
    callback: (db: TDatabase) => Promise<TResult>,
  ): Promise<TResult>;
}
```

### TransactionalStep metadata

```ts
interface TransactionalStepMetadata<TSelf = unknown> {
  name?: string;
  isolationLevel?: PostgresTransactionOptions["isolationLevel"];
  txManager: (self: TSelf) => TransactionManagerLike;
  bridge: (
    self: TSelf,
  ) => DbosTransactionBridge<unknown, PostgresTransactionOptions>;
}
```

Metadata type отдельный и не наследуется от `WorkflowStepMetadata`.

Отсутствуют намеренно:

- `timeoutMs`;
- `retry`;
- `retriesAllowed`;
- `readOnly` / `accessMode`;
- `critical`.

### Repository wiring

```ts
export interface RepositoryConfig {
  db: Database;
  dbosTransactionBridge: DbosTransactionBridge<
    Database,
    PostgresTransactionOptions
  >;
}

export class Repository {
  public readonly txManager: TransactionManager<Database>;
  public readonly dbosTransactionBridge: DbosTransactionBridge<
    Database,
    PostgresTransactionOptions
  >;
}
```

Все child repositories/scripts должны получать именно `repository.txManager`. Создание второго manager для того же repository graph запрещено.

## Target Usage

```ts
@Injectable()
export class ProductBulkEditWorkflow extends BrokerWorkflows {
  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @TransactionalStep({
    txManager: (self: ProductBulkEditWorkflow) =>
      self.kernel.repository.txManager,
    bridge: (self: ProductBulkEditWorkflow) =>
      self.kernel.repository.dbosTransactionBridge,
  })
  private async stepCreateJob(
    products: ProductBulkUpdateItem[],
  ): Promise<{ jobId: string; productGroups: ProductGroup[] }> {
    return this.kernel.runScript(BulkEditCreateJobScript, { products });
  }
}
```

Execution flow:

1. Workflow body вызывает `stepCreateJob`.
2. Decorator проверяет active workflow context.
3. Decorator получает service `txManager` и bridge через resolvers.
4. Bridge вызывает `PostgresDataSource.runTransaction()`.
5. Datasource открывает `postgres-js` transaction.
6. Bridge получает instance `dataSource.client`.
7. Bridge создаёт scoped `PostgresJsDatabase<typeof schema>` поверх `TransactionSql`.
8. `txManager.runWithExistingTransaction(txDb, fn)` помещает scoped database в ALS этого manager.
9. Script `@Transactional()` вызывает `txManager.run()` и повторно использует active database, не открывая nested root transaction.
10. Repository methods получают scoped database через `getConnection()`.
11. На success datasource записывает output и коммитит одну transaction.
12. На throw datasource откатывает writes и durable-записывает error.

## WorkflowStep vs TransactionalStep

Использовать `@TransactionalStep()`, когда:

- step изменяет service PostgreSQL;
- step вызывает scripts/repositories с `@Transactional()`;
- replay не должен повторять committed writes;
- result должен быть checkpointed атомарно с writes.

Использовать `@WorkflowStep()`, когда:

- step вызывает external API/broker/S3/email/webhook;
- step запускает другой workflow;
- step выполняет CPU-only работу;
- step read-only и ему достаточно обычного DBOS step checkpoint.

Один step не должен смешивать transactional database writes и external side effects. Такой flow разделяется на несколько workflow steps.

Запрещено без доказанной business idempotency:

```ts
@WorkflowStep()
private async stepWriteDb() {
  await this.kernel.runScript(SomeTransactionalScript, input);
}
```

## Implementation Plan

1. Добавить dependency `@dbos-inc/postgres-datasource@4.23.6` в `@shopana/dbos` через package manager; changeset генерировать только разрешённой project command, не редактировать вручную.
2. Добавить generic `DbosTransactionBridge` и Postgres.js implementation в `@shopana/dbos`.
3. Добавить service-scoped factory `TransactionSql -> Database` без singleton cache.
4. Добавить `TransactionManager.runWithExistingTransaction()` без owner identity.
5. Добавить `runTransactionalStep()` без `DBOS.runStep()`, retry options и JavaScript timeout.
6. Добавить `@TransactionalStep()` decorator и отдельный metadata type.
7. Re-export public API из `@shopana/dbos` и `@shopana/shared-kernel`.
8. Добавить immutable `DATABASE_CONNECTION_OPTIONS` provider и передать pilot datasource явный ограниченный pool config.
9. Создать datasource/bridge во время pilot service Kernel initialization до `DBOS.launch()`.
10. Передать bridge в aggregate `Repository`; сохранить один общий `txManager` для всего repository graph.
11. Сгенерировать project migration для `dbos.transaction_completion`; не редактировать changeset вручную.
12. Конвертировать один pilot write step без external side effects.
13. Добавить focused tests/scenarios, перечисленные ниже. По текущей project instruction не запускать build/test/tsc для проверки; build запускать через `shopana-cli` только когда нужна новая версия кода.

## Verification Scenarios

Должны быть реализованы как focused integration/unit scenarios, даже если их запуск исключён текущей project instruction:

1. **Atomic success** — user row и `transaction_completion.output` появляются после одного successful call.
2. **Rollback** — script пишет row и бросает error; user write отсутствует, `transaction_completion.error` существует.
3. **Success replay** — тот же workflow/step возвращает cached output и не выполняет script повторно.
4. **Error replay** — тот же workflow/step бросает cached error и не выполняет script повторно.
5. **Nested `@Transactional()`** — несколько repository writes используют один DBOS transaction client.
6. **Different existing transaction** — `runWithExistingTransaction()` отвергает подмену active tx внутри того же manager.
7. **Wrong manager wiring** — scenario обнаруживает, что child repository не использует aggregate `repository.txManager`.
8. **Serialization retry** — retriable PostgreSQL transaction error не создаёт промежуточный checkpoint и callback безопасно повторяется.
9. **External side effects absent** — pilot transactional callback содержит только database operations.
10. **Workflow context required** — direct call вне workflow завершается до открытия datasource transaction.
11. **Lifecycle** — datasource создан до launch, duplicate name/lazy construction отвергаются.
12. **Migration present** — datasource startup видит заранее созданную `dbos.transaction_completion` без DDL privileges.
13. **Pool budget** — pilot datasource использует отдельный bounded pool и освобождает его через `DBOS.shutdown()`.

## Acceptance Criteria

- Pilot service продолжает использовать `postgres` и `drizzle-orm/postgres-js`.
- Нет миграции на `pg.Pool` / `drizzle-orm/node-postgres`.
- DBOS datasource — `@dbos-inc/postgres-datasource@4.23.6`.
- Bridge использует instance `dataSource.client` и создаёт Drizzle database поверх `TransactionSql`.
- `TransactionManager` имеет `runWithExistingTransaction()` и не получает лишний owner identity.
- Все repositories pilot graph используют один aggregate `txManager`.
- `@TransactionalStep()` не вызывает `DBOS.runStep()`.
- `@TransactionalStep()` не имеет JS timeout, retry и read-only options.
- `@Transactional()` scripts внутри step повторно используют DBOS transaction.
- Success атомарно коммитит user writes и checkpoint output.
- Throw откатывает user writes и приводит к durable error checkpoint.
- Replay не выполняет business callback повторно.
- Datasource создаётся до `DBOS.launch()` и имеет уникальное process-wide name.
- Datasource получает immutable connection options через DI и имеет явно ограниченный pool budget.
- `dbos.transaction_completion` добавлена project migration в service database.
- `@WorkflowStep()` остаётся без изменений.
- Changeset files не редактируются вручную.
- Build/test/tsc не запускаются для проверки в рамках текущей project instruction.

## Non-Goals

- Миграция service databases с Postgres.js на node-postgres.
- Поддержка `@dbos-inc/drizzle-datasource` в первой версии.
- Cross-service distributed transactions.
- External side effects внутри database transaction.
- JavaScript wall-clock timeout для transactional callback.
- Read-only transactional steps.
- Пользовательская retry policy поверх datasource transaction retry.
- Замена всех `@WorkflowStep()` на `@TransactionalStep()`.
- Runtime auto-migration DBOS schema.
- Ручное редактирование changeset files.
