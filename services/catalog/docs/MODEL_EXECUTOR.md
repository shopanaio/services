# Model Executor

## Overview

Model Executor is a library for recursive data resolution similar to GraphQL, but without GraphQL. It uses classes as types where each method is a resolver. Context is accessed via AsyncLocalStorage.

---

## Context

Context is available globally via `getContext()`. It contains DataLoaders and request-scoped parameters:

```typescript
interface Context {
  loaders: DataLoaders;
  locale: string;
  currency: string;
  imageSize: 'thumb' | 'full';
  // ... other request-scoped data
}

// AsyncLocalStorage (already configured in repositories)
const contextStorage = new AsyncLocalStorage<Context>();

export function getContext(): Context {
  const ctx = contextStorage.getStore();
  if (!ctx) throw new Error('No context available');
  return ctx;
}
```

---

## Type Definition

Each type is a class:
- `static fields` — mapping to child types for recursive resolution
- `constructor(public value: T)` — holds raw data
- Methods — resolvers that return field values

```typescript
class ProductType {
  static fields = {
    variants: () => VariantType,
    attributes: () => AttributeType,
  };

  constructor(public value: Product) {}

  id() {
    return this.value.id;
  }

  title() {
    const { locale } = getContext();
    return this.value.translations[locale]?.title ?? this.value.title;
  }

  slug() {
    return this.value.slug;
  }

  description() {
    const { locale } = getContext();
    return this.value.translations[locale]?.description ?? this.value.description;
  }

  async variants() {
    const { loaders } = getContext();
    return loaders.variants.load(this.value.id);
  }

  async attributes() {
    const { loaders } = getContext();
    return loaders.attributes.load(this.value.id);
  }
}

class VariantType {
  static fields = {
    images: () => ImageType,
    prices: () => PriceType,
  };

  constructor(public value: Variant) {}

  id() {
    return this.value.id;
  }

  sku() {
    return this.value.sku;
  }

  async images() {
    const { loaders, imageSize } = getContext();
    const images = await loaders.images.load(this.value.id);
    return images.filter(i => i.size === imageSize);
  }

  async prices() {
    const { loaders, currency } = getContext();
    const prices = await loaders.prices.load(this.value.id);
    return prices.filter(p => p.currency === currency);
  }
}

class ImageType {
  constructor(public value: Image) {}

  id() {
    return this.value.id;
  }

  url() {
    return this.value.url;
  }

  alt() {
    const { locale } = getContext();
    return this.value.translations[locale]?.alt ?? this.value.alt;
  }
}

class PriceType {
  constructor(public value: Price) {}

  amount() {
    return this.value.amount;
  }

  currency() {
    return this.value.currency;
  }

  formatted() {
    return new Intl.NumberFormat(getContext().locale, {
      style: 'currency',
      currency: this.value.currency,
    }).format(this.value.amount);
  }
}

class AttributeType {
  constructor(public value: Attribute) {}

  name() {
    const { locale } = getContext();
    return this.value.translations[locale]?.name ?? this.value.name;
  }

  value() {
    const { locale } = getContext();
    return this.value.translations[locale]?.value ?? this.value.value;
  }
}
```

---

## Executor

```typescript
interface TypeClass<T = any> {
  new (value: T): any;
  fields?: Record<string, () => TypeClass>;
}

class Executor {
  async resolve<T>(Type: TypeClass<T>, value: T): Promise<any> {
    const instance = new Type(value);
    const fields = (Type as any).fields || {};
    const result: Record<string, any> = {};

    const methods = this.getResolverMethods(instance);

    await Promise.all(
      methods.map(async (key) => {
        const resolved = await (instance as any)[key]();
        const getChildType = fields[key];

        if (getChildType && resolved != null) {
          const ChildType = getChildType();

          if (Array.isArray(resolved)) {
            result[key] = await Promise.all(
              resolved.map((item) => this.resolve(ChildType, item))
            );
          } else {
            result[key] = await this.resolve(ChildType, resolved);
          }
        } else {
          result[key] = resolved;
        }
      })
    );

    return result;
  }

  private getResolverMethods(instance: any): string[] {
    const proto = Object.getPrototypeOf(instance);
    return Object.getOwnPropertyNames(proto).filter(
      (key) => key !== 'constructor' && typeof proto[key] === 'function'
    );
  }
}

export const executor = new Executor();
```

---

## Usage

```typescript
// Context is already available via AsyncLocalStorage
const { loaders } = getContext();

const rawProduct = await loaders.product.load(productId);
const product = await executor.resolve(ProductType, rawProduct);

// Result:
// {
//   id: "p1",
//   title: "iPhone 15",
//   slug: "iphone-15",
//   description: "...",
//   variants: [
//     {
//       id: "v1",
//       sku: "IP15-BLK-128",
//       images: [{ id: "i1", url: "...", alt: "..." }],
//       prices: [{ amount: 999, currency: "USD", formatted: "$999.00" }]
//     }
//   ],
//   attributes: [
//     { name: "Color", value: "Black" }
//   ]
// }
```

---

## How It Works

```
executor.resolve(ProductType, rawProduct)
│
├── new ProductType(rawProduct)
│
├── [PARALLEL] call all resolver methods
│   │
│   ├── id()            → "p1"
│   ├── title()         → getContext().locale → "iPhone 15"
│   ├── slug()          → "iphone-15"
│   ├── variants()      → getContext().loaders.variants.load(...)
│   │   │
│   │   └── static fields: variants → VariantType
│   │       │
│   │       └── [PARALLEL] for each variant
│   │           │
│   │           └── executor.resolve(VariantType, variant)
│   │               │
│   │               ├── id()      → "v1"
│   │               ├── sku()     → "IP15-BLK-128"
│   │               ├── images()  → filter by ctx.imageSize
│   │               │   └── → executor.resolve(ImageType, ...)
│   │               └── prices()  → filter by ctx.currency
│   │                   └── → executor.resolve(PriceType, ...)
│   │
│   └── attributes()    → [...]
│       └── → executor.resolve(AttributeType, ...)
│
└── return merged result
```

---

## DataLoader Batching

All parallel calls naturally batch through DataLoader:

```
Product p1 → loaders.variants.load("p1")
Product p2 → loaders.variants.load("p2")
Product p3 → loaders.variants.load("p3")
                     │
                     ▼
          Event loop tick
                     │
                     ▼
          batchFn(["p1", "p2", "p3"])
                     │
                     ▼
          1 SQL query instead of 3
```

---

## Different Views

```typescript
// Full product
class ProductFullType {
  static fields = {
    variants: () => VariantFullType,
    attributes: () => AttributeType,
    categories: () => CategoryType,
    related: () => ProductCardType,
  };

  constructor(public value: Product) {}

  id() { return this.value.id }
  title() { return this.value.title }
  description() { return this.value.description }

  async variants() {
    return getContext().loaders.variants.load(this.value.id);
  }

  async attributes() {
    return getContext().loaders.attributes.load(this.value.id);
  }

  async categories() {
    return getContext().loaders.categories.load(this.value.id);
  }

  async related() {
    return getContext().loaders.related.load(this.value.id);
  }
}

// Minimal product for cards
class ProductCardType {
  static fields = {
    primaryImage: () => ImageType,
  };

  constructor(public value: Product) {}

  id() { return this.value.id }
  title() { return this.value.title }
  slug() { return this.value.slug }

  async primaryImage() {
    const { loaders } = getContext();
    const variants = await loaders.variants.load(this.value.id);
    if (!variants[0]) return null;
    const images = await loaders.images.load(variants[0].id);
    return images.find(i => i.isPrimary) || images[0] || null;
  }

  async minPrice() {
    const { loaders } = getContext();
    const variants = await loaders.variants.load(this.value.id);
    const prices = await Promise.all(
      variants.map(v => loaders.prices.load(v.id))
    );
    return Math.min(...prices.flat().map(p => p.amount));
  }
}
```

---

## Base Type (Optional)

```typescript
abstract class BaseType<T> {
  constructor(public value: T) {}

  protected ctx() {
    return getContext();
  }

  protected get<K extends keyof T>(key: K): T[K] {
    return this.value[key];
  }
}

class ProductType extends BaseType<Product> {
  static fields = {
    variants: () => VariantType,
  };

  id() { return this.get('id') }
  title() { return this.get('title') }

  async variants() {
    return this.ctx().loaders.variants.load(this.get('id'));
  }
}
```

---

## Error Handling

```typescript
interface ExecutorOptions {
  onError?: 'throw' | 'null' | 'partial';
}

class Executor {
  constructor(private options: ExecutorOptions = {}) {}

  async resolve<T>(Type: TypeClass<T>, value: T): Promise<any> {
    const instance = new Type(value);
    const fields = (Type as any).fields || {};
    const result: Record<string, any> = {};

    const methods = this.getResolverMethods(instance);

    await Promise.all(
      methods.map(async (key) => {
        try {
          const resolved = await (instance as any)[key]();
          const getChildType = fields[key];

          if (getChildType && resolved != null) {
            const ChildType = getChildType();

            if (Array.isArray(resolved)) {
              result[key] = await Promise.all(
                resolved.map((item) => this.resolve(ChildType, item))
              );
            } else {
              result[key] = await this.resolve(ChildType, resolved);
            }
          } else {
            result[key] = resolved;
          }
        } catch (error) {
          switch (this.options.onError) {
            case 'null':
              result[key] = null;
              break;
            case 'partial':
              result[key] = { __error: (error as Error).message };
              break;
            case 'throw':
            default:
              throw error;
          }
        }
      })
    );

    return result;
  }
}
```

---

## TypeScript Types

```typescript
interface TypeClass<T = any> {
  new (value: T): any;
  fields?: Record<string, () => TypeClass>;
}

// Infer result type from Type class
type ResolverMethod<T> = () => T | Promise<T>;

type TypeResult<T extends TypeClass> = {
  [K in keyof InstanceType<T> as InstanceType<T>[K] extends Function ? K : never]:
    InstanceType<T>[K] extends ResolverMethod<infer R>
      ? K extends keyof NonNullable<T['fields']>
        ? NonNullable<T['fields']>[K] extends () => infer ChildType
          ? ChildType extends TypeClass
            ? R extends any[]
              ? TypeResult<ChildType>[]
              : TypeResult<ChildType>
            : R
          : R
        : R
      : never;
};
```

---

## Tests

```typescript
describe('Executor', () => {
  beforeEach(() => {
    // Setup context in AsyncLocalStorage
    contextStorage.enterWith({
      loaders: createMockLoaders(),
      locale: 'en',
      currency: 'USD',
      imageSize: 'full',
    });
  });

  it('resolves scalar fields', async () => {
    class SimpleType {
      constructor(public value: { id: string; name: string }) {}
      id() { return this.value.id }
      name() { return this.value.name }
    }

    const result = await executor.resolve(SimpleType, { id: '1', name: 'Test' });

    expect(result).toEqual({ id: '1', name: 'Test' });
  });

  it('resolves nested types', async () => {
    class ChildType {
      constructor(public value: { id: string }) {}
      id() { return this.value.id }
    }

    class ParentType {
      static fields = { child: () => ChildType };
      constructor(public value: { id: string; child: { id: string } }) {}
      id() { return this.value.id }
      child() { return this.value.child }
    }

    const result = await executor.resolve(ParentType, {
      id: 'p1',
      child: { id: 'c1' }
    });

    expect(result).toEqual({ id: 'p1', child: { id: 'c1' } });
  });

  it('resolves arrays of nested types', async () => {
    class ItemType {
      constructor(public value: { id: string }) {}
      id() { return this.value.id }
    }

    class ListType {
      static fields = { items: () => ItemType };
      constructor(public value: { items: { id: string }[] }) {}
      items() { return this.value.items }
    }

    const result = await executor.resolve(ListType, {
      items: [{ id: '1' }, { id: '2' }]
    });

    expect(result).toEqual({ items: [{ id: '1' }, { id: '2' }] });
  });

  it('executes resolvers in parallel', async () => {
    const order: string[] = [];

    class ParallelType {
      constructor(public value: any) {}
      async a() { order.push('a-start'); await delay(50); order.push('a-end'); return 'a' }
      async b() { order.push('b-start'); await delay(30); order.push('b-end'); return 'b' }
    }

    await executor.resolve(ParallelType, {});

    expect(order[0]).toBe('a-start');
    expect(order[1]).toBe('b-start');
  });

  it('uses context from AsyncLocalStorage', async () => {
    class LocalizedType {
      constructor(public value: { translations: Record<string, string> }) {}
      title() {
        const { locale } = getContext();
        return this.value.translations[locale];
      }
    }

    const result = await executor.resolve(LocalizedType, {
      translations: { en: 'Hello', ru: 'Привет' }
    });

    expect(result).toEqual({ title: 'Hello' });
  });

  it('batches DataLoader calls', async () => {
    const batchFn = jest.fn(async (ids: string[]) => ids.map(id => ({ id })));
    const loader = new DataLoader(batchFn);

    contextStorage.enterWith({
      ...getContext(),
      loaders: { items: loader },
    });

    class ItemType {
      constructor(public value: { id: string }) {}
      id() { return this.value.id }
    }

    class RootType {
      static fields = { items: () => ItemType };
      constructor(public value: { ids: string[] }) {}
      async items() {
        const { loaders } = getContext();
        return Promise.all(this.value.ids.map(id => loaders.items.load(id)));
      }
    }

    await executor.resolve(RootType, { ids: ['1', '2', '3'] });

    expect(batchFn).toHaveBeenCalledTimes(1);
    expect(batchFn).toHaveBeenCalledWith(['1', '2', '3']);
  });
});
```
