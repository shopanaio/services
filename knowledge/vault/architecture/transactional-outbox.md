---
tags:
  - architecture
  - transactional-outbox
  - dbos
  - workflow
  - saga
  - broker
related:
  - architecture/decisions
  - packages/dbos/workflows
  - packages/dbos/sagas
  - packages/dbos/transactional-steps
  - packages/shared-kernel/service-broker
---

# Transactional Outbox

## Decision

In Shopana, `transactional_outbox` is a DBOS durable workflow, not a
service-owned database table or polling publisher.

The pattern is implemented through `ServiceBroker`:

- define the durable operation with `@Workflow` or `@Saga`;
- start it through `broker.runWorkflow()` or `broker.runSaga()`;
- place every atomic database mutation in an `@TransactionalStep()` called
  directly from the workflow or saga body;
- perform broker calls and all other external side effects only after the
  transactional step commits, in separate `@WorkflowStep()` or `@SagaStep()`
  calls.

DBOS persists workflow progress and completed step results. This durable state
replaces a custom outbox queue and lets execution resume after a crash without
repeating a completed atomic step.

## Atomicity Boundary

`@TransactionalStep()` is the atomic database-write boundary inside the
durable workflow. It commits the service's PostgreSQL changes together with
the DBOS completion checkpoint in `dbos.transaction_completion`.

An `@TransactionalStep()`:

- may contain only database work;
- must let errors escape so a failed operation is not committed as successful;
- must not call the broker, an external API, S3, email, webhooks, or another
  non-database system;
- must not be wrapped in `DBOS.runStep()`.

External delivery is a subsequent durable step. The workflow ordering ensures
that delivery cannot begin before the local transaction commits.

```typescript
@Workflow("publishOrderCreated")
async run(input: Input): Promise<void> {
  const event = await this.commitOrderCreated(input);
  await this.deliverOrderCreated(event);
}

@TransactionalStep({
  txManager: (self: OrderWorkflow) => self.repository.txManager,
  bridge: (self: OrderWorkflow) =>
    self.repository.dbosTransactionBridge,
})
private async commitOrderCreated(input: Input): Promise<OrderCreated> {
  return this.repository.createOrderAndEvent(input);
}

@WorkflowStep()
private async deliverOrderCreated(event: OrderCreated): Promise<void> {
  await this.broker.call("events.publish", event);
}
```

Use `@Saga` when the durable operation spans multiple systems and completed
steps require compensation. Its database mutations follow the same
`@TransactionalStep()` boundary.

## Prohibited Implementations

Services must not create or maintain custom outbox infrastructure, including:

- `outbox`, `outbox_events`, `outbox_messages`, `publish_queue`, or equivalent
  tables;
- service-local delivery status, retry, lease, or attempt tables whose purpose
  is to implement an outbox;
- polling publishers, cron jobs, or workers that drain such tables;
- a database transaction that writes a domain change and a custom outbox row.

Do not introduce a custom outbox table even when the service already owns an
event store. An append-only domain event store is a domain persistence model;
it must not also become a delivery queue. DBOS owns durable orchestration and
delivery state.

DBOS system tables, including `dbos.transaction_completion`, are required
runtime infrastructure and are not service-owned outbox tables.

## Review Checklist

Before approving an operation described as a transactional outbox, verify that:

1. The entry point is a broker-registered `@Workflow` or `@Saga`.
2. Each atomic service database mutation is an `@TransactionalStep()`.
3. No external side effect occurs inside an `@TransactionalStep()`.
4. Delivery runs only in a later durable step, after the transaction commits.
5. The service adds no custom outbox table, queue poller, or delivery-state
   subsystem.

## See Also

- [[packages/dbos/workflows]] — durable workflow rules
- [[packages/dbos/sagas]] — compensation for distributed operations
- [[packages/dbos/transactional-steps]] — atomic database-write contract
- [[packages/shared-kernel/service-broker]] — broker workflow and saga entrypoints
- [[architecture/decisions]] — DBOS and Orders event-store decisions
