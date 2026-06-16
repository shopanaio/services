---
tags:
  - pattern
  - script
  - mutation
  - business-logic
related:
  - architecture/service-structure
  - patterns/resolver
  - shared-kernel/decorators
---

# Script Pattern (BaseScript)

Scripts encapsulate mutation business logic. They are the preferred way to implement create/update/delete operations.

## Overview

| Aspect | Description |
|--------|-------------|
| Purpose | Encapsulate mutation business logic |
| Location | `services/{name}/src/scripts/{entity}/` |
| Base Class | `BaseScript<TParams, TResult>` |
| Called From | Resolvers via `kernel.runScript()` |
| Return Type | `{ entity?, userErrors: UserError[] }` |

## BaseScript Class

```typescript
export interface UserError {
  message: string;
  field?: string[];
  code?: string;
}

export abstract class BaseScript<TParams, TResult> implements Authorizable {
  readonly authProvider = new AuthProvider();

  protected readonly services: KernelServices;
  protected readonly repository: Repository;
  protected readonly logger: Logger;
  protected readonly workflow: WorkflowRegistry;
  protected readonly txManager: TransactionManager;

  constructor(services: KernelServices);

  // Entry point - wraps execute with error handling
  async run(params: TParams): Promise<TResult>;

  // Override: main business logic
  protected abstract execute(params: TParams): Promise<TResult>;

  // Override: error handling
  protected abstract handleError(error: unknown): TResult;

  // Helpers
  protected get context(): ServiceContext;
  protected getLocale(): string;
  protected getProjectId(): string;
  protected get currentUser(): ContextUser;
  protected executeScript<P, R>(ScriptClass, params: P): Promise<R>;
}
```

## Creating a Script

### 1. Define Input/Output Types

```typescript
// WarehouseCreateScript.ts

export interface WarehouseCreateParams {
  readonly code: string;
  readonly name: string;
  readonly isDefault?: boolean;
}

export interface WarehouseCreateResult {
  warehouse?: Warehouse;
  userErrors: UserError[];
}
```

### 2. Implement Script Class

```typescript
export class WarehouseCreateScript extends BaseScript<
  WarehouseCreateParams,
  WarehouseCreateResult
> {
  protected async execute(params: WarehouseCreateParams): Promise<WarehouseCreateResult> {
    const { code, name, isDefault } = params;

    // 1. Validate business rules
    const existing = await this.repository.warehouse.findByCode(code);
    if (existing) {
      return {
        warehouse: undefined,
        userErrors: [{
          message: `Warehouse with code "${code}" already exists`,
          field: ["code"],
          code: "CODE_ALREADY_EXISTS"
        }],
      };
    }

    // 2. Side effects
    if (isDefault) {
      await this.repository.warehouse.clearDefault();
    }

    // 3. Create entity
    const warehouse = await this.repository.warehouse.create({
      code,
      name,
      isDefault: isDefault ?? false,
    });

    // 4. Log success
    this.logger.info({ warehouseId: warehouse.id }, "Warehouse created");

    // 5. Return result
    return { warehouse, userErrors: [] };
  }

  protected handleError(_error: unknown): WarehouseCreateResult {
    return {
      warehouse: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
```

## Calling from Resolver

```typescript
// MutationResolver.ts

@ApolloMutation
export class MutationResolver extends InventoryType<Record<string, never>> {
  inventoryMutation() {
    return new InventoryMutationResolver({}, this.$ctx);
  }
}

export class InventoryMutationResolver extends InventoryType<Record<string, never>> {
  @ZodResolver(WarehouseCreateInputSchema())
  async warehouseCreate(args: { input: WarehouseCreateInput }) {
    const result = await this.$ctx.kernel.runScript(WarehouseCreateScript, {
      code: args.input.code,
      name: args.input.name,
      isDefault: args.input.isDefault ?? undefined,
    });

    return {
      warehouse: result.warehouse
        ? new WarehouseResolver(result.warehouse.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }
}
```

## Decorators

### @Transactional

Wrap execute() in database transaction:

```typescript
import { Transactional } from "@shopana/shared-kernel";

export class OrderCreateScript extends BaseScript<OrderCreateParams, OrderCreateResult> {
  @Transactional()
  protected async execute(params: OrderCreateParams): Promise<OrderCreateResult> {
    // All operations in single transaction
    const order = await this.repository.order.create(params);
    await this.repository.orderItem.createMany(params.items);
    return { order, userErrors: [] };
  }
}
```

### @ZodSchema

Validate input before execution:

```typescript
import { ZodSchema } from "@shopana/shared-kernel";
import { z } from "zod";

const warehouseCreateSchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1),
  isDefault: z.boolean().optional(),
});

export class WarehouseCreateScript extends BaseScript<...> {
  @ZodSchema(warehouseCreateSchema)
  protected async execute(params: WarehouseCreateParams) {
    // params already validated
  }
}
```

### @Policy

Authorization check:

```typescript
import { Policy } from "@shopana/shared-kernel";

export class ProductDeleteScript extends BaseScript<...> implements Authorizable {
  readonly authProvider = new AuthProvider();

  @Policy<ProductDeleteParams>({
    resource: "product",
    action: "delete",
    organizationId: (_, params) => params.organizationId,
  })
  protected async execute(params: ProductDeleteParams) {
    // Only executes if authorized
  }
}
```

## Script Composition

Call other scripts from within a script:

```typescript
export class ProductWithVariantsScript extends BaseScript<...> {
  @Transactional()
  protected async execute(params: CreateProductWithVariantsParams) {
    // Create product
    const productResult = await this.executeScript(
      ProductCreateScript,
      params.product
    );

    if (productResult.userErrors.length > 0) {
      return productResult;
    }

    // Create variants
    for (const variant of params.variants) {
      await this.executeScript(VariantCreateScript, {
        ...variant,
        productId: productResult.product!.id,
      });
    }

    return productResult;
  }
}
```

## Error Handling

### Return UserErrors for Business Errors

```typescript
// Don't throw for business validation
if (stock.available < quantity) {
  return {
    reservation: undefined,
    userErrors: [{
      message: "Insufficient stock",
      field: ["quantity"],
      code: "INSUFFICIENT_STOCK"
    }],
  };
}
```

### Throw for System Errors

```typescript
import { KernelError, FatalError } from "@shopana/shared-kernel";

// Throw KernelError for domain errors that should stop execution
if (!product) {
  throw new KernelError("Product not found", "PRODUCT_NOT_FOUND");
}

// Throw FatalError for unrecoverable errors
throw new FatalError("Database connection lost", error);
```

### handleError() Method

```typescript
protected handleError(error: unknown): WarehouseCreateResult {
  // Handle ValidationError (from @ZodSchema)
  if (error instanceof ValidationError) {
    return {
      warehouse: undefined,
      userErrors: error.errors,
    };
  }

  // Handle AuthorizationError (from @Policy)
  if (error instanceof AuthorizationError) {
    return {
      warehouse: undefined,
      userErrors: error.errors,
    };
  }

  // Generic error
  return {
    warehouse: undefined,
    userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
  };
}
```

## See Also

- [[architecture/service-structure]] — Service folder structure
- [[patterns/resolver]] — How resolvers call scripts
- [[shared-kernel/decorators]] — @Transactional, @ZodSchema, @Policy
- [[shared-kernel/errors]] — Error classes
