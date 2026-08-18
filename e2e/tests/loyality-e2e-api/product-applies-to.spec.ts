/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { decodeGlobalId } from '@utils/globalid';
import {
  baseRules, createProgram, expectUserError, requestVersionCreate, versionInput,
} from '../loyality-admin-api/helpers';
import { LoyaltyE2eTestKit } from './loyalty-e2e-test-kit';

test.describe('Loyalty product applies-to across Admin and Storefront', () => {
  let kit: LoyaltyE2eTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyE2eTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  async function points(type: 'Product' | 'ProductVariant', id: string) {
    const response = await kit.entityQuery<any>(type, id, `loyalty {
      purchaseOpportunity { reward {
        ... on LoyaltyPointsRewardPresentation { points { minimum maximum } }
      } }
    }`);
    expect(response.errors).toBeUndefined();
    return response.data?.entities[0]?.loyalty?.purchaseOpportunity?.reward?.points ?? null;
  }

  const modifier = (selector: Record<string, unknown>) => ({
    id: `modifier-${crypto.randomUUID().slice(0, 8)}`, title: 'Double', priority: 1,
    multiplierBps: 20_000, selector, segmentIds: [], startsAt: null, endsAt: null,
  });

  test('applies ALL targeting in presentation and final earning', async () => {
    const product = await kit.createProduct('1000');
    const fixture = await kit.createActiveAccount({ rules: baseRules({ earning: {
      modifiers: [modifier({ type: 'ALL', ids: [] })],
    } }) });
    expect(await points('Product', product.productId)).toEqual({ minimum: '20', maximum: '20' });
    await kit.deliverEvent(kit.orderRewardEvent({ payload: { lines: [{
      orderLineId: crypto.randomUUID(), productId: decodeGlobalId(product.productId).id,
      variantId: decodeGlobalId(product.variantId).id, categoryIds: [], tagIds: [],
      featureIds: [], optionValueIds: [], quantity: 1,
      eligibleAmountAfterProductDiscountsMinor: '1000',
      eligibleAmountAfterAllDiscountsMinor: '1000',
    }] } }));
    expect((await kit.accountBalance(fixture.account.id)).availablePoints).toBe('20');
  });

  test('applies PRODUCT and VARIANT targeting only to selected catalog entities', async () => {
    const selected = await kit.createProduct('1000');
    const other = await kit.createProduct('1000');
    await kit.createActiveAccount({ rules: baseRules({ earning: { modifiers: [
      modifier({ type: 'PRODUCT', ids: [selected.productId] }),
      modifier({ type: 'VARIANT', ids: [selected.variantId] }),
    ] } }) });
    expect((await points('Product', selected.productId))?.minimum).toBe('20');
    expect((await points('ProductVariant', selected.variantId))?.minimum).toBe('20');
    expect((await points('Product', other.productId))?.minimum).toBe('10');
  });

  test('uses union semantics for standard-earning exclusions', async () => {
    const first = await kit.createProduct('1000');
    const second = await kit.createProduct('1000');
    await kit.createActiveAccount({ rules: baseRules({ earning: { excludedSelectors: [
      { type: 'PRODUCT', ids: [first.productId] },
      { type: 'VARIANT', ids: [second.variantId] },
    ] } }) });
    expect(await points('Product', first.productId)).toBeNull();
    expect(await points('ProductVariant', second.variantId)).toBeNull();
  });

  test('rejects a selector reference unavailable in the current store', async () => {
    const product = await kit.createProduct('1000');
    const program = await createProgram(kit.api);
    const rules = baseRules({ earning: { modifiers: [
      modifier({ type: 'PRODUCT', ids: [crypto.randomUUID()] }),
    ] } });
    const { payload, errors } = await requestVersionCreate(
      kit.api,
      versionInput(program, { rules }),
    );
    expect(errors ?? []).toHaveLength(0);
    expectUserError(payload, 'STALE_PROGRAM_REFERENCE');
    await kit.createActiveAccount();
    expect(await points('Product', product.productId)).toEqual({ minimum: '10', maximum: '10' });
  });
});
