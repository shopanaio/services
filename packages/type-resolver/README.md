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

// 2. Resolve only requested fields
const result = await ProductType.load(product, {
  fields: ["id", "title"],
}, ctx);
// => { id: "p1", title: "iPhone" }
// Note: price() was NOT called
```

## Core Concepts

### QueryArgs Format

The query format uses `fields` for scalar fields and `populate` for relations:

```ts
type QueryArgs = {
  fields?: string[];              // scalar fields to resolve
  populate?: {                    // relation fields with nested structure
    [fieldName: string]: QueryArgs;
  };
  args?: unknown;                 // arguments for resolver method
  fieldName?: string;             // alias support (actual method name)
};
```

### Field Selection

```ts
// Request specific scalar fields
const result = await ProductType.load(product, {
  fields: ["id", "title"],
  // price not in fields - won't be resolved
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
    return [{ id: "v1", sku: "SKU-1" }, { id: "v2", sku: "SKU-2" }];
  }
}

// Request nested fields using `populate`
const result = await ProductType.load(product, {
  fields: ["id"],
  populate: {
    variants: {
      fields: ["id", "sku"],
    },
  },
}, ctx);
// => { id: "p1", variants: [{ id: "v1", sku: "SKU-1" }, { id: "v2", sku: "SKU-2" }] }
```

### Arguments

Pass arguments to resolver methods via `args`:

```ts
class ProductType extends BaseType<{ id: string }> {
  variants(args?: { first?: number; where?: object }) {
    const limit = args?.first ?? 10;
    return fetchVariants(this.value.id, { limit, where: args?.where });
  }
}

const result = await ProductType.load(product, {
  populate: {
    variants: {
      args: { first: 5, where: { isPublished: true } },
      fields: ["id", "sku"],
    },
  },
}, ctx);
```

### Aliases

Request the same field multiple times with different arguments using `fieldName`:

```ts
const result = await ProductType.load(product, {
  populate: {
    // First alias: get 3 variants, only sku
    preview: {
      fieldName: "variants",  // actual method name
      args: { first: 3 },
      fields: ["sku"],
    },
    // Second alias: get all variants with full details
    allVariants: {
      fieldName: "variants",
      args: { first: 100 },
      fields: ["id", "sku", "price"],
    },
  },
}, ctx);

// => {
//   preview: [{ sku: "SKU-1" }, { sku: "SKU-2" }, { sku: "SKU-3" }],
//   allVariants: [{ id: "v1", sku: "SKU-1", price: 100 }, ...]
// }
```

### Deep Nesting (3+ levels)

```ts
const result = await ProductType.load(product, {
  fields: ["id"],
  populate: {
    variants: {
      args: { first: 10 },
      fields: ["id", "sku"],
      populate: {
        stock: {
          args: { where: { quantity: { _gt: 0 } } },
          fields: ["quantity"],
          populate: {
            warehouse: {
              fields: ["id", "name"],
            },
          },
        },
      },
    },
  },
}, ctx);
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
const product = await ProductType.load(productId, query, ctx);

// Load multiple items
const products = await ProductType.loadMany(productIds, query, ctx);
```

## Integration with GraphQL

The package includes a utility to convert GraphQL queries to QueryArgs:

```ts
import { parseGraphqlInfo } from "@shopana/type-resolver";

// In GraphQL resolver
const resolvers = {
  Query: {
    product: async (_, { id }, context, info) => {
      const query = parseGraphqlInfo(info);
      return ProductType.load(id, query, context);
    },
  },
  Mutation: {
    createProduct: async (_, { input }, context, info) => {
      const product = await createProduct(input);
      // Extract fields for nested "product" field in payload
      const query = parseGraphqlInfo(info, "product");
      return {
        product: await ProductType.load(product.id, query, context),
      };
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
    query: QueryArgs | undefined,
    ctx: TypeContext<T>
  ): Promise<TypeResult<T>>;

  // Load and resolve multiple values
  static loadMany<T extends TypeClass>(
    this: T,
    values: ConstructorParameters<T>[0][],
    query: QueryArgs | undefined,
    ctx: TypeContext<T>
  ): Promise<TypeResult<T>[]>;
}
```

### QueryArgs

```ts
type QueryArgs<TArgs = unknown> = {
  fields?: string[];                      // scalar fields to resolve
  populate?: Record<string, QueryArgs>;   // relation fields
  args?: TArgs;                           // arguments for resolver method
  fieldName?: string;                     // alias support
};
```

## TypeScript Types

```ts
import type {
  TypeClass,      // Constructor interface for type classes
  TypeResult,     // Inferred result type from TypeClass
  QueryArgs,      // Query arguments for selective resolution
  ResolverKeys,   // Union of resolver method names
} from "@shopana/type-resolver";
```
