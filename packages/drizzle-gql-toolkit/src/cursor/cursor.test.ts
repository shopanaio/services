import { describe, it, expect } from "vitest";
import {
  encode,
  decode,
  validateCursorParams,
  InvalidCursorError,
  type CursorParams,
} from "./cursor.js";
import {
  hashFilters,
  snakeToCamel,
  cloneSortParams,
  tieBreakerOrder,
  invertOrder,
  buildTieBreakerSeekValue,
  base64UrlEncode,
  base64UrlDecode,
  type SortParam,
} from "./helpers.js";
import { parseSort, validateCursorOrder } from "./sort.js";
import { buildCursorWhereInput } from "./where.js";
import { createCursorQueryBuilder } from "./builder.js";
import { createSchema } from "../schema.js";

// ============ cursor.ts Tests ============

describe("cursor encode/decode", () => {
  it("round-trips cursor params", () => {
    const params: CursorParams = {
      type: "category",
      filtersHash: "abc123",
      seek: [
        { field: "updatedAt", value: "2024-01-01T00:00:00Z", order: "desc" },
        { field: "id", value: "node-1", order: "desc" },
      ],
    };

    const encoded = encode(params);
    expect(encoded).toBeTypeOf("string");
    expect(encoded).not.toContain("+");
    expect(encoded).not.toContain("/");
    expect(encoded).not.toContain("=");

    const decoded = decode(encoded);
    expect(decoded).toEqual(params);
  });

  it("handles empty filtersHash", () => {
    const params: CursorParams = {
      type: "product",
      filtersHash: "",
      seek: [{ field: "id", value: "123", order: "asc" }],
    };

    const encoded = encode(params);
    const decoded = decode(encoded);
    expect(decoded.filtersHash).toBe("");
  });

  it("handles various value types", () => {
    const params: CursorParams = {
      type: "item",
      filtersHash: "hash",
      seek: [
        { field: "count", value: 42, order: "desc" },
        { field: "active", value: true, order: "asc" },
        { field: "nullable", value: null, order: "desc" },
        { field: "id", value: "abc", order: "desc" },
      ],
    };

    const decoded = decode(encode(params));
    expect(decoded.seek[0].value).toBe(42);
    expect(decoded.seek[1].value).toBe(true);
    expect(decoded.seek[2].value).toBeNull();
    expect(decoded.seek[3].value).toBe("abc");
  });

  it("throws on empty cursor string", () => {
    expect(() => decode("")).toThrow(InvalidCursorError);
    expect(() => decode("   ")).toThrow(InvalidCursorError);
  });

  it("throws on invalid base64", () => {
    expect(() => decode("!!!invalid!!!")).toThrow(InvalidCursorError);
  });

  it("throws on invalid JSON", () => {
    const invalidJson = Buffer.from("not json", "utf-8").toString("base64url");
    expect(() => decode(invalidJson)).toThrow(InvalidCursorError);
  });
});

describe("validateCursorParams", () => {
  it("throws on null params", () => {
    expect(() => validateCursorParams(null)).toThrow("cannot be null");
  });

  it("throws on empty type", () => {
    expect(() =>
      validateCursorParams({
        type: "",
        filtersHash: "",
        seek: [{ field: "id", value: "1", order: "asc" }],
      })
    ).toThrow("type cannot be empty");
  });

  it("throws on non-string filtersHash", () => {
    expect(() =>
      validateCursorParams({
        type: "test",
        filtersHash: 123 as unknown as string,
        seek: [{ field: "id", value: "1", order: "asc" }],
      })
    ).toThrow("Filters hash must be a string");
  });

  it("throws on empty seek array", () => {
    expect(() =>
      validateCursorParams({
        type: "test",
        filtersHash: "",
        seek: [],
      })
    ).toThrow("Seek values cannot be empty");
  });

  it("throws on empty field name", () => {
    expect(() =>
      validateCursorParams({
        type: "test",
        filtersHash: "",
        seek: [{ field: "", value: "1", order: "asc" }],
      })
    ).toThrow("Field cannot be empty at index 0");
  });

  it("throws on invalid order direction", () => {
    expect(() =>
      validateCursorParams({
        type: "test",
        filtersHash: "",
        seek: [{ field: "id", value: "1", order: "invalid" as "asc" }],
      })
    ).toThrow("Invalid order 'invalid'");
  });
});

// ============ helpers.ts Tests ============

describe("base64UrlEncode/Decode", () => {
  it("round-trips strings", () => {
    const input = "Hello, World! 你好世界 🚀";
    const encoded = base64UrlEncode(input);
    const decoded = base64UrlDecode(encoded);
    expect(decoded).toBe(input);
  });

  it("produces URL-safe output", () => {
    const input = "binary\x00data\xFFwith\x01special\xFEchars";
    const encoded = base64UrlEncode(input);
    expect(encoded).not.toContain("+");
    expect(encoded).not.toContain("/");
    expect(encoded).not.toContain("=");
  });
});

describe("snakeToCamel", () => {
  it("converts snake_case to camelCase", () => {
    expect(snakeToCamel("updated_at")).toBe("updatedAt");
    expect(snakeToCamel("created_at_date")).toBe("createdAtDate");
  });

  it("handles single words", () => {
    expect(snakeToCamel("id")).toBe("id");
    expect(snakeToCamel("title")).toBe("title");
  });

  it("handles leading underscores", () => {
    expect(snakeToCamel("_private")).toBe("Private");
    expect(snakeToCamel("__dunder")).toBe("Dunder");
  });

  it("handles uppercase input", () => {
    expect(snakeToCamel("UPDATED_AT")).toBe("updatedAt");
  });
});

describe("cloneSortParams", () => {
  it("creates deep copy of params", () => {
    const original: SortParam[] = [
      { field: "a", order: "asc" },
      { field: "b", order: "desc" },
    ];
    const cloned = cloneSortParams(original);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned[0]).not.toBe(original[0]);
  });

  it("handles null/undefined", () => {
    expect(cloneSortParams(null)).toEqual([]);
    expect(cloneSortParams(undefined)).toEqual([]);
  });

  it("handles empty array", () => {
    expect(cloneSortParams([])).toEqual([]);
  });
});

describe("tieBreakerOrder", () => {
  it("returns last sort order", () => {
    expect(tieBreakerOrder([{ field: "a", order: "asc" }])).toBe("asc");
    expect(
      tieBreakerOrder([
        { field: "a", order: "asc" },
        { field: "b", order: "desc" },
      ])
    ).toBe("desc");
  });

  it("defaults to desc for empty array", () => {
    expect(tieBreakerOrder([])).toBe("desc");
  });
});

describe("invertOrder", () => {
  it("inverts asc to desc", () => {
    expect(invertOrder("asc")).toBe("desc");
  });

  it("inverts desc to asc", () => {
    expect(invertOrder("desc")).toBe("asc");
  });
});

describe("buildTieBreakerSeekValue", () => {
  it("builds seek value with inferred order", () => {
    const result = buildTieBreakerSeekValue({
      value: "123",
      tieBreaker: "id",
      sortParams: [{ field: "name", order: "asc" }],
    });

    expect(result).toEqual({
      field: "id",
      value: "123",
      order: "asc",
    });
  });

  it("uses explicit order when provided", () => {
    const result = buildTieBreakerSeekValue({
      value: "456",
      tieBreaker: "id",
      sortParams: [{ field: "name", order: "asc" }],
      order: "desc",
    });

    expect(result.order).toBe("desc");
  });
});

describe("hashFilters", () => {
  it("produces deterministic hashes regardless of key order", () => {
    const left = hashFilters({
      status: "ACTIVE",
      nested: { value: 10, extra: true },
    });
    const right = hashFilters({
      nested: { extra: true, value: 10 },
      status: "ACTIVE",
    });

    expect(left).toBe(right);
    expect(left.length).toBeGreaterThan(0);
  });

  it("returns empty string for empty/null filters", () => {
    expect(hashFilters(undefined)).toBe("");
    expect(hashFilters({})).toBe("");
  });

  it("normalizes Date objects", () => {
    const date = new Date("2024-01-01T00:00:00Z");
    const hash1 = hashFilters({ date });
    const hash2 = hashFilters({ date: date.toISOString() });
    expect(hash1).toBe(hash2);
  });

  it("normalizes BigInt values", () => {
    const hash = hashFilters({ big: BigInt(123) });
    expect(hash.length).toBeGreaterThan(0);
  });

  it("ignores undefined values", () => {
    const hash1 = hashFilters({ a: 1 });
    const hash2 = hashFilters({ a: 1, b: undefined });
    expect(hash1).toBe(hash2);
  });

  it("produces hash of max 16 chars", () => {
    const hash = hashFilters({
      veryLongKey: "veryLongValue".repeat(100),
    });
    expect(hash.length).toBeLessThanOrEqual(16);
  });
});

// ============ sort.ts Tests ============

describe("parseSort", () => {
  it("parses GraphQL enum format", () => {
    const params = parseSort("UPDATED_AT_DESC", "createdAt");
    expect(params).toEqual([{ field: "updatedAt", order: "desc" }]);
  });

  it("parses colon format", () => {
    const params = parseSort("title:asc", "createdAt");
    expect(params).toEqual([{ field: "title", order: "asc" }]);
  });

  it("parses mixed formats", () => {
    const params = parseSort("UPDATED_AT_DESC,title:asc", "createdAt");
    expect(params).toEqual([
      { field: "updatedAt", order: "desc" },
      { field: "title", order: "asc" },
    ]);
  });

  it("uses default field when sort is empty", () => {
    const params = parseSort("", "createdAt");
    expect(params).toEqual([{ field: "createdAt", order: "desc" }]);
  });

  it("uses default field when sort is undefined", () => {
    const params = parseSort(undefined, "updatedAt");
    expect(params).toEqual([{ field: "updatedAt", order: "desc" }]);
  });

  it("applies custom mapper", () => {
    const mapper = (field: string) =>
      field === "price" ? "priceAmount" : field;
    const params = parseSort("price:asc", "id", mapper);
    expect(params).toEqual([{ field: "priceAmount", order: "asc" }]);
  });

  it("handles nested paths", () => {
    const params = parseSort("author.name:asc", "id");
    expect(params).toEqual([{ field: "author.name", order: "asc" }]);
  });

  it("throws on empty field", () => {
    expect(() => parseSort(":asc", "id")).toThrow("empty field");
  });

  it("throws on invalid order", () => {
    expect(() => parseSort("name:invalid", "id")).toThrow("Invalid sort order");
  });
});

describe("validateCursorOrder", () => {
  it("validates matching cursor and sort", () => {
    const params = parseSort("UPDATED_AT_DESC", "updatedAt");
    const cursor: CursorParams = {
      type: "category",
      filtersHash: "",
      seek: [
        { field: "updated_at", value: 1, order: "desc" },
        { field: "id", value: "1", order: "desc" },
      ],
    };
    expect(() => validateCursorOrder(cursor, params, "id")).not.toThrow();
  });

  it("throws on length mismatch", () => {
    const params = parseSort("UPDATED_AT_DESC", "updatedAt");
    const cursor: CursorParams = {
      type: "category",
      filtersHash: "",
      seek: [{ field: "updatedAt", value: 1, order: "desc" }],
    };
    expect(() => validateCursorOrder(cursor, params, "id")).toThrow(
      "length mismatch"
    );
  });

  it("throws on field mismatch", () => {
    const params = parseSort("UPDATED_AT_DESC", "updatedAt");
    const cursor: CursorParams = {
      type: "category",
      filtersHash: "",
      seek: [
        { field: "createdAt", value: 1, order: "desc" },
        { field: "id", value: "1", order: "desc" },
      ],
    };
    expect(() => validateCursorOrder(cursor, params, "id")).toThrow(
      "field mismatch"
    );
  });

  it("throws on order mismatch", () => {
    const params = parseSort("UPDATED_AT_DESC", "updatedAt");
    const cursor: CursorParams = {
      type: "category",
      filtersHash: "",
      seek: [
        { field: "updatedAt", value: 1, order: "asc" },
        { field: "id", value: "1", order: "desc" },
      ],
    };
    expect(() => validateCursorOrder(cursor, params, "id")).toThrow(
      "order mismatch"
    );
  });

  it("throws on wrong tieBreaker", () => {
    const params = parseSort("UPDATED_AT_DESC", "updatedAt");
    const cursor: CursorParams = {
      type: "category",
      filtersHash: "",
      seek: [
        { field: "updatedAt", value: 1, order: "desc" },
        { field: "uuid", value: "1", order: "desc" },
      ],
    };
    expect(() => validateCursorOrder(cursor, params, "id")).toThrow(
      "must be id"
    );
  });
});

// ============ where.ts Tests ============

describe("buildCursorWhereInput", () => {
  it("builds lexicographic ladder for forward pagination", () => {
    const params: CursorParams = {
      type: "category",
      filtersHash: "",
      seek: [
        { field: "updatedAt", value: "2024-01-01", order: "desc" },
        { field: "id", value: "node-1", order: "desc" },
      ],
    };

    const where = buildCursorWhereInput(params, true);
    expect(where).toEqual({
      $or: [
        { updatedAt: { $lt: "2024-01-01" } },
        { updatedAt: { $eq: "2024-01-01" }, id: { $lt: "node-1" } },
      ],
    });
  });

  it("builds backward pagination conditions", () => {
    const params: CursorParams = {
      type: "category",
      filtersHash: "",
      seek: [
        { field: "updatedAt", value: "2024-01-01", order: "desc" },
        { field: "id", value: "node-1", order: "desc" },
      ],
    };

    const where = buildCursorWhereInput(params, false);
    expect(where).toEqual({
      $or: [
        { updatedAt: { $gt: "2024-01-01" } },
        { updatedAt: { $eq: "2024-01-01" }, id: { $gt: "node-1" } },
      ],
    });
  });

  it("handles asc order correctly", () => {
    const params: CursorParams = {
      type: "item",
      filtersHash: "",
      seek: [
        { field: "title", value: "A", order: "asc" },
        { field: "id", value: "1", order: "asc" },
      ],
    };

    // forward + asc = $gt (next items are greater)
    const where = buildCursorWhereInput(params, true);
    expect(where).toEqual({
      $or: [
        { title: { $gt: "A" } },
        { title: { $eq: "A" }, id: { $gt: "1" } },
      ],
    });
  });

  it("handles single seek value", () => {
    const params: CursorParams = {
      type: "item",
      filtersHash: "",
      seek: [{ field: "id", value: "123", order: "desc" }],
    };

    const where = buildCursorWhereInput(params, true);
    expect(where).toEqual({
      $or: [{ id: { $lt: "123" } }],
    });
  });

  it("handles nested paths", () => {
    const params: CursorParams = {
      type: "item",
      filtersHash: "",
      seek: [
        { field: "author.name", value: "John", order: "asc" },
        { field: "id", value: "1", order: "asc" },
      ],
    };

    const where = buildCursorWhereInput(params, true);
    expect(where).toEqual({
      $or: [
        { author: { name: { $gt: "John" } } },
        { author: { name: { $eq: "John" } }, id: { $gt: "1" } },
      ],
    });
  });

  it("returns empty object for empty seek", () => {
    const params: CursorParams = {
      type: "item",
      filtersHash: "",
      seek: [],
    };

    const where = buildCursorWhereInput(params, true);
    expect(where).toEqual({});
  });

  it("handles three-level ladder", () => {
    const params: CursorParams = {
      type: "item",
      filtersHash: "",
      seek: [
        { field: "status", value: "ACTIVE", order: "desc" },
        { field: "updatedAt", value: "2024-01-01", order: "desc" },
        { field: "id", value: "abc", order: "desc" },
      ],
    };

    const where = buildCursorWhereInput(params, true);
    expect(where).toEqual({
      $or: [
        { status: { $lt: "ACTIVE" } },
        { status: { $eq: "ACTIVE" }, updatedAt: { $lt: "2024-01-01" } },
        {
          status: { $eq: "ACTIVE" },
          updatedAt: { $eq: "2024-01-01" },
          id: { $lt: "abc" },
        },
      ],
    });
  });
});

// ============ createCursorQueryBuilder Tests ============

describe("createCursorQueryBuilder", () => {
  // Mock table for testing
  const mockTable = {
    id: { name: "id" },
    title: { name: "title" },
    price: { name: "price" },
    status: { name: "status" },
    created_at: { name: "created_at" },
  } as any;

  const productSchema = createSchema({
    table: mockTable,
    tableName: "products",
    fields: {
      id: { column: "id" },
      title: { column: "title" },
      price: { column: "price" },
      status: { column: "status" },
      createdAt: { column: "created_at" },
    },
  });

  const createTestQb = () =>
    createCursorQueryBuilder(productSchema, {
      cursorType: "product",
      tieBreaker: "id",
      defaultSortField: "createdAt",
      getId: (row: any) => row.id,
      getValue: (row: any, field: string) => row[field],
    });

  it("creates a query builder with correct interface", () => {
    const qb = createTestQb();

    expect(qb).toHaveProperty("query");
    expect(qb).toHaveProperty("getQueryBuilder");
    expect(typeof qb.query).toBe("function");
    expect(typeof qb.getQueryBuilder).toBe("function");
  });

  it("getQueryBuilder returns underlying query builder", () => {
    const qb = createTestQb();

    const underlyingQb = qb.getQueryBuilder();
    expect(underlyingQb).toHaveProperty("query");
    expect(underlyingQb).toHaveProperty("buildSelectSql");
  });

  it("throws when both first and last are provided", async () => {
    const qb = createTestQb();
    const mockDb = {} as any;

    await expect(
      qb.query(mockDb, { first: 10, last: 5 })
    ).rejects.toThrow("Cannot specify both 'first' and 'last'");
  });

  it("throws when neither first nor last is provided", async () => {
    const qb = createTestQb();
    const mockDb = {} as any;

    await expect(
      qb.query(mockDb, {})
    ).rejects.toThrow("Either 'first' or 'last' must be provided");
  });

  it("throws when first is not positive", async () => {
    const qb = createTestQb();
    const mockDb = {} as any;

    await expect(
      qb.query(mockDb, { first: 0 })
    ).rejects.toThrow("first must be greater than 0");

    await expect(
      qb.query(mockDb, { first: -1 })
    ).rejects.toThrow("first must be greater than 0");
  });

  it("throws when last is not positive", async () => {
    const qb = createTestQb();
    const mockDb = {} as any;

    await expect(
      qb.query(mockDb, { last: 0 })
    ).rejects.toThrow("last must be greater than 0");
  });

  it("throws on invalid cursor type", async () => {
    const qb = createTestQb();

    // Create cursor with wrong type
    const wrongTypeCursor = encode({
      type: "category",
      filtersHash: "",
      seek: [
        { field: "createdAt", value: "2024-01-01", order: "desc" },
        { field: "id", value: "1", order: "desc" },
      ],
    });

    const mockDb = {} as any;

    await expect(
      qb.query(mockDb, { first: 10, after: wrongTypeCursor })
    ).rejects.toThrow("Expected cursor type 'product', got 'category'");
  });
});
