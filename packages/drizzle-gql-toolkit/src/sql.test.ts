import { describe, it, expect, beforeEach } from "vitest";
import "./test/setup.js";
import {
  getDb,
  users,
  products,
  translations,
  clearTables,
} from "./test/setup.js";
import { createQueryBuilder } from "./builder.js";
import { createSchema } from "./schema.js";

// Create schemas using the shared table definitions from setup.ts
// Note: column names must match the actual PostgreSQL column names (snake_case)
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
    entityId: { column: "entity_id" },  // SQL column name, not JS property
    field: { column: "field" },
    value: { column: "value" },
    searchValue: { column: "search_value" },  // SQL column name
  },
});

// Schema with join for testing
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

describe("SQL Integration Tests with PGlite", () => {
  beforeEach(async () => {
    await clearTables();
  });

  describe("Basic SELECT queries", () => {
    it("should select all users with default pagination", async () => {
      const db = getDb();

      // Insert test data
      await db.insert(users).values([
        { name: "Alice", age: 25, isActive: true },
        { name: "Bob", age: 30, isActive: false },
        { name: "Charlie", age: 35, isActive: true },
      ]);

      const qb = createQueryBuilder(usersSchema);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await qb.query(db as any, {});

      expect(result).toHaveLength(3);
      expect(result.map((u) => u.name).sort()).toEqual(["Alice", "Bob", "Charlie"]);
    });

    it("should apply limit and offset", async () => {
      const db = getDb();

      await db.insert(users).values([
        { name: "User1", age: 20 },
        { name: "User2", age: 21 },
        { name: "User3", age: 22 },
        { name: "User4", age: 23 },
        { name: "User5", age: 24 },
      ]);

      const qb = createQueryBuilder(usersSchema);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await qb.query(db as any, { limit: 2, offset: 1 });

      expect(result).toHaveLength(2);
    });
  });

  describe("WHERE clause operators", () => {
    beforeEach(async () => {
      const db = getDb();
      await db.insert(users).values([
        { name: "Alice", age: 25, isActive: true },
        { name: "Bob", age: 30, isActive: false },
        { name: "Charlie", age: 35, isActive: true },
        { name: "Diana", age: 40, isActive: false },
      ]);
    });

    it("should filter with $eq operator", async () => {
      const db = getDb();
      const qb = createQueryBuilder(usersSchema);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await qb.query(db as any, {
        where: { name: { $eq: "Alice" } },
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Alice");
    });

    it("should filter with $neq operator", async () => {
      const db = getDb();
      const qb = createQueryBuilder(usersSchema);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await qb.query(db as any, {
        where: { name: { $neq: "Alice" } },
      });

      expect(result).toHaveLength(3);
      expect(result.every((u) => u.name !== "Alice")).toBe(true);
    });

    it("should filter with $gt operator", async () => {
      const db = getDb();
      const qb = createQueryBuilder(usersSchema);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await qb.query(db as any, {
        where: { age: { $gt: 30 } },
      });

      expect(result).toHaveLength(2);
      expect(result.every((u) => u.age! > 30)).toBe(true);
    });

    it("should filter with $gte operator", async () => {
      const db = getDb();
      const qb = createQueryBuilder(usersSchema);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await qb.query(db as any, {
        where: { age: { $gte: 30 } },
      });

      expect(result).toHaveLength(3);
      expect(result.every((u) => u.age! >= 30)).toBe(true);
    });

    it("should filter with $lt operator", async () => {
      const db = getDb();
      const qb = createQueryBuilder(usersSchema);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await qb.query(db as any, {
        where: { age: { $lt: 30 } },
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Alice");
    });

    it("should filter with $lte operator", async () => {
      const db = getDb();
      const qb = createQueryBuilder(usersSchema);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await qb.query(db as any, {
        where: { age: { $lte: 30 } },
      });

      expect(result).toHaveLength(2);
      expect(result.every((u) => u.age! <= 30)).toBe(true);
    });

    it("should filter with $in operator", async () => {
      const db = getDb();
      const qb = createQueryBuilder(usersSchema);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await qb.query(db as any, {
        where: { name: { $in: ["Alice", "Charlie"] } },
      });

      expect(result).toHaveLength(2);
      expect(result.map((u) => u.name).sort()).toEqual(["Alice", "Charlie"]);
    });

    it("should filter with $notIn operator", async () => {
      const db = getDb();
      const qb = createQueryBuilder(usersSchema);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await qb.query(db as any, {
        where: { name: { $notIn: ["Alice", "Charlie"] } },
      });

      expect(result).toHaveLength(2);
      expect(result.map((u) => u.name).sort()).toEqual(["Bob", "Diana"]);
    });

    it("should filter with $like operator", async () => {
      const db = getDb();
      const qb = createQueryBuilder(usersSchema);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await qb.query(db as any, {
        where: { name: { $like: "A%" } },
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Alice");
    });

    it("should filter with $iLike operator (case-insensitive)", async () => {
      const db = getDb();
      const qb = createQueryBuilder(usersSchema);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await qb.query(db as any, {
        where: { name: { $iLike: "a%" } },
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Alice");
    });

    it("should filter with $is: null", async () => {
      const db = getDb();
      await db.insert(users).values({ name: "NoAge", age: null });

      const qb = createQueryBuilder(usersSchema);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await qb.query(db as any, {
        where: { age: { $is: null } },
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("NoAge");
    });

    it("should filter with $isNot: null", async () => {
      const db = getDb();
      await db.insert(users).values({ name: "NoAge", age: null });

      const qb = createQueryBuilder(usersSchema);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await qb.query(db as any, {
        where: { age: { $isNot: null } },
      });

      expect(result).toHaveLength(4); // Original 4 users have age
      expect(result.every((u) => u.age !== null)).toBe(true);
    });
  });

  describe("Logical operators", () => {
    beforeEach(async () => {
      const db = getDb();
      await db.insert(users).values([
        { name: "Alice", age: 25, isActive: true },
        { name: "Bob", age: 30, isActive: false },
        { name: "Charlie", age: 35, isActive: true },
      ]);
    });

    it("should combine conditions with $and", async () => {
      const db = getDb();
      const qb = createQueryBuilder(usersSchema);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await qb.query(db as any, {
        where: {
          $and: [{ age: { $gte: 25 } }, { age: { $lte: 30 } }],
        },
      });

      expect(result).toHaveLength(2);
      expect(result.map((u) => u.name).sort()).toEqual(["Alice", "Bob"]);
    });

    it("should combine conditions with $or", async () => {
      const db = getDb();
      const qb = createQueryBuilder(usersSchema);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await qb.query(db as any, {
        where: {
          $or: [{ name: { $eq: "Alice" } }, { name: { $eq: "Charlie" } }],
        },
      });

      expect(result).toHaveLength(2);
      expect(result.map((u) => u.name).sort()).toEqual(["Alice", "Charlie"]);
    });

    it("should handle nested $and and $or", async () => {
      const db = getDb();
      const qb = createQueryBuilder(usersSchema);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await qb.query(db as any, {
        where: {
          $or: [
            { $and: [{ name: { $eq: "Alice" } }, { isActive: { $eq: true } }] },
            { age: { $gt: 30 } },
          ],
        },
      });

      expect(result).toHaveLength(2);
      expect(result.map((u) => u.name).sort()).toEqual(["Alice", "Charlie"]);
    });

    it("should handle multiple field conditions (implicit AND)", async () => {
      const db = getDb();
      const qb = createQueryBuilder(usersSchema);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await qb.query(db as any, {
        where: {
          age: { $gte: 25 },
          isActive: { $eq: true },
        },
      });

      expect(result).toHaveLength(2);
      expect(result.map((u) => u.name).sort()).toEqual(["Alice", "Charlie"]);
    });
  });

  describe("ORDER BY clause", () => {
    beforeEach(async () => {
      const db = getDb();
      await db.insert(users).values([
        { name: "Charlie", age: 35 },
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
      ]);
    });

    it("should order by field ascending", async () => {
      const db = getDb();
      const qb = createQueryBuilder(usersSchema);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await qb.query(db as any, {
        order: "name:asc",
      });

      expect(result.map((u) => u.name)).toEqual(["Alice", "Bob", "Charlie"]);
    });

    it("should order by field descending", async () => {
      const db = getDb();
      const qb = createQueryBuilder(usersSchema);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await qb.query(db as any, {
        order: "age:desc",
      });

      expect(result.map((u) => u.age)).toEqual([35, 30, 25]);
    });

    it("should handle multiOrder", async () => {
      const db = getDb();
      await db.insert(users).values({ name: "Alice", age: 50 }); // Second Alice

      const qb = createQueryBuilder(usersSchema);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await qb.query(db as any, {
        multiOrder: ["name:asc", "age:desc"],
      });

      // Both Alices first, then Bob, then Charlie
      expect(result[0].name).toBe("Alice");
      expect(result[0].age).toBe(50); // Older Alice first due to desc
      expect(result[1].name).toBe("Alice");
      expect(result[1].age).toBe(25);
    });
  });

  describe("JOIN queries", () => {
    beforeEach(async () => {
      const db = getDb();

      // Insert products
      const [product1] = await db
        .insert(products)
        .values({ handle: "phone", price: 999 })
        .returning();
      const [product2] = await db
        .insert(products)
        .values({ handle: "laptop", price: 1999 })
        .returning();

      // Insert translations
      await db.insert(translations).values([
        { entityId: product1.id, field: "title", value: "Smart Phone" },
        { entityId: product2.id, field: "title", value: "Gaming Laptop" },
      ]);
    });

    it("should filter through join with $iLike", async () => {
      const db = getDb();
      const qb = createQueryBuilder(productsWithTranslationsSchema);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await qb.query(db as any, {
        where: { title: { $iLike: "%phone%" } },
      });

      expect(result).toHaveLength(1);
      expect(result[0].handle).toBe("phone");
    });

    it("should filter through join with $eq", async () => {
      const db = getDb();
      const qb = createQueryBuilder(productsWithTranslationsSchema);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await qb.query(db as any, {
        where: { title: { $eq: "Gaming Laptop" } },
      });

      expect(result).toHaveLength(1);
      expect(result[0].handle).toBe("laptop");
    });

    it("should combine join filter with regular field filter", async () => {
      const db = getDb();
      const qb = createQueryBuilder(productsWithTranslationsSchema);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await qb.query(db as any, {
        where: {
          price: { $gt: 500 },
          title: { $iLike: "%laptop%" },
        },
      });

      expect(result).toHaveLength(1);
      expect(result[0].handle).toBe("laptop");
      expect(result[0].price).toBe(1999);
    });
  });

  describe("Complex queries", () => {
    it("should handle pagination with where and order", async () => {
      const db = getDb();
      await db.insert(users).values([
        { name: "User1", age: 21 },
        { name: "User2", age: 22 },
        { name: "User3", age: 23 },
        { name: "User4", age: 24 },
        { name: "User5", age: 25 },
        { name: "User6", age: 26 },
      ]);

      const qb = createQueryBuilder(usersSchema);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await qb.query(db as any, {
        where: { age: { $gte: 22 } },
        order: "age:asc",
        limit: 3,
        offset: 1,
      });

      expect(result).toHaveLength(3);
      expect(result.map((u) => u.age)).toEqual([23, 24, 25]);
    });

    it("should handle empty $in array gracefully", async () => {
      const db = getDb();
      await db.insert(users).values({ name: "Alice", age: 25 });

      const qb = createQueryBuilder(usersSchema);
      // Empty $in should be ignored
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await qb.query(db as any, {
        where: { name: { $in: [] } },
      });

      // Should return all users because empty $in is ignored
      expect(result).toHaveLength(1);
    });
  });
});
