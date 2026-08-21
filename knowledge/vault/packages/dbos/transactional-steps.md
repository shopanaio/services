---
tags:
  - dbos
  - workflow
  - transaction
  - postgres-js
  - drizzle
related:
  - dbos/index
  - dbos/workflows
  - shared-kernel/transaction-manager
  - patterns/repository
---

# Transactional Steps

`@TransactionalStep()` is the durable database-write boundary for DBOS
workflows. It atomically commits both service PostgreSQL writes and the DBOS
result checkpoint stored in `dbos.transaction_completion`.

## Contract

- Call a transactional step directly from a DBOS workflow body.
- Perform database work only. External APIs, brokers, S3, email and webhooks
  belong in separate `@SideEffectStep()` calls.
- Let errors escape the callback. Returning a failure value would commit the
  transaction and checkpoint it as success.
- Do not wrap a transactional step in `DBOS.runStep()`.
- There are intentionally no JavaScript timeout, application retry, read-only
  or non-critical options.
- PostgreSQL serialization failures are retried by
  `@dbos-inc/postgres-datasource` before a checkpoint is committed.

## Wiring

The datasource must be constructed before `DBOS.launch()`. A service creates a
scoped Drizzle wrapper over the datasource's active `TransactionSql` and stores
the bridge next to the aggregate repository's single `TransactionManager`.

```typescript
const dataSource = new PostgresDataSource(
  "catalog-db",
  { ...connectionOptions, max: 2 },
  "dbos",
);

const bridge = new PostgresDbosTransactionBridge(
  dataSource,
  createTransactionalDatabase,
);
```

`DatabaseModule` exports immutable `DATABASE_CONNECTION_OPTIONS`; a datasource
must choose its own bounded pool size rather than copy the shared pool budget.
DBOS owns datasource pool shutdown.

## Usage

```typescript
@TransactionalStep({
  txManager: (self: ProductWorkflow) =>
    self.kernel.repository.txManager,
  bridge: (self: ProductWorkflow) =>
    self.kernel.repository.dbosTransactionBridge,
})
private async writeProduct(input: Input): Promise<Result> {
  return this.kernel.runScript(WriteProductScript, input);
}
```

Nested scripts and repositories decorated with `@Transactional()` reuse the
same externally owned DBOS transaction through
`TransactionManager.runWithExistingTransaction()`.

## Database Contract

The application database must be migrated before startup with
`dbos.transaction_completion` matching DBOS SDK `4.23.6`. Runtime schema
creation is not the deployment strategy.

Existing workflows and sagas are not automatically converted. Migration of a
write step to `@TransactionalStep()` requires a separate review confirming that
the callback contains no external side effects.
