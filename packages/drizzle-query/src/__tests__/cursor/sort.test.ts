import { describe, it, expect } from "vitest";
import { parseSort, validateCursorOrder } from "../../cursor/sort.js";
import type { CursorParams } from "../../cursor/cursor.js";
import type { OrderByItem } from "../../types.js";

// ============ parseSort ============

describe("parseSort", () => {
  describe("basic parsing", () => {
    it("parses single order item", () => {
      const order: OrderByItem<string>[] = [{ field: "updatedAt", order: "desc" }];
      const params = parseSort(order, "createdAt");
      expect(params).toEqual([{ field: "updatedAt", order: "desc" }]);
    });

    it("parses multiple order items", () => {
      const order: OrderByItem<string>[] = [
        { field: "status", order: "desc" },
        { field: "title", order: "asc" },
      ];
      const params = parseSort(order, "id");
      expect(params).toEqual([
        { field: "status", order: "desc" },
        { field: "title", order: "asc" },
      ]);
    });
  });

  describe("default values", () => {
    it("uses default field when order is empty array", () => {
      const params = parseSort([], "createdAt");
      expect(params).toEqual([{ field: "createdAt", order: "desc" }]);
    });

    it("uses default field when order is undefined", () => {
      const params = parseSort(undefined, "updatedAt");
      expect(params).toEqual([{ field: "updatedAt", order: "desc" }]);
    });
  });

  describe("nested paths", () => {
    it("handles nested paths", () => {
      const order: OrderByItem<string>[] = [{ field: "author.name", order: "asc" }];
      const params = parseSort(order, "id");
      expect(params).toEqual([{ field: "author.name", order: "asc" }]);
    });

    it("handles deeply nested paths", () => {
      const order: OrderByItem<string>[] = [{ field: "category.parent.name", order: "desc" }];
      const params = parseSort(order, "id");
      expect(params).toEqual([{ field: "category.parent.name", order: "desc" }]);
    });
  });
});

// ============ validateCursorOrder ============

describe("validateCursorOrder", () => {
  describe("valid cursors", () => {
    it("validates matching cursor and sort", () => {
      const order: OrderByItem<string>[] = [{ field: "updatedAt", order: "desc" }];
      const params = parseSort(order, "updatedAt");
      const cursor: CursorParams = {
        type: "category",
        filtersHash: "",
        seek: [
          { field: "updatedAt", value: 1, order: "desc" },
          { field: "id", value: "1", order: "desc" },
        ],
      };
      expect(() => validateCursorOrder(cursor, params, "id")).not.toThrow();
    });

    it("validates single field with tieBreaker", () => {
      const order: OrderByItem<string>[] = [{ field: "title", order: "asc" }];
      const params = parseSort(order, "id");
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
      const order: OrderByItem<string>[] = [
        { field: "status", order: "desc" },
        { field: "updatedAt", order: "asc" },
      ];
      const params = parseSort(order, "id");
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
      const order: OrderByItem<string>[] = [{ field: "updatedAt", order: "desc" }];
      const params = parseSort(order, "updatedAt");
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
      const order: OrderByItem<string>[] = [{ field: "title", order: "asc" }];
      const params = parseSort(order, "id");
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
      const order: OrderByItem<string>[] = [{ field: "updatedAt", order: "desc" }];
      const params = parseSort(order, "updatedAt");
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
      const order: OrderByItem<string>[] = [{ field: "updatedAt", order: "desc" }];
      const params = parseSort(order, "updatedAt");
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
      const order: OrderByItem<string>[] = [{ field: "updatedAt", order: "desc" }];
      const params = parseSort(order, "updatedAt");
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
      const order: OrderByItem<string>[] = [{ field: "title", order: "asc" }];
      const params = parseSort(order, "id");
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
