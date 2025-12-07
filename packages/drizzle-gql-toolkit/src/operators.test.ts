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
} from "./operators.js";

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
    expect(OPERATORS.$like).toBe("like");
    expect(OPERATORS.$iLike).toBe("iLike");
    expect(OPERATORS.$notLike).toBe("notLike");
    expect(OPERATORS.$notILike).toBe("notILike");
    expect(OPERATORS.$is).toBe("is");
    expect(OPERATORS.$isNot).toBe("isNot");
  });
});

describe("isOperator", () => {
  it("should return true for valid operators", () => {
    expect(isOperator("$eq")).toBe(true);
    expect(isOperator("$neq")).toBe(true);
    expect(isOperator("$gt")).toBe(true);
    expect(isOperator("$in")).toBe(true);
    expect(isOperator("$like")).toBe(true);
  });

  it("should return false for invalid operators", () => {
    expect(isOperator("eq")).toBe(false);
    expect(isOperator("$unknown")).toBe(false);
    expect(isOperator("name")).toBe(false);
    expect(isOperator("")).toBe(false);
  });
});

describe("isLogicalOperator", () => {
  it("should return true for $and and $or", () => {
    expect(isLogicalOperator("$and")).toBe(true);
    expect(isLogicalOperator("$or")).toBe(true);
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

    it("should handle noteq alias", () => {
      const result = buildOperatorCondition(column, "noteq", 25);
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

    it("should handle nin alias", () => {
      const result = buildOperatorCondition(column, "nin", [1, 2, 3]);
      expect(result).not.toBeNull();
    });
  });

  describe("string operators", () => {
    const nameColumn = testTable.name;

    it("should build $like condition", () => {
      const result = buildOperatorCondition(nameColumn, "$like", "%test%");
      expect(result).not.toBeNull();
    });

    it("should build $iLike condition", () => {
      const result = buildOperatorCondition(nameColumn, "$iLike", "%test%");
      expect(result).not.toBeNull();
    });

    it("should build $notLike condition", () => {
      const result = buildOperatorCondition(nameColumn, "$notLike", "%test%");
      expect(result).not.toBeNull();
    });

    it("should build $notILike condition", () => {
      const result = buildOperatorCondition(nameColumn, "$notILike", "%test%");
      expect(result).not.toBeNull();
    });

    it("should handle nlike alias", () => {
      const result = buildOperatorCondition(nameColumn, "nlike", "%test%");
      expect(result).not.toBeNull();
    });

    it("should handle nilike alias", () => {
      const result = buildOperatorCondition(nameColumn, "nilike", "%test%");
      expect(result).not.toBeNull();
    });

    it("should return null for non-string like values", () => {
      const result = buildOperatorCondition(nameColumn, "$like", 123);
      expect(result).toBeNull();
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
});
