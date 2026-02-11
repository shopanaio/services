---
tags:
  - architecture
  - request-flow
  - graphql
related:
  - architecture/overview
  - patterns/resolver
  - patterns/script
  - packages/shared-kernel/service-broker
---

# Request Flow

How requests flow through the Shopana system.

## Overview

```
Client → Gateway → Service Resolver → Script → Repository → Database
                                         ↓
                              ServiceBroker (cross-service calls)
```

## Admin API: Create Product

Example of a typical admin mutation flow.

### Sequence

```
┌────────┐     ┌─────────┐     ┌────────────┐     ┌──────────┐     ┌────────────┐
│ Client │     │ Gateway │     │  Catalog   │     │  Script  │     │ Repository │
│        │     │ (4001)  │     │  (10011)   │     │          │     │            │
└───┬────┘     └────┬────┘     └─────┬──────┘     └────┬─────┘     └─────┬──────┘
    │               │                │                  │                 │
    │ mutation      │                │                  │                 │
    │ productCreate │                │                  │                 │
    │──────────────►│                │                  │                 │
    │               │                │                  │                 │
    │               │ route to       │                  │                 │
    │               │ catalog        │                  │                 │
    │               │───────────────►│                  │                 │
    │               │                │                  │                 │
    │               │                │ ServiceContext   │                 │
    │               │                │ (user, store)    │                 │
    │               │                │──────────────────│                 │
    │               │                │                  │                 │
    │               │                │ kernel.runScript │                 │
    │               │                │─────────────────►│                 │
    │               │                │                  │                 │
    │               │                │                  │ validate        │
    │               │                │                  │ checkPermissions│
    │               │                │                  │                 │
    │               │                │                  │ repository.save │
    │               │                │                  │────────────────►│
    │               │                │                  │                 │
    │               │                │                  │     Product     │
    │               │                │                  │◄────────────────│
    │               │                │                  │                 │
    │               │                │  { product,      │                 │
    │               │                │    userErrors }  │                 │
    │               │                │◄─────────────────│                 │
    │               │                │                  │                 │
    │               │    response    │                  │                 │
    │               │◄───────────────│                  │                 │
    │               │                │                  │                 │
    │   response    │                │                  │                 │
    │◄──────────────│                │                  │                 │
```

### Step-by-Step

1. **Client** sends GraphQL mutation to Gateway (port 4001)
2. **Gateway** determines mutation belongs to catalog service
3. **Gateway** forwards request to catalog subgraph (port 10011) with auth and context headers
4. **Apollo Server** parses request, creates ServiceContext (user, store, locale)
5. **MutationResolver** receives request, validates input with Zod
6. **Resolver** calls `kernel.runScript(ProductCreateScript, input)`
7. **Script** executes business logic: checks permissions, validates data, saves via Repository
8. **Script** returns `{ product, userErrors }`
9. **Resolver** returns result to client

## Storefront API: Checkout

Example of a workflow-driven operation.

### Sequence

```
┌────────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Client │     │ Gateway │     │ Checkout │     │   DBOS   │     │ Services │
│        │     │ (4000)  │     │          │     │ Workflow │     │          │
└───┬────┘     └────┬────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
    │               │               │                 │                │
    │ mutation      │               │                 │                │
    │ checkoutDone  │               │                 │                │
    │──────────────►│               │                 │                │
    │               │               │                 │                │
    │               │───────────────►│                │                │
    │               │               │                 │                │
    │               │               │ startWorkflow   │                │
    │               │               │────────────────►│                │
    │               │               │                 │                │
    │               │               │                 │ validateCart   │
    │               │               │                 │───────────────►│
    │               │               │                 │                │
    │               │               │                 │ reserveStock   │
    │               │               │                 │───────────────►│
    │               │               │                 │                │
    │               │               │                 │ createOrder    │
    │               │               │                 │───────────────►│
    │               │               │                 │                │
    │               │               │                 │ initiatePayment│
    │               │               │                 │───────────────►│
    │               │               │                 │                │
    │               │               │   { order }     │                │
    │               │               │◄────────────────│                │
    │               │               │                 │                │
    │               │◄──────────────│                 │                │
    │               │               │                 │                │
    │◄──────────────│               │                 │                │
```

### Step-by-Step

1. **Client** sends mutation checkoutComplete to Gateway (port 4000)
2. **Gateway** routes to checkout service
3. **Resolver** starts workflow via `broker.startWorkflow(CheckoutWorkflow, params)`
4. **DBOS** creates durable workflow instance
5. **Workflow** executes steps sequentially:
   - Validate cart contents
   - Reserve inventory (via ServiceBroker → inventory service)
   - Create order (via ServiceBroker → orders service)
   - Initiate payment (via ServiceBroker → payments service)
6. On failure at any step — DBOS automatically retries or runs compensation
7. **Workflow** returns result to client

## Inter-Service Communication

### Synchronous Calls (ServiceBroker)

Service A needs data from Service B:

```typescript
// In Service A
const stock = await broker.call('inventory.getStock', { variantIds });
```

```
┌───────────┐                    ┌────────────────────┐
│ Service A │                    │InventoryBrokerActions│
│           │                    │                    │
│ broker.   │ ──────────────────►│ @Action('getStock')│
│ call()    │                    │                    │
│           │ ◄──────────────────│ return stock       │
└───────────┘                    └────────────────────┘
```

### Events (Pub/Sub)

Service A publishes event, multiple services react:

```typescript
// Publisher
await broker.emit('order.created', orderData);

// Subscriber (in payments service)
@EventHandler('order.created')
async handleOrderCreated(order: Order) {
  // Process payment
}
```

```
┌───────────┐     broker.emit()      ┌────────────────┐
│ Orders    │ ───────────────────────► │ @EventHandler │
│           │                         │ (payments)     │
│           │                         └────────────────┘
│           │                         ┌────────────────┐
│           │ ───────────────────────► │ @EventHandler │
│           │                         │ (notifications)│
└───────────┘                         └────────────────┘
```

## Context Propagation

Every request carries ServiceContext:

```typescript
interface ServiceContext {
  user?: User;          // Authenticated user
  store?: Store;        // Current store (from X-Store-Name header)
  locale?: string;      // Localization
  requestId: string;    // Tracing
}
```

Context flows through:
- Gateway → Service (via headers)
- Service → Script (via kernel)
- Script → Repository (via context)
- Service → Service (via broker headers)

## See Also

- [[patterns/resolver]] — Resolver pattern details
- [[patterns/script]] — Script pattern details
- [[packages/shared-kernel/service-broker]] — ServiceBroker implementation
- [[packages/dbos/workflows]] — DBOS workflows
