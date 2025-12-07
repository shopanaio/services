import { describe, it, expect } from "vitest";
import {
  encode,
  decode,
  validateCursorParams,
  InvalidCursorError,
  type CursorParams,
} from "./cursor.js";

// ============ Cursor Encode/Decode ============

describe("cursor encode/decode", () => {
  describe("basic round-trip", () => {
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
  });

  describe("value types", () => {
    it("handles string values", () => {
      const params: CursorParams = {
        type: "item",
        filtersHash: "",
        seek: [{ field: "title", value: "Hello World", order: "asc" }],
      };

      const decoded = decode(encode(params));
      expect(decoded.seek[0].value).toBe("Hello World");
    });

    it("handles numeric values", () => {
      const params: CursorParams = {
        type: "item",
        filtersHash: "",
        seek: [{ field: "count", value: 42, order: "desc" }],
      };

      const decoded = decode(encode(params));
      expect(decoded.seek[0].value).toBe(42);
    });

    it("handles boolean values", () => {
      const params: CursorParams = {
        type: "item",
        filtersHash: "",
        seek: [{ field: "active", value: true, order: "asc" }],
      };

      const decoded = decode(encode(params));
      expect(decoded.seek[0].value).toBe(true);
    });

    it("handles null values", () => {
      const params: CursorParams = {
        type: "item",
        filtersHash: "",
        seek: [{ field: "nullable", value: null, order: "desc" }],
      };

      const decoded = decode(encode(params));
      expect(decoded.seek[0].value).toBeNull();
    });

    it("handles various value types in same cursor", () => {
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

    it("handles decimal numbers", () => {
      const params: CursorParams = {
        type: "item",
        filtersHash: "",
        seek: [{ field: "price", value: 99.99, order: "desc" }],
      };

      const decoded = decode(encode(params));
      expect(decoded.seek[0].value).toBe(99.99);
    });

    it("handles negative numbers", () => {
      const params: CursorParams = {
        type: "item",
        filtersHash: "",
        seek: [{ field: "offset", value: -100, order: "asc" }],
      };

      const decoded = decode(encode(params));
      expect(decoded.seek[0].value).toBe(-100);
    });
  });

  describe("error handling", () => {
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

    it("throws on malformed cursor params", () => {
      const malformed = Buffer.from(
        JSON.stringify({ type: "", filtersHash: "", seek: [] }),
        "utf-8"
      ).toString("base64url");
      expect(() => decode(malformed)).toThrow(InvalidCursorError);
    });
  });

  describe("URL safety", () => {
    it("produces URL-safe strings", () => {
      const params: CursorParams = {
        type: "category",
        filtersHash: "test-hash",
        seek: [
          { field: "id", value: "abc+def/ghi=jkl", order: "desc" },
        ],
      };

      const encoded = encode(params);
      expect(encoded).not.toMatch(/[+/=]/);
    });
  });
});

// ============ validateCursorParams ============

describe("validateCursorParams", () => {
  describe("null/undefined handling", () => {
    it("throws on null params", () => {
      expect(() => validateCursorParams(null)).toThrow("cannot be null");
    });

    it("throws on undefined params", () => {
      expect(() => validateCursorParams(undefined)).toThrow("cannot be null");
    });
  });

  describe("type validation", () => {
    it("throws on empty type", () => {
      expect(() =>
        validateCursorParams({
          type: "",
          filtersHash: "",
          seek: [{ field: "id", value: "1", order: "asc" }],
        })
      ).toThrow("type cannot be empty");
    });

    it("throws on whitespace-only type", () => {
      expect(() =>
        validateCursorParams({
          type: "   ",
          filtersHash: "",
          seek: [{ field: "id", value: "1", order: "asc" }],
        })
      ).toThrow("type cannot be empty");
    });
  });

  describe("filtersHash validation", () => {
    it("throws on non-string filtersHash", () => {
      expect(() =>
        validateCursorParams({
          type: "test",
          filtersHash: 123 as unknown as string,
          seek: [{ field: "id", value: "1", order: "asc" }],
        })
      ).toThrow("Filters hash must be a string");
    });

    it("accepts empty string filtersHash", () => {
      expect(() =>
        validateCursorParams({
          type: "test",
          filtersHash: "",
          seek: [{ field: "id", value: "1", order: "asc" }],
        })
      ).not.toThrow();
    });
  });

  describe("seek validation", () => {
    it("throws on empty seek array", () => {
      expect(() =>
        validateCursorParams({
          type: "test",
          filtersHash: "",
          seek: [],
        })
      ).toThrow("Seek values cannot be empty");
    });

    it("throws on non-array seek", () => {
      expect(() =>
        validateCursorParams({
          type: "test",
          filtersHash: "",
          seek: "not an array" as unknown as [],
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

    it("throws on whitespace-only field name", () => {
      expect(() =>
        validateCursorParams({
          type: "test",
          filtersHash: "",
          seek: [{ field: "   ", value: "1", order: "asc" }],
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

    it("reports correct index for invalid field", () => {
      expect(() =>
        validateCursorParams({
          type: "test",
          filtersHash: "",
          seek: [
            { field: "valid", value: "1", order: "asc" },
            { field: "", value: "2", order: "desc" },
          ],
        })
      ).toThrow("Field cannot be empty at index 1");
    });
  });

  describe("valid params", () => {
    it("accepts valid params", () => {
      expect(() =>
        validateCursorParams({
          type: "test",
          filtersHash: "abc",
          seek: [
            { field: "name", value: "test", order: "asc" },
            { field: "id", value: "123", order: "desc" },
          ],
        })
      ).not.toThrow();
    });
  });
});

// ============ InvalidCursorError ============

describe("InvalidCursorError", () => {
  it("has correct name", () => {
    const error = new InvalidCursorError("test message");
    expect(error.name).toBe("InvalidCursorError");
  });

  it("includes message", () => {
    const error = new InvalidCursorError("test message");
    expect(error.message).toBe("test message");
  });

  it("includes cause when provided", () => {
    const cause = new Error("original error");
    const error = new InvalidCursorError("wrapped message", cause);
    expect(error.cause).toBe(cause);
  });

  it("is instanceof Error", () => {
    const error = new InvalidCursorError("test");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(InvalidCursorError);
  });
});
