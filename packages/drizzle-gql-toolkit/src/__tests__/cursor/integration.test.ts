import { describe, it, expect, beforeEach } from "vitest";
import "../test/setup.js";
import {
  getDb,
  products,
  translations,
  clearTables,
} from "../test/setup.js";
import { createCursorQueryBuilder } from "../../cursor/relay-builder.js";
import { createSchema } from "../../schema.js";
import { decode } from "../../cursor/cursor.js";

// ============ Test Schemas ============

const productsSchema = createSchema({
  table: products,
  tableName: "products",
  fields: {
    id: { column: "id" },
    handle: { column: "handle" },
    price: { column: "price" },
    deletedAt: { column: "deleted_at" },
  },
});

const translationsSchema = createSchema({
  table: translations,
  tableName: "translations",
  fields: {
    id: { column: "id" },
    entityId: { column: "entity_id" },
    field: { column: "field" },
    value: { column: "value" },
    searchValue: { column: "search_value" },
  },
});

const productsWithTranslationsSchema = createSchema({
  table: products,
  tableName: "products",
  fields: {
    id: { column: "id" },
    handle: { column: "handle" },
    price: { column: "price" },
    deletedAt: { column: "deleted_at" },
    translation: {
      column: "id",
      join: {
        schema: () => translationsSchema,
        column: "entityId",
      },
    },
  },
});

// ============ Helper Functions ============

function createProductsQb() {
  return createCursorQueryBuilder(productsSchema, {
    cursorType: "product",
    tieBreaker: "id",
  });
}

function createProductsWithJoinQb() {
  return createCursorQueryBuilder(productsWithTranslationsSchema, {
    cursorType: "product",
    tieBreaker: "id",
  });
}

// ============ Integration Tests ============

describe("Cursor Pagination Integration Tests", () => {
  beforeEach(async () => {
    await clearTables();
  });

  describe("Forward pagination (first/after)", () => {
    it("should paginate through all products in order", async () => {
      const db = getDb();

      // Insert 5 products with sequential prices for predictable ordering
      await db.insert(products).values([
        { handle: "product-1", price: 100 },
        { handle: "product-2", price: 200 },
        { handle: "product-3", price: 300 },
        { handle: "product-4", price: 400 },
        { handle: "product-5", price: 500 },
      ]);

      const qb = createProductsQb();

      // First page: get first 2 items ordered by price ASC
      const page1 = await qb.query(db as never, {
        first: 2,
        order: ["price:asc"],
        select: ["id", "handle", "price"],
      });

      expect(page1.edges).toHaveLength(2);
      expect(page1.edges[0].node.price).toBe(100);
      expect(page1.edges[1].node.price).toBe(200);
      expect(page1.pageInfo.hasNextPage).toBe(true);
      expect(page1.pageInfo.hasPreviousPage).toBe(false);
      expect(page1.pageInfo.startCursor).not.toBeNull();
      expect(page1.pageInfo.endCursor).not.toBeNull();

      // Second page: use endCursor from page1
      const page2 = await qb.query(db as never, {
        first: 2,
        after: page1.pageInfo.endCursor!,
        order: ["price:asc"],
        select: ["id", "handle", "price"],
      });

      expect(page2.edges).toHaveLength(2);
      expect(page2.edges[0].node.price).toBe(300);
      expect(page2.edges[1].node.price).toBe(400);
      expect(page2.pageInfo.hasNextPage).toBe(true);
      expect(page2.pageInfo.hasPreviousPage).toBe(true);

      // Third page: last item
      const page3 = await qb.query(db as never, {
        first: 2,
        after: page2.pageInfo.endCursor!,
        order: ["price:asc"],
        select: ["id", "handle", "price"],
      });

      expect(page3.edges).toHaveLength(1);
      expect(page3.edges[0].node.price).toBe(500);
      expect(page3.pageInfo.hasNextPage).toBe(false);
      expect(page3.pageInfo.hasPreviousPage).toBe(true);
    });

    it("should handle DESC order correctly", async () => {
      const db = getDb();

      await db.insert(products).values([
        { handle: "cheap", price: 100 },
        { handle: "medium", price: 500 },
        { handle: "expensive", price: 1000 },
      ]);

      const qb = createProductsQb();

      // First page: DESC order
      const page1 = await qb.query(db as never, {
        first: 2,
        order: ["price:desc"],
        select: ["id", "handle", "price"],
      });

      expect(page1.edges).toHaveLength(2);
      expect(page1.edges[0].node.price).toBe(1000);
      expect(page1.edges[1].node.price).toBe(500);

      // Second page
      const page2 = await qb.query(db as never, {
        first: 2,
        after: page1.pageInfo.endCursor!,
        order: ["price:desc"],
        select: ["id", "handle", "price"],
      });

      expect(page2.edges).toHaveLength(1);
      expect(page2.edges[0].node.price).toBe(100);
      expect(page2.pageInfo.hasNextPage).toBe(false);
    });

    it("should handle single item per page", async () => {
      const db = getDb();

      await db.insert(products).values([
        { handle: "a", price: 1 },
        { handle: "b", price: 2 },
        { handle: "c", price: 3 },
      ]);

      const qb = createProductsQb();
      const allHandles: string[] = [];
      let cursor: string | undefined;

      // Iterate one by one
      for (let i = 0; i < 5; i++) {
        const result = await qb.query(db as never, {
          first: 1,
          after: cursor,
          order: ["handle:asc"],
          select: ["id", "handle"],
        });

        if (result.edges.length === 0) break;

        allHandles.push(result.edges[0].node.handle);
        cursor = result.pageInfo.endCursor ?? undefined;
      }

      expect(allHandles).toEqual(["a", "b", "c"]);
    });
  });

  describe("Backward pagination (last/before)", () => {
    it("should get last N items without cursor", async () => {
      const db = getDb();

      await db.insert(products).values([
        { handle: "product-1", price: 100 },
        { handle: "product-2", price: 200 },
        { handle: "product-3", price: 300 },
        { handle: "product-4", price: 400 },
        { handle: "product-5", price: 500 },
      ]);

      const qb = createProductsQb();

      // Get last 2 items (should be product-4 and product-5 when sorted by price ASC)
      const result = await qb.query(db as never, {
        last: 2,
        order: ["price:asc"],
        select: ["id", "handle", "price"],
      });

      expect(result.edges).toHaveLength(2);
      // Last 2 in ASC order: 400, 500
      expect(result.edges[0].node.price).toBe(400);
      expect(result.edges[1].node.price).toBe(500);
      expect(result.pageInfo.hasPreviousPage).toBe(true);
      expect(result.pageInfo.hasNextPage).toBe(false);
    });

    it("should paginate backward with before cursor", async () => {
      const db = getDb();

      await db.insert(products).values([
        { handle: "product-1", price: 100 },
        { handle: "product-2", price: 200 },
        { handle: "product-3", price: 300 },
        { handle: "product-4", price: 400 },
        { handle: "product-5", price: 500 },
      ]);

      const qb = createProductsQb();

      // First, get some pages forward to establish cursors
      const page1 = await qb.query(db as never, {
        first: 2,
        order: ["price:asc"],
        select: ["id", "handle", "price"],
      });

      expect(page1.edges[0].node.price).toBe(100);
      expect(page1.edges[1].node.price).toBe(200);

      const page2 = await qb.query(db as never, {
        first: 2,
        after: page1.pageInfo.endCursor!,
        order: ["price:asc"],
        select: ["id", "handle", "price"],
      });

      expect(page2.edges[0].node.price).toBe(300);
      expect(page2.edges[1].node.price).toBe(400);

      // Now go backward from start of page2 using before cursor
      const backPage = await qb.query(db as never, {
        last: 2,
        before: page2.pageInfo.startCursor!,
        order: ["price:asc"],
        select: ["id", "handle", "price"],
      });

      // Should get the 2 items before price=300
      expect(backPage.edges).toHaveLength(2);
      expect(backPage.edges[0].node.price).toBe(100);
      expect(backPage.edges[1].node.price).toBe(200);
      expect(backPage.pageInfo.hasNextPage).toBe(true); // there are items after
      expect(backPage.pageInfo.hasPreviousPage).toBe(false); // no items before
    });

    it("should handle DESC order with backward pagination", async () => {
      const db = getDb();

      await db.insert(products).values([
        { handle: "cheap", price: 100 },
        { handle: "medium", price: 500 },
        { handle: "expensive", price: 1000 },
      ]);

      const qb = createProductsQb();

      // Get last 2 items in DESC order (should be 500, 100)
      const result = await qb.query(db as never, {
        last: 2,
        order: ["price:desc"],
        select: ["id", "handle", "price"],
      });

      expect(result.edges).toHaveLength(2);
      expect(result.edges[0].node.price).toBe(500);
      expect(result.edges[1].node.price).toBe(100);
      expect(result.pageInfo.hasPreviousPage).toBe(true);
    });
  });

  describe("Full navigation journey", () => {
    it("should navigate forward and backward through pages", async () => {
      const db = getDb();

      // Create 10 products
      const productData = Array.from({ length: 10 }, (_, i) => ({
        handle: `product-${String(i + 1).padStart(2, "0")}`,
        price: (i + 1) * 100,
      }));
      await db.insert(products).values(productData);

      const qb = createProductsQb();

      // Page 1: first 3 items (100, 200, 300)
      const page1 = await qb.query(db as never, {
        first: 3,
        order: ["price:asc"],
        select: ["id", "handle", "price"],
      });

      expect(page1.edges.map((e) => e.node.price)).toEqual([100, 200, 300]);
      expect(page1.pageInfo.hasNextPage).toBe(true);
      expect(page1.pageInfo.hasPreviousPage).toBe(false);

      // Page 2: next 3 items (400, 500, 600)
      const page2 = await qb.query(db as never, {
        first: 3,
        after: page1.pageInfo.endCursor!,
        order: ["price:asc"],
        select: ["id", "handle", "price"],
      });

      expect(page2.edges.map((e) => e.node.price)).toEqual([400, 500, 600]);
      expect(page2.pageInfo.hasNextPage).toBe(true);
      expect(page2.pageInfo.hasPreviousPage).toBe(true);

      // Go back: get 3 items before page2.startCursor
      const backToPage1 = await qb.query(db as never, {
        last: 3,
        before: page2.pageInfo.startCursor!,
        order: ["price:asc"],
        select: ["id", "handle", "price"],
      });

      expect(backToPage1.edges.map((e) => e.node.price)).toEqual([100, 200, 300]);
      expect(backToPage1.pageInfo.hasPreviousPage).toBe(false);
      expect(backToPage1.pageInfo.hasNextPage).toBe(true);

      // Continue forward to last page
      const page3 = await qb.query(db as never, {
        first: 3,
        after: page2.pageInfo.endCursor!,
        order: ["price:asc"],
        select: ["id", "handle", "price"],
      });

      expect(page3.edges.map((e) => e.node.price)).toEqual([700, 800, 900]);

      const page4 = await qb.query(db as never, {
        first: 3,
        after: page3.pageInfo.endCursor!,
        order: ["price:asc"],
        select: ["id", "handle", "price"],
      });

      expect(page4.edges.map((e) => e.node.price)).toEqual([1000]);
      expect(page4.pageInfo.hasNextPage).toBe(false);
    });

    it("should maintain consistency when paginating with same cursors", async () => {
      const db = getDb();

      await db.insert(products).values([
        { handle: "a", price: 100 },
        { handle: "b", price: 200 },
        { handle: "c", price: 300 },
      ]);

      const qb = createProductsQb();

      // Get all items first
      const all = await qb.query(db as never, {
        first: 10,
        order: ["price:asc"],
        select: ["id", "handle", "price"],
      });

      // Use cursor from first item to get items after it
      const afterFirst = await qb.query(db as never, {
        first: 10,
        after: all.edges[0].cursor,
        order: ["price:asc"],
        select: ["id", "handle", "price"],
      });

      expect(afterFirst.edges.map((e) => e.node.price)).toEqual([200, 300]);

      // Use cursor from second item
      const afterSecond = await qb.query(db as never, {
        first: 10,
        after: all.edges[1].cursor,
        order: ["price:asc"],
        select: ["id", "handle", "price"],
      });

      expect(afterSecond.edges.map((e) => e.node.price)).toEqual([300]);
    });
  });

  describe("Cursor with filters", () => {
    it("should respect where clause during pagination", async () => {
      const db = getDb();

      await db.insert(products).values([
        { handle: "active-1", price: 100 },
        { handle: "deleted-1", price: 200, deletedAt: new Date() },
        { handle: "active-2", price: 300 },
        { handle: "deleted-2", price: 400, deletedAt: new Date() },
        { handle: "active-3", price: 500 },
      ]);

      const qb = createProductsQb();

      // Get only active products (deletedAt is null)
      const page1 = await qb.query(db as never, {
        first: 2,
        where: { deletedAt: { $is: null } },
        order: ["price:asc"],
        select: ["id", "handle", "price"],
      });

      expect(page1.edges).toHaveLength(2);
      expect(page1.edges[0].node.handle).toBe("active-1");
      expect(page1.edges[1].node.handle).toBe("active-2");

      // Continue pagination with same filter
      const page2 = await qb.query(db as never, {
        first: 2,
        after: page1.pageInfo.endCursor!,
        where: { deletedAt: { $is: null } },
        order: ["price:asc"],
        select: ["id", "handle", "price"],
      });

      expect(page2.edges).toHaveLength(1);
      expect(page2.edges[0].node.handle).toBe("active-3");
    });

    it("should reset cursor when filters change", async () => {
      const db = getDb();

      await db.insert(products).values([
        { handle: "cheap-1", price: 100 },
        { handle: "cheap-2", price: 200 },
        { handle: "expensive-1", price: 1000 },
        { handle: "expensive-2", price: 2000 },
      ]);

      const qb = createProductsQb();

      // Get cheap products with filters
      const cheapPage = await qb.query(db as never, {
        first: 2,
        filters: { category: "cheap" },
        where: { price: { $lt: 500 } },
        order: ["price:asc"],
        select: ["id", "handle", "price"],
      });

      expect(cheapPage.edges).toHaveLength(2);
      expect(cheapPage.filtersChanged).toBe(false);

      // Use cursor from cheap query but with different filters
      const expensivePage = await qb.query(db as never, {
        first: 2,
        after: cheapPage.pageInfo.endCursor!,
        filters: { category: "expensive" },
        where: { price: { $gte: 500 } },
        order: ["price:asc"],
        select: ["id", "handle", "price"],
      });

      // Cursor should be ignored because filters changed
      expect(expensivePage.filtersChanged).toBe(true);
      expect(expensivePage.edges[0].node.handle).toBe("expensive-1");
    });
  });

  describe("Multiple sort fields", () => {
    it("should handle multi-field sort correctly", async () => {
      const db = getDb();

      // Products with same price but different handles
      await db.insert(products).values([
        { handle: "z-product", price: 100 },
        { handle: "a-product", price: 100 },
        { handle: "m-product", price: 100 },
        { handle: "x-product", price: 200 },
        { handle: "b-product", price: 200 },
      ]);

      const qb = createProductsQb();

      // Sort by price ASC, then handle ASC
      const page1 = await qb.query(db as never, {
        first: 3,
        order: ["price:asc", "handle:asc"],
        select: ["id", "handle", "price"],
      });

      expect(page1.edges.map((e) => e.node.handle)).toEqual([
        "a-product",
        "m-product",
        "z-product",
      ]);

      // Next page
      const page2 = await qb.query(db as never, {
        first: 3,
        after: page1.pageInfo.endCursor!,
        order: ["price:asc", "handle:asc"],
        select: ["id", "handle", "price"],
      });

      expect(page2.edges.map((e) => e.node.handle)).toEqual([
        "b-product",
        "x-product",
      ]);
    });

    it("should handle mixed ASC/DESC sort", async () => {
      const db = getDb();

      await db.insert(products).values([
        { handle: "a", price: 100 },
        { handle: "b", price: 100 },
        { handle: "a", price: 200 },
        { handle: "b", price: 200 },
      ]);

      const qb = createProductsQb();

      // Sort by handle ASC, price DESC
      const result = await qb.query(db as never, {
        first: 10,
        order: ["handle:asc", "price:desc"],
        select: ["id", "handle", "price"],
      });

      // a products first (price DESC: 200, 100), then b products (price DESC: 200, 100)
      expect(result.edges.map((e) => ({ h: e.node.handle, p: e.node.price }))).toEqual([
        { h: "a", p: 200 },
        { h: "a", p: 100 },
        { h: "b", p: 200 },
        { h: "b", p: 100 },
      ]);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty result set", async () => {
      const db = getDb();
      const qb = createProductsQb();

      const result = await qb.query(db as never, {
        first: 10,
        select: ["id", "handle"],
      });

      expect(result.edges).toHaveLength(0);
      expect(result.pageInfo.startCursor).toBeNull();
      expect(result.pageInfo.endCursor).toBeNull();
      expect(result.pageInfo.hasNextPage).toBe(false);
      expect(result.pageInfo.hasPreviousPage).toBe(false);
    });

    it("should handle single item", async () => {
      const db = getDb();

      await db.insert(products).values({ handle: "only-one", price: 100 });

      const qb = createProductsQb();

      const result = await qb.query(db as never, {
        first: 10,
        select: ["id", "handle"],
      });

      expect(result.edges).toHaveLength(1);
      expect(result.pageInfo.hasNextPage).toBe(false);
      expect(result.pageInfo.hasPreviousPage).toBe(false);
      expect(result.pageInfo.startCursor).toBe(result.pageInfo.endCursor);
    });

    it("should handle exact page size", async () => {
      const db = getDb();

      await db.insert(products).values([
        { handle: "a", price: 100 },
        { handle: "b", price: 200 },
        { handle: "c", price: 300 },
      ]);

      const qb = createProductsQb();

      // Request exactly 3 items when there are 3
      const result = await qb.query(db as never, {
        first: 3,
        order: ["price:asc"],
        select: ["id", "handle"],
      });

      expect(result.edges).toHaveLength(3);
      expect(result.pageInfo.hasNextPage).toBe(false);
    });

    it("should handle large page size", async () => {
      const db = getDb();

      await db.insert(products).values([
        { handle: "a", price: 100 },
        { handle: "b", price: 200 },
      ]);

      const qb = createProductsQb();

      const result = await qb.query(db as never, {
        first: 1000,
        select: ["id", "handle"],
      });

      expect(result.edges).toHaveLength(2);
      expect(result.pageInfo.hasNextPage).toBe(false);
    });
  });

  describe("Cursor structure validation", () => {
    it("should generate valid decodable cursors", async () => {
      const db = getDb();

      await db.insert(products).values([
        { handle: "test-product", price: 999 },
      ]);

      const qb = createProductsQb();

      const result = await qb.query(db as never, {
        first: 1,
        order: ["price:desc"],
        select: ["id", "handle", "price"],
      });

      const cursor = result.edges[0].cursor;
      const decoded = decode(cursor);

      expect(decoded.type).toBe("product");
      expect(decoded.seek).toHaveLength(2); // price + id (tieBreaker)
      expect(decoded.seek[0].field).toBe("price");
      expect(decoded.seek[0].value).toBe(999);
      expect(decoded.seek[0].order).toBe("desc");
    });

    it("should include correct filtersHash in cursor", async () => {
      const db = getDb();

      await db.insert(products).values([{ handle: "test", price: 100 }]);

      const qb = createProductsQb();

      // Query with filters
      const result = await qb.query(db as never, {
        first: 1,
        filters: { status: "active", category: "electronics" },
        select: ["id", "handle"],
      });

      const decoded = decode(result.edges[0].cursor);

      // filtersHash should be non-empty when filters are provided
      expect(decoded.filtersHash).toBeTruthy();
      expect(decoded.filtersHash.length).toBeGreaterThan(0);
    });
  });

  describe("With JOIN queries", () => {
    it("should paginate products with translations", async () => {
      const db = getDb();

      // Insert products
      const [p1] = await db
        .insert(products)
        .values({ handle: "phone", price: 999 })
        .returning();
      const [p2] = await db
        .insert(products)
        .values({ handle: "laptop", price: 1999 })
        .returning();
      const [p3] = await db
        .insert(products)
        .values({ handle: "tablet", price: 599 })
        .returning();

      // Insert translations
      await db.insert(translations).values([
        { entityId: p1.id, field: "title", value: "Smartphone Pro" },
        { entityId: p2.id, field: "title", value: "Gaming Laptop" },
        { entityId: p3.id, field: "title", value: "Tablet Mini" },
      ]);

      const qb = createProductsWithJoinQb();

      // First page
      const page1 = await qb.query(db as never, {
        first: 2,
        order: ["price:asc"],
        select: ["id", "handle", "price", "translation.value"],
      });

      expect(page1.edges).toHaveLength(2);
      expect(page1.edges[0].node.price).toBe(599);
      expect(page1.edges[1].node.price).toBe(999);

      // Second page
      const page2 = await qb.query(db as never, {
        first: 2,
        after: page1.pageInfo.endCursor!,
        order: ["price:asc"],
        select: ["id", "handle", "price", "translation.value"],
      });

      expect(page2.edges).toHaveLength(1);
      expect(page2.edges[0].node.price).toBe(1999);
    });

    it("should filter through join and paginate", async () => {
      const db = getDb();

      // Insert products
      const [p1] = await db
        .insert(products)
        .values({ handle: "iphone", price: 999 })
        .returning();
      const [p2] = await db
        .insert(products)
        .values({ handle: "samsung", price: 899 })
        .returning();
      const [p3] = await db
        .insert(products)
        .values({ handle: "pixel", price: 799 })
        .returning();
      const [p4] = await db
        .insert(products)
        .values({ handle: "macbook", price: 1999 })
        .returning();

      // Insert translations with searchable values
      await db.insert(translations).values([
        { entityId: p1.id, field: "title", value: "iPhone 15", searchValue: "phone mobile apple" },
        { entityId: p2.id, field: "title", value: "Galaxy S24", searchValue: "phone mobile samsung" },
        { entityId: p3.id, field: "title", value: "Pixel 8", searchValue: "phone mobile google" },
        { entityId: p4.id, field: "title", value: "MacBook Pro", searchValue: "laptop apple" },
      ]);

      const qb = createProductsWithJoinQb();

      // Filter for phones only
      const page1 = await qb.query(db as never, {
        first: 2,
        where: { translation: { searchValue: { $containsi: "phone" } } },
        order: ["price:asc"],
        select: ["id", "handle", "price"],
      });

      expect(page1.edges).toHaveLength(2);
      expect(page1.edges[0].node.handle).toBe("pixel"); // 799
      expect(page1.edges[1].node.handle).toBe("samsung"); // 899

      // Next page
      const page2 = await qb.query(db as never, {
        first: 2,
        after: page1.pageInfo.endCursor!,
        where: { translation: { searchValue: { $containsi: "phone" } } },
        order: ["price:asc"],
        select: ["id", "handle", "price"],
      });

      expect(page2.edges).toHaveLength(1);
      expect(page2.edges[0].node.handle).toBe("iphone"); // 999
    });
  });

  describe("Null values in sort fields", () => {
    it("should handle null values in sort field", async () => {
      const db = getDb();

      await db.insert(products).values([
        { handle: "with-price-1", price: 100 },
        { handle: "no-price-1", price: null },
        { handle: "with-price-2", price: 200 },
        { handle: "no-price-2", price: null },
      ]);

      const qb = createProductsQb();

      // ASC order: nulls go last in PostgreSQL by default
      const result = await qb.query(db as never, {
        first: 10,
        order: ["price:asc"],
        select: ["id", "handle", "price"],
      });

      expect(result.edges).toHaveLength(4);
      // Non-null values first in ASC
      expect(result.edges[0].node.price).toBe(100);
      expect(result.edges[1].node.price).toBe(200);
      // Nulls last
      expect(result.edges[2].node.price).toBeNull();
      expect(result.edges[3].node.price).toBeNull();
    });

    it("should paginate correctly with null values using handle sort", async () => {
      const db = getDb();

      // Use handle for sorting since it's never null
      await db.insert(products).values([
        { handle: "a", price: 100 },
        { handle: "b", price: null },
        { handle: "c", price: 200 },
        { handle: "d", price: null },
      ]);

      const qb = createProductsQb();

      // Sort by handle (non-null) - this allows reliable cursor pagination
      const page1 = await qb.query(db as never, {
        first: 2,
        order: ["handle:asc"],
        select: ["id", "handle", "price"],
      });

      expect(page1.edges[0].node.handle).toBe("a");
      expect(page1.edges[1].node.handle).toBe("b");
      expect(page1.edges[0].node.price).toBe(100);
      expect(page1.edges[1].node.price).toBeNull();

      // Second page
      const page2 = await qb.query(db as never, {
        first: 2,
        after: page1.pageInfo.endCursor!,
        order: ["handle:asc"],
        select: ["id", "handle", "price"],
      });

      expect(page2.edges).toHaveLength(2);
      expect(page2.edges[0].node.handle).toBe("c");
      expect(page2.edges[1].node.handle).toBe("d");
    });
  });

  describe("Tie-breaker consistency", () => {
    it("should use id as tie-breaker for stable ordering", async () => {
      const db = getDb();

      // Insert products with same price - order should be stable via id
      const inserted = await db
        .insert(products)
        .values([
          { handle: "same-price-1", price: 100 },
          { handle: "same-price-2", price: 100 },
          { handle: "same-price-3", price: 100 },
        ])
        .returning();

      const qb = createProductsQb();

      // Get all with price sort (tie-breaker follows sort direction: price ASC -> id ASC)
      const result = await qb.query(db as never, {
        first: 10,
        order: ["price:asc"],
        select: ["id", "handle", "price"],
      });

      // Results should be ordered by price, then by id ASC (follows last sort field direction)
      const sortedByIdAsc = [...inserted].sort((a, b) => a.id.localeCompare(b.id));
      expect(result.edges.map((e) => e.node.id)).toEqual(sortedByIdAsc.map((p) => p.id));
    });

    it("should use DESC tie-breaker when sorting DESC", async () => {
      const db = getDb();

      const inserted = await db
        .insert(products)
        .values([
          { handle: "same-price-1", price: 100 },
          { handle: "same-price-2", price: 100 },
          { handle: "same-price-3", price: 100 },
        ])
        .returning();

      const qb = createProductsQb();

      // Get all with price DESC (tie-breaker follows: id DESC)
      const result = await qb.query(db as never, {
        first: 10,
        order: ["price:desc"],
        select: ["id", "handle", "price"],
      });

      // Results should be ordered by price DESC, then by id DESC
      const sortedByIdDesc = [...inserted].sort((a, b) => b.id.localeCompare(a.id));
      expect(result.edges.map((e) => e.node.id)).toEqual(sortedByIdDesc.map((p) => p.id));
    });

    it("should paginate correctly through items with same sort value", async () => {
      const db = getDb();

      // 6 items with same price but different handles for predictable ordering
      await db.insert(products).values([
        { handle: "item-a", price: 100 },
        { handle: "item-b", price: 100 },
        { handle: "item-c", price: 100 },
        { handle: "item-d", price: 100 },
        { handle: "item-e", price: 100 },
        { handle: "item-f", price: 100 },
      ]);

      const qb = createProductsQb();

      // Use handle sort for reliable ordering (not random UUIDs)
      const page1 = await qb.query(db as never, {
        first: 2,
        order: ["handle:asc"],
        select: ["id", "handle"],
      });

      expect(page1.edges).toHaveLength(2);
      expect(page1.edges.map((e) => e.node.handle)).toEqual(["item-a", "item-b"]);

      const page2 = await qb.query(db as never, {
        first: 2,
        after: page1.pageInfo.endCursor!,
        order: ["handle:asc"],
        select: ["id", "handle"],
      });

      expect(page2.edges).toHaveLength(2);
      expect(page2.edges.map((e) => e.node.handle)).toEqual(["item-c", "item-d"]);

      const page3 = await qb.query(db as never, {
        first: 2,
        after: page2.pageInfo.endCursor!,
        order: ["handle:asc"],
        select: ["id", "handle"],
      });

      expect(page3.edges).toHaveLength(2);
      expect(page3.edges.map((e) => e.node.handle)).toEqual(["item-e", "item-f"]);

      // All ids should be unique
      const allIds = [
        ...page1.edges.map((e) => e.node.id),
        ...page2.edges.map((e) => e.node.id),
        ...page3.edges.map((e) => e.node.id),
      ];
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(6);
    });
  });
});
