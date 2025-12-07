import { describe, it, expect } from "vitest";
import {
  makeConnection,
  createCursorNode,
  type CursorNode,
} from "./connection.js";
import { decode } from "./cursor.js";
import type { SortParam } from "./helpers.js";

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
        { field: "updatedAt", order: "desc" },
        { field: "title", order: "asc" },
      ],
      tieBreaker: "id",
    });

    const seekValues = node.getSeekValues();
    expect(seekValues).toHaveLength(3);
    expect(seekValues[0]).toEqual({
      field: "updatedAt",
      value: "2024-01-01",
      order: "desc",
    });
    expect(seekValues[1]).toEqual({
      field: "title",
      value: "Test",
      order: "asc",
    });
    expect(seekValues[2]).toEqual({
      field: "id",
      value: "node-123",
      order: "asc", // inherits from last sort param
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
      order: "desc",
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
      const sortParams: SortParam[] = [{ field: "title", order: "asc" }];
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
});
