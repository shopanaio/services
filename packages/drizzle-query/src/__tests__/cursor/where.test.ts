import { describe, it, expect } from "vitest";
import { buildCursorWhereInput } from "../../cursor/where.js";
import type { CursorParams } from "../../cursor/cursor.js";

// ============ buildCursorWhereInput ============

describe("buildCursorWhereInput", () => {
  describe("forward pagination (after cursor)", () => {
    it("builds lexicographic ladder for two fields with desc order", () => {
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
        _or: [
          { updatedAt: { _lt: "2024-01-01" } },
          { updatedAt: { _eq: "2024-01-01" }, id: { _lt: "node-1" } },
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

      // forward + asc = _gt (next items are greater)
      const where = buildCursorWhereInput(params, true);
      expect(where).toEqual({
        _or: [
          { title: { _gt: "A" } },
          { title: { _eq: "A" }, id: { _gt: "1" } },
        ],
      });
    });

    it("handles mixed orders", () => {
      const params: CursorParams = {
        type: "item",
        filtersHash: "",
        seek: [
          { field: "status", value: "ACTIVE", order: "asc" },
          { field: "updatedAt", value: "2024-01-01", order: "desc" },
          { field: "id", value: "abc", order: "desc" },
        ],
      };

      const where = buildCursorWhereInput(params, true);
      expect(where).toEqual({
        _or: [
          { status: { _gt: "ACTIVE" } },
          { status: { _eq: "ACTIVE" }, updatedAt: { _lt: "2024-01-01" } },
          {
            status: { _eq: "ACTIVE" },
            updatedAt: { _eq: "2024-01-01" },
            id: { _lt: "abc" },
          },
        ],
      });
    });
  });

  describe("backward pagination (before cursor)", () => {
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
        _or: [
          { updatedAt: { _gt: "2024-01-01" } },
          { updatedAt: { _eq: "2024-01-01" }, id: { _gt: "node-1" } },
        ],
      });
    });

    it("handles asc order in backward pagination", () => {
      const params: CursorParams = {
        type: "item",
        filtersHash: "",
        seek: [
          { field: "title", value: "Z", order: "asc" },
          { field: "id", value: "999", order: "asc" },
        ],
      };

      // backward + asc = _lt (previous items are smaller)
      const where = buildCursorWhereInput(params, false);
      expect(where).toEqual({
        _or: [
          { title: { _lt: "Z" } },
          { title: { _eq: "Z" }, id: { _lt: "999" } },
        ],
      });
    });
  });

  describe("single seek value", () => {
    it("handles single seek value forward", () => {
      const params: CursorParams = {
        type: "item",
        filtersHash: "",
        seek: [{ field: "id", value: "123", order: "desc" }],
      };

      const where = buildCursorWhereInput(params, true);
      expect(where).toEqual({
        _or: [{ id: { _lt: "123" } }],
      });
    });

    it("handles single seek value backward", () => {
      const params: CursorParams = {
        type: "item",
        filtersHash: "",
        seek: [{ field: "id", value: "123", order: "desc" }],
      };

      const where = buildCursorWhereInput(params, false);
      expect(where).toEqual({
        _or: [{ id: { _gt: "123" } }],
      });
    });
  });

  describe("nested paths", () => {
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
        _or: [
          { author: { name: { _gt: "John" } } },
          { author: { name: { _eq: "John" } }, id: { _gt: "1" } },
        ],
      });
    });

    it("handles deeply nested paths", () => {
      const params: CursorParams = {
        type: "item",
        filtersHash: "",
        seek: [
          { field: "category.parent.name", value: "Electronics", order: "asc" },
          { field: "id", value: "1", order: "asc" },
        ],
      };

      const where = buildCursorWhereInput(params, true);
      expect(where).toEqual({
        _or: [
          { category: { parent: { name: { _gt: "Electronics" } } } },
          { category: { parent: { name: { _eq: "Electronics" } } }, id: { _gt: "1" } },
        ],
      });
    });
  });

  describe("edge cases", () => {
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
        _or: [
          { status: { _lt: "ACTIVE" } },
          { status: { _eq: "ACTIVE" }, updatedAt: { _lt: "2024-01-01" } },
          {
            status: { _eq: "ACTIVE" },
            updatedAt: { _eq: "2024-01-01" },
            id: { _lt: "abc" },
          },
        ],
      });
    });

    it("handles null values", () => {
      const params: CursorParams = {
        type: "item",
        filtersHash: "",
        seek: [
          { field: "deletedAt", value: null, order: "desc" },
          { field: "id", value: "123", order: "desc" },
        ],
      };

      const where = buildCursorWhereInput(params, true);
      expect(where).toEqual({
        _or: [
          { deletedAt: { _lt: null } },
          { deletedAt: { _eq: null }, id: { _lt: "123" } },
        ],
      });
    });

    it("handles numeric values", () => {
      const params: CursorParams = {
        type: "item",
        filtersHash: "",
        seek: [
          { field: "price", value: 99.99, order: "desc" },
          { field: "id", value: "123", order: "desc" },
        ],
      };

      const where = buildCursorWhereInput(params, true);
      expect(where).toEqual({
        _or: [
          { price: { _lt: 99.99 } },
          { price: { _eq: 99.99 }, id: { _lt: "123" } },
        ],
      });
    });
  });
});
