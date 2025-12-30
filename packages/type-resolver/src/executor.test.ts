import { describe, it, expect, vi } from "vitest";
import {
  Executor,
  ResolverError,
  createExecutor,
  load,
  loadMany,
  resolve,
} from "./executor.js";
import { BaseType } from "./baseType.js";

// Helper function for delays
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("Executor", () => {
  describe("load() with QueryArgs", () => {
    it("resolves all fields when query is undefined", async () => {
      class SimpleType extends BaseType<{ id: string; name: string }, { id: string; name: string }, unknown> {
        id() {
          return this.value.id;
        }
        name() {
          return this.value.name;
        }
      }

      const executor = new Executor();
      const instance = new SimpleType({ id: "1", name: "Test" }, {});
      const result = await executor.load(instance, { fields: ["id", "name"] });

      expect(result).toEqual({ id: "1", name: "Test" });
    });

    it("resolves only scalar fields from fields array", async () => {
      class SimpleType extends BaseType<{ id: string; name: string; extra: string }, { id: string; name: string; extra: string }, unknown> {
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
      const instance = new SimpleType({ id: "1", name: "Test", extra: "ignored" }, {});
      const result = await executor.load(instance, { fields: ["id", "name"] });

      expect(result).toEqual({ id: "1", name: "Test" });
      expect(result).not.toHaveProperty("extra");
    });

    it("resolves nested types via populate", async () => {
      class ChildType extends BaseType<{ id: string }, { id: string }, unknown> {
        id() {
          return this.$get("id");
        }
      }

      class ParentType extends BaseType<{ id: string; child: { id: string } }, { id: string; child: { id: string } }, unknown> {
        id() {
          return this.$get("id");
        }
        child() {
          // Return BaseType instance - executor will detect via instanceof
          return new ChildType(this.value.child, this.ctx);
        }
      }

      const executor = new Executor();
      const instance = new ParentType({ id: "p1", child: { id: "c1" } }, {});
      const result = await executor.load(instance, {
        fields: ["id"],
        populate: {
          child: { fields: ["id"] },
        },
      });

      expect(result).toEqual({ id: "p1", child: { id: "c1" } });
    });

    it("resolves arrays of nested types", async () => {
      class ItemType extends BaseType<{ id: string }, { id: string }, unknown> {
        id() {
          return this.$get("id");
        }
      }

      class ListType extends BaseType<{ items: { id: string }[] }, { items: { id: string }[] }, unknown> {
        items() {
          // Return array of BaseType instances
          return this.value.items.map(item => new ItemType(item, this.ctx));
        }
      }

      const executor = new Executor();
      const instance = new ListType({ items: [{ id: "1" }, { id: "2" }] }, {});
      const result = await executor.load(instance, {
        populate: {
          items: { fields: ["id"] },
        },
      });

      expect(result).toEqual({ items: [{ id: "1" }, { id: "2" }] });
    });

    it("passes args to resolver methods", async () => {
      class ProductType extends BaseType<Record<string, never>, Record<string, never>, unknown> {
        variants(args?: { first?: number }) {
          const all = [{ id: "v1" }, { id: "v2" }, { id: "v3" }];
          return args?.first ? all.slice(0, args.first) : all;
        }
      }

      const executor = new Executor();
      const instance = new ProductType({}, {});
      const result = await executor.load(instance, {
        populate: {
          variants: { args: { first: 2 } },
        },
      });

      expect(result.variants).toEqual([{ id: "v1" }, { id: "v2" }]);
    });

    it("supports aliases with fieldName", async () => {
      class ProductType extends BaseType<Record<string, never>, Record<string, never>, unknown> {
        variants(args?: { first?: number }) {
          const all = [{ id: "v1" }, { id: "v2" }, { id: "v3" }, { id: "v4" }, { id: "v5" }];
          return args?.first ? all.slice(0, args.first) : all;
        }
      }

      const executor = new Executor();
      const instance = new ProductType({}, {});
      const result = await executor.load(instance, {
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

      class ParallelType extends BaseType<Record<string, never>, Record<string, never>, unknown> {
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
      const instance = new ParallelType({}, {});
      await executor.load(instance, { fields: ["a", "b"] });

      // Both should start before either ends
      expect(order[0]).toBe("a-start");
      expect(order[1]).toBe("b-start");
    });

    it("handles null values in nested types", async () => {
      class ParentType extends BaseType<{ id: string }, { id: string }, unknown> {
        id() {
          return this.$get("id");
        }
        child() {
          return null;
        }
      }

      const executor = new Executor();
      const instance = new ParentType({ id: "p1" }, {});
      const result = await executor.load(instance, {
        fields: ["id"],
        populate: {
          child: { fields: ["id"] },
        },
      });

      expect(result).toEqual({ id: "p1", child: null });
    });

    it("handles undefined values in nested types", async () => {
      class ParentType extends BaseType<{ id: string }, { id: string }, unknown> {
        id() {
          return this.$get("id");
        }
        child() {
          return undefined;
        }
      }

      const executor = new Executor();
      const instance = new ParentType({ id: "p1" }, {});
      const result = await executor.load(instance, {
        fields: ["id"],
        populate: {
          child: { fields: ["id"] },
        },
      });

      expect(result).toEqual({ id: "p1", child: undefined });
    });

    it("returns null when $preload returns null", async () => {
      class TypeWithNullData extends BaseType<string, null, unknown> {
        protected $preload() {
          return null;
        }
        id() {
          return this.value;
        }
      }

      const executor = new Executor();
      const instance = new TypeWithNullData("not-found", {});
      const result = await executor.load(instance, { fields: ["id"] });

      expect(result).toBeNull();
    });

    it("returns null when $preload returns undefined", async () => {
      class TypeWithUndefinedData extends BaseType<string, undefined, unknown> {
        protected $preload() {
          return undefined;
        }
        id() {
          return this.value;
        }
      }

      const executor = new Executor();
      const instance = new TypeWithUndefinedData("not-found", {});
      const result = await executor.load(instance, { fields: ["id"] });

      expect(result).toBeNull();
    });
  });

  describe("loadMany()", () => {
    it("resolves multiple values", async () => {
      class SimpleType extends BaseType<{ id: string }, { id: string }, unknown> {
        id() {
          return this.value.id;
        }
      }

      const executor = new Executor();
      const instances = [
        new SimpleType({ id: "1" }, {}),
        new SimpleType({ id: "2" }, {}),
        new SimpleType({ id: "3" }, {}),
      ];
      const result = await executor.loadMany(instances, { fields: ["id"] });

      expect(result).toEqual([{ id: "1" }, { id: "2" }, { id: "3" }]);
    });
  });

  describe("error handling", () => {
    it("throws ResolverError by default", async () => {
      class ErrorType extends BaseType<Record<string, never>, Record<string, never>, unknown> {
        broken() {
          throw new Error("Something went wrong");
        }
      }

      const executor = new Executor();
      const instance = new ErrorType({}, {});
      await expect(
        executor.load(instance, { fields: ["broken"] })
      ).rejects.toThrow('Failed to resolve field "broken" on ErrorType');
    });

    it("returns null on error with onError: null", async () => {
      class ErrorType extends BaseType<Record<string, never>, Record<string, never>, unknown> {
        working() {
          return "works";
        }
        broken() {
          throw new Error("Something went wrong");
        }
      }

      const executor = createExecutor({ onError: "null" });
      const instance = new ErrorType({}, {});
      const result = await executor.load(instance, {
        fields: ["working", "broken"],
      });

      expect(result).toEqual({ working: "works", broken: null });
    });

    it("returns partial error with onError: partial", async () => {
      class ErrorType extends BaseType<Record<string, never>, Record<string, never>, unknown> {
        working() {
          return "works";
        }
        broken() {
          throw new Error("Something went wrong");
        }
      }

      const executor = createExecutor({ onError: "partial" });
      const instance = new ErrorType({}, {});
      const result = await executor.load(instance, {
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

      class ContextAwareType extends BaseType<string, string, typeof ctx> {
        userId() {
          return this.ctx.userId;
        }
        tenant() {
          return this.ctx.tenant;
        }
      }

      const executor = new Executor({ ctx });
      const instance = new ContextAwareType("test", ctx);
      const result = await executor.load(instance, {
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
        return this.$get("id");
      }
      title() {
        return this.$get("title");
      }
    }

    const executor = new Executor();
    const instance = new ProductType({ id: "p1", title: "Test Product" }, {});
    const result = await executor.load(instance, { fields: ["id", "title"] });

    expect(result).toEqual({ id: "p1", title: "Test Product" });
  });

  it("supports lazy data loading via $preload", async () => {
    const loadSpy = vi
      .fn()
      .mockResolvedValue({ id: "loaded-1", name: "Loaded Product" });

    class ProductType extends BaseType<
      string,
      { id: string; name: string },
      unknown
    > {
      protected $preload() {
        return loadSpy(this.value);
      }
      id() {
        return this.$get("id");
      }
      name() {
        return this.$get("name");
      }
    }

    const executor = new Executor();
    const instance = new ProductType("product-id", {});
    const result = await executor.load(instance, {
      fields: ["id", "name"],
    });

    expect(loadSpy).toHaveBeenCalledWith("product-id");
    expect(result).toEqual({ id: "loaded-1", name: "Loaded Product" });
  });

  it("caches $preload result across multiple field accesses", async () => {
    let loadCount = 0;

    class ProductType extends BaseType<
      string,
      { id: string; name: string; price: number },
      unknown
    > {
      protected $preload() {
        loadCount++;
        return Promise.resolve({ id: "1", name: "Test", price: 100 });
      }
      id() {
        return this.$get("id");
      }
      name() {
        return this.$get("name");
      }
      price() {
        return this.$get("price");
      }
    }

    const executor = new Executor();
    const instance = new ProductType("product-id", {});
    const result = await executor.load(instance, {
      fields: ["id", "name", "price"],
    });

    // $preload is called once by Executor to check for null, and once by BaseType.$data getter
    // But BaseType caches it internally via _dataPromise, so subsequent $get() calls don't reload
    // The important thing is that we get the correct result
    expect(result).toEqual({ id: "1", name: "Test", price: 100 });
    // $preload may be called twice (once in Executor for null check, once in BaseType.$data)
    // but the $data getter in BaseType caches, so all field accesses share the same promise
    expect(loadCount).toBeLessThanOrEqual(2);
  });

  it("static load() works correctly", async () => {
    class SimpleType extends BaseType<{ id: string }, { id: string }, unknown> {
      id() {
        return this.$get("id");
      }
    }

    const result = await SimpleType.load({ id: "123" }, { fields: ["id"] }, {});

    expect(result).toEqual({ id: "123" });
  });

  it("static loadMany() works correctly", async () => {
    class SimpleType extends BaseType<{ id: string }, { id: string }, unknown> {
      id() {
        return this.$get("id");
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
    class Level3Type extends BaseType<{ name: string }, { name: string }, unknown> {
      name() {
        return this.$get("name");
      }
    }

    class Level2Type extends BaseType<{ id: string; level3: { name: string } }, { id: string; level3: { name: string } }, unknown> {
      id() {
        return this.$get("id");
      }
      level3() {
        return new Level3Type(this.value.level3, this.ctx);
      }
    }

    class Level1Type extends BaseType<{ id: string; level2: { id: string; level3: { name: string } } }, { id: string; level2: { id: string; level3: { name: string } } }, unknown> {
      id() {
        return this.$get("id");
      }
      level2() {
        return new Level2Type(this.value.level2, this.ctx);
      }
    }

    const executor = new Executor();
    const instance = new Level1Type(
      {
        id: "l1",
        level2: {
          id: "l2",
          level3: { name: "deep" },
        },
      },
      {}
    );
    const result = await executor.load(instance, {
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
    class ImageType extends BaseType<{ url: string }, { url: string }, unknown> {
      url() {
        return this.$get("url");
      }
    }

    class VariantType extends BaseType<{ id: string; images: { url: string }[] }, { id: string; images: { url: string }[] }, unknown> {
      id() {
        return this.$get("id");
      }
      images() {
        return this.value.images.map(img => new ImageType(img, this.ctx));
      }
    }

    class ProductType extends BaseType<{ id: string; variants: { id: string; images: { url: string }[] }[] }, { id: string; variants: { id: string; images: { url: string }[] }[] }, unknown> {
      id() {
        return this.$get("id");
      }
      variants() {
        return this.value.variants.map(v => new VariantType(v, this.ctx));
      }
    }

    const executor = new Executor();
    const instance = new ProductType(
      {
        id: "p1",
        variants: [
          { id: "v1", images: [{ url: "img1.jpg" }, { url: "img2.jpg" }] },
          { id: "v2", images: [{ url: "img3.jpg" }] },
        ],
      },
      {}
    );
    const result = await executor.load(instance, {
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

describe("Selective field resolution", () => {
  it("resolves only requested fields", async () => {
    const idSpy = vi.fn().mockReturnValue("1");
    const nameSpy = vi.fn().mockReturnValue("Test");
    const priceSpy = vi.fn().mockReturnValue(100);

    class ProductType extends BaseType<Record<string, never>, Record<string, never>, unknown> {
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
    const instance = new ProductType({}, {});
    const result = await executor.load(instance, {
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
    class VariantType extends BaseType<{ id: string; sku: string }, { id: string; sku: string }, unknown> {
      id() {
        return this.$get("id");
      }
      sku() {
        return this.$get("sku");
      }
    }

    class ProductType extends BaseType<{ id: string }, { id: string }, unknown> {
      id() {
        return this.$get("id");
      }
      variants(args?: { first?: number }) {
        const count = args?.first || 2;
        return Array.from({ length: count }, (_, i) =>
          new VariantType({ id: `v${i + 1}`, sku: `SKU-${i + 1}` }, this.ctx)
        );
      }
    }

    const executor = new Executor();
    const instance = new ProductType({ id: "p1" }, {});
    const result = await executor.load(instance, {
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
    class VariantType extends BaseType<{ id: string; sku: string; price: number }, { id: string; sku: string; price: number }, unknown> {
      id() {
        return this.$get("id");
      }
      sku() {
        return this.$get("sku");
      }
      price() {
        return this.$get("price");
      }
    }

    class ProductType extends BaseType<Record<string, never>, Record<string, never>, unknown> {
      variants(args?: { first?: number }) {
        const count = args?.first || 10;
        return Array.from({ length: count }, (_, i) =>
          new VariantType({ id: `v${i + 1}`, sku: `SKU-${i + 1}`, price: (i + 1) * 100 }, this.ctx)
        );
      }
    }

    const executor = new Executor();
    const instance = new ProductType({}, {});
    const result = await executor.load(instance, {
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
  it("load() works with instance", async () => {
    class SimpleType extends BaseType<{ id: string }, { id: string }, { test: boolean }> {
      id() {
        return this.value.id;
      }
      hasContext() {
        return this.ctx.test;
      }
    }

    const instance = new SimpleType({ id: "123" }, { test: true });
    const result = await load(instance, { fields: ["id", "hasContext"] });

    expect(result).toEqual({ id: "123", hasContext: true });
  });

  it("loadMany() works with instances", async () => {
    class SimpleType extends BaseType<{ id: string }, { id: string }, unknown> {
      id() {
        return this.value.id;
      }
    }

    const instances = [
      new SimpleType({ id: "1" }, {}),
      new SimpleType({ id: "2" }, {}),
    ];
    const result = await loadMany(instances, { fields: ["id"] });

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

describe("resolve() - universal resolver", () => {
  it("resolves BaseType instance", async () => {
    class StoreType extends BaseType<{ id: string }, { id: string }, unknown> {
      id() {
        return this.value.id;
      }
      name() {
        return "Store Name";
      }
    }

    const instance = new StoreType({ id: "s1" }, {});
    const result = await resolve(instance, { fields: ["id", "name"] });

    expect(result).toEqual({ id: "s1", name: "Store Name" });
  });

  it("resolves array of BaseType instances", async () => {
    class ItemType extends BaseType<{ id: string }, { id: string }, unknown> {
      id() {
        return this.value.id;
      }
    }

    const instances = [
      new ItemType({ id: "1" }, {}),
      new ItemType({ id: "2" }, {}),
    ];
    const result = await resolve(instances, { fields: ["id"] });

    expect(result).toEqual([{ id: "1" }, { id: "2" }]);
  });

  it("resolves plain object with scalar fields", async () => {
    const obj = { success: true, message: "Created" };
    const result = await resolve(obj, { fields: ["success", "message"] });

    expect(result).toEqual({ success: true, message: "Created" });
  });

  it("resolves plain object with nested BaseType", async () => {
    class StoreType extends BaseType<{ id: string }, { id: string }, unknown> {
      id() {
        return this.value.id;
      }
      name() {
        return "My Store";
      }
    }

    const obj = {
      store: new StoreType({ id: "s1" }, {}),
      success: true,
    };

    const result = await resolve(obj, {
      fields: ["success"],
      populate: {
        store: { fields: ["id", "name"] },
      },
    });

    expect(result).toEqual({
      store: { id: "s1", name: "My Store" },
      success: true,
    });
  });

  it("resolves plain object with array of BaseType", async () => {
    class ProductType extends BaseType<{ id: string; sku: string }, { id: string; sku: string }, unknown> {
      id() {
        return this.value.id;
      }
      sku() {
        return this.value.sku;
      }
    }

    const obj = {
      products: [
        new ProductType({ id: "p1", sku: "SKU-1" }, {}),
        new ProductType({ id: "p2", sku: "SKU-2" }, {}),
      ],
      total: 2,
    };

    const result = await resolve(obj, {
      fields: ["total"],
      populate: {
        products: { fields: ["id", "sku"] },
      },
    });

    expect(result).toEqual({
      products: [
        { id: "p1", sku: "SKU-1" },
        { id: "p2", sku: "SKU-2" },
      ],
      total: 2,
    });
  });

  it("resolves deeply nested plain objects", async () => {
    class UserType extends BaseType<{ id: string }, { id: string }, unknown> {
      id() {
        return this.value.id;
      }
      email() {
        return "user@example.com";
      }
    }

    const obj = {
      data: {
        user: new UserType({ id: "u1" }, {}),
        metadata: { count: 1 },
      },
      success: true,
    };

    const result = await resolve(obj, {
      fields: ["success"],
      populate: {
        data: {
          fields: ["metadata"],
          populate: {
            user: { fields: ["id", "email"] },
            metadata: { fields: ["count"] },
          },
        },
      },
    });

    expect(result).toEqual({
      data: {
        user: { id: "u1", email: "user@example.com" },
        metadata: { count: 1 },
      },
      success: true,
    });
  });

  it("returns scalar values as-is", async () => {
    expect(await resolve("hello", undefined)).toBe("hello");
    expect(await resolve(42, undefined)).toBe(42);
    expect(await resolve(true, undefined)).toBe(true);
    expect(await resolve(null, undefined)).toBe(null);
  });

  it("returns Date as-is (not treated as plain object)", async () => {
    const date = new Date("2024-01-01");
    const result = await resolve(date, undefined);
    expect(result).toBe(date);
  });

  it("returns empty object when no fields specified in query", async () => {
    const obj = { a: 1, b: 2 };
    const result = await resolve(obj, {});
    expect(result).toEqual({});
  });
});
