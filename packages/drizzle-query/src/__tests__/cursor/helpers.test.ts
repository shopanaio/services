import { describe, it, expect } from "vitest";
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
} from "../../cursor/helpers.js";

// ============ Base64URL Encoding/Decoding ============

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

  it("handles empty string", () => {
    const encoded = base64UrlEncode("");
    const decoded = base64UrlDecode(encoded);
    expect(decoded).toBe("");
  });

  it("handles long strings", () => {
    const input = "a".repeat(10000);
    const encoded = base64UrlEncode(input);
    const decoded = base64UrlDecode(encoded);
    expect(decoded).toBe(input);
  });
});

// ============ String Utilities ============

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

  it("handles multiple consecutive underscores", () => {
    expect(snakeToCamel("foo__bar")).toBe("fooBar");
  });
});

// ============ Sort Parameter Helpers ============

describe("cloneSortParams", () => {
  it("creates deep copy of params", () => {
    const original: SortParam[] = [
      { field: "a", direction: "asc" },
      { field: "b", direction: "desc" },
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

  it("modifications to clone don't affect original", () => {
    const original: SortParam[] = [{ field: "a", direction: "asc" }];
    const cloned = cloneSortParams(original);
    cloned[0].field = "b";
    expect(original[0].field).toBe("a");
  });
});

describe("tieBreakerOrder", () => {
  it("returns last sort order", () => {
    expect(tieBreakerOrder([{ field: "a", direction: "asc" }])).toBe("asc");
    expect(
      tieBreakerOrder([
        { field: "a", direction: "asc" },
        { field: "b", direction: "desc" },
      ])
    ).toBe("desc");
  });

  it("defaults to desc for empty array", () => {
    expect(tieBreakerOrder([])).toBe("desc");
  });

  it("handles single element", () => {
    expect(tieBreakerOrder([{ field: "id", direction: "asc" }])).toBe("asc");
    expect(tieBreakerOrder([{ field: "id", direction: "desc" }])).toBe("desc");
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
      sortParams: [{ field: "name", direction: "asc" }],
    });

    expect(result).toEqual({
      field: "id",
      value: "123",
      direction: "asc",
    });
  });

  it("uses explicit direction when provided", () => {
    const result = buildTieBreakerSeekValue({
      value: "456",
      tieBreaker: "id",
      sortParams: [{ field: "name", direction: "asc" }],
      direction: "desc",
    });

    expect(result.direction).toBe("desc");
  });

  it("uses desc as default when sortParams is empty", () => {
    const result = buildTieBreakerSeekValue({
      value: "789",
      tieBreaker: "id",
      sortParams: [],
    });

    expect(result.direction).toBe("desc");
  });

  it("handles various value types", () => {
    expect(
      buildTieBreakerSeekValue({
        value: 42,
        tieBreaker: "id",
        sortParams: [],
      }).value
    ).toBe(42);

    expect(
      buildTieBreakerSeekValue({
        value: null,
        tieBreaker: "id",
        sortParams: [],
      }).value
    ).toBeNull();
  });
});

// ============ Hash Filters ============

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

  it("produces different hashes for different inputs", () => {
    const hash1 = hashFilters({ status: "ACTIVE" });
    const hash2 = hashFilters({ status: "INACTIVE" });
    expect(hash1).not.toBe(hash2);
  });

  it("handles nested arrays", () => {
    const hash = hashFilters({ ids: ["a", "b", "c"] });
    expect(hash.length).toBeGreaterThan(0);
  });
});
