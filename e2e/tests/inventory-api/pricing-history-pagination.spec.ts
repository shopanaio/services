import { randomUUID } from 'node:crypto';
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import type { ApiFixtures } from '@fixtures/api/api';
import type { ApiVariantPrice } from '@codegen/admin-gql';

/**
 * Decode Relay cursor (Base64URL) to object.
 */
function decodeCursor<T = unknown>(cursor: string): T {
  const normalized = cursor.replace(/-/g, '+').replace(/_/g, '/');
  const json = Buffer.from(normalized, 'base64').toString('utf8');
  return JSON.parse(json) as T;
}

interface PriceHistoryConnection {
  edges: Array<{ cursor: string; node: ApiVariantPrice }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
  totalCount: number;
}

test.describe('Pricing History Cursor Pagination', () => {
  const PAGE_SIZE = 2;
  const TOTAL_PRICES = 5;

  async function createProductWithVariant(api: ApiFixtures['api']) {
    const handle = `pricing-pagination-${randomUUID().slice(0, 8)}`;
    const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
      variables: { input: { title: 'Pagination Test Product', handle } },
    });

    const product = data.catalogMutation.productCreate.product;
    const variantId = product?.variants?.edges[0]?.node?.id ?? null;

    return { product, variantId };
  }

  async function createPriceHistory(
    api: ApiFixtures['api'],
    variantId: string,
    count: number,
  ): Promise<number[]> {
    const amounts: number[] = [];

    for (let i = 0; i < count; i++) {
      const amountMinor = (i + 1) * 1000;
      amounts.push(amountMinor);

      await api.admin.mutation('inventory-api/VariantSetPricing', {
        variables: {
          input: {
            variantId,
            currency: 'UAH',
            amountMinor: String(amountMinor),
            compareAtMinor: String(amountMinor + 500),
          },
        },
      });
    }

    // Return amounts in expected order (newest first = DESC by effectiveFrom)
    return amounts.reverse();
  }

  async function fetchHistoryPage(
    api: ApiFixtures['api'],
    variantId: string,
    options: { first?: number; after?: string; from?: string; to?: string } = {},
  ): Promise<PriceHistoryConnection> {
    const now = new Date();
    const from = options.from ?? new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const to = options.to ?? new Date(now.getTime() + 60 * 1000).toISOString();

    const { data } = await api.admin.query('inventory-api/WidgetPricing', {
      variables: {
        input: {
          variantId,
          currency: 'UAH',
          from,
          to,
          first: options.first ?? PAGE_SIZE,
          ...(options.after && { after: options.after }),
        },
      },
    });

    return data.widgetQuery.pricing.history;
  }

  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  test.describe('forward pagination (first/after)', () => {
    test('should paginate through all items', async ({ api }) => {
      const { variantId } = await createProductWithVariant(api);
      if (!variantId) {
        test.skip();
        return;
      }

      const expectedAmounts = await createPriceHistory(api, variantId, TOTAL_PRICES);

      // Page 1
      const page1 = await fetchHistoryPage(api, variantId, { first: PAGE_SIZE });

      expect(page1.edges).toHaveLength(PAGE_SIZE);
      expect(page1.pageInfo.hasNextPage).toBe(true);
      expect(page1.pageInfo.hasPreviousPage).toBe(false);
      expect(page1.edges[0].node.amountMinor).toBe(expectedAmounts[0]);
      expect(page1.edges[1].node.amountMinor).toBe(expectedAmounts[1]);

      // Page 2
      const page2 = await fetchHistoryPage(api, variantId, {
        first: PAGE_SIZE,
        after: page1.pageInfo.endCursor!,
      });

      expect(page2.edges).toHaveLength(PAGE_SIZE);
      expect(page2.pageInfo.hasNextPage).toBe(true);
      expect(page2.pageInfo.hasPreviousPage).toBe(true);
      expect(page2.edges[0].node.amountMinor).toBe(expectedAmounts[2]);
      expect(page2.edges[1].node.amountMinor).toBe(expectedAmounts[3]);

      // Page 3 (last page)
      const page3 = await fetchHistoryPage(api, variantId, {
        first: PAGE_SIZE,
        after: page2.pageInfo.endCursor!,
      });

      expect(page3.edges).toHaveLength(1);
      expect(page3.pageInfo.hasNextPage).toBe(false);
      expect(page3.pageInfo.hasPreviousPage).toBe(true);
      expect(page3.edges[0].node.amountMinor).toBe(expectedAmounts[4]);
    });

    test('should collect all items via cursor without duplicates', async ({ api }) => {
      const { variantId } = await createProductWithVariant(api);
      if (!variantId) {
        test.skip();
        return;
      }

      const expectedAmounts = await createPriceHistory(api, variantId, TOTAL_PRICES);

      const collectedAmounts: number[] = [];
      const collectedIds: string[] = [];
      let afterCursor: string | undefined;

      while (true) {
        const page = await fetchHistoryPage(api, variantId, {
          first: PAGE_SIZE,
          after: afterCursor,
        });

        page.edges.forEach((edge) => {
          collectedAmounts.push(edge.node.amountMinor);
          collectedIds.push(edge.node.id);
        });

        if (!page.pageInfo.hasNextPage) break;
        afterCursor = page.pageInfo.endCursor ?? undefined;
      }

      expect(collectedAmounts).toEqual(expectedAmounts);
      expect(new Set(collectedIds).size).toBe(collectedIds.length);
    });
  });

  test.describe('totalCount', () => {
    test('should return correct totalCount on each page', async ({ api }) => {
      const { variantId } = await createProductWithVariant(api);
      if (!variantId) {
        test.skip();
        return;
      }

      await createPriceHistory(api, variantId, TOTAL_PRICES);

      // Page 1
      const page1 = await fetchHistoryPage(api, variantId, { first: PAGE_SIZE });
      expect(page1.totalCount).toBe(PAGE_SIZE);

      // Page 2
      const page2 = await fetchHistoryPage(api, variantId, {
        first: PAGE_SIZE,
        after: page1.pageInfo.endCursor!,
      });
      expect(page2.totalCount).toBe(PAGE_SIZE);

      // Page 3 (last)
      const page3 = await fetchHistoryPage(api, variantId, {
        first: PAGE_SIZE,
        after: page2.pageInfo.endCursor!,
      });
      expect(page3.totalCount).toBe(1);
    });
  });

  test.describe('cursor structure', () => {
    test('should have valid cursor structure with effectiveFrom field', async ({ api }) => {
      const { variantId } = await createProductWithVariant(api);
      if (!variantId) {
        test.skip();
        return;
      }

      await createPriceHistory(api, variantId, 3);

      const page = await fetchHistoryPage(api, variantId, { first: PAGE_SIZE });

      expect(page.edges.length).toBeGreaterThan(0);

      const cursor = page.edges[0].cursor;
      const decoded = decodeCursor<{
        seek: Array<{ field: string; direction: string; value: unknown }>;
      }>(cursor);

      expect(decoded.seek).toBeDefined();
      expect(Array.isArray(decoded.seek)).toBe(true);
      expect(decoded.seek.length).toBeGreaterThan(0);

      // Primary sort field should be effectiveFrom
      expect(decoded.seek[0].field).toBe('effectiveFrom');
      expect(decoded.seek[0].direction.toLowerCase()).toBe('desc');

      // Last seek field should be 'id' for stable pagination
      expect(decoded.seek[decoded.seek.length - 1].field.toLowerCase()).toBe('id');
    });
  });

  test.describe('arbitrary cursor navigation', () => {
    test('should navigate from arbitrary cursor position', async ({ api }) => {
      const { variantId } = await createProductWithVariant(api);
      if (!variantId) {
        test.skip();
        return;
      }

      const expectedAmounts = await createPriceHistory(api, variantId, TOTAL_PRICES);

      // Fetch all items to get arbitrary cursor
      const fullPage = await fetchHistoryPage(api, variantId, { first: TOTAL_PRICES });
      expect(fullPage.edges.length).toBe(TOTAL_PRICES);

      // Use cursor from second item
      const arbitraryCursor = fullPage.edges[1].cursor;

      const afterPage = await fetchHistoryPage(api, variantId, {
        first: PAGE_SIZE,
        after: arbitraryCursor,
      });

      expect(afterPage.edges).toHaveLength(PAGE_SIZE);
      // Should start from third item (index 2)
      expect(afterPage.edges[0].node.amountMinor).toBe(expectedAmounts[2]);
      expect(afterPage.edges[1].node.amountMinor).toBe(expectedAmounts[3]);
    });
  });

  test.describe('edge cases', () => {
    test('should handle empty results', async ({ api }) => {
      const { variantId } = await createProductWithVariant(api);
      if (!variantId) {
        test.skip();
        return;
      }

      // Query without creating any prices
      const page = await fetchHistoryPage(api, variantId, { first: PAGE_SIZE });

      expect(page.edges).toHaveLength(0);
      expect(page.totalCount).toBe(0);
      expect(page.pageInfo.hasNextPage).toBe(false);
      expect(page.pageInfo.hasPreviousPage).toBe(false);
      expect(page.pageInfo.startCursor).toBeNull();
      expect(page.pageInfo.endCursor).toBeNull();
    });

    test('should handle single item result', async ({ api }) => {
      const { variantId } = await createProductWithVariant(api);
      if (!variantId) {
        test.skip();
        return;
      }

      await createPriceHistory(api, variantId, 1);

      const page = await fetchHistoryPage(api, variantId, { first: PAGE_SIZE });

      expect(page.edges).toHaveLength(1);
      expect(page.totalCount).toBe(1);
      expect(page.pageInfo.hasNextPage).toBe(false);
      expect(page.pageInfo.hasPreviousPage).toBe(false);
      expect(page.pageInfo.startCursor).toBeTruthy();
      expect(page.pageInfo.endCursor).toBeTruthy();
    });

    test('should handle request for more items than exist', async ({ api }) => {
      const { variantId } = await createProductWithVariant(api);
      if (!variantId) {
        test.skip();
        return;
      }

      const count = 3;
      await createPriceHistory(api, variantId, count);

      const page = await fetchHistoryPage(api, variantId, { first: count + 100 });

      expect(page.edges).toHaveLength(count);
      expect(page.pageInfo.hasNextPage).toBe(false);
    });

    test('first page should have hasPreviousPage false', async ({ api }) => {
      const { variantId } = await createProductWithVariant(api);
      if (!variantId) {
        test.skip();
        return;
      }

      await createPriceHistory(api, variantId, TOTAL_PRICES);

      const page = await fetchHistoryPage(api, variantId, { first: PAGE_SIZE });

      expect(page.pageInfo.hasPreviousPage).toBe(false);
    });

    test('last page should have hasNextPage false', async ({ api }) => {
      const { variantId } = await createProductWithVariant(api);
      if (!variantId) {
        test.skip();
        return;
      }

      await createPriceHistory(api, variantId, TOTAL_PRICES);

      // Navigate to last page
      let afterCursor: string | undefined;
      let lastPage: PriceHistoryConnection | undefined;

      while (true) {
        const page = await fetchHistoryPage(api, variantId, {
          first: PAGE_SIZE,
          after: afterCursor,
        });

        if (!page.pageInfo.hasNextPage) {
          lastPage = page;
          break;
        }

        afterCursor = page.pageInfo.endCursor ?? undefined;
      }

      expect(lastPage).toBeDefined();
      expect(lastPage!.pageInfo.hasNextPage).toBe(false);
    });
  });

  test.describe('date range filtering', () => {
    test('should filter history by date range', async ({ api }) => {
      const { variantId } = await createProductWithVariant(api);
      if (!variantId) {
        test.skip();
        return;
      }

      await createPriceHistory(api, variantId, TOTAL_PRICES);

      // Use a date range in the past (no items should match)
      const pastFrom = new Date('2020-01-01').toISOString();
      const pastTo = new Date('2020-01-02').toISOString();

      const page = await fetchHistoryPage(api, variantId, {
        first: PAGE_SIZE,
        from: pastFrom,
        to: pastTo,
      });

      expect(page.edges).toHaveLength(0);
      expect(page.totalCount).toBe(0);
    });
  });

  test.describe('tie-breaker stability', () => {
    test('should maintain stable pagination with page size 1', async ({ api }) => {
      const { variantId } = await createProductWithVariant(api);
      if (!variantId) {
        test.skip();
        return;
      }

      const expectedAmounts = await createPriceHistory(api, variantId, TOTAL_PRICES);

      const collectedAmounts: number[] = [];
      const collectedIds: string[] = [];
      let afterCursor: string | undefined;

      // Paginate with page size 1 to test tie-breaker
      while (true) {
        const page = await fetchHistoryPage(api, variantId, {
          first: 1,
          after: afterCursor,
        });

        page.edges.forEach((edge) => {
          collectedAmounts.push(edge.node.amountMinor);
          collectedIds.push(edge.node.id);
        });

        if (!page.pageInfo.hasNextPage) break;
        afterCursor = page.pageInfo.endCursor ?? undefined;
      }

      expect(collectedAmounts).toEqual(expectedAmounts);
      expect(new Set(collectedIds).size).toBe(collectedIds.length);
    });
  });
});
