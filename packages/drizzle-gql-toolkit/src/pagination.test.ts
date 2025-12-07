import { describe, it, expect } from "@jest/globals";
import {
  resolvePagination,
  calculatePageInfo,
  encodeCursor,
  decodeCursor,
  resolveCursorPagination,
} from "./pagination.js";

describe("resolvePagination", () => {
  it("should return defaults for null input", () => {
    const result = resolvePagination(null);
    expect(result).toEqual({ limit: 20, offset: 0 });
  });

  it("should return defaults for undefined input", () => {
    const result = resolvePagination(undefined);
    expect(result).toEqual({ limit: 20, offset: 0 });
  });

  it("should use provided limit and offset", () => {
    const result = resolvePagination({ limit: 10, offset: 5 });
    expect(result).toEqual({ limit: 10, offset: 5 });
  });

  it("should cap limit at maxLimit", () => {
    const result = resolvePagination({ limit: 200 }, { maxLimit: 50 });
    expect(result.limit).toBe(50);
  });

  it("should ensure offset is non-negative", () => {
    const result = resolvePagination({ offset: -10 });
    expect(result.offset).toBe(0);
  });

  it("should use custom defaultLimit", () => {
    const result = resolvePagination(null, { defaultLimit: 50 });
    expect(result.limit).toBe(50);
  });

  it("should use defaultLimit when limit not provided", () => {
    const result = resolvePagination({ offset: 10 }, { defaultLimit: 30 });
    expect(result.limit).toBe(30);
    expect(result.offset).toBe(10);
  });
});

describe("calculatePageInfo", () => {
  it("should calculate hasNextPage correctly", () => {
    const result = calculatePageInfo(100, { limit: 10, offset: 0 });
    expect(result.hasNextPage).toBe(true);
    expect(result.hasPreviousPage).toBe(false);
    expect(result.totalCount).toBe(100);
  });

  it("should detect no next page at end", () => {
    const result = calculatePageInfo(100, { limit: 10, offset: 95 });
    expect(result.hasNextPage).toBe(false);
  });

  it("should detect previous page exists", () => {
    const result = calculatePageInfo(100, { limit: 10, offset: 20 });
    expect(result.hasPreviousPage).toBe(true);
  });

  it("should handle exact boundary", () => {
    const result = calculatePageInfo(100, { limit: 10, offset: 90 });
    expect(result.hasNextPage).toBe(false);
  });

  it("should handle null pagination", () => {
    const result = calculatePageInfo(100, null);
    expect(result.totalCount).toBe(100);
    expect(result.hasPreviousPage).toBe(false);
  });
});

describe("encodeCursor / decodeCursor", () => {
  it("should encode and decode cursor correctly", () => {
    const offset = 42;
    const cursor = encodeCursor(offset);
    const decoded = decodeCursor(cursor);
    expect(decoded).toBe(offset);
  });

  it("should handle offset 0", () => {
    const cursor = encodeCursor(0);
    const decoded = decodeCursor(cursor);
    expect(decoded).toBe(0);
  });

  it("should handle large offsets", () => {
    const offset = 999999;
    const cursor = encodeCursor(offset);
    const decoded = decodeCursor(cursor);
    expect(decoded).toBe(offset);
  });

  it("should return 0 for invalid cursor", () => {
    expect(decodeCursor("invalid")).toBe(0);
    expect(decodeCursor("")).toBe(0);
  });

  it("should return 0 for malformed base64", () => {
    const malformed = Buffer.from("wrong:format").toString("base64");
    expect(decodeCursor(malformed)).toBe(0);
  });
});

describe("resolveCursorPagination", () => {
  it("should return defaults for null input", () => {
    const result = resolveCursorPagination(null);
    expect(result).toEqual({ limit: 20, offset: 0 });
  });

  it("should handle first parameter", () => {
    const result = resolveCursorPagination({ first: 10 });
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(0);
  });

  it("should cap first at maxLimit", () => {
    const result = resolveCursorPagination({ first: 200 }, { maxLimit: 50 });
    expect(result.limit).toBe(50);
  });

  it("should handle after cursor", () => {
    const cursor = encodeCursor(10);
    const result = resolveCursorPagination({ first: 10, after: cursor });
    expect(result.offset).toBe(11); // after cursor means start at cursor + 1
  });

  it("should handle last parameter", () => {
    const result = resolveCursorPagination({ last: 10 });
    expect(result.limit).toBe(10);
  });

  it("should handle before cursor", () => {
    const cursor = encodeCursor(50);
    const result = resolveCursorPagination({ last: 10, before: cursor });
    expect(result.offset).toBe(40); // 50 - 10
  });

  it("should not allow negative offset with before", () => {
    const cursor = encodeCursor(5);
    const result = resolveCursorPagination({ last: 10, before: cursor });
    expect(result.offset).toBe(0);
  });
});
