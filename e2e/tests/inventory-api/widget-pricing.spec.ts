import { randomUUID } from 'node:crypto';
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import type { ApiFixtures } from '@fixtures/api/api';
import type { ApiVariantPrice } from '@codegen/admin-gql';

test.describe('Pricing Widget API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  async function createProductWithVariant(api: ApiFixtures['api'], title = 'Widget Pricing Product') {
    const handle = `${title.toLowerCase().replace(/\s+/g, '-')}-${randomUUID().slice(0, 8)}`;
    const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
      variables: { input: { title, handle } },
    });

    const product = data.inventoryMutation.productCreate.product;
    const variantEdges = product?.variants?.edges ?? [];
    const variantId = variantEdges[0]?.node?.id ?? null;

    return { product, variantId };
  }

  const assertHistoryNode = (node: ApiVariantPrice) => {
    expect(node.id).toBeTruthy();
    expect(node.currency).toBe('UAH');
    expect(typeof node.amountMinor).toBe('number');
    expect(typeof node.isCurrent).toBe('boolean');
    expect(typeof node.recordedAt).toBe('string');
    expect(typeof node.effectiveFrom).toBe('string');
    expect(node.compareAtMinor === null || typeof node.compareAtMinor === 'number').toBe(true);
    expect(node.effectiveTo === null || typeof node.effectiveTo === 'string').toBe(true);
  };

  test('should return full pricing widget payload', async ({ api }) => {
    const { variantId } = await createProductWithVariant(api);

    if (!variantId) {
      test.skip();
      return;
    }

    await api.admin.mutation('inventory-api/VariantSetPricing', {
      variables: {
        input: {
          variantId,
          currency: 'UAH',
          amountMinor: '10000',
          compareAtMinor: '12000',
        },
      },
    });

    await api.admin.mutation('inventory-api/VariantSetPricing', {
      variables: {
        input: {
          variantId,
          currency: 'UAH',
          amountMinor: '15000',
          compareAtMinor: '20000',
        },
      },
    });

    await api.admin.mutation('inventory-api/VariantSetCost', {
      variables: {
        input: {
          variantId,
          currency: 'UAH',
          unitCostMinor: '5000',
        },
      },
    });

    const { data } = await api.admin.query('inventory-api/WidgetPricing', {
      variables: {
        input: {
          variantId,
          currency: 'UAH',
        },
      },
    });

    const widget = data.widgetQuery.pricing;
    expect(widget).toBeTruthy();
    expect(widget.currentPrice).toBeTruthy();
    expect(widget.currentPrice?.id).toBeTruthy();
    expect(widget.currentPrice?.currency).toBe('UAH');
    expect(widget.currentPrice?.amountMinor).toBe(15000);
    expect(widget.currentPrice?.compareAtMinor).toBe(20000);
    expect(widget.currentCostPrice).toBeTruthy();
    expect(widget.currentCostPrice?.id).toBeTruthy();
    expect(widget.currentCostPrice?.currency).toBe('UAH');
    expect(widget.currentCostPrice?.unitCostMinor).toBe(5000);
    expect(widget.currentCostPrice?.isCurrent).toBe(true);
    expect(widget.history.edges.length).toBeGreaterThanOrEqual(2);
    expect(widget.history.totalCount).toBe(widget.history.edges.length);
    expect(widget.history.pageInfo.hasNextPage).toBe(false);
    expect(widget.history.pageInfo.hasPreviousPage).toBe(false);
    expect(widget.history.pageInfo.startCursor).toBeTruthy();
    expect(widget.history.pageInfo.endCursor).toBeTruthy();

    const historyNodes = widget.history.edges.map((edge) => edge.node);
    const currentHistory = historyNodes.find((node) => node.isCurrent);

    expect(historyNodes.length).toBeGreaterThanOrEqual(2);
    expect(historyNodes.every((node) => node.currency === 'UAH')).toBe(true);
    expect(historyNodes.every((node) => typeof node.amountMinor === 'number')).toBe(true);
    expect(historyNodes.every((node) => typeof node.isCurrent === 'boolean')).toBe(true);
    expect(historyNodes.every((node) => typeof node.recordedAt === 'string')).toBe(true);
    expect(historyNodes.every((node) => typeof node.effectiveFrom === 'string')).toBe(true);
    expect(
      historyNodes.every(
        (node) => node.compareAtMinor === null || typeof node.compareAtMinor === 'number',
      ),
    ).toBe(true);
    expect(
      historyNodes.every((node) => node.effectiveTo === null || typeof node.effectiveTo === 'string'),
    ).toBe(true);
    expect(currentHistory?.effectiveTo ?? null).toBeNull();
    expect(currentHistory?.amountMinor).toBe(15000);
    expect(currentHistory?.compareAtMinor).toBe(20000);

    expect(widget.statistics.currency).toBe('UAH');
    expect(widget.statistics.minPriceMinor).toBe(10000);
    expect(widget.statistics.maxPriceMinor).toBe(15000);
    expect(widget.statistics.avgPriceMinor).toBe(12500);
  });

  test('should paginate pricing history with date range', async ({ api }) => {
    const { variantId } = await createProductWithVariant(api);

    if (!variantId) {
      test.skip();
      return;
    }

    await api.admin.mutation('inventory-api/VariantSetPricing', {
      variables: {
        input: {
          variantId,
          currency: 'UAH',
          amountMinor: '10000',
        },
      },
    });

    await api.admin.mutation('inventory-api/VariantSetPricing', {
      variables: {
        input: {
          variantId,
          currency: 'UAH',
          amountMinor: '12000',
        },
      },
    });

    await api.admin.mutation('inventory-api/VariantSetPricing', {
      variables: {
        input: {
          variantId,
          currency: 'UAH',
          amountMinor: '15000',
          compareAtMinor: '18000',
        },
      },
    });

    await api.admin.mutation('inventory-api/VariantSetCost', {
      variables: {
        input: {
          variantId,
          currency: 'UAH',
          unitCostMinor: '6000',
        },
      },
    });

    const now = new Date();
    const from = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const to = new Date(now.getTime() + 60 * 1000).toISOString();
    const baseInput = { variantId, currency: 'UAH', from, to, first: 1 };

    const { data: pageOneData } = await api.admin.query('inventory-api/WidgetPricing', {
      variables: { input: baseInput },
    });

    const pageOneWidget = pageOneData.widgetQuery.pricing;
    const pageOneHistory = pageOneWidget.history;

    expect(pageOneWidget.currentPrice?.amountMinor).toBe(15000);
    expect(pageOneWidget.currentPrice?.compareAtMinor).toBe(18000);
    expect(pageOneWidget.currentCostPrice?.unitCostMinor).toBe(6000);
    expect(pageOneWidget.statistics.currency).toBe('UAH');
    expect(pageOneWidget.statistics.minPriceMinor).toBe(10000);
    expect(pageOneWidget.statistics.maxPriceMinor).toBe(15000);
    expect(pageOneWidget.statistics.avgPriceMinor).toBe(12333);

    expect(pageOneHistory.edges).toHaveLength(1);
    expect(pageOneHistory.totalCount).toBe(1);
    expect(pageOneHistory.pageInfo.hasNextPage).toBe(true);
    expect(pageOneHistory.pageInfo.hasPreviousPage).toBe(false);
    expect(pageOneHistory.pageInfo.startCursor).toBeTruthy();
    expect(pageOneHistory.pageInfo.endCursor).toBeTruthy();
    expect(pageOneHistory.edges[0].node.amountMinor).toBe(15000);
    assertHistoryNode(pageOneHistory.edges[0].node);

    const pageOneCursor = pageOneHistory.pageInfo.endCursor;

    const { data: pageTwoData } = await api.admin.query('inventory-api/WidgetPricing', {
      variables: { input: { ...baseInput, after: pageOneCursor } },
    });

    const pageTwoHistory = pageTwoData.widgetQuery.pricing.history;
    expect(pageTwoHistory.edges).toHaveLength(1);
    expect(pageTwoHistory.totalCount).toBe(1);
    expect(pageTwoHistory.pageInfo.hasNextPage).toBe(true);
    expect(pageTwoHistory.pageInfo.hasPreviousPage).toBe(true);
    expect(pageTwoHistory.pageInfo.startCursor).toBeTruthy();
    expect(pageTwoHistory.pageInfo.endCursor).toBeTruthy();
    expect(pageTwoHistory.edges[0].node.amountMinor).toBe(12000);
    assertHistoryNode(pageTwoHistory.edges[0].node);

    const pageTwoCursor = pageTwoHistory.pageInfo.endCursor;

    const { data: pageThreeData } = await api.admin.query('inventory-api/WidgetPricing', {
      variables: { input: { ...baseInput, after: pageTwoCursor } },
    });

    const pageThreeHistory = pageThreeData.widgetQuery.pricing.history;
    expect(pageThreeHistory.edges).toHaveLength(1);
    expect(pageThreeHistory.totalCount).toBe(1);
    expect(pageThreeHistory.pageInfo.hasNextPage).toBe(false);
    expect(pageThreeHistory.pageInfo.hasPreviousPage).toBe(true);
    expect(pageThreeHistory.pageInfo.startCursor).toBeTruthy();
    expect(pageThreeHistory.pageInfo.endCursor).toBeTruthy();
    expect(pageThreeHistory.edges[0].node.amountMinor).toBe(10000);
    assertHistoryNode(pageThreeHistory.edges[0].node);
  });

  test('should return empty pricing widget when no prices set', async ({ api }) => {
    const { variantId } = await createProductWithVariant(api);

    if (!variantId) {
      test.skip();
      return;
    }

    const { data } = await api.admin.query('inventory-api/WidgetPricing', {
      variables: {
        input: {
          variantId,
          currency: 'UAH',
        },
      },
    });

    const widget = data.widgetQuery.pricing;
    expect(widget).toBeTruthy();
    expect(widget.currentPrice).toBeNull();
    expect(widget.currentCostPrice).toBeNull();
    expect(widget.history.edges).toHaveLength(0);
    expect(widget.history.totalCount).toBe(0);
    expect(widget.history.pageInfo.hasNextPage).toBe(false);
    expect(widget.history.pageInfo.hasPreviousPage).toBe(false);
    expect(widget.statistics.currency).toBe('UAH');
    expect(widget.statistics.minPriceMinor).toBe(0);
    expect(widget.statistics.maxPriceMinor).toBe(0);
    expect(widget.statistics.avgPriceMinor).toBe(0);
  });

  test('should track price history with correct effectiveTo timestamps and multi-currency support', async ({
    api,
  }) => {
    const { variantId } = await createProductWithVariant(api);

    if (!variantId) {
      test.skip();
      return;
    }

    // Set initial UAH price
    await api.admin.mutation('inventory-api/VariantSetPricing', {
      variables: {
        input: { variantId, currency: 'UAH', amountMinor: '10000' },
      },
    });

    // Set USD price (different currency - should not affect UAH history)
    await api.admin.mutation('inventory-api/VariantSetPricing', {
      variables: {
        input: { variantId, currency: 'USD', amountMinor: '500' },
      },
    });

    // Update UAH price - should close previous UAH price
    await api.admin.mutation('inventory-api/VariantSetPricing', {
      variables: {
        input: { variantId, currency: 'UAH', amountMinor: '12000', compareAtMinor: '15000' },
      },
    });

    // Set UAH cost
    await api.admin.mutation('inventory-api/VariantSetCost', {
      variables: {
        input: { variantId, currency: 'UAH', unitCostMinor: '4000' },
      },
    });

    // Update UAH price again
    await api.admin.mutation('inventory-api/VariantSetPricing', {
      variables: {
        input: { variantId, currency: 'UAH', amountMinor: '11000' },
      },
    });

    // Update USD price
    await api.admin.mutation('inventory-api/VariantSetPricing', {
      variables: {
        input: { variantId, currency: 'USD', amountMinor: '450', compareAtMinor: '600' },
      },
    });

    // Final UAH price with compare-at
    await api.admin.mutation('inventory-api/VariantSetPricing', {
      variables: {
        input: { variantId, currency: 'UAH', amountMinor: '9500', compareAtMinor: '12000' },
      },
    });

    // Query UAH pricing widget
    const { data: uahData } = await api.admin.query('inventory-api/WidgetPricing', {
      variables: {
        input: { variantId, currency: 'UAH' },
      },
    });

    const uahWidget = uahData.widgetQuery.pricing;

    // Current price should be the latest UAH price
    expect(uahWidget.currentPrice?.amountMinor).toBe(9500);
    expect(uahWidget.currentPrice?.compareAtMinor).toBe(12000);
    expect(uahWidget.currentCostPrice?.unitCostMinor).toBe(4000);

    // UAH history should have 4 entries (10000 -> 12000 -> 11000 -> 9500)
    expect(uahWidget.history.edges).toHaveLength(4);

    const uahHistory = uahWidget.history.edges.map((e) => e.node);

    // History should be sorted by effectiveFrom DESC (newest first)
    expect(uahHistory[0].amountMinor).toBe(9500);
    expect(uahHistory[1].amountMinor).toBe(11000);
    expect(uahHistory[2].amountMinor).toBe(12000);
    expect(uahHistory[3].amountMinor).toBe(10000);

    // Only the current price should have effectiveTo = null
    expect(uahHistory[0].isCurrent).toBe(true);
    expect(uahHistory[0].effectiveTo).toBeNull();

    // All previous prices should have effectiveTo set
    expect(uahHistory[1].isCurrent).toBe(false);
    expect(uahHistory[1].effectiveTo).not.toBeNull();
    expect(uahHistory[2].isCurrent).toBe(false);
    expect(uahHistory[2].effectiveTo).not.toBeNull();
    expect(uahHistory[3].isCurrent).toBe(false);
    expect(uahHistory[3].effectiveTo).not.toBeNull();

    // Verify effectiveTo timestamps are chronologically ordered
    const effectiveToTimestamps = uahHistory
      .slice(1)
      .filter((h): h is ApiVariantPrice & { effectiveTo: string } => h.effectiveTo !== null)
      .map((h) => new Date(h.effectiveTo).getTime());
    for (let i = 0; i < effectiveToTimestamps.length - 1; i++) {
      expect(effectiveToTimestamps[i]).toBeGreaterThanOrEqual(effectiveToTimestamps[i + 1]);
    }

    // Statistics should reflect all UAH prices
    expect(uahWidget.statistics.currency).toBe('UAH');
    expect(uahWidget.statistics.minPriceMinor).toBe(9500);
    expect(uahWidget.statistics.maxPriceMinor).toBe(12000);
    // avg = (10000 + 12000 + 11000 + 9500) / 4 = 10625
    expect(uahWidget.statistics.avgPriceMinor).toBe(10625);

    // Query USD pricing widget - should be independent
    const { data: usdData } = await api.admin.query('inventory-api/WidgetPricing', {
      variables: {
        input: { variantId, currency: 'USD' },
      },
    });

    const usdWidget = usdData.widgetQuery.pricing;

    // USD should have its own independent history
    expect(usdWidget.currentPrice?.amountMinor).toBe(450);
    expect(usdWidget.currentPrice?.compareAtMinor).toBe(600);
    expect(usdWidget.currentCostPrice).toBeNull(); // No USD cost was set

    // USD history should have 2 entries
    expect(usdWidget.history.edges).toHaveLength(2);

    const usdHistory = usdWidget.history.edges.map((e) => e.node);
    expect(usdHistory[0].amountMinor).toBe(450);
    expect(usdHistory[0].isCurrent).toBe(true);
    expect(usdHistory[1].amountMinor).toBe(500);
    expect(usdHistory[1].isCurrent).toBe(false);

    // USD statistics
    expect(usdWidget.statistics.currency).toBe('USD');
    expect(usdWidget.statistics.minPriceMinor).toBe(450);
    expect(usdWidget.statistics.maxPriceMinor).toBe(500);
    expect(usdWidget.statistics.avgPriceMinor).toBe(475);
  });
});
