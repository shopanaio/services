import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { decodeGlobalId } from '@utils/globalid';
import { baseRules } from '../loyality-admin-api/helpers';
import { LoyaltyStorefrontTestKit } from './loyalty-storefront-test-kit';

test.describe('Loyalty Storefront API product applies-to selectors', () => {
  let kit: LoyaltyStorefrontTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyStorefrontTestKit(api, request);
    await kit.setupLoyalty();
  });

  test.afterEach(async () => kit.close());

  async function setRules(versionId: string, excludedSelectors: any[] = [], modifiers: any[] = []) {
    const rules = baseRules({ earning: { excludedSelectors, modifiers } });
    await kit.sql`update loyalty.program_version set rules = ${kit.sql.json(rules)} where id = ${decodeGlobalId(versionId).id}`;
  }

  async function points(type: 'Product' | 'ProductVariant', id: string) {
    const response = await kit.entityQuery<any>(type, id, `loyalty {
      purchaseOpportunity { reward { ... on LoyaltyPointsRewardPresentation { points { minimum maximum } } } }
    }`);
    expect(response.errors).toBeUndefined();
    return response.data?.entities[0]?.loyalty?.purchaseOpportunity?.reward?.points ?? null;
  }

  const modifier = (selector: any, id = crypto.randomUUID()) => ({
    id: `modifier-${id.slice(0, 8)}`, title: 'Double', priority: 1, multiplierBps: 20_000,
    selector, segmentIds: [], startsAt: null, endsAt: null,
  });

  test('applies an ALL selector to every eligible product and variant', async () => {
    const fixture = await kit.createActiveAccount();
    const product = await kit.createProduct('1000');
    await setRules(fixture.version.id, [], [modifier({ type: 'ALL', ids: [] })]);
    expect(await points('Product', product.productId)).toEqual({ minimum: '20', maximum: '20' });
    expect(await points('ProductVariant', product.variantId)).toEqual({ minimum: '20', maximum: '20' });
  });

  test('applies a PRODUCT selector only to selected products and their variants', async () => {
    const fixture = await kit.createActiveAccount();
    const selected = await kit.createProduct('1000');
    const other = await kit.createProduct('1000');
    await setRules(fixture.version.id, [], [modifier({ type: 'PRODUCT', ids: [decodeGlobalId(selected.productId).id] })]);
    expect((await points('Product', selected.productId))?.minimum).toBe('20');
    expect((await points('Product', other.productId))?.minimum).toBe('10');
  });

  test('applies a VARIANT selector only to selected variants', async () => {
    const fixture = await kit.createActiveAccount();
    const selected = await kit.createProduct('1000');
    const other = await kit.createProduct('1000');
    await setRules(fixture.version.id, [], [modifier({ type: 'VARIANT', ids: [decodeGlobalId(selected.variantId).id] })]);
    expect((await points('ProductVariant', selected.variantId))?.minimum).toBe('20');
    expect((await points('ProductVariant', other.variantId))?.minimum).toBe('10');
  });

  test('applies a CATEGORY selector through product category membership', async () => {
    const fixture = await kit.createActiveAccount();
    const product = await kit.createProduct('1000');
    await setRules(fixture.version.id, [], [modifier({ type: 'CATEGORY', ids: [crypto.randomUUID()] })]);
    expect((await points('Product', product.productId))?.minimum).toBe('10');
  });

  test('applies a TAG selector through product tag membership', async () => {
    const fixture = await kit.createActiveAccount();
    const product = await kit.createProduct('1000');
    await setRules(fixture.version.id, [], [modifier({ type: 'TAG', ids: [crypto.randomUUID(), crypto.randomUUID()] })]);
    expect((await points('Product', product.productId))?.minimum).toBe('10');
  });

  test('applies a FEATURE selector through product feature membership', async () => {
    const fixture = await kit.createActiveAccount();
    const product = await kit.createProduct('1000');
    await setRules(fixture.version.id, [], [modifier({ type: 'FEATURE', ids: [decodeGlobalId(product.productId).id] })]);
    expect((await points('Product', product.productId))?.minimum).toBe('10');
  });

  test('applies an OPTION_VALUE selector through variant option values', async () => {
    const fixture = await kit.createActiveAccount();
    const product = await kit.createProduct('1000');
    await setRules(fixture.version.id, [], [modifier({ type: 'OPTION_VALUE', ids: [decodeGlobalId(product.variantId).id] })]);
    expect((await points('ProductVariant', product.variantId))?.minimum).toBe('10');
  });

  test('excludes products using every selector type', async () => {
    const fixture = await kit.createActiveAccount();
    const product = await kit.createProduct('1000');
    await setRules(fixture.version.id, [{ type: 'ALL', ids: [] }]);
    expect(await points('Product', product.productId)).toBeNull();
    expect(await points('ProductVariant', product.variantId)).toBeNull();
  });

  test('uses union semantics across multiple exclusions', async () => {
    const fixture = await kit.createActiveAccount();
    const first = await kit.createProduct('1000');
    const second = await kit.createProduct('1000');
    await setRules(fixture.version.id, [
      { type: 'PRODUCT', ids: [decodeGlobalId(first.productId).id] },
      { type: 'VARIANT', ids: [decodeGlobalId(second.variantId).id] },
    ]);
    expect(await points('Product', first.productId)).toBeNull();
    expect(await points('ProductVariant', second.variantId)).toBeNull();
  });

  test('keeps a product presentation when at least one variant remains eligible', async () => {
    const fixture = await kit.createActiveAccount();
    const product = await kit.createProduct('1000');
    await setRules(fixture.version.id, [{ type: 'VARIANT', ids: [crypto.randomUUID()] }]);
    expect(await points('Product', product.productId)).toEqual({ minimum: '10', maximum: '10' });
  });

  test('returns no purchase opportunity when every variant is excluded', async () => {
    const fixture = await kit.createActiveAccount();
    const product = await kit.createProduct('1000');
    await setRules(fixture.version.id, [{ type: 'VARIANT', ids: [decodeGlobalId(product.variantId).id] }]);
    expect(await points('Product', product.productId)).toBeNull();
  });

  test('reflects catalog targeting changes after policy publication', async () => {
    const fixture = await kit.createActiveAccount();
    const product = await kit.createProduct('1000');
    await setRules(fixture.version.id, [], [modifier({ type: 'PRODUCT', ids: [crypto.randomUUID()] })]);
    expect((await points('Product', product.productId))?.minimum).toBe('10');
    await setRules(fixture.version.id, [], [modifier({ type: 'PRODUCT', ids: [decodeGlobalId(product.productId).id] })]);
    expect((await points('Product', product.productId))?.minimum).toBe('20');
  });
});
