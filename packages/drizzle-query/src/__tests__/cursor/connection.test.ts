import { describe, it, expect } from "vitest";
import {
  makeConnection,
  createCursorNode,
  type CursorNode,
} from "../../cursor/connection.js";
import { decode } from "../../cursor/cursor.js";
import type { SortParam } from "../../cursor/helpers.js";

// ============ Test Helpers ============

function createMockNode(
  id: string,
  values: Record<string, unknown> = {}
): CursorNode {
  return createCursorNode({
    row: { id, ...values },
    cursorType: "test",
    sortParams: [],
    tieBreaker: "id",
  });
}

function createMockNodeWithSort(
  id: string,
  values: Record<string, unknown>,
  sortParams: SortParam[]
): CursorNode {
  return createCursorNode({
    row: { id, ...values },
    cursorType: "test",
    sortParams,
    tieBreaker: "id",
  });
}

// ============ createCursorNode ============

describe("createCursorNode", () => {
  it("creates a node with correct getId", () => {
    const node = createCursorNode({
      row: { id: "node-123", name: "Test" },
      cursorType: "product",
      sortParams: [],
      tieBreaker: "id",
    });

    expect(node.getId()).toBe("node-123");
  });

  it("creates a node with correct cursor type", () => {
    const node = createCursorNode({
      row: { id: "node-123" },
      cursorType: "category",
      sortParams: [],
      tieBreaker: "id",
    });

    expect(node.getCursorType()).toBe("category");
  });

  it("generates seek values from sort params", () => {
    const node = createCursorNode({
      row: { id: "node-123", updatedAt: "2024-01-01", title: "Test" },
      cursorType: "product",
      sortParams: [
        { field: "updatedAt", direction: "desc" },
        { field: "title", direction: "asc" },
      ],
      tieBreaker: "id",
    });

    const seekValues = node.getSeekValues();
    expect(seekValues).toHaveLength(3);
    expect(seekValues[0]).toEqual({
      field: "updatedAt",
      value: "2024-01-01",
      direction: "desc",
    });
    expect(seekValues[1]).toEqual({
      field: "title",
      value: "Test",
      direction: "asc",
    });
    expect(seekValues[2]).toEqual({
      field: "id",
      value: "node-123",
      direction: "asc", // inherits from last sort param
    });
  });

  it("uses desc for tieBreaker when no sort params", () => {
    const node = createCursorNode({
      row: { id: "node-123" },
      cursorType: "product",
      sortParams: [],
      tieBreaker: "id",
    });

    const seekValues = node.getSeekValues();
    expect(seekValues).toHaveLength(1);
    expect(seekValues[0]).toEqual({
      field: "id",
      value: "node-123",
      direction: "desc",
    });
  });
});

// ============ makeConnection ============

describe("makeConnection", () => {
  describe("forward pagination (first/after)", () => {
    it("creates connection with edges and pageInfo", () => {
      const nodes = [
        createMockNode("1"),
        createMockNode("2"),
        createMockNode("3"),
      ];

      const connection = makeConnection({
        nodes,
        mapper: (node) => ({ id: node.getId() }),
        paging: { first: 10 },
        filtersHash: "",
        tieBreaker: "id",
        sortParams: [],
      });

      expect(connection.edges).toHaveLength(3);
      expect(connection.edges[0].node).toEqual({ id: "1" });
      expect(connection.edges[1].node).toEqual({ id: "2" });
      expect(connection.edges[2].node).toEqual({ id: "3" });
    });

    it("sets hasNextPage=true when more items exist", () => {
      // Query requested 2 items, but we got 3 (limit + 1)
      const nodes = [
        createMockNode("1"),
        createMockNode("2"),
        createMockNode("3"),
      ];

      const connection = makeConnection({
        nodes,
        mapper: (node) => ({ id: node.getId() }),
        paging: { first: 2 },
        filtersHash: "",
        tieBreaker: "id",
        sortParams: [],
      });

      expect(connection.edges).toHaveLength(2);
      expect(connection.pageInfo.hasNextPage).toBe(true);
      expect(connection.pageInfo.hasPreviousPage).toBe(false);
    });

    it("sets hasPreviousPage=true when after cursor is provided", () => {
      const nodes = [createMockNode("1"), createMockNode("2")];

      const connection = makeConnection({
        nodes,
        mapper: (node) => ({ id: node.getId() }),
        paging: { first: 10, after: "some-cursor" },
        filtersHash: "",
        tieBreaker: "id",
        sortParams: [],
      });

      expect(connection.pageInfo.hasPreviousPage).toBe(true);
    });

    it("trims excess nodes when hasMore", () => {
      const nodes = [
        createMockNode("1"),
        createMockNode("2"),
        createMockNode("3"),
        createMockNode("4"),
      ];

      const connection = makeConnection({
        nodes,
        mapper: (node) => ({ id: node.getId() }),
        paging: { first: 3 },
        filtersHash: "",
        tieBreaker: "id",
        sortParams: [],
      });

      expect(connection.edges).toHaveLength(3);
      expect(connection.edges.map((e) => e.node.id)).toEqual(["1", "2", "3"]);
    });
  });

  describe("backward pagination (last/before)", () => {
    it("handles last pagination", () => {
      const nodes = [
        createMockNode("1"),
        createMockNode("2"),
        createMockNode("3"),
      ];

      const connection = makeConnection({
        nodes,
        mapper: (node) => ({ id: node.getId() }),
        paging: { last: 2 },
        filtersHash: "",
        tieBreaker: "id",
        sortParams: [],
        invertOrder: true,
      });

      // Results should be reversed for backward pagination
      expect(connection.edges).toHaveLength(2);
    });

    it("sets hasNextPage=true when before cursor is provided", () => {
      const nodes = [createMockNode("1"), createMockNode("2")];

      const connection = makeConnection({
        nodes,
        mapper: (node) => ({ id: node.getId() }),
        paging: { last: 10, before: "some-cursor" },
        filtersHash: "",
        tieBreaker: "id",
        sortParams: [],
      });

      expect(connection.pageInfo.hasNextPage).toBe(true);
    });

    it("sets hasPreviousPage=true when more items exist in backward pagination", () => {
      const nodes = [
        createMockNode("1"),
        createMockNode("2"),
        createMockNode("3"),
      ];

      const connection = makeConnection({
        nodes,
        mapper: (node) => ({ id: node.getId() }),
        paging: { last: 2 },
        filtersHash: "",
        tieBreaker: "id",
        sortParams: [],
      });

      expect(connection.pageInfo.hasPreviousPage).toBe(true);
    });
  });

  describe("empty results", () => {
    it("returns empty edges with null cursors", () => {
      const connection = makeConnection<CursorNode, { id: string }>({
        nodes: [],
        mapper: (node) => ({ id: node.getId() }),
        paging: { first: 10 },
        filtersHash: "",
        tieBreaker: "id",
        sortParams: [],
      });

      expect(connection.edges).toHaveLength(0);
      expect(connection.pageInfo.startCursor).toBeNull();
      expect(connection.pageInfo.endCursor).toBeNull();
    });
  });

  describe("cursor generation", () => {
    it("generates valid cursors for each edge", () => {
      const sortParams: SortParam[] = [{ field: "title", direction: "asc" }];
      const nodes = [
        createMockNodeWithSort("1", { title: "A" }, sortParams),
        createMockNodeWithSort("2", { title: "B" }, sortParams),
      ];

      const connection = makeConnection({
        nodes,
        mapper: (node) => ({ id: node.getId() }),
        paging: { first: 10 },
        filtersHash: "abc123",
        tieBreaker: "id",
        sortParams,
      });

      // Verify cursors are valid by decoding them
      const cursor1 = decode(connection.edges[0].cursor);
      expect(cursor1.type).toBe("test");
      expect(cursor1.filtersHash).toBe("abc123");
      expect(cursor1.seek).toHaveLength(2);
      expect(cursor1.seek[0].field).toBe("title");
      expect(cursor1.seek[0].value).toBe("A");
    });

    it("sets startCursor and endCursor correctly", () => {
      const nodes = [
        createMockNode("1"),
        createMockNode("2"),
        createMockNode("3"),
      ];

      const connection = makeConnection({
        nodes,
        mapper: (node) => ({ id: node.getId() }),
        paging: { first: 10 },
        filtersHash: "",
        tieBreaker: "id",
        sortParams: [],
      });

      expect(connection.pageInfo.startCursor).toBe(connection.edges[0].cursor);
      expect(connection.pageInfo.endCursor).toBe(connection.edges[2].cursor);
    });
  });

  describe("edge cursor fallback", () => {
    it("builds tie-breaker seek value when node provides none", () => {
      const customNode: CursorNode = {
        getId: () => "fallback-1",
        getCursorType: () => "test",
        getSeekValues: () => [],
      };

      const connection = makeConnection({
        nodes: [customNode],
        mapper: (node) => ({ id: node.getId() }),
        paging: { first: 1 },
        filtersHash: "filters",
        tieBreaker: "id",
        sortParams: [],
      });

      expect(connection.edges).toHaveLength(1);
      const decoded = decode(connection.edges[0].cursor);
      expect(decoded.seek).toHaveLength(1);
      expect(decoded.seek[0]).toEqual({
        field: "id",
        value: "fallback-1",
        direction: "desc",
      });
    });
  });

  describe("totalCount", () => {
    it("includes totalCount when provided", () => {
      const nodes = [createMockNode("1")];

      const connection = makeConnection({
        nodes,
        mapper: (node) => ({ id: node.getId() }),
        paging: { first: 10, totalCount: 100 },
        filtersHash: "",
        tieBreaker: "id",
        sortParams: [],
      });

      expect(connection.totalCount).toBe(100);
    });

    it("omits totalCount when not provided", () => {
      const nodes = [createMockNode("1")];

      const connection = makeConnection({
        nodes,
        mapper: (node) => ({ id: node.getId() }),
        paging: { first: 10 },
        filtersHash: "",
        tieBreaker: "id",
        sortParams: [],
      });

      expect(connection.totalCount).toBeUndefined();
    });
  });

  describe("mapper function", () => {
    it("applies mapper to each node", () => {
      const nodes = [
        createMockNode("1"),
        createMockNode("2"),
      ];

      const connection = makeConnection({
        nodes,
        mapper: (node) => ({
          nodeId: node.getId(),
          transformed: true,
        }),
        paging: { first: 10 },
        filtersHash: "",
        tieBreaker: "id",
        sortParams: [],
      });

      expect(connection.edges[0].node).toEqual({ nodeId: "1", transformed: true });
      expect(connection.edges[1].node).toEqual({ nodeId: "2", transformed: true });
    });
  });

  describe("pagination defaults", () => {
    it("returns all nodes when paging input is empty", () => {
      const nodes = [createMockNode("1"), createMockNode("2")];

      const connection = makeConnection({
        nodes,
        mapper: (node) => ({ id: node.getId() }),
        paging: {},
        filtersHash: "",
        tieBreaker: "id",
        sortParams: [],
      });

      expect(connection.edges).toHaveLength(2);
      expect(connection.pageInfo.hasNextPage).toBe(false);
      expect(connection.pageInfo.hasPreviousPage).toBe(false);
    });
  });

  describe("single item edge cases", () => {
    it("handles first: 1 with exactly one result", () => {
      const nodes = [createMockNode("1")];

      const connection = makeConnection({
        nodes,
        mapper: (node) => ({ id: node.getId() }),
        paging: { first: 1 },
        filtersHash: "",
        tieBreaker: "id",
        sortParams: [],
      });

      expect(connection.edges).toHaveLength(1);
      expect(connection.pageInfo.hasNextPage).toBe(false);
      expect(connection.pageInfo.hasPreviousPage).toBe(false);
      expect(connection.pageInfo.startCursor).toBe(connection.pageInfo.endCursor);
    });

    it("handles first: 1 with hasMore (two results)", () => {
      const nodes = [createMockNode("1"), createMockNode("2")];

      const connection = makeConnection({
        nodes,
        mapper: (node) => ({ id: node.getId() }),
        paging: { first: 1 },
        filtersHash: "",
        tieBreaker: "id",
        sortParams: [],
      });

      expect(connection.edges).toHaveLength(1);
      expect(connection.edges[0].node.id).toBe("1");
      expect(connection.pageInfo.hasNextPage).toBe(true);
    });

    it("handles last: 1 with exactly one result", () => {
      const nodes = [createMockNode("1")];

      const connection = makeConnection({
        nodes,
        mapper: (node) => ({ id: node.getId() }),
        paging: { last: 1 },
        filtersHash: "",
        tieBreaker: "id",
        sortParams: [],
      });

      expect(connection.edges).toHaveLength(1);
      expect(connection.pageInfo.hasPreviousPage).toBe(false);
    });

    it("handles last: 1 with hasMore (two results)", () => {
      const nodes = [createMockNode("1"), createMockNode("2")];

      const connection = makeConnection({
        nodes,
        mapper: (node) => ({ id: node.getId() }),
        paging: { last: 1 },
        filtersHash: "",
        tieBreaker: "id",
        sortParams: [],
      });

      expect(connection.edges).toHaveLength(1);
      expect(connection.pageInfo.hasPreviousPage).toBe(true);
    });
  });

  describe("exact limit (no hasMore)", () => {
    it("returns all items when count equals limit", () => {
      const nodes = [
        createMockNode("1"),
        createMockNode("2"),
        createMockNode("3"),
      ];

      const connection = makeConnection({
        nodes,
        mapper: (node) => ({ id: node.getId() }),
        paging: { first: 3 },
        filtersHash: "",
        tieBreaker: "id",
        sortParams: [],
      });

      expect(connection.edges).toHaveLength(3);
      expect(connection.pageInfo.hasNextPage).toBe(false);
    });

    it("returns all items for last when count equals limit", () => {
      const nodes = [
        createMockNode("1"),
        createMockNode("2"),
        createMockNode("3"),
      ];

      const connection = makeConnection({
        nodes,
        mapper: (node) => ({ id: node.getId() }),
        paging: { last: 3 },
        filtersHash: "",
        tieBreaker: "id",
        sortParams: [],
      });

      expect(connection.edges).toHaveLength(3);
      expect(connection.pageInfo.hasPreviousPage).toBe(false);
    });
  });

  describe("backward pagination with invertOrder", () => {
    it("reverses nodes when invertOrder is true (last without before)", () => {
      const nodes = [
        createMockNode("3"), // oldest (from inverted SQL)
        createMockNode("2"),
        createMockNode("1"), // newest
      ];

      const connection = makeConnection({
        nodes,
        mapper: (node) => ({ id: node.getId() }),
        paging: { last: 3 },
        filtersHash: "",
        tieBreaker: "id",
        sortParams: [],
        invertOrder: true,
      });

      // Should be reversed to natural order: 1, 2, 3
      expect(connection.edges.map((e) => e.node.id)).toEqual(["1", "2", "3"]);
    });

    it("does not reverse when invertOrder is false (last with before)", () => {
      const nodes = [
        createMockNode("1"),
        createMockNode("2"),
        createMockNode("3"),
      ];

      const connection = makeConnection({
        nodes,
        mapper: (node) => ({ id: node.getId() }),
        paging: { last: 3, before: "some-cursor" },
        filtersHash: "",
        tieBreaker: "id",
        sortParams: [],
        invertOrder: false,
      });

      // Order preserved
      expect(connection.edges.map((e) => e.node.id)).toEqual(["1", "2", "3"]);
    });

    it("trims from end when last with before and hasMore", () => {
      const nodes = [
        createMockNode("1"),
        createMockNode("2"),
        createMockNode("3"),
        createMockNode("4"),
      ];

      const connection = makeConnection({
        nodes,
        mapper: (node) => ({ id: node.getId() }),
        paging: { last: 3, before: "some-cursor" },
        filtersHash: "",
        tieBreaker: "id",
        sortParams: [],
        invertOrder: false,
      });

      // Should trim from start, keeping last 3
      expect(connection.edges.map((e) => e.node.id)).toEqual(["2", "3", "4"]);
      expect(connection.pageInfo.hasPreviousPage).toBe(true);
    });
  });

  describe("combined pagination scenarios", () => {
    it("first page forward: no cursors, hasNextPage based on results", () => {
      const nodes = [
        createMockNode("1"),
        createMockNode("2"),
        createMockNode("3"),
      ];

      const connection = makeConnection({
        nodes,
        mapper: (node) => ({ id: node.getId() }),
        paging: { first: 2 },
        filtersHash: "",
        tieBreaker: "id",
        sortParams: [],
      });

      expect(connection.pageInfo.hasNextPage).toBe(true);
      expect(connection.pageInfo.hasPreviousPage).toBe(false);
    });

    it("middle page forward: has after cursor, both pages exist", () => {
      const nodes = [
        createMockNode("3"),
        createMockNode("4"),
        createMockNode("5"),
      ];

      const connection = makeConnection({
        nodes,
        mapper: (node) => ({ id: node.getId() }),
        paging: { first: 2, after: "cursor-to-2" },
        filtersHash: "",
        tieBreaker: "id",
        sortParams: [],
      });

      expect(connection.pageInfo.hasNextPage).toBe(true);
      expect(connection.pageInfo.hasPreviousPage).toBe(true);
    });

    it("last page forward: has after cursor, no next page", () => {
      const nodes = [
        createMockNode("8"),
        createMockNode("9"),
      ];

      const connection = makeConnection({
        nodes,
        mapper: (node) => ({ id: node.getId() }),
        paging: { first: 5, after: "cursor-to-7" },
        filtersHash: "",
        tieBreaker: "id",
        sortParams: [],
      });

      expect(connection.pageInfo.hasNextPage).toBe(false);
      expect(connection.pageInfo.hasPreviousPage).toBe(true);
    });

    it("first page backward (last without before): invertOrder, hasPrevious based on results", () => {
      const nodes = [
        createMockNode("8"),
        createMockNode("9"),
        createMockNode("10"),
      ];

      const connection = makeConnection({
        nodes,
        mapper: (node) => ({ id: node.getId() }),
        paging: { last: 2 },
        filtersHash: "",
        tieBreaker: "id",
        sortParams: [],
        invertOrder: true,
      });

      expect(connection.pageInfo.hasNextPage).toBe(false);
      expect(connection.pageInfo.hasPreviousPage).toBe(true);
    });

    it("middle page backward: has before cursor, both pages exist", () => {
      const nodes = [
        createMockNode("4"),
        createMockNode("5"),
        createMockNode("6"),
      ];

      const connection = makeConnection({
        nodes,
        mapper: (node) => ({ id: node.getId() }),
        paging: { last: 2, before: "cursor-to-7" },
        filtersHash: "",
        tieBreaker: "id",
        sortParams: [],
      });

      expect(connection.pageInfo.hasNextPage).toBe(true);
      expect(connection.pageInfo.hasPreviousPage).toBe(true);
    });
  });

  describe("null values in cursor nodes", () => {
    it("handles null id gracefully", () => {
      const node = createCursorNode({
        row: { id: null, name: "Test" },
        cursorType: "product",
        sortParams: [],
        tieBreaker: "id",
      });

      expect(node.getId()).toBe("");
    });

    it("handles null sort field values", () => {
      const sortParams: SortParam[] = [{ field: "price", direction: "desc" }];
      const node = createCursorNode({
        row: { id: "1", price: null },
        cursorType: "product",
        sortParams,
        tieBreaker: "id",
      });

      const seekValues = node.getSeekValues();
      expect(seekValues[0].value).toBeNull();
      expect(seekValues[1].value).toBe("1"); // tieBreaker
    });

    it("handles undefined field values", () => {
      const sortParams: SortParam[] = [{ field: "deletedAt", direction: "desc" }];
      const node = createCursorNode({
        row: { id: "1" }, // deletedAt not present
        cursorType: "product",
        sortParams,
        tieBreaker: "id",
      });

      const seekValues = node.getSeekValues();
      expect(seekValues[0].value).toBeUndefined();
    });
  });

  describe("nested field values", () => {
    it("extracts nested field for sort from nested object", () => {
      const sortParams: SortParam[] = [{ field: "author.name", direction: "asc" }];
      const node = createCursorNode({
        row: { id: "1", author: { name: "John" } },
        cursorType: "article",
        sortParams,
        tieBreaker: "id",
      });

      const seekValues = node.getSeekValues();
      expect(seekValues[0].field).toBe("author.name");
      expect(seekValues[0].value).toBe("John");
    });

    it("handles nested tieBreaker from nested object", () => {
      const node = createCursorNode({
        row: { entity: { id: "entity-123" }, name: "Test" },
        cursorType: "item",
        sortParams: [],
        tieBreaker: "entity.id",
      });

      expect(node.getId()).toBe("entity-123");
    });

    it("returns undefined for missing nested path", () => {
      const sortParams: SortParam[] = [{ field: "author.name", direction: "asc" }];
      const node = createCursorNode({
        row: { id: "1" }, // no author field
        cursorType: "article",
        sortParams,
        tieBreaker: "id",
      });

      const seekValues = node.getSeekValues();
      expect(seekValues[0].value).toBeUndefined();
    });

    it("handles deeply nested paths", () => {
      const sortParams: SortParam[] = [{ field: "meta.author.name", direction: "desc" }];
      const node = createCursorNode({
        row: { id: "1", meta: { author: { name: "Jane" } } },
        cursorType: "article",
        sortParams,
        tieBreaker: "id",
      });

      const seekValues = node.getSeekValues();
      expect(seekValues[0].value).toBe("Jane");
    });
  });
});
