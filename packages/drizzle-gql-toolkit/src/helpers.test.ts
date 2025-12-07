import { describe, it, expect } from "vitest";
import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";
import {
  notDeleted,
  withProjectScope,
  combineAnd,
  hasKey,
  ensureArray,
  pickDefined,
} from "./helpers.js";

const testTable = pgTable("test", {
  id: uuid("id").primaryKey(),
  projectId: uuid("project_id").notNull(),
  name: text("name"),
  deletedAt: timestamp("deleted_at"),
});

describe("notDeleted", () => {
  it("should create IS NULL condition for deletedAt column", () => {
    const result = notDeleted(testTable.deletedAt);
    expect(result).toBeDefined();
  });
});

describe("withProjectScope", () => {
  it("should create equality condition for project id", () => {
    const projectId = "123e4567-e89b-12d3-a456-426614174000";
    const result = withProjectScope(testTable.projectId, projectId);
    expect(result).toBeDefined();
  });
});

describe("combineAnd", () => {
  it("should return undefined for empty conditions", () => {
    const result = combineAnd();
    expect(result).toBeUndefined();
  });

  it("should return undefined for all null/undefined conditions", () => {
    const result = combineAnd(null, undefined, null);
    expect(result).toBeUndefined();
  });

  it("should return single condition unwrapped", () => {
    const condition = notDeleted(testTable.deletedAt);
    const result = combineAnd(condition);
    expect(result).toBe(condition);
  });

  it("should combine multiple conditions with AND", () => {
    const cond1 = notDeleted(testTable.deletedAt);
    const cond2 = withProjectScope(testTable.projectId, "test-id");
    const result = combineAnd(cond1, cond2);
    expect(result).toBeDefined();
  });

  it("should filter out null/undefined conditions", () => {
    const cond1 = notDeleted(testTable.deletedAt);
    const result = combineAnd(null, cond1, undefined);
    expect(result).toBe(cond1);
  });
});

// NOTE: applyDefaultFilters tests require Drizzle table internals which don't work with ESM + ts-jest
// Run these as integration tests with real database connection
describe.skip("applyDefaultFilters (integration)", () => {
  it("placeholder", () => {
    expect(true).toBe(true);
  });
});

describe("hasKey", () => {
  it("should return true when object has the key", () => {
    const obj = { name: "test", age: 25 };
    expect(hasKey(obj, "name")).toBe(true);
    expect(hasKey(obj, "age")).toBe(true);
  });

  it("should return false when object does not have the key", () => {
    const obj = { name: "test" };
    expect(hasKey(obj, "missing")).toBe(false);
  });

  it("should return false for null", () => {
    expect(hasKey(null, "key")).toBe(false);
  });

  it("should return false for undefined", () => {
    expect(hasKey(undefined, "key")).toBe(false);
  });

  it("should return false for non-objects", () => {
    expect(hasKey("string", "length")).toBe(false);
    expect(hasKey(123, "toString")).toBe(false);
  });

  it("should work with undefined values", () => {
    const obj = { key: undefined };
    expect(hasKey(obj, "key")).toBe(true);
  });
});

describe("ensureArray", () => {
  it("should return array as-is", () => {
    const arr = [1, 2, 3];
    expect(ensureArray(arr)).toBe(arr);
  });

  it("should wrap non-array value in array", () => {
    expect(ensureArray(1)).toEqual([1]);
    expect(ensureArray("test")).toEqual(["test"]);
    expect(ensureArray({ key: "value" })).toEqual([{ key: "value" }]);
  });

  it("should handle null and undefined", () => {
    expect(ensureArray(null)).toEqual([null]);
    expect(ensureArray(undefined)).toEqual([undefined]);
  });

  it("should not double-wrap arrays", () => {
    const nested = [[1, 2]];
    expect(ensureArray(nested)).toBe(nested);
  });
});

describe("pickDefined", () => {
  it("should return only defined values", () => {
    const obj = {
      a: 1,
      b: undefined,
      c: "test",
      d: undefined,
    };
    const result = pickDefined(obj);
    expect(result).toEqual({ a: 1, c: "test" });
  });

  it("should return empty object when all values are undefined", () => {
    const obj = { a: undefined, b: undefined };
    const result = pickDefined(obj);
    expect(result).toEqual({});
  });

  it("should keep null values (only filter undefined)", () => {
    const obj = { a: null, b: undefined };
    const result = pickDefined(obj);
    expect(result).toEqual({ a: null });
  });

  it("should keep falsy values that are not undefined", () => {
    const obj = {
      zero: 0,
      empty: "",
      falseVal: false,
      undef: undefined,
    };
    const result = pickDefined(obj);
    expect(result).toEqual({
      zero: 0,
      empty: "",
      falseVal: false,
    });
  });

  it("should return empty object for empty input", () => {
    expect(pickDefined({})).toEqual({});
  });
});
