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
    expect(OPERATORS.$eq).toBe("eq");
    expect(OPERATORS.$neq).toBe("neq");
    expect(OPERATORS.$gt).toBe("gt");
    expect(OPERATORS.$gte).toBe("gte");
    expect(OPERATORS.$lt).toBe("lt");
    expect(OPERATORS.$lte).toBe("lte");
    expect(OPERATORS.$in).toBe("in");
    expect(OPERATORS.$notIn).toBe("notIn");
    expect(OPERATORS.$is).toBe("is");
    expect(OPERATORS.$isNot).toBe("isNot");
    // String operators
    expect(OPERATORS.$contains).toBe("contains");
    expect(OPERATORS.$notContains).toBe("notContains");
    expect(OPERATORS.$containsi).toBe("containsi");
    expect(OPERATORS.$notContainsi).toBe("notContainsi");
    expect(OPERATORS.$startsWith).toBe("startsWith");
    expect(OPERATORS.$startsWithi).toBe("startsWithi");
    expect(OPERATORS.$endsWith).toBe("endsWith");
    expect(OPERATORS.$endsWithi).toBe("endsWithi");
    // Range operator
    expect(OPERATORS.$between).toBe("between");
  });
});

describe("isOperator", () => {
  it("should return true for valid operators", () => {
    expect(isOperator("$eq")).toBe(true);
    expect(isOperator("$neq")).toBe(true);
    expect(isOperator("$gt")).toBe(true);
    expect(isOperator("$in")).toBe(true);
    expect(isOperator("$contains")).toBe(true);
  });

  it("should return false for invalid operators", () => {
    expect(isOperator("eq")).toBe(false);
    expect(isOperator("$unknown")).toBe(false);
    expect(isOperator("name")).toBe(false);
    expect(isOperator("")).toBe(false);
  });
});

describe("isLogicalOperator", () => {
  it("should return true for $and, $or and $not", () => {
    expect(isLogicalOperator("$and")).toBe(true);
    expect(isLogicalOperator("$or")).toBe(true);
    expect(isLogicalOperator("$not")).toBe(true);
  });

  it("should return false for other operators", () => {
    expect(isLogicalOperator("$eq")).toBe(false);
    expect(isLogicalOperator("and")).toBe(false);
    expect(isLogicalOperator("$AND")).toBe(false);
  });
});

describe("isFilterObject", () => {
  it("should return true for objects with only $ keys", () => {
    expect(isFilterObject({ $eq: 1 })).toBe(true);
    expect(isFilterObject({ $gt: 1, $lt: 10 })).toBe(true);
    expect(isFilterObject({ $in: [1, 2, 3] })).toBe(true);
  });

  it("should return false for objects with non-$ keys", () => {
    expect(isFilterObject({ name: "test" })).toBe(false);
    expect(isFilterObject({ $eq: 1, name: "test" })).toBe(false);
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
    it("should build $eq condition", () => {
      const result = buildOperatorCondition(column, "$eq", 25);
      expect(result).not.toBeNull();
    });

    it("should build $neq condition", () => {
      const result = buildOperatorCondition(column, "$neq", 25);
      expect(result).not.toBeNull();
    });
  });

  describe("comparison operators", () => {
    it("should build $gt condition", () => {
      const result = buildOperatorCondition(column, "$gt", 18);
      expect(result).not.toBeNull();
    });

    it("should build $gte condition", () => {
      const result = buildOperatorCondition(column, "$gte", 18);
      expect(result).not.toBeNull();
    });

    it("should build $lt condition", () => {
      const result = buildOperatorCondition(column, "$lt", 30);
      expect(result).not.toBeNull();
    });

    it("should build $lte condition", () => {
      const result = buildOperatorCondition(column, "$lte", 30);
      expect(result).not.toBeNull();
    });
  });

  describe("array operators", () => {
    it("should build $in condition", () => {
      const result = buildOperatorCondition(column, "$in", [1, 2, 3]);
      expect(result).not.toBeNull();
    });

    it("should return FALSE for empty $in array", () => {
      const result = buildOperatorCondition(column, "$in", []);
      expect(result).not.toBeNull();
      const query = dialect.sqlToQuery(result!);
      expect(query.sql.trim()).toBe("FALSE");
    });

    it("should build $notIn condition", () => {
      const result = buildOperatorCondition(column, "$notIn", [1, 2, 3]);
      expect(result).not.toBeNull();
    });

    it("should return TRUE for empty $notIn array", () => {
      const result = buildOperatorCondition(column, "$notIn", []);
      expect(result).not.toBeNull();
      const query = dialect.sqlToQuery(result!);
      expect(query.sql.trim()).toBe("TRUE");
    });
  });

  describe("null operators", () => {
    it("should build $is null condition", () => {
      const result = buildOperatorCondition(column, "$is", null);
      expect(result).not.toBeNull();
    });

    it("should build $isNot null condition", () => {
      const result = buildOperatorCondition(column, "$isNot", null);
      expect(result).not.toBeNull();
    });

    it("should return null for non-null $is value", () => {
      const result = buildOperatorCondition(column, "$is", "something");
      expect(result).toBeNull();
    });
  });

  describe("unknown operators", () => {
    it("should return null for unknown operators", () => {
      const result = buildOperatorCondition(column, "$unknown", 1);
      expect(result).toBeNull();
    });
  });

  describe("operator normalization", () => {
    it("should handle operators without $ prefix", () => {
      const result = buildOperatorCondition(column, "eq", 25);
      expect(result).not.toBeNull();
    });

    it("should handle uppercase operators", () => {
      const result = buildOperatorCondition(column, "$EQ", 25);
      expect(result).not.toBeNull();
    });
  });

  describe("string convenience operators", () => {
    const nameColumn = testTable.name;

    it("should build $contains condition with wildcards", () => {
      const result = buildOperatorCondition(nameColumn, "$contains", "test");
      expect(result).not.toBeNull();
      const query = dialect.sqlToQuery(result!);
      expect(query.sql).toContain("like");
      expect(query.params).toContain("%test%");
    });

    it("should build $notContains condition with wildcards", () => {
      const result = buildOperatorCondition(nameColumn, "$notContains", "test");
      expect(result).not.toBeNull();
      const query = dialect.sqlToQuery(result!);
      expect(query.sql).toContain("not like");
      expect(query.params).toContain("%test%");
    });

    it("should build $containsi condition (case-insensitive)", () => {
      const result = buildOperatorCondition(nameColumn, "$containsi", "test");
      expect(result).not.toBeNull();
      const query = dialect.sqlToQuery(result!);
      expect(query.sql).toContain("ilike");
      expect(query.params).toContain("%test%");
    });

    it("should build $notContainsi condition (case-insensitive)", () => {
      const result = buildOperatorCondition(nameColumn, "$notContainsi", "test");
      expect(result).not.toBeNull();
      const query = dialect.sqlToQuery(result!);
      expect(query.sql).toContain("not ilike");
      expect(query.params).toContain("%test%");
    });

    it("should build $startsWith condition with trailing wildcard", () => {
      const result = buildOperatorCondition(nameColumn, "$startsWith", "test");
      expect(result).not.toBeNull();
      const query = dialect.sqlToQuery(result!);
      expect(query.sql).toContain("like");
      expect(query.params).toContain("test%");
    });

    it("should build $startsWithi condition (case-insensitive)", () => {
      const result = buildOperatorCondition(nameColumn, "$startsWithi", "test");
      expect(result).not.toBeNull();
      const query = dialect.sqlToQuery(result!);
      expect(query.sql).toContain("ilike");
      expect(query.params).toContain("test%");
    });

    it("should build $endsWith condition with leading wildcard", () => {
      const result = buildOperatorCondition(nameColumn, "$endsWith", "test");
      expect(result).not.toBeNull();
      const query = dialect.sqlToQuery(result!);
      expect(query.sql).toContain("like");
      expect(query.params).toContain("%test");
    });

    it("should build $endsWithi condition (case-insensitive)", () => {
      const result = buildOperatorCondition(nameColumn, "$endsWithi", "test");
      expect(result).not.toBeNull();
      const query = dialect.sqlToQuery(result!);
      expect(query.sql).toContain("ilike");
      expect(query.params).toContain("%test");
    });

    it("should escape wildcards in user input", () => {
      const result = buildOperatorCondition(nameColumn, "$contains", "test%value_here");
      expect(result).not.toBeNull();
      const query = dialect.sqlToQuery(result!);
      // The wildcards in user input should be escaped
      expect(query.params).toContain("%test\\%value\\_here%");
    });

    it("should return null for non-string values", () => {
      const result = buildOperatorCondition(nameColumn, "$contains", 123);
      expect(result).toBeNull();
    });
  });

  describe("$between operator", () => {
    it("should build $between condition", () => {
      const result = buildOperatorCondition(column, "$between", [10, 100]);
      expect(result).not.toBeNull();
      const query = dialect.sqlToQuery(result!);
      // Should generate >= and <= conditions
      expect(query.sql).toContain(">=");
      expect(query.sql).toContain("<=");
    });

    it("should return null for non-array values", () => {
      const result = buildOperatorCondition(column, "$between", "not-array");
      expect(result).toBeNull();
    });

    it("should return null for arrays with wrong length", () => {
      const result = buildOperatorCondition(column, "$between", [10]);
      expect(result).toBeNull();
      const result2 = buildOperatorCondition(column, "$between", [10, 20, 30]);
      expect(result2).toBeNull();
    });
  });
});
