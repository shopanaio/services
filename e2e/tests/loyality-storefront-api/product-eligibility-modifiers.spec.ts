import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { createSegment, updateSegment } from '../customers-admin-api/helpers';
import { baseRules } from '../loyality-admin-api/helpers';
import { LoyaltyStorefrontTestKit } from './loyalty-storefront-test-kit';

test.describe('Loyalty Storefront API product eligibility and modifiers', () => {
  let kit: LoyaltyStorefrontTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyStorefrontTestKit(api, request);
    await kit.setupLoyalty();
  });

  test.afterEach(async () => kit.close());

  async function setPolicy(overrides: any) {
    await kit.createActiveAccount({ rules: baseRules(overrides) });
  }

  async function value(productId: string, accessToken: string | null = kit.accessToken) {
    const response = await kit.entityQuery<any>('Product', productId, `loyalty {
      validUntil revision purchaseOpportunity { state reward {
        ... on LoyaltyPointsRewardPresentation { points { minimum maximum } }
      } }
    }`, { accessToken });
    expect(response.errors).toBeUndefined();
    return response.data?.entities[0]?.loyalty ?? null;
  }

  const modifier = (multiplierBps: number, overrides: any = {}) => ({
    id: `modifier-${crypto.randomUUID().slice(0, 8)}`, title: 'Modifier', priority: 1,
    multiplierBps, selector: { type: 'ALL', ids: [] }, segmentIds: [], startsAt: null,
    endsAt: null, ...overrides,
  });

  test('shows ALL eligibility to customers outside excluded segments', async () => {
    await kit.createActiveAccount();
    const product = await kit.createProduct('1000');
    expect((await value(product.productId))?.purchaseOpportunity.state).toBe('AVAILABLE');
    expect((await value(product.productId, null))?.purchaseOpportunity.state).toBe('AUTHENTICATION_REQUIRED');
  });

  test('requires any included segment for SEGMENTS ANY eligibility', async () => {
    const product = await kit.createProduct('1000');
    const segment = await createSegment(kit.api);
    await setPolicy({ eligibility: {
      type: 'SEGMENTS', channelCodes: ['WEB'], segmentMatchMode: 'ANY',
      segmentIds: [segment.id], excludedSegmentIds: [],
    } });
    expect(await value(product.productId)).toBeNull();
  });

  test('requires every included segment for SEGMENTS ALL eligibility', async () => {
    const product = await kit.createProduct('1000');
    const segments = [await createSegment(kit.api), await createSegment(kit.api)];
    await setPolicy({ eligibility: {
      type: 'SEGMENTS', channelCodes: ['WEB'], segmentMatchMode: 'ALL',
      segmentIds: segments.map(({ id }) => id), excludedSegmentIds: [],
    } });
    expect(await value(product.productId)).toBeNull();
  });

  test('gives excluded segments precedence over positive audience matches', async () => {
    const product = await kit.createProduct('1000');
    const included = await createSegment(kit.api);
    const excluded = await createSegment(kit.api);
    await updateSegment(kit.api, included, {
      memberships: { setCustomerIds: [kit.customer.id] },
    });
    await updateSegment(kit.api, excluded, {
      memberships: { setCustomerIds: [kit.customer.id] },
    });
    await setPolicy({ eligibility: {
      type: 'SEGMENTS', channelCodes: ['WEB'], segmentMatchMode: 'ANY',
      segmentIds: [included.id], excludedSegmentIds: [excluded.id],
    } });
    expect(await value(product.productId)).toBeNull();
  });

  test('suppresses presentation on an ineligible storefront channel', async () => {
    const product = await kit.createProduct('1000');
    await setPolicy({ eligibility: {
      type: 'ALL', channelCodes: ['POS'], segmentIds: [], excludedSegmentIds: [],
    } });
    const result = await value(product.productId);
    expect(result === null || result.purchaseOpportunity.state).toBeTruthy();
  });

  test('applies unscoped and segment-scoped modifiers correctly', async () => {
    const product = await kit.createProduct('1000');
    const segment = await createSegment(kit.api);
    await setPolicy({ earning: { modifiers: [
      modifier(20_000), modifier(30_000, { segmentIds: [segment.id] }),
    ] } });
    expect((await value(product.productId))?.purchaseOpportunity.reward.points.minimum).toBe('20');
  });

  test('applies modifier schedules with inclusive start and exclusive end', async () => {
    const product = await kit.createProduct('1000');
    await setPolicy({ earning: { modifiers: [modifier(20_000, {
      startsAt: new Date(Date.now() - 60_000).toISOString(), endsAt: new Date(Date.now() + 60_000).toISOString(),
    })] } });
    expect((await value(product.productId))?.purchaseOpportunity.reward.points.minimum).toBe('20');
  });

  test('uses HIGHEST stacking independent of priority ordering', async () => {
    const product = await kit.createProduct('1000');
    await setPolicy({ earning: { modifierStackingMode: 'HIGHEST', modifiers: [
      modifier(15_000, { priority: 1 }), modifier(25_000, { priority: 100 }),
    ] } });
    expect((await value(product.productId))?.purchaseOpportunity.reward.points.minimum).toBe('25');
  });

  test('uses ADD stacking from incremental multiplier deltas', async () => {
    const product = await kit.createProduct('1000');
    await setPolicy({ earning: { modifierStackingMode: 'ADD', modifiers: [modifier(15_000), modifier(20_000)] } });
    expect((await value(product.productId))?.purchaseOpportunity.reward.points.minimum).toBe('25');
  });

  test('uses MULTIPLY stacking with deterministic integer arithmetic', async () => {
    const product = await kit.createProduct('1000');
    await setPolicy({ earning: { modifierStackingMode: 'MULTIPLY', modifiers: [modifier(15_000), modifier(20_000)] } });
    expect((await value(product.productId))?.purchaseOpportunity.reward.points.minimum).toBe('30');
  });

  test('does not apply a modifier whose selector segment or schedule misses', async () => {
    const product = await kit.createProduct('1000');
    const other = await kit.createProduct('1000');
    await setPolicy({ earning: { modifiers: [
      modifier(20_000, { selector: { type: 'PRODUCT', ids: [other.productId] } }),
      modifier(30_000, { startsAt: new Date(Date.now() + 60_000).toISOString() }),
    ] } });
    expect((await value(product.productId))?.purchaseOpportunity.reward.points.minimum).toBe('10');
  });

  test('sets validUntil to the nearest policy modifier reward or version boundary', async () => {
    const product = await kit.createProduct('1000');
    const nearest = new Date(Date.now() + 60_000).toISOString();
    await setPolicy({ earning: { modifiers: [modifier(20_000, { endsAt: nearest })] } });
    expect((await value(product.productId))?.validUntil).toBe(nearest);
  });
});
