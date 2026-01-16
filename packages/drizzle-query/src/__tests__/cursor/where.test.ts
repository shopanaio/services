import { describe, it, expect } from "vitest";
import { buildCursorWhereInput } from "../../cursor/where.js";
import type { CursorParams } from "../../cursor/cursor.js";
import type { SeekTransforms } from "../../cursor/types.js";

// ============ buildCursorWhereInput ============

describe("buildCursorWhereInput", () => {
  describe("forward pagination (after cursor)", () => {
    it("builds lexicographic ladder for two fields with desc order", () => {
      const params: CursorParams = {
        type: "category",
        filtersHash: "",
        seek: [
          { field: "updatedAt", value: "2024-01-01", direction: "desc" },
          { field: "id", value: "node-1", direction: "desc" },
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
          { field: "title", value: "A", direction: "asc" },
          { field: "id", value: "1", direction: "asc" },
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
          { field: "status", value: "ACTIVE", direction: "asc" },
          { field: "updatedAt", value: "2024-01-01", direction: "desc" },
          { field: "id", value: "abc", direction: "desc" },
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
          { field: "updatedAt", value: "2024-01-01", direction: "desc" },
          { field: "id", value: "node-1", direction: "desc" },
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
          { field: "title", value: "Z", direction: "asc" },
          { field: "id", value: "999", direction: "asc" },
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
        seek: [{ field: "id", value: "123", direction: "desc" }],
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
        seek: [{ field: "id", value: "123", direction: "desc" }],
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
          { field: "author.name", value: "John", direction: "asc" },
          { field: "id", value: "1", direction: "asc" },
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
          { field: "category.parent.name", value: "Electronics", direction: "asc" },
          { field: "id", value: "1", direction: "asc" },
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
          { field: "status", value: "ACTIVE", direction: "desc" },
          { field: "updatedAt", value: "2024-01-01", direction: "desc" },
          { field: "id", value: "abc", direction: "desc" },
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
          { field: "deletedAt", value: null, direction: "desc" },
          { field: "id", value: "123", direction: "desc" },
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
          { field: "price", value: 99.99, direction: "desc" },
          { field: "id", value: "123", direction: "desc" },
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

  describe("seekTransforms", () => {
    it("applies decode transform to seek values", () => {
      const params: CursorParams = {
        type: "file",
        filtersHash: "",
        seek: [
          { field: "id", value: "Z2lkOi8vc2hvcGFuYS9GaWxlLzEyMzQ1Njc4", direction: "desc" },
        ],
      };

      const seekTransforms: SeekTransforms = {
        id: {
          encode: (v) => `encoded-${v}`,
          decode: (v) => (v as string).replace("Z2lkOi8vc2hvcGFuYS9GaWxlLw==", "").replace("Z2lkOi8vc2hvcGFuYS9GaWxlLzEyMzQ1Njc4", "12345678"),
        },
      };

      const where = buildCursorWhereInput(params, true, seekTransforms);
      expect(where).toEqual({
        _or: [
          { id: { _lt: "12345678" } },
        ],
      });
    });

    it("applies decode transform to multiple seek values", () => {
      const params: CursorParams = {
        type: "file",
        filtersHash: "",
        seek: [
          { field: "createdAt", value: "2024-01-01", direction: "desc" },
          { field: "id", value: "global-id-123", direction: "desc" },
        ],
      };

      const seekTransforms: SeekTransforms = {
        id: {
          encode: (v) => `global-${v}`,
          decode: (v) => (v as string).replace("global-id-", "uuid-"),
        },
      };

      const where = buildCursorWhereInput(params, true, seekTransforms);
      expect(where).toEqual({
        _or: [
          { createdAt: { _lt: "2024-01-01" } },
          { createdAt: { _eq: "2024-01-01" }, id: { _lt: "uuid-123" } },
        ],
      });
    });

    it("applies decode transform in equality conditions", () => {
      const params: CursorParams = {
        type: "item",
        filtersHash: "",
        seek: [
          { field: "parentId", value: "global-parent-1", direction: "asc" },
          { field: "id", value: "global-id-2", direction: "asc" },
        ],
      };

      const seekTransforms: SeekTransforms = {
        parentId: {
          encode: (v) => `global-parent-${v}`,
          decode: (v) => (v as string).replace("global-parent-", ""),
        },
        id: {
          encode: (v) => `global-id-${v}`,
          decode: (v) => (v as string).replace("global-id-", ""),
        },
      };

      const where = buildCursorWhereInput(params, true, seekTransforms);
      expect(where).toEqual({
        _or: [
          { parentId: { _gt: "1" } },
          { parentId: { _eq: "1" }, id: { _gt: "2" } },
        ],
      });
    });

    it("does not transform fields without transforms", () => {
      const params: CursorParams = {
        type: "item",
        filtersHash: "",
        seek: [
          { field: "status", value: "ACTIVE", direction: "desc" },
          { field: "id", value: "global-123", direction: "desc" },
        ],
      };

      const seekTransforms: SeekTransforms = {
        id: {
          encode: (v) => `global-${v}`,
          decode: (v) => (v as string).replace("global-", ""),
        },
      };

      const where = buildCursorWhereInput(params, true, seekTransforms);
      expect(where).toEqual({
        _or: [
          { status: { _lt: "ACTIVE" } },
          { status: { _eq: "ACTIVE" }, id: { _lt: "123" } },
        ],
      });
    });

    it("works without seekTransforms (backward compatibility)", () => {
      const params: CursorParams = {
        type: "item",
        filtersHash: "",
        seek: [
          { field: "id", value: "raw-uuid", direction: "desc" },
        ],
      };

      const where = buildCursorWhereInput(params, true);
      expect(where).toEqual({
        _or: [
          { id: { _lt: "raw-uuid" } },
        ],
      });
    });

    it("works with undefined seekTransforms", () => {
      const params: CursorParams = {
        type: "item",
        filtersHash: "",
        seek: [
          { field: "id", value: "raw-uuid", direction: "desc" },
        ],
      };

      const where = buildCursorWhereInput(params, true, undefined);
      expect(where).toEqual({
        _or: [
          { id: { _lt: "raw-uuid" } },
        ],
      });
    });
  });
});
