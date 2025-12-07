import { describe, it, expect } from "vitest";
import { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { users, products, translations } from "./test/setup.js";
import { createQueryBuilder } from "./builder.js";
import { createSchema } from "./schema.js";

// Dialect for SQL serialization
const dialect = new PgDialect();

// Schemas for testing
const usersSchema = createSchema({
  table: users,
  tableName: "users",
  fields: {
    id: { column: "id" },
    name: { column: "name" },
    age: { column: "age" },
    isActive: { column: "is_active" },
    createdAt: { column: "created_at" },
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
    translation: {
      column: "id",
      join: {
        schema: () => translationsSchema,
        column: "entityId",
      },
    },
  },
});

/**
 * Helper to convert SQL object to readable string with params
 */
function toSqlString(sqlObj: SQL): string {
  const query = dialect.sqlToQuery(sqlObj);
  return `SQL: ${query.sql}\nParams: ${JSON.stringify(query.params)}`;
}

describe("SQL Snapshot Tests", () => {
  describe("Basic SELECT", () => {
    it("should generate SELECT with pagination", () => {
      const qb = createQueryBuilder(usersSchema);

      // Default pagination
      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "name", "age"],
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name", "t0_users"."age" FROM "users" AS "t0_users"  LIMIT $1 OFFSET $2
        Params: [20,0]"
      `);

      // Custom limit/offset
      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "name"],
        limit: 50,
        offset: 10,
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name" FROM "users" AS "t0_users"  LIMIT $1 OFFSET $2
        Params: [50,10]"
      `);
    });
  });

  describe("WHERE clause operators", () => {
    it("should generate comparison operators ($eq, $neq, $gt, $gte, $lt, $lte)", () => {
      const qb = createQueryBuilder(usersSchema);

      // $eq
      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "name"],
        where: { name: { $eq: "Alice" } },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name" FROM "users" AS "t0_users" WHERE "t0_users"."name" = $1 LIMIT $2 OFFSET $3
        Params: ["Alice",20,0]"
      `);

      // $neq
      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "name"],
        where: { name: { $neq: "Alice" } },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name" FROM "users" AS "t0_users" WHERE "t0_users"."name" <> $1 LIMIT $2 OFFSET $3
        Params: ["Alice",20,0]"
      `);

      // $gt, $gte, $lt, $lte
      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "age"],
        where: { age: { $gt: 30 } },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."age" FROM "users" AS "t0_users" WHERE "t0_users"."age" > $1 LIMIT $2 OFFSET $3
        Params: [30,20,0]"
      `);

      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "age"],
        where: { age: { $gte: 20, $lte: 40 } },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."age" FROM "users" AS "t0_users" WHERE ("t0_users"."age" >= $1 and "t0_users"."age" <= $2) LIMIT $3 OFFSET $4
        Params: [20,40,20,0]"
      `);
    });

    it("should generate array operators ($in, $notIn)", () => {
      const qb = createQueryBuilder(usersSchema);

      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "name"],
        where: { name: { $in: ["Alice", "Bob", "Charlie"] } },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name" FROM "users" AS "t0_users" WHERE "t0_users"."name" in ($1, $2, $3) LIMIT $4 OFFSET $5
        Params: ["Alice","Bob","Charlie",20,0]"
      `);

      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "name"],
        where: { name: { $notIn: ["Alice", "Bob"] } },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name" FROM "users" AS "t0_users" WHERE "t0_users"."name" not in ($1, $2) LIMIT $3 OFFSET $4
        Params: ["Alice","Bob",20,0]"
      `);
    });

    it("should generate string operators ($like, $iLike, $notLike, $notILike)", () => {
      const qb = createQueryBuilder(usersSchema);

      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "name"],
        where: { name: { $like: "A%" } },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name" FROM "users" AS "t0_users" WHERE "t0_users"."name" like $1 LIMIT $2 OFFSET $3
        Params: ["A%",20,0]"
      `);

      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "name"],
        where: { name: { $iLike: "%alice%" } },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name" FROM "users" AS "t0_users" WHERE "t0_users"."name" ilike $1 LIMIT $2 OFFSET $3
        Params: ["%alice%",20,0]"
      `);

      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "name"],
        where: { name: { $notLike: "A%", $notILike: "%test%" } },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name" FROM "users" AS "t0_users" WHERE ("t0_users"."name" not like $1 and "t0_users"."name" not ilike $2) LIMIT $3 OFFSET $4
        Params: ["A%","%test%",20,0]"
      `);
    });

    it("should generate null operators ($is, $isNot)", () => {
      const qb = createQueryBuilder(usersSchema);

      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "age"],
        where: { age: { $is: null } },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."age" FROM "users" AS "t0_users" WHERE "t0_users"."age" is null LIMIT $1 OFFSET $2
        Params: [20,0]"
      `);

      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "age"],
        where: { age: { $isNot: null } },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."age" FROM "users" AS "t0_users" WHERE "t0_users"."age" is not null LIMIT $1 OFFSET $2
        Params: [20,0]"
      `);
    });

    it("should generate direct value equality (implicit $eq)", () => {
      const qb = createQueryBuilder(usersSchema);
      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "name"],
        where: { name: "Alice" },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name" FROM "users" AS "t0_users" WHERE "t0_users"."name" = $1 LIMIT $2 OFFSET $3
        Params: ["Alice",20,0]"
      `);
    });
  });

  describe("Logical operators", () => {
    it("should generate $and and $or conditions", () => {
      const qb = createQueryBuilder(usersSchema);

      // $and
      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "name", "age"],
        where: {
          $and: [
            { age: { $gte: 20 } },
            { age: { $lte: 40 } },
          ],
        },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name", "t0_users"."age" FROM "users" AS "t0_users" WHERE ("t0_users"."age" >= $1 and "t0_users"."age" <= $2) LIMIT $3 OFFSET $4
        Params: [20,40,20,0]"
      `);

      // $or
      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "name"],
        where: {
          $or: [
            { name: { $eq: "Alice" } },
            { name: { $eq: "Bob" } },
          ],
        },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name" FROM "users" AS "t0_users" WHERE ("t0_users"."name" = $1 or "t0_users"."name" = $2) LIMIT $3 OFFSET $4
        Params: ["Alice","Bob",20,0]"
      `);

      // Implicit AND for multiple fields
      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "name", "age", "isActive"],
        where: {
          name: { $eq: "Alice" },
          age: { $gte: 20 },
          isActive: { $eq: true },
        },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name", "t0_users"."age", "t0_users"."is_active" FROM "users" AS "t0_users" WHERE ("t0_users"."name" = $1 and "t0_users"."age" >= $2 and "t0_users"."is_active" = $3) LIMIT $4 OFFSET $5
        Params: ["Alice",20,true,20,0]"
      `);
    });

    it("should generate deeply nested logical operators", () => {
      const qb = createQueryBuilder(usersSchema);
      expect(toSqlString(qb.buildSelectSql({
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
        "SQL: SELECT "t0_users"."id", "t0_users"."name", "t0_users"."age", "t0_users"."is_active" FROM "users" AS "t0_users" WHERE ((("t0_users"."name" = $1 and "t0_users"."age" = $2) or ("t0_users"."name" = $3 and "t0_users"."age" = $4)) and "t0_users"."is_active" = $5) LIMIT $6 OFFSET $7
        Params: ["Alice",25,"Bob",30,true,20,0]"
      `);
    });
  });

  describe("JOIN queries", () => {
    it("should generate all JOIN types (LEFT, INNER, RIGHT, FULL)", () => {
      // LEFT JOIN (default) - join added via nested path
      const qb = createQueryBuilder(productsWithTranslationsSchema);
      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "handle", "price", "translation.value"],
        where: { translation: { value: { $iLike: "%phone%" } } },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id", "t0_products"."handle", "t0_products"."price", "t1_translations"."value" FROM "products" AS "t0_products" LEFT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id"WHERE "t1_translations"."value" ilike $1 LIMIT $2 OFFSET $3
        Params: ["%phone%",20,0]"
      `);

      // INNER JOIN
      const innerJoinSchema = createSchema({
        table: products,
        tableName: "products",
        fields: {
          id: { column: "id" },
          handle: { column: "handle" },
          translation: {
            column: "id",
            join: {
              type: "inner",
              schema: () => translationsSchema,
              column: "entityId",
            },
          },
        },
      });
      expect(toSqlString(createQueryBuilder(innerJoinSchema).buildSelectSql({
        select: ["id", "handle", "translation.value"],
        where: { translation: { value: { $eq: "Test" } } },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id", "t0_products"."handle", "t1_translations"."value" FROM "products" AS "t0_products" INNER JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id"WHERE "t1_translations"."value" = $1 LIMIT $2 OFFSET $3
        Params: ["Test",20,0]"
      `);

      // RIGHT JOIN
      const rightJoinSchema = createSchema({
        table: products,
        tableName: "products",
        fields: {
          id: { column: "id" },
          translation: {
            column: "id",
            join: {
              type: "right",
              schema: () => translationsSchema,
              column: "entityId",
            },
          },
        },
      });
      expect(toSqlString(createQueryBuilder(rightJoinSchema).buildSelectSql({
        select: ["id", "translation.value"],
        where: { translation: { value: { $iLike: "%" } } },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id", "t1_translations"."value" FROM "products" AS "t0_products" RIGHT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id"WHERE "t1_translations"."value" ilike $1 LIMIT $2 OFFSET $3
        Params: ["%",20,0]"
      `);

      // FULL JOIN
      const fullJoinSchema = createSchema({
        table: products,
        tableName: "products",
        fields: {
          id: { column: "id" },
          translation: {
            column: "id",
            join: {
              type: "full",
              schema: () => translationsSchema,
              column: "entityId",
            },
          },
        },
      });
      expect(toSqlString(createQueryBuilder(fullJoinSchema).buildSelectSql({
        select: ["id", "translation.value"],
        where: { translation: { value: { $iLike: "%" } } },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id", "t1_translations"."value" FROM "products" AS "t0_products" FULL JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id"WHERE "t1_translations"."value" ilike $1 LIMIT $2 OFFSET $3
        Params: ["%",20,0]"
      `);
    });

    it("should generate JOIN with composite key", () => {
      const compositeJoinSchema = createSchema({
        table: products,
        tableName: "products",
        fields: {
          id: { column: "id" },
          handle: { column: "handle" },
          translation: {
            column: "id",
            join: {
              schema: () => translationsSchema,
              column: "entityId",
              composite: [{ field: "handle", column: "field" }],
            },
          },
        },
      });

      expect(toSqlString(createQueryBuilder(compositeJoinSchema).buildSelectSql({
        select: ["id", "handle", "translation.value"],
        where: { translation: { value: { $eq: "Test" } } },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id", "t0_products"."handle", "t1_translations"."value" FROM "products" AS "t0_products" LEFT JOIN "translations" AS "t1_translations" ON ("t0_products"."id" = "t1_translations"."entity_id" and "t0_products"."handle" = "t1_translations"."field")WHERE "t1_translations"."value" = $1 LIMIT $2 OFFSET $3
        Params: ["Test",20,0]"
      `);
    });

    it("should support nested paths for multi-field joins", () => {
      const multiSelectJoinSchema = createSchema({
        table: products,
        tableName: "products",
        fields: {
          id: { column: "id" },
          handle: { column: "handle" },
          translation: {
            column: "id",
            join: {
              schema: () => translationsSchema,
              column: "entityId",
            },
          },
        },
      });

      const qb = createQueryBuilder(multiSelectJoinSchema);

      // Select nested paths - join added automatically
      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "handle", "translation.value", "translation.searchValue"],
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id", "t0_products"."handle", "t1_translations"."value", "t1_translations"."search_value" FROM "products" AS "t0_products" LEFT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id" LIMIT $1 OFFSET $2
        Params: [20,0]"
      `);

      // Order by nested paths - join added automatically
      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "handle"],
        order: ["translation.value:asc", "translation.searchValue:desc"],
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id", "t0_products"."handle" FROM "products" AS "t0_products" LEFT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id" ORDER BY "t1_translations"."value" ASC, "t1_translations"."search_value" DESC LIMIT $1 OFFSET $2
        Params: [20,0]"
      `);

      // No nested path - join field reference still triggers join to allow selection
      // (the join table column is the column specified in the field config)
      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "handle", "translation"],
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id", "t0_products"."handle", "t0_products"."id" FROM "products" AS "t0_products" LEFT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id" LIMIT $1 OFFSET $2
        Params: [20,0]"
      `);
    });

    it("should NOT add join when no nested fields used in where/order/select", () => {
      const qb = createQueryBuilder(productsWithTranslationsSchema);
      // Only using fields from main table - no join needed
      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "handle", "price"],
        where: {
          price: { $gt: 100 },
        },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id", "t0_products"."handle", "t0_products"."price" FROM "products" AS "t0_products" WHERE "t0_products"."price" > $1 LIMIT $2 OFFSET $3
        Params: [100,20,0]"
      `);
    });

    it("should generate JOIN combined with regular field filter", () => {
      const qb = createQueryBuilder(productsWithTranslationsSchema);
      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "handle", "price", "translation.value"],
        where: {
          price: { $gt: 100 },
          translation: { value: { $iLike: "%phone%" } },
        },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id", "t0_products"."handle", "t0_products"."price", "t1_translations"."value" FROM "products" AS "t0_products" LEFT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id"WHERE ("t0_products"."price" > $1 and "t1_translations"."value" ilike $2) LIMIT $3 OFFSET $4
        Params: [100,"%phone%",20,0]"
      `);
    });
  });

  describe("Complex queries", () => {
    it("should generate query with all components", () => {
      const qb = createQueryBuilder(productsWithTranslationsSchema);
      expect(toSqlString(qb.buildSelectSql({
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
        "SQL: SELECT "t0_products"."id", "t0_products"."handle", "t0_products"."price", "t1_translations"."value" FROM "products" AS "t0_products" LEFT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id"WHERE ("t1_translations"."value" ilike $1 or "t0_products"."price" > $2) LIMIT $3 OFFSET $4
        Params: ["%phone%",1000,50,25]"
      `);
    });

    it("should respect maxLimit config", () => {
      const qb = createQueryBuilder(usersSchema, { maxLimit: 10 });
      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "name"],
        limit: 1000,
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name" FROM "users" AS "t0_users"  LIMIT $1 OFFSET $2
        Params: [10,0]"
      `);
    });

    it("should handle edge cases (empty where, undefined values)", () => {
      const qb = createQueryBuilder(usersSchema);

      // Empty where
      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "name", "age"],
        where: {},
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name", "t0_users"."age" FROM "users" AS "t0_users"  LIMIT $1 OFFSET $2
        Params: [20,0]"
      `);

      // Undefined values skipped
      expect(toSqlString(qb.buildSelectSql({
        select: ["id", "name", "age"],
        where: { name: undefined, age: { $eq: 25 } },
      }))).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name", "t0_users"."age" FROM "users" AS "t0_users" WHERE "t0_users"."age" = $1 LIMIT $2 OFFSET $3
        Params: [25,20,0]"
      `);
    });
  });
});
