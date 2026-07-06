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

## Контекст

В Shopana workflow steps сейчас выполняются через `@WorkflowStep()` из `@shopana/dbos`. Декоратор оборачивает метод в `runStep()`, а `runStep()` вызывает `DBOS.runStep()`. Это дает durable checkpoint результата шага, retry policy и timeout handling.

Для операций с PostgreSQL в сервисах используется Drizzle ORM и `TransactionManager` из `@shopana/shared-kernel`. `@Transactional()` на script/repository методе вызывает `this.txManager.run(...)`. `TransactionManager` хранит текущую Drizzle transaction в `AsyncLocalStorage`; nested вызовы переиспользуют уже активную transaction.

Проблема: если внутри обычного `@WorkflowStep()` вызывается script с `@Transactional()`, то пользовательская запись в БД и DBOS checkpoint step result коммитятся отдельно. При crash между commit пользовательской transaction и записью DBOS checkpoint шаг может быть выполнен повторно.

DBOS предоставляет datasource transactions как специальный вид step для database access. По документации DBOS transaction выполняется как одна database transaction и атомарно коммитит user-defined changes и DBOS checkpoint. Для Drizzle это пакет `@dbos-inc/drizzle-datasource`.

## Текущее состояние кода

### Drizzle connection

Файл-пример: `services/catalog/src/infrastructure/db/database.ts`.

Сервисы получают общий `postgres-js` client из `DatabaseModule`:

- `packages/shared-kernel/src/database/DatabaseModule.ts` создает `postgres(connectionString, poolOptions)`;
- provider `DATABASE_CLIENT` экспортирует `Sql`;
- service `createDatabase(client)` вызывает `drizzle(client, { schema })`;
- результат кешируется singleton-переменной `database`.

Типичный flow:

```ts
const db = createDatabase(dbClient);
const repository = await Repository.create({ db });
```

### TransactionManager и @Transactional

Файл: `packages/shared-kernel/src/TransactionManager.ts`.

`TransactionManager` содержит process-wide `AsyncLocalStorage<TransactionStore>`.

Основное поведение:

- `getConnection()` возвращает текущий `tx`, если он есть в ALS, иначе root `db`;
- `run(fn)` если уже есть transaction context, просто выполняет `fn()` и увеличивает `depth`;
- `run(fn)` если context нет, вызывает `this.db.transaction(async tx => transactionStorage.run({ tx, depth: 1 }, fn))`;
- `@Transactional()` требует поле `this.txManager` и вызывает `txManager.run(() => originalMethod.apply(this, args))`.

Поэтому все repository/script методы должны использовать не `this.db`, а `this.txManager.getConnection()` через `BaseRepository.connection`.

### Broker @WorkflowStep

Файлы:

- `packages/dbos/src/workflow/decorators.ts`;
- `packages/dbos/src/step/runStep.ts`;
- `packages/shared-kernel/src/broker/BrokerWorkflows.ts`.

`@WorkflowStep()`:

1. сохраняет metadata;
2. подменяет метод;
3. берет `DBOS.workflowID`;
4. вызывает `runStep((_signal) => originalMethod.apply(this, args), { ...options, methodName }, { workflowId })`.

`runStep()`:

1. строит имя `step:${stepName}:${workflowId}`;
2. вызывает `DBOS.runStep()`;
3. внутри step создает `AbortSignal` context через `stepContextStorage`;
4. применяет timeout;
5. превращает non-retryable/timeout ошибки в serializable internal result;
6. retryable ошибки пробрасывает, чтобы retry сделал DBOS.

## Цель

Добавить `@TransactionalStep()` для workflow методов, которые выполняют PostgreSQL writes через Drizzle и должны иметь atomicity:

- пользовательские изменения в БД;
- DBOS checkpoint/result transaction-step.

Внутри такого step существующие scripts/repositories с `@Transactional()` должны автоматически подхватывать parent DBOS transaction через `TransactionManager`, без переписывания бизнес-логики.

## Нецели

- Не заменять все `@WorkflowStep()` на `@TransactionalStep()`.
- Не оборачивать внешние API calls, broker calls, S3 operations, email/webhook calls в DB transaction.
- Не решать distributed transaction между несколькими service databases.
- Не менять contracts `@Transactional()` для обычного request/script execution.
- Не запускать nested DBOS transaction внутри уже активного DBOS transaction.

## Предлагаемая архитектура

### 1. Service-level DBOS Drizzle datasource

Сначала выполнить обязательный spike по реальному `@dbos-inc/drizzle-datasource`. Сейчас пакет локально не установлен; установлен только `@dbos-inc/dbos-sdk@4.23.6`. В SDK datasource contract описан через `DBOSDataSource.runTransaction(callback, config)` и `DataSourceTransactionHandler.invokeTransactionFunction(...)`, но он не показывает, как конкретный Drizzle datasource передает actual transaction client в user callback.

До завершения spike нельзя фиксировать production API `TransactionalStep`.

Spike должен доказать:

- какой driver поддерживает `@dbos-inc/drizzle-datasource`: `postgres-js`, `node-postgres` или оба;
- какой тип Drizzle transaction client доступен внутри datasource callback;
- можно ли этот client передать в текущие repositories, которые ожидают `drizzle-orm/postgres-js` compatible `Database`;
- как именно создать `dbos.transaction_completion` schema/table для service DB;
- коммитится ли DBOS transaction completion в той же физической transaction, что и user writes.

Ожидаемый factory после spike может выглядеть так, но это не утвержденный API:

```ts
import { DrizzleDataSource } from "@dbos-inc/drizzle-datasource";

export function createDbosDataSource(databaseUrl: string) {
  return new DrizzleDataSource(
    "catalog-db",
    { connectionString: databaseUrl },
  );
}
```

Driver compatibility является блокером. Сейчас сервисы используют `drizzle-orm/postgres-js`. Если datasource требует `node-postgres`, нельзя просто смешать `postgres-js` root db и `node-postgres` transaction client в одном repository layer.

Если datasource требует другой driver, нужно принять одно из решений до implementation:

- перевести service Drizzle connection на совместимый driver;
- либо не внедрять `TransactionalStep` до появления datasource для `postgres-js`;
- либо доказать typed/runtime compatibility adapter между datasource tx и repository methods.

Критическое требование: datasource transaction должна писать DBOS transaction completion/checkpoint в ту же физическую PostgreSQL database transaction, где выполняются user writes. Если `config.workflows.database_url` указывает на другую database, атомарность с service writes невозможна.

### 2. Расширить TransactionManager внешним parent transaction

Зачем это нужно: текущий `TransactionManager` умеет переиспользовать transaction, но только если она уже лежит в его `AsyncLocalStorage`.

Что видно по текущему коду:

- `@Transactional()` всегда вызывает `txManager.run(...)`, см. `packages/shared-kernel/src/TransactionManager.ts`;
- `run()` читает `transactionStorage.getStore()`;
- если store есть, он переиспользует `store.tx`;
- если store нет, он всегда открывает новую transaction через `this.db.transaction(...)`;
- единственное место, где `transactionStorage.run(store, ...)` вызывается сейчас, находится внутри `this.db.transaction(...)`.

Следовательно, bridge нужен только если spike подтвердит, что actual Drizzle tx из DBOS datasource callback не попадает в `transactionStorage` автоматически. До spike нельзя утверждать конкретный способ bridge.

Preliminary обязательная задача перед любым parent transaction injection: добавить owner identity в `TransactionManager` store. Без owner нельзя безопасно класть внешнюю transaction в process-wide ALS.

Добавить public API в `TransactionManager`:

```ts
runWithExistingTransaction<TResult>(
  tx: TTransaction,
  fn: () => Promise<TResult>,
): Promise<TResult>
```

Поведение:

- если ALS пустой, положить `{ tx, depth: 1 }` и выполнить `fn`;
- если ALS уже содержит тот же transaction manager context, переиспользовать его;
- если ALS содержит transaction от другого manager/database, бросить ошибку.

Для последнего пункта обязательно расширить `TransactionStore`:

```ts
interface TransactionStore<TTx> {
  tx: TTx;
  depth: number;
  owner: symbol;
}
```

Сейчас ALS singleton не различает разные `TransactionManager`. Это риск в одном bootstrap process с несколькими сервисами. Для `TransactionalStep` owner-check является gate: без него parent transaction injection запрещен.

### 3. Ввести datasource transaction bridge только после spike

Не закладывать `dataSource.client` в контракт до проверки реального `@dbos-inc/drizzle-datasource`. В установленном `@dbos-inc/dbos-sdk@4.23.6` общий datasource interface выглядит так:

```ts
interface DBOSDataSource<Config extends { name?: string }> {
  runTransaction<TResult>(
    fn: () => Promise<TResult>,
    config?: Config,
  ): Promise<TResult>;
}
```

Этот interface не дает прямого `client`. Поэтому implementation должен ввести adapter только после spike:

```ts
interface DbosTransactionBridge<TTransaction, TConfig> {
  runTransaction<TResult>(
    name: string,
    config: TConfig,
    callback: (tx: TTransaction) => Promise<TResult>,
  ): Promise<TResult>;
}
```

Bridge обязан доказанно получать actual Drizzle tx из datasource transaction callback. Если реальный datasource не предоставляет tx в callback и скрывает его во внутреннем context, нужно либо использовать официальный accessor этого datasource, либо отказаться от `TransactionalStep` для текущего stack.

Только после этого `TransactionManager` может получить helper:

```ts
runWithDbosTransaction<TResult>(
  bridge: DbosTransactionBridge<TTransaction, DbosTransactionConfig>,
  fn: () => Promise<TResult>,
  options: DbosTransactionOptions,
): Promise<TResult> {
  return bridge.runTransaction(
    options.name,
    options,
    (tx) => this.runWithExistingTransaction(tx, fn),
  );
}
```

Важная идея: DBOS datasource создает DBOS-managed transaction-step, а bridge кладет actual transaction client в тот же ALS, который читает `@Transactional()`. Конкретный способ получения `tx` не должен быть выдуман в spec.

### 4. Добавить `runTransactionalStep()`

В `@shopana/dbos` добавить отдельный executor рядом с `runStep()`:

```ts
export async function runTransactionalStep<T>(
  txManager: TransactionManagerLike,
  bridge: DbosTransactionBridge<unknown, unknown>,
  fn: (signal: AbortSignal) => Promise<T>,
  options: InternalStepOptions & { methodName: string },
  context: { workflowId: string },
): Promise<T | undefined>
```

Он должен повторить только безопасную часть семантики `runStep()`:

- имя step: `step:${stepName}:${workflowId}`;
- timeout через `withTimeout`;
- `stepContextStorage.run({ signal }, ...)`;
- retry policy mapping;
- non-critical behavior;
- retryable errors throw наружу.

Он не должен повторять pattern `runStep()`, где timeout/non-retryable failure возвращается как `{ kind: "timeout" | "nonRetryableFailure" }` изнутри durable callback. Для transaction-step это запрещено: returned failure-result может привести к commit уже выполненных user writes.

Transaction body обязана rollback-ить любые ошибки:

```ts
return txManager.runWithDbosTransaction(bridge, async () => {
  return withTimeout(
    (signal) => stepContextStorage.run({ signal }, () => fn(signal)),
    timeoutMs,
    stepName,
  );
}, transactionOptions);
```

Нельзя делать `DBOS.runStep(() => dataSource.runTransaction(...))`: это создает nested durable step и не дает требуемую модель "один transaction-step = user writes + DBOS checkpoint".

### 5. Добавить `@TransactionalStep()`

Вариант API:

```ts
@TransactionalStep({
  bridge: (self) => self.kernel.repository.dbosTransactionBridge,
  txManager: (self) => self.kernel.repository.txManager,
  retry: { maxAttempts: 3, intervalSeconds: 1, backoffRate: 2 },
})
private async stepCreateJob(input: Input): Promise<Output> {
  return this.kernel.runScript(CreateJobScript, input);
}
```

Почему resolver functions, а не static imports:

- workflow instances создаются NestJS DI;
- `Kernel` singleton уже содержит service runtime;
- `Repository` владеет `txManager`;
- datasource service-specific, потому что schema и connection name разные.

Типы:

```ts
export interface TransactionalStepMetadata<TSelf = unknown>
  extends WorkflowStepMetadata {
  bridge: (self: TSelf) => DbosTransactionBridge<unknown, unknown>;
  txManager: (self: TSelf) => TransactionManagerLike;
}
```

Декоратор почти повторяет `@WorkflowStep()`, но вызывает `runTransactionalStep()`.

### 6. Repository/Kernel wiring

Расширить service repository aggregator:

```ts
export interface RepositoryConfig {
  db: Database;
  dbosTransactionBridge?: DbosTransactionBridge<Database, unknown>;
}

export class Repository {
  public readonly txManager: TransactionManager<Database>;
  public readonly dbosTransactionBridge?: DbosTransactionBridge<Database, unknown>;
}
```

`Kernel.create()` должен создать datasource только если workflow config/databaseUrl доступен:

```ts
const db = createDatabase(dbClient);
const dbosTransactionBridge = createDbosTransactionBridge(databaseUrl);
const repository = await Repository.create({ db, dbosTransactionBridge });
```

Если сервис использует `@TransactionalStep()` без bridge, decorator должен бросать понятную ошибку на runtime:

```txt
@TransactionalStep requires DBOS transaction bridge. Configure service repository with DBOS Drizzle transaction bridge.
```

### 7. DB schema initialization

DBOS datasource требует таблицу `dbos.transaction_completion`. Ее нужно создавать миграцией или bootstrap-init.

Рекомендуемый вариант для Shopana: migration, а не runtime auto-init.

Причины:

- schema changes должны быть видимы в migrations;
- bootstrap не должен silently менять database schema;
- одинаково работает в dev/stage/prod.

Для каждого service database, где используется `@TransactionalStep()`, добавить migration с DBOS datasource schema initialization. Если DBOS package предоставляет SQL-free helper `DrizzleDataSource.initializeDBOSSchema(...)`, использовать его только в migration runner-compatible wrapper.

## Пример целевого использования

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

Если `BulkEditCreateJobScript.execute()` помечен `@Transactional()`, то execution flow будет:

1. `@TransactionalStep()` вызывает DBOS transaction bridge;
2. bridge через реальный DBOS Drizzle datasource открывает DBOS-managed database transaction;
3. bridge получает actual Drizzle tx способом, доказанным spike;
4. `TransactionManager.runWithExistingTransaction(tx, fn)` кладет parent tx в ALS;
5. script `@Transactional()` вызывает `txManager.run(...)`;
6. `txManager.run(...)` видит active tx и не создает новую Drizzle transaction;
7. repository methods через `getConnection()` используют parent DBOS tx;
8. DBOS transaction commit атомарно фиксирует user writes и DBOS checkpoint.

## Правила выбора WorkflowStep vs TransactionalStep

Использовать `@TransactionalStep()`:

- step делает writes в service PostgreSQL;
- step вызывает scripts/repositories с `@Transactional()`;
- повторное выполнение step может создать duplicate writes, неверный status transition, повторную idempotency запись;
- результат step должен быть checkpointed атомарно с DB writes.

Оставить `@WorkflowStep()`:

- step только читает БД;
- step вызывает external service/API/S3/email/webhook;
- step стартует другой workflow;
- step выполняет CPU-only deterministic transformation;
- step already idempotent и не требует DB checkpoint atomicity.

Запрещенный pattern:

```ts
@WorkflowStep()
private async stepWriteDb() {
  await this.kernel.runScript(SomeTransactionalScript, input);
}
```

Если script пишет в БД, такой step должен стать `@TransactionalStep()` либо script должен быть явно idempotent на уровне business key.

## Error handling и retry

`TransactionalStep` должен иметь отдельную failure semantics, отличную от текущего `runStep()`.

Обязательное решение:

- любая ошибка внутри transaction body должна быть thrown наружу из transaction callback;
- transaction body не должен возвращать `{ kind: "timeout" | "nonRetryableFailure" }`;
- timeout должен abort/throw, чтобы DB transaction rollback-нулась;
- `FatalError`, validation/business errors и другие non-retryable errors должны rollback-ить user writes;
- `RetryableError` и transient errors должны rollback-ить user writes и быть проброшены так, чтобы DBOS retry повторил всю transaction;
- `critical: false` может возвращать `undefined` только снаружи transaction, после rollback и после того, как DBOS/runner решил не продолжать retry.

Причина: текущий `runStep()` возвращает failure-result из durable callback. Для обычного step это приемлемо, потому что там нет user DB transaction. Для transaction-step такой pattern опасен: returned failure-result может быть воспринят datasource transaction как successful callback и привести к commit частичных writes.

Если для non-retryable failure нужен durable checkpoint, его можно записывать только способом, который не коммитит user writes. Пока такой способ не доказан реальным datasource API, `TransactionalStep` должен выбирать rollback + failed step, а не returned internal failure result.

## Ограничения и риски

### Driver compatibility

Блокер до implementation. Сейчас сервисы используют `drizzle-orm/postgres-js`. Документация DBOS показывает `DrizzleDataSource<NodePgDatabase>`. Перед implementation нужно доказать поддержку `postgres-js` или принять migration на compatible driver. Если этого нет, `TransactionalStep` не внедрять.

### Cross-service ALS leakage

Блокер до parent transaction injection. Текущий `TransactionManager` использует singleton ALS без owner identity. В bootstrap process несколько сервисов живут вместе. Перед добавлением parent transaction support нужно добавить owner check, иначе nested broker/service calls внутри одного async stack могут получить чужую transaction.

### DBOS system DB mismatch

Если `WorkflowModule` использует `config.workflows.database_url`, отличающийся от service DB, то atomic commit user writes + DBOS checkpoint невозможен. `TransactionalStep` должен валидировать или документировать требование: datasource database must match DBOS system database used for transaction completion.

### External side effects inside transaction

Нельзя вызывать broker/external API/S3 внутри `TransactionalStep`, потому что DB rollback не откатит внешний эффект. Такие операции должны быть отдельными обычными workflow steps после committed transactional step.

## План внедрения

1. Spike: установить/изучить `@dbos-inc/drizzle-datasource` и доказать реальный API transaction callback.
2. Spike: доказать driver compatibility с текущим `drizzle-orm/postgres-js` или принять миграцию на compatible driver.
3. Spike: доказать, как получить actual Drizzle tx внутри datasource transaction callback.
4. Preliminary task: расширить `TransactionManager` owner identity:
   - `owner` в ALS store;
   - проверка nested reuse только для того же owner;
   - ошибка при попытке использовать чужой manager/database context.
5. Только после successful spikes добавить dependency `@dbos-inc/drizzle-datasource` в package, где будет жить integration (`@shopana/dbos` или `@shopana/shared-kernel`).
6. Расширить `TransactionManager`:
   - `runWithExistingTransaction(tx, fn)`;
   - helper для `DbosTransactionBridge`, если spike подтвердил такой adapter.
7. Добавить `runTransactionalStep()` в `@shopana/dbos` с обязательной rollback-on-any-error semantics.
8. Добавить `@TransactionalStep()` decorator и export из `@shopana/dbos` и `@shopana/shared-kernel`.
9. Добавить service-level datasource/bridge factory и repository wiring в одном пилотном сервисе, лучше `catalog`, потому что там уже есть DB-heavy workflows.
10. Добавить migration для `dbos.transaction_completion`.
11. Перевести один write step, например `ProductBulkEditWorkflow.stepCreateJob`, на `@TransactionalStep()`.
12. Запустить build через project-approved command. Unit/e2e/tsc не запускать согласно project instruction.

## Acceptance Criteria

- Есть spike artifact с реальным `@dbos-inc/drizzle-datasource` API: как создается datasource, какой driver нужен, какой тип tx доступен внутри callback.
- Доказано, как получить actual Drizzle tx внутри datasource callback и передать его в `TransactionManager`; если доказать нельзя, implementation `TransactionalStep` не начинается.
- Driver compatibility решен как blocker: либо datasource поддерживает `postgres-js`, либо repository layer переведен/адаптирован на совместимый driver.
- `TransactionManager` содержит owner identity в ALS store; без owner-check parent transaction injection не реализуется.
- `@TransactionalStep()` компилируется и экспортируется из `@shopana/shared-kernel`.
- Внутри `@TransactionalStep()` script с `@Transactional()` не создает новую Drizzle transaction, а использует parent DBOS datasource transaction.
- Любая ошибка внутри `TransactionalStep` transaction body приводит к rollback user writes; implementation не возвращает internal failure-result из transaction callback.
- Repository methods продолжают использовать `txManager.getConnection()` без изменений.
- Обычный `@WorkflowStep()` не меняет поведение.
- Если bridge не настроен, ошибка понятная и указывает на missing DBOS transaction bridge.
- Документировано, какие steps можно переводить на `@TransactionalStep()`.
- Build проходит.

## Открытые вопросы

1. Должен ли datasource/bridge жить в `@shopana/dbos` или в `@shopana/shared-kernel`? Практичнее держать generic executor в `@shopana/dbos`, а `TransactionManager` context bridge в `@shopana/shared-kernel`.
2. Нужно ли сделать global registry datasource per service, чтобы `@TransactionalStep({ service: "catalog" })` не требовал resolver functions?
3. Нужно ли запретить `@TransactionalStep()` при `DBOS.workflowID === undefined`, чтобы decorator нельзя было случайно вызвать вне workflow?
