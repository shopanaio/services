import { describe, it, expect, beforeEach, vi } from "vitest";
import { Executor, executor, createExecutor } from "./executor.js";
import { getContext, enterContext, type BaseContext } from "./context.js";
import { BaseType } from "./baseType.js";
import type { TypeClass } from "./types.js";

// Helper function for delays
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Mock DataLoader implementation
class MockDataLoader<K, V> {
  private batchFn: (keys: K[]) => Promise<V[]>;
  private batch: K[] = [];
  private batchPromise: Promise<V[]> | null = null;

  constructor(batchFn: (keys: K[]) => Promise<V[]>) {
    this.batchFn = batchFn;
  }

  async load(key: K): Promise<V> {
    const index = this.batch.length;
    this.batch.push(key);

    if (!this.batchPromise) {
      this.batchPromise = new Promise((resolve) => {
        queueMicrotask(async () => {
          const keys = [...this.batch];
          this.batch = [];
          this.batchPromise = null;
          resolve(await this.batchFn(keys));
        });
      });
    }

    const results = await this.batchPromise;
    return results[index];
  }
}

// Test context interface
interface TestContext extends BaseContext {
  locale: string;
  currency: string;
  imageSize: "thumb" | "full";
}

// Create a mock context for tests
function createMockContext(overrides: Partial<TestContext> = {}): TestContext {
  return {
    loaders: {},
    locale: "en",
    currency: "USD",
    imageSize: "full",
    ...overrides,
  };
}

describe("Executor", () => {
  beforeEach(() => {
    // Setup context in AsyncLocalStorage
    enterContext(createMockContext());
  });

  it("returns empty object when no fields requested", async () => {
    class SimpleType {
      constructor(public value: { id: string; name: string }) {}
      id() {
        return this.value.id;
      }
      name() {
        return this.value.name;
      }
    }

    const result = await executor.resolve(SimpleType, { id: "1", name: "Test" });

    expect(result).toEqual({});
  });

  it("resolves only requested scalar fields", async () => {
    class SimpleType {
      constructor(public value: { id: string; name: string }) {}
      id() {
        return this.value.id;
      }
      name() {
        return this.value.name;
      }
    }

    const result = await executor.resolve(SimpleType, { id: "1", name: "Test" }, {
      id: {},
      name: {},
    });

    expect(result).toEqual({ id: "1", name: "Test" });
  });

  it("resolves nested types", async () => {
    class ChildType {
      constructor(public value: { id: string }) {}
      id() {
        return this.value.id;
      }
    }

    class ParentType {
      static fields = { child: () => ChildType };
      constructor(public value: { id: string; child: { id: string } }) {}
      id() {
        return this.value.id;
      }
      child() {
        return this.value.child;
      }
    }

    const result = await executor.resolve(ParentType, {
      id: "p1",
      child: { id: "c1" },
    }, {
      id: {},
      child: { children: { id: {} } },
    });

    expect(result).toEqual({ id: "p1", child: { id: "c1" } });
  });

  it("resolves arrays of nested types", async () => {
    class ItemType {
      constructor(public value: { id: string }) {}
      id() {
        return this.value.id;
      }
    }

    class ListType {
      static fields = { items: () => ItemType };
      constructor(public value: { items: { id: string }[] }) {}
      items() {
        return this.value.items;
      }
    }

    const result = await executor.resolve(ListType, {
      items: [{ id: "1" }, { id: "2" }],
    }, {
      items: { children: { id: {} } },
    });

    expect(result).toEqual({ items: [{ id: "1" }, { id: "2" }] });
  });

  it("executes resolvers in parallel", async () => {
    const order: string[] = [];

    class ParallelType {
      constructor(public value: Record<string, never>) {}
      async a() {
        order.push("a-start");
        await delay(50);
        order.push("a-end");
        return "a";
      }
      async b() {
        order.push("b-start");
        await delay(30);
        order.push("b-end");
        return "b";
      }
    }

    await executor.resolve(ParallelType, {}, { a: {}, b: {} });

    // Both should start before either ends
    expect(order[0]).toBe("a-start");
    expect(order[1]).toBe("b-start");
  });

  it("uses context from AsyncLocalStorage", async () => {
    class LocalizedType {
      constructor(public value: { translations: Record<string, string> }) {}
      title() {
        const ctx = getContext<TestContext>();
        return this.value.translations[ctx.locale];
      }
    }

    const result = await executor.resolve(LocalizedType, {
      translations: { en: "Hello", ru: "Привет" },
    }, { title: {} });

    expect(result).toEqual({ title: "Hello" });
  });

  it("handles null values in nested types", async () => {
    class ChildType {
      constructor(public value: { id: string }) {}
      id() {
        return this.value.id;
      }
    }

    class ParentType {
      static fields = { child: () => ChildType };
      constructor(public value: { id: string }) {}
      id() {
        return this.value.id;
      }
      child() {
        return null;
      }
    }

    const result = await executor.resolve(ParentType, { id: "p1" }, {
      id: {},
      child: { children: { id: {} } },
    });

    expect(result).toEqual({ id: "p1", child: null });
  });

  it("handles undefined values in nested types", async () => {
    class ChildType {
      constructor(public value: { id: string }) {}
      id() {
        return this.value.id;
      }
    }

    class ParentType {
      static fields = { child: () => ChildType };
      constructor(public value: { id: string }) {}
      id() {
        return this.value.id;
      }
      child() {
        return undefined;
      }
    }

    const result = await executor.resolve(ParentType, { id: "p1" }, {
      id: {},
      child: { children: { id: {} } },
    });

    expect(result).toEqual({ id: "p1", child: undefined });
  });

  it("batches DataLoader calls", async () => {
    const batchFn = vi.fn(async (ids: string[]) => ids.map((id) => ({ id })));
    const loader = new MockDataLoader(batchFn);

    enterContext(
      createMockContext({
        loaders: { items: loader },
      })
    );

    class ItemType {
      constructor(public value: { id: string }) {}
      id() {
        return this.value.id;
      }
    }

    class RootType {
      static fields = { items: () => ItemType };
      constructor(public value: { ids: string[] }) {}
      async items() {
        const ctx = getContext<TestContext>();
        const itemLoader = ctx.loaders.items as MockDataLoader<string, { id: string }>;
        return Promise.all(this.value.ids.map((id) => itemLoader.load(id)));
      }
    }

    await executor.resolve(RootType, { ids: ["1", "2", "3"] }, {
      items: { children: { id: {} } },
    });

    expect(batchFn).toHaveBeenCalledTimes(1);
    expect(batchFn).toHaveBeenCalledWith(["1", "2", "3"]);
  });

  it("resolves many values at once", async () => {
    class SimpleType {
      constructor(public value: { id: string }) {}
      id() {
        return this.value.id;
      }
    }

    const result = await executor.resolveMany(SimpleType, [
      { id: "1" },
      { id: "2" },
      { id: "3" },
    ], { id: {} });

    expect(result).toEqual([{ id: "1" }, { id: "2" }, { id: "3" }]);
  });
});

describe("Executor error handling", () => {
  beforeEach(() => {
    enterContext(createMockContext());
  });

  it("throws errors by default", async () => {
    class ErrorType {
      constructor(public value: Record<string, never>) {}
      broken() {
        throw new Error("Something went wrong");
      }
    }

    await expect(executor.resolve(ErrorType, {}, { broken: {} })).rejects.toThrow(
      'Failed to resolve field "broken" on ErrorType'
    );
  });

  it("returns null on error with onError: null", async () => {
    const nullExecutor = createExecutor({ onError: "null" });

    class ErrorType {
      constructor(public value: Record<string, never>) {}
      working() {
        return "works";
      }
      broken() {
        throw new Error("Something went wrong");
      }
    }

    const result = await nullExecutor.resolve(ErrorType, {}, {
      working: {},
      broken: {},
    });

    expect(result).toEqual({ working: "works", broken: null });
  });

  it("returns partial error with onError: partial", async () => {
    const partialExecutor = createExecutor({ onError: "partial" });

    class ErrorType {
      constructor(public value: Record<string, never>) {}
      working() {
        return "works";
      }
      broken() {
        throw new Error("Something went wrong");
      }
    }

    const result = await partialExecutor.resolve(ErrorType, {}, {
      working: {},
      broken: {},
    });

    expect(result).toEqual({
      working: "works",
      broken: { __error: "Something went wrong" },
    });
  });
});

describe("BaseType", () => {
  beforeEach(() => {
    enterContext(createMockContext());
  });

  it("provides access to value via get method", async () => {
    interface Product {
      id: string;
      title: string;
    }

    class ProductType extends BaseType<Product> {
      id() {
        return this.get("id");
      }
      title() {
        return this.get("title");
      }
    }

    const result = await executor.resolve(ProductType, {
      id: "p1",
      title: "Test Product",
    }, { id: {}, title: {} });

    expect(result).toEqual({ id: "p1", title: "Test Product" });
  });

  it("provides access to context via ctx method", async () => {
    enterContext(createMockContext({ locale: "ru" }));

    interface LocalizedProduct {
      translations: Record<string, { title: string }>;
    }

    class LocalizedProductType extends BaseType<LocalizedProduct> {
      title() {
        const locale = this.ctx<TestContext>().locale;
        return this.value.translations[locale]?.title ?? "Untitled";
      }
    }

    const result = await executor.resolve(LocalizedProductType, {
      translations: {
        en: { title: "English Title" },
        ru: { title: "Русский заголовок" },
      },
    }, { title: {} });

    expect(result).toEqual({ title: "Русский заголовок" });
  });
});

describe("Complex nested resolution", () => {
  beforeEach(() => {
    enterContext(createMockContext());
  });

  it("resolves deeply nested types", async () => {
    class Level3Type {
      constructor(public value: { name: string }) {}
      name() {
        return this.value.name;
      }
    }

    class Level2Type {
      static fields = { level3: () => Level3Type };
      constructor(public value: { id: string; level3: { name: string } }) {}
      id() {
        return this.value.id;
      }
      level3() {
        return this.value.level3;
      }
    }

    class Level1Type {
      static fields = { level2: () => Level2Type };
      constructor(public value: { id: string; level2: { id: string; level3: { name: string } } }) {}
      id() {
        return this.value.id;
      }
      level2() {
        return this.value.level2;
      }
    }

    const result = await executor.resolve(Level1Type, {
      id: "l1",
      level2: {
        id: "l2",
        level3: { name: "deep" },
      },
    }, {
      id: {},
      level2: {
        children: {
          id: {},
          level3: {
            children: { name: {} },
          },
        },
      },
    });

    expect(result).toEqual({
      id: "l1",
      level2: {
        id: "l2",
        level3: { name: "deep" },
      },
    });
  });

  it("resolves arrays at multiple levels", async () => {
    class ImageType {
      constructor(public value: { url: string }) {}
      url() {
        return this.value.url;
      }
    }

    class VariantType {
      static fields = { images: () => ImageType };
      constructor(public value: { id: string; images: { url: string }[] }) {}
      id() {
        return this.value.id;
      }
      images() {
        return this.value.images;
      }
    }

    class ProductType {
      static fields = { variants: () => VariantType };
      constructor(
        public value: { id: string; variants: { id: string; images: { url: string }[] }[] }
      ) {}
      id() {
        return this.value.id;
      }
      variants() {
        return this.value.variants;
      }
    }

    const result = await executor.resolve(ProductType, {
      id: "p1",
      variants: [
        { id: "v1", images: [{ url: "img1.jpg" }, { url: "img2.jpg" }] },
        { id: "v2", images: [{ url: "img3.jpg" }] },
      ],
    }, {
      id: {},
      variants: {
        children: {
          id: {},
          images: {
            children: { url: {} },
          },
        },
      },
    });

    expect(result).toEqual({
      id: "p1",
      variants: [
        { id: "v1", images: [{ url: "img1.jpg" }, { url: "img2.jpg" }] },
        { id: "v2", images: [{ url: "img3.jpg" }] },
      ],
    });
  });
});

describe("Context management", () => {
  it("throws when context is not available", async () => {
    // No context set - use contextStorage.run with undefined to clear context
    const { contextStorage } = await import("./context.js");

    class ContextRequiredType {
      constructor(public value: Record<string, never>) {}
      needsContext() {
        return getContext<TestContext>().locale;
      }
    }

    // Create a new executor
    const exec = new Executor();

    // Run in a context where storage returns undefined
    await expect(
      contextStorage.run(undefined as unknown as BaseContext, async () => {
        return exec.resolve(ContextRequiredType, {}, { needsContext: {} });
      })
    ).rejects.toThrow('Failed to resolve field "needsContext" on ContextRequiredType');
  });
});

describe("Selective field resolution", () => {
  beforeEach(() => {
    enterContext(createMockContext());
  });

  it("resolves only requested fields", async () => {
    const idSpy = vi.fn().mockReturnValue("1");
    const nameSpy = vi.fn().mockReturnValue("Test");
    const priceSpy = vi.fn().mockReturnValue(100);

    class ProductType {
      constructor(public value: Record<string, never>) {}
      id() { return idSpy(); }
      name() { return nameSpy(); }
      price() { return priceSpy(); }
    }

    const result = await executor.resolve(ProductType, {}, {
      id: {},
      name: {},
    });

    expect(result).toEqual({ id: "1", name: "Test" });
    expect(idSpy).toHaveBeenCalled();
    expect(nameSpy).toHaveBeenCalled();
    expect(priceSpy).not.toHaveBeenCalled(); // price was not requested
  });

  it("passes args to resolver methods", async () => {
    const variantsSpy = vi.fn().mockReturnValue([{ id: "v1" }, { id: "v2" }]);

    class ProductType {
      constructor(public value: Record<string, never>) {}
      variants(args?: { first?: number }) {
        return variantsSpy(args);
      }
    }

    await executor.resolve(ProductType, {}, {
      variants: { args: { first: 5 } },
    });

    expect(variantsSpy).toHaveBeenCalledWith({ first: 5 });
  });
});

describe("Alias support", () => {
  beforeEach(() => {
    enterContext(createMockContext());
  });

  it("resolves aliased fields using fieldName", async () => {
    const variantsSpy = vi.fn().mockImplementation((args) => {
      return Array.from({ length: args?.first || 10 }, (_, i) => ({ id: `v${i + 1}` }));
    });

    class ProductType {
      constructor(public value: Record<string, never>) {}
      variants(args?: { first?: number }) {
        return variantsSpy(args);
      }
    }

    const result = await executor.resolve(ProductType, {}, {
      firstThree: { fieldName: "variants", args: { first: 3 } },
      firstFive: { fieldName: "variants", args: { first: 5 } },
    });

    expect(variantsSpy).toHaveBeenCalledTimes(2);
    expect(variantsSpy).toHaveBeenCalledWith({ first: 3 });
    expect(variantsSpy).toHaveBeenCalledWith({ first: 5 });

    expect(result.firstThree).toHaveLength(3);
    expect(result.firstFive).toHaveLength(5);
  });

  it("uses key as method name when fieldName not provided", async () => {
    class ProductType {
      constructor(public value: { id: string }) {}
      id() { return this.value.id; }
    }

    const result = await executor.resolve(ProductType, { id: "123" }, {
      id: {}, // no fieldName, so "id" is both alias and method name
    });

    expect(result).toEqual({ id: "123" });
  });

  it("resolves nested types with aliases", async () => {
    class VariantType {
      constructor(public value: { id: string; sku: string }) {}
      id() { return this.value.id; }
      sku() { return this.value.sku; }
    }

    class ProductType {
      static fields = { variants: () => VariantType };
      constructor(public value: { id: string }) {}
      id() { return this.value.id; }
      variants(args?: { first?: number }) {
        const count = args?.first || 2;
        return Array.from({ length: count }, (_, i) => ({
          id: `v${i + 1}`,
          sku: `SKU-${i + 1}`,
        }));
      }
    }

    const result = await executor.resolve(ProductType, { id: "p1" }, {
      id: {},
      topVariant: {
        fieldName: "variants",
        args: { first: 1 },
        children: {
          sku: {},
        },
      },
    });

    expect(result.id).toBe("p1");
    expect(result.topVariant).toHaveLength(1);
    expect(result.topVariant[0]).toEqual({ sku: "SKU-1" });
  });

  it("handles multiple aliases for same field with different args and children", async () => {
    class VariantType {
      constructor(public value: { id: string; sku: string; price: number }) {}
      id() { return this.value.id; }
      sku() { return this.value.sku; }
      price() { return this.value.price; }
    }

    class ProductType {
      static fields = { variants: () => VariantType };
      constructor(public value: Record<string, never>) {}
      variants(args?: { first?: number }) {
        const count = args?.first || 10;
        return Array.from({ length: count }, (_, i) => ({
          id: `v${i + 1}`,
          sku: `SKU-${i + 1}`,
          price: (i + 1) * 100,
        }));
      }
    }

    const result = await executor.resolve(ProductType, {}, {
      // First alias: get 2 variants, only sku
      preview: {
        fieldName: "variants",
        args: { first: 2 },
        children: { sku: {} },
      },
      // Second alias: get 5 variants, sku and price
      detailed: {
        fieldName: "variants",
        args: { first: 5 },
        children: { sku: {}, price: {} },
      },
    });

    expect(result.preview).toHaveLength(2);
    expect(result.preview[0]).toEqual({ sku: "SKU-1" });
    expect(result.preview[0]).not.toHaveProperty("price");

    expect(result.detailed).toHaveLength(5);
    expect(result.detailed[0]).toEqual({ sku: "SKU-1", price: 100 });
  });
});
