import { describe, it, expect } from "vitest";
import { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { format } from "sql-formatter";
import { createCursorQueryBuilder } from "./builder.js";
import { encode, decode } from "./cursor.js";
import { createQuery, field, createPaginationQuery } from "../builder.js";
import { createSchema } from "../schema.js";
import { products, translations } from "../test/setup.js";
import { hashFilters } from "./helpers.js";
import type { DrizzleExecutor } from "../types.js";

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

// Create queries using fluent API
const productsQuery = createQuery(products, {
  id: field(products.id),
  handle: field(products.handle),
  price: field(products.price),
  deletedAt: field(products.deletedAt),
});

const translationsQuery = createQuery(translations, {
  id: field(translations.id),
  entityId: field(translations.entityId),
  field: field(translations.field),
  value: field(translations.value),
  searchValue: field(translations.searchValue),
});

const productsWithTranslationsQuery = createQuery(products, {
  id: field(products.id),
  handle: field(products.handle),
  price: field(products.price),
  deletedAt: field(products.deletedAt),
  translation: field(products.id).leftJoin(translationsQuery, translations.entityId),
});

const createProductsPagination = () =>
  createPaginationQuery(productsQuery, {
    name: "product",
    tieBreaker: "id",
  });

// ============ Validation Tests ============

describe("createPaginationQuery (fluent API)", () => {
  describe("validation", () => {
    it("throws when both first and last are provided", () => {
      const qb = createProductsPagination();
      expect(() => qb.getSql({ first: 10, last: 5 })).toThrow(
        "Cannot specify both 'first' and 'last'"
      );
    });

    it("throws when neither first nor last is provided", () => {
      const qb = createProductsPagination();
      expect(() => qb.getSql({})).toThrow(
        "Either 'first' or 'last' must be provided"
      );
    });

    it("throws when first is not positive", () => {
      const qb = createProductsPagination();
      expect(() => qb.getSql({ first: 0 })).toThrow("first must be greater than 0");
      expect(() => qb.getSql({ first: -1 })).toThrow("first must be greater than 0");
    });

    it("throws when last is not positive", () => {
      const qb = createProductsPagination();
      expect(() => qb.getSql({ last: 0 })).toThrow("last must be greater than 0");
    });

    it("throws on invalid cursor type", () => {
      const qb = createProductsPagination();
      const wrongTypeCursor = encode({
        type: "category",
        filtersHash: "",
        seek: [{ field: "id", value: "1", order: "desc" }],
      });

      expect(() => qb.getSql({ first: 10, after: wrongTypeCursor })).toThrow(
        "Expected cursor type 'product', got 'category'"
      );
    });

    it("ignores before cursor when first is used (first takes precedence)", () => {
      const qb = createProductsPagination();
      const filtersHash = hashFilters(undefined);

      const cursor = encode({
        type: "product",
        filtersHash,
        seek: [
          { field: "id", value: "prod-999", order: "desc" },
          { field: "id", value: "prod-999", order: "desc" },
        ],
      });

      // first + before: before cursor should be ignored
      const { meta } = qb.getSql({
        first: 10,
        before: cursor,
        select: ["id"],
      });

      expect(meta.isForward).toBe(true);
      expect(meta.hasCursor).toBe(false); // before is ignored for forward pagination
    });

    it("ignores after cursor when last is used (last takes precedence)", () => {
      const qb = createProductsPagination();
      const filtersHash = hashFilters(undefined);

      const cursor = encode({
        type: "product",
        filtersHash,
        seek: [
          { field: "id", value: "prod-999", order: "desc" },
          { field: "id", value: "prod-999", order: "desc" },
        ],
      });

      // last + after: after cursor should be ignored
      const { meta } = qb.getSql({
        last: 10,
        after: cursor,
        select: ["id"],
      });

      expect(meta.isForward).toBe(false);
      expect(meta.hasCursor).toBe(false); // after is ignored for backward pagination
    });

    it("handles single item request (first: 1)", () => {
      const qb = createProductsPagination();

      const { sql, meta } = qb.getSql({
        first: 1,
        select: ["id"],
      });

      expect(meta.limit).toBe(1);
      // LIMIT should be 2 (1 + 1 for hasMore detection)
      expect(toSqlString(sql)).toContain("Params: [2,0]");
    });

    it("handles single item request (last: 1)", () => {
      const qb = createProductsPagination();

      const { sql, meta } = qb.getSql({
        last: 1,
        select: ["id"],
      });

      expect(meta.limit).toBe(1);
      // LIMIT should be 2 (1 + 1 for hasMore detection)
      expect(toSqlString(sql)).toContain("Params: [2,0]");
    });
  });

  // ============ Cursor Seek Condition Tests ============

  describe("cursor seek conditions", () => {
    it("forward pagination (first) with cursor builds correct WHERE", () => {
      const qb = createProductsPagination();
      const filtersHash = hashFilters(undefined);

      // Default sort is id:desc, so cursor needs: [sort field] + [tie-breaker]
      // Since default sort field IS the tie-breaker, we get id twice
      const cursor = encode({
        type: "product",
        filtersHash,
        seek: [
          { field: "id", value: "prod-123", order: "desc" }, // sort field
          { field: "id", value: "prod-123", order: "desc" }, // tie-breaker
        ],
      });

      const { sql, meta } = qb.getSql({
        first: 10,
        after: cursor,
        select: ["id", "handle"],
      });

      expect(meta.isForward).toBe(true);
      expect(meta.hasCursor).toBe(true);

      // DESC + forward = $lt (seek after current position)
      // When sort field = tie-breaker, the WHERE simplifies (both conditions use same field)
      expect(toSqlString(sql)).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."handle" AS "handle"
        FROM
          "products" AS "t0_products"
        WHERE
          (
            "t0_products"."id" < $1
            OR "t0_products"."id" < $2
          )
        ORDER BY
          "t0_products"."id" DESC,
          "t0_products"."id" DESC
        LIMIT
          $3
        OFFSET
          $4
        -- Params: ["prod-123","prod-123",11,0]"
      `);
    });

    it("forward pagination with two-field cursor (price DESC, id DESC)", () => {
      const qb = createProductsPagination();
      const filtersHash = hashFilters(undefined);

      // order: ["price:desc"] + tie-breaker (id follows price direction = desc)
      const cursor = encode({
        type: "product",
        filtersHash,
        seek: [
          { field: "price", value: 99.99, order: "desc" },
          { field: "id", value: "prod-123", order: "desc" }, // tie-breaker
        ],
      });

      const { sql } = qb.getSql({
        first: 10,
        after: cursor,
        order: ["price:desc"],
        select: ["id", "price"],
      });

      // Lexicographic seek: (price < 99.99) OR (price = 99.99 AND id < "prod-123")
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

    it("forward pagination with ASC sort uses $gt operator", () => {
      const qb = createProductsPagination();
      const filtersHash = hashFilters(undefined);

      // order: ["handle:asc"] + tie-breaker (id follows handle direction = asc)
      const cursor = encode({
        type: "product",
        filtersHash,
        seek: [
          { field: "handle", value: "apple", order: "asc" },
          { field: "id", value: "prod-100", order: "asc" }, // tie-breaker
        ],
      });

      const { sql } = qb.getSql({
        first: 10,
        after: cursor,
        order: ["handle:asc"],
        select: ["id", "handle"],
      });

      // ASC + forward = $gt
      expect(toSqlString(sql)).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."handle" AS "handle"
        FROM
          "products" AS "t0_products"
        WHERE
          (
            "t0_products"."handle" > $1
            OR (
              "t0_products"."handle" = $2
              AND "t0_products"."id" > $3
            )
          )
        ORDER BY
          "t0_products"."handle" ASC,
          "t0_products"."id" ASC
        LIMIT
          $4
        OFFSET
          $5
        -- Params: ["apple","apple","prod-100",11,0]"
      `);
    });

    it("forward pagination with mixed ASC/DESC sort (handle ASC, price DESC)", () => {
      const qb = createProductsPagination();
      const filtersHash = hashFilters(undefined);

      // order: ["handle:asc", "price:desc"] + tie-breaker (id follows LAST sort field = desc)
      const cursor = encode({
        type: "product",
        filtersHash,
        seek: [
          { field: "handle", value: "iphone", order: "asc" },
          { field: "price", value: 999, order: "desc" },
          { field: "id", value: "prod-777", order: "desc" }, // tie-breaker follows price:desc
        ],
      });

      const { sql } = qb.getSql({
        first: 10,
        after: cursor,
        order: ["handle:asc", "price:desc"],
        select: ["id", "handle", "price"],
      });

      // Mixed: handle ASC -> $gt, price DESC -> $lt, id DESC -> $lt
      expect(toSqlString(sql)).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."handle" AS "handle",
          "t0_products"."price" AS "price"
        FROM
          "products" AS "t0_products"
        WHERE
          (
            "t0_products"."handle" > $1
            OR (
              "t0_products"."handle" = $2
              AND "t0_products"."price" < $3
            )
            OR (
              "t0_products"."handle" = $4
              AND "t0_products"."price" = $5
              AND "t0_products"."id" < $6
            )
          )
        ORDER BY
          "t0_products"."handle" ASC,
          "t0_products"."price" DESC,
          "t0_products"."id" DESC
        LIMIT
          $7
        OFFSET
          $8
        -- Params: ["iphone","iphone",999,"iphone",999,"prod-777",11,0]"
      `);
    });

    it("backward pagination (last + before) inverts comparison operators", () => {
      const qb = createProductsPagination();
      const filtersHash = hashFilters(undefined);

      const cursor = encode({
        type: "product",
        filtersHash,
        seek: [
          { field: "price", value: 50, order: "desc" },
          { field: "id", value: "prod-789", order: "desc" },
        ],
      });

      const { sql, meta } = qb.getSql({
        last: 10,
        before: cursor,
        order: ["price:desc"],
        select: ["id", "price"],
      });

      expect(meta.isForward).toBe(false);
      expect(meta.hasCursor).toBe(true);
      expect(meta.invertOrder).toBe(false); // has before cursor, no inversion

      // DESC + backward = $gt (seek before current position)
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
          "t0_products"."price" DESC,
          "t0_products"."id" DESC
        LIMIT
          $4
        OFFSET
          $5
        -- Params: [50,50,"prod-789",11,0]"
      `);
    });

    it("backward pagination without cursor inverts ORDER BY", () => {
      const qb = createProductsPagination();

      const { sql, meta } = qb.getSql({
        last: 10,
        order: ["price:desc"],
        select: ["id", "price"],
      });

      expect(meta.isForward).toBe(false);
      expect(meta.hasCursor).toBe(false);
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

    it("backward pagination (last + before) with ASC sort uses $lt operator", () => {
      const qb = createProductsPagination();
      const filtersHash = hashFilters(undefined);

      const cursor = encode({
        type: "product",
        filtersHash,
        seek: [
          { field: "handle", value: "macbook", order: "asc" },
          { field: "id", value: "prod-500", order: "asc" },
        ],
      });

      const { sql, meta } = qb.getSql({
        last: 10,
        before: cursor,
        order: ["handle:asc"],
        select: ["id", "handle"],
      });

      expect(meta.isForward).toBe(false);
      expect(meta.hasCursor).toBe(true);

      // ASC + backward = $lt (seek before current position)
      expect(toSqlString(sql)).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."handle" AS "handle"
        FROM
          "products" AS "t0_products"
        WHERE
          (
            "t0_products"."handle" < $1
            OR (
              "t0_products"."handle" = $2
              AND "t0_products"."id" < $3
            )
          )
        ORDER BY
          "t0_products"."handle" ASC,
          "t0_products"."id" ASC
        LIMIT
          $4
        OFFSET
          $5
        -- Params: ["macbook","macbook","prod-500",11,0]"
      `);
    });

    it("backward pagination (last + before) with mixed ASC/DESC sort", () => {
      const qb = createProductsPagination();
      const filtersHash = hashFilters(undefined);

      const cursor = encode({
        type: "product",
        filtersHash,
        seek: [
          { field: "handle", value: "iphone", order: "asc" },
          { field: "price", value: 999, order: "desc" },
          { field: "id", value: "prod-777", order: "desc" },
        ],
      });

      const { sql, meta } = qb.getSql({
        last: 10,
        before: cursor,
        order: ["handle:asc", "price:desc"],
        select: ["id", "handle", "price"],
      });

      expect(meta.isForward).toBe(false);
      expect(meta.hasCursor).toBe(true);

      // Mixed backward: handle ASC -> $lt, price DESC -> $gt, id DESC -> $gt
      expect(toSqlString(sql)).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."handle" AS "handle",
          "t0_products"."price" AS "price"
        FROM
          "products" AS "t0_products"
        WHERE
          (
            "t0_products"."handle" < $1
            OR (
              "t0_products"."handle" = $2
              AND "t0_products"."price" > $3
            )
            OR (
              "t0_products"."handle" = $4
              AND "t0_products"."price" = $5
              AND "t0_products"."id" > $6
            )
          )
        ORDER BY
          "t0_products"."handle" ASC,
          "t0_products"."price" DESC,
          "t0_products"."id" DESC
        LIMIT
          $7
        OFFSET
          $8
        -- Params: ["iphone","iphone",999,"iphone",999,"prod-777",11,0]"
      `);
    });

    it("backward pagination without cursor with ASC sort inverts to DESC", () => {
      const qb = createProductsPagination();

      const { sql, meta } = qb.getSql({
        last: 10,
        order: ["handle:asc"],
        select: ["id", "handle"],
      });

      expect(meta.isForward).toBe(false);
      expect(meta.invertOrder).toBe(true);

      // ASC inverted to DESC for last N without cursor
      expect(toSqlString(sql)).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."handle" AS "handle"
        FROM
          "products" AS "t0_products"
        ORDER BY
          "t0_products"."handle" DESC,
          "t0_products"."id" DESC
        LIMIT
          $1
        OFFSET
          $2
        -- Params: [11,0]"
      `);
    });

    it("backward pagination without cursor with mixed sort inverts all directions", () => {
      const qb = createProductsPagination();

      const { sql, meta } = qb.getSql({
        last: 10,
        order: ["handle:asc", "price:desc"],
        select: ["id", "handle", "price"],
      });

      expect(meta.invertOrder).toBe(true);

      // handle:asc -> desc, price:desc -> asc, id (follows price) desc -> asc
      expect(toSqlString(sql)).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."handle" AS "handle",
          "t0_products"."price" AS "price"
        FROM
          "products" AS "t0_products"
        ORDER BY
          "t0_products"."handle" DESC,
          "t0_products"."price" ASC,
          "t0_products"."id" ASC
        LIMIT
          $1
        OFFSET
          $2
        -- Params: [11,0]"
      `);
    });
  });

  // ============ Filters Hash Tests ============

  describe("filtersHash validation", () => {
    it("ignores cursor when filters change", () => {
      const qb = createProductsPagination();

      // Cursor created with different filters (status: active)
      // Default sort is id:desc, so cursor needs sort field + tie-breaker
      const cursor = encode({
        type: "product",
        filtersHash: hashFilters({ status: "active" }),
        seek: [
          { field: "id", value: "prod-123", order: "desc" },
          { field: "id", value: "prod-123", order: "desc" }, // tie-breaker
        ],
      });

      // Query with no filters (different hash)
      const { sql, meta } = qb.getSql({
        first: 10,
        after: cursor,
        select: ["id"],
      });

      expect(meta.filtersChanged).toBe(true);
      expect(meta.hasCursor).toBe(false);

      // No cursor WHERE condition applied, default sort id:desc + tie-breaker id:desc
      expect(toSqlString(sql)).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id"
        FROM
          "products" AS "t0_products"
        ORDER BY
          "t0_products"."id" DESC,
          "t0_products"."id" DESC
        LIMIT
          $1
        OFFSET
          $2
        -- Params: [11,0]"
      `);
    });

    it("uses cursor when filters match", () => {
      const qb = createProductsPagination();
      const filters = { status: "active" };
      const filtersHash = hashFilters(filters);

      // Default sort is id:desc, cursor needs sort + tie-breaker
      const cursor = encode({
        type: "product",
        filtersHash,
        seek: [
          { field: "id", value: "prod-123", order: "desc" },
          { field: "id", value: "prod-123", order: "desc" }, // tie-breaker
        ],
      });

      const { sql, meta } = qb.getSql({
        first: 10,
        after: cursor,
        filters,
        select: ["id"],
      });

      expect(meta.filtersChanged).toBe(false);
      expect(meta.hasCursor).toBe(true);

      // Cursor WHERE condition applied (simplified when sort field = tie-breaker)
      expect(toSqlString(sql)).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id"
        FROM
          "products" AS "t0_products"
        WHERE
          (
            "t0_products"."id" < $1
            OR "t0_products"."id" < $2
          )
        ORDER BY
          "t0_products"."id" DESC,
          "t0_products"."id" DESC
        LIMIT
          $3
        OFFSET
          $4
        -- Params: ["prod-123","prod-123",11,0]"
      `);
    });
  });

  // ============ User Filter + Cursor Combined ============

  describe("user filters combined with cursor", () => {
    it("merges user WHERE with cursor seek condition", () => {
      const qb = createProductsPagination();
      const filtersHash = hashFilters(undefined);

      const cursor = encode({
        type: "product",
        filtersHash,
        seek: [
          { field: "price", value: 75, order: "desc" },
          { field: "id", value: "prod-500", order: "desc" },
        ],
      });

      const { sql } = qb.getSql({
        first: 10,
        after: cursor,
        where: { deletedAt: { $is: null } },
        order: ["price:desc"],
        select: ["id", "price"],
      });

      // User filter AND cursor condition
      expect(toSqlString(sql)).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."price" AS "price"
        FROM
          "products" AS "t0_products"
        WHERE
          (
            "t0_products"."deleted_at" IS NULL
            AND (
              "t0_products"."price" < $1
              OR (
                "t0_products"."price" = $2
                AND "t0_products"."id" < $3
              )
            )
          )
        ORDER BY
          "t0_products"."price" DESC,
          "t0_products"."id" DESC
        LIMIT
          $4
        OFFSET
          $5
        -- Params: [75,75,"prod-500",11,0]"
      `);
    });

    it("complex user filter with cursor", () => {
      const qb = createProductsPagination();
      const filtersHash = hashFilters(undefined);

      const cursor = encode({
        type: "product",
        filtersHash,
        seek: [
          { field: "price", value: 100, order: "desc" },
          { field: "id", value: "prod-999", order: "desc" },
        ],
      });

      const { sql } = qb.getSql({
        first: 10,
        after: cursor,
        where: {
          $and: [
            { price: { $gte: 25, $lte: 200 } },
            {
              $or: [
                { handle: { $iLike: "%premium%" } },
                { handle: { $iLike: "%sale%" } },
              ],
            },
          ],
        },
        order: ["price:desc"],
        select: ["id", "handle", "price"],
      });

      expect(toSqlString(sql)).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."handle" AS "handle",
          "t0_products"."price" AS "price"
        FROM
          "products" AS "t0_products"
        WHERE
          (
            "t0_products"."price" >= $1
            AND "t0_products"."price" <= $2
            AND (
              "t0_products"."handle" ILIKE $3
              OR "t0_products"."handle" ILIKE $4
            )
            AND (
              "t0_products"."price" < $5
              OR (
                "t0_products"."price" = $6
                AND "t0_products"."id" < $7
              )
            )
          )
        ORDER BY
          "t0_products"."price" DESC,
          "t0_products"."id" DESC
        LIMIT
          $8
        OFFSET
          $9
        -- Params: [25,200,"%premium%","%sale%",100,100,"prod-999",11,0]"
      `);
    });
  });

  // ============ Tie-Breaker Tests ============

  describe("tie-breaker handling", () => {
    it("adds tie-breaker to sort when not present", () => {
      const qb = createProductsPagination();

      const { sql, meta } = qb.getSql({
        first: 10,
        order: ["price:desc"],
        select: ["id", "price"],
      });

      // Tie-breaker (id) added automatically
      expect(meta.sortParams).toEqual([{ field: "price", order: "desc" }]);

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

    it("tie-breaker direction follows last sort field direction", () => {
      const qb = createProductsPagination();

      const { sql } = qb.getSql({
        first: 10,
        order: ["handle:asc", "price:asc"],
        select: ["id", "handle", "price"],
      });

      // Tie-breaker follows price ASC -> id ASC
      expect(toSqlString(sql)).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."handle" AS "handle",
          "t0_products"."price" AS "price"
        FROM
          "products" AS "t0_products"
        ORDER BY
          "t0_products"."handle" ASC,
          "t0_products"."price" ASC,
          "t0_products"."id" ASC
        LIMIT
          $1
        OFFSET
          $2
        -- Params: [11,0]"
      `);
    });
  });

  // ============ First Page (No Cursor) Tests ============

  describe("first page without cursor", () => {
    it("forward pagination without cursor - no seek WHERE", () => {
      const qb = createProductsPagination();

      const { sql, meta } = qb.getSql({
        first: 10,
        order: ["price:desc"],
        select: ["id", "price"],
      });

      expect(meta.hasCursor).toBe(false);
      expect(meta.isForward).toBe(true);

      // price:desc + tie-breaker id:desc (follows last sort direction)
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

    it("uses default sort field when no order specified", () => {
      const qb = createProductsPagination();

      const { sql, meta } = qb.getSql({
        first: 10,
        select: ["id"],
      });

      // Default sort field is "id" DESC (from parseSort with defaultSortField)
      expect(meta.sortParams).toEqual([{ field: "id", order: "desc" }]);

      // Order includes default sort + tie-breaker (both id:desc since default IS tie-breaker)
      expect(toSqlString(sql)).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id"
        FROM
          "products" AS "t0_products"
        ORDER BY
          "t0_products"."id" DESC,
          "t0_products"."id" DESC
        LIMIT
          $1
        OFFSET
          $2
        -- Params: [11,0]"
      `);
    });
  });

  // ============ Limit +1 for hasMore Detection ============

  describe("limit calculation", () => {
    it("requests limit + 1 for hasNextPage detection", () => {
      const qb = createProductsPagination();

      const { sql, meta } = qb.getSql({
        first: 10,
        select: ["id"],
      });

      expect(meta.limit).toBe(10);
      // SQL LIMIT should be 11 (first + 1 for hasMore detection)
      expect(toSqlString(sql)).toContain("LIMIT");
      expect(toSqlString(sql)).toContain("Params: [11,0]");
    });

    it("last also requests limit + 1", () => {
      const qb = createProductsPagination();

      const { sql, meta } = qb.getSql({
        last: 5,
        select: ["id"],
      });

      expect(meta.limit).toBe(5);
      // SQL LIMIT should be 6 (last + 1 for hasMore detection)
      expect(toSqlString(sql)).toContain("Params: [6,0]");
    });
  });

  // ============ Cursor Order Mismatch ============

  describe("cursor order mismatch", () => {
    it("throws when cursor sort order differs from query order", () => {
      const qb = createProductsPagination();
      const filtersHash = hashFilters(undefined);

      // Cursor was created with price:desc
      const cursor = encode({
        type: "product",
        filtersHash,
        seek: [
          { field: "price", value: 100, order: "desc" },
          { field: "id", value: "prod-1", order: "desc" },
        ],
      });

      // But now querying with handle:asc
      expect(() =>
        qb.getSql({
          first: 10,
          after: cursor,
          order: ["handle:asc"],
          select: ["id"],
        })
      ).toThrow("field mismatch");
    });

    it("throws when cursor direction differs from query direction", () => {
      const qb = createProductsPagination();
      const filtersHash = hashFilters(undefined);

      // Cursor was created with price:desc
      const cursor = encode({
        type: "product",
        filtersHash,
        seek: [
          { field: "price", value: 100, order: "desc" },
          { field: "id", value: "prod-1", order: "desc" },
        ],
      });

      // But now querying with price:asc
      expect(() =>
        qb.getSql({
          first: 10,
          after: cursor,
          order: ["price:asc"],
          select: ["id"],
        })
      ).toThrow("order mismatch");
    });

    it("throws when cursor has wrong number of seek values", () => {
      const qb = createProductsPagination();
      const filtersHash = hashFilters(undefined);

      // Cursor has 3 seek values (for two-field sort)
      const cursor = encode({
        type: "product",
        filtersHash,
        seek: [
          { field: "handle", value: "test", order: "asc" },
          { field: "price", value: 100, order: "desc" },
          { field: "id", value: "prod-1", order: "desc" },
        ],
      });

      // But querying with single field sort
      expect(() =>
        qb.getSql({
          first: 10,
          after: cursor,
          order: ["price:desc"],
          select: ["id"],
        })
      ).toThrow("length mismatch");
    });
  });

  // ============ NULL Values in Cursor ============

  describe("null values in cursor", () => {
    it("handles null value in cursor seek field", () => {
      const qb = createProductsPagination();
      const filtersHash = hashFilters(undefined);

      const cursor = encode({
        type: "product",
        filtersHash,
        seek: [
          { field: "deletedAt", value: null, order: "desc" },
          { field: "id", value: "prod-123", order: "desc" },
        ],
      });

      const { sql } = qb.getSql({
        first: 10,
        after: cursor,
        order: ["deletedAt:desc"],
        select: ["id", "deletedAt"],
      });

      // NULL comparisons should still generate valid SQL
      expect(toSqlString(sql)).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."deleted_at" AS "deletedAt"
        FROM
          "products" AS "t0_products"
        WHERE
          (
            "t0_products"."deleted_at" < $1
            OR (
              "t0_products"."deleted_at" = $2
              AND "t0_products"."id" < $3
            )
          )
        ORDER BY
          "t0_products"."deleted_at" DESC,
          "t0_products"."id" DESC
        LIMIT
          $4
        OFFSET
          $5
        -- Params: [null,null,"prod-123",11,0]"
      `);
    });

    it("handles undefined value in cursor (treated as null)", () => {
      const qb = createProductsPagination();
      const filtersHash = hashFilters(undefined);

      const cursor = encode({
        type: "product",
        filtersHash,
        seek: [
          { field: "price", value: undefined as unknown, order: "desc" },
          { field: "id", value: "prod-456", order: "desc" },
        ],
      });

      const { sql } = qb.getSql({
        first: 10,
        after: cursor,
        order: ["price:desc"],
        select: ["id", "price"],
      });

      expect(toSqlString(sql)).toContain('"t0_products"."price" <');
    });
  });

  // ============ With Joins ============

  describe("cursor with joins", () => {
    const createJoinedPagination = () =>
      createPaginationQuery(productsWithTranslationsQuery, {
        name: "product",
        tieBreaker: "id",
      });

    it("cursor on joined field builds correct seek", () => {
      const qb = createJoinedPagination();
      const filtersHash = hashFilters(undefined);

      const cursor = encode({
        type: "product",
        filtersHash,
        seek: [
          { field: "translation.value", value: "Apple iPhone", order: "asc" },
          { field: "id", value: "prod-001", order: "asc" },
        ],
      });

      const { sql } = qb.getSql({
        first: 10,
        after: cursor,
        order: ["translation.value:asc"],
        select: ["id", "translation.value"],
      });

      expect(toSqlString(sql)).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t1_translations"."value" AS "translation.value"
        FROM
          "products" AS "t0_products"
          LEFT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id"
        WHERE
          (
            "t1_translations"."value" > $1
            OR (
              "t1_translations"."value" = $2
              AND "t0_products"."id" > $3
            )
          )
        ORDER BY
          "t1_translations"."value" ASC,
          "t0_products"."id" ASC
        LIMIT
          $4
        OFFSET
          $5
        -- Params: ["Apple iPhone","Apple iPhone","prod-001",11,0]"
      `);
    });

    it("filter on joined field with cursor", () => {
      const qb = createJoinedPagination();
      const filtersHash = hashFilters(undefined);

      const cursor = encode({
        type: "product",
        filtersHash,
        seek: [
          { field: "price", value: 599, order: "desc" },
          { field: "id", value: "prod-100", order: "desc" },
        ],
      });

      const { sql } = qb.getSql({
        first: 10,
        after: cursor,
        where: {
          translation: { searchValue: { $iLike: "%laptop%" } },
        },
        order: ["price:desc"],
        select: ["id", "price", "translation.value"],
      });

      expect(toSqlString(sql)).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."price" AS "price",
          "t1_translations"."value" AS "translation.value"
        FROM
          "products" AS "t0_products"
          LEFT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id"
        WHERE
          (
            "t1_translations"."search_value" ILIKE $1
            AND (
              "t0_products"."price" < $2
              OR (
                "t0_products"."price" = $3
                AND "t0_products"."id" < $4
              )
            )
          )
        ORDER BY
          "t0_products"."price" DESC,
          "t0_products"."id" DESC
        LIMIT
          $5
        OFFSET
          $6
        -- Params: ["%laptop%",599,599,"prod-100",11,0]"
      `);
    });
  });

  describe("advanced usage", () => {
    it("exposes the underlying FluentQueryBuilder through getQueryBuilder", () => {
      const qb = createProductsPagination();
      const queryBuilder = qb.getQueryBuilder();

      expect(queryBuilder).toBe(qb.getQueryBuilder());

      const sql = queryBuilder.getSql({
        select: ["id"],
        limit: 5,
        order: ["id:asc"],
      });

      const sqlString = toSqlString(sql);
      expect(sqlString).toContain("LIMIT\n  $1");
      expect(sqlString).toContain("-- Params: [5,0]");
    });

    it("returns configuration through getConfig", () => {
      const qb = createProductsPagination();
      const config = qb.getConfig();

      expect(config).toEqual({
        name: "product",
        tieBreaker: "id",
      });
    });
  });
});

// ============ Lower-Level createCursorQueryBuilder Tests ============
// These tests use the lower-level API with ObjectSchema

describe("createCursorQueryBuilder (legacy API)", () => {
  // For backward compatibility testing with ObjectSchema API
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

  const createProductsQb = () =>
    createCursorQueryBuilder(productsSchema, {
      cursorType: "product",
      tieBreaker: "id",
    });

  describe("mapResult transformation", () => {
    it("applies mapResult transformation before returning nodes", async () => {
      const mappedIds: string[] = [];
      const qb = createCursorQueryBuilder(productsSchema, {
        cursorType: "product",
        tieBreaker: "id",
        mapResult: (row) => {
          const typedRow = row as { id: string; handle?: string };
          mappedIds.push(typedRow.id);
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

      const result = await qb.query(fakeDb, {
        first: 1,
        select: ["id", "handle"],
      });

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].node).toEqual({ identifier: "ALPHA" });
      expect(mappedIds).toEqual(["prod_1"]);
      expect(result.pageInfo.hasNextPage).toBe(true);
    });
  });

  describe("getQueryBuilder access", () => {
    it("exposes the underlying QueryBuilder through getQueryBuilder", () => {
      const qb = createProductsQb();
      const queryBuilder = qb.getQueryBuilder();

      expect(queryBuilder).toBe(qb.getQueryBuilder());

      const sql = queryBuilder.buildSelectSql({
        select: ["id"],
        limit: 5,
        order: ["id:asc"],
      } as never);

      const sqlString = toSqlString(sql);
      expect(sqlString).toContain("LIMIT\n  $1");
      expect(sqlString).toContain("-- Params: [5,0]");
    });
  });
});

// ============ Cursor Encode/Decode Tests ============

describe("cursor encode/decode", () => {
  it("encode creates valid base64url string", () => {
    const params = {
      type: "product",
      filtersHash: "abc123",
      seek: [{ field: "id", value: "prod-1", order: "desc" as const }],
    };

    const encoded = encode(params);
    expect(typeof encoded).toBe("string");
    expect(encoded).not.toContain("+");
    expect(encoded).not.toContain("/");
    expect(encoded).not.toContain("=");
  });

  it("decode restores original params", () => {
    const params = {
      type: "product",
      filtersHash: "abc123",
      seek: [
        { field: "price", value: 99.99, order: "desc" as const },
        { field: "id", value: "prod-1", order: "desc" as const },
      ],
    };

    const encoded = encode(params);
    const decoded = decode(encoded);

    expect(decoded).toEqual(params);
  });

  it("decode throws on invalid cursor", () => {
    expect(() => decode("not-valid-base64!!!")).toThrow();
    expect(() => decode("")).toThrow("Cursor string is empty");
  });

  it("encode throws on empty seek", () => {
    expect(() =>
      encode({
        type: "product",
        filtersHash: "",
        seek: [],
      })
    ).toThrow("Seek values cannot be empty");
  });

  it("encode throws on empty type", () => {
    expect(() =>
      encode({
        type: "",
        filtersHash: "",
        seek: [{ field: "id", value: "1", order: "desc" }],
      })
    ).toThrow("Cursor type cannot be empty");
  });
});
