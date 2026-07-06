---
tags:
  - dbos
  - workflow
  - transaction
  - drizzle
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

Добавить `@TransactionalStep()` для workflow методов, которые пишут в PostgreSQL через Drizzle и должны атомарно коммитить:

- user writes в service database;
- DBOS transaction checkpoint/result в `dbos.transaction_completion`.

Внутри `@TransactionalStep()` существующие scripts/repositories с `@Transactional()` должны использовать parent DBOS datasource transaction через `TransactionManager`, без переписывания бизнес-логики script/repository слоя.

## Исследование

### DBOS docs

Официальная документация DBOS `Transactions & Datasources` говорит:

- DBOS transactions are a special kind of step for database access;
- они выполняются как одна database transaction;
- атомарно коммитят user-defined changes и DBOS checkpoint;
- Drizzle datasource предоставляет Drizzle transaction client;
- transaction function должна использовать `dataSource.client`;
- instance `dataSource.client` предпочтительнее static client, потому что instance проверяет, что client принадлежит этому datasource;
- datasource требует `dbos.transaction_completion` table.

Документ: <https://docs.dbos.dev/typescript/tutorials/transaction-tutorial>

### Реальный пакет `@dbos-inc/drizzle-datasource@4.23.6`

Проверено через `npm view` и tarball `@dbos-inc/drizzle-datasource@4.23.6`.

Факты из package metadata:

- `main`: `dist/index.js`;
- `types`: `dist/index.d.ts`;
- dependencies: `pg`, `superjson`;
- peerDependencies: `drizzle-orm`, `@dbos-inc/dbos-sdk`;
- package description: DBOS DataSource library for Drizzle ORM with PostgreSQL support.

Факты из `index.ts`/`dist/index.d.ts`:

```ts
import { Client, ClientConfig, Pool, PoolClient, PoolConfig } from "pg";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";

export type TransactionConfig =
  Pick<PgTransactionConfig, "isolationLevel" | "accessMode"> & {
    name?: string;
  };

export declare class DrizzleDataSource<
  CT = NodePgDatabase<{ [key: string]: object }>
> implements DBOSDataSource<TransactionConfig> {
  readonly name: string;
  static get client(): NodePgDatabase<{ [key: string]: object }>;
  get client(): CT;

  static initializeDBOSSchema(
    configOrClient: ClientConfig | Client | PoolClient,
    schemaName?: string,
  ): Promise<void>;

  constructor(
    name: string,
    configOrPool: PoolConfig | Pool,
    entities?: { [key: string]: object },
    schemaName?: string,
  );

  runTransaction<T>(
    func: () => Promise<T>,
    config?: TransactionConfig,
  ): Promise<T>;
}
```

Выводы:

- DBOS Drizzle datasource **не использует `postgres-js`**.
- Он использует `pg.Pool` / `pg.Client` и `drizzle-orm/node-postgres`.
- `dataSource.client` существует и является официальным способом получить current transaction client внутри DBOS transaction.
- Instance `dataSource.client` имеет owner-check: если client запрашивается с неправильного datasource instance, пакет бросает `Invalid retrieval of DrizzleDataSource.client from the incorrect object`.
- `dataSource.client` доступен только внутри DBOS transaction. Вне transaction пакет бросает `Invalid use of DrizzleDataSource.client outside of a DBOS transaction`.
- `initializeDBOSSchema()` создает schema/table для `dbos.transaction_completion`.

### Как DBOS datasource пишет checkpoint

В `DrizzleTransactionHandler.invokeTransactionFunction()`:

1. DBOS вычисляет `workflowID` и `stepID`.
2. Для write transaction `saveResults = !readOnly && workflowID !== undefined`.
3. Перед выполнением проверяется `dbos.transaction_completion` по `(workflow_id, function_num)`.
4. Если output/error уже есть, user function не выполняется повторно.
5. User callback выполняется внутри `this.#drizzle.transaction(...)`.
6. Перед commit внутри той же transaction вызывается `#recordOutput(client, workflowID, stepID, ...)`.
7. Если user callback бросает ошибку, Drizzle transaction rollback-ится.
8. После rollback datasource записывает serialized error в `dbos.transaction_completion` через root drizzle connection.
9. При replay datasource rethrows serialized cached error.

Тесты package подтверждают failure behavior:

- `errorFunction()` сначала пишет в `greetings`, потом бросает error;
- после ошибки row остается с прежним `greet_count = 10`, значит user write rollback-нулся;
- в `dbos.transaction_completion` появляется row с `error`, `output = null`;
- повторный запуск того же workflowID rethrows cached error.

Вывод: для `@TransactionalStep()` нельзя возвращать internal failure result из transaction body. Нужно throw. Datasource сам rollback-ит user writes и durable-регистрирует error.

### Важное ограничение DBOS datasource

`@dbos-inc/dbos-sdk` datasource `runTransaction()` запрещает запуск transaction изнутри обычного DBOS step/transaction. В SDK есть проверка:

- если код уже внутри workflow, но не в workflow body, бросается invalid transition для вызова из `step` или `transaction`.

Вывод: `@TransactionalStep()` не может быть реализацией вида:

```ts
DBOS.runStep(() => dataSource.runTransaction(...));
```

`dataSource.runTransaction(...)` сам является DBOS transaction-step. `@TransactionalStep()` должен напрямую вызывать datasource transaction, без внешнего `DBOS.runStep()`.

## Текущее состояние Shopana

### Drizzle connection

Пример: `services/catalog/src/infrastructure/db/database.ts`.

Сейчас сервисы получают общий `postgres-js` client:

- `packages/shared-kernel/src/database/DatabaseModule.ts` создает `postgres(connectionString, poolOptions)`;
- provider `DATABASE_CLIENT` экспортирует `Sql`;
- service `createDatabase(client)` вызывает `drizzle(client, { schema })`;
- service repositories typed как `PostgresJsDatabase<typeof schema>`.

Текущий flow:

```ts
const db = createDatabase(dbClient);
const repository = await Repository.create({ db });
```

### TransactionManager и @Transactional

Файл: `packages/shared-kernel/src/TransactionManager.ts`.

Текущее поведение:

- `@Transactional()` всегда вызывает `txManager.run(...)`;
- `run()` читает process-wide `transactionStorage.getStore()`;
- если store есть, переиспользует `store.tx`;
- если store нет, открывает новую transaction через `this.db.transaction(...)`;
- единственное текущее место, где `transactionStorage.run(store, ...)` вызывается, находится внутри `this.db.transaction(...)`;
- `TransactionStore` сейчас содержит только `tx` и `depth`, owner identity нет.

Следствие: чтобы scripts с `@Transactional()` использовали DBOS datasource transaction, нужно положить `dataSource.client` в тот же `transactionStorage`.

### Broker @WorkflowStep

Файлы:

- `packages/dbos/src/workflow/decorators.ts`;
- `packages/dbos/src/step/runStep.ts`;
- `packages/shared-kernel/src/broker/BrokerWorkflows.ts`.

`@WorkflowStep()` сейчас:

- подменяет метод;
- вызывает `runStep(...)`;
- `runStep()` вызывает `DBOS.runStep(...)`;
- timeout/non-retryable errors превращаются в `{ kind: "timeout" | "nonRetryableFailure" }` и возвращаются из DBOS step callback.

Этот pattern запрещен для `@TransactionalStep()`, потому что returned failure value внутри datasource transaction будет successful callback с точки зрения DB transaction.

## Architecture Decisions

### AD-1. `@TransactionalStep()` требует node-postgres Drizzle

`@dbos-inc/drizzle-datasource@4.23.6` работает через:

- `pg`;
- `drizzle-orm/node-postgres`;
- `NodePgDatabase`.

Shopana сейчас использует:

- `postgres`;
- `drizzle-orm/postgres-js`;
- `PostgresJsDatabase`.

Решение: `@TransactionalStep()` реализуется только для services, переведенных на shared `pg.Pool` + `drizzle-orm/node-postgres`, либо не внедряется.

Adapter между `NodePgDatabase` transaction client и текущими `PostgresJsDatabase` repositories не принимается. Это был бы runtime/type-level shim поверх разных Drizzle drivers и different transaction clients.

### AD-2. Datasource и обычный service db должны использовать один driver/schema

Для service, где нужен `@TransactionalStep()`:

- `createDatabase()` должен возвращать `NodePgDatabase<typeof schema>`;
- `Repository` должен использовать `TransactionManager<NodePgDatabase<typeof schema>, NodePgTransactionLike>`;
- `DrizzleDataSource` должен создаваться с тем же `schema`;
- `dataSource.client` должен быть assignable к тому же transaction type, который `TransactionManager` кладет в ALS.

### AD-3. `TransactionManager` получает owner identity

Перед parent transaction injection нужно изменить `TransactionStore`:

```ts
interface TransactionStore<TTx> {
  tx: TTx;
  depth: number;
  owner: symbol;
}
```

Каждый `TransactionManager` получает private owner symbol. Rules:

- nested `run()` reuse разрешен только если `store.owner === this.owner`;
- если ALS содержит transaction другого owner, бросить ошибку;
- `runWithExistingTransaction(tx, fn)` кладет `{ tx, depth: 1, owner: this.owner }`;
- если `runWithExistingTransaction()` вызывается при чужом owner, бросить ошибку.

Это обязательное условие, потому что bootstrap process держит несколько services в одном Node process.

### AD-4. Bridge использует официальный `dataSource.client`

Bridge не изобретает свой access к tx. Он использует instance `dataSource.client`, потому что это официальный API DBOS Drizzle datasource и он проверяет owner.

```ts
interface DbosDrizzleTransactionBridge<TTransaction, TConfig> {
  runTransaction<TResult>(
    name: string,
    config: TConfig,
    callback: (tx: TTransaction) => Promise<TResult>,
  ): Promise<TResult>;
}
```

Implementation shape:

```ts
class DbosDrizzleTransactionBridge<TTransaction>
  implements DbosDrizzleTransactionBridge<TTransaction, TransactionConfig>
{
  constructor(private readonly dataSource: DrizzleDataSource<TTransaction>) {}

  runTransaction<TResult>(
    name: string,
    config: TransactionConfig,
    callback: (tx: TTransaction) => Promise<TResult>,
  ): Promise<TResult> {
    return this.dataSource.runTransaction(
      () => callback(this.dataSource.client),
      { ...config, name },
    );
  }
}
```

### AD-5. `@TransactionalStep()` is not `@WorkflowStep()`

`@TransactionalStep()` must not call `DBOS.runStep()`.

It calls:

```ts
bridge.runTransaction(stepName, txConfig, (tx) =>
  txManager.runWithExistingTransaction(tx, () =>
    withTimeout(
      (signal) => stepContextStorage.run({ signal }, () => fn(signal)),
      timeoutMs,
      stepName,
    ),
  ),
);
```

DBOS transaction numbering/checkpointing is provided by datasource `runTransaction()`, not by `DBOS.runStep()`.

### AD-6. Failure semantics: throw, rollback, datasource records error

`@TransactionalStep()` transaction body must never return:

```ts
{ kind: "timeout" | "nonRetryableFailure" }
```

Required behavior:

- success: callback returns result, datasource records output inside user DB transaction, commit;
- error: callback throws, user DB transaction rollback, datasource records serialized error in `dbos.transaction_completion`, workflow observes throw;
- timeout: timeout path throws, user DB transaction rollback;
- non-critical behavior can only be handled outside the transaction after rollback.

This matches verified datasource behavior.

### AD-7. `@TransactionalStep()` requires workflow context

If `DBOS.workflowID === undefined`, `@TransactionalStep()` throws.

Reason: outside workflow, datasource transaction still runs as a DB transaction but does not persist `transaction_completion`; this is not a durable workflow step.

### AD-8. No global datasource registry

`@TransactionalStep()` takes resolver functions:

```ts
@TransactionalStep({
  txManager: (self) => self.kernel.repository.txManager,
  bridge: (self) => self.kernel.repository.dbosTransactionBridge,
})
```

Reason:

- datasource is service-specific;
- schema is service-specific;
- `Kernel` already owns repository runtime;
- global registry would hide service/database mismatch.

## Proposed API

### TransactionManager

Add owner-aware store and external tx injection:

```ts
class TransactionManager<TDatabase, TTransaction> {
  private readonly owner = Symbol("TransactionManager");

  getConnection(): TDatabase | TTransaction;

  run<TResult>(fn: () => Promise<TResult>): Promise<TResult>;

  runWithExistingTransaction<TResult>(
    tx: TTransaction,
    fn: () => Promise<TResult>,
  ): Promise<TResult>;

  runWithDbosTransaction<TResult>(
    bridge: DbosDrizzleTransactionBridge<TTransaction, TransactionConfig>,
    options: TransactionConfig & { name: string },
    fn: () => Promise<TResult>,
  ): Promise<TResult>;
}
```

### TransactionalStep decorator

```ts
interface TransactionalStepMetadata<TSelf = unknown> {
  name?: string;
  timeoutMs?: number;
  txManager: (self: TSelf) => TransactionManagerLike;
  bridge: (self: TSelf) => DbosDrizzleTransactionBridge<unknown, TransactionConfig>;
  isolationLevel?: TransactionConfig["isolationLevel"];
  accessMode?: TransactionConfig["accessMode"];
}
```

`@TransactionalStep()` не поддерживает `retry` и `retriesAllowed`.
Metadata type должен быть отдельным и не должен наследоваться от `WorkflowStepMetadata`, потому что `WorkflowStepMetadata` содержит retry-настройки для `DBOS.runStep()`, а `@TransactionalStep()` не вызывает `DBOS.runStep()`.

`accessMode: "read only"` is allowed but should not be used for write steps because read-only datasource transactions do not save output in `transaction_completion`.

### Repository wiring

For a service using `@TransactionalStep()`:

```ts
export interface RepositoryConfig {
  db: Database;
  dbosTransactionBridge: DbosDrizzleTransactionBridge<DatabaseTransaction, TransactionConfig>;
}

export class Repository {
  public readonly txManager: TransactionManager<Database, DatabaseTransaction>;
  public readonly dbosTransactionBridge: DbosDrizzleTransactionBridge<
    DatabaseTransaction,
    TransactionConfig
  >;
}
```

## Target Usage

```ts
@Injectable()
export class ProductBulkEditWorkflow extends BrokerWorkflows {
  constructor(@InjectBroker("catalog") broker: ServiceBroker) {
    super(broker);
  }

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

1. Workflow body calls `stepCreateJob`.
2. `@TransactionalStep()` resolves `txManager` and `bridge`.
3. Decorator builds step name and tx config.
4. Bridge calls `dataSource.runTransaction(...)`.
5. Inside datasource transaction, bridge reads `dataSource.client`.
6. `txManager.runWithExistingTransaction(dataSource.client, fn)` stores tx in Shopana ALS.
7. Script `@Transactional()` calls `txManager.run(...)`.
8. `txManager.run(...)` sees same owner active tx and does not open a new transaction.
9. Repository methods use `txManager.getConnection()` and receive DBOS transaction client.
10. On success, datasource records output in `dbos.transaction_completion` inside same DB transaction.
11. On error, datasource rolls back user writes and records serialized error.

## Migration Requirement

Because Shopana currently uses `postgres-js`, implementation has a required preliminary migration for every service adopting `@TransactionalStep()`:

1. Replace shared `DatabaseClient = Sql` with an abstraction that can provide `pg.Pool` for services using DBOS Drizzle datasource.
2. Change service `createDatabase()` from:

```ts
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
```

to:

```ts
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
```

3. Keep existing timestamp serialization behavior equivalent to current `postgres-js` config.
4. Re-type repositories and `TransactionManager` to node-postgres Drizzle transaction types.
5. Create `DrizzleDataSource(name, pool, schema, "dbos")` with the same `pg.Pool`.
6. Add migration for `dbos.transaction_completion` using `DrizzleDataSource.initializeDBOSSchema(...)` or equivalent SQL from DBOS SDK.

Without this migration, `@TransactionalStep()` is not implementable safely against existing repositories.

## Rules: WorkflowStep vs TransactionalStep

Use `@TransactionalStep()` when:

- step writes to service PostgreSQL;
- step calls scripts/repositories with `@Transactional()`;
- duplicate replay would create duplicate writes or invalid state transitions;
- step result must be checkpointed atomically with DB writes.

Use `@WorkflowStep()` when:

- step calls external API/broker/S3/email/webhook;
- step starts another workflow;
- step is CPU-only;
- step is read-only and does not require result checkpoint in user DB transaction.

Forbidden:

```ts
@WorkflowStep()
private async stepWriteDb() {
  await this.kernel.runScript(SomeTransactionalScript, input);
}
```

If script writes to DB, either use `@TransactionalStep()` or prove script-level idempotency with business keys.

## Implementation Plan

1. Add node-postgres Drizzle support path to shared database layer.
2. Migrate one pilot service database layer to `pg.Pool` + `drizzle-orm/node-postgres`.
3. Add `TransactionManager` owner identity.
4. Add `TransactionManager.runWithExistingTransaction(...)`.
5. Add `TransactionManager.runWithDbosTransaction(...)`.
6. Add `DbosDrizzleTransactionBridge`.
7. Add `runTransactionalStep()` in `@shopana/dbos`.
8. Add `@TransactionalStep()` decorator in `@shopana/dbos`.
9. Re-export `@TransactionalStep()` from `@shopana/shared-kernel`.
10. Add service repository wiring for `dbosTransactionBridge`.
11. Add migration for `dbos.transaction_completion`.
12. Convert one pilot write step.
13. Run build only, according to project instruction.

## Acceptance Criteria

- The adopting service uses `drizzle-orm/node-postgres`, not `drizzle-orm/postgres-js`.
- `DrizzleDataSource` uses the same schema and compatible transaction client as repositories.
- `TransactionManager` has owner identity and rejects foreign transaction context.
- `@TransactionalStep()` does not call `DBOS.runStep()`.
- `@TransactionalStep()` calls datasource `runTransaction()`.
- Bridge passes `dataSource.client` into `TransactionManager.runWithExistingTransaction(...)`.
- `@Transactional()` scripts inside `@TransactionalStep()` reuse parent DBOS transaction.
- On success, user writes and `transaction_completion.output` commit atomically.
- On thrown error, user writes rollback and `transaction_completion.error` is recorded by datasource.
- `@WorkflowStep()` behavior is unchanged.
- Build passes.

## Non-Goals

- Supporting current `postgres-js` repositories without driver migration.
- Supporting cross-service distributed transactions.
- Wrapping external side effects in DB transactions.
- Replacing all workflow steps with transactional steps.
- Editing changeset files manually.
