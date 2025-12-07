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
    title: {
      column: "id",
      join: {
        schema: () => translationsSchema,
        column: "entityId",
        select: ["value"],
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
    it("should generate SELECT with default pagination", () => {
      const qb = createQueryBuilder(usersSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "name", "age"],
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name", "t0_users"."age" FROM "users" AS "t0_users"  LIMIT $1 OFFSET $2
        Params: [20,0]"
      `);
    });

    it("should generate SELECT with custom limit/offset", () => {
      const qb = createQueryBuilder(usersSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "name"],
        limit: 50,
        offset: 10,
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name" FROM "users" AS "t0_users"  LIMIT $1 OFFSET $2
        Params: [50,10]"
      `);
    });
  });

  describe("WHERE clause operators", () => {
    it("should generate $eq condition", () => {
      const qb = createQueryBuilder(usersSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "name"],
        where: { name: { $eq: "Alice" } },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name" FROM "users" AS "t0_users" WHERE "t0_users"."name" = $1 LIMIT $2 OFFSET $3
        Params: ["Alice",20,0]"
      `);
    });

    it("should generate $neq condition", () => {
      const qb = createQueryBuilder(usersSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "name"],
        where: { name: { $neq: "Alice" } },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name" FROM "users" AS "t0_users" WHERE "t0_users"."name" <> $1 LIMIT $2 OFFSET $3
        Params: ["Alice",20,0]"
      `);
    });

    it("should generate $gt condition", () => {
      const qb = createQueryBuilder(usersSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "age"],
        where: { age: { $gt: 30 } },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."age" FROM "users" AS "t0_users" WHERE "t0_users"."age" > $1 LIMIT $2 OFFSET $3
        Params: [30,20,0]"
      `);
    });

    it("should generate $gte condition", () => {
      const qb = createQueryBuilder(usersSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "age"],
        where: { age: { $gte: 30 } },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."age" FROM "users" AS "t0_users" WHERE "t0_users"."age" >= $1 LIMIT $2 OFFSET $3
        Params: [30,20,0]"
      `);
    });

    it("should generate $lt condition", () => {
      const qb = createQueryBuilder(usersSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "age"],
        where: { age: { $lt: 30 } },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."age" FROM "users" AS "t0_users" WHERE "t0_users"."age" < $1 LIMIT $2 OFFSET $3
        Params: [30,20,0]"
      `);
    });

    it("should generate $lte condition", () => {
      const qb = createQueryBuilder(usersSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "age"],
        where: { age: { $lte: 30 } },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."age" FROM "users" AS "t0_users" WHERE "t0_users"."age" <= $1 LIMIT $2 OFFSET $3
        Params: [30,20,0]"
      `);
    });

    it("should generate $in condition", () => {
      const qb = createQueryBuilder(usersSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "name"],
        where: { name: { $in: ["Alice", "Bob", "Charlie"] } },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name" FROM "users" AS "t0_users" WHERE "t0_users"."name" IN ($1, $2, $3) LIMIT $4 OFFSET $5
        Params: ["Alice","Bob","Charlie",20,0]"
      `);
    });

    it("should generate $notIn condition", () => {
      const qb = createQueryBuilder(usersSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "name"],
        where: { name: { $notIn: ["Alice", "Bob"] } },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name" FROM "users" AS "t0_users" WHERE "t0_users"."name" NOT IN ($1, $2) LIMIT $3 OFFSET $4
        Params: ["Alice","Bob",20,0]"
      `);
    });

    it("should generate $like condition", () => {
      const qb = createQueryBuilder(usersSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "name"],
        where: { name: { $like: "A%" } },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name" FROM "users" AS "t0_users" WHERE "t0_users"."name" LIKE $1 LIMIT $2 OFFSET $3
        Params: ["A%",20,0]"
      `);
    });

    it("should generate $iLike condition", () => {
      const qb = createQueryBuilder(usersSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "name"],
        where: { name: { $iLike: "%alice%" } },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name" FROM "users" AS "t0_users" WHERE "t0_users"."name" ILIKE $1 LIMIT $2 OFFSET $3
        Params: ["%alice%",20,0]"
      `);
    });

    it("should generate $notLike condition", () => {
      const qb = createQueryBuilder(usersSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "name"],
        where: { name: { $notLike: "A%" } },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name" FROM "users" AS "t0_users" WHERE "t0_users"."name" NOT LIKE $1 LIMIT $2 OFFSET $3
        Params: ["A%",20,0]"
      `);
    });

    it("should generate $notILike condition", () => {
      const qb = createQueryBuilder(usersSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "name"],
        where: { name: { $notILike: "%alice%" } },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name" FROM "users" AS "t0_users" WHERE "t0_users"."name" NOT ILIKE $1 LIMIT $2 OFFSET $3
        Params: ["%alice%",20,0]"
      `);
    });

    it("should generate $is null condition", () => {
      const qb = createQueryBuilder(usersSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "age"],
        where: { age: { $is: null } },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."age" FROM "users" AS "t0_users" WHERE "t0_users"."age" IS NULL LIMIT $1 OFFSET $2
        Params: [20,0]"
      `);
    });

    it("should generate $isNot null condition", () => {
      const qb = createQueryBuilder(usersSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "age"],
        where: { age: { $isNot: null } },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."age" FROM "users" AS "t0_users" WHERE "t0_users"."age" IS NOT NULL LIMIT $1 OFFSET $2
        Params: [20,0]"
      `);
    });

    it("should generate multiple operators on same field", () => {
      const qb = createQueryBuilder(usersSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "name", "age"],
        where: { age: { $gte: 20, $lte: 40 } },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name", "t0_users"."age" FROM "users" AS "t0_users" WHERE ("t0_users"."age" >= $1 and "t0_users"."age" <= $2) LIMIT $3 OFFSET $4
        Params: [20,40,20,0]"
      `);
    });

    it("should generate direct value equality (implicit $eq)", () => {
      const qb = createQueryBuilder(usersSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "name"],
        where: { name: "Alice" },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name" FROM "users" AS "t0_users" WHERE "t0_users"."name" = $1 LIMIT $2 OFFSET $3
        Params: ["Alice",20,0]"
      `);
    });
  });

  describe("Logical operators", () => {
    it("should generate $and condition", () => {
      const qb = createQueryBuilder(usersSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "name", "age"],
        where: {
          $and: [
            { age: { $gte: 20 } },
            { age: { $lte: 40 } },
          ],
        },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name", "t0_users"."age" FROM "users" AS "t0_users" WHERE ("t0_users"."age" >= $1 and "t0_users"."age" <= $2) LIMIT $3 OFFSET $4
        Params: [20,40,20,0]"
      `);
    });

    it("should generate $or condition", () => {
      const qb = createQueryBuilder(usersSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "name"],
        where: {
          $or: [
            { name: { $eq: "Alice" } },
            { name: { $eq: "Bob" } },
          ],
        },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name" FROM "users" AS "t0_users" WHERE ("t0_users"."name" = $1 or "t0_users"."name" = $2) LIMIT $3 OFFSET $4
        Params: ["Alice","Bob",20,0]"
      `);
    });

    it("should generate nested $and inside $or", () => {
      const qb = createQueryBuilder(usersSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "name", "age"],
        where: {
          $or: [
            { $and: [{ name: { $eq: "Alice" } }, { age: { $eq: 25 } }] },
            { $and: [{ name: { $eq: "Bob" } }, { age: { $eq: 30 } }] },
          ],
        },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name", "t0_users"."age" FROM "users" AS "t0_users" WHERE (("t0_users"."name" = $1 and "t0_users"."age" = $2) or ("t0_users"."name" = $3 and "t0_users"."age" = $4)) LIMIT $5 OFFSET $6
        Params: ["Alice",25,"Bob",30,20,0]"
      `);
    });

    it("should generate deeply nested logical operators", () => {
      const qb = createQueryBuilder(usersSchema);
      const sqlObj = qb.buildSelectSql({
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
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name", "t0_users"."age", "t0_users"."is_active" AS "isActive" FROM "users" AS "t0_users" WHERE ((("t0_users"."name" = $1 and "t0_users"."age" = $2) or ("t0_users"."name" = $3 and "t0_users"."age" = $4)) and "t0_users"."is_active" = $5) LIMIT $6 OFFSET $7
        Params: ["Alice",25,"Bob",30,true,20,0]"
      `);
    });

    it("should generate implicit AND for multiple fields", () => {
      const qb = createQueryBuilder(usersSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "name", "age", "isActive"],
        where: {
          name: { $eq: "Alice" },
          age: { $gte: 20 },
          isActive: { $eq: true },
        },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name", "t0_users"."age", "t0_users"."is_active" AS "isActive" FROM "users" AS "t0_users" WHERE ("t0_users"."name" = $1 and "t0_users"."age" >= $2 and "t0_users"."is_active" = $3) LIMIT $4 OFFSET $5
        Params: ["Alice",20,true,20,0]"
      `);
    });
  });

  describe("JOIN queries", () => {
    it("should generate LEFT JOIN with filter", () => {
      const qb = createQueryBuilder(productsWithTranslationsSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "handle", "price", "title"],
        where: { title: { $iLike: "%phone%" } },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id", "t0_products"."handle", "t0_products"."price", "t1_translations"."value" AS "title" FROM "products" AS "t0_products" LEFT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id"WHERE "t1_translations"."value" ILIKE $1 LIMIT $2 OFFSET $3
        Params: ["%phone%",20,0]"
      `);
    });

    it("should generate INNER JOIN", () => {
      const productsWithInnerJoinSchema = createSchema({
        table: products,
        tableName: "products",
        fields: {
          id: { column: "id" },
          handle: { column: "handle" },
          title: {
            column: "id",
            join: {
              type: "inner",
              schema: () => translationsSchema,
              column: "entityId",
              select: ["value"],
            },
          },
        },
      });

      const qb = createQueryBuilder(productsWithInnerJoinSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "handle", "title"],
        where: { title: { $eq: "Test" } },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id", "t0_products"."handle", "t1_translations"."value" AS "title" FROM "products" AS "t0_products" INNER JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id"WHERE "t1_translations"."value" = $1 LIMIT $2 OFFSET $3
        Params: ["Test",20,0]"
      `);
    });

    it("should generate RIGHT JOIN", () => {
      const productsWithRightJoinSchema = createSchema({
        table: products,
        tableName: "products",
        fields: {
          id: { column: "id" },
          handle: { column: "handle" },
          title: {
            column: "id",
            join: {
              type: "right",
              schema: () => translationsSchema,
              column: "entityId",
              select: ["value"],
            },
          },
        },
      });

      const qb = createQueryBuilder(productsWithRightJoinSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "handle", "title"],
        where: { title: { $iLike: "%" } },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id", "t0_products"."handle", "t1_translations"."value" AS "title" FROM "products" AS "t0_products" RIGHT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id"WHERE "t1_translations"."value" ILIKE $1 LIMIT $2 OFFSET $3
        Params: ["%",20,0]"
      `);
    });

    it("should generate FULL JOIN", () => {
      const productsWithFullJoinSchema = createSchema({
        table: products,
        tableName: "products",
        fields: {
          id: { column: "id" },
          handle: { column: "handle" },
          title: {
            column: "id",
            join: {
              type: "full",
              schema: () => translationsSchema,
              column: "entityId",
              select: ["value"],
            },
          },
        },
      });

      const qb = createQueryBuilder(productsWithFullJoinSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "handle", "title"],
        where: { title: { $iLike: "%" } },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id", "t0_products"."handle", "t1_translations"."value" AS "title" FROM "products" AS "t0_products" FULL JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id"WHERE "t1_translations"."value" ILIKE $1 LIMIT $2 OFFSET $3
        Params: ["%",20,0]"
      `);
    });

    it("should generate JOIN with composite key", () => {
      const productsWithCompositeJoinSchema = createSchema({
        table: products,
        tableName: "products",
        fields: {
          id: { column: "id" },
          handle: { column: "handle" },
          title: {
            column: "id",
            join: {
              schema: () => translationsSchema,
              column: "entityId",
              select: ["value"],
              composite: [{ field: "handle", column: "field" }],
            },
          },
        },
      });

      const qb = createQueryBuilder(productsWithCompositeJoinSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "handle", "title"],
        where: { title: { $eq: "Test" } },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id", "t0_products"."handle", "t1_translations"."value" AS "title" FROM "products" AS "t0_products" LEFT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id" AND "t0_products"."handle" = "t1_translations"."field"WHERE "t1_translations"."value" = $1 LIMIT $2 OFFSET $3
        Params: ["Test",20,0]"
      `);
    });

    it("should generate JOIN combined with regular field filter", () => {
      const qb = createQueryBuilder(productsWithTranslationsSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "handle", "price", "title"],
        where: {
          price: { $gt: 100 },
          title: { $iLike: "%phone%" },
        },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id", "t0_products"."handle", "t0_products"."price", "t1_translations"."value" AS "title" FROM "products" AS "t0_products" LEFT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id"WHERE ("t0_products"."price" > $1 and "t1_translations"."value" ILIKE $2) LIMIT $3 OFFSET $4
        Params: [100,"%phone%",20,0]"
      `);
    });

    it("should generate multiple JOINs", () => {
      const productsWithMultipleJoinsSchema = createSchema({
        table: products,
        tableName: "products",
        fields: {
          id: { column: "id" },
          handle: { column: "handle" },
          title: {
            column: "id",
            join: {
              schema: () => translationsSchema,
              column: "entityId",
              select: ["value"],
            },
          },
          searchTitle: {
            column: "id",
            join: {
              schema: () => translationsSchema,
              column: "entityId",
              select: ["searchValue"],
            },
          },
        },
      });

      const qb = createQueryBuilder(productsWithMultipleJoinsSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "handle", "title", "searchTitle"],
        where: {
          title: { $iLike: "%phone%" },
          searchTitle: { $iLike: "%mobile%" },
        },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id", "t0_products"."handle", "t1_translations"."value" AS "title", "t1_translations"."search_value" AS "searchTitle" FROM "products" AS "t0_products" LEFT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id"WHERE ("t1_translations"."value" ILIKE $1 and "t1_translations"."search_value" ILIKE $2) LIMIT $3 OFFSET $4
        Params: ["%phone%","%mobile%",20,0]"
      `);
    });
  });

  describe("Complex queries", () => {
    it("should generate query with all components", () => {
      const qb = createQueryBuilder(productsWithTranslationsSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "handle", "price", "title"],
        where: {
          $or: [
            { title: { $iLike: "%phone%" } },
            { price: { $gt: 1000 } },
          ],
        },
        limit: 50,
        offset: 25,
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_products"."id", "t0_products"."handle", "t0_products"."price", "t1_translations"."value" AS "title" FROM "products" AS "t0_products" LEFT JOIN "translations" AS "t1_translations" ON "t0_products"."id" = "t1_translations"."entity_id"WHERE ("t1_translations"."value" ILIKE $1 or "t0_products"."price" > $2) LIMIT $3 OFFSET $4
        Params: ["%phone%",1000,50,25]"
      `);
    });

    it("should respect maxLimit config", () => {
      const qb = createQueryBuilder(usersSchema, { maxLimit: 10 });
      const sqlObj = qb.buildSelectSql({
        select: ["id", "name"],
        limit: 1000,
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name" FROM "users" AS "t0_users"  LIMIT $1 OFFSET $2
        Params: [10,0]"
      `);
    });

    it("should handle empty where object", () => {
      const qb = createQueryBuilder(usersSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "name", "age"],
        where: {},
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name", "t0_users"."age" FROM "users" AS "t0_users"  LIMIT $1 OFFSET $2
        Params: [20,0]"
      `);
    });

    it("should skip undefined values in where", () => {
      const qb = createQueryBuilder(usersSchema);
      const sqlObj = qb.buildSelectSql({
        select: ["id", "name", "age"],
        where: { name: undefined, age: { $eq: 25 } },
      });

      expect(toSqlString(sqlObj)).toMatchInlineSnapshot(`
        "SQL: SELECT "t0_users"."id", "t0_users"."name", "t0_users"."age" FROM "users" AS "t0_users" WHERE "t0_users"."age" = $1 LIMIT $2 OFFSET $3
        Params: [25,20,0]"
      `);
    });
  });
});
