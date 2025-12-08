# Executor argument passing and typed input tree

This document describes a proposed extension of `@shopana/type-executor` to:

- allow resolver methods to accept arguments (e.g. `variants(args)` instead of parameterless methods);
- pass those arguments from a single root call to `executor.resolve(...)` down the whole type graph;
- keep the input tree for arguments fully type-safe, inferred from the `TypeClass` definitions (including nested types via `static fields`).

The goal is to support use cases like Relay-style connections in GraphQL and REST without duplicating logic: REST and GraphQL both map their request arguments into a single typed "field arguments tree", and the executor distributes those arguments to the corresponding resolvers at every level.

---

## 1. Current executor behavior (baseline)

Today the executor has the following behavior:

- It accepts a `TypeClass` and a `value`:

  ```ts
  async resolve<T>(Type: TypeClass<T>, value: T): Promise<Record<string, unknown>>;
  ```

- It constructs an instance and finds resolver methods:

  ```ts
  const instance = new Type(value);
  const methods = this.getResolverMethods(instance);
  ```

- For each resolver method `key`, it calls the method **without arguments**:

  ```ts
  const resolved = await (instance as Record<string, () => unknown>)[key]();
  ```

- If there is a corresponding `static fields` entry, the executor recursively resolves child types:

  ```ts
  const getChildType = fields[key];
  if (getChildType && resolved != null) {
    const ChildType = getChildType();
    // resolve ChildType for scalar or array
  }
  ```

Implications:

- Resolver methods cannot accept arguments in a meaningful way; the executor does not know what to pass.
- All field-specific behavior (pagination, filters, sorting, etc.) must be handled via context or encoded into the `value` itself.

---

## 2. Design goals

We want to extend the executor so that:

1. Resolver methods may accept a single argument object:

   ```ts
   class ProductType extends BaseType<string, Product | null> {
     static fields = { variants: () => VariantType };

     async variants(args?: { first?: number; orderBy?: "POSITION_ASC" | "POSITION_DESC" }) {
       // args is always passed, may be undefined if not provided in tree
     }
   }

   class VariantType extends BaseType<string, Variant | null> {
     static fields = { media: () => MediaType };

     async media(args?: { first?: number }) {
       // args is always passed, may be undefined if not provided in tree
     }
   }
   ```

2. A **single** root call

   ```ts
   executor.resolve(ProductType, productId, fieldArgsTree);
   ```

   should:

   - distribute arguments from `fieldArgsTree` to all resolvers at all nesting levels;
   - call each method with its specific argument object (or `undefined` if not provided in tree).

3. The `fieldArgsTree` should be **fully type-safe**:

   - TypeScript should infer the shape of the arguments tree from the `TypeClass`, including nested types via `static fields`;
   - incorrect fields or wrong argument shapes should be type errors at compile time.

---

## 3. Allowing resolver methods to accept parameters

File: `packages/type-executor/src/types.ts`

Currently `ResolverMethod` is defined as:

```ts
export type ResolverMethod<T> = () => T | Promise<T>;
```

To allow methods with arguments, we relax this definition:

```ts
export type ResolverMethod<T, A = undefined> = (args?: A) => T | Promise<T>;
```

This keeps compatibility with parameterless methods while allowing resolvers to declare an optional parameter.

**Convention:** All resolver methods receive a single optional argument. Methods that don't need arguments can either:
- Omit the parameter entirely (it will be ignored)
- Declare it as optional: `method(args?: SomeType)`

---

## 4. Typed field arguments tree

We introduce a type that describes the **shape of arguments** for a given `TypeClass`, including nested child types defined via `static fields`.

File: `packages/type-executor/src/types.ts`

### 4.1 Helper types

```ts
export interface TypeClass<T = unknown> {
  new (value: T): object;
  fields?: Record<string, () => TypeClass<unknown>>;
}

type Instance<T extends TypeClass> = InstanceType<T>;

/**
 * Extracts all resolver method keys from a TypeClass instance.
 * Excludes constructor and non-function properties.
 */
export type ResolverKeys<T extends TypeClass> = {
  [K in keyof Instance<T>]: Instance<T>[K] extends (...args: unknown[]) => unknown
    ? K extends "constructor"
      ? never
      : K
    : never;
}[keyof Instance<T>];

/**
 * Resolves the child TypeClass for a given resolver key via static fields.
 * Returns `never` if no child type is defined.
 */
export type ChildTypeFor<T extends TypeClass, K extends ResolverKeys<T>> = K extends keyof NonNullable<
  T["fields"]
>
  ? NonNullable<T["fields"]>[K] extends () => infer CT
    ? CT extends TypeClass
      ? CT
      : never
    : never
  : never;

/**
 * Extracts the argument type for a resolver method.
 * Returns `undefined` for methods without parameters.
 */
export type ArgsForField<T extends TypeClass, K extends ResolverKeys<T>> = Instance<T>[K] extends (
  arg: infer P,
  ...rest: unknown[]
) => unknown
  ? P
  : undefined;
```

Explanation:

- `ResolverKeys<T>` collects all method names on the instance that are resolvers (functions other than the constructor).
- `ChildTypeFor<T, K>` resolves the child `TypeClass` for a resolver `K`, via `static fields`.
- `ArgsForField<T, K>` extracts the type of the first argument of resolver method `K`. Returns `undefined` for parameterless methods.

### 4.2 Field arguments tree type

```ts
/**
 * Recursively builds a typed arguments tree for a TypeClass.
 * Each field can have:
 * - `args`: the arguments to pass to the resolver method
 * - `children`: nested arguments for child types (via static fields)
 */
export type FieldArgsTreeFor<T extends TypeClass> = {
  [K in ResolverKeys<T>]?: ArgsForField<T, K> extends undefined
    ? ChildTypeFor<T, K> extends TypeClass
      ? { children?: FieldArgsTreeFor<ChildTypeFor<T, K>> }
      : never
    : {
        args?: ArgsForField<T, K>;
        children?: ChildTypeFor<T, K> extends TypeClass
          ? FieldArgsTreeFor<ChildTypeFor<T, K>>
          : never;
      };
};
```

For a concrete `ProductType`, `FieldArgsTreeFor<typeof ProductType>` will be a strongly typed tree:

- `variants.args` has the exact type of the first argument of `ProductType.prototype.variants`;
- `variants.children.media.args` has the exact type of the first argument of `VariantType.prototype.media`;
- and so on recursively according to `static fields`.

Example:

```ts
type ProductArgsTree = FieldArgsTreeFor<typeof ProductType>;

const args: ProductArgsTree = {
  variants: {
    args: { first: 10, orderBy: "POSITION_ASC" },
    children: {
      media: {
        args: { first: 5 },
      },
    },
  },
};
```

If you pass an invalid field or wrong argument shape, TypeScript will report a type error.

---

## 5. Extending Executor to accept a typed arguments tree

File: `packages/type-executor/src/executor.ts`

We extend the executor API to accept a typed field arguments tree and propagate it during recursive resolution.

### 5.1 Imports and signatures

```ts
import type {
  TypeClass,
  ExecutorOptions,
  FieldArgsTreeFor,
  ResolverKeys,
} from "./types.js";

export class Executor {
  async resolve<T extends TypeClass>(
    Type: T,
    value: ConstructorParameters<T>[0],
    fieldArgs?: FieldArgsTreeFor<T>
  ): Promise<Record<string, unknown>> {
    // implementation below
  }

  async resolveMany<T extends TypeClass>(
    Type: T,
    values: ConstructorParameters<T>[0][],
    fieldArgs?: FieldArgsTreeFor<T>
  ): Promise<Record<string, unknown>[]> {
    return Promise.all(values.map((value) => this.resolve(Type, value, fieldArgs)));
  }
}
```

### 5.2 Passing arguments into resolvers

Inside `resolve`, we adjust the method invocation logic:

```ts
async resolve<T extends TypeClass>(
  Type: T,
  value: ConstructorParameters<T>[0],
  fieldArgs?: FieldArgsTreeFor<T>
): Promise<Record<string, unknown>> {
  const instance = new Type(value);
  const fieldsMap = (Type as { fields?: Record<string, () => TypeClass> }).fields ?? {};
  const result: Record<string, unknown> = {};

  const methods = this.getResolverMethods(instance) as ResolverKeys<T>[];
  const argsTree = fieldArgs ?? {};

  await Promise.all(
    methods.map(async (key) => {
      const method = (instance as Record<string, (args?: unknown) => unknown>)[key];
      const fieldNode = argsTree[key as keyof typeof argsTree];
      const argsForField = fieldNode && "args" in fieldNode ? fieldNode.args : undefined;

      // Always pass args - methods that don't need them will ignore the parameter
      const resolved = await method(argsForField);

      const getChildType = fieldsMap[key as string];

      if (getChildType && resolved != null) {
        const ChildType = getChildType();
        const childArgsTree = fieldNode && "children" in fieldNode ? fieldNode.children : undefined;

        if (Array.isArray(resolved)) {
          result[key as string] = await Promise.all(
            resolved.map((item) =>
              this.resolve(
                ChildType as TypeClass,
                item as ConstructorParameters<typeof ChildType>[0],
                childArgsTree as FieldArgsTreeFor<typeof ChildType>
              )
            )
          );
        } else {
          result[key as string] = await this.resolve(
            ChildType as TypeClass,
            resolved as ConstructorParameters<typeof ChildType>[0],
            childArgsTree as FieldArgsTreeFor<typeof ChildType>
          );
        }
      } else {
        result[key as string] = resolved;
      }
    })
  );

  return result;
}
```

Key changes from original design:

- **Always pass arguments** — no `method.length` check. Methods receive `undefined` if no args provided.
- **Safe property access** — use `"args" in fieldNode` and `"children" in fieldNode` checks.
- **Cleaner type casts** — use `ConstructorParameters<typeof ChildType>[0]` instead of `never`.

---

## 6. Error handling

The executor should handle errors gracefully and provide meaningful error messages.

### 6.1 Resolver errors

```ts
async resolve<T extends TypeClass>(
  Type: T,
  value: ConstructorParameters<T>[0],
  fieldArgs?: FieldArgsTreeFor<T>
): Promise<Record<string, unknown>> {
  const instance = new Type(value);
  // ...

  await Promise.all(
    methods.map(async (key) => {
      try {
        const method = (instance as Record<string, (args?: unknown) => unknown>)[key];
        const fieldNode = argsTree[key as keyof typeof argsTree];
        const argsForField = fieldNode && "args" in fieldNode ? fieldNode.args : undefined;

        const resolved = await method(argsForField);
        // ... rest of resolution
      } catch (error) {
        throw new ResolverError(
          `Failed to resolve field "${String(key)}" on ${Type.name}`,
          { cause: error, field: key, type: Type.name }
        );
      }
    })
  );

  return result;
}
```

### 6.2 Custom error class

```ts
export class ResolverError extends Error {
  readonly field: string | symbol;
  readonly type: string;

  constructor(
    message: string,
    options: { cause?: unknown; field: string | symbol; type: string }
  ) {
    super(message, { cause: options.cause });
    this.name = "ResolverError";
    this.field = options.field;
    this.type = options.type;
  }
}
```

---

## 7. Runtime validation (optional)

For development and debugging, add optional runtime validation of the arguments tree.

### 7.1 Validation function

```ts
import { z } from "zod";

export function validateArgsTree<T extends TypeClass>(
  Type: T,
  argsTree: unknown
): FieldArgsTreeFor<T> {
  // Build schema dynamically from Type metadata
  const schema = buildArgsTreeSchema(Type);
  return schema.parse(argsTree);
}
```

### 7.2 Usage with validation

```ts
const executor = new Executor({ validateArgs: true });

// In resolve():
if (this.options.validateArgs && fieldArgs) {
  validateArgsTree(Type, fieldArgs);
}
```

This is opt-in and should only be enabled during development to catch mismatched argument trees early.

---

## 8. Usage examples

### 8.1 Type definitions

```ts
class ProductType extends BaseType<string, Product | null> {
  static fields = { variants: () => VariantType };

  async variants(args?: { first?: number; orderBy?: "POSITION_ASC" | "POSITION_DESC" }) {
    const { first = 10, orderBy = "POSITION_ASC" } = args ?? {};
    // use first, orderBy to query variants
  }
}

class VariantType extends BaseType<string, Variant | null> {
  static fields = { media: () => MediaType };

  async media(args?: { first?: number }) {
    const { first = 5 } = args ?? {};
    // use first as limit for gallery items
  }
}

class MediaType extends BaseType<string, Media | null> {
  // No args needed - parameter is simply ignored
  async url() {
    return this.data?.url;
  }
}
```

### 8.2 Building a typed arguments tree

```ts
type ProductArgsTree = FieldArgsTreeFor<typeof ProductType>;

const args: ProductArgsTree = {
  variants: {
    args: { first: 10, orderBy: "POSITION_ASC" },
    children: {
      media: {
        args: { first: 5 },
      },
    },
  },
};
```

GraphQL and REST layers can both map their request arguments (e.g. `first`, `after`, `orderBy`, filters) into this structure. TypeScript will validate that:

- `variants.args` has the correct shape;
- `media.args` exists only under `variants.children` and has the correct shape, etc.

### 8.3 Resolving with arguments

```ts
await executor.resolve(ProductType, "product-id-123", args);
```

The executor will:

- call `ProductType.variants({ first: 10, orderBy: "POSITION_ASC" })`;
- for each variant, call `VariantType.media({ first: 5 })`;
- for each media, call `MediaType.url(undefined)`;
- recursively resolve all nested fields according to `static fields`.

### 8.4 Resolving without arguments (backward compatible)

```ts
// All three are equivalent for methods with default values
await executor.resolve(ProductType, "product-id-123");
await executor.resolve(ProductType, "product-id-123", {});
await executor.resolve(ProductType, "product-id-123", undefined);
```

---

## 9. Backward compatibility

- Existing code that uses resolver methods without parameters remains valid:
  - resolvers that take no arguments simply ignore the `undefined` parameter;
  - `FieldArgsTreeFor<T>` is optional in `resolve`, so callers that do not provide arguments are unaffected.
- Adding parameters to resolvers is an opt-in feature:
  - declare the parameter as optional: `args?: SomeType`;
  - handle `undefined` case with defaults: `const { first = 10 } = args ?? {}`.

---

## 10. Implementation checklist

1. [ ] Update `ResolverMethod` type in `types.ts`
2. [ ] Add helper types: `ResolverKeys`, `ChildTypeFor`, `ArgsForField`
3. [ ] Add `FieldArgsTreeFor` recursive type
4. [ ] Update `Executor.resolve()` signature to accept `fieldArgs`
5. [ ] Update `Executor.resolveMany()` signature
6. [ ] Implement argument passing in resolver invocation
7. [ ] Add `ResolverError` class
8. [ ] Add error handling wrapper
9. [ ] (Optional) Add runtime validation with zod
10. [ ] Add unit tests for argument passing
11. [ ] Add unit tests for nested argument trees
12. [ ] Update documentation
