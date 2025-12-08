import { describe, it, expect } from "vitest";
import { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { format } from "sql-formatter";
import { users, products, translations, events } from "./test/setup.js";
import { createQuery, field } from "../index.js";

// Dialect for SQL serialization
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

// Queries for testing using new fluent API
const usersQuery = createQuery(users, {
  id: field(users.id),
  name: field(users.name),
  age: field(users.age),
  isActive: field(users.isActive),
  createdAt: field(users.createdAt),
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
  translation: field(products.id).leftJoin(translationsQuery, translations.entityId),
});

// Query for qualified table (analytics.events)
const eventsQuery = createQuery(events, {
  id: field(events.id),
  userId: field(events.userId),
  eventType: field(events.eventType),
  payload: field(events.payload),
  createdAt: field(events.createdAt),
});

// Query with join to qualified table (users -> analytics.events)
const usersWithEventsQuery = createQuery(users, {
  id: field(users.id),
  name: field(users.name),
  age: field(users.age),
  isActive: field(users.isActive),
  events: field(users.id).leftJoin(eventsQuery, events.userId),
});

describe("SQL Snapshot Tests", () => {
  describe("Basic SELECT", () => {
    it("should generate SELECT with pagination", () => {
      // Default pagination
      expect(toSqlString(usersQuery.getSql({
        select: ["id", "name", "age"],
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_users"."id" AS "id",
          "t0_users"."name" AS "name",
          "t0_users"."age" AS "age"
        FROM
          "users" AS "t0_users"
        LIMIT
          $1
        OFFSET
          $2
        -- Params: [20,0]"
      `);

      // Custom limit/offset
      expect(toSqlString(usersQuery.getSql({
        select: ["id", "name"],
        limit: 50,
        offset: 10,
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_users"."id" AS "id",
          "t0_users"."name" AS "name"
        FROM
          "users" AS "t0_users"
        LIMIT
          $1
        OFFSET
          $2
        -- Params: [50,10]"
      `);
    });
  });

  describe("WHERE clause operators", () => {
    it("should generate comparison operators ($eq, $neq, $gt, $gte, $lt, $lte)", () => {
      // $eq
      expect(toSqlString(usersQuery.getSql({
        select: ["id", "name"],
        where: { name: { $eq: "Alice" } },
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_users"."id" AS "id",
          "t0_users"."name" AS "name"
        FROM
          "users" AS "t0_users"
        WHERE
          "t0_users"."name" = $1
        LIMIT
          $2
        OFFSET
          $3
        -- Params: ["Alice",20,0]"
      `);

      // $neq
      expect(toSqlString(usersQuery.getSql({
        select: ["id", "name"],
        where: { name: { $neq: "Alice" } },
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_users"."id" AS "id",
          "t0_users"."name" AS "name"
        FROM
          "users" AS "t0_users"
        WHERE
          "t0_users"."name" <> $1
        LIMIT
          $2
        OFFSET
          $3
        -- Params: ["Alice",20,0]"
      `);

      // $gt, $gte, $lt, $lte
      expect(toSqlString(usersQuery.getSql({
        select: ["id", "age"],
        where: { age: { $gt: 30 } },
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_users"."id" AS "id",
          "t0_users"."age" AS "age"
        FROM
          "users" AS "t0_users"
        WHERE
          "t0_users"."age" > $1
        LIMIT
          $2
        OFFSET
          $3
        -- Params: [30,20,0]"
      `);

      expect(toSqlString(usersQuery.getSql({
        select: ["id", "age"],
        where: { age: { $gte: 20, $lte: 40 } },
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_users"."id" AS "id",
          "t0_users"."age" AS "age"
        FROM
          "users" AS "t0_users"
        WHERE
          (
            "t0_users"."age" >= $1
            AND "t0_users"."age" <= $2
          )
        LIMIT
          $3
        OFFSET
          $4
        -- Params: [20,40,20,0]"
      `);
    });

    it("should generate array operators ($in, $notIn)", () => {
      expect(toSqlString(usersQuery.getSql({
        select: ["id", "name"],
        where: { name: { $in: ["Alice", "Bob", "Charlie"] } },
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_users"."id" AS "id",
          "t0_users"."name" AS "name"
        FROM
          "users" AS "t0_users"
        WHERE
          "t0_users"."name" IN ($1, $2, $3)
        LIMIT
          $4
        OFFSET
          $5
        -- Params: ["Alice","Bob","Charlie",20,0]"
      `);

      expect(toSqlString(usersQuery.getSql({
        select: ["id", "name"],
        where: { name: { $notIn: ["Alice", "Bob"] } },
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_users"."id" AS "id",
          "t0_users"."name" AS "name"
        FROM
          "users" AS "t0_users"
        WHERE
          "t0_users"."name" NOT IN ($1, $2)
        LIMIT
          $3
        OFFSET
          $4
        -- Params: ["Alice","Bob",20,0]"
      `);
    });

    it("should generate string operators ($like, $iLike, $notLike, $notILike)", () => {
      expect(toSqlString(usersQuery.getSql({
        select: ["id", "name"],
        where: { name: { $like: "A%" } },
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_users"."id" AS "id",
          "t0_users"."name" AS "name"
        FROM
          "users" AS "t0_users"
        WHERE
          "t0_users"."name" LIKE $1
        LIMIT
          $2
        OFFSET
          $3
        -- Params: ["A%",20,0]"
      `);

      expect(toSqlString(usersQuery.getSql({
        select: ["id", "name"],
        where: { name: { $iLike: "%alice%" } },
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_users"."id" AS "id",
          "t0_users"."name" AS "name"
        FROM
          "users" AS "t0_users"
        WHERE
          "t0_users"."name" ILIKE $1
        LIMIT
          $2
        OFFSET
          $3
        -- Params: ["%alice%",20,0]"
      `);

      expect(toSqlString(usersQuery.getSql({
        select: ["id", "name"],
        where: { name: { $notLike: "A%", $notILike: "%test%" } },
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_users"."id" AS "id",
          "t0_users"."name" AS "name"
        FROM
          "users" AS "t0_users"
        WHERE
          (
            "t0_users"."name" NOT LIKE $1
            AND "t0_users"."name" NOT ILIKE $2
          )
        LIMIT
          $3
        OFFSET
          $4
        -- Params: ["A%","%test%",20,0]"
      `);
    });

    it("should generate null operators ($is, $isNot)", () => {
      expect(toSqlString(usersQuery.getSql({
        select: ["id", "age"],
        where: { age: { $is: null } },
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_users"."id" AS "id",
          "t0_users"."age" AS "age"
        FROM
          "users" AS "t0_users"
        WHERE
          "t0_users"."age" IS NULL
        LIMIT
          $1
        OFFSET
          $2
        -- Params: [20,0]"
      `);

      expect(toSqlString(usersQuery.getSql({
        select: ["id", "age"],
        where: { age: { $isNot: null } },
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_users"."id" AS "id",
          "t0_users"."age" AS "age"
        FROM
          "users" AS "t0_users"
        WHERE
          "t0_users"."age" IS NOT NULL
        LIMIT
          $1
        OFFSET
          $2
        -- Params: [20,0]"
      `);
    });

    it("should generate direct value equality (implicit $eq)", () => {
      expect(toSqlString(usersQuery.getSql({
        select: ["id", "name"],
        where: { name: "Alice" },
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_users"."id" AS "id",
          "t0_users"."name" AS "name"
        FROM
          "users" AS "t0_users"
        WHERE
          "t0_users"."name" = $1
        LIMIT
          $2
        OFFSET
          $3
        -- Params: ["Alice",20,0]"
      `);
    });
  });

  describe("Logical operators", () => {
    it("should generate $and and $or conditions", () => {
      // $and
      expect(toSqlString(usersQuery.getSql({
        select: ["id", "name", "age"],
        where: {
          $and: [
            { age: { $gte: 20 } },
            { age: { $lte: 40 } },
          ],
        },
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_users"."id" AS "id",
          "t0_users"."name" AS "name",
          "t0_users"."age" AS "age"
        FROM
          "users" AS "t0_users"
        WHERE
          (
            "t0_users"."age" >= $1
            AND "t0_users"."age" <= $2
          )
        LIMIT
          $3
        OFFSET
          $4
        -- Params: [20,40,20,0]"
      `);

      // $or
      expect(toSqlString(usersQuery.getSql({
        select: ["id", "name"],
        where: {
          $or: [
            { name: { $eq: "Alice" } },
            { name: { $eq: "Bob" } },
          ],
        },
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_users"."id" AS "id",
          "t0_users"."name" AS "name"
        FROM
          "users" AS "t0_users"
        WHERE
          (
            "t0_users"."name" = $1
            OR "t0_users"."name" = $2
          )
        LIMIT
          $3
        OFFSET
          $4
        -- Params: ["Alice","Bob",20,0]"
      `);

      // Implicit AND for multiple fields
      expect(toSqlString(usersQuery.getSql({
        select: ["id", "name", "age", "isActive"],
        where: {
          name: { $eq: "Alice" },
          age: { $gte: 20 },
          isActive: { $eq: true },
        },
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_users"."id" AS "id",
          "t0_users"."name" AS "name",
          "t0_users"."age" AS "age",
          "t0_users"."is_active" AS "isActive"
        FROM
          "users" AS "t0_users"
        WHERE
          (
            "t0_users"."name" = $1
            AND "t0_users"."age" >= $2
            AND "t0_users"."is_active" = $3
          )
        LIMIT
          $4
        OFFSET
          $5
        -- Params: ["Alice",20,true,20,0]"
      `);
    });

    it("should generate deeply nested logical operators", () => {
      expect(toSqlString(usersQuery.getSql({
        select: ["id", "name", "age", "isActive"],
        where: {
          $and: [
            {
              $or: [
                { $and: [{ name: { $eq: "Alice" } }, { age: { $eq: 25 } }] },
                { $and: [{ name: { $eq: "Bob" } }, { age: { $eq: 30 } }] },
              ],
            },
            { isActive: { $eq: true } },
          ],
        },
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_users"."id" AS "id",
          "t0_users"."name" AS "name",
          "t0_users"."age" AS "age",
          "t0_users"."is_active" AS "isActive"
        FROM
          "users" AS "t0_users"
        WHERE
          (
            (
              (
                "t0_users"."name" = $1
                AND "t0_users"."age" = $2
              )
              OR (
                "t0_users"."name" = $3
                AND "t0_users"."age" = $4
              )
            )
            AND "t0_users"."is_active" = $5
          )
        LIMIT
          $6
        OFFSET
          $7
        -- Params: ["Alice",25,"Bob",30,true,20,0]"
      `);
    });
  });

  describe("JOIN queries", () => {
    it("should generate all JOIN types (LEFT, INNER, RIGHT, FULL)", () => {
      // LEFT JOIN (default) - join added via nested path
      expect(toSqlString(productsWithTranslationsQuery.getSql({
        select: ["id", "handle", "price", "translation.value"],
        where: { translation: { value: { $iLike: "%phone%" } } },
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."handle" AS "handle",
          "t0_products"."price" AS "price",
          "t1_translations"."value" AS "translation.value"
        FROM
          "products" AS "t0_products"
          LEFT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id"
        WHERE
          "t1_translations"."value" ILIKE $1
        LIMIT
          $2
        OFFSET
          $3
        -- Params: ["%phone%",20,0]"
      `);

      // INNER JOIN
      const innerJoinQuery = createQuery(products, {
        id: field(products.id),
        handle: field(products.handle),
        translation: field(products.id).innerJoin(translationsQuery, translations.entityId),
      });
      expect(toSqlString(innerJoinQuery.getSql({
        select: ["id", "handle", "translation.value"],
        where: { translation: { value: { $eq: "Test" } } },
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."handle" AS "handle",
          "t1_translations"."value" AS "translation.value"
        FROM
          "products" AS "t0_products"
          INNER JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id"
        WHERE
          "t1_translations"."value" = $1
        LIMIT
          $2
        OFFSET
          $3
        -- Params: ["Test",20,0]"
      `);

      // RIGHT JOIN
      const rightJoinQuery = createQuery(products, {
        id: field(products.id),
        translation: field(products.id).rightJoin(translationsQuery, translations.entityId),
      });
      expect(toSqlString(rightJoinQuery.getSql({
        select: ["id", "translation.value"],
        where: { translation: { value: { $iLike: "%" } } },
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t1_translations"."value" AS "translation.value"
        FROM
          "products" AS "t0_products"
          RIGHT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id"
        WHERE
          "t1_translations"."value" ILIKE $1
        LIMIT
          $2
        OFFSET
          $3
        -- Params: ["%",20,0]"
      `);

      // FULL JOIN
      const fullJoinQuery = createQuery(products, {
        id: field(products.id),
        translation: field(products.id).fullJoin(translationsQuery, translations.entityId),
      });
      expect(toSqlString(fullJoinQuery.getSql({
        select: ["id", "translation.value"],
        where: { translation: { value: { $iLike: "%" } } },
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t1_translations"."value" AS "translation.value"
        FROM
          "products" AS "t0_products"
          FULL JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id"
        WHERE
          "t1_translations"."value" ILIKE $1
        LIMIT
          $2
        OFFSET
          $3
        -- Params: ["%",20,0]"
      `);
    });

    it("should support nested paths for multi-field joins", () => {
      const multiSelectJoinQuery = createQuery(products, {
        id: field(products.id),
        handle: field(products.handle),
        translation: field(products.id).leftJoin(translationsQuery, translations.entityId),
      });

      // Select nested paths - join added automatically
      expect(toSqlString(multiSelectJoinQuery.getSql({
        select: ["id", "handle", "translation.value", "translation.searchValue"],
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."handle" AS "handle",
          "t1_translations"."value" AS "translation.value",
          "t1_translations"."search_value" AS "translation.searchValue"
        FROM
          "products" AS "t0_products"
          LEFT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id"
        LIMIT
          $1
        OFFSET
          $2
        -- Params: [20,0]"
      `);

      // Order by nested paths - join added automatically
      expect(toSqlString(multiSelectJoinQuery.getSql({
        select: ["id", "handle"],
        order: ["translation.value:asc", "translation.searchValue:desc"],
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."handle" AS "handle"
        FROM
          "products" AS "t0_products"
          LEFT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id"
        ORDER BY
          "t1_translations"."value" ASC,
          "t1_translations"."search_value" DESC
        LIMIT
          $1
        OFFSET
          $2
        -- Params: [20,0]"
      `);

      // No nested path - join field reference still triggers join to allow selection
      // (the join table column is the column specified in the field config)
      expect(toSqlString(multiSelectJoinQuery.getSql({
        select: ["id", "handle", "translation"],
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."handle" AS "handle",
          "t0_products"."id" AS "translation"
        FROM
          "products" AS "t0_products"
        LIMIT
          $1
        OFFSET
          $2
        -- Params: [20,0]"
      `);
    });

    it("should NOT add join when no nested fields used in where/order/select", () => {
      // Only using fields from main table - no join needed
      expect(toSqlString(productsWithTranslationsQuery.getSql({
        select: ["id", "handle", "price"],
        where: {
          price: { $gt: 100 },
        },
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."handle" AS "handle",
          "t0_products"."price" AS "price"
        FROM
          "products" AS "t0_products"
        WHERE
          "t0_products"."price" > $1
        LIMIT
          $2
        OFFSET
          $3
        -- Params: [100,20,0]"
      `);
    });

    it("should generate JOIN combined with regular field filter", () => {
      expect(toSqlString(productsWithTranslationsQuery.getSql({
        select: ["id", "handle", "price", "translation.value"],
        where: {
          price: { $gt: 100 },
          translation: { value: { $iLike: "%phone%" } },
        },
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."handle" AS "handle",
          "t0_products"."price" AS "price",
          "t1_translations"."value" AS "translation.value"
        FROM
          "products" AS "t0_products"
          LEFT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id"
        WHERE
          (
            "t0_products"."price" > $1
            AND "t1_translations"."value" ILIKE $2
          )
        LIMIT
          $3
        OFFSET
          $4
        -- Params: [100,"%phone%",20,0]"
      `);
    });
  });

  describe("Complex queries", () => {
    it("should generate query with all components", () => {
      expect(toSqlString(productsWithTranslationsQuery.getSql({
        select: ["id", "handle", "price", "translation.value"],
        where: {
          $or: [
            { translation: { value: { $iLike: "%phone%" } } },
            { price: { $gt: 1000 } },
          ],
        },
        limit: 50,
        offset: 25,
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_products"."id" AS "id",
          "t0_products"."handle" AS "handle",
          "t0_products"."price" AS "price",
          "t1_translations"."value" AS "translation.value"
        FROM
          "products" AS "t0_products"
          LEFT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id"
        WHERE
          (
            "t1_translations"."value" ILIKE $1
            OR "t0_products"."price" > $2
          )
        LIMIT
          $3
        OFFSET
          $4
        -- Params: ["%phone%",1000,50,25]"
      `);
    });

    it("should respect maxLimit config", () => {
      const limitedQuery = usersQuery.maxLimit(10);
      expect(toSqlString(limitedQuery.getSql({
        select: ["id", "name"],
        limit: 10,
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_users"."id" AS "id",
          "t0_users"."name" AS "name"
        FROM
          "users" AS "t0_users"
        LIMIT
          $1
        OFFSET
          $2
        -- Params: [10,0]"
      `);
    });

    it("should throw when limit exceeds maxLimit", () => {
      const limitedQuery = usersQuery.maxLimit(10);
      expect(() => limitedQuery.getSql({
        select: ["id", "name"],
        limit: 1000,
      })).toThrow("Requested limit 1000 exceeds maximum allowed limit 10");
    });

    it("should handle edge cases (empty where, undefined values)", () => {
      // Empty where
      expect(toSqlString(usersQuery.getSql({
        select: ["id", "name", "age"],
        where: {},
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_users"."id" AS "id",
          "t0_users"."name" AS "name",
          "t0_users"."age" AS "age"
        FROM
          "users" AS "t0_users"
        LIMIT
          $1
        OFFSET
          $2
        -- Params: [20,0]"
      `);

      // Undefined values skipped
      expect(toSqlString(usersQuery.getSql({
        select: ["id", "name", "age"],
        where: { name: undefined, age: { $eq: 25 } },
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_users"."id" AS "id",
          "t0_users"."name" AS "name",
          "t0_users"."age" AS "age"
        FROM
          "users" AS "t0_users"
        WHERE
          "t0_users"."age" = $1
        LIMIT
          $2
        OFFSET
          $3
        -- Params: [25,20,0]"
      `);
    });
  });

  describe("Qualified tables (pgSchema)", () => {
    it("should generate SELECT with schema-qualified table name", () => {
      expect(toSqlString(eventsQuery.getSql({
        select: ["id", "eventType", "payload"],
        where: { eventType: { $eq: "login" } },
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_events"."id" AS "id",
          "t0_events"."event_type" AS "eventType",
          "t0_events"."payload" AS "payload"
        FROM
          "analytics"."events" AS "t0_events"
        WHERE
          "t0_events"."event_type" = $1
        LIMIT
          $2
        OFFSET
          $3
        -- Params: ["login",20,0]"
      `);
    });

    it("should generate JOIN from public table to qualified table", () => {
      expect(toSqlString(usersWithEventsQuery.getSql({
        select: ["id", "name", "events.eventType"],
        where: {
          events: { eventType: { $eq: "purchase" } },
        },
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_users"."id" AS "id",
          "t0_users"."name" AS "name",
          "t1_events"."event_type" AS "events.eventType"
        FROM
          "users" AS "t0_users"
          LEFT JOIN "analytics"."events" AS "t1_events" ON "t0_users"."id" = "t1_events"."user_id"
        WHERE
          "t1_events"."event_type" = $1
        LIMIT
          $2
        OFFSET
          $3
        -- Params: ["purchase",20,0]"
      `);
    });

    it("should generate complex query with qualified table join", () => {
      expect(toSqlString(usersWithEventsQuery.getSql({
        select: ["id", "name", "age", "isActive"],
        where: {
          $and: [
            { isActive: { $eq: true } },
            { age: { $gte: 18 } },
            {
              $or: [
                { events: { eventType: { $eq: "purchase" } } },
                { events: { eventType: { $eq: "subscription" } } },
              ],
            },
          ],
        },
        order: ["events.createdAt:desc"],
        limit: 50,
      }))).toMatchInlineSnapshot(`
        "SELECT
          "t0_users"."id" AS "id",
          "t0_users"."name" AS "name",
          "t0_users"."age" AS "age",
          "t0_users"."is_active" AS "isActive"
        FROM
          "users" AS "t0_users"
          LEFT JOIN "analytics"."events" AS "t1_events" ON "t0_users"."id" = "t1_events"."user_id"
        WHERE
          (
            "t0_users"."is_active" = $1
            AND "t0_users"."age" >= $2
            AND (
              "t1_events"."event_type" = $3
              OR "t1_events"."event_type" = $4
            )
          )
        ORDER BY
          "t1_events"."created_at" DESC
        LIMIT
          $5
        OFFSET
          $6
        -- Params: [true,18,"purchase","subscription",50,0]"
      `);
    });
  });
});
