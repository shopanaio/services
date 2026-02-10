import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { ApiFixtures } from '@fixtures/api/api';
import { GraphQLFileName } from '@queries/filenames';

/**
 * Decode Relay cursor (Base64URL) to object.
 */
function decodeCursor<T = unknown>(cursor: string): T {
  const normalized = cursor.replace(/-/g, '+').replace(/_/g, '/');
  const json = Buffer.from(normalized, 'base64').toString('utf8');
  return JSON.parse(json) as T;
}

export type SeekValue = { field: string; direction: string; value: unknown };

/** Order direction for the new API format */
export type OrderDirection = 'asc' | 'desc' | 'ASC' | 'DESC';

/** Single order by input */
export interface OrderByInput<TField extends string = string> {
  field: TField;
  direction: OrderDirection;
}

/** Connection edge with generic node type */
export interface ConnectionEdge<TNode> {
  cursor: string;
  node: TNode;
}

/** Standard Relay-style connection */
export interface Connection<TNode> {
  edges: ConnectionEdge<TNode>[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string | null;
    endCursor?: string | null;
  };
  totalCount?: number;
}

/** Configuration for a single sort test case */
export interface SortTestCase<TNode extends { id: string }, TField extends string = string> {
  /** Display name for the test */
  name: string;
  /** Order by configuration */
  orderBy: OrderByInput<TField>[];
  /** Function to sort expected items in the correct order */
  sortExpected: (items: TNode[]) => TNode[];
}

/** Configuration for a single filter test case */
export interface FilterTestCase<TNode> {
  /** Display name for the test */
  name: string;
  /** Where filter to apply */
  where: Record<string, unknown>;
  /** Function to filter expected items */
  filterExpected: (items: TNode[]) => TNode[];
}

interface ConnectionPaginationTestParams<
  TNode extends { id: string },
  TField extends string = string,
> {
  /** GraphQL file name to execute (e.g. `inventory/WarehouseFindMany`). */
  queryName: GraphQLFileName;

  /** Name for the test suite */
  suiteName: string;

  /** Function to create test data and return expected items */
  prepare: (api: ApiFixtures['api']) => Promise<{
    /** Expected items (will be sorted according to each test case) */
    expectedItems: TNode[];
    /** Base variables to always include in queries */
    baseVariables?: Record<string, unknown>;
    /** Where filter to isolate test data */
    whereFilter?: Record<string, unknown>;
  }>;

  /** Sort test cases to run */
  sortCases: SortTestCase<TNode, TField>[];

  /** Filter test cases to run (optional) */
  filterCases?: FilterTestCase<TNode>[];

  /** Extract connection from raw GraphQL response */
  getConnection: (data: Record<string, unknown>) => Connection<TNode>;

  /** Extract identifying value from node for assertions (defaults to node.id) */
  getNodeIdentifier?: (node: TNode) => string;

  /** Page size for pagination tests (defaults to 2) */
  pageSize?: number;

  /** API client method to use: 'admin' or 'client' (defaults to 'admin') */
  apiClient?: 'admin' | 'client';

  /** Whether to skip cursor structure validation (defaults to false) */
  skipCursorValidation?: boolean;

  /** Extract raw ID from node for ID-based filtering (defaults to node.id, use for global ID -> raw UUID conversion) */
  getRawId?: (node: TNode) => string;
}

/**
 * Creates cursor pagination tests for the new API format with orderBy array and where filters.
 *
 * This builder supports the new GraphQL API pattern:
 * - `orderBy: [{ field: 'code', order: 'asc' }]` instead of `sort` enum
 * - `where: { code: { _startsWith: 'PREFIX' } }` for filtering
 * - Standard Relay cursor pagination with `first/after/last/before`
 */
export function createConnectionPaginationTests<
  TNode extends { id: string },
  TField extends string = string,
>(params: ConnectionPaginationTestParams<TNode, TField>): void {
  const {
    queryName,
    suiteName,
    prepare,
    sortCases,
    filterCases = [],
    getConnection,
    getNodeIdentifier = (node) => node.id,
    getRawId = (node) => node.id,
    pageSize = 2,
    apiClient = 'admin',
    skipCursorValidation = false,
  } = params;

  const getApi = (api: ApiFixtures['api']) =>
    apiClient === 'admin' ? api.admin : api.client;

  test.describe(suiteName, () => {
    for (const sortCase of sortCases) {
      test.describe(`orderBy: ${sortCase.name}`, () => {
        test('forward pagination with first/after', async ({ api }) => {
          const { expectedItems, baseVariables = {}, whereFilter } = await prepare(api);
          const sortedItems = sortCase.sortExpected(expectedItems);

          // First page
          const { data: page1 } = await getApi(api).query(queryName, {
            variables: {
              ...baseVariables,
              first: pageSize,
              orderBy: sortCase.orderBy,
              ...(whereFilter && { where: whereFilter }),
            },
          });

          const conn1 = getConnection(page1 as Record<string, unknown>);
          expect(conn1.edges).toHaveLength(pageSize);
          expect(conn1.pageInfo.hasNextPage).toBe(true);
          expect(conn1.pageInfo.hasPreviousPage).toBe(false);

          // Verify first page items
          for (let i = 0; i < pageSize; i++) {
            expect(getNodeIdentifier(conn1.edges[i].node)).toBe(getNodeIdentifier(sortedItems[i]));
          }

          // Second page using after cursor
          const afterCursor = conn1.pageInfo.endCursor;
          const { data: page2 } = await getApi(api).query(queryName, {
            variables: {
              ...baseVariables,
              first: pageSize,
              after: afterCursor,
              orderBy: sortCase.orderBy,
              ...(whereFilter && { where: whereFilter }),
            },
          });

          const conn2 = getConnection(page2 as Record<string, unknown>);
          expect(conn2.edges).toHaveLength(pageSize);
          expect(conn2.pageInfo.hasPreviousPage).toBe(true);

          // Verify second page items (no overlap with first page)
          for (let i = 0; i < pageSize; i++) {
            expect(getNodeIdentifier(conn2.edges[i].node)).toBe(
              getNodeIdentifier(sortedItems[pageSize + i]),
            );
          }
        });

        test('backward pagination with last/before', async ({ api }) => {
          const { expectedItems, baseVariables = {}, whereFilter } = await prepare(api);
          const sortedItems = sortCase.sortExpected(expectedItems);

          // Last page
          const { data: lastPageData } = await getApi(api).query(queryName, {
            variables: {
              ...baseVariables,
              last: pageSize,
              orderBy: sortCase.orderBy,
              ...(whereFilter && { where: whereFilter }),
            },
          });

          const lastConn = getConnection(lastPageData as Record<string, unknown>);
          expect(lastConn.edges).toHaveLength(pageSize);
          expect(lastConn.pageInfo.hasPreviousPage).toBe(true);

          // Verify last page items
          const lastPageStart = sortedItems.length - pageSize;
          for (let i = 0; i < pageSize; i++) {
            expect(getNodeIdentifier(lastConn.edges[i].node)).toBe(
              getNodeIdentifier(sortedItems[lastPageStart + i]),
            );
          }

          // Previous page using before cursor
          const beforeCursor = lastConn.pageInfo.startCursor;
          const { data: prevPageData } = await getApi(api).query(queryName, {
            variables: {
              ...baseVariables,
              last: pageSize,
              before: beforeCursor,
              orderBy: sortCase.orderBy,
              ...(whereFilter && { where: whereFilter }),
            },
          });

          const prevConn = getConnection(prevPageData as Record<string, unknown>);
          expect(prevConn.edges).toHaveLength(pageSize);

          // Verify previous page items
          const prevPageStart = sortedItems.length - pageSize * 2;
          for (let i = 0; i < pageSize; i++) {
            expect(getNodeIdentifier(prevConn.edges[i].node)).toBe(
              getNodeIdentifier(sortedItems[prevPageStart + i]),
            );
          }
        });

        test('arbitrary cursor navigation', async ({ api }) => {
          const { expectedItems, baseVariables = {}, whereFilter } = await prepare(api);
          const sortedItems = sortCase.sortExpected(expectedItems);

          // Fetch all items to get arbitrary cursor
          const { data: fullData } = await getApi(api).query(queryName, {
            variables: {
              ...baseVariables,
              first: sortedItems.length,
              orderBy: sortCase.orderBy,
              ...(whereFilter && { where: whereFilter }),
            },
          });

          const fullConn = getConnection(fullData as Record<string, unknown>);
          expect(fullConn.edges.length).toBe(sortedItems.length);

          // Use cursor from second item
          const arbitraryCursor = fullConn.edges[1].cursor;

          const { data: afterData } = await getApi(api).query(queryName, {
            variables: {
              ...baseVariables,
              first: pageSize,
              after: arbitraryCursor,
              orderBy: sortCase.orderBy,
              ...(whereFilter && { where: whereFilter }),
            },
          });

          const afterConn = getConnection(afterData as Record<string, unknown>);
          expect(afterConn.edges).toHaveLength(pageSize);

          // Should start from third item (index 2)
          for (let i = 0; i < pageSize; i++) {
            expect(getNodeIdentifier(afterConn.edges[i].node)).toBe(
              getNodeIdentifier(sortedItems[2 + i]),
            );
          }
        });
      });
    }
  });

  // Cursor structure validation tests
  if (!skipCursorValidation) {
    test.describe(`${suiteName} - cursor integrity`, () => {
      for (const sortCase of sortCases) {
        test(`cursor structure for orderBy: ${sortCase.name}`, async ({ api }) => {
          const { expectedItems, baseVariables = {}, whereFilter } = await prepare(api);
          const sortedItems = sortCase.sortExpected(expectedItems);

          const { data } = await getApi(api).query(queryName, {
            variables: {
              ...baseVariables,
              first: pageSize,
              orderBy: sortCase.orderBy,
              ...(whereFilter && { where: whereFilter }),
            },
          });

          const conn = getConnection(data as Record<string, unknown>);
          expect(conn.edges.length).toBeGreaterThan(0);

          // Decode and validate cursor structure
          const cursor = conn.edges[0].cursor;
          const decoded = decodeCursor<{ seek: SeekValue[] }>(cursor);

          expect(decoded.seek).toBeDefined();
          expect(Array.isArray(decoded.seek)).toBe(true);
          expect(decoded.seek.length).toBeGreaterThan(0);

          // First seek field should match the primary sort field
          const primarySort = sortCase.orderBy[0];
          expect(decoded.seek[0].field).toBe(primarySort.field);
          expect(decoded.seek[0].direction.toLowerCase()).toBe(primarySort.direction.toLowerCase());

          // Last seek field should be 'id' for stable pagination
          expect(decoded.seek[decoded.seek.length - 1].field.toLowerCase()).toBe('id');

          // Verify items match expected order
          for (let i = 0; i < conn.edges.length; i++) {
            expect(getNodeIdentifier(conn.edges[i].node)).toBe(getNodeIdentifier(sortedItems[i]));
          }
        });
      }
    });
  }

  // Round-trip integrity test
  test.describe(`${suiteName} - round-trip`, () => {
    for (const sortCase of sortCases) {
      test(`fetch all via cursors for orderBy: ${sortCase.name}`, async ({ api }) => {
        const { expectedItems, baseVariables = {}, whereFilter } = await prepare(api);
        const sortedItems = sortCase.sortExpected(expectedItems);

        const collectedIds: string[] = [];
        let afterCursor: string | undefined;

        // Paginate through all items
        while (true) {
          const { data } = await getApi(api).query(queryName, {
            variables: {
              ...baseVariables,
              first: pageSize,
              ...(afterCursor && { after: afterCursor }),
              orderBy: sortCase.orderBy,
              ...(whereFilter && { where: whereFilter }),
            },
          });

          const conn = getConnection(data as Record<string, unknown>);
          conn.edges.forEach((edge) => collectedIds.push(getNodeIdentifier(edge.node)));

          if (!conn.pageInfo.hasNextPage) break;
          afterCursor = conn.pageInfo.endCursor ?? undefined;
        }

        // Verify all items were collected in correct order
        expect(collectedIds).toHaveLength(sortedItems.length);
        expect(collectedIds).toEqual(sortedItems.map(getNodeIdentifier));

        // Verify no duplicates
        expect(new Set(collectedIds).size).toBe(collectedIds.length);
      });
    }
  });

  // totalCount test
  test.describe(`${suiteName} - totalCount`, () => {
    test('totalCount matches expected items', async ({ api }) => {
      const { expectedItems, baseVariables = {}, whereFilter } = await prepare(api);

      const { data } = await getApi(api).query(queryName, {
        variables: {
          ...baseVariables,
          first: 1,
          orderBy: sortCases[0].orderBy,
          ...(whereFilter && { where: whereFilter }),
        },
      });

      const conn = getConnection(data as Record<string, unknown>);
      if (conn.totalCount !== undefined) {
        expect(conn.totalCount).toBe(expectedItems.length);
      }
    });
  });

  // Filter tests
  if (filterCases.length > 0) {
    test.describe(`${suiteName} - filtering`, () => {
      for (const filterCase of filterCases) {
        test(`filter: ${filterCase.name}`, async ({ api }) => {
          const { expectedItems, baseVariables = {}, whereFilter } = await prepare(api);

          // Combine base whereFilter with test-specific filter
          const combinedWhere = whereFilter
            ? { _and: [whereFilter, filterCase.where] }
            : filterCase.where;

          const { data } = await getApi(api).query(queryName, {
            variables: {
              ...baseVariables,
              first: expectedItems.length,
              orderBy: sortCases[0].orderBy,
              where: combinedWhere,
            },
          });

          const conn = getConnection(data as Record<string, unknown>);
          const filteredExpected = filterCase.filterExpected(expectedItems);

          expect(conn.edges).toHaveLength(filteredExpected.length);

          if (filteredExpected.length > 0) {
            const returnedIds = conn.edges.map((e) => getNodeIdentifier(e.node));
            const expectedIds = filteredExpected.map(getNodeIdentifier);
            expect(returnedIds.sort()).toEqual(expectedIds.sort());
          }
        });
      }
    });
  }

  // Edge cases
  test.describe(`${suiteName} - edge cases`, () => {
    test('empty results with non-matching filter', async ({ api }) => {
      const { baseVariables = {}, whereFilter } = await prepare(api);

      // Use a filter that matches nothing
      const emptyFilter = whereFilter
        ? { _and: [whereFilter, { id: { _eq: '00000000-0000-0000-0000-000000000000' } }] }
        : { id: { _eq: '00000000-0000-0000-0000-000000000000' } };

      const { data } = await getApi(api).query(queryName, {
        variables: {
          ...baseVariables,
          first: pageSize,
          orderBy: sortCases[0].orderBy,
          where: emptyFilter,
        },
      });

      const conn = getConnection(data as Record<string, unknown>);
      expect(conn.edges).toHaveLength(0);
      expect(conn.pageInfo.hasNextPage).toBe(false);
      expect(conn.pageInfo.hasPreviousPage).toBe(false);
      expect(conn.pageInfo.startCursor).toBeNull();
      expect(conn.pageInfo.endCursor).toBeNull();
    });

    // @deprecated
    test.skip('single item result', async ({ api }) => {
      const { expectedItems, baseVariables = {}, whereFilter } = await prepare(api);
      const sortedItems = sortCases[0].sortExpected(expectedItems);

      // Filter to get only the first item (using raw ID for database filtering)
      const rawId = getRawId(sortedItems[0]);
      const singleItemFilter = whereFilter
        ? { _and: [whereFilter, { id: { _eq: rawId } }] }
        : { id: { _eq: rawId } };

      const { data } = await getApi(api).query(queryName, {
        variables: {
          ...baseVariables,
          first: pageSize,
          orderBy: sortCases[0].orderBy,
          where: singleItemFilter,
        },
      });

      const conn = getConnection(data as Record<string, unknown>);
      expect(conn.edges).toHaveLength(1);
      expect(conn.pageInfo.hasNextPage).toBe(false);
      expect(conn.pageInfo.hasPreviousPage).toBe(false);
      expect(getNodeIdentifier(conn.edges[0].node)).toBe(getNodeIdentifier(sortedItems[0]));
    });

    test('first page has hasPreviousPage false', async ({ api }) => {
      const { baseVariables = {}, whereFilter } = await prepare(api);

      const { data } = await getApi(api).query(queryName, {
        variables: {
          ...baseVariables,
          first: pageSize,
          orderBy: sortCases[0].orderBy,
          ...(whereFilter && { where: whereFilter }),
        },
      });

      const conn = getConnection(data as Record<string, unknown>);
      expect(conn.pageInfo.hasPreviousPage).toBe(false);
    });

    test('last page has hasNextPage false', async ({ api }) => {
      const { baseVariables = {}, whereFilter } = await prepare(api);

      const { data } = await getApi(api).query(queryName, {
        variables: {
          ...baseVariables,
          last: pageSize,
          orderBy: sortCases[0].orderBy,
          ...(whereFilter && { where: whereFilter }),
        },
      });

      const conn = getConnection(data as Record<string, unknown>);
      expect(conn.pageInfo.hasNextPage).toBe(false);
    });

    test('request more items than exist', async ({ api }) => {
      const { expectedItems, baseVariables = {}, whereFilter } = await prepare(api);
      const sortedItems = sortCases[0].sortExpected(expectedItems);

      const { data } = await getApi(api).query(queryName, {
        variables: {
          ...baseVariables,
          first: sortedItems.length + 100,
          orderBy: sortCases[0].orderBy,
          ...(whereFilter && { where: whereFilter }),
        },
      });

      const conn = getConnection(data as Record<string, unknown>);
      expect(conn.edges).toHaveLength(sortedItems.length);
      expect(conn.pageInfo.hasNextPage).toBe(false);
    });

    test('bidirectional navigation from middle cursor', async ({ api }) => {
      const { expectedItems, baseVariables = {}, whereFilter } = await prepare(api);
      const sortedItems = sortCases[0].sortExpected(expectedItems);

      // Get all items to find middle cursor
      const { data: fullData } = await getApi(api).query(queryName, {
        variables: {
          ...baseVariables,
          first: sortedItems.length,
          orderBy: sortCases[0].orderBy,
          ...(whereFilter && { where: whereFilter }),
        },
      });

      const fullConn = getConnection(fullData as Record<string, unknown>);
      const middleIndex = Math.floor(sortedItems.length / 2);
      const middleCursor = fullConn.edges[middleIndex].cursor;

      // Navigate forward from middle
      const { data: forwardData } = await getApi(api).query(queryName, {
        variables: {
          ...baseVariables,
          first: pageSize,
          after: middleCursor,
          orderBy: sortCases[0].orderBy,
          ...(whereFilter && { where: whereFilter }),
        },
      });

      const forwardConn = getConnection(forwardData as Record<string, unknown>);
      expect(forwardConn.edges.length).toBeGreaterThan(0);
      expect(getNodeIdentifier(forwardConn.edges[0].node)).toBe(
        getNodeIdentifier(sortedItems[middleIndex + 1]),
      );

      // Navigate backward from middle
      const { data: backwardData } = await getApi(api).query(queryName, {
        variables: {
          ...baseVariables,
          last: pageSize,
          before: middleCursor,
          orderBy: sortCases[0].orderBy,
          ...(whereFilter && { where: whereFilter }),
        },
      });

      const backwardConn = getConnection(backwardData as Record<string, unknown>);
      expect(backwardConn.edges.length).toBeGreaterThan(0);
      // Last item of backward results should be right before middle
      const lastBackwardItem = backwardConn.edges[backwardConn.edges.length - 1];
      expect(getNodeIdentifier(lastBackwardItem.node)).toBe(
        getNodeIdentifier(sortedItems[middleIndex - 1]),
      );
    });

    test('full forward then backward traversal with cursor consistency', async ({ api }) => {
      const { expectedItems, baseVariables = {}, whereFilter } = await prepare(api);
      const sortedItems = sortCases[0].sortExpected(expectedItems);
      const expectedPageCount = Math.ceil(sortedItems.length / pageSize);

      // === FORWARD PAGINATION ===
      const forwardPages: Array<{
        items: string[];
        startCursor: string | null;
        endCursor: string | null;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
      }> = [];

      let afterCursor: string | undefined;
      let forwardPageNum = 0;

      while (true) {
        const { data } = await getApi(api).query(queryName, {
          variables: {
            ...baseVariables,
            first: pageSize,
            ...(afterCursor && { after: afterCursor }),
            orderBy: sortCases[0].orderBy,
            ...(whereFilter && { where: whereFilter }),
          },
        });

        const conn = getConnection(data as Record<string, unknown>);
        forwardPageNum++;

        forwardPages.push({
          items: conn.edges.map((e) => getNodeIdentifier(e.node)),
          startCursor: conn.pageInfo.startCursor ?? null,
          endCursor: conn.pageInfo.endCursor ?? null,
          hasNextPage: conn.pageInfo.hasNextPage,
          hasPreviousPage: conn.pageInfo.hasPreviousPage,
        });

        // First page should have hasPreviousPage = false
        if (forwardPageNum === 1) {
          expect(conn.pageInfo.hasPreviousPage).toBe(false);
        } else {
          expect(conn.pageInfo.hasPreviousPage).toBe(true);
        }

        if (!conn.pageInfo.hasNextPage) {
          break;
        }

        afterCursor = conn.pageInfo.endCursor ?? undefined;

        // Safety limit
        if (forwardPageNum > expectedPageCount + 1) {
          throw new Error('Forward pagination exceeded expected page count');
        }
      }

      // Verify we got expected number of pages
      expect(forwardPages.length).toBe(expectedPageCount);

      // Last page should have hasNextPage = false
      expect(forwardPages[forwardPages.length - 1].hasNextPage).toBe(false);

      // Collect all forward items
      const allForwardItems = forwardPages.flatMap((p) => p.items);
      expect(allForwardItems).toHaveLength(sortedItems.length);

      // === BACKWARD PAGINATION ===
      const backwardPages: Array<{
        items: string[];
        startCursor: string | null;
        endCursor: string | null;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
      }> = [];

      let beforeCursor: string | undefined;
      let backwardPageNum = 0;

      while (true) {
        const { data } = await getApi(api).query(queryName, {
          variables: {
            ...baseVariables,
            last: pageSize,
            ...(beforeCursor && { before: beforeCursor }),
            orderBy: sortCases[0].orderBy,
            ...(whereFilter && { where: whereFilter }),
          },
        });

        const conn = getConnection(data as Record<string, unknown>);
        backwardPageNum++;

        backwardPages.unshift({
          items: conn.edges.map((e) => getNodeIdentifier(e.node)),
          startCursor: conn.pageInfo.startCursor ?? null,
          endCursor: conn.pageInfo.endCursor ?? null,
          hasNextPage: conn.pageInfo.hasNextPage,
          hasPreviousPage: conn.pageInfo.hasPreviousPage,
        });

        // Last page (first fetched in backward) should have hasNextPage = false
        if (backwardPageNum === 1) {
          expect(conn.pageInfo.hasNextPage).toBe(false);
        } else {
          expect(conn.pageInfo.hasNextPage).toBe(true);
        }

        if (!conn.pageInfo.hasPreviousPage) {
          break;
        }

        beforeCursor = conn.pageInfo.startCursor ?? undefined;

        // Safety limit
        if (backwardPageNum > expectedPageCount + 1) {
          throw new Error('Backward pagination exceeded expected page count');
        }
      }

      // Verify we got expected number of pages
      expect(backwardPages.length).toBe(expectedPageCount);

      // First page should have hasPreviousPage = false
      expect(backwardPages[0].hasPreviousPage).toBe(false);

      // Collect all backward items
      const allBackwardItems = backwardPages.flatMap((p) => p.items);
      expect(allBackwardItems).toHaveLength(sortedItems.length);

      // === CURSOR CONSISTENCY ===
      // First cursor from forward should match first cursor from backward traversal
      expect(forwardPages[0].startCursor).toBe(backwardPages[0].startCursor);

      // Last cursor from forward should match last cursor from backward traversal
      expect(forwardPages[forwardPages.length - 1].endCursor).toBe(
        backwardPages[backwardPages.length - 1].endCursor,
      );

      // All items should match in same order
      expect(allForwardItems).toEqual(allBackwardItems);
    });

    test('tie-breaker ensures stable pagination with duplicate sort values', async ({ api }) => {
      const { expectedItems, baseVariables = {}, whereFilter } = await prepare(api);
      const sortedItems = sortCases[0].sortExpected(expectedItems);

      // Collect all IDs through pagination
      const collectedIds: string[] = [];
      let afterCursor: string | undefined;

      while (true) {
        const { data } = await getApi(api).query(queryName, {
          variables: {
            ...baseVariables,
            first: 1, // Small page size to test tie-breaker
            ...(afterCursor && { after: afterCursor }),
            orderBy: sortCases[0].orderBy,
            ...(whereFilter && { where: whereFilter }),
          },
        });

        const conn = getConnection(data as Record<string, unknown>);
        conn.edges.forEach((edge) => collectedIds.push(getNodeIdentifier(edge.node)));

        if (!conn.pageInfo.hasNextPage) break;
        afterCursor = conn.pageInfo.endCursor ?? undefined;
      }

      // No duplicates should exist
      expect(new Set(collectedIds).size).toBe(collectedIds.length);
      // All items should be collected
      expect(collectedIds).toHaveLength(sortedItems.length);
    });
  });
}
