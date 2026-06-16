import { describe, it, expect } from "vitest";
import { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { format } from "sql-formatter";
import { createBaseCursorBuilder } from "../../cursor/base-builder.js";
import { encode, decode } from "../../cursor/cursor.js";
import { createSchema } from "../../schema.js";
import { products } from "../test/setup.js";
import { hashFilters } from "../../cursor/helpers.js";
import type { DrizzleExecutor } from "../../types.js";

// ============ Test Setup ============

const dialect = new PgDialect();

function toSqlString(sqlObj: SQL): string {
  const query = dialect.sqlToQuery(sqlObj);
  const formatted = format(query.sql, {
    language: "postgresql",
    tabWidth: 2,
    keywordCase: "upper",
  });
  return `${formatted}\n-- Params: ${JSON.stringify(query.params)}`;
}

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

const createProductsBuilder = () =>
  createBaseCursorBuilder(productsSchema, {
    cursorType: "product",
    tieBreaker: "id",
  });

// ============ Base Builder Tests ============

describe("createBaseCursorBuilder", () => {
  describe("validation", () => {
    it("throws when limit is not positive", () => {
      const builder = createProductsBuilder();
      expect(() =>
        builder.getSql({ limit: 0, direction: "forward", select: ["id"] })
      ).toThrow("limit must be greater than 0");
      expect(() =>
        builder.getSql({ limit: -1, direction: "forward", select: ["id"] })
      ).toThrow("limit must be greater than 0");
    });

    it("throws on invalid cursor type", () => {
      const builder = createProductsBuilder();
      const wrongTypeCursor = encode({
        type: "category",
        filtersHash: "",
        seek: [{ field: "id", value: "1", direction: "desc" }],
      });

      expect(() =>
        builder.getSql({
          limit: 10,
          direction: "forward",
          cursor: wrongTypeCursor,
          select: ["id"],
        })
      ).toThrow("Expected cursor type 'product', got 'category'");
    });
  });

  describe("forward pagination", () => {
    it("generates correct SQL for forward pagination without cursor", () => {
      const builder = createProductsBuilder();

      const { sql, meta } = builder.getSql({
        limit: 10,
        direction: "forward",
        orderBy: [{ field: "price", direction: "desc" }],
        select: ["id", "price"],
      });

      expect(meta.direction).toBe("forward");
      expect(meta.limit).toBe(10);
      expect(meta.hasCursor).toBe(false);
      expect(meta.invertOrder).toBe(false);

      expect(toSqlString(sql)).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."price" AS "price"
        FROM
          "products" AS "t0_products"
        ORDER BY
          "t0_products"."price" DESC,
          "t0_products"."id" DESC
        LIMIT
          $1
        OFFSET
          $2
        -- Params: [11,0]"
      `);
    });

    it("generates correct SQL for forward pagination with cursor", () => {
      const builder = createProductsBuilder();
      const filtersHash = hashFilters(undefined);

      const cursor = encode({
        type: "product",
        filtersHash,
        seek: [
          { field: "price", value: 99.99, direction: "desc" },
          { field: "id", value: "prod-123", direction: "desc" },
        ],
      });

      const { sql, meta } = builder.getSql({
        limit: 10,
        direction: "forward",
        cursor,
        orderBy: [{ field: "price", direction: "desc" }],
        select: ["id", "price"],
      });

      expect(meta.hasCursor).toBe(true);

      expect(toSqlString(sql)).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."price" AS "price"
        FROM
          "products" AS "t0_products"
        WHERE
          (
            "t0_products"."price" < $1
            OR (
              "t0_products"."price" = $2
              AND "t0_products"."id" < $3
            )
          )
        ORDER BY
          "t0_products"."price" DESC,
          "t0_products"."id" DESC
        LIMIT
          $4
        OFFSET
          $5
        -- Params: [99.99,99.99,"prod-123",11,0]"
      `);
    });
  });

  describe("backward pagination", () => {
    it("inverts ORDER BY for backward pagination without cursor", () => {
      const builder = createProductsBuilder();

      const { sql, meta } = builder.getSql({
        limit: 10,
        direction: "backward",
        orderBy: [{ field: "price", direction: "desc" }],
        select: ["id", "price"],
      });

      expect(meta.direction).toBe("backward");
      expect(meta.invertOrder).toBe(true);

      // Order is inverted: price ASC, id ASC (to get last N items)
      expect(toSqlString(sql)).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."price" AS "price"
        FROM
          "products" AS "t0_products"
        ORDER BY
          "t0_products"."price" ASC,
          "t0_products"."id" ASC
        LIMIT
          $1
        OFFSET
          $2
        -- Params: [11,0]"
      `);
    });

    it("generates correct SQL for backward pagination with cursor", () => {
      const builder = createProductsBuilder();
      const filtersHash = hashFilters(undefined);

      const cursor = encode({
        type: "product",
        filtersHash,
        seek: [
          { field: "price", value: 50, direction: "desc" },
          { field: "id", value: "prod-789", direction: "desc" },
        ],
      });

      const { sql, meta } = builder.getSql({
        limit: 10,
        direction: "backward",
        cursor,
        orderBy: [{ field: "price", direction: "desc" }],
        select: ["id", "price"],
      });

      expect(meta.hasCursor).toBe(true);
      expect(meta.invertOrder).toBe(true); // backward always inverts order

      // DESC + backward = _gt (seek before current position), order inverted
      expect(toSqlString(sql)).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."price" AS "price"
        FROM
          "products" AS "t0_products"
        WHERE
          (
            "t0_products"."price" > $1
            OR (
              "t0_products"."price" = $2
              AND "t0_products"."id" > $3
            )
          )
        ORDER BY
          "t0_products"."price" ASC,
          "t0_products"."id" ASC
        LIMIT
          $4
        OFFSET
          $5
        -- Params: [50,50,"prod-789",11,0]"
      `);
    });
  });

  describe("filters handling", () => {
    it("ignores cursor when filters change", () => {
      const builder = createProductsBuilder();

      const cursor = encode({
        type: "product",
        filtersHash: hashFilters({ status: "active" }),
        seek: [
          { field: "id", value: "prod-123", direction: "desc" },
          { field: "id", value: "prod-123", direction: "desc" },
        ],
      });

      const { meta } = builder.getSql({
        limit: 10,
        direction: "forward",
        cursor,
        select: ["id"],
      });

      expect(meta.filtersChanged).toBe(true);
      expect(meta.hasCursor).toBe(false);
    });

    it("uses cursor when filters match", () => {
      const builder = createProductsBuilder();
      const filters = { status: "active" };
      const filtersHash = hashFilters(filters);

      const cursor = encode({
        type: "product",
        filtersHash,
        seek: [
          { field: "id", value: "prod-123", direction: "desc" },
          { field: "id", value: "prod-123", direction: "desc" },
        ],
      });

      const { meta } = builder.getSql({
        limit: 10,
        direction: "forward",
        cursor,
        filters,
        select: ["id"],
      });

      expect(meta.filtersChanged).toBe(false);
      expect(meta.hasCursor).toBe(true);
    });
  });

  describe("query execution", () => {
    it("returns correct result structure", async () => {
      const builder = createProductsBuilder();

      const fakeDb: DrizzleExecutor = {
        async execute() {
          return {
            rows: [
              { id: "prod_1", handle: "alpha", price: 100 },
              { id: "prod_2", handle: "bravo", price: 200 },
              { id: "prod_3", handle: "charlie", price: 300 },
            ],
          };
        },
      };

      const result = await builder.query(fakeDb, {
        limit: 2,
        direction: "forward",
        orderBy: [{ field: "price", direction: "asc" }],
        select: ["id", "handle", "price"],
      });

      // Should return 2 items (limit) and hasMore = true (3 > 2)
      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.cursors).toHaveLength(2);
      expect(result.startCursor).toBe(result.cursors[0]);
      expect(result.endCursor).toBe(result.cursors[1]);
      expect(result.filtersChanged).toBe(false);
      expect(result.sortParams).toEqual([{ field: "price", direction: "asc" }]);
    });

    it("returns hasMore = false when no more items", async () => {
      const builder = createProductsBuilder();

      const fakeDb: DrizzleExecutor = {
        async execute() {
          return {
            rows: [
              { id: "prod_1", handle: "alpha", price: 100 },
            ],
          };
        },
      };

      const result = await builder.query(fakeDb, {
        limit: 10,
        direction: "forward",
        select: ["id", "handle"],
      });

      expect(result.items).toHaveLength(1);
      expect(result.hasMore).toBe(false);
    });

    it("returns empty result for no rows", async () => {
      const builder = createProductsBuilder();

      const fakeDb: DrizzleExecutor = {
        async execute() {
          return { rows: [] };
        },
      };

      const result = await builder.query(fakeDb, {
        limit: 10,
        direction: "forward",
        select: ["id"],
      });

      expect(result.items).toHaveLength(0);
      expect(result.cursors).toHaveLength(0);
      expect(result.hasMore).toBe(false);
      expect(result.startCursor).toBeNull();
      expect(result.endCursor).toBeNull();
    });

    it("reverses items for backward pagination without cursor", async () => {
      const builder = createProductsBuilder();

      const fakeDb: DrizzleExecutor = {
        async execute() {
          // DB returns inverted order: oldest first
          return {
            rows: [
              { id: "prod_1", handle: "alpha", price: 100 },
              { id: "prod_2", handle: "bravo", price: 200 },
            ],
          };
        },
      };

      const result = await builder.query(fakeDb, {
        limit: 2,
        direction: "backward",
        orderBy: [{ field: "price", direction: "desc" }],
        select: ["id", "handle", "price"],
      });

      // Items should be reversed to restore natural order
      expect(result.items[0].id).toBe("prod_2");
      expect(result.items[1].id).toBe("prod_1");
    });

    it("applies mapResult transformation", async () => {
      const builder = createBaseCursorBuilder(productsSchema, {
        cursorType: "product",
        tieBreaker: "id",
        mapResult: (row) => {
          const typedRow = row as { id: string; handle?: string };
          return {
            identifier: (typedRow.handle ?? "").toUpperCase(),
          };
        },
      });

      const fakeDb: DrizzleExecutor = {
        async execute() {
          return {
            rows: [
              { id: "prod_1", handle: "alpha" },
              { id: "prod_2", handle: "bravo" },
            ],
          };
        },
      };

      const result = await builder.query(fakeDb, {
        limit: 1,
        direction: "forward",
        select: ["id", "handle"],
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({ identifier: "ALPHA" });
    });
  });

  describe("cursor generation", () => {
    it("generates valid decodable cursors for each item", async () => {
      const builder = createProductsBuilder();

      const fakeDb: DrizzleExecutor = {
        async execute() {
          return {
            rows: [
              { id: "prod_1", handle: "alpha", price: 100 },
              { id: "prod_2", handle: "bravo", price: 200 },
            ],
          };
        },
      };

      const result = await builder.query(fakeDb, {
        limit: 10,
        direction: "forward",
        orderBy: [{ field: "price", direction: "asc" }],
        select: ["id", "handle", "price"],
      });

      expect(result.cursors).toHaveLength(2);

      // Verify first cursor
      const decoded1 = decode(result.cursors[0]);
      expect(decoded1.type).toBe("product");
      expect(decoded1.seek).toHaveLength(2); // price + id
      expect(decoded1.seek[0].field).toBe("price");
      expect(decoded1.seek[0].value).toBe(100);
      expect(decoded1.seek[1].field).toBe("id");
      expect(decoded1.seek[1].value).toBe("prod_1");

      // Verify second cursor
      const decoded2 = decode(result.cursors[1]);
      expect(decoded2.seek[0].value).toBe(200);
      expect(decoded2.seek[1].value).toBe("prod_2");
    });

    it("applies encode transform to cursor seek values", async () => {
      const builder = createBaseCursorBuilder(productsSchema, {
        cursorType: "product",
        tieBreaker: "id",
        seekTransforms: {
          id: {
            encode: (v) => `global-id-${v}`,
            decode: (v) => (v as string).replace("global-id-", ""),
          },
        },
      });

      const fakeDb: DrizzleExecutor = {
        async execute() {
          return {
            rows: [
              { id: "uuid-123", handle: "alpha", price: 100 },
            ],
          };
        },
      };

      const result = await builder.query(fakeDb, {
        limit: 10,
        direction: "forward",
        select: ["id", "handle", "price"],
      });

      expect(result.cursors).toHaveLength(1);

      // Verify cursor contains encoded id
      const decoded = decode(result.cursors[0]);
      expect(decoded.seek[0].field).toBe("id");
      expect(decoded.seek[0].value).toBe("global-id-uuid-123");
    });

    it("applies encode transform to sort field and tieBreaker", async () => {
      const builder = createBaseCursorBuilder(productsSchema, {
        cursorType: "product",
        tieBreaker: "id",
        seekTransforms: {
          id: {
            encode: (v) => `encoded-${v}`,
            decode: (v) => (v as string).replace("encoded-", ""),
          },
          price: {
            encode: (v) => `price-${v}`,
            decode: (v) => parseInt((v as string).replace("price-", ""), 10),
          },
        },
      });

      const fakeDb: DrizzleExecutor = {
        async execute() {
          return {
            rows: [
              { id: "uuid-1", price: 50 },
            ],
          };
        },
      };

      const result = await builder.query(fakeDb, {
        limit: 10,
        direction: "forward",
        orderBy: [{ field: "price", direction: "desc" }],
        select: ["id", "price"],
      });

      const decoded = decode(result.cursors[0]);
      expect(decoded.seek).toHaveLength(2);
      expect(decoded.seek[0].field).toBe("price");
      expect(decoded.seek[0].value).toBe("price-50");
      expect(decoded.seek[1].field).toBe("id");
      expect(decoded.seek[1].value).toBe("encoded-uuid-1");
    });

    it("does not transform fields without seekTransforms", async () => {
      const builder = createBaseCursorBuilder(productsSchema, {
        cursorType: "product",
        tieBreaker: "id",
        seekTransforms: {
          id: {
            encode: (v) => `global-${v}`,
            decode: (v) => (v as string).replace("global-", ""),
          },
        },
      });

      const fakeDb: DrizzleExecutor = {
        async execute() {
          return {
            rows: [
              { id: "uuid-1", price: 99 },
            ],
          };
        },
      };

      const result = await builder.query(fakeDb, {
        limit: 10,
        direction: "forward",
        orderBy: [{ field: "price", direction: "desc" }],
        select: ["id", "price"],
      });

      const decoded = decode(result.cursors[0]);
      // price should not be transformed
      expect(decoded.seek[0].value).toBe(99);
      // id should be transformed
      expect(decoded.seek[1].value).toBe("global-uuid-1");
    });
  });

  describe("seekTransforms in cursor WHERE", () => {
    it("applies decode transform when using cursor", async () => {
      const builder = createBaseCursorBuilder(productsSchema, {
        cursorType: "product",
        tieBreaker: "id",
        seekTransforms: {
          id: {
            encode: (v) => `global-${v}`,
            decode: (v) => (v as string).replace("global-", ""),
          },
        },
      });

      // Cursor with encoded global ID
      // When no orderBy, default sort is by tieBreaker (id) desc
      // Cursor needs: sort fields + tieBreaker = 1 + 1 = 2 seek values
      const cursor = encode({
        type: "product",
        filtersHash: hashFilters(null),
        seek: [
          { field: "id", value: "global-uuid-123", direction: "desc" }, // sort field
          { field: "id", value: "global-uuid-123", direction: "desc" }, // tieBreaker
        ],
      });

      const { sql } = builder.getSql({
        limit: 10,
        direction: "forward",
        cursor,
        select: ["id"],
      });

      // SQL should contain decoded UUID, not global ID
      const sqlString = toSqlString(sql);
      expect(sqlString).toContain("uuid-123");
      expect(sqlString).not.toContain("global-uuid-123");
    });
  });
});
