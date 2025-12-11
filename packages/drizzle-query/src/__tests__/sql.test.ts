import { describe, it, expect, beforeEach } from "vitest";
import "./test/setup.js";
import {
  getDb,
  users,
  products,
  translations,
  events,
  clearTables,
} from "./test/setup.js";
import { createQuery, field } from "../index.js";

// Create queries using the shared table definitions from setup.ts
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

// Query with join for testing
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {});

      expect(result).toHaveLength(3);
      expect(result.map((u) => u.name).sort()).toEqual([
        "Alice",
        "Bob",
        "Charlie",
      ]);
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        limit: 2,
        offset: 1,
        order: [{ field: "name", direction: "asc" }],
      });

      expect(result).toHaveLength(2);
      expect(result.map((u) => u.name)).toEqual(["User2", "User3"]);
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

    it("should filter with _eq operator", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { name: { _eq: "Alice" } },
      });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Alice");
    });

    it("should filter with _neq operator", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { name: { _neq: "Alice" } },
      });

      expect(result).toHaveLength(3);
      expect(result.every((u) => u.name !== "Alice")).toBe(true);
    });

    it("should filter with _gt operator", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { age: { _gt: 30 } },
      });
      expect(result).toHaveLength(2);
      expect(result.every((u) => u.age! > 30)).toBe(true);
    });

    it("should filter with _gte operator", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { age: { _gte: 30 } },
      });

      expect(result).toHaveLength(3);
      expect(result.every((u) => u.age! >= 30)).toBe(true);
    });

    it("should filter with _lt operator", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { age: { _lt: 30 } },
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Alice");
    });

    it("should filter with _lte operator", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { age: { _lte: 30 } },
      });

      expect(result).toHaveLength(2);
      expect(result.every((u) => u.age! <= 30)).toBe(true);
    });

    it("should filter with _in operator", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { name: { _in: ["Alice", "Charlie"] } },
      });

      expect(result).toHaveLength(2);
      expect(result.map((u) => u.name).sort()).toEqual(["Alice", "Charlie"]);
    });

    it("should filter with _notIn operator", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { name: { _notIn: ["Alice", "Charlie"] } },
      });

      expect(result).toHaveLength(2);
      expect(result.map((u) => u.name).sort()).toEqual(["Bob", "Diana"]);
    });

    it("should filter with _startsWith operator", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { name: { _startsWith: "A" } },
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Alice");
    });

    it("should filter with _startsWithi operator (case-insensitive)", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { name: { _startsWithi: "a" } },
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Alice");
    });

    it("should filter with _is: null", async () => {
      const db = getDb();
      await db.insert(users).values({ name: "NoAge", age: null });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { age: { _is: null } },
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("NoAge");
    });

    it("should filter with _isNot: null", async () => {
      const db = getDb();
      await db.insert(users).values({ name: "NoAge", age: null });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { age: { _isNot: null } },
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

    it("should combine conditions with _and", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: {
          _and: [{ age: { _gte: 25 } }, { age: { _lte: 30 } }],
        },
      });

      expect(result).toHaveLength(2);
      expect(result.map((u) => u.name).sort()).toEqual(["Alice", "Bob"]);
    });

    it("should combine conditions with _or", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: {
          _or: [{ name: { _eq: "Alice" } }, { name: { _eq: "Charlie" } }],
        },
      });

      expect(result).toHaveLength(2);
      expect(result.map((u) => u.name).sort()).toEqual(["Alice", "Charlie"]);
    });

    it("should handle nested _and and _or", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: {
          _or: [
            { _and: [{ name: { _eq: "Alice" } }, { isActive: { _eq: true } }] },
            { age: { _gt: 30 } },
          ],
        },
      });

      expect(result).toHaveLength(2);
      expect(result.map((u) => u.name).sort()).toEqual(["Alice", "Charlie"]);
    });

    it("should handle multiple field conditions (implicit AND)", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: {
          age: { _gte: 25 },
          isActive: { _eq: true },
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        order: [{ field: "name", direction: "asc" }],
      });

      expect(result.map((u) => u.name)).toEqual(["Alice", "Bob", "Charlie"]);
    });

    it("should order by field descending", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        order: [{ field: "age", direction: "desc" }],
      });

      expect(result.map((u) => u.age)).toEqual([35, 30, 25]);
    });

    it("should handle multiple order fields", async () => {
      const db = getDb();
      await db.insert(users).values({ name: "Alice", age: 50 }); // Second Alice

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        order: [{ field: "name", direction: "asc" }, { field: "age", direction: "desc" }],
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

    it("should filter through join with _containsi", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await productsWithTranslationsQuery.execute(db as any, {
        where: { translation: { value: { _containsi: "phone" } } },
      });

      expect(result).toHaveLength(1);
      expect(result[0].handle).toBe("phone");
    });

    it("should filter through join with _eq", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await productsWithTranslationsQuery.execute(db as any, {
        where: { translation: { value: { _eq: "Gaming Laptop" } } },
      });

      expect(result).toHaveLength(1);
      expect(result[0].handle).toBe("laptop");
    });

    it("should combine join filter with regular field filter", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await productsWithTranslationsQuery.execute(db as any, {
        where: {
          price: { _gt: 500 },
          translation: { value: { _containsi: "laptop" } },
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { age: { _gte: 22 } },
        order: [{ field: "age", direction: "asc" }],
        limit: 3,
        offset: 1,
      });

      expect(result).toHaveLength(3);
      expect(result.map((u) => u.age)).toEqual([23, 24, 25]);
    });

    it("should treat empty _in array as always false", async () => {
      const db = getDb();
      await db.insert(users).values({ name: "Alice", age: 25 });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { name: { _in: [] } },
      });

      expect(result).toHaveLength(0);
    });
  });

  describe("Additional WHERE clause operators", () => {
    beforeEach(async () => {
      const db = getDb();
      await db.insert(users).values([
        { name: "Alice", age: 25, isActive: true },
        { name: "Bob", age: 30, isActive: false },
        { name: "Charlie", age: 35, isActive: true },
        { name: "Diana", age: 40, isActive: false },
      ]);
    });


    it("should apply multiple operators on same field (range query)", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { age: { _gte: 25, _lte: 35 } },
      });

      expect(result).toHaveLength(3);
      expect(result.every((u) => u.age! >= 25 && u.age! <= 35)).toBe(true);
    });

    it("should filter boolean field with _eq true", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { isActive: { _eq: true } },
      });

      expect(result).toHaveLength(2);
      expect(
        result.every((u) => (u as Record<string, unknown>).isActive === true)
      ).toBe(true);
    });

    it("should filter boolean field with _eq false", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { isActive: { _eq: false } },
      });

      expect(result).toHaveLength(2);
      expect(
        result.every((u) => (u as Record<string, unknown>).isActive === false)
      ).toBe(true);
    });

    it("should handle empty _notIn array gracefully", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { name: { _notIn: [] } },
      });

      // Empty _notIn should be ignored, return all users
      expect(result).toHaveLength(4);
    });
  });

  describe("String convenience operators", () => {
    beforeEach(async () => {
      const db = getDb();
      await db.insert(users).values([
        { name: "Alice", age: 25, isActive: true },
        { name: "Bob", age: 30, isActive: false },
        { name: "Charlie", age: 35, isActive: true },
        { name: "Diana", age: 40, isActive: false },
      ]);
    });

    it("should filter with _contains operator", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { name: { _contains: "li" } },
      });

      expect(result).toHaveLength(2);
      expect(result.map((u) => u.name).sort()).toEqual(["Alice", "Charlie"]);
    });

    it("should filter with _containsi operator (case-insensitive)", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { name: { _containsi: "LI" } },
      });

      expect(result).toHaveLength(2);
      expect(result.map((u) => u.name).sort()).toEqual(["Alice", "Charlie"]);
    });

    it("should filter with _notContains operator", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { name: { _notContains: "li" } },
      });

      expect(result).toHaveLength(2);
      expect(result.map((u) => u.name).sort()).toEqual(["Bob", "Diana"]);
    });

    it("should filter with _startsWith operator", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { name: { _startsWith: "Al" } },
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Alice");
    });

    it("should filter with _startsWithi operator (case-insensitive)", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { name: { _startsWithi: "al" } },
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Alice");
    });

    it("should filter with _endsWith operator", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { name: { _endsWith: "ob" } },
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Bob");
    });

    it("should filter with _endsWithi operator (case-insensitive)", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { name: { _endsWithi: "OB" } },
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Bob");
    });
  });

  describe("_between operator", () => {
    beforeEach(async () => {
      const db = getDb();
      await db.insert(users).values([
        { name: "Alice", age: 25, isActive: true },
        { name: "Bob", age: 30, isActive: false },
        { name: "Charlie", age: 35, isActive: true },
        { name: "Diana", age: 40, isActive: false },
      ]);
    });

    it("should filter with _between operator", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { age: { _between: [28, 36] } },
      });

      expect(result).toHaveLength(2);
      expect(result.map((u) => u.name).sort()).toEqual(["Bob", "Charlie"]);
    });

    it("should filter with _between inclusive boundaries", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { age: { _between: [25, 35] } },
      });

      expect(result).toHaveLength(3);
      expect(result.map((u) => u.name).sort()).toEqual(["Alice", "Bob", "Charlie"]);
    });
  });

  describe("_not operator", () => {
    beforeEach(async () => {
      const db = getDb();
      await db.insert(users).values([
        { name: "Alice", age: 25, isActive: true },
        { name: "Bob", age: 30, isActive: false },
        { name: "Charlie", age: 35, isActive: true },
        { name: "Diana", age: 40, isActive: false },
      ]);
    });

    it("should negate simple condition", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { _not: { name: { _eq: "Alice" } } },
      });

      expect(result).toHaveLength(3);
      expect(result.every((u) => u.name !== "Alice")).toBe(true);
    });

    it("should negate multiple conditions (AND)", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: {
          _not: {
            age: { _gte: 30 },
            isActive: { _eq: false },
          },
        },
      });

      // Negate: (age >= 30 AND isActive = false)
      // Should return users where NOT (age >= 30 AND isActive = false)
      // Bob (30, false) and Diana (40, false) should be excluded
      expect(result).toHaveLength(2);
      expect(result.map((u) => u.name).sort()).toEqual(["Alice", "Charlie"]);
    });

    it("should combine _not with other conditions", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: {
          isActive: { _eq: true },
          _not: { name: { _eq: "Alice" } },
        },
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Charlie");
    });

    it("should handle nested _not inside _or", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: {
          _or: [
            { _not: { isActive: { _eq: true } } },
            { age: { _lt: 26 } },
          ],
        },
      });

      // Users who are NOT active OR age < 26
      // Bob (false), Diana (false), Alice (25)
      expect(result).toHaveLength(3);
      expect(result.map((u) => u.name).sort()).toEqual(["Alice", "Bob", "Diana"]);
    });
  });

  describe("Deeply nested logical operators", () => {
    beforeEach(async () => {
      const db = getDb();
      await db.insert(users).values([
        { name: "Alice", age: 25, isActive: true },
        { name: "Bob", age: 30, isActive: false },
        { name: "Charlie", age: 35, isActive: true },
        { name: "Diana", age: 40, isActive: false },
        { name: "Eve", age: 28, isActive: true },
      ]);
    });

    it("should handle deeply nested _and inside _or inside _and", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: {
          _and: [
            {
              _or: [
                { _and: [{ name: { _eq: "Alice" } }, { age: { _eq: 25 } }] },
                { _and: [{ name: { _eq: "Charlie" } }, { age: { _eq: 35 } }] },
              ],
            },
            { isActive: { _eq: true } },
          ],
        },
      });

      expect(result).toHaveLength(2);
      expect(result.map((u) => u.name).sort()).toEqual(["Alice", "Charlie"]);
    });

    it("should handle _or with multiple _and branches", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: {
          _or: [
            { _and: [{ age: { _lt: 30 } }, { isActive: { _eq: true } }] },
            { _and: [{ age: { _gt: 35 } }, { isActive: { _eq: false } }] },
          ],
        },
      });

      // Alice (25, active), Eve (28, active), Diana (40, inactive)
      expect(result).toHaveLength(3);
      expect(result.map((u) => u.name).sort()).toEqual([
        "Alice",
        "Diana",
        "Eve",
      ]);
    });
  });

  describe("JOIN with different types", () => {
    it("should return products without translations using LEFT JOIN (null handling)", async () => {
      const db = getDb();

      // Insert product WITHOUT translation
      await db
        .insert(products)
        .values({ handle: "orphan-product", price: 500 });

      // Insert product WITH translation
      const [productWithTranslation] = await db
        .insert(products)
        .values({ handle: "product-with-title", price: 999 })
        .returning();

      await db.insert(translations).values({
        entityId: productWithTranslation.id,
        field: "title",
        value: "Product Title",
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await productsWithTranslationsQuery.execute(db as any, {});

      // LEFT JOIN should return both products
      expect(result).toHaveLength(2);
      expect(result.map((p) => p.handle).sort()).toEqual([
        "orphan-product",
        "product-with-title",
      ]);
    });

    it("should filter with INNER JOIN returning only matching records", async () => {
      const db = getDb();

      // Create query with INNER JOIN
      const productsWithInnerJoinQuery = createQuery(products, {
        id: field(products.id),
        handle: field(products.handle),
        price: field(products.price),
        translation: field(products.id).innerJoin(translationsQuery, translations.entityId),
      });

      // Insert product WITHOUT translation
      await db
        .insert(products)
        .values({ handle: "orphan-product", price: 500 });

      // Insert product WITH translation
      const [productWithTranslation] = await db
        .insert(products)
        .values({ handle: "product-with-title", price: 999 })
        .returning();

      await db.insert(translations).values({
        entityId: productWithTranslation.id,
        field: "title",
        value: "Product Title",
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await productsWithInnerJoinQuery.execute(db as any, {
        where: { translation: { value: { _isNot: null } } },
      });

      // INNER JOIN should return only product with translation
      expect(result).toHaveLength(1);
      expect(result[0].handle).toBe("product-with-title");
    });
  });

  describe("JOIN filter operators", () => {
    beforeEach(async () => {
      const db = getDb();

      const [product1] = await db
        .insert(products)
        .values({ handle: "phone", price: 999 })
        .returning();
      const [product2] = await db
        .insert(products)
        .values({ handle: "laptop", price: 1999 })
        .returning();
      const [product3] = await db
        .insert(products)
        .values({ handle: "tablet", price: 599 })
        .returning();

      await db.insert(translations).values([
        { entityId: product1.id, field: "title", value: "Smart Phone" },
        { entityId: product2.id, field: "title", value: "Gaming Laptop" },
        { entityId: product3.id, field: "title", value: "Android Tablet" },
      ]);
    });

    it("should filter through join with _notContains", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await productsWithTranslationsQuery.execute(db as any, {
        where: { translation: { value: { _notContains: "Phone" } } },
      });

      expect(result).toHaveLength(2);
      expect(result.map((p) => p.handle).sort()).toEqual(["laptop", "tablet"]);
    });

    it("should filter through join with _notContainsi", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await productsWithTranslationsQuery.execute(db as any, {
        where: { translation: { value: { _notContainsi: "phone" } } },
      });

      expect(result).toHaveLength(2);
      expect(result.map((p) => p.handle).sort()).toEqual(["laptop", "tablet"]);
    });

    it("should filter through join with _in", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await productsWithTranslationsQuery.execute(db as any, {
        where: {
          translation: { value: { _in: ["Smart Phone", "Gaming Laptop"] } },
        },
      });

      expect(result).toHaveLength(2);
      expect(result.map((p) => p.handle).sort()).toEqual(["laptop", "phone"]);
    });

    it("should filter through join with _notIn", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await productsWithTranslationsQuery.execute(db as any, {
        where: {
          translation: { value: { _notIn: ["Smart Phone", "Gaming Laptop"] } },
        },
      });

      expect(result).toHaveLength(1);
      expect(result[0].handle).toBe("tablet");
    });
  });

  describe("Direct value equality (without operator)", () => {
    beforeEach(async () => {
      const db = getDb();
      await db.insert(users).values([
        { name: "Alice", age: 25, isActive: true },
        { name: "Bob", age: 30, isActive: false },
        { name: "Charlie", age: 35, isActive: true },
      ]);
    });

    it("should filter with direct value (implicit _eq)", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { name: "Alice" },
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Alice");
    });

    it("should filter with direct numeric value", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { age: 30 },
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Bob");
    });

    it("should combine direct values with operators", async () => {
      const db = getDb();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: {
          name: "Alice",
          age: { _gte: 20 },
        },
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Alice");
    });
  });

  describe("UUID filtering", () => {
    it("should filter by UUID with _eq", async () => {
      const db = getDb();

      const [user1] = await db
        .insert(users)
        .values({ name: "Alice", age: 25 })
        .returning();
      await db.insert(users).values({ name: "Bob", age: 30 });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { id: { _eq: user1.id } },
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Alice");
    });

    it("should filter by UUID with _in", async () => {
      const db = getDb();

      const [user1] = await db
        .insert(users)
        .values({ name: "Alice", age: 25 })
        .returning();
      const [user2] = await db
        .insert(users)
        .values({ name: "Bob", age: 30 })
        .returning();
      await db.insert(users).values({ name: "Charlie", age: 35 });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { id: { _in: [user1.id, user2.id] } },
      });

      expect(result).toHaveLength(2);
      expect(result.map((u) => u.name).sort()).toEqual(["Alice", "Bob"]);
    });

    it("should filter by UUID with _neq", async () => {
      const db = getDb();

      const [user1] = await db
        .insert(users)
        .values({ name: "Alice", age: 25 })
        .returning();
      await db.insert(users).values({ name: "Bob", age: 30 });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { id: { _neq: user1.id } },
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Bob");
    });
  });

  describe("Timestamp filtering", () => {
    it("should filter by createdAt with _gte", async () => {
      const db = getDb();

      const pastDate = new Date("2020-01-01");

      // Insert with default now() timestamp
      await db.insert(users).values([
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { createdAt: { _gte: pastDate } },
      });

      // Both users should be found (created now, after 2020)
      expect(result).toHaveLength(2);
    });

    it("should filter by createdAt with _lt", async () => {
      const db = getDb();

      const futureDate = new Date("2030-01-01");

      await db.insert(users).values([
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { createdAt: { _lt: futureDate } },
      });

      // Both users should be found (created now, before 2030)
      expect(result).toHaveLength(2);
    });

    it("should combine timestamp with other filters", async () => {
      const db = getDb();

      const pastDate = new Date("2020-01-01");

      await db.insert(users).values([
        { name: "Alice", age: 25, isActive: true },
        { name: "Bob", age: 30, isActive: false },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: {
          createdAt: { _gte: pastDate },
          isActive: { _eq: true },
        },
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Alice");
    });
  });

  describe("ORDER BY with NULLS positioning", () => {
    beforeEach(async () => {
      const db = getDb();
      await db.insert(users).values([
        { name: "Alice", age: 25 },
        { name: "Bob", age: null },
        { name: "Charlie", age: 35 },
        { name: "Diana", age: null },
      ]);
    });

    it("should order ASC with NULLS LAST (PostgreSQL default)", async () => {
      const db = getDb();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        order: [{ field: "age", direction: "asc" }],
      });

      // ASC order: 25, 35, then nulls (PostgreSQL default is NULLS LAST for ASC)
      expect(result).toHaveLength(4);
      expect(result[0].age).toBe(25);
      expect(result[1].age).toBe(35);
      expect(result[2].age).toBeNull();
      expect(result[3].age).toBeNull();
    });

    it("should order DESC with NULLS FIRST (PostgreSQL default)", async () => {
      const db = getDb();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        order: [{ field: "age", direction: "desc" }],
      });

      // DESC order: PostgreSQL default is NULLS FIRST for DESC
      // So: nulls first, then 35, 25
      expect(result).toHaveLength(4);
      expect(result[0].age).toBeNull();
      expect(result[1].age).toBeNull();
      expect(result[2].age).toBe(35);
      expect(result[3].age).toBe(25);
    });
  });

  describe("RIGHT JOIN and FULL JOIN", () => {
    it("should use RIGHT JOIN", async () => {
      const db = getDb();

      // Create query with RIGHT JOIN
      const productsWithRightJoinQuery = createQuery(products, {
        id: field(products.id),
        handle: field(products.handle),
        price: field(products.price),
        translation: field(products.id).rightJoin(translationsQuery, translations.entityId),
      });

      // Insert orphan translation (no matching product)
      await db.insert(translations).values({
        entityId: "00000000-0000-0000-0000-000000000001",
        field: "title",
        value: "Orphan Translation",
      });

      // Insert product with translation
      const [product] = await db
        .insert(products)
        .values({ handle: "phone", price: 999 })
        .returning();

      await db.insert(translations).values({
        entityId: product.id,
        field: "title",
        value: "Phone Title",
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await productsWithRightJoinQuery.execute(db as any, {
        where: { translation: { value: { _isNot: null } } },
      });

      expect(result).toHaveLength(2);
      expect(result.some((p) => p.handle === "phone")).toBe(true);
      const rawRows = result as Array<{
        handle: string | null;
        price: number | null;
      }>;
      const orphanRow = rawRows.find(
        (row) => row.handle === null && row.price === null
      );
      expect(orphanRow).toBeDefined();
    });

    it("should use FULL JOIN", async () => {
      const db = getDb();

      // Create query with FULL JOIN
      const productsWithFullJoinQuery = createQuery(products, {
        id: field(products.id),
        handle: field(products.handle),
        price: field(products.price),
        translation: field(products.id).fullJoin(translationsQuery, translations.entityId),
      });

      // Insert orphan product (no translation)
      await db
        .insert(products)
        .values({ handle: "orphan-product", price: 500 });

      // Insert orphan translation (no matching product)
      await db.insert(translations).values({
        entityId: "00000000-0000-0000-0000-000000000002",
        field: "title",
        value: "Orphan Translation",
      });

      // Insert product with translation
      const [product] = await db
        .insert(products)
        .values({ handle: "phone", price: 999 })
        .returning();

      await db.insert(translations).values({
        entityId: product.id,
        field: "title",
        value: "Phone Title",
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await productsWithFullJoinQuery.execute(db as any, {
        where: {
          _or: [
            { translation: { value: { _isNot: null } } },
            { price: { _gte: 0 } },
          ],
        },
      });

      expect(result).toHaveLength(3);
      const rawRows = result as Array<{
        handle: string | null;
        price: number | null;
      }>;
      expect(rawRows.some((row) => row.handle === "orphan-product")).toBe(true);
      expect(rawRows.some((row) => row.handle === "phone")).toBe(true);
      expect(
        rawRows.some((row) => row.handle === null && row.price === null)
      ).toBe(true);
    });
  });

  describe("Multiple JOINs in single query", () => {
    it("should handle query with multiple join fields", async () => {
      const db = getDb();

      // Create query with multiple join
      const productsWithMultipleJoinsQuery = createQuery(products, {
        id: field(products.id),
        handle: field(products.handle),
        price: field(products.price),
        translation: field(products.id).leftJoin(translationsQuery, translations.entityId),
      });

      // Insert product with translations
      const [product] = await db
        .insert(products)
        .values({ handle: "phone", price: 999 })
        .returning();

      await db.insert(translations).values({
        entityId: product.id,
        field: "title",
        value: "Smart Phone",
        searchValue: "smartphone mobile",
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await productsWithMultipleJoinsQuery.execute(db as any, {
        where: {
          translation: {
            value: { _containsi: "phone" },
            searchValue: { _containsi: "mobile" },
          },
        },
      });

      expect(result).toHaveLength(1);
      expect(result[0].handle).toBe("phone");
    });
  });

  describe("buildSelectSql integration", () => {
    it("should build valid SQL with all components", async () => {
      const db = getDb();

      await db.insert(users).values([
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
      ]);

      const selectSql = usersQuery.getSql({
        where: { age: { _gte: 20 } },
        limit: 10,
        offset: 0,
      });

      // Execute the built SQL
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (db as any).execute(selectSql);

      expect(result.rows || result).toHaveLength(2);
    });

    it("should build SQL with JOIN", async () => {
      const db = getDb();

      const [product] = await db
        .insert(products)
        .values({ handle: "phone", price: 999 })
        .returning();

      await db.insert(translations).values({
        entityId: product.id,
        field: "title",
        value: "Smart Phone",
      });

      const selectSql = productsWithTranslationsQuery.getSql({
        where: { translation: { value: { _containsi: "phone" } } },
        limit: 10,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (db as any).execute(selectSql);

      const rows = result.rows || result;
      expect(rows).toHaveLength(1);
      expect(rows[0].handle).toBe("phone");
    });
  });

  describe("Combined all parameters", () => {
    it("should handle where + join + order + limit + offset together", async () => {
      const db = getDb();

      // Insert products
      const [p1] = await db
        .insert(products)
        .values({ handle: "phone1", price: 999 })
        .returning();
      const [p2] = await db
        .insert(products)
        .values({ handle: "phone2", price: 899 })
        .returning();
      const [p3] = await db
        .insert(products)
        .values({ handle: "phone3", price: 799 })
        .returning();
      const [p4] = await db
        .insert(products)
        .values({ handle: "laptop", price: 1999 })
        .returning();

      // Insert translations
      await db.insert(translations).values([
        { entityId: p1.id, field: "title", value: "Smart Phone Pro" },
        { entityId: p2.id, field: "title", value: "Smart Phone Basic" },
        { entityId: p3.id, field: "title", value: "Smart Phone Mini" },
        { entityId: p4.id, field: "title", value: "Gaming Laptop" },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await productsWithTranslationsQuery.execute(db as any, {
        where: {
          translation: { value: { _containsi: "phone" } },
          price: { _gte: 800 },
        },
        order: [{ field: "price", direction: "desc" }],
        limit: 2,
        offset: 0,
      });

      // Should get phone1 (999) and phone2 (899), ordered by price desc
      expect(result).toHaveLength(2);
      expect(result[0].handle).toBe("phone1");
      expect(result[0].price).toBe(999);
      expect(result[1].handle).toBe("phone2");
      expect(result[1].price).toBe(899);
    });

    it("should handle all parameters with pagination offset", async () => {
      const db = getDb();

      // Insert products
      const [p1] = await db
        .insert(products)
        .values({ handle: "a-phone", price: 999 })
        .returning();
      const [p2] = await db
        .insert(products)
        .values({ handle: "b-phone", price: 899 })
        .returning();
      const [p3] = await db
        .insert(products)
        .values({ handle: "c-phone", price: 799 })
        .returning();

      await db.insert(translations).values([
        { entityId: p1.id, field: "title", value: "Phone A" },
        { entityId: p2.id, field: "title", value: "Phone B" },
        { entityId: p3.id, field: "title", value: "Phone C" },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await productsWithTranslationsQuery.execute(db as any, {
        where: { translation: { value: { _containsi: "phone" } } },
        order: [{ field: "handle", direction: "asc" }],
        limit: 2,
        offset: 1,
      });

      // Skip first (a-phone), get next 2 (b-phone, c-phone)
      expect(result).toHaveLength(2);
      expect(result[0].handle).toBe("b-phone");
      expect(result[1].handle).toBe("c-phone");
    });

    it("should handle multiple order fields with join and pagination", async () => {
      const db = getDb();

      const [p1] = await db
        .insert(products)
        .values({ handle: "phone", price: 999 })
        .returning();
      const [p2] = await db
        .insert(products)
        .values({ handle: "phone", price: 899 })
        .returning();
      const [p3] = await db
        .insert(products)
        .values({ handle: "tablet", price: 599 })
        .returning();

      await db.insert(translations).values([
        { entityId: p1.id, field: "title", value: "Phone Pro" },
        { entityId: p2.id, field: "title", value: "Phone Basic" },
        { entityId: p3.id, field: "title", value: "Tablet" },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await productsWithTranslationsQuery.execute(db as any, {
        where: { price: { _gt: 0 } },
        order: [{ field: "handle", direction: "asc" }, { field: "price", direction: "desc" }],
        limit: 10,
      });

      // phone (999), phone (899), tablet (599)
      expect(result).toHaveLength(3);
      expect(result[0].handle).toBe("phone");
      expect(result[0].price).toBe(999);
      expect(result[1].handle).toBe("phone");
      expect(result[1].price).toBe(899);
      expect(result[2].handle).toBe("tablet");
    });
  });

  describe("Edge cases and error handling", () => {
    it("should throw SQL error on unknown field in where clause", async () => {
      const db = getDb();
      await db.insert(users).values({ name: "Alice", age: 25 });

      // Unknown field causes SQL error - this is expected behavior
      // The implementation passes unknown fields directly to SQL
      await expect(
        usersQuery.execute(db as any, {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          where: { unknownField: { _eq: "value" } } as any,
        })
      ).rejects.toThrow(/Unknown field "unknownField"/);
    });

    it("should throw SQL error on non-existent order field", async () => {
      const db = getDb();
      await db.insert(users).values([
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
      ]);

      // Non-existent field in order causes SQL error
      await expect(
        usersQuery.execute(db as any, {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          order: [{ field: "nonExistentField", direction: "asc" }] as any,
        })
      ).rejects.toThrow(/Unknown field "nonExistentField"/);
    });

    it("should handle empty where object", async () => {
      const db = getDb();
      await db.insert(users).values([
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: {},
      });

      expect(result).toHaveLength(2);
    });

    it("should handle undefined values in where clause", async () => {
      const db = getDb();
      await db.insert(users).values([
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, {
        where: { name: undefined, age: { _eq: 25 } },
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Alice");
    });

    it("should handle null input gracefully", async () => {
      const db = getDb();
      await db.insert(users).values([
        { name: "Alice", age: 25 },
        { name: "Bob", age: 30 },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersQuery.execute(db as any, null as any);

      // null input returns all with default pagination
      expect(result).toHaveLength(2);
    });
  });

  describe("Qualified tables (pgSchema)", () => {
    it("should query qualified table directly", async () => {
      const db = getDb();

      // Insert user first
      const [user] = await db
        .insert(users)
        .values({ name: "Alice", age: 25 })
        .returning();

      // Insert events into analytics.events (qualified table)
      await db.insert(events).values([
        { userId: user.id, eventType: "login", payload: '{"ip": "127.0.0.1"}' },
        { userId: user.id, eventType: "purchase", payload: '{"amount": 100}' },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await eventsQuery.execute(db as any, {
        where: { eventType: { _eq: "login" } },
      });

      expect(result).toHaveLength(1);
      expect(result[0].eventType).toBe("login");
    });

    it("should join from public table to qualified table", async () => {
      const db = getDb();

      // Insert users
      const [alice] = await db
        .insert(users)
        .values({ name: "Alice", age: 25, isActive: true })
        .returning();
      const [bob] = await db
        .insert(users)
        .values({ name: "Bob", age: 30, isActive: true })
        .returning();

      // Insert events into analytics.events
      await db.insert(events).values([
        { userId: alice.id, eventType: "login", payload: null },
        { userId: alice.id, eventType: "purchase", payload: '{"amount": 50}' },
        { userId: bob.id, eventType: "login", payload: null },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersWithEventsQuery.execute(db as any, {
        where: {
          events: { eventType: { _eq: "purchase" } },
        },
      });

      // Only Alice has a purchase event
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Alice");
    });

    it("should filter qualified table with multiple conditions through join", async () => {
      const db = getDb();

      const [alice] = await db
        .insert(users)
        .values({ name: "Alice", age: 25, isActive: true })
        .returning();
      const [bob] = await db
        .insert(users)
        .values({ name: "Bob", age: 30, isActive: false })
        .returning();

      await db.insert(events).values([
        { userId: alice.id, eventType: "purchase", payload: '{"amount": 100}' },
        { userId: bob.id, eventType: "purchase", payload: '{"amount": 200}' },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await usersWithEventsQuery.execute(db as any, {
        where: {
          isActive: { _eq: true },
          events: { eventType: { _eq: "purchase" } },
        },
      });

      // Only Alice is active and has purchase
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Alice");
    });
  });
});
