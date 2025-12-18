/* eslint-disable @typescript-eslint/no-explicit-any */
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

export type SeekValue = { field: string; order: string; value: unknown };

interface CursorTestBuilderParams<TSort extends string> {
  /** GraphQL file name to execute via `api.client.query()` (e.g. `client/Categories`). */
  queryName: GraphQLFileName;
  /** Function to create test data and return expected list of titles (already sorted ASC by default) */
  prepare: (api: ApiFixtures['api']) => Promise<{
    expectedTitles: string[];
    /** Any base variables that should always be sent along with the query (e.g. a category handle). */
    baseVariables?: Record<string, unknown>;
  }>;
  /** List of sort enum values to iterate over. */
  sorts: readonly TSort[];
  /** Map sort enum → seek field / order descriptor (snake_case field as returned from DB). */
  sortToFieldOrder: Record<TSort, { field: string; order: 'ASC' | 'DESC' }>;
  /** Produce titles in the order they should appear for a given sort value. */
  getExpectedBySort: (titles: string[], sort: TSort) => string[];
  /** Extract connection object from raw GraphQL response data. */
  getConnection: (data: any) => {
    edges: { cursor: string; node: { title: string; [key: string]: unknown } }[];
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor?: string;
      endCursor?: string;
    };
  };
  /** Size of page for cursor pagination checks (defaults to 2). */
  pageSize?: number;
  /** Optional custom name for the outer test.describe block to avoid duplicates (e.g. "categories cursor pagination"). */
  suiteName: string;
  /** Optional function to extract seek value from a node. */
  getSeekValue?: Record<string, (node: any) => unknown>;
  /** Optional flag to skip arbitrary cursor test. */
  checkArbitraryCursor?: boolean | ((sort: TSort) => boolean);
}

/**
 * Creates a complete battery of cursor–pagination tests (forward/backward/arbitrary + round-trip integrity)
 * for the given resource.
 *
 * The function is executed at import time and registers Playwright test cases automatically.
 */
export function createCursorPaginationTests<TSort extends string>(
  params: CursorTestBuilderParams<TSort>,
): void {
  const {
    queryName,
    prepare,
    sorts,
    sortToFieldOrder,
    getExpectedBySort,
    getConnection,
    pageSize = 2,
    suiteName,
    getSeekValue,
    checkArbitraryCursor,
  } = params;

  // ------------------------------
  // Basic forward / backward / arbitrary cursor checks
  // ------------------------------
  test.describe(suiteName ?? `cursor pagination ${queryName}`, () => {
    for (const sort of sorts) {
      test.describe(`sort = ${String(sort)}`, () => {
        test('forward pagination', async ({ api }) => {
          const { expectedTitles, baseVariables = {} } = await prepare(api);
          const sortedTitles = getExpectedBySort(expectedTitles, sort);

          // page 1
          const { data: page1 } = await api.client.query(queryName, {
            variables: { ...baseVariables, first: pageSize, sort },
          });

          const connection1 = getConnection(page1);
          expect(connection1.edges).toHaveLength(pageSize);
          expect(connection1.pageInfo.hasNextPage).toBe(true);
          expect(connection1.pageInfo.hasPreviousPage).toBe(false);

          const afterCursor = connection1.pageInfo.endCursor;

          // page 2
          const { data: page2 } = await api.client.query(queryName, {
            variables: { ...baseVariables, first: pageSize, after: afterCursor, sort },
          });

          const connection2 = getConnection(page2);
          expect(connection2.edges).toHaveLength(pageSize);
          expect(connection2.pageInfo.hasNextPage).toBe(true);
          expect(connection2.pageInfo.hasPreviousPage).toBe(true);

          // Order assertions
          expect(connection1.edges[0].node.title).toBe(sortedTitles[0]);
          expect(connection2.edges[0].node.title).toBe(sortedTitles[pageSize]);
        });

        test('backward pagination', async ({ api }) => {
          const { expectedTitles, baseVariables = {} } = await prepare(api);
          const sortedTitles = getExpectedBySort(expectedTitles, sort);
          // last page
          const { data: lastPage } = await api.client.query(queryName, {
            variables: { ...baseVariables, last: pageSize, sort },
          });
          const connectionLast = getConnection(lastPage);
          expect(connectionLast.edges).toHaveLength(pageSize);

          const startCursor = connectionLast.pageInfo.startCursor;

          // previous page
          const { data: prevPage } = await api.client.query(queryName, {
            variables: { ...baseVariables, last: pageSize, before: startCursor, sort },
          });
          const connectionPrev = getConnection(prevPage);
          expect(connectionPrev.edges).toHaveLength(pageSize);

          const expectedPrev = sortedTitles.slice(-pageSize * 2, -pageSize);

          expect(connectionPrev.edges[0].node.title).toBe(expectedPrev[0]);
          if (pageSize > 1) {
            expect(connectionPrev.edges[pageSize - 1].node.title).toBe(expectedPrev[pageSize - 1]);
          }
        });

        test('arbitrary cursor', async ({ api }) => {
          const { expectedTitles, baseVariables = {} } = await prepare(api);
          const sortedTitles = getExpectedBySort(expectedTitles, sort);

          // fetch full list and pick a cursor from the second item
          const { data: list } = await api.client.query(queryName, {
            variables: { ...baseVariables, first: pageSize * 5, sort },
          });
          const connectionList = getConnection(list);
          const randomCursor = connectionList.edges[1].cursor; // cursor of the second element

          const { data } = await api.client.query(queryName, {
            variables: { ...baseVariables, first: pageSize, after: randomCursor, sort },
          });
          const connection = getConnection(data);
          expect(connection.edges).toHaveLength(pageSize);
          expect(connection.edges[0].node.title).toBe(sortedTitles[pageSize]);
          expect(connection.edges[pageSize - 1].node.title).toBe(sortedTitles[pageSize * 2 - 1]);
        });
      });
    }
  });

  // ------------------------------
  // Cursor round-trip integrity
  // ------------------------------

  test.describe(`${suiteName} round-trip integrity`, () => {
    for (const sort of sorts) {
      const skipCheckCursor =
        typeof checkArbitraryCursor === 'function' && !checkArbitraryCursor(sort);

      test(`fetch full list via cursors, sort = ${String(sort)}`, async ({ api }) => {
        const { expectedTitles, baseVariables = {} } = await prepare(api);

        const sorted =
          sortToFieldOrder[sort].order === 'ASC'
            ? [...expectedTitles]
            : [...expectedTitles].reverse();
        const collected: string[] = [];
        let after: string | undefined;

        while (true) {
          const { data } = await api.client.query(queryName, {
            variables: { ...baseVariables, first: pageSize, after, sort },
          });
          const connection = getConnection(data);
          connection.edges.forEach((edge) => collected.push(edge.node.title));

          // --- cursor validation ---
          const endCursor = connection.pageInfo.endCursor as string | undefined;
          if (endCursor) {
            const lastEdge = connection.edges[connection.edges.length - 1];
            const cp = decodeCursor<{ seek: SeekValue[] }>(endCursor);
            const { field, order } = sortToFieldOrder[sort];

            const camelCaseField = field.replace(/_(\w)/g, (_, c) => c.toUpperCase());
            expect(cp.seek[0].field).toBe(camelCaseField);
            if (skipCheckCursor) {
              return;
            }
            expect(cp.seek[0].order.toUpperCase()).toBe(order);
            expect(cp.seek[cp.seek.length - 1].field.toLowerCase()).toBe('id');

            const lastNodeValue = getSeekValue?.[camelCaseField]
              ? getSeekValue[camelCaseField](lastEdge.node)
              : (lastEdge.node as any)[camelCaseField];
            expect(cp.seek[0].value).toBe(lastNodeValue);
          }

          if (!connection.pageInfo.hasNextPage) break;
          after = endCursor;
        }

        expect(collected).toEqual(sorted);
        expect(new Set(collected).size).toBe(collected.length);
      });
    }
  });
}
