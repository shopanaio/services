import { describe, it, expect } from "vitest";
import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  PgDialect,
} from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { aliasedTable } from "drizzle-orm";
import { buildJoinConditions, createQuery, field, MaxLimitExceededError } from "./builder.js";
import { tablePrefix, type JoinInfo, type AliasedTable } from "./schema.js";

// Dialect for SQL serialization
const dialect = new PgDialect();

function toSqlString(sqlObj: SQL): string {
  const query = dialect.sqlToQuery(sqlObj);
  return query.sql;
}

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

// =============================================================================
// Low-level Utilities
// =============================================================================

describe("tablePrefix", () => {
  it("should generate correct prefix", () => {
    expect(tablePrefix("users", 0)).toBe("t0_users");
    expect(tablePrefix("products", 1)).toBe("t1_products");
    expect(tablePrefix("translations", 2)).toBe("t2_translations");
  });
});

// =============================================================================
// Fluent API: Basic Query Creation
// =============================================================================

describe("createQuery", () => {
  it("should create query builder without fields (use all table columns)", () => {
    const usersQuery = createQuery(users);

    const snapshot = usersQuery.getSnapshot();
    expect(snapshot.tableName).toBe("users");
    expect(snapshot.fields).toContain("id");
    expect(snapshot.fields).toContain("name");
    expect(snapshot.fields).toContain("age");
    expect(snapshot.fields).toContain("isActive");
    expect(snapshot.fields).toContain("createdAt");
  });

  it("should create query builder with explicit fields", () => {
    const usersQuery = createQuery(users, {
      id: field(users.id),
      name: field(users.name),
    });

    const snapshot = usersQuery.getSnapshot();
    expect(snapshot.tableName).toBe("users");
    expect(snapshot.fields).toEqual(["id", "name"]);
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
// Fluent API: Configuration Methods
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
      age: field(users.age),
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
      age: field(users.age),
    }).exclude(["age"]);

    expect(query.getSnapshot().config.exclude).toEqual(["age"]);
  });

  it("defaultWhere should set default filter conditions", () => {
    const query = createQuery(users, {
      id: field(users.id),
      isActive: field(users.isActive),
    }).defaultWhere({ isActive: true });

    expect(query.getSnapshot().config.defaultWhere).toEqual({
      isActive: true,
    });
  });

  it("maxLimit should set maximum allowed limit", () => {
    const query = createQuery(users, {
      id: field(users.id),
    }).maxLimit(100);

    expect(query.getSnapshot().config.maxLimit).toBe(100);
  });

  it("defaultLimit should set default limit", () => {
    const query = createQuery(users, {
      id: field(users.id),
    }).defaultLimit(25);

    expect(query.getSnapshot().config.defaultLimit).toBe(25);
  });
});

// =============================================================================
// Fluent API: SQL Generation
// =============================================================================

describe("FluentQueryBuilder SQL generation", () => {
  it("should build valid SQL with SELECT", () => {
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

  it("should use defaultLimit when limit not provided", () => {
    const query = createQuery(users, {
      id: field(users.id),
    }).defaultLimit(15);

    const sql = query.getSql({});
    const sqlString = toSqlString(sql);

    expect(sqlString).toContain("LIMIT");
  });

  it("should use defaultOrder when order not provided", () => {
    const query = createQuery(users, {
      id: field(users.id),
      name: field(users.name),
    }).defaultOrder("name:asc");

    const sql = query.getSql({ limit: 10 });
    const sqlString = toSqlString(sql);

    expect(sqlString).toContain("ORDER BY");
  });

  it("should apply defaultWhere when where not provided", () => {
    const query = createQuery(users, {
      id: field(users.id),
      name: field(users.name),
    }).defaultWhere({ name: "default" });

    const sql = query.getSql({ limit: 10 });
    const sqlString = toSqlString(sql);

    expect(sqlString).toContain("WHERE");
  });

  it("should override defaults with explicit options", () => {
    const query = createQuery(users, {
      id: field(users.id),
      name: field(users.name),
    })
      .defaultOrder("id:asc")
      .defaultLimit(5);

    const sql = query.getSql({
      order: ["name:desc"],
      limit: 20,
    });

    const sqlString = toSqlString(sql);
    expect(sqlString).toContain("DESC");
  });
});

// =============================================================================
// Fluent API: Max Limit
// =============================================================================

describe("FluentQueryBuilder maxLimit", () => {
  it("should throw MaxLimitExceededError when limit exceeds maxLimit", () => {
    const query = createQuery(users, {
      id: field(users.id),
    }).maxLimit(10);

    expect(() => query.getSql({ limit: 20 })).toThrow(MaxLimitExceededError);
  });

  it("should allow limit equal to maxLimit", () => {
    const query = createQuery(users, {
      id: field(users.id),
    }).maxLimit(10);

    expect(() => query.getSql({ limit: 10 })).not.toThrow();
  });

  it("should allow limit less than maxLimit", () => {
    const query = createQuery(users, {
      id: field(users.id),
    }).maxLimit(100);

    expect(() => query.getSql({ limit: 5 })).not.toThrow();
  });
});

// =============================================================================
// Fluent API: Include/Exclude
// =============================================================================

describe("FluentQueryBuilder include/exclude", () => {
  it("should add included fields to select", () => {
    const query = createQuery(users, {
      id: field(users.id),
      name: field(users.name),
      age: field(users.age),
    })
      .defaultSelect(["name"])
      .include(["id"]);

    const sql = query.getSql({ limit: 10 });
    const sqlString = toSqlString(sql);

    // Both "name" and "id" should be selected
    expect(sqlString).toContain('"name"');
    expect(sqlString).toContain('"id"');
  });

  it("should remove excluded fields from select", () => {
    const query = createQuery(users, {
      id: field(users.id),
      name: field(users.name),
      age: field(users.age),
    })
      .defaultSelect(["id", "name", "age"])
      .exclude(["age"]);

    const sql = query.getSql({ limit: 10 });
    const sqlString = toSqlString(sql);

    expect(sqlString).toContain('"id"');
    expect(sqlString).toContain('"name"');
    // age should be excluded
    expect(sqlString).not.toContain('"age"');
  });
});

// =============================================================================
// Fluent API: Joins
// =============================================================================

describe("FluentQueryBuilder joins", () => {
  const translationsQuery = createQuery(translations, {
    id: field(translations.id),
    entityId: field(translations.entityId),
    value: field(translations.value),
  });

  it("should create query with left join", () => {
    const productsWithTranslation = createQuery(products, {
      id: field(products.id),
      handle: field(products.handle),
      translation: field(products.id).leftJoin(translationsQuery, translations.entityId),
    });

    const snapshot = productsWithTranslation.getSnapshot();
    expect(snapshot.fields).toContain("translation");
  });

  it("should create query with inner join", () => {
    const productsWithTranslation = createQuery(products, {
      id: field(products.id),
      handle: field(products.handle),
      translation: field(products.id).innerJoin(translationsQuery, translations.entityId),
    });

    const snapshot = productsWithTranslation.getSnapshot();
    expect(snapshot.fields).toContain("translation");
  });

  it("should build SQL with LEFT JOIN when selecting joined field", () => {
    const productsWithTranslation = createQuery(products, {
      id: field(products.id),
      handle: field(products.handle),
      translation: field(products.id).leftJoin(translationsQuery, translations.entityId),
    });

    const sql = productsWithTranslation.getSql({
      select: ["id", "handle", "translation.value"],
      limit: 10,
    });

    const sqlString = toSqlString(sql);
    expect(sqlString).toContain("LEFT JOIN");
    expect(sqlString).toContain("translations");
  });

  it("should build SQL with WHERE on joined field", () => {
    const productsWithTranslation = createQuery(products, {
      id: field(products.id),
      handle: field(products.handle),
      translation: field(products.id).leftJoin(translationsQuery, translations.entityId),
    });

    const sql = productsWithTranslation.getSql({
      where: {
        translation: {
          value: { $iLike: "%test%" },
        },
      },
      limit: 10,
    });

    const sqlString = toSqlString(sql);
    expect(sqlString).toContain("WHERE");
    expect(sqlString).toContain("LEFT JOIN");
  });
});

// =============================================================================
// Fluent API: Schema Access
// =============================================================================

describe("FluentQueryBuilder schema access", () => {
  it("should provide access to underlying schema", () => {
    const usersQuery = createQuery(users, {
      id: field(users.id),
      name: field(users.name),
    });

    const schema = usersQuery.getSchema();
    expect(schema.tableName).toBe("users");
    expect(schema.getField("id")).toEqual({ column: "id" });
    expect(schema.getField("name")).toEqual({ column: "name" });
  });

  it("should return undefined for unknown field in schema", () => {
    const usersQuery = createQuery(users, {
      id: field(users.id),
    });

    const schema = usersQuery.getSchema();
    expect(schema.getField("unknown")).toBeUndefined();
  });

  it("should detect joins in schema", () => {
    const translationsQuery = createQuery(translations, {
      entityId: field(translations.entityId),
      value: field(translations.value),
    });

    const productsQuery = createQuery(products, {
      id: field(products.id),
      translation: field(products.id).leftJoin(translationsQuery, translations.entityId),
    });

    const schema = productsQuery.getSchema();
    expect(schema.hasJoin("id")).toBe(false);
    expect(schema.hasJoin("translation")).toBe(true);

    const join = schema.getJoin("translation");
    expect(join).toBeDefined();
    expect(join!.column).toBe("entity_id");
  });
});

// =============================================================================
// Fluent API: Table and Fields Access
// =============================================================================

describe("FluentQueryBuilder accessors", () => {
  it("should return table via getTable()", () => {
    const usersQuery = createQuery(users, {
      id: field(users.id),
    });

    expect(usersQuery.getTable()).toBe(users);
  });

  it("should return table name via getTableName()", () => {
    const usersQuery = createQuery(users, {
      id: field(users.id),
    });

    expect(usersQuery.getTableName()).toBe("users");
  });

  it("should return fields definition via getFieldsDef()", () => {
    const fieldsDef = {
      id: field(users.id),
      name: field(users.name),
    };

    const usersQuery = createQuery(users, fieldsDef);

    const result = usersQuery.getFieldsDef();
    expect(result.id.column).toBe("id");
    expect(result.name.column).toBe("name");
  });
});

// =============================================================================
// Low-level: buildJoinConditions
// =============================================================================

describe("buildJoinConditions", () => {
  it("should return empty array for empty joins", () => {
    const result = buildJoinConditions([]);
    expect(result).toEqual([]);
  });

  it("should build join conditions from JoinInfo array", () => {
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
    expect(result[0].on).toBeDefined();
  });
});
