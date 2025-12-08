import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
  PgDialect,
} from "drizzle-orm/pg-core";
import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import type { SQL } from "drizzle-orm";
import {
  createQuery,
  createPaginationQuery,
  field,
  MaxLimitExceededError,
} from "./index.js";

// Dialect for SQL serialization
const dialect = new PgDialect();

function toSqlString(sqlObj: SQL): string {
  const query = dialect.sqlToQuery(sqlObj);
  return query.sql;
}

// =============================================================================
// Test Tables
// =============================================================================

const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email"),
  age: integer("age"),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

const addresses = pgTable("addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  city: text("city").notNull(),
  country: text("country").notNull(),
  zipCode: text("zip_code"),
});

const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  total: integer("total").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================================================
// Database Setup
// =============================================================================

let client: PGlite;
let db: PgliteDatabase;

beforeAll(async () => {
  client = new PGlite();
  db = drizzle(client);

  await client.exec(`
    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT,
      age INTEGER,
      created_at TIMESTAMP DEFAULT now(),
      deleted_at TIMESTAMP
    );

    CREATE TABLE addresses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      city TEXT NOT NULL,
      country TEXT NOT NULL,
      zip_code TEXT
    );

    CREATE TABLE orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      total INTEGER NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT now()
    );
  `);

  // Insert test data
  await client.exec(`
    INSERT INTO users (id, name, email, age) VALUES
      ('11111111-1111-1111-1111-111111111111', 'Alice', 'alice@example.com', 25),
      ('22222222-2222-2222-2222-222222222222', 'Bob', 'bob@example.com', 30),
      ('33333333-3333-3333-3333-333333333333', 'Charlie', 'charlie@example.com', 35);

    INSERT INTO addresses (id, user_id, city, country, zip_code) VALUES
      ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'New York', 'USA', '10001'),
      ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'London', 'UK', 'SW1A 1AA');

    INSERT INTO orders (id, user_id, total, status) VALUES
      ('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 100, 'completed'),
      ('00000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 200, 'pending'),
      ('00000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 150, 'completed');
  `);
});

afterAll(async () => {
  await client.close();
});

// =============================================================================
// Tests: Basic Query Creation
// =============================================================================

describe("createQuery", () => {
  it("should create a basic query builder", () => {
    const usersQuery = createQuery(users, {
      id: field(users.id),
      name: field(users.name),
      email: field(users.email),
    });

    const snapshot = usersQuery.getSnapshot();
    expect(snapshot.tableName).toBe("users");
    expect(snapshot.fields).toEqual(["id", "name", "email"]);
  });

  it("should support chaining configuration methods", () => {
    const usersQuery = createQuery(users, {
      id: field(users.id),
      name: field(users.name),
    })
      .defaultOrder("id:asc")
      .defaultLimit(10)
      .maxLimit(50);

    const snapshot = usersQuery.getSnapshot();
    expect(snapshot.config.defaultOrder).toBe("id:asc");
    expect(snapshot.config.defaultLimit).toBe(10);
    expect(snapshot.config.maxLimit).toBe(50);
  });

  it("should be immutable (each method returns new instance)", () => {
    const query1 = createQuery(users, {
      id: field(users.id),
      name: field(users.name),
    });

    const query2 = query1.defaultLimit(10);
    const query3 = query2.maxLimit(100);

    expect(query1.getSnapshot().config.defaultLimit).toBeUndefined();
    expect(query2.getSnapshot().config.defaultLimit).toBe(10);
    expect(query2.getSnapshot().config.maxLimit).toBeUndefined();
    expect(query3.getSnapshot().config.maxLimit).toBe(100);
  });
});

// =============================================================================
// Tests: Configuration Methods
// =============================================================================

describe("FluentQueryBuilder configuration", () => {
  it("defaultOrder should set default order", () => {
    const query = createQuery(users, {
      id: field(users.id),
      name: field(users.name),
    }).defaultOrder("name:desc");

    expect(query.getSnapshot().config.defaultOrder).toBe("name:desc");
  });

  it("defaultSelect should set default fields", () => {
    const query = createQuery(users, {
      id: field(users.id),
      name: field(users.name),
      email: field(users.email),
    }).defaultSelect(["id", "name"]);

    expect(query.getSnapshot().config.defaultSelect).toEqual(["id", "name"]);
  });

  it("include should set always-included fields", () => {
    const query = createQuery(users, {
      id: field(users.id),
      name: field(users.name),
    }).include(["id"]);

    expect(query.getSnapshot().config.include).toEqual(["id"]);
  });

  it("exclude should set always-excluded fields", () => {
    const query = createQuery(users, {
      id: field(users.id),
      email: field(users.email),
    }).exclude(["email"]);

    expect(query.getSnapshot().config.exclude).toEqual(["email"]);
  });

  it("defaultWhere should set default filter conditions", () => {
    const query = createQuery(users, {
      id: field(users.id),
      deletedAt: field(users.deletedAt),
    }).defaultWhere({ deletedAt: null });

    expect(query.getSnapshot().config.defaultWhere).toEqual({
      deletedAt: null,
    });
  });
});

// =============================================================================
// Tests: Query Execution
// =============================================================================

describe("FluentQueryBuilder execution", () => {
  const usersQuery = createQuery(users, {
    id: field(users.id),
    name: field(users.name),
    email: field(users.email),
    age: field(users.age),
  });

  it("should execute basic query", async () => {
    const results = await usersQuery.execute(db, {
      limit: 10,
      select: ["id", "name"],
    });

    expect(results.length).toBe(3);
    expect(results[0]).toHaveProperty("id");
    expect(results[0]).toHaveProperty("name");
  });

  it("should apply where filter", async () => {
    const results = await usersQuery.execute(db, {
      where: { name: "Alice" },
      limit: 10,
    });

    expect(results.length).toBe(1);
    expect(results[0].name).toBe("Alice");
  });

  it("should apply limit", async () => {
    const results = await usersQuery.execute(db, { limit: 2 });

    expect(results.length).toBe(2);
  });

  it("should apply order", async () => {
    const results = await usersQuery.execute(db, {
      order: ["name:asc"],
      limit: 10,
    });

    expect(results[0].name).toBe("Alice");
    expect(results[1].name).toBe("Bob");
    expect(results[2].name).toBe("Charlie");
  });

  it("should use defaultLimit when limit not provided", async () => {
    const query = usersQuery.defaultLimit(2);
    const results = await query.execute(db, {});

    expect(results.length).toBe(2);
  });

  it("should use defaultOrder when order not provided", async () => {
    const query = usersQuery.defaultOrder("name:desc");
    const results = await query.execute(db, { limit: 10 });

    expect(results[0].name).toBe("Charlie");
  });

  it("should use defaultWhere when where not provided", async () => {
    const query = usersQuery.defaultWhere({ name: "Bob" });
    const results = await query.execute(db, { limit: 10 });

    expect(results.length).toBe(1);
    expect(results[0].name).toBe("Bob");
  });

  it("should override defaults with explicit options", async () => {
    const query = usersQuery
      .defaultOrder("name:asc")
      .defaultLimit(1)
      .defaultWhere({ name: "Alice" });

    // Override all defaults
    const results = await query.execute(db, {
      order: ["name:desc"],
      limit: 3,
      where: { age: { $gte: 25 } },
    });

    expect(results.length).toBe(3);
    expect(results[0].name).toBe("Charlie");
  });
});

// =============================================================================
// Tests: Max Limit
// =============================================================================

describe("FluentQueryBuilder maxLimit", () => {
  it("should throw MaxLimitExceededError when limit exceeds maxLimit", async () => {
    const query = createQuery(users, {
      id: field(users.id),
    }).maxLimit(10);

    await expect(query.execute(db, { limit: 20 })).rejects.toThrow(
      MaxLimitExceededError
    );
  });

  it("should allow limit equal to maxLimit", async () => {
    const query = createQuery(users, {
      id: field(users.id),
    }).maxLimit(10);

    const results = await query.execute(db, { limit: 10 });
    expect(results).toBeDefined();
  });

  it("should allow limit less than maxLimit", async () => {
    const query = createQuery(users, {
      id: field(users.id),
    }).maxLimit(100);

    const results = await query.execute(db, { limit: 5 });
    expect(results.length).toBeLessThanOrEqual(5);
  });
});

// =============================================================================
// Tests: Include/Exclude
// =============================================================================

describe("FluentQueryBuilder include/exclude", () => {
  it("should add included fields to select", async () => {
    const query = createQuery(users, {
      id: field(users.id),
      name: field(users.name),
      email: field(users.email),
    })
      .defaultSelect(["name"])
      .include(["id"]);

    const sql = query.getSql({ limit: 10 });
    const sqlString = toSqlString(sql);

    // Both "name" and "id" should be selected
    expect(sqlString).toContain('"name"');
    expect(sqlString).toContain('"id"');
  });

  it("should remove excluded fields from select", async () => {
    const query = createQuery(users, {
      id: field(users.id),
      name: field(users.name),
      email: field(users.email),
    })
      .defaultSelect(["id", "name", "email"])
      .exclude(["email"]);

    const sql = query.getSql({ limit: 10 });
    const sqlString = toSqlString(sql);

    expect(sqlString).toContain('"id"');
    expect(sqlString).toContain('"name"');
    // email should be excluded
    expect(sqlString).not.toContain('"email"');
  });
});

// =============================================================================
// Tests: Joins
// =============================================================================

describe("FluentQueryBuilder with joins", () => {
  // Create address query first (no dependencies)
  const addressesQuery = createQuery(addresses, {
    id: field(addresses.id),
    userId: field(addresses.userId),
    city: field(addresses.city),
    country: field(addresses.country),
    zipCode: field(addresses.zipCode),
  });

  // Create orders query (no dependencies)
  const ordersQuery = createQuery(orders, {
    id: field(orders.id),
    userId: field(orders.userId),
    total: field(orders.total),
    status: field(orders.status),
  });

  it("should create query with left join", () => {
    const usersWithAddress = createQuery(users, {
      id: field(users.id),
      name: field(users.name),
      address: field(users.id).leftJoin(addressesQuery, addresses.userId),
    });

    const snapshot = usersWithAddress.getSnapshot();
    expect(snapshot.fields).toContain("address");
  });

  it("should create query with inner join", () => {
    const usersWithOrders = createQuery(users, {
      id: field(users.id),
      name: field(users.name),
      orders: field(users.id).innerJoin(ordersQuery, orders.userId),
    });

    const snapshot = usersWithOrders.getSnapshot();
    expect(snapshot.fields).toContain("orders");
  });

  it("should build SQL with join", () => {
    const usersWithAddress = createQuery(users, {
      id: field(users.id),
      name: field(users.name),
      address: field(users.id).leftJoin(addressesQuery, addresses.userId),
    });

    const sql = usersWithAddress.getSql({
      select: ["id", "name", "address.city"],
      limit: 10,
    });

    const sqlString = toSqlString(sql);
    expect(sqlString).toContain("LEFT JOIN");
    expect(sqlString).toContain("addresses");
  });
});

// =============================================================================
// Tests: Pagination Query Builder
// =============================================================================

// TODO: Fix circular dependency issue with cursor/builder.ts
describe.skip("createPaginationQuery", () => {
  const usersQuery = createQuery(users, {
    id: field(users.id),
    name: field(users.name),
    email: field(users.email),
  })
    .defaultOrder("id:asc")
    .maxLimit(100);

  it("should create pagination query from fluent query", () => {
    const pagination = createPaginationQuery(usersQuery, {
      name: "user",
      tieBreaker: "id",
    });

    const config = pagination.getConfig();
    expect(config.name).toBe("user");
    expect(config.tieBreaker).toBe("id");
  });

  it("should use table name as default cursor type", () => {
    const pagination = createPaginationQuery(usersQuery);
    const config = pagination.getConfig();
    expect(config.name).toBe("users");
  });

  it("should execute forward pagination", async () => {
    const pagination = createPaginationQuery(usersQuery, {
      name: "user",
    });

    const result = await pagination.execute(db, { first: 2 });

    expect(result.edges).toHaveLength(2);
    expect(result.pageInfo).toBeDefined();
    expect(result.pageInfo.hasNextPage).toBe(true);
    expect(result.pageInfo.hasPreviousPage).toBe(false);
  });

  it("should execute with cursor", async () => {
    const pagination = createPaginationQuery(usersQuery, {
      name: "user",
    });

    // First page
    const page1 = await pagination.execute(db, { first: 1 });
    expect(page1.edges).toHaveLength(1);

    // Second page using cursor
    const cursor = page1.pageInfo.endCursor;
    const page2 = await pagination.execute(db, {
      first: 1,
      after: cursor,
    });

    expect(page2.edges).toHaveLength(1);
    expect(page2.edges[0].node.id).not.toBe(page1.edges[0].node.id);
  });

  it("should inherit config from fluent query", async () => {
    const query = createQuery(users, {
      id: field(users.id),
      name: field(users.name),
    })
      .defaultWhere({ name: "Alice" })
      .maxLimit(50);

    const pagination = createPaginationQuery(query);
    const result = await pagination.execute(db, { first: 10 });

    // Should only return Alice due to defaultWhere
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].node.name).toBe("Alice");
  });
});

// =============================================================================
// Tests: SQL Generation
// =============================================================================

describe("FluentQueryBuilder SQL generation", () => {
  it("should build valid SQL", () => {
    const query = createQuery(users, {
      id: field(users.id),
      name: field(users.name),
    });

    const sql = query.getSql({ limit: 10 });
    const sqlString = toSqlString(sql);

    expect(sqlString).toContain("SELECT");
    expect(sqlString).toContain("FROM");
    expect(sqlString).toContain("LIMIT");
  });

  it("should include WHERE clause when filter provided", () => {
    const query = createQuery(users, {
      id: field(users.id),
      name: field(users.name),
    });

    const sql = query.getSql({
      where: { name: "test" },
      limit: 10,
    });

    const sqlString = toSqlString(sql);
    expect(sqlString).toContain("WHERE");
  });

  it("should include ORDER BY clause when order provided", () => {
    const query = createQuery(users, {
      id: field(users.id),
      name: field(users.name),
    });

    const sql = query.getSql({
      order: ["name:desc"],
      limit: 10,
    });

    const sqlString = toSqlString(sql);
    expect(sqlString).toContain("ORDER BY");
    expect(sqlString).toContain("DESC");
  });
});

// =============================================================================
// Tests: Complex Example (full usage)
// =============================================================================

describe("Complex usage example", () => {
  it("should work with complete fluent chain", async () => {
    // Build a complex query with all options
    const query = createQuery(users, {
      id: field(users.id),
      name: field(users.name),
      email: field(users.email),
      age: field(users.age),
      createdAt: field(users.createdAt),
      deletedAt: field(users.deletedAt),
    })
      .defaultOrder("createdAt:desc")
      .defaultSelect(["id", "name", "email"])
      .include(["id"])
      .exclude(["createdAt"])
      .maxLimit(100)
      .defaultLimit(20)
      .defaultWhere({ deletedAt: { $is: null } });

    // Get snapshot
    const snapshot = query.getSnapshot();
    expect(snapshot.config.defaultOrder).toBe("createdAt:desc");
    expect(snapshot.config.maxLimit).toBe(100);

    // Execute with overrides
    const results = await query.execute(db, {
      where: { age: { $gte: 25 } },
      order: ["name:asc"],
      limit: 10,
    });

    expect(results.length).toBe(3);
    expect(results[0].name).toBe("Alice");
  });
});

// =============================================================================
// Tests: Type Inference for Nested Paths
// =============================================================================

describe("Type inference for nested paths", () => {
  // Create address query first (no dependencies)
  const addressesQuery = createQuery(addresses, {
    id: field(addresses.id),
    userId: field(addresses.userId),
    city: field(addresses.city),
    country: field(addresses.country),
    zipCode: field(addresses.zipCode),
  });

  it("should support fluent API for joins with direct schema", () => {
    // New fluent API syntax with direct schema
    const usersWithAddress = createQuery(users, {
      id: field(users.id),
      name: field(users.name),
      address: field(users.id).leftJoin(addressesQuery, addresses.userId),
    });

    // Type assertion: nested paths should work
    const _validSelect: Parameters<typeof usersWithAddress.execute>[1] = {
      select: ["id", "name", "address.city", "address.country"],
      limit: 10,
    };

    expect(_validSelect.select).toContain("address.city");
  });

  it("should infer nested paths correctly for joins", () => {
    const usersWithAddress = createQuery(users, {
      id: field(users.id),
      name: field(users.name),
      address: field(users.id).leftJoin(addressesQuery, addresses.userId),
    });

    // Type assertion: These should compile without errors
    // Testing that NestedPaths includes "address.city", "address.country", etc.
    const _validSelect: Parameters<typeof usersWithAddress.execute>[1] = {
      select: [
        "id",
        "name",
        "address",
        "address.id",
        "address.city",
        "address.country",
      ],
      limit: 10,
    };

    const _validOrder: Parameters<typeof usersWithAddress.execute>[1] = {
      order: ["id:asc", "address.city:desc"],
      limit: 10,
    };

    const _validWhere: Parameters<typeof usersWithAddress.execute>[1] = {
      where: {
        id: "test",
        address: {
          city: "New York",
          country: { $like: "US%" },
        },
      },
      limit: 10,
    };

    // Just verify compilation works
    expect(_validSelect.select).toContain("address.city");
    expect(_validOrder.order).toContain("address.city:desc");
    expect(_validWhere.where).toBeDefined();
  });

  it("should build SQL with nested select paths", () => {
    const usersWithAddress = createQuery(users, {
      id: field(users.id),
      name: field(users.name),
      address: field(users.id).leftJoin(addressesQuery, addresses.userId),
    });

    const sql = usersWithAddress.getSql({
      select: ["id", "name", "address.city", "address.country"],
      limit: 10,
    });

    const sqlString = toSqlString(sql);
    expect(sqlString).toContain("LEFT JOIN");
    expect(sqlString).toContain("addresses");
  });

  it("should build SQL with nested where conditions", () => {
    const usersWithAddress = createQuery(users, {
      id: field(users.id),
      name: field(users.name),
      address: field(users.id).leftJoin(addressesQuery, addresses.userId),
    });

    const sql = usersWithAddress.getSql({
      where: {
        address: {
          city: "New York",
        },
      },
      limit: 10,
    });

    const sqlString = toSqlString(sql);
    expect(sqlString).toContain("WHERE");
    expect(sqlString).toContain("addresses");
  });
});
