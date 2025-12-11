import { describe, it, expect } from "vitest";
import {
  PgDialect,
  pgTable,
  text,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import {
  OPERATORS,
  buildOperatorCondition,
  isOperator,
  isLogicalOperator,
  isFilterObject,
} from "../operators.js";

const testTable = pgTable("test", {
  id: integer("id").primaryKey(),
  name: text("name"),
  age: integer("age"),
  isActive: boolean("is_active"),
});
const dialect = new PgDialect();

describe("OPERATORS", () => {
  it("should have all expected operators", () => {
    expect(OPERATORS._eq).toBe("eq");
    expect(OPERATORS._neq).toBe("neq");
    expect(OPERATORS._gt).toBe("gt");
    expect(OPERATORS._gte).toBe("gte");
    expect(OPERATORS._lt).toBe("lt");
    expect(OPERATORS._lte).toBe("lte");
    expect(OPERATORS._in).toBe("in");
    expect(OPERATORS._notIn).toBe("notIn");
    expect(OPERATORS._is).toBe("is");
    expect(OPERATORS._isNot).toBe("isNot");
    // String operators
    expect(OPERATORS._contains).toBe("contains");
    expect(OPERATORS._notContains).toBe("notContains");
    expect(OPERATORS._containsi).toBe("containsi");
    expect(OPERATORS._notContainsi).toBe("notContainsi");
    expect(OPERATORS._startsWith).toBe("startsWith");
    expect(OPERATORS._startsWithi).toBe("startsWithi");
    expect(OPERATORS._endsWith).toBe("endsWith");
    expect(OPERATORS._endsWithi).toBe("endsWithi");
    // Range operator
    expect(OPERATORS._between).toBe("between");
  });
});

describe("isOperator", () => {
  it("should return true for valid operators", () => {
    expect(isOperator("_eq")).toBe(true);
    expect(isOperator("_neq")).toBe(true);
    expect(isOperator("_gt")).toBe(true);
    expect(isOperator("_in")).toBe(true);
    expect(isOperator("_contains")).toBe(true);
  });

  it("should return false for invalid operators", () => {
    expect(isOperator("eq")).toBe(false);
    expect(isOperator("_unknown")).toBe(false);
    expect(isOperator("name")).toBe(false);
    expect(isOperator("")).toBe(false);
  });
});

describe("isLogicalOperator", () => {
  it("should return true for _and, _or and _not", () => {
    expect(isLogicalOperator("_and")).toBe(true);
    expect(isLogicalOperator("_or")).toBe(true);
    expect(isLogicalOperator("_not")).toBe(true);
  });

  it("should return false for other operators", () => {
    expect(isLogicalOperator("_eq")).toBe(false);
    expect(isLogicalOperator("and")).toBe(false);
    expect(isLogicalOperator("_AND")).toBe(false);
  });
});

describe("isFilterObject", () => {
  it("should return true for objects with only _ keys", () => {
    expect(isFilterObject({ _eq: 1 })).toBe(true);
    expect(isFilterObject({ _gt: 1, _lt: 10 })).toBe(true);
    expect(isFilterObject({ _in: [1, 2, 3] })).toBe(true);
  });

  it("should return false for objects with non-_ keys", () => {
    expect(isFilterObject({ name: "test" })).toBe(false);
    expect(isFilterObject({ _eq: 1, name: "test" })).toBe(false);
  });

  it("should return false for non-objects", () => {
    expect(isFilterObject(null)).toBe(false);
    expect(isFilterObject(undefined)).toBe(false);
    expect(isFilterObject("string")).toBe(false);
    expect(isFilterObject(123)).toBe(false);
    expect(isFilterObject([1, 2, 3])).toBe(false);
  });

  it("should return false for empty object", () => {
    expect(isFilterObject({})).toBe(false);
  });
});

describe("buildOperatorCondition", () => {
  const column = testTable.age;

  describe("equality operators", () => {
    it("should build _eq condition", () => {
      const result = buildOperatorCondition(column, "_eq", 25);
      expect(result).not.toBeNull();
    });

    it("should build _neq condition", () => {
      const result = buildOperatorCondition(column, "_neq", 25);
      expect(result).not.toBeNull();
    });
  });

  describe("comparison operators", () => {
    it("should build _gt condition", () => {
      const result = buildOperatorCondition(column, "_gt", 18);
      expect(result).not.toBeNull();
    });

    it("should build _gte condition", () => {
      const result = buildOperatorCondition(column, "_gte", 18);
      expect(result).not.toBeNull();
    });

    it("should build _lt condition", () => {
      const result = buildOperatorCondition(column, "_lt", 30);
      expect(result).not.toBeNull();
    });

    it("should build _lte condition", () => {
      const result = buildOperatorCondition(column, "_lte", 30);
      expect(result).not.toBeNull();
    });
  });

  describe("array operators", () => {
    it("should build _in condition", () => {
      const result = buildOperatorCondition(column, "_in", [1, 2, 3]);
      expect(result).not.toBeNull();
    });

    it("should return FALSE for empty _in array", () => {
      const result = buildOperatorCondition(column, "_in", []);
      expect(result).not.toBeNull();
      const query = dialect.sqlToQuery(result!);
      expect(query.sql.trim()).toBe("FALSE");
    });

    it("should build _notIn condition", () => {
      const result = buildOperatorCondition(column, "_notIn", [1, 2, 3]);
      expect(result).not.toBeNull();
    });

    it("should return TRUE for empty _notIn array", () => {
      const result = buildOperatorCondition(column, "_notIn", []);
      expect(result).not.toBeNull();
      const query = dialect.sqlToQuery(result!);
      expect(query.sql.trim()).toBe("TRUE");
    });
  });

  describe("null operators", () => {
    it("should build _is null condition", () => {
      const result = buildOperatorCondition(column, "_is", null);
      expect(result).not.toBeNull();
    });

    it("should build _isNot null condition", () => {
      const result = buildOperatorCondition(column, "_isNot", null);
      expect(result).not.toBeNull();
    });

    it("should return null for non-null _is value", () => {
      const result = buildOperatorCondition(column, "_is", "something");
      expect(result).toBeNull();
    });
  });

  describe("unknown operators", () => {
    it("should return null for unknown operators", () => {
      const result = buildOperatorCondition(column, "_unknown", 1);
      expect(result).toBeNull();
    });
  });

  describe("operator normalization", () => {
    it("should handle operators without _ prefix", () => {
      const result = buildOperatorCondition(column, "eq", 25);
      expect(result).not.toBeNull();
    });

    it("should handle uppercase operators", () => {
      const result = buildOperatorCondition(column, "_EQ", 25);
      expect(result).not.toBeNull();
    });
  });

  describe("string convenience operators", () => {
    const nameColumn = testTable.name;

    it("should build _contains condition with wildcards", () => {
      const result = buildOperatorCondition(nameColumn, "_contains", "test");
      expect(result).not.toBeNull();
      const query = dialect.sqlToQuery(result!);
      expect(query.sql).toContain("like");
      expect(query.params).toContain("%test%");
    });

    it("should build _notContains condition with wildcards", () => {
      const result = buildOperatorCondition(nameColumn, "_notContains", "test");
      expect(result).not.toBeNull();
      const query = dialect.sqlToQuery(result!);
      expect(query.sql).toContain("not like");
      expect(query.params).toContain("%test%");
    });

    it("should build _containsi condition (case-insensitive)", () => {
      const result = buildOperatorCondition(nameColumn, "_containsi", "test");
      expect(result).not.toBeNull();
      const query = dialect.sqlToQuery(result!);
      expect(query.sql).toContain("ilike");
      expect(query.params).toContain("%test%");
    });

    it("should build _notContainsi condition (case-insensitive)", () => {
      const result = buildOperatorCondition(nameColumn, "_notContainsi", "test");
      expect(result).not.toBeNull();
      const query = dialect.sqlToQuery(result!);
      expect(query.sql).toContain("not ilike");
      expect(query.params).toContain("%test%");
    });

    it("should build _startsWith condition with trailing wildcard", () => {
      const result = buildOperatorCondition(nameColumn, "_startsWith", "test");
      expect(result).not.toBeNull();
      const query = dialect.sqlToQuery(result!);
      expect(query.sql).toContain("like");
      expect(query.params).toContain("test%");
    });

    it("should build _startsWithi condition (case-insensitive)", () => {
      const result = buildOperatorCondition(nameColumn, "_startsWithi", "test");
      expect(result).not.toBeNull();
      const query = dialect.sqlToQuery(result!);
      expect(query.sql).toContain("ilike");
      expect(query.params).toContain("test%");
    });

    it("should build _endsWith condition with leading wildcard", () => {
      const result = buildOperatorCondition(nameColumn, "_endsWith", "test");
      expect(result).not.toBeNull();
      const query = dialect.sqlToQuery(result!);
      expect(query.sql).toContain("like");
      expect(query.params).toContain("%test");
    });

    it("should build _endsWithi condition (case-insensitive)", () => {
      const result = buildOperatorCondition(nameColumn, "_endsWithi", "test");
      expect(result).not.toBeNull();
      const query = dialect.sqlToQuery(result!);
      expect(query.sql).toContain("ilike");
      expect(query.params).toContain("%test");
    });

    it("should escape wildcards in user input", () => {
      const result = buildOperatorCondition(nameColumn, "_contains", "test%value_here");
      expect(result).not.toBeNull();
      const query = dialect.sqlToQuery(result!);
      // The wildcards in user input should be escaped
      expect(query.params).toContain("%test\\%value\\_here%");
    });

    it("should return null for non-string values", () => {
      const result = buildOperatorCondition(nameColumn, "_contains", 123);
      expect(result).toBeNull();
    });
  });

  describe("_between operator", () => {
    it("should build _between condition", () => {
      const result = buildOperatorCondition(column, "_between", [10, 100]);
      expect(result).not.toBeNull();
      const query = dialect.sqlToQuery(result!);
      // Should generate >= and <= conditions
      expect(query.sql).toContain(">=");
      expect(query.sql).toContain("<=");
    });

    it("should return null for non-array values", () => {
      const result = buildOperatorCondition(column, "_between", "not-array");
      expect(result).toBeNull();
    });

    it("should return null for arrays with wrong length", () => {
      const result = buildOperatorCondition(column, "_between", [10]);
      expect(result).toBeNull();
      const result2 = buildOperatorCondition(column, "_between", [10, 20, 30]);
      expect(result2).toBeNull();
    });
  });
});
