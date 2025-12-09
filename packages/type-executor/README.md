# Type Executor

A GraphQL-like data resolution system using TypeScript classes. Resolves only requested fields, supports aliases, nested types, and parallel execution.

## Features

- **Selective resolution** — only requested fields are resolved (like GraphQL)
- **Aliases** — same field can be requested multiple times with different arguments
- **Nested types** — automatic recursive resolution via `static fields`
- **Type-safe** — full TypeScript support with inferred types

## Installation

```bash
yarn add @shopana/type-executor
```

## Quick Start

```ts
import { Executor } from "@shopana/type-executor";

// 1. Define a type class
class ProductType {
  constructor(public value: { id: string; title: string; price: number }) {}

  id() { return this.value.id; }
  title() { return this.value.title; }
  price() { return this.value.price; }
}

// 2. Create executor
const executor = new Executor();

// 3. Resolve only requested fields
const result = await executor.resolve(ProductType, product, {
  id: {},
  title: {},
});
// => { id: "p1", title: "iPhone" }
// Note: price() was NOT called
```

## Core Concepts

### Field Selection

Pass a `fieldArgs` object to specify which fields to resolve:

```ts
// Request specific fields
const result = await executor.resolve(ProductType, product, {
  id: {},      // resolve id()
  title: {},   // resolve title()
  // price not requested - won't be resolved
});
```

**If no `fieldArgs` passed, returns empty object:**

```ts
const empty = await executor.resolve(ProductType, product);
// => {}
```

### Nested Types

Use `static fields` to define nested type relationships:

```ts
class VariantType {
  constructor(public value: { id: string; sku: string }) {}
  id() { return this.value.id; }
  sku() { return this.value.sku; }
}

class ProductType {
  static fields = {
    variants: () => VariantType,  // variants resolves to VariantType[]
  };

  constructor(public value: { id: string }) {}

  id() { return this.value.id; }

  async variants() {
    // Return array of variant data - executor will resolve each through VariantType
    return [{ id: "v1", sku: "SKU-1" }, { id: "v2", sku: "SKU-2" }];
  }
}

// Request nested fields using `children`
const result = await executor.resolve(ProductType, product, {
  id: {},
  variants: {
    children: {
      id: {},
      sku: {},
    },
  },
});
// => { id: "p1", variants: [{ id: "v1", sku: "SKU-1" }, { id: "v2", sku: "SKU-2" }] }
```

### Arguments

Pass arguments to resolver methods:

```ts
class ProductType {
  constructor(public value: { id: string }) {}

  variants(args?: { first?: number; after?: string }) {
    const limit = args?.first ?? 10;
    // fetch variants with pagination...
    return fetchVariants(this.value.id, { limit, after: args?.after });
  }
}

const result = await executor.resolve(ProductType, product, {
  variants: {
    args: { first: 5 },
    children: { id: {}, sku: {} },
  },
});
```

### Aliases

Request the same field multiple times with different arguments:

```ts
const result = await executor.resolve(ProductType, product, {
  // First alias: get 3 variants, only sku
  preview: {
    fieldName: "variants",  // actual method name
    args: { first: 3 },
    children: { sku: {} },
  },
  // Second alias: get all variants with full details
  allVariants: {
    fieldName: "variants",
    args: { first: 100 },
    children: { id: {}, sku: {}, price: {} },
  },
});

// => {
//   preview: [{ sku: "SKU-1" }, { sku: "SKU-2" }, { sku: "SKU-3" }],
//   allVariants: [{ id: "v1", sku: "SKU-1", price: 100 }, ...]
// }
```

## BaseType

Convenience base class with lazy data loading:

```ts
import { BaseType } from "@shopana/type-executor";

class ProductType extends BaseType<string, Product> {
  // value = product ID
  // data = loaded Product entity (lazy)

  // Override to load data from ID
  protected async loadData(): Promise<Product> {
    return productsLoader.load(this.value);
  }

  async id() {
    return this.get("id");  // await this.data, then return data.id
  }

  async title() {
    const data = await this.data;
    return data.title;
  }
}
```

## Error Handling

Configure error behavior with `onError` option:

```ts
// Default: throw errors
const executor = new Executor();

// Return null for failed fields
const nullExecutor = new Executor({ onError: "null" });

// Return { __error: message } for failed fields
const partialExecutor = new Executor({ onError: "partial" });
```

## Integration with GraphQL

The package includes a utility to convert GraphQL queries to fieldArgs:

```ts
import { parseGraphQLInfo, parseGraphQLInfoDeep } from "@shopana/type-executor/graphql";

// In GraphQL resolver
const resolvers = {
  Query: {
    product: async (_, { id }, context, info) => {
      // parseGraphQLInfo - uses direct fields from TypeClass
      // parseGraphQLInfoDeep - traverses full type hierarchy (for deep nesting)
      const fieldArgs = parseGraphQLInfoDeep(info, ProductType);
      return executor.resolve(ProductType, id, fieldArgs);
    },
  },
};
```

**Requires peer dependencies:**
```bash
yarn add graphql graphql-parse-resolve-info
```

**Features:**
- Converts GraphQL selection sets to fieldArgs
- Handles aliases (adds `fieldName`)
- Handles fragments (via `graphql-parse-resolve-info`)
- Handles union/interface types (merges fields from all types)

## API Reference

### Executor

```ts
class Executor {
  constructor(options?: ExecutorOptions);

  resolve<T extends TypeClass>(
    Type: T,
    value: ConstructorParameters<T>[0],
    fieldArgs?: FieldArgsTreeFor<T>
  ): Promise<Record<string, unknown>>;

  resolveMany<T extends TypeClass>(
    Type: T,
    values: ConstructorParameters<T>[0][],
    fieldArgs?: FieldArgsTreeFor<T>
  ): Promise<Record<string, unknown>[]>;
}

interface ExecutorOptions {
  onError?: "throw" | "null" | "partial";
}
```

### FieldArgsNode

```ts
interface FieldArgsNode {
  fieldName?: string;  // actual method name (for aliases)
  args?: unknown;      // arguments to pass to resolver
  children?: Record<string, FieldArgsNode>;  // nested field selections
}
```

## TypeScript Types

```ts
import type {
  TypeClass,        // Constructor interface for type classes
  TypeResult,       // Inferred result type from TypeClass
  FieldArgsTreeFor, // Typed fieldArgs for a TypeClass
  FieldArgsNode,    // Single field node in args tree
  ResolverKeys,     // Union of resolver method names
} from "@shopana/type-executor";
```
