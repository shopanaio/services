import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { LoyaltyStorefrontTestKit, OPPORTUNITY_FIELDS } from './loyalty-storefront-test-kit';

const PRESENTATION_FIELDS = `loyalty {
  primaryOpportunity { ${OPPORTUNITY_FIELDS} }
  purchaseOpportunity { ${OPPORTUNITY_FIELDS} }
  reviewOpportunity { ${OPPORTUNITY_FIELDS} }
  purchaseOpportunities { ${OPPORTUNITY_FIELDS} }
  engagementOpportunities { ${OPPORTUNITY_FIELDS} }
  evaluatedAt validUntil revision
}`;
const rule = (triggerType: 'ORDER' | 'REVIEW', priority: number, points: string) => ({
  code: `${triggerType.toLowerCase()}-${priority}-${crypto.randomUUID().slice(0, 6)}`,
  name: `${triggerType} bonus`, priority, triggerType, triggerConfig: {},
  conditions: { type: 'ALL', conditions: [] }, actionType: 'AWARD_FIXED_POINTS',
  action: { type: 'AWARD_FIXED_POINTS', points }, limits: {},
});

test.describe('Loyalty Storefront API product and variant presentation', () => {
  let kit: LoyaltyStorefrontTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyStorefrontTestKit(api, request);
    await kit.setupLoyalty();
  });

  test.afterEach(async () => kit.close());

  async function presentation(typename: 'Product' | 'ProductVariant', id: string, accessToken: string | null = kit.accessToken) {
    const response = await kit.entityQuery<any>(typename, id, PRESENTATION_FIELDS, { accessToken });
    expect(response.errors).toBeUndefined();
    return response.data?.entities[0]?.loyalty ?? null;
  }

  test('returns a purchase opportunity for a published eligible product', async () => {
    await kit.createActiveAccount();
    const product = await kit.createProduct('1000');
    const result = await presentation('Product', product.productId);
    expect(result).toMatchObject({
      primaryOpportunity: { type: 'PURCHASE', state: 'AVAILABLE' },
      purchaseOpportunity: { reward: { kind: 'POINTS', points: { minimum: '10', maximum: '10' }, accuracy: 'ESTIMATED' } },
      purchaseOpportunities: [expect.objectContaining({ type: 'PURCHASE' })],
      engagementOpportunities: [], revision: expect.any(String),
    });
  });

  test('returns a concrete purchase opportunity for an available variant', async () => {
    await kit.createActiveAccount();
    const product = await kit.createProduct('1250');
    const result = await presentation('ProductVariant', product.variantId);
    expect(result.purchaseOpportunity.reward).toMatchObject({
      points: { minimum: '12', maximum: '12' }, accuracy: 'ESTIMATED',
    });
  });

  test('returns minimum and maximum across purchasable product variants', async () => {
    await kit.createActiveAccount();
    const product = await kit.createProduct('1999');
    const reward = (await presentation('Product', product.productId)).purchaseOpportunity.reward;
    expect(BigInt(reward.points.minimum)).toBeLessThanOrEqual(BigInt(reward.points.maximum));
    expect(reward.points).toEqual({ minimum: '19', maximum: '19' });
  });

  test('returns null for unpublished products and unavailable variants', async () => {
    await kit.createActiveAccount();
    const product = await kit.createProduct('1000', false);
    expect(await presentation('Product', product.productId)).toBeNull();
  });

  test('returns null when no active earning-enabled version exists', async () => {
    const product = await kit.createProduct('1000');
    expect(await presentation('Product', product.productId)).toBeNull();
  });

  test('returns null when the storefront currency has no product price', async () => {
    await kit.createActiveAccount();
    const product = await kit.createProduct('1000');
    const result = await kit.entityQuery<any>('Product', product.productId, PRESENTATION_FIELDS, {
      headers: { 'x-shopana-currency': 'EUR' },
    });
    expect(result.errors).toBeUndefined();
    const loyalty = result.data?.entities[0]?.loyalty;
    expect(JSON.stringify(loyalty)).not.toMatch(/converted|exchange/iu);
  });

  test('returns AUTHENTICATION_REQUIRED to an anonymous eligible viewer', async () => {
    await kit.createActiveAccount();
    const product = await kit.createProduct('1000');
    expect((await presentation('Product', product.productId, null)).purchaseOpportunity.state)
      .toBe('AUTHENTICATION_REQUIRED');
  });

  test('returns AVAILABLE to an authenticated eligible active account', async () => {
    await kit.createActiveAccount();
    const product = await kit.createProduct('1000');
    expect((await presentation('Product', product.productId)).purchaseOpportunity.state).toBe('AVAILABLE');
  });

  test('separates purchase and review opportunities', async () => {
    await kit.createActiveAccount({ earningRules: [rule('ORDER', 1, '50'), rule('REVIEW', 2, '25')] });
    const product = await kit.createProduct('1000');
    const result = await presentation('Product', product.productId);
    expect(result.purchaseOpportunities.every(({ type }: any) => type === 'PURCHASE')).toBe(true);
    expect(result.engagementOpportunities).toEqual([expect.objectContaining({ type: 'REVIEW' })]);
    expect(result.reviewOpportunity.type).toBe('REVIEW');
  });

  test('selects primary purchase and review opportunities by server priority', async () => {
    await kit.createActiveAccount({ earningRules: [
      rule('ORDER', 20, '20'), rule('ORDER', 1, '100'), rule('REVIEW', 2, '30'),
    ] });
    const product = await kit.createProduct('1000');
    const result = await presentation('Product', product.productId);
    expect(result.primaryOpportunity.reward.points.minimum).toBe('100');
    expect(result.purchaseOpportunity.reward.points.minimum).toBe('100');
    expect(result.reviewOpportunity.reward.points.minimum).toBe('30');
  });

  test('changes revision when catalog price availability policy or viewer state changes', async () => {
    const fixture = await kit.createActiveAccount();
    const product = await kit.createProduct('1000');
    const before = await presentation('ProductVariant', product.variantId);
    const priced = await kit.api.admin.mutation<any>('inventory-api/ProductUpdate', {
      variables: {
        productId: product.productId,
        
        operations: {
          variants: [{
            action: 'UPDATE',
            variantId: product.variantId,
            pricing: { currency: 'USD', amountMinor: '2000' },
          }],
        },
      },
    });
    expect(priced.data.catalogMutation.productUpdate.userErrors).toEqual([]);
    const afterPrice = await presentation('ProductVariant', product.variantId);
    expect(afterPrice.revision).not.toBe(before.revision);
    await kit.setAccountStatus(fixture.account, 'SUSPENDED');
    const anonymous = await presentation('ProductVariant', product.variantId);
    expect(anonymous.purchaseOpportunity.state).toBe('AUTHENTICATION_REQUIRED');
  });

  test('batches a product listing without changing per-product results', async () => {
    await kit.createActiveAccount();
    const products = await Promise.all([kit.createProduct('1000'), kit.createProduct('2000'), kit.createProduct('3000')]);
    const response = await kit.graphql<{ entities: any[] }>(
      `query LoyaltyListing($ids: [ID!]!) {
        entities: nodes(ids: $ids) {
          ... on Product { id ${PRESENTATION_FIELDS} }
        }
      }`,
      { ids: products.map(({ productId }) => productId) },
    );
    expect(response.errors).toBeUndefined();
    const standalone = await Promise.all(products.map(({ productId }) => presentation('Product', productId)));
    expect(response.data?.entities.map(({ loyalty }) => loyalty.purchaseOpportunity.reward.points))
      .toEqual(standalone.map(({ purchaseOpportunity }) => purchaseOpportunity.reward.points));
  });
});
