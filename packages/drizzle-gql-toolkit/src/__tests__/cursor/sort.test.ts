import { describe, it, expect } from "vitest";
import { parseSort, validateCursorOrder } from "../../cursor/sort.js";
import type { CursorParams } from "../../cursor/cursor.js";

// ============ parseSort ============

describe("parseSort", () => {
  describe("GraphQL enum format (FIELD_ORDER)", () => {
    it("parses UPDATED_AT_DESC format", () => {
      const params = parseSort("UPDATED_AT_DESC", "createdAt");
      expect(params).toEqual([{ field: "updatedAt", order: "desc" }]);
    });

    it("parses CREATED_AT_ASC format", () => {
      const params = parseSort("CREATED_AT_ASC", "createdAt");
      expect(params).toEqual([{ field: "createdAt", order: "asc" }]);
    });

    it("parses ID_DESC format", () => {
      const params = parseSort("ID_DESC", "id");
      expect(params).toEqual([{ field: "id", order: "desc" }]);
    });
  });

  describe("colon format (field:order)", () => {
    it("parses title:asc format", () => {
      const params = parseSort("title:asc", "createdAt");
      expect(params).toEqual([{ field: "title", order: "asc" }]);
    });

    it("parses updatedAt:desc format", () => {
      const params = parseSort("updatedAt:desc", "createdAt");
      expect(params).toEqual([{ field: "updatedAt", order: "desc" }]);
    });
  });

  describe("multiple sort fields", () => {
    it("parses mixed formats", () => {
      const params = parseSort("UPDATED_AT_DESC,title:asc", "createdAt");
      expect(params).toEqual([
        { field: "updatedAt", order: "desc" },
        { field: "title", order: "asc" },
      ]);
    });

    it("parses multiple colon formats", () => {
      const params = parseSort("status:desc,title:asc,id:desc", "createdAt");
      expect(params).toEqual([
        { field: "status", order: "desc" },
        { field: "title", order: "asc" },
        { field: "id", order: "desc" },
      ]);
    });
  });

  describe("default values", () => {
    it("uses default field when sort is empty", () => {
      const params = parseSort("", "createdAt");
      expect(params).toEqual([{ field: "createdAt", order: "desc" }]);
    });

    it("uses default field when sort is undefined", () => {
      const params = parseSort(undefined, "updatedAt");
      expect(params).toEqual([{ field: "updatedAt", order: "desc" }]);
    });

    it("uses default field when sort is whitespace only", () => {
      const params = parseSort("   ", "id");
      expect(params).toEqual([{ field: "id", order: "desc" }]);
    });
  });

  describe("field name mapping", () => {
    it("applies custom mapper", () => {
      const mapper = (field: string) =>
        field === "price" ? "priceAmount" : field;
      const params = parseSort("price:asc", "id", mapper);
      expect(params).toEqual([{ field: "priceAmount", order: "asc" }]);
    });

    it("applies mapper to all fields", () => {
      const mapper = (field: string) => `mapped_${field}`;
      const params = parseSort("title:asc,status:desc", "id", mapper);
      expect(params).toEqual([
        { field: "mapped_title", order: "asc" },
        { field: "mapped_status", order: "desc" },
      ]);
    });
  });

  describe("nested paths", () => {
    it("handles nested paths", () => {
      const params = parseSort("author.name:asc", "id");
      expect(params).toEqual([{ field: "author.name", order: "asc" }]);
    });

    it("handles deeply nested paths", () => {
      const params = parseSort("category.parent.name:desc", "id");
      expect(params).toEqual([{ field: "category.parent.name", order: "desc" }]);
    });
  });

  describe("error handling", () => {
    it("throws on empty field", () => {
      expect(() => parseSort(":asc", "id")).toThrow("empty field");
    });

    it("throws on invalid order", () => {
      expect(() => parseSort("name:invalid", "id")).toThrow("Invalid sort order");
    });

    it("throws on missing field before colon", () => {
      expect(() => parseSort(":desc", "id")).toThrow("empty field");
    });
  });
});

// ============ validateCursorOrder ============

describe("validateCursorOrder", () => {
  describe("valid cursors", () => {
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

    it("validates single field with tieBreaker", () => {
      const params = parseSort("title:asc", "id");
      const cursor: CursorParams = {
        type: "item",
        filtersHash: "",
        seek: [
          { field: "title", value: "A", order: "asc" },
          { field: "id", value: "123", order: "asc" },
        ],
      };
      expect(() => validateCursorOrder(cursor, params, "id")).not.toThrow();
    });

    it("validates multiple sort fields", () => {
      const params = parseSort("status:desc,updatedAt:asc", "id");
      const cursor: CursorParams = {
        type: "item",
        filtersHash: "",
        seek: [
          { field: "status", value: "ACTIVE", order: "desc" },
          { field: "updatedAt", value: "2024-01-01", order: "asc" },
          { field: "id", value: "abc", order: "asc" },
        ],
      };
      expect(() => validateCursorOrder(cursor, params, "id")).not.toThrow();
    });
  });

  describe("length mismatch", () => {
    it("throws when cursor has too few seek values", () => {
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

    it("throws when cursor has too many seek values", () => {
      const params = parseSort("title:asc", "id");
      const cursor: CursorParams = {
        type: "item",
        filtersHash: "",
        seek: [
          { field: "title", value: "A", order: "asc" },
          { field: "extra", value: "x", order: "asc" },
          { field: "id", value: "123", order: "asc" },
        ],
      };
      expect(() => validateCursorOrder(cursor, params, "id")).toThrow(
        "length mismatch"
      );
    });
  });

  describe("field mismatch", () => {
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
  });

  describe("order mismatch", () => {
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
  });

  describe("tieBreaker validation", () => {
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

    it("accepts custom tieBreaker field", () => {
      const params = parseSort("title:asc", "id");
      const cursor: CursorParams = {
        type: "item",
        filtersHash: "",
        seek: [
          { field: "title", value: "A", order: "asc" },
          { field: "uuid", value: "123", order: "asc" },
        ],
      };
      expect(() => validateCursorOrder(cursor, params, "uuid")).not.toThrow();
    });
  });
});
