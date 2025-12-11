# Type Resolver

A GraphQL-like data resolution system using TypeScript classes. Resolves only requested fields, supports aliases, nested types, and parallel execution.

## Features

- **Selective resolution** — only requested fields are resolved (like GraphQL)
- **Aliases** — same field can be requested multiple times with different arguments
- **Nested types** — automatic recursive resolution via `static fields`
- **Type-safe** — full TypeScript support with inferred types

## Installation

```bash
yarn add @shopana/type-resolver
```

## Quick Start

```ts
import { BaseType } from "@shopana/type-resolver";

// 1. Define a type class
class ProductType extends BaseType<{ id: string; title: string; price: number }> {
  id() { return this.value.id; }
  title() { return this.value.title; }
  price() { return this.value.price; }
}

// 2. Resolve only requested fields via static methods
const result = await ProductType.load(product, {
  id: {},
  title: {},
}, ctx);
// => { id: "p1", title: "iPhone" }
// Note: price() was NOT called
```

## Core Concepts

### Field Selection

Pass a `fieldArgs` object to specify which fields to resolve:

```ts
// Request specific fields
const result = await ProductType.load(product, {
  id: {},      // resolve id()
  title: {},   // resolve title()
  // price not requested - won't be resolved
}, ctx);
```

### Nested Types

Use `static fields` to define nested type relationships:

```ts
class VariantType extends BaseType<{ id: string; sku: string }> {
  id() { return this.value.id; }
  sku() { return this.value.sku; }
}

class ProductType extends BaseType<{ id: string }> {
  static fields = {
    variants: () => VariantType,  // variants resolves to VariantType[]
  };

  id() { return this.value.id; }

  async variants() {
    // Return array of variant data - resolver will resolve each through VariantType
    return [{ id: "v1", sku: "SKU-1" }, { id: "v2", sku: "SKU-2" }];
  }
}

// Request nested fields using `children`
const result = await ProductType.load(product, {
  id: {},
  variants: {
    children: {
      id: {},
      sku: {},
    },
  },
}, ctx);
// => { id: "p1", variants: [{ id: "v1", sku: "SKU-1" }, { id: "v2", sku: "SKU-2" }] }
```

### Arguments

Pass arguments to resolver methods:

```ts
class ProductType extends BaseType<{ id: string }> {
  variants(args?: { first?: number; after?: string }) {
    const limit = args?.first ?? 10;
    // fetch variants with pagination...
    return fetchVariants(this.value.id, { limit, after: args?.after });
  }
}

const result = await ProductType.load(product, {
  variants: {
    args: { first: 5 },
    children: { id: {}, sku: {} },
  },
}, ctx);
```

### Aliases

Request the same field multiple times with different arguments:

```ts
const result = await ProductType.load(product, {
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
}, ctx);

// => {
//   preview: [{ sku: "SKU-1" }, { sku: "SKU-2" }, { sku: "SKU-3" }],
//   allVariants: [{ id: "v1", sku: "SKU-1", price: 100 }, ...]
// }
```

## BaseType

Convenience base class with lazy data loading:

```ts
import { BaseType } from "@shopana/type-resolver";

class ProductType extends BaseType<string, Product, MyContext> {
  // value = product ID
  // data = loaded Product entity (lazy)

  // Override to load data from ID
  protected async loadData(): Promise<Product> {
    return this.ctx.loaders.products.load(this.value);
  }

  async id() {
    return this.get("id");  // await this.data, then return data.id
  }

  async title() {
    const data = await this.data;
    return data.title;
  }
}

// Load single item
const product = await ProductType.load(productId, fieldArgs, ctx);

// Load multiple items
const products = await ProductType.loadMany(productIds, fieldArgs, ctx);
```

## Integration with GraphQL

The package includes a utility to convert GraphQL queries to fieldArgs:

```ts
import { parseGraphqlInfo } from "@shopana/type-resolver";

// In GraphQL resolver
const resolvers = {
  Query: {
    product: async (_, { id }, context, info) => {
      const fieldArgs = parseGraphqlInfo(info, ProductType);
      return ProductType.load(id, fieldArgs, context);
    },
  },
};
```

**Requires peer dependencies:**
```bash
yarn add graphql graphql-parse-resolve-info
```

## API Reference

### BaseType Static Methods

```ts
class BaseType<TValue, TData = TValue, TContext = unknown> {
  // Load and resolve a single value
  static load<T extends TypeClass>(
    this: T,
    value: ConstructorParameters<T>[0],
    fieldArgs: FieldArgsTreeFor<T> | undefined,
    ctx: TypeContext<T>
  ): Promise<TypeResult<T>>;

  // Load and resolve multiple values
  static loadMany<T extends TypeClass>(
    this: T,
    values: ConstructorParameters<T>[0][],
    fieldArgs: FieldArgsTreeFor<T> | undefined,
    ctx: TypeContext<T>
  ): Promise<TypeResult<T>[]>;
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
} from "@shopana/type-resolver";
```
