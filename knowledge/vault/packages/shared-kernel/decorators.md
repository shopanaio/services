---
tags:
  - shared-kernel
  - decorator
  - action
  - validation
  - authorization
  - event
related:
  - shared-kernel/index
  - shared-kernel/base-classes
  - shared-kernel/service-broker
  - rbac
---
# Decorators

Declarative decorators for actions, validation, authorization, and event handling.

## Overview

| Decorator | Purpose | Applied to |
|-----------|---------|------------|
| `@Action` | Register method as broker action | BrokerActions methods |
| `@ZodSchema` | Validate input with Zod schema | Any method |
| `@Policy` | Authorization check before execution | Any method |
| `@EventHandler` | Register method as event handler | EventHandlers methods |
| `@Transactional` | Wrap in database transaction | Repository methods |
| `@ReadOnly` | Mark as read-only operation | Repository methods |

## @Action

Marks a method as a broker action for automatic registration.

### Basic Usage

```typescript
import { Action, BrokerActions, InjectBroker } from "@shopana/shared-kernel";

@Injectable()
class InventoryActions extends BrokerActions {
  constructor(@InjectBroker("inventory") broker: ServiceBroker) {
    super(broker);
  }

  @Action("getStock")
  async getStock(params: { productId: string }): Promise<StockLevel> {
    return this.stockService.getLevel(params.productId);
  }

  @Action("reserveStock")
  async reserveStock(params: ReserveStockInput): Promise<Reservation> {
    return this.stockService.reserve(params);
  }
}
```

### With Metadata

```typescript
@Action("updateStock", {
  description: "Update stock level for a product",
  tags: ["inventory", "write"],
})
async updateStock(params: UpdateStockInput): Promise<StockLevel> {
  return this.stockService.update(params);
}
```

### Signature

```typescript
function Action(
  name: string,
  metadata?: ActionDecoratorMetadata
): MethodDecorator

interface ActionDecoratorMetadata {
  description?: string;
  tags?: string[];
}
```

## @ZodSchema

Validates method input against a Zod schema before execution.

### Basic Usage

```typescript
import { ZodSchema, ValidationError } from "@shopana/shared-kernel";
import { z } from "zod";

const createProductSchema = z.object({
  title: z.string().min(1, "Title is required"),
  price: z.number().positive("Price must be positive"),
  sku: z.string().optional(),
});

class ProductActions extends BrokerActions {
  @Action("createProduct")
  @ZodSchema(createProductSchema)
  async createProduct(params: z.infer<typeof createProductSchema>): Promise<Product> {
    // params is validated and typed
    return this.productService.create(params);
  }
}
```

### Validation Error

When validation fails, `ValidationError` is thrown:

```typescript
try {
  await broker.call("catalog.createProduct", {
    title: "",      // Too short
    price: -10,     // Negative
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.log(error.errors);
    // [
    //   { code: "INVALID_INPUT", message: "Title is required", field: ["title"] },
    //   { code: "INVALID_INPUT", message: "Price must be positive", field: ["price"] }
    // ]
  }
}
```

### Nested Objects

```typescript
const orderSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1, "At least one item required"),
  shippingAddress: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    postalCode: z.string().min(1),
  }),
});

@Action("createOrder")
@ZodSchema(orderSchema)
async createOrder(params: z.infer<typeof orderSchema>): Promise<Order> {
  return this.orderService.create(params);
}
```

### Signature

```typescript
function ZodSchema<T extends z.ZodType>(
  schema: T
): MethodDecorator
```

## @Policy

Authorization check before method execution.

### Basic Usage

```typescript
import { Policy, AuthorizationError, type Authorizable } from "@shopana/shared-kernel";

@Injectable()
class ProductActions extends BrokerActions implements Authorizable {
  readonly authProvider: AuthProvider;

  constructor(
    @InjectBroker("catalog") broker: ServiceBroker,
    @Inject(AUTH_PROVIDER) authProvider: AuthProvider,
  ) {
    super(broker);
    this.authProvider = authProvider;
  }

  @Action("deleteProduct")
  @Policy<DeleteProductInput>({
    resource: "product",
    action: "delete",
    organizationId: (self, params) => params.organizationId,
  })
  async deleteProduct(params: DeleteProductInput): Promise<void> {
    // Only executed if authorization passes
    return this.productService.delete(params.id);
  }
}
```

### With Domain

For fine-grained access control with domains (e.g., store-specific permissions):

```typescript
@Action("updatePrice")
@Policy<UpdatePriceInput>({
  resource: "product",
  action: "update",
  organizationId: (self, params) => params.organizationId,
  domain: (self, params) => `store:${params.storeId}`,
})
async updatePrice(params: UpdatePriceInput): Promise<Product> {
  return this.productService.updatePrice(params);
}
```

### Authorization Error

When authorization fails, `AuthorizationError` is thrown:

```typescript
try {
  await broker.call("catalog.deleteProduct", {
    id: productId,
    organizationId: orgId,
  });
} catch (error) {
  if (error instanceof AuthorizationError) {
    console.log(error.resource);  // "product"
    console.log(error.action);    // "delete"
    console.log(error.errors);
    // [{ code: "FORBIDDEN", message: "Access denied", field: null }]
  }
}
```

### Signature

```typescript
function Policy<TParams>(
  options: PolicyOptions<TParams>
): MethodDecorator

interface PolicyOptions<TParams> {
  resource: string;
  action: string;
  organizationId: (self: Authorizable, params: TParams) => string;
  domain?: (self: Authorizable, params: TParams) => string;
}

interface Authorizable {
  readonly authProvider: AuthProvider;
}

interface AuthProvider {
  authorize(params: AuthorizeParams): Promise<boolean>;
  getCurrentUserId(): string | null;
}
```

### AuthProvider Implementation

```typescript
// Typically provided by @shopana/rbac
@Injectable()
class CasbinAuthProvider implements AuthProvider {
  constructor(
    private enforcer: Enforcer,
    private contextService: RequestContextService,
  ) {}

  async authorize(params: AuthorizeParams): Promise<boolean> {
    const userId = this.getCurrentUserId();
    if (!userId) return false;

    const { resource, action, organizationId, domain } = params;

    // Casbin enforcement: user, resource, action, org, domain
    return this.enforcer.enforce(
      userId,
      resource,
      action,
      organizationId,
      domain ?? "*"
    );
  }

  getCurrentUserId(): string | null {
    return this.contextService.getUserId();
  }
}
```

## @EventHandler

Marks a method as an event handler for automatic registration.

### Basic Usage

```typescript
import { EventHandler, EventHandlers, InjectBroker } from "@shopana/shared-kernel";

@Injectable()
class InventoryEventHandlers extends EventHandlers {
  constructor(@InjectBroker("inventory") broker: ServiceBroker) {
    super(broker);
  }

  @EventHandler("order.created")
  async onOrderCreated(event: OrderCreatedEvent): Promise<void> {
    await this.inventoryService.reserveStock(event.items);
  }

  @EventHandler("order.cancelled")
  async onOrderCancelled(event: OrderCancelledEvent): Promise<void> {
    await this.inventoryService.releaseStock(event.items);
  }
}
```

### With Retry Policy

```typescript
@EventHandler("payment.failed", {
  retryPolicy: {
    maxAttempts: 3,
    intervalSeconds: 5,
    backoffRate: 2,  // Exponential: 5s, 10s, 20s
  },
})
async onPaymentFailed(event: PaymentFailedEvent): Promise<void> {
  await this.notificationService.sendPaymentFailedEmail(event.orderId);
}
```

### Signature

```typescript
function EventHandler(
  eventName: string,
  options?: EventHandlerOptions
): MethodDecorator

interface EventHandlerOptions {
  retryPolicy?: {
    maxAttempts: number;
    intervalSeconds: number;
    backoffRate?: number;  // Default: 1 (linear)
  };
}
```

## @Transactional / @ReadOnly

Transaction decorators for repository methods. See [[shared-kernel/transaction-manager]] for details.

### @Transactional

```typescript
import { Transactional } from "@shopana/shared-kernel";

class ProductRepository {
  @Transactional()
  async create(data: NewProduct): Promise<Product> {
    // Wrapped in transaction
    return this.connection.insert(products).values(data).returning();
  }

  @Transactional()
  async updateWithVariants(
    productId: string,
    productData: Partial<Product>,
    variants: NewVariant[]
  ): Promise<Product> {
    // All operations in same transaction
    await this.connection.update(products).set(productData).where(eq(products.id, productId));

    for (const variant of variants) {
      await this.connection.insert(productVariants).values({
        ...variant,
        productId,
      });
    }

    return this.findById(productId);
  }
}
```

### @ReadOnly

```typescript
import { ReadOnly } from "@shopana/shared-kernel";

class ProductRepository {
  @ReadOnly()
  async findById(id: string): Promise<Product | null> {
    // Uses existing tx if present, otherwise direct db
    const result = await this.connection
      .select()
      .from(products)
      .where(eq(products.id, id));
    return result[0] ?? null;
  }

  @ReadOnly()
  async search(query: string, limit: number): Promise<Product[]> {
    return this.connection
      .select()
      .from(products)
      .where(ilike(products.title, `%${query}%`))
      .limit(limit);
  }
}
```

## Decorator Composition

Decorators can be combined for comprehensive behavior:

```typescript
@Injectable()
class OrderActions extends BrokerActions implements Authorizable {
  readonly authProvider: AuthProvider;

  @Action("createOrder")
  @ZodSchema(createOrderSchema)
  @Policy<CreateOrderInput>({
    resource: "order",
    action: "create",
    organizationId: (_, params) => params.organizationId,
    domain: (_, params) => `store:${params.storeId}`,
  })
  async createOrder(params: CreateOrderInput): Promise<Order> {
    // 1. Input validated by @ZodSchema
    // 2. Authorization checked by @Policy
    // 3. Method executed
    return this.orderService.create(params);
  }
}
```

**Execution order:**
1. `@ZodSchema` validates input
2. `@Policy` checks authorization
3. Method body executes

If validation fails, authorization is not checked. If authorization fails, method is not called.

## Type Definitions

```typescript
import type {
  // Action types
  ActionDecoratorMetadata,

  // Policy types
  Authorizable,
  AuthProvider,
  AuthorizeParams,
  AuthorizeOptions,

  // Event types
  EventHandlerMetadata,
  EventHandlerOptions,

  // Error types
  UserError,
} from "@shopana/shared-kernel";
```

## Related

- [[shared-kernel/base-classes]] — BrokerActions and EventHandlers base classes
- [[shared-kernel/service-broker]] — ServiceBroker action registration
- [[shared-kernel/transaction-manager]] — Transaction decorator details
- [[shared-kernel/errors]] — ValidationError, AuthorizationError
- [[rbac]] — Authorization system integration
