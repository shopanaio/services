import { describe, it, expect, vi } from "vitest";
import {
  Executor,
  ResolverError,
  createExecutor,
  load,
  loadMany,
} from "./executor.js";
import { BaseType } from "./baseType.js";

// Helper function for delays
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("Executor", () => {
  describe("load() with QueryArgs", () => {
    it("resolves all fields when query is undefined", async () => {
      class SimpleType {
        constructor(
          public value: { id: string; name: string },
          public ctx: unknown
        ) {}
        id() {
          return this.value.id;
        }
        name() {
          return this.value.name;
        }
      }

      const executor = new Executor();
      const result = await executor.load(SimpleType, { id: "1", name: "Test" });

      expect(result).toEqual({ id: "1", name: "Test" });
    });

    it("resolves only scalar fields from fields array", async () => {
      class SimpleType {
        constructor(
          public value: { id: string; name: string; extra: string },
          public ctx: unknown
        ) {}
        id() {
          return this.value.id;
        }
        name() {
          return this.value.name;
        }
        extra() {
          return this.value.extra;
        }
      }

      const executor = new Executor();
      const result = await executor.load(
        SimpleType,
        { id: "1", name: "Test", extra: "ignored" },
        { fields: ["id", "name"] }
      );

      expect(result).toEqual({ id: "1", name: "Test" });
      expect(result).not.toHaveProperty("extra");
    });

    it("resolves nested types via populate", async () => {
      class ChildType {
        constructor(public value: { id: string }, public ctx: unknown) {}
        id() {
          return this.value.id;
        }
      }

      class ParentType {
        static fields = { child: () => ChildType };
        constructor(
          public value: { id: string; child: { id: string } },
          public ctx: unknown
        ) {}
        id() {
          return this.value.id;
        }
        child() {
          return this.value.child;
        }
      }

      const executor = new Executor();
      const result = await executor.load(
        ParentType,
        { id: "p1", child: { id: "c1" } },
        {
          fields: ["id"],
          populate: {
            child: { fields: ["id"] },
          },
        }
      );

      expect(result).toEqual({ id: "p1", child: { id: "c1" } });
    });

    it("resolves arrays of nested types", async () => {
      class ItemType {
        constructor(public value: { id: string }, public ctx: unknown) {}
        id() {
          return this.value.id;
        }
      }

      class ListType {
        static fields = { items: () => ItemType };
        constructor(
          public value: { items: { id: string }[] },
          public ctx: unknown
        ) {}
        items() {
          return this.value.items;
        }
      }

      const executor = new Executor();
      const result = await executor.load(
        ListType,
        { items: [{ id: "1" }, { id: "2" }] },
        {
          populate: {
            items: { fields: ["id"] },
          },
        }
      );

      expect(result).toEqual({ items: [{ id: "1" }, { id: "2" }] });
    });

    it("passes args to resolver methods", async () => {
      class ProductType {
        constructor(public value: Record<string, never>, public ctx: unknown) {}
        variants(args?: { first?: number }) {
          const all = [{ id: "v1" }, { id: "v2" }, { id: "v3" }];
          return args?.first ? all.slice(0, args.first) : all;
        }
      }

      const executor = new Executor();
      const result = await executor.load(ProductType, {}, {
        populate: {
          variants: { args: { first: 2 } },
        },
      });

      expect(result.variants).toEqual([{ id: "v1" }, { id: "v2" }]);
    });

    it("supports aliases with fieldName", async () => {
      class ProductType {
        constructor(public value: Record<string, never>, public ctx: unknown) {}
        variants(args?: { first?: number }) {
          const all = [{ id: "v1" }, { id: "v2" }, { id: "v3" }, { id: "v4" }, { id: "v5" }];
          return args?.first ? all.slice(0, args.first) : all;
        }
      }

      const executor = new Executor();
      const result = await executor.load(ProductType, {}, {
        populate: {
          firstTwo: { fieldName: "variants", args: { first: 2 } },
          firstFour: { fieldName: "variants", args: { first: 4 } },
        },
      });

      expect(result.firstTwo).toHaveLength(2);
      expect(result.firstFour).toHaveLength(4);
    });

    it("executes resolvers in parallel", async () => {
      const order: string[] = [];

      class ParallelType {
        constructor(public value: Record<string, never>, public ctx: unknown) {}
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

      const executor = new Executor();
      await executor.load(ParallelType, {}, { fields: ["a", "b"] });

      // Both should start before either ends
      expect(order[0]).toBe("a-start");
      expect(order[1]).toBe("b-start");
    });

    it("handles null values in nested types", async () => {
      class ChildType {
        constructor(public value: { id: string }, public ctx: unknown) {}
        id() {
          return this.value.id;
        }
      }

      class ParentType {
        static fields = { child: () => ChildType };
        constructor(public value: { id: string }, public ctx: unknown) {}
        id() {
          return this.value.id;
        }
        child() {
          return null;
        }
      }

      const executor = new Executor();
      const result = await executor.load(ParentType, { id: "p1" }, {
        fields: ["id"],
        populate: {
          child: { fields: ["id"] },
        },
      });

      expect(result).toEqual({ id: "p1", child: null });
    });

    it("handles undefined values in nested types", async () => {
      class ChildType {
        constructor(public value: { id: string }, public ctx: unknown) {}
        id() {
          return this.value.id;
        }
      }

      class ParentType {
        static fields = { child: () => ChildType };
        constructor(public value: { id: string }, public ctx: unknown) {}
        id() {
          return this.value.id;
        }
        child() {
          return undefined;
        }
      }

      const executor = new Executor();
      const result = await executor.load(ParentType, { id: "p1" }, {
        fields: ["id"],
        populate: {
          child: { fields: ["id"] },
        },
      });

      expect(result).toEqual({ id: "p1", child: undefined });
    });

    it("returns null when loadData returns null", async () => {
      class TypeWithNullData {
        constructor(public value: string, public ctx: unknown) {}
        loadData() {
          return null;
        }
        id() {
          return this.value;
        }
      }

      const executor = new Executor();
      const result = await executor.load(TypeWithNullData, "not-found");

      expect(result).toBeNull();
    });

    it("returns null when loadData returns undefined", async () => {
      class TypeWithUndefinedData {
        constructor(public value: string, public ctx: unknown) {}
        loadData() {
          return undefined;
        }
        id() {
          return this.value;
        }
      }

      const executor = new Executor();
      const result = await executor.load(TypeWithUndefinedData, "not-found");

      expect(result).toBeNull();
    });
  });

  describe("loadMany()", () => {
    it("resolves multiple values", async () => {
      class SimpleType {
        constructor(public value: { id: string }, public ctx: unknown) {}
        id() {
          return this.value.id;
        }
      }

      const executor = new Executor();
      const result = await executor.loadMany(
        SimpleType,
        [{ id: "1" }, { id: "2" }, { id: "3" }],
        { fields: ["id"] }
      );

      expect(result).toEqual([{ id: "1" }, { id: "2" }, { id: "3" }]);
    });
  });

  describe("error handling", () => {
    it("throws ResolverError by default", async () => {
      class ErrorType {
        constructor(public value: Record<string, never>, public ctx: unknown) {}
        broken() {
          throw new Error("Something went wrong");
        }
      }

      const executor = new Executor();
      await expect(
        executor.load(ErrorType, {}, { fields: ["broken"] })
      ).rejects.toThrow('Failed to resolve field "broken" on ErrorType');
    });

    it("returns null on error with onError: null", async () => {
      class ErrorType {
        constructor(public value: Record<string, never>, public ctx: unknown) {}
        working() {
          return "works";
        }
        broken() {
          throw new Error("Something went wrong");
        }
      }

      const executor = createExecutor({ onError: "null" });
      const result = await executor.load(ErrorType, {}, {
        fields: ["working", "broken"],
      });

      expect(result).toEqual({ working: "works", broken: null });
    });

    it("returns partial error with onError: partial", async () => {
      class ErrorType {
        constructor(public value: Record<string, never>, public ctx: unknown) {}
        working() {
          return "works";
        }
        broken() {
          throw new Error("Something went wrong");
        }
      }

      const executor = createExecutor({ onError: "partial" });
      const result = await executor.load(ErrorType, {}, {
        fields: ["working", "broken"],
      });

      expect(result).toEqual({
        working: "works",
        broken: { __error: "Something went wrong" },
      });
    });
  });

  describe("context", () => {
    it("passes context to type instances", async () => {
      const ctx = { userId: "user-123", tenant: "acme" };

      class ContextAwareType {
        constructor(public value: string, public ctx: typeof ctx) {}
        userId() {
          return this.ctx.userId;
        }
        tenant() {
          return this.ctx.tenant;
        }
      }

      const executor = new Executor({ ctx });
      const result = await executor.load(ContextAwareType, "test", {
        fields: ["userId", "tenant"],
      });

      expect(result).toEqual({
        userId: "user-123",
        tenant: "acme",
      });
    });
  });
});

describe("BaseType", () => {
  it("provides access to value via get method", async () => {
    interface Product {
      id: string;
      title: string;
    }

    class ProductType extends BaseType<Product, Product, unknown> {
      id() {
        return this.get("id");
      }
      title() {
        return this.get("title");
      }
    }

    const executor = new Executor();
    const result = await executor.load(
      ProductType,
      { id: "p1", title: "Test Product" },
      { fields: ["id", "title"] }
    );

    expect(result).toEqual({ id: "p1", title: "Test Product" });
  });

  it("supports lazy data loading via loadData", async () => {
    const loadSpy = vi
      .fn()
      .mockResolvedValue({ id: "loaded-1", name: "Loaded Product" });

    class ProductType extends BaseType<
      string,
      { id: string; name: string },
      unknown
    > {
      protected loadData() {
        return loadSpy(this.value);
      }
      id() {
        return this.get("id");
      }
      name() {
        return this.get("name");
      }
    }

    const executor = new Executor();
    const result = await executor.load(ProductType, "product-id", {
      fields: ["id", "name"],
    });

    expect(loadSpy).toHaveBeenCalledWith("product-id");
    expect(result).toEqual({ id: "loaded-1", name: "Loaded Product" });
  });

  it("caches loadData result across multiple field accesses", async () => {
    let loadCount = 0;

    class ProductType extends BaseType<
      string,
      { id: string; name: string; price: number },
      unknown
    > {
      protected loadData() {
        loadCount++;
        return Promise.resolve({ id: "1", name: "Test", price: 100 });
      }
      id() {
        return this.get("id");
      }
      name() {
        return this.get("name");
      }
      price() {
        return this.get("price");
      }
    }

    const executor = new Executor();
    const result = await executor.load(ProductType, "product-id", {
      fields: ["id", "name", "price"],
    });

    // loadData is called once by Executor to check for null, and once by BaseType.data getter
    // But BaseType caches it internally via _dataPromise, so subsequent get() calls don't reload
    // The important thing is that we get the correct result
    expect(result).toEqual({ id: "1", name: "Test", price: 100 });
    // loadData may be called twice (once in Executor for null check, once in BaseType.data)
    // but the data getter in BaseType caches, so all field accesses share the same promise
    expect(loadCount).toBeLessThanOrEqual(2);
  });

  it("static load() works correctly", async () => {
    class SimpleType extends BaseType<{ id: string }, { id: string }, unknown> {
      id() {
        return this.get("id");
      }
    }

    const result = await SimpleType.load({ id: "123" }, { fields: ["id"] }, {});

    expect(result).toEqual({ id: "123" });
  });

  it("static loadMany() works correctly", async () => {
    class SimpleType extends BaseType<{ id: string }, { id: string }, unknown> {
      id() {
        return this.get("id");
      }
    }

    const result = await SimpleType.loadMany(
      [{ id: "1" }, { id: "2" }],
      { fields: ["id"] },
      {}
    );

    expect(result).toEqual([{ id: "1" }, { id: "2" }]);
  });
});

describe("Complex nested resolution", () => {
  it("resolves deeply nested types (3+ levels)", async () => {
    class Level3Type {
      constructor(public value: { name: string }, public ctx: unknown) {}
      name() {
        return this.value.name;
      }
    }

    class Level2Type {
      static fields = { level3: () => Level3Type };
      constructor(
        public value: { id: string; level3: { name: string } },
        public ctx: unknown
      ) {}
      id() {
        return this.value.id;
      }
      level3() {
        return this.value.level3;
      }
    }

    class Level1Type {
      static fields = { level2: () => Level2Type };
      constructor(
        public value: {
          id: string;
          level2: { id: string; level3: { name: string } };
        },
        public ctx: unknown
      ) {}
      id() {
        return this.value.id;
      }
      level2() {
        return this.value.level2;
      }
    }

    const executor = new Executor();
    const result = await executor.load(
      Level1Type,
      {
        id: "l1",
        level2: {
          id: "l2",
          level3: { name: "deep" },
        },
      },
      {
        fields: ["id"],
        populate: {
          level2: {
            fields: ["id"],
            populate: {
              level3: {
                fields: ["name"],
              },
            },
          },
        },
      }
    );

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
      constructor(public value: { url: string }, public ctx: unknown) {}
      url() {
        return this.value.url;
      }
    }

    class VariantType {
      static fields = { images: () => ImageType };
      constructor(
        public value: { id: string; images: { url: string }[] },
        public ctx: unknown
      ) {}
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
        public value: {
          id: string;
          variants: { id: string; images: { url: string }[] }[];
        },
        public ctx: unknown
      ) {}
      id() {
        return this.value.id;
      }
      variants() {
        return this.value.variants;
      }
    }

    const executor = new Executor();
    const result = await executor.load(
      ProductType,
      {
        id: "p1",
        variants: [
          { id: "v1", images: [{ url: "img1.jpg" }, { url: "img2.jpg" }] },
          { id: "v2", images: [{ url: "img3.jpg" }] },
        ],
      },
      {
        fields: ["id"],
        populate: {
          variants: {
            fields: ["id"],
            populate: {
              images: {
                fields: ["url"],
              },
            },
          },
        },
      }
    );

    expect(result).toEqual({
      id: "p1",
      variants: [
        { id: "v1", images: [{ url: "img1.jpg" }, { url: "img2.jpg" }] },
        { id: "v2", images: [{ url: "img3.jpg" }] },
      ],
    });
  });
});

describe("Selective field resolution", () => {
  it("resolves only requested fields", async () => {
    const idSpy = vi.fn().mockReturnValue("1");
    const nameSpy = vi.fn().mockReturnValue("Test");
    const priceSpy = vi.fn().mockReturnValue(100);

    class ProductType {
      constructor(public value: Record<string, never>, public ctx: unknown) {}
      id() {
        return idSpy();
      }
      name() {
        return nameSpy();
      }
      price() {
        return priceSpy();
      }
    }

    const executor = new Executor();
    const result = await executor.load(ProductType, {}, {
      fields: ["id", "name"],
    });

    expect(result).toEqual({ id: "1", name: "Test" });
    expect(idSpy).toHaveBeenCalled();
    expect(nameSpy).toHaveBeenCalled();
    expect(priceSpy).not.toHaveBeenCalled(); // price was not requested
  });
});

describe("Alias support with nested types", () => {
  it("resolves nested types with aliases", async () => {
    class VariantType {
      constructor(
        public value: { id: string; sku: string },
        public ctx: unknown
      ) {}
      id() {
        return this.value.id;
      }
      sku() {
        return this.value.sku;
      }
    }

    class ProductType {
      static fields = { variants: () => VariantType };
      constructor(public value: { id: string }, public ctx: unknown) {}
      id() {
        return this.value.id;
      }
      variants(args?: { first?: number }) {
        const count = args?.first || 2;
        return Array.from({ length: count }, (_, i) => ({
          id: `v${i + 1}`,
          sku: `SKU-${i + 1}`,
        }));
      }
    }

    const executor = new Executor();
    const result = await executor.load(ProductType, { id: "p1" }, {
      fields: ["id"],
      populate: {
        topVariant: {
          fieldName: "variants",
          args: { first: 1 },
          fields: ["sku"],
        },
      },
    });

    expect(result.id).toBe("p1");
    expect(result.topVariant).toHaveLength(1);
    expect(result.topVariant[0]).toEqual({ sku: "SKU-1" });
  });

  it("handles multiple aliases for same field with different args and fields", async () => {
    class VariantType {
      constructor(
        public value: { id: string; sku: string; price: number },
        public ctx: unknown
      ) {}
      id() {
        return this.value.id;
      }
      sku() {
        return this.value.sku;
      }
      price() {
        return this.value.price;
      }
    }

    class ProductType {
      static fields = { variants: () => VariantType };
      constructor(public value: Record<string, never>, public ctx: unknown) {}
      variants(args?: { first?: number }) {
        const count = args?.first || 10;
        return Array.from({ length: count }, (_, i) => ({
          id: `v${i + 1}`,
          sku: `SKU-${i + 1}`,
          price: (i + 1) * 100,
        }));
      }
    }

    const executor = new Executor();
    const result = await executor.load(ProductType, {}, {
      populate: {
        // First alias: get 2 variants, only sku
        preview: {
          fieldName: "variants",
          args: { first: 2 },
          fields: ["sku"],
        },
        // Second alias: get 5 variants, sku and price
        detailed: {
          fieldName: "variants",
          args: { first: 5 },
          fields: ["sku", "price"],
        },
      },
    });

    expect(result.preview).toHaveLength(2);
    expect(result.preview[0]).toEqual({ sku: "SKU-1" });
    expect(result.preview[0]).not.toHaveProperty("price");

    expect(result.detailed).toHaveLength(5);
    expect(result.detailed[0]).toEqual({ sku: "SKU-1", price: 100 });
  });
});

describe("load() and loadMany() functions", () => {
  it("load() works with context", async () => {
    class SimpleType {
      constructor(public value: { id: string }, public ctx: { test: boolean }) {}
      id() {
        return this.value.id;
      }
      hasContext() {
        return this.ctx.test;
      }
    }

    const result = await load(
      SimpleType,
      { id: "123" },
      { fields: ["id", "hasContext"] },
      { test: true }
    );

    expect(result).toEqual({ id: "123", hasContext: true });
  });

  it("loadMany() works with context", async () => {
    class SimpleType {
      constructor(public value: { id: string }, public ctx: unknown) {}
      id() {
        return this.value.id;
      }
    }

    const result = await loadMany(
      SimpleType,
      [{ id: "1" }, { id: "2" }],
      { fields: ["id"] },
      {}
    );

    expect(result).toEqual([{ id: "1" }, { id: "2" }]);
  });
});

describe("ResolverError", () => {
  it("contains field and type information", () => {
    const originalError = new Error("Original error");
    const error = new ResolverError("Test error", {
      field: "testField",
      type: "TestType",
      cause: originalError,
    });

    expect(error.message).toBe("Test error");
    expect(error.field).toBe("testField");
    expect(error.type).toBe("TestType");
    expect(error.originalError).toBe(originalError);
    expect(error.name).toBe("ResolverError");
  });
});
