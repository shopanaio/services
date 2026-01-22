import { randomUUID } from 'node:crypto';
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Pricing Widget API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  async function createProductWithVariant(api: any, title = 'Widget Pricing Product') {
    const handle = `${title.toLowerCase().replace(/\s+/g, '-')}-${randomUUID().slice(0, 8)}`;
    const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
      variables: { input: { title, handle } },
    });

    const product = data.inventoryMutation.productCreate.product;
    const variantEdges = product?.variants?.edges ?? [];
    const variantId = variantEdges[0]?.node?.id ?? null;

    return { product, variantId };
  }

  const assertHistoryNode = (node: any) => {
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
});
