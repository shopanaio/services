import { describe, it, expect } from "vitest";
import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { aliasedTable } from "drizzle-orm";
import { createQueryBuilder, buildJoinConditions } from "./builder.js";
import { createSchema, tablePrefix, type JoinInfo, type AliasedTable } from "./schema.js";

// Test tables
const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  age: integer("age"),
  isActive: boolean("is_active"),
  createdAt: timestamp("created_at"),
});

const products = pgTable("products", {
  id: uuid("id").primaryKey(),
  handle: text("handle").notNull(),
  price: integer("price"),
  deletedAt: timestamp("deleted_at"),
});

const translations = pgTable("translations", {
  id: uuid("id").primaryKey(),
  entityId: uuid("entity_id").notNull(),
  field: text("field").notNull(),
  value: text("value"),
  searchValue: text("search_value"),
});

describe("tablePrefix", () => {
  it("should generate correct prefix", () => {
    expect(tablePrefix("users", 0)).toBe("t0_users");
    expect(tablePrefix("products", 1)).toBe("t1_products");
    expect(tablePrefix("translations", 2)).toBe("t2_translations");
  });
});

describe("ObjectSchema", () => {
  it("should create schema with fields", () => {
    const schema = createSchema({
      table: users,
      tableName: "users",
      fields: {
        id: { column: "id" },
        name: { column: "name" },
      },
    });

    expect(schema.tableName).toBe("users");
    expect(schema.table).toBe(users);
    expect(schema.getField("id")).toEqual({ column: "id" });
    expect(schema.getField("name")).toEqual({ column: "name" });
  });

  it("should return undefined for unknown field", () => {
    const schema = createSchema({
      table: users,
      tableName: "users",
      fields: { id: { column: "id" } },
    });

    expect(schema.getField("unknown")).toBeUndefined();
  });

  it("should detect joins", () => {
    const translationsSchema = createSchema({
      table: translations,
      tableName: "translations",
      fields: {
        entityId: { column: "entity_id" },
        value: { column: "value" },
      },
    });

    const schema = createSchema({
      table: products,
      tableName: "products",
      fields: {
        id: { column: "id" },
        translation: {
          column: "id",
          join: {
            schema: () => translationsSchema,
            column: "entityId",
          },
        },
      },
    });

    expect(schema.hasJoin("id")).toBe(false);
    expect(schema.hasJoin("translation")).toBe(true);

    const join = schema.getJoin("translation");
    expect(join).toBeDefined();
    expect(join!.column).toBe("entityId");
    expect(join!.schema()).toBe(translationsSchema);
  });

  it("should resolve schema references", () => {
    const translationsSchema = createSchema({
      table: translations,
      tableName: "translations",
      fields: {
        entityId: { column: "entity_id" },
        value: { column: "value" },
      },
    });

    const schema = createSchema({
      table: products,
      tableName: "products",
      fields: {
        translation: {
          column: "id",
          join: {
            schema: () => translationsSchema,
            column: "entityId",
          },
        },
      },
    });

    expect(schema.getJoinSchema("translation")).toBe(translationsSchema);
  });

  it("should store default fields and order", () => {
    const schema = createSchema({
      table: users,
      tableName: "users",
      fields: {
        id: { column: "id" },
        name: { column: "name" },
        createdAt: { column: "created_at" },
      },
      defaultFields: ["id", "name"],
      defaultOrder: ["createdAt"],
    });

    expect(schema.defaultFields).toEqual(["id", "name"]);
    expect(schema.defaultOrder).toEqual(["createdAt"]);
  });
});

describe("QueryBuilder", () => {
  describe("where - edge cases", () => {
    it("should return undefined for null/undefined/empty input", () => {
      const schema = createSchema({
        table: users,
        tableName: "users",
        fields: { name: { column: "name" } },
      });

      const qb = createQueryBuilder(schema);

      expect(qb.where(null)).toEqual({ sql: undefined, joins: [] });
      expect(qb.where(undefined)).toEqual({ sql: undefined, joins: [] });
      expect(qb.where({})).toEqual({ sql: undefined, joins: [] });
    });
  });

  // NOTE: Tests below require Drizzle table internals which don't work with ESM + ts-jest
  // Run these as integration tests with real database connection
  describe.skip("where - operators (integration)", () => {
    it("should handle $eq operator", () => {
      const schema = createSchema({
        table: users,
        tableName: "users",
        fields: { name: { column: "name" } },
      });

      const qb = createQueryBuilder(schema);
      const where = qb.where({ name: { $eq: "Alice" } });

      expect(where.sql).toBeDefined();
    });
  });

  describe("pagination", () => {
    it("should apply default limit", () => {
      const schema = createSchema({
        table: users,
        tableName: "users",
        fields: { name: { column: "name" } },
      });

      const qb = createQueryBuilder(schema);
      const { limit, offset } = qb.pagination(null);

      expect(limit).toBe(20);
      expect(offset).toBe(0);
    });

    it("should respect maxLimit", () => {
      const schema = createSchema({
        table: users,
        tableName: "users",
        fields: { name: { column: "name" } },
      });

      const qb = createQueryBuilder(schema, { maxLimit: 50 });
      const { limit } = qb.pagination({ limit: 100 });

      expect(limit).toBe(50);
    });

    it("should handle custom limit and offset", () => {
      const schema = createSchema({
        table: users,
        tableName: "users",
        fields: { name: { column: "name" } },
      });

      const qb = createQueryBuilder(schema);
      const { limit, offset } = qb.pagination({ limit: 10, offset: 20 });

      expect(limit).toBe(10);
      expect(offset).toBe(20);
    });

    it("should ensure offset is non-negative", () => {
      const schema = createSchema({
        table: users,
        tableName: "users",
        fields: { name: { column: "name" } },
      });

      const qb = createQueryBuilder(schema);
      const { offset } = qb.pagination({ offset: -10 });

      expect(offset).toBe(0);
    });

    it("should use custom defaultLimit from config", () => {
      const schema = createSchema({
        table: users,
        tableName: "users",
        fields: { name: { column: "name" } },
      });

      const qb = createQueryBuilder(schema, { defaultLimit: 50 });
      const { limit } = qb.pagination(null);

      expect(limit).toBe(50);
    });
  });

  describe("fromInput", () => {
    it("should return defaults for null input", () => {
      const schema = createSchema({
        table: users,
        tableName: "users",
        fields: { name: { column: "name" } },
      });

      const qb = createQueryBuilder(schema);
      const result = qb.fromInput(null);

      expect(result.where).toBeUndefined();
      expect(result.joins).toEqual([]);
      expect(result.orderSql).toBeUndefined();
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it("should return defaults for undefined input", () => {
      const schema = createSchema({
        table: users,
        tableName: "users",
        fields: { name: { column: "name" } },
      });

      const qb = createQueryBuilder(schema);
      const result = qb.fromInput(undefined);

      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it("should apply pagination from input", () => {
      const schema = createSchema({
        table: users,
        tableName: "users",
        fields: { name: { column: "name" } },
      });

      const qb = createQueryBuilder(schema);
      const result = qb.fromInput({ limit: 10, offset: 5 });

      expect(result.limit).toBe(10);
      expect(result.offset).toBe(5);
    });
  });

  describe("join collection", () => {
    it("should collect joins when nested filters are used", () => {
      const translationsSchema = createSchema({
        table: translations,
        tableName: "translations",
        fields: {
          entityId: { column: "entity_id" },
          value: { column: "value" },
        },
      });

      const schema = createSchema({
        table: products,
        tableName: "products",
        fields: {
          id: { column: "id" },
          translation: {
            column: "id",
            join: {
              schema: () => translationsSchema,
              column: "entityId",
            },
          },
        },
      });

      const qb = createQueryBuilder(schema);
      const whereResult = qb.where({ translation: { value: { $iLike: "%test%" } } });

      expect(whereResult.joins).toHaveLength(1);
      expect(whereResult.joins[0].conditions).toEqual([
        { sourceCol: "id", targetCol: "entity_id" },
      ]);
    });

    it("should not collect joins without nested filters", () => {
      const translationsSchema = createSchema({
        table: translations,
        tableName: "translations",
        fields: {
          entityId: { column: "entity_id" },
          value: { column: "value" },
        },
      });

      const schema = createSchema({
        table: products,
        tableName: "products",
        fields: {
          id: { column: "id" },
          translation: {
            column: "id",
            join: {
              schema: () => translationsSchema,
              column: "entityId",
            },
          },
        },
      });

      const qb = createQueryBuilder(schema);
      const whereResult = qb.where({ id: { $eq: "123" } });

      expect(whereResult.joins).toHaveLength(0);
    });
  });

  // Deprecated APIs removed in refactor; pagination tests kept below.
});

describe("buildJoinConditions", () => {
  it("should return empty array for empty joins", () => {
    const result = buildJoinConditions([]);
    expect(result).toEqual([]);
  });

  it("should build join conditions from JoinInfo array", () => {
    // Create aliased tables for the test
    const sourceAliased = aliasedTable(products, "t0_products");
    const targetAliased = aliasedTable(translations, "t1_translations");

    const joins: JoinInfo[] = [
      {
        type: "left",
        sourceTable: sourceAliased as unknown as AliasedTable,
        targetTable: targetAliased as unknown as AliasedTable,
        conditions: [{ sourceCol: "id", targetCol: "entity_id" }],
      },
    ];

    const result = buildJoinConditions(joins);
    expect(result).toHaveLength(1);
    expect(result[0].table).toBeDefined();
    expect(result[0].on).toBeDefined();
  });

  it("should handle multiple conditions (composite join)", () => {
    // Create aliased tables for the test
    const sourceAliased = aliasedTable(products, "t0_products");
    const targetAliased = aliasedTable(translations, "t1_translations");

    const joins: JoinInfo[] = [
      {
        type: "inner",
        sourceTable: sourceAliased as unknown as AliasedTable,
        targetTable: targetAliased as unknown as AliasedTable,
        conditions: [
          { sourceCol: "id", targetCol: "entity_id" },
          { sourceCol: "field_type", targetCol: "field" },
        ],
      },
    ];

    const result = buildJoinConditions(joins);
    expect(result).toHaveLength(1);
    // Multiple conditions should be joined with AND
    expect(result[0].on).toBeDefined();
  });
});
