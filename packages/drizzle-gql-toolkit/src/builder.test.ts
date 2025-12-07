import { describe, it, expect } from "@jest/globals";
import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createQueryBuilder } from "./builder.js";
import { createSchema, tablePrefix } from "./schema.js";

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

    expect(schema.hasJoin("id")).toBe(false);
    expect(schema.hasJoin("title")).toBe(true);

    const join = schema.getJoin("title");
    expect(join).toBeDefined();
    expect(join!.column).toBe("entityId");
    expect(join!.select).toEqual(["value"]);
    expect(join!.schema()).toBe(translationsSchema);
  });

  it("should resolve schema references", () => {
    const translationsSchema = createSchema({
      table: translations,
      tableName: "translations",
      fields: {
        entityId: { column: "entity_id" },
      },
    });

    const schema = createSchema({
      table: products,
      tableName: "products",
      fields: {
        title: {
          column: "id",
          join: {
            schema: () => translationsSchema,
            column: "entityId",
          },
        },
      },
    });

    expect(schema.getJoinSchema("title")).toBe(translationsSchema);
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

      expect(qb.where(null)).toBeUndefined();
      expect(qb.where(undefined)).toBeUndefined();
      expect(qb.where({})).toBeUndefined();
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

      expect(where).toBeDefined();
    });
  });

  describe("orderBy", () => {
    it("should return empty array for null/undefined", () => {
      const schema = createSchema({
        table: users,
        tableName: "users",
        fields: { name: { column: "name" } },
      });

      const qb = createQueryBuilder(schema);

      expect(qb.orderBy(null)).toEqual([]);
      expect(qb.orderBy(undefined)).toEqual([]);
    });
  });

  describe("parseOrder", () => {
    it("should return empty for null/undefined", () => {
      const schema = createSchema({
        table: users,
        tableName: "users",
        fields: { name: { column: "name" } },
      });

      const qb = createQueryBuilder(schema);

      expect(qb.parseOrder(null)).toEqual([]);
      expect(qb.parseOrder(undefined)).toEqual([]);
    });
  });

  describe("parseMultiOrder", () => {
    it("should return empty for null/undefined/empty array", () => {
      const schema = createSchema({
        table: users,
        tableName: "users",
        fields: { name: { column: "name" } },
      });

      const qb = createQueryBuilder(schema);

      expect(qb.parseMultiOrder(null)).toEqual([]);
      expect(qb.parseMultiOrder(undefined)).toEqual([]);
      expect(qb.parseMultiOrder([])).toEqual([]);
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

  describe("select", () => {
    it("should return undefined for empty selection", () => {
      const schema = createSchema({
        table: users,
        tableName: "users",
        fields: { name: { column: "name" } },
      });

      const qb = createQueryBuilder(schema);

      expect(qb.select(null)).toBeUndefined();
      expect(qb.select(undefined)).toBeUndefined();
      expect(qb.select([])).toBeUndefined();
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
      expect(result.orderBy).toEqual([]);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
      expect(result.select).toBeUndefined();
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

  describe("getJoins", () => {
    it("should return empty array initially", () => {
      const schema = createSchema({
        table: products,
        tableName: "products",
        fields: { id: { column: "id" } },
      });

      const qb = createQueryBuilder(schema);
      expect(qb.getJoins()).toEqual([]);
    });
  });
});
