import { describe, it, expect } from "vitest";
import { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { createCursorQueryBuilder } from "./builder.js";
import { encode } from "./cursor.js";
import { createSchema } from "../schema.js";
import { products, translations } from "../test/setup.js";

// ============ Test Setup ============

const dialect = new PgDialect();

/**
 * Helper to convert SQL object to readable string with params
 */
function toSqlString(sqlObj: SQL): string {
  const query = dialect.sqlToQuery(sqlObj);
  return `SQL: ${query.sql}\nParams: ${JSON.stringify(query.params)}`;
}

// Simple product schema
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

// Schema with translations join
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
    translation: {
      column: "id",
      join: {
        schema: () => translationsSchema,
        column: "entityId",
      },
    },
  },
});

// ============ createCursorQueryBuilder ============

describe("createCursorQueryBuilder", () => {
  describe("interface", () => {
    it("creates a query builder with correct interface", () => {
      const qb = createCursorQueryBuilder(productsSchema, {
        cursorType: "product",
        tieBreaker: "id",
        defaultSortField: "id",
      });

      expect(qb).toHaveProperty("query");
      expect(qb).toHaveProperty("getQueryBuilder");
      expect(typeof qb.query).toBe("function");
      expect(typeof qb.getQueryBuilder).toBe("function");
    });

    it("getQueryBuilder returns underlying query builder", () => {
      const qb = createCursorQueryBuilder(productsSchema, {
        cursorType: "product",
        tieBreaker: "id",
        defaultSortField: "id",
      });

      const underlyingQb = qb.getQueryBuilder();
      expect(underlyingQb).toHaveProperty("query");
      expect(underlyingQb).toHaveProperty("buildSelectSql");
    });
  });

  describe("pagination validation", () => {
    const createTestQb = () =>
      createCursorQueryBuilder(productsSchema, {
        cursorType: "product",
        tieBreaker: "id",
        defaultSortField: "id",
      });

    it("throws when both first and last are provided", async () => {
      const qb = createTestQb();
      const mockDb = {} as any;

      await expect(qb.query(mockDb, { first: 10, last: 5 })).rejects.toThrow(
        "Cannot specify both 'first' and 'last'"
      );
    });

    it("throws when neither first nor last is provided", async () => {
      const qb = createTestQb();
      const mockDb = {} as any;

      await expect(qb.query(mockDb, {})).rejects.toThrow(
        "Either 'first' or 'last' must be provided"
      );
    });

    it("throws when first is not positive", async () => {
      const qb = createTestQb();
      const mockDb = {} as any;

      await expect(qb.query(mockDb, { first: 0 })).rejects.toThrow(
        "first must be greater than 0"
      );

      await expect(qb.query(mockDb, { first: -1 })).rejects.toThrow(
        "first must be greater than 0"
      );
    });

    it("throws when last is not positive", async () => {
      const qb = createTestQb();
      const mockDb = {} as any;

      await expect(qb.query(mockDb, { last: 0 })).rejects.toThrow(
        "last must be greater than 0"
      );
    });
  });

  describe("cursor type validation", () => {
    it("throws on invalid cursor type", async () => {
      const qb = createCursorQueryBuilder(productsSchema, {
        cursorType: "product",
        tieBreaker: "id",
        defaultSortField: "id",
      });

      // Create cursor with wrong type
      const wrongTypeCursor = encode({
        type: "category",
        filtersHash: "",
        seek: [
          { field: "id", value: "2024-01-01", order: "desc" },
          { field: "id", value: "1", order: "desc" },
        ],
      });

      const mockDb = {} as any;

      await expect(
        qb.query(mockDb, { first: 10, after: wrongTypeCursor })
      ).rejects.toThrow("Expected cursor type 'product', got 'category'");
    });
  });
});

// ============ SQL Snapshot Tests - Usage Examples ============

describe("Cursor Pagination SQL Snapshots", () => {
  const qb = createCursorQueryBuilder(productsSchema, {
    cursorType: "product",
    tieBreaker: "id",
    defaultSortField: "id",
  });

  describe("basic queries", () => {
    it("generates SELECT with default sort (id:desc)", () => {
      const sql = qb.getQueryBuilder().buildSelectSql({
        select: ["id", "handle", "price"],
        order: ["id:desc"],
        limit: 11,
      });

      expect(toSqlString(sql)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id" AS "id", "t0_products"."handle" AS "handle", "t0_products"."price" AS "price" FROM "products" AS "t0_products" ORDER BY "t0_products"."id" DESC LIMIT $1 OFFSET $2
        Params: [11,0]"
      `);
    });

    it("generates SELECT with custom sort", () => {
      const sql = qb.getQueryBuilder().buildSelectSql({
        select: ["id", "handle", "price"],
        order: ["price:desc", "id:desc"],
        limit: 11,
      });

      expect(toSqlString(sql)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id" AS "id", "t0_products"."handle" AS "handle", "t0_products"."price" AS "price" FROM "products" AS "t0_products" ORDER BY "t0_products"."price" DESC, "t0_products"."id" DESC LIMIT $1 OFFSET $2
        Params: [11,0]"
      `);
    });

    it("generates SELECT with ascending sort", () => {
      const sql = qb.getQueryBuilder().buildSelectSql({
        select: ["id", "handle"],
        order: ["handle:asc", "id:asc"],
        limit: 11,
      });

      expect(toSqlString(sql)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id" AS "id", "t0_products"."handle" AS "handle" FROM "products" AS "t0_products" ORDER BY "t0_products"."handle" ASC, "t0_products"."id" ASC LIMIT $1 OFFSET $2
        Params: [11,0]"
      `);
    });
  });

  describe("cursor-based where conditions", () => {
    it("generates forward pagination WHERE (after cursor, desc)", () => {
      // Simulates: first: 10, after: cursor with id="123", price=100
      const sql = qb.getQueryBuilder().buildSelectSql({
        select: ["id", "handle", "price"],
        where: {
          $or: [
            { price: { $lt: 100 } },
            { price: { $eq: 100 }, id: { $lt: "123" } },
          ],
        },
        order: ["price:desc", "id:desc"],
        limit: 11,
      });

      expect(toSqlString(sql)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id" AS "id", "t0_products"."handle" AS "handle", "t0_products"."price" AS "price" FROM "products" AS "t0_products" WHERE ("t0_products"."price" < $1 or ("t0_products"."price" = $2 and "t0_products"."id" < $3)) ORDER BY "t0_products"."price" DESC, "t0_products"."id" DESC LIMIT $4 OFFSET $5
        Params: [100,100,"123",11,0]"
      `);
    });

    it("generates forward pagination WHERE (after cursor, asc)", () => {
      // Simulates: first: 10, after: cursor with id="abc", handle="test"
      const sql = qb.getQueryBuilder().buildSelectSql({
        select: ["id", "handle"],
        where: {
          $or: [
            { handle: { $gt: "test" } },
            { handle: { $eq: "test" }, id: { $gt: "abc" } },
          ],
        },
        order: ["handle:asc", "id:asc"],
        limit: 11,
      });

      expect(toSqlString(sql)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id" AS "id", "t0_products"."handle" AS "handle" FROM "products" AS "t0_products" WHERE ("t0_products"."handle" > $1 or ("t0_products"."handle" = $2 and "t0_products"."id" > $3)) ORDER BY "t0_products"."handle" ASC, "t0_products"."id" ASC LIMIT $4 OFFSET $5
        Params: ["test","test","abc",11,0]"
      `);
    });

    it("generates backward pagination WHERE (before cursor)", () => {
      // Simulates: last: 10, before: cursor - order inverted
      const sql = qb.getQueryBuilder().buildSelectSql({
        select: ["id", "handle", "price"],
        where: {
          $or: [
            { price: { $gt: 100 } },
            { price: { $eq: 100 }, id: { $gt: "123" } },
          ],
        },
        order: ["price:asc", "id:asc"], // inverted for backward fetch
        limit: 11,
      });

      expect(toSqlString(sql)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id" AS "id", "t0_products"."handle" AS "handle", "t0_products"."price" AS "price" FROM "products" AS "t0_products" WHERE ("t0_products"."price" > $1 or ("t0_products"."price" = $2 and "t0_products"."id" > $3)) ORDER BY "t0_products"."price" ASC, "t0_products"."id" ASC LIMIT $4 OFFSET $5
        Params: [100,100,"123",11,0]"
      `);
    });
  });

  describe("combined filters and cursor", () => {
    it("generates query with user filters AND cursor conditions", () => {
      const sql = qb.getQueryBuilder().buildSelectSql({
        select: ["id", "handle", "price"],
        where: {
          $and: [
            // User filter
            { deletedAt: { $is: null } },
            // Cursor condition
            {
              $or: [
                { price: { $lt: 100 } },
                { price: { $eq: 100 }, id: { $lt: "123" } },
              ],
            },
          ],
        },
        order: ["price:desc", "id:desc"],
        limit: 11,
      });

      expect(toSqlString(sql)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id" AS "id", "t0_products"."handle" AS "handle", "t0_products"."price" AS "price" FROM "products" AS "t0_products" WHERE ("t0_products"."deleted_at" is null and ("t0_products"."price" < $1 or ("t0_products"."price" = $2 and "t0_products"."id" < $3))) ORDER BY "t0_products"."price" DESC, "t0_products"."id" DESC LIMIT $4 OFFSET $5
        Params: [100,100,"123",11,0]"
      `);
    });

    it("generates query with complex user filters", () => {
      const sql = qb.getQueryBuilder().buildSelectSql({
        select: ["id", "handle", "price"],
        where: {
          $and: [
            {
              $or: [
                { price: { $gte: 50, $lte: 150 } },
                { handle: { $iLike: "%premium%" } },
              ],
            },
            { deletedAt: { $is: null } },
            // Cursor condition
            {
              $or: [{ id: { $lt: "cursor-id" } }],
            },
          ],
        },
        order: ["id:desc"],
        limit: 11,
      });

      expect(toSqlString(sql)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id" AS "id", "t0_products"."handle" AS "handle", "t0_products"."price" AS "price" FROM "products" AS "t0_products" WHERE ((("t0_products"."price" >= $1 and "t0_products"."price" <= $2) or "t0_products"."handle" ilike $3) and "t0_products"."deleted_at" is null and "t0_products"."id" < $4) ORDER BY "t0_products"."id" DESC LIMIT $5 OFFSET $6
        Params: [50,150,"%premium%","cursor-id",11,0]"
      `);
    });
  });

  describe("multi-field cursor (3 fields)", () => {
    it("generates three-level lexicographic ladder", () => {
      // status DESC, price DESC, id DESC - cursor at status=ACTIVE, price=100, id="xyz"
      const sql = qb.getQueryBuilder().buildSelectSql({
        select: ["id", "handle", "price"],
        where: {
          $or: [
            { handle: { $lt: "active" } },
            { handle: { $eq: "active" }, price: { $lt: 100 } },
            {
              handle: { $eq: "active" },
              price: { $eq: 100 },
              id: { $lt: "xyz" },
            },
          ],
        },
        order: ["handle:desc", "price:desc", "id:desc"],
        limit: 11,
      });

      expect(toSqlString(sql)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id" AS "id", "t0_products"."handle" AS "handle", "t0_products"."price" AS "price" FROM "products" AS "t0_products" WHERE ("t0_products"."handle" < $1 or ("t0_products"."handle" = $2 and "t0_products"."price" < $3) or ("t0_products"."handle" = $4 and "t0_products"."price" = $5 and "t0_products"."id" < $6)) ORDER BY "t0_products"."handle" DESC, "t0_products"."price" DESC, "t0_products"."id" DESC LIMIT $7 OFFSET $8
        Params: ["active","active",100,"active",100,"xyz",11,0]"
      `);
    });
  });
});

describe("Cursor Pagination with Joins SQL Snapshots", () => {
  const qb = createCursorQueryBuilder(productsWithTranslationsSchema, {
    cursorType: "product",
    tieBreaker: "id",
    defaultSortField: "id",
  });

  it("generates query with join and cursor", () => {
    const sql = qb.getQueryBuilder().buildSelectSql({
      select: ["id", "handle", "translation.value"],
      where: {
        $and: [
          { translation: { searchValue: { $iLike: "%test%" } } },
          {
            $or: [{ id: { $lt: "cursor-id" } }],
          },
        ],
      },
      order: ["id:desc"],
      limit: 11,
    });

    expect(toSqlString(sql)).toMatchInlineSnapshot(`
      "SQL: SELECT "t0_products"."id" AS "id", "t0_products"."handle" AS "handle", "t1_translations"."value" AS "translation.value" FROM "products" AS "t0_products" LEFT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id" WHERE ("t1_translations"."search_value" ilike $1 and "t0_products"."id" < $2) ORDER BY "t0_products"."id" DESC LIMIT $3 OFFSET $4
      Params: ["%test%","cursor-id",11,0]"
    `);
  });

  it("generates query sorting by joined field", () => {
    const sql = qb.getQueryBuilder().buildSelectSql({
      select: ["id", "handle", "translation.value"],
      where: {
        $or: [
          { translation: { value: { $gt: "Test Product" } } },
          {
            translation: { value: { $eq: "Test Product" } },
            id: { $gt: "abc" },
          },
        ],
      },
      order: ["translation.value:asc", "id:asc"],
      limit: 11,
    });

    expect(toSqlString(sql)).toMatchInlineSnapshot(`
      "SQL: SELECT "t0_products"."id" AS "id", "t0_products"."handle" AS "handle", "t1_translations"."value" AS "translation.value" FROM "products" AS "t0_products" LEFT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id" WHERE ("t1_translations"."value" > $1 or ("t1_translations"."value" = $2 and "t0_products"."id" > $3)) ORDER BY "t1_translations"."value" ASC, "t0_products"."id" ASC LIMIT $4 OFFSET $5
      Params: ["Test Product","Test Product","abc",11,0]"
    `);
  });
});
