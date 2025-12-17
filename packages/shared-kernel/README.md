# @shopana/shared-kernel

Architectural microkernel for Shopana microservices implementing the Transaction Script pattern.

## Description

This package provides a minimal kernel architecture for microservices:

- **Kernel** - central coordinator for executing transaction scripts
- **Transaction Script** - pattern for organizing business logic
- **MoleculerLogger** - adapter for Moleculer logger
- A set of common types and interfaces

## Installation

```bash
yarn add @shopana/shared-kernel
```

## Usage

### 1. Creating Kernel in a Service

```typescript
import { Kernel, MoleculerLogger } from "@shopana/shared-kernel";
import { Service, ServiceSchema } from "moleculer";

type ServiceThis = Service & { kernel: Kernel };

const MyService: ServiceSchema = {
  name: "my-service",

  async started() {
    const moleculerLogger = new MoleculerLogger(this.logger);
    this.kernel = new Kernel(this.broker, moleculerLogger);
  }
};
```

### 2. Creating a Transaction Script

```typescript
import type { TransactionScript } from "@shopana/shared-kernel";

export interface GetDataParams {
  readonly projectId: string;
  readonly filter?: string;
}

export interface GetDataResult {
  items: any[];
  warnings?: Array<{ code: string; message: string }>;
}

export const getData: TransactionScript<GetDataParams, GetDataResult> =
  async (params, services) => {
    const { broker, logger } = services;

    try {
      const result = await broker.call("apps.execute", {
        domain: "mydomain",
        operation: "list",
        params: { projectId: params.projectId },
      });

      return {
        items: result.data || [],
        warnings: result.warnings,
      };
    } catch (error) {
      logger.error({ error }, "getData failed");
      return {
        items: [],
        warnings: [{ code: "INTERNAL_ERROR", message: "Internal server error" }],
      };
    }
  };
```

### 3. Executing Scripts via Kernel

```typescript
actions: {
  async getData(this: ServiceThis, ctx: Context<GetDataParams>) {
    return this.kernel.executeScript(getData, ctx.params);
  }
}
```

## Architecture

### Kernel Services

Kernel provides scripts with two main services:

- **broker** - Moleculer ServiceBroker for inter-service communication
- **logger** - Logger for recording events and errors

### Transaction Script Pattern

Transaction Script is a business logic organization pattern where each operation is represented by a separate function (script). A script:

1. Receives parameters and services from Kernel
2. Executes business logic
3. Returns the result

Benefits:
- Simplicity and clarity
- Easy testing
- Minimal coupling
- Explicit dependencies

## Types

### Logger

```typescript
interface Logger {
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  debug: (...args: any[]) => void;
}
```

### KernelServices

```typescript
interface KernelServices {
  readonly broker: any;
  readonly logger: Logger;
}
```

### TransactionScript

```typescript
interface TransactionScript<TParams = any, TResult = any> {
  (params: TParams, services: KernelServices): Promise<TResult>;
}
```

### ScriptResult

```typescript
interface ScriptResult<TData = any> {
  data: TData;
  warnings?: Array<{ code: string; message: string; details?: any }>;
  metadata?: Record<string, unknown>;
}
```

### KernelError

```typescript
class KernelError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  );
}
```

## Usage Examples

See services:
- `services/payments` - payment methods handling
- `services/delivery` - delivery methods handling
- `services/pricing` - discounts and pricing handling

## License

ISC
