---
tags:
  - architecture
  - adr
  - decisions
related:
  - architecture/overview
  - architecture/request-flow
---

# Architectural Decisions

Key decisions that shaped Shopana architecture.

## ADR-001: Microservices Architecture

### Context

E-commerce platforms consist of loosely coupled domains: catalog, inventory, orders, payments — each
is a separate bounded context with its own data model and business rules.

### Decision

Use microservices architecture where each domain is a separate service.

### Rationale

- **Independent development** — teams can work on different services without conflicts
- **Independent deployment** — deploy catalog without touching payments
- **Selective scaling** — scale high-load services (catalog, search) independently
- **Fault isolation** — payments failure doesn't break catalog browsing

### Consequences

- Need service discovery and inter-service communication
- Distributed transactions require saga pattern
- More complex monitoring and debugging

## ADR-002: GraphQL Federation

### Context

Clients need a unified API, not 12 different endpoints. Traditional API gateway proxying is complex
and creates tight coupling.

### Decision

Use GraphQL Federation where each service owns its part of the schema, and gateway composes them
into a single supergraph.

### Rationale

- **Schema ownership** — each service defines and maintains its own types
- **Single endpoint** — client makes one request, gateway distributes to services
- **Type extensions** — services can extend types from other services (e.g., `Variant` extended with
  `stock` from inventory)
- **Automatic composition** — Hive Gateway composes supergraph from subgraphs

### Implementation

- Each service exposes Apollo Server subgraph (ports 10010-10022)
- Hive Gateway composes supergraph and exposes Admin (4001) and Storefront (4000) APIs
- Schema exported via `shopana schema --action build`

### Consequences

- Need to manage federation directives (@key, @extends, @external)
- Schema composition can fail if services have conflicting types
- Query planning overhead in gateway

## ADR-003: Shared Database in Development

### Context

Microservices typically use database-per-service pattern. However, in development this creates
overhead: multiple databases, complex setup, resource consumption.

### Decision

In development mode, all services share a single PostgreSQL instance with logical separation by
schema/prefixes. In production, services can use separate databases.

### Rationale

- **Simplified development** — single docker-compose, single connection pool
- **Resource efficiency** — one PostgreSQL instance vs 12
- **Easy joins** — development debugging is simpler
- **Production flexibility** — can split later when needed

### Consequences

- Need discipline to maintain service boundaries (no cross-service joins in code)
- Data isolation relies on code, not infrastructure
- Migration coordination needed when changing shared schemas

## ADR-004: DBOS for Durable Workflows

### Context

E-commerce has long-running operations: checkout → payment → order creation → fulfillment. These
must complete even after crashes, handle failures gracefully, and be trackable.

### Decision

Use DBOS SDK for durable workflow execution.

### Rationale

- **Exactly-once execution** — each step executes exactly once, even after restarts
- **Automatic recovery** — workflows resume from last checkpoint after crash
- **PostgreSQL-native** — no additional infrastructure (vs Temporal, Conductor)
- **Type-safe** — TypeScript integration with full type safety

### Example Use Cases

- **Checkout workflow** — cart validation → inventory reservation → order creation → payment
  initiation
- **Payment workflow** — create transaction → call provider → handle callback → update status
- **Fulfillment workflow** — pick items → create shipment → notify customer

### Consequences

- DBOS tables in PostgreSQL (workflow state)
- Need to design idempotent workflow steps
- Learning curve for durable execution concepts

## ADR-005: Event Sourcing for Orders

**Status:** Rejected and superseded for Orders by ADR-006.

### Context

Orders need complete audit trail: who changed what, when, and why. Traditional CRUD loses history.

### Decision

Use Event Sourcing (Emmett + Pongo) for orders and checkout domains.

### Rationale

- **Full history** — every state change is an event
- **Audit compliance** — required for financial operations
- **Temporal queries** — reconstruct order state at any point in time
- **Event-driven** — natural fit for workflows and notifications

### Consequences

- Event store additional to regular tables
- Need projections for read models
- More complex querying (can't just SELECT)

## ADR-006: Mutable Orders State with Immutable Audit Log

**Status:** Accepted.

### Context

The Orders service needs ordinary transactional reads and writes, idempotent command replay, a
complete audit trail, and durable integration delivery. Reconstructing
the aggregate from an event stream would add event-sourcing complexity without being required by
the product. The normalized PostgreSQL state must remain directly queryable and authoritative.

### Decision

Orders is a state-first mutable service. The normalized `orders` row and its normalized child state
tables are the canonical source of truth. CAS and optimistic locking are forbidden: Orders must not
expose or compare expected version,
revision, timestamp, ETag, or hash tokens.

Every state-changing command records immutable audit events sufficient to trace who performed the
operation, what changed, when it changed, and why. Audit events are historical facts for activity,
investigation, and integration delivery; they are not an event-sourcing stream, do not replace the
canonical state tables, and are not used to reconstruct the aggregate.

The canonical state change, audit records, and idempotency result commit in
one DBOS transactional step. External delivery runs only in later idempotent DBOS workflow steps
after that transaction commits. A local publish queue/table is forbidden. Emmett and Pongo are not
runtime dependencies of the canonical implementation.

### Consequences

- Reads use the current normalized state directly; no event replay is required.
- A successful state-changing command cannot update canonical state without writing one or more
  audit records in the same transaction.
- Audit history must be append-only, tenant-scoped, ordered unambiguously, and linked to the
  command/idempotency identity that produced it.
- Audit payloads may contain before/after values or a format-versioned change description, but they are not
  required to be sufficient for aggregate reconstruction.
- A workflow cannot publish an integration event before its state/audit/idempotency transactional
  step commits.
- Append-only and tenant constraints are enforced in PostgreSQL.
- Stage 2 must keep Drizzle/repository models aligned 1:1 with canonical SQL.

## See Also

- [[architecture/overview]] — High-level architecture
- [[architecture/request-flow]] — How decisions affect request handling
- [[patterns/no-cas]] — Project-wide CAS and optimistic-locking prohibition
- [[patterns/script]] — Script pattern (bounded context operations)
