import { describe, it, expect } from "vitest";
import { parseSort, validateCursorOrder } from "../../cursor/sort.js";
import type { CursorParams } from "../../cursor/cursor.js";
import type { OrderByItem } from "../../types.js";

// ============ parseSort ============

describe("parseSort", () => {
  describe("basic parsing", () => {
    it("parses single order item", () => {
      const order: OrderByItem<string>[] = [{ field: "updatedAt", direction: "desc" }];
      const params = parseSort(order, "createdAt");
      expect(params).toEqual([{ field: "updatedAt", direction: "desc" }]);
    });

    it("parses multiple order items", () => {
      const order: OrderByItem<string>[] = [
        { field: "status", direction: "desc" },
        { field: "title", direction: "asc" },
      ];
      const params = parseSort(order, "id");
      expect(params).toEqual([
        { field: "status", direction: "desc" },
        { field: "title", direction: "asc" },
      ]);
    });
  });

  describe("default values", () => {
    it("uses default field when order is empty array", () => {
      const params = parseSort([], "createdAt");
      expect(params).toEqual([{ field: "createdAt", direction: "desc" }]);
    });

    it("uses default field when order is undefined", () => {
      const params = parseSort(undefined, "updatedAt");
      expect(params).toEqual([{ field: "updatedAt", direction: "desc" }]);
    });
  });

  describe("nested paths", () => {
    it("handles nested paths", () => {
      const order: OrderByItem<string>[] = [{ field: "author.name", direction: "asc" }];
      const params = parseSort(order, "id");
      expect(params).toEqual([{ field: "author.name", direction: "asc" }]);
    });

    it("handles deeply nested paths", () => {
      const order: OrderByItem<string>[] = [{ field: "category.parent.name", direction: "desc" }];
      const params = parseSort(order, "id");
      expect(params).toEqual([{ field: "category.parent.name", direction: "desc" }]);
    });
  });
});

// ============ validateCursorOrder ============

describe("validateCursorOrder", () => {
  describe("valid cursors", () => {
    it("validates matching cursor and sort", () => {
      const order: OrderByItem<string>[] = [{ field: "updatedAt", direction: "desc" }];
      const params = parseSort(order, "updatedAt");
      const cursor: CursorParams = {
        type: "category",
        filtersHash: "",
        seek: [
          { field: "updatedAt", value: 1, direction: "desc" },
          { field: "id", value: "1", direction: "desc" },
        ],
      };
      expect(() => validateCursorOrder(cursor, params, "id")).not.toThrow();
    });

    it("validates single field with tieBreaker", () => {
      const order: OrderByItem<string>[] = [{ field: "title", direction: "asc" }];
      const params = parseSort(order, "id");
      const cursor: CursorParams = {
        type: "item",
        filtersHash: "",
        seek: [
          { field: "title", value: "A", direction: "asc" },
          { field: "id", value: "123", direction: "asc" },
        ],
      };
      expect(() => validateCursorOrder(cursor, params, "id")).not.toThrow();
    });

    it("validates multiple sort fields", () => {
      const order: OrderByItem<string>[] = [
        { field: "status", direction: "desc" },
        { field: "updatedAt", direction: "asc" },
      ];
      const params = parseSort(order, "id");
      const cursor: CursorParams = {
        type: "item",
        filtersHash: "",
        seek: [
          { field: "status", value: "ACTIVE", direction: "desc" },
          { field: "updatedAt", value: "2024-01-01", direction: "asc" },
          { field: "id", value: "abc", direction: "asc" },
        ],
      };
      expect(() => validateCursorOrder(cursor, params, "id")).not.toThrow();
    });
  });

  describe("length mismatch", () => {
    it("throws when cursor has too few seek values", () => {
      const order: OrderByItem<string>[] = [{ field: "updatedAt", direction: "desc" }];
      const params = parseSort(order, "updatedAt");
      const cursor: CursorParams = {
        type: "category",
        filtersHash: "",
        seek: [{ field: "updatedAt", value: 1, direction: "desc" }],
      };
      expect(() => validateCursorOrder(cursor, params, "id")).toThrow(
        "length mismatch"
      );
    });

    it("throws when cursor has too many seek values", () => {
      const order: OrderByItem<string>[] = [{ field: "title", direction: "asc" }];
      const params = parseSort(order, "id");
      const cursor: CursorParams = {
        type: "item",
        filtersHash: "",
        seek: [
          { field: "title", value: "A", direction: "asc" },
          { field: "extra", value: "x", direction: "asc" },
          { field: "id", value: "123", direction: "asc" },
        ],
      };
      expect(() => validateCursorOrder(cursor, params, "id")).toThrow(
        "length mismatch"
      );
    });
  });

  describe("field mismatch", () => {
    it("throws on field mismatch", () => {
      const order: OrderByItem<string>[] = [{ field: "updatedAt", direction: "desc" }];
      const params = parseSort(order, "updatedAt");
      const cursor: CursorParams = {
        type: "category",
        filtersHash: "",
        seek: [
          { field: "createdAt", value: 1, direction: "desc" },
          { field: "id", value: "1", direction: "desc" },
        ],
      };
      expect(() => validateCursorOrder(cursor, params, "id")).toThrow(
        "field mismatch"
      );
    });
  });

  describe("order mismatch", () => {
    it("throws on order mismatch", () => {
      const order: OrderByItem<string>[] = [{ field: "updatedAt", direction: "desc" }];
      const params = parseSort(order, "updatedAt");
      const cursor: CursorParams = {
        type: "category",
        filtersHash: "",
        seek: [
          { field: "updatedAt", value: 1, direction: "asc" },
          { field: "id", value: "1", direction: "desc" },
        ],
      };
      expect(() => validateCursorOrder(cursor, params, "id")).toThrow(
        "direction mismatch"
      );
    });
  });

  describe("tieBreaker validation", () => {
    it("throws on wrong tieBreaker", () => {
      const order: OrderByItem<string>[] = [{ field: "updatedAt", direction: "desc" }];
      const params = parseSort(order, "updatedAt");
      const cursor: CursorParams = {
        type: "category",
        filtersHash: "",
        seek: [
          { field: "updatedAt", value: 1, direction: "desc" },
          { field: "uuid", value: "1", direction: "desc" },
        ],
      };
      expect(() => validateCursorOrder(cursor, params, "id")).toThrow(
        "must be id"
      );
    });

    it("accepts custom tieBreaker field", () => {
      const order: OrderByItem<string>[] = [{ field: "title", direction: "asc" }];
      const params = parseSort(order, "id");
      const cursor: CursorParams = {
        type: "item",
        filtersHash: "",
        seek: [
          { field: "title", value: "A", direction: "asc" },
          { field: "uuid", value: "123", direction: "asc" },
        ],
      };
      expect(() => validateCursorOrder(cursor, params, "uuid")).not.toThrow();
    });
  });
});
