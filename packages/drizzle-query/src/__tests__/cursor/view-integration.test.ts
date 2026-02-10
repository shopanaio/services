import { describe, it, expect, beforeEach } from "vitest";
import "../test/setup.js";
import {
  getDb,
  products,
  translations,
  productsView,
  clearTables,
} from "../test/setup.js";
import { createRelayBuilder } from "../../cursor/relay-builder.js";
import { createSchema } from "../../schema.js";
import { decode } from "../../cursor/cursor.js";

// ============ Test Schemas ============

// Basic view schema
const productsViewSchema = createSchema({
  table: productsView,
  tableName: "products_view",
  fields: {
    id: { column: "id" },
    handle: { column: "handle" },
    price: { column: "price" },
    deletedAt: { column: "deleted_at" },
    displayHandle: { column: "display_handle" },
    priceRange: { column: "price_range" },
  },
});

// Translations schema for joins
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

// View with translation join (View -> Table)
const productsViewWithTranslationSchema = createSchema({
  table: productsView,
  tableName: "products_view",
  fields: {
    id: { column: "id" },
    handle: { column: "handle" },
    price: { column: "price" },
    displayHandle: { column: "display_handle" },
    priceRange: { column: "price_range" },
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

function createViewQb() {
  return createRelayBuilder(productsViewSchema, {
    cursorType: "product",
    tieBreaker: "id",
  });
}

function createViewWithTranslationQb() {
  return createRelayBuilder(productsViewWithTranslationSchema, {
    cursorType: "product",
    tieBreaker: "id",
  });
}

// ============ Integration Tests ============

describe("View Pagination Integration Tests", () => {
  beforeEach(async () => {
    await clearTables();
  });

  describe("Basic View Pagination", () => {
    it("should paginate through view with computed fields", async () => {
      const db = getDb();

      // Insert products (view filters out deleted)
      await db.insert(products).values([
        { handle: "product-a", price: 50 },   // budget
        { handle: "product-b", price: 150 },  // mid-range
        { handle: "product-c", price: 600 },  // premium
        { handle: "product-d", price: 80 },   // budget
        { handle: "deleted", price: 200, deletedAt: new Date() }, // should be filtered by view
      ]);

      const qb = createViewQb();

      // First page sorted by price ASC
      const page1 = await qb.query(db as never, {
        first: 2,
        orderBy: [{ field: "price", direction: "asc" }],
        select: ["id", "handle", "price", "priceRange"],
      });

      expect(page1.edges).toHaveLength(2);
      expect(page1.edges[0].node.price).toBe(50);
      expect(page1.edges[0].node.priceRange).toBe("budget");
      expect(page1.edges[1].node.price).toBe(80);
      expect(page1.edges[1].node.priceRange).toBe("budget");
      expect(page1.pageInfo.hasNextPage).toBe(true);

      // Second page
      const page2 = await qb.query(db as never, {
        first: 2,
        after: page1.pageInfo.endCursor!,
        orderBy: [{ field: "price", direction: "asc" }],
        select: ["id", "handle", "price", "priceRange"],
      });

      expect(page2.edges).toHaveLength(2);
      expect(page2.edges[0].node.price).toBe(150);
      expect(page2.edges[0].node.priceRange).toBe("mid-range");
      expect(page2.edges[1].node.price).toBe(600);
      expect(page2.edges[1].node.priceRange).toBe("premium");
      expect(page2.pageInfo.hasNextPage).toBe(false);
    });

    it("should handle sorting by computed view field", async () => {
      const db = getDb();

      await db.insert(products).values([
        { handle: "apple", price: 100 },
        { handle: "banana", price: 200 },
        { handle: "cherry", price: 50 },
      ]);

      const qb = createViewQb();

      // Sort by displayHandle (computed UPPER(handle))
      const result = await qb.query(db as never, {
        first: 10,
        orderBy: [{ field: "displayHandle", direction: "asc" }],
        select: ["id", "handle", "displayHandle"],
      });

      expect(result.edges.map((e) => e.node.displayHandle)).toEqual([
        "APPLE",
        "BANANA",
        "CHERRY",
      ]);
    });

    it("should filter by computed view field", async () => {
      const db = getDb();

      await db.insert(products).values([
        { handle: "cheap", price: 50 },
        { handle: "medium", price: 200 },
        { handle: "expensive", price: 1000 },
      ]);

      const qb = createViewQb();

      const result = await qb.query(db as never, {
        first: 10,
        where: { priceRange: { _eq: "mid-range" } },
        select: ["id", "handle", "priceRange"],
      });

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].node.handle).toBe("medium");
      expect(result.edges[0].node.priceRange).toBe("mid-range");
    });
  });

  describe("View with Nested Field Pagination", () => {
    it("should paginate view with joined table (View -> Table)", async () => {
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

      const qb = createViewWithTranslationQb();

      // First page
      const page1 = await qb.query(db as never, {
        first: 2,
        orderBy: [{ field: "price", direction: "asc" }],
        select: ["id", "handle", "price", "priceRange", "translation.value"],
      });

      expect(page1.edges).toHaveLength(2);
      expect(page1.edges[0].node.handle).toBe("tablet");
      expect(page1.edges[0].node["translation.value"]).toBe("Tablet Mini");
      expect(page1.edges[1].node.handle).toBe("phone");
      expect(page1.edges[1].node["translation.value"]).toBe("Smartphone Pro");

      // Second page
      const page2 = await qb.query(db as never, {
        first: 2,
        after: page1.pageInfo.endCursor!,
        orderBy: [{ field: "price", direction: "asc" }],
        select: ["id", "handle", "price", "translation.value"],
      });

      expect(page2.edges).toHaveLength(1);
      expect(page2.edges[0].node.handle).toBe("laptop");
      expect(page2.edges[0].node["translation.value"]).toBe("Gaming Laptop");
    });

    it("should sort by nested joined field from view", async () => {
      const db = getDb();

      // Insert products
      const [p1] = await db
        .insert(products)
        .values({ handle: "zphone", price: 100 })
        .returning();
      const [p2] = await db
        .insert(products)
        .values({ handle: "alaptop", price: 200 })
        .returning();
      const [p3] = await db
        .insert(products)
        .values({ handle: "mtablet", price: 150 })
        .returning();

      // Insert translations with different sort values
      await db.insert(translations).values([
        { entityId: p1.id, field: "title", value: "Zebra Phone" },
        { entityId: p2.id, field: "title", value: "Alpha Laptop" },
        { entityId: p3.id, field: "title", value: "Meta Tablet" },
      ]);

      const qb = createViewWithTranslationQb();

      // Sort by nested translation.value
      const result = await qb.query(db as never, {
        first: 10,
        orderBy: [{ field: "translation.value", direction: "asc" }],
        select: ["id", "handle", "translation.value"],
      });

      expect(result.edges.map((e) => e.node["translation.value"])).toEqual([
        "Alpha Laptop",
        "Meta Tablet",
        "Zebra Phone",
      ]);
    });

    it("should filter by nested joined field from view", async () => {
      const db = getDb();

      // Insert products
      const [p1] = await db
        .insert(products)
        .values({ handle: "phone-1", price: 100 })
        .returning();
      const [p2] = await db
        .insert(products)
        .values({ handle: "phone-2", price: 200 })
        .returning();
      const [p3] = await db
        .insert(products)
        .values({ handle: "laptop", price: 1000 })
        .returning();

      // Insert translations
      await db.insert(translations).values([
        { entityId: p1.id, field: "title", value: "iPhone Mini", searchValue: "apple phone mobile" },
        { entityId: p2.id, field: "title", value: "Android Phone", searchValue: "android phone mobile" },
        { entityId: p3.id, field: "title", value: "MacBook", searchValue: "apple laptop computer" },
      ]);

      const qb = createViewWithTranslationQb();

      // Filter by nested translation.searchValue
      const result = await qb.query(db as never, {
        first: 10,
        where: { translation: { searchValue: { _containsi: "phone" } } },
        orderBy: [{ field: "price", direction: "asc" }],
        select: ["id", "handle", "translation.value"],
      });

      expect(result.edges).toHaveLength(2);
      expect(result.edges.map((e) => e.node.handle)).toEqual(["phone-1", "phone-2"]);
    });
  });

  describe("Cursor Structure with Nested Fields", () => {
    it("should build cursor with nested sort field from view", async () => {
      const db = getDb();

      // Insert product
      const [p1] = await db
        .insert(products)
        .values({ handle: "test-product", price: 500 })
        .returning();

      // Insert translation
      await db.insert(translations).values({
        entityId: p1.id,
        field: "title",
        value: "Test Product Title",
      });

      const qb = createViewWithTranslationQb();

      const result = await qb.query(db as never, {
        first: 1,
        orderBy: [{ field: "translation.value", direction: "desc" }],
        select: ["id", "handle", "translation.value"],
      });

      expect(result.edges).toHaveLength(1);
      const cursor = result.edges[0].cursor;
      const decoded = decode(cursor);

      expect(decoded.type).toBe("product");
      expect(decoded.seek).toHaveLength(2); // translation.value + id (tieBreaker)
      expect(decoded.seek[0].field).toBe("translation.value");
      expect(decoded.seek[0].value).toBe("Test Product Title");
      expect(decoded.seek[0].direction).toBe("desc");
      expect(decoded.seek[1].field).toBe("id"); // tieBreaker
    });

    it("should paginate correctly using cursor with nested field", async () => {
      const db = getDb();

      // Insert products
      const [p1] = await db
        .insert(products)
        .values({ handle: "prod-1", price: 100 })
        .returning();
      const [p2] = await db
        .insert(products)
        .values({ handle: "prod-2", price: 200 })
        .returning();
      const [p3] = await db
        .insert(products)
        .values({ handle: "prod-3", price: 300 })
        .returning();

      // Insert translations with specific ordering
      await db.insert(translations).values([
        { entityId: p1.id, field: "title", value: "Alpha" },
        { entityId: p2.id, field: "title", value: "Beta" },
        { entityId: p3.id, field: "title", value: "Gamma" },
      ]);

      const qb = createViewWithTranslationQb();

      // First page sorted by translation.value
      const page1 = await qb.query(db as never, {
        first: 2,
        orderBy: [{ field: "translation.value", direction: "asc" }],
        select: ["id", "handle", "translation.value"],
      });

      expect(page1.edges.map((e) => e.node["translation.value"])).toEqual(["Alpha", "Beta"]);

      // Second page using cursor
      const page2 = await qb.query(db as never, {
        first: 2,
        after: page1.pageInfo.endCursor!,
        orderBy: [{ field: "translation.value", direction: "asc" }],
        select: ["id", "handle", "translation.value"],
      });

      expect(page2.edges).toHaveLength(1);
      expect(page2.edges[0].node["translation.value"]).toBe("Gamma");
      expect(page2.pageInfo.hasNextPage).toBe(false);
    });

    it("should handle multi-field sort with nested fields from view", async () => {
      const db = getDb();

      // Insert products with same price
      const [p1] = await db
        .insert(products)
        .values({ handle: "prod-1", price: 100 })
        .returning();
      const [p2] = await db
        .insert(products)
        .values({ handle: "prod-2", price: 100 })
        .returning();
      const [p3] = await db
        .insert(products)
        .values({ handle: "prod-3", price: 100 })
        .returning();

      // Insert translations
      await db.insert(translations).values([
        { entityId: p1.id, field: "title", value: "Zebra" },
        { entityId: p2.id, field: "title", value: "Alpha" },
        { entityId: p3.id, field: "title", value: "Mango" },
      ]);

      const qb = createViewWithTranslationQb();

      // Sort by price ASC, then translation.value ASC
      const page1 = await qb.query(db as never, {
        first: 2,
        orderBy: [
          { field: "price", direction: "asc" },
          { field: "translation.value", direction: "asc" },
        ],
        select: ["id", "handle", "price", "translation.value"],
      });

      // All have same price, so sorted by translation.value
      expect(page1.edges.map((e) => e.node["translation.value"])).toEqual(["Alpha", "Mango"]);

      // Cursor should have both sort fields
      const decoded = decode(page1.edges[1].cursor);
      expect(decoded.seek).toHaveLength(3); // price + translation.value + id
      expect(decoded.seek[0].field).toBe("price");
      expect(decoded.seek[1].field).toBe("translation.value");
      expect(decoded.seek[1].value).toBe("Mango");

      // Continue pagination
      const page2 = await qb.query(db as never, {
        first: 2,
        after: page1.pageInfo.endCursor!,
        orderBy: [
          { field: "price", direction: "asc" },
          { field: "translation.value", direction: "asc" },
        ],
        select: ["id", "handle", "price", "translation.value"],
      });

      expect(page2.edges).toHaveLength(1);
      expect(page2.edges[0].node["translation.value"]).toBe("Zebra");
    });
  });

  describe("Backward Pagination with Views", () => {
    it("should paginate backward through view with nested fields", async () => {
      const db = getDb();

      // Insert products
      const [p1] = await db
        .insert(products)
        .values({ handle: "prod-1", price: 100 })
        .returning();
      const [p2] = await db
        .insert(products)
        .values({ handle: "prod-2", price: 200 })
        .returning();
      const [p3] = await db
        .insert(products)
        .values({ handle: "prod-3", price: 300 })
        .returning();
      const [p4] = await db
        .insert(products)
        .values({ handle: "prod-4", price: 400 })
        .returning();

      // Insert translations
      await db.insert(translations).values([
        { entityId: p1.id, field: "title", value: "First" },
        { entityId: p2.id, field: "title", value: "Second" },
        { entityId: p3.id, field: "title", value: "Third" },
        { entityId: p4.id, field: "title", value: "Fourth" },
      ]);

      const qb = createViewWithTranslationQb();

      // Get all items first to establish context
      const all = await qb.query(db as never, {
        first: 10,
        orderBy: [{ field: "price", direction: "asc" }],
        select: ["id", "handle", "price", "translation.value"],
      });

      expect(all.edges.map((e) => e.node["translation.value"])).toEqual([
        "First", "Second", "Third", "Fourth"
      ]);

      // Get last 2 items
      const lastPage = await qb.query(db as never, {
        last: 2,
        orderBy: [{ field: "price", direction: "asc" }],
        select: ["id", "handle", "price", "translation.value"],
      });

      expect(lastPage.edges.map((e) => e.node["translation.value"])).toEqual(["Third", "Fourth"]);
      expect(lastPage.pageInfo.hasPreviousPage).toBe(true);

      // Go backward using before cursor
      const prevPage = await qb.query(db as never, {
        last: 2,
        before: lastPage.pageInfo.startCursor!,
        orderBy: [{ field: "price", direction: "asc" }],
        select: ["id", "handle", "price", "translation.value"],
      });

      expect(prevPage.edges.map((e) => e.node["translation.value"])).toEqual(["First", "Second"]);
      expect(prevPage.pageInfo.hasPreviousPage).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should handle null nested values in cursor", async () => {
      const db = getDb();

      // Insert products - one without translation
      const [p1] = await db
        .insert(products)
        .values({ handle: "with-translation", price: 100 })
        .returning();

      await db
        .insert(products)
        .values({ handle: "without-translation", price: 200 });

      await db.insert(translations).values({
        entityId: p1.id,
        field: "title",
        value: "Has Translation",
      });

      const qb = createViewWithTranslationQb();

      // Sort by price (not nested field) - should work with null nested values
      const result = await qb.query(db as never, {
        first: 10,
        orderBy: [{ field: "price", direction: "asc" }],
        select: ["id", "handle", "price", "translation.value"],
      });

      expect(result.edges).toHaveLength(2);
      expect(result.edges[0].node["translation.value"]).toBe("Has Translation");
      expect(result.edges[1].node["translation.value"]).toBeNull();
    });

    it("should handle empty result set from view", async () => {
      const db = getDb();

      // Insert only deleted products (view filters them out)
      await db.insert(products).values([
        { handle: "deleted-1", price: 100, deletedAt: new Date() },
        { handle: "deleted-2", price: 200, deletedAt: new Date() },
      ]);

      const qb = createViewQb();

      const result = await qb.query(db as never, {
        first: 10,
        select: ["id", "handle"],
      });

      expect(result.edges).toHaveLength(0);
      expect(result.pageInfo.startCursor).toBeNull();
      expect(result.pageInfo.endCursor).toBeNull();
    });

    it("should respect filters combined with view filters", async () => {
      const db = getDb();

      await db.insert(products).values([
        { handle: "cheap-active", price: 50 },
        { handle: "expensive-active", price: 1000 },
        { handle: "cheap-deleted", price: 30, deletedAt: new Date() },
      ]);

      const qb = createViewQb();

      // View already filters deleted, add additional filter for premium
      const result = await qb.query(db as never, {
        first: 10,
        where: { priceRange: { _eq: "premium" } },
        select: ["id", "handle", "priceRange"],
      });

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].node.handle).toBe("expensive-active");
    });
  });
});
