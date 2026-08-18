/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { decodeGlobalId } from '@utils/globalid';
import { idempotencyKey } from '../loyality-admin-api/helpers';
import { LoyaltyE2eTestKit } from './loyalty-e2e-test-kit';

test.describe('Loyalty checkout reward entitlements end to end', () => {
  let kit: LoyaltyE2eTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyE2eTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  async function issuedVoucher() {
    const fixture = await kit.createActiveAccount();
    const definition = fixture.version.rewardDefinitions.find(
      ({ rewardType }: any) => rewardType === 'VOUCHER',
    );
    expect(definition).toBeTruthy();
    const entitlement = await kit.issueReward(fixture.account, definition.id);
    return { fixture, definition, entitlement };
  }

  async function quoteAndReserve() {
    const issued = await issuedVoucher();
    const context = kit.checkoutContext();
    const quote = await kit.callAction('loyalty.quoteCheckoutLoyaltyReward', {
      context,
      entitlementId: decodeGlobalId(issued.entitlement.id).id,
      appliedDiscountIds: [issued.definition.configuration.externalDiscountId],
    });
    expect(quote).toMatchObject({
      status: 'QUOTED',
      quote: {
        entitlementId: decodeGlobalId(issued.entitlement.id).id,
        entitlementRevision: 1,
        rewardType: 'VOUCHER',
        pricingDiscountId: issued.definition.configuration.externalDiscountId,
      },
    });
    const reserved = await kit.callAction('loyalty.reserveCheckoutLoyaltyReward', {
      storeId: kit.realm.storeId,
      checkoutId: context.checkoutId,
      customerId: kit.customer.rawId,
      quote: quote.quote,
      reservedAt: new Date().toISOString(),
      idempotencyKey: idempotencyKey('reward-reserve'),
    });
    expect(reserved).toMatchObject({
      status: 'RESERVED',
      entitlementId: decodeGlobalId(issued.entitlement.id).id,
      entitlementRevision: 2,
    });
    return { ...issued, context, quote: quote.quote, reserved };
  }

  test('quotes reserves and commits a Pricing-backed reward', async () => {
    const { entitlement, context } = await quoteAndReserve();
    const entitlementId = decodeGlobalId(entitlement.id).id;
    const input = {
      storeId: kit.realm.storeId,
      checkoutId: context.checkoutId,
      entitlementId,
      orderId: crypto.randomUUID(),
      externalReference: 'checkout-reward-e2e',
      committedAt: new Date().toISOString(),
      idempotencyKey: idempotencyKey('reward-commit'),
    };
    expect(await kit.callAction('loyalty.commitCheckoutLoyaltyReward', input)).toMatchObject({
      status: 'COMMITTED', entitlementId, entitlementRevision: 3,
    });
    expect(await kit.callAction('loyalty.commitCheckoutLoyaltyReward', input)).toMatchObject({
      status: 'NOOP', entitlementId, entitlementRevision: 3,
    });

    const [stored] = await kit.sql<any[]>`
      select status, redeemed_order_id as "redeemedOrderId",
             external_reference as "externalReference", revision
      from loyalty.reward_entitlement where id = ${entitlementId}
    `;
    expect(stored).toMatchObject({
      status: 'REDEEMED', redeemedOrderId: input.orderId,
      externalReference: 'checkout-reward-e2e', revision: 3,
    });
  });

  test('completes checkout redemption for every Pricing-backed reward type', async () => {
    const fixture = await kit.createActiveAccount();
    const checkoutTypes = [
      'VOUCHER', 'FIXED_DISCOUNT', 'PERCENTAGE_DISCOUNT',
      'FREE_SHIPPING', 'FREE_PRODUCT',
    ];
    for (const rewardType of checkoutTypes) {
      const definition = fixture.version.rewardDefinitions.find(
        (item: any) => item.rewardType === rewardType,
      );
      const issued = await kit.issueReward(fixture.account, definition.id);
      const entitlementId = decodeGlobalId(issued.id).id;
      const context = kit.checkoutContext();
      const quoted = await kit.callAction('loyalty.quoteCheckoutLoyaltyReward', {
        context,
        entitlementId,
        appliedDiscountIds: [definition.configuration.externalDiscountId],
      });
      expect(quoted).toMatchObject({ status: 'QUOTED', quote: { rewardType } });
      expect(await kit.callAction('loyalty.reserveCheckoutLoyaltyReward', {
        storeId: kit.realm.storeId,
        checkoutId: context.checkoutId,
        customerId: kit.customer.rawId,
        quote: quoted.quote,
        reservedAt: new Date().toISOString(),
        idempotencyKey: idempotencyKey(`reserve-${rewardType.toLowerCase()}`),
      })).toMatchObject({ status: 'RESERVED', entitlementId });
      expect(await kit.callAction('loyalty.commitCheckoutLoyaltyReward', {
        storeId: kit.realm.storeId,
        checkoutId: context.checkoutId,
        entitlementId,
        orderId: crypto.randomUUID(),
        committedAt: new Date().toISOString(),
        idempotencyKey: idempotencyKey(`commit-${rewardType.toLowerCase()}`),
      })).toMatchObject({ status: 'COMMITTED', entitlementId });
    }
    const [redeemed] = await kit.sql<{ count: number }[]>`
      select count(*)::int as count from loyalty.reward_entitlement
      where account_id = ${decodeGlobalId(fixture.account.id).id} and status = 'REDEEMED'
    `;
    expect(redeemed.count).toBe(checkoutTypes.length);
  });

  test('releases a reservation and allows the entitlement to be quoted again', async () => {
    const { definition, entitlement, context } = await quoteAndReserve();
    const entitlementId = decodeGlobalId(entitlement.id).id;
    const input = {
      storeId: kit.realm.storeId,
      checkoutId: context.checkoutId,
      entitlementId,
      releasedAt: new Date().toISOString(),
      idempotencyKey: idempotencyKey('reward-release'),
    };
    expect(await kit.callAction('loyalty.releaseCheckoutLoyaltyReward', input)).toMatchObject({
      status: 'RELEASED', entitlementId, entitlementRevision: 3,
    });
    expect(await kit.callAction('loyalty.releaseCheckoutLoyaltyReward', input)).toMatchObject({
      status: 'NOOP', entitlementId, entitlementRevision: 3,
    });
    expect(await kit.callAction('loyalty.quoteCheckoutLoyaltyReward', {
      context: kit.checkoutContext(),
      entitlementId,
      appliedDiscountIds: [definition.configuration.externalDiscountId],
    })).toMatchObject({ status: 'QUOTED', quote: { entitlementRevision: 3 } });
  });

  test('rejects absent Pricing application, non-checkout rewards and another customer', async () => {
    const { fixture, entitlement } = await issuedVoucher();
    const entitlementId = decodeGlobalId(entitlement.id).id;
    expect(await kit.callAction('loyalty.quoteCheckoutLoyaltyReward', {
      context: kit.checkoutContext(), entitlementId, appliedDiscountIds: [],
    })).toMatchObject({ status: 'REJECTED', code: 'REWARD_DISCOUNT_NOT_APPLIED' });

    for (const rewardType of ['POINTS', 'MONETARY_CREDIT', 'MEMBER_BENEFIT']) {
      const nonCheckoutDefinition = fixture.version.rewardDefinitions.find(
        (item: any) => item.rewardType === rewardType,
      );
      const nonCheckout = await kit.issueReward(fixture.account, nonCheckoutDefinition.id);
      expect(await kit.callAction('loyalty.quoteCheckoutLoyaltyReward', {
        context: kit.checkoutContext(),
        entitlementId: decodeGlobalId(nonCheckout.id).id,
        appliedDiscountIds: [],
      })).toMatchObject({ status: 'REJECTED', code: 'REWARD_NOT_CHECKOUT_APPLICABLE' });
    }

    const definition = fixture.version.rewardDefinitions.find(
      ({ rewardType }: any) => rewardType === 'VOUCHER',
    );
    expect(await kit.callAction('loyalty.quoteCheckoutLoyaltyReward', {
      context: kit.checkoutContext({ customerId: crypto.randomUUID() }),
      entitlementId,
      appliedDiscountIds: [definition.configuration.externalDiscountId],
    })).toMatchObject({ status: 'REJECTED', code: 'ENTITLEMENT_CUSTOMER_MISMATCH' });
  });

  test('rejects stale reservation data and a checkout mismatch without changing state', async () => {
    const { entitlement, context, quote } = await quoteAndReserve();
    const entitlementId = decodeGlobalId(entitlement.id).id;
    expect(await kit.callAction('loyalty.reserveCheckoutLoyaltyReward', {
      storeId: kit.realm.storeId,
      checkoutId: context.checkoutId,
      customerId: kit.customer.rawId,
      quote,
      reservedAt: new Date().toISOString(),
      idempotencyKey: idempotencyKey('stale-reward-reserve'),
    })).toMatchObject({ status: 'REJECTED' });
    expect(await kit.callAction('loyalty.commitCheckoutLoyaltyReward', {
      storeId: kit.realm.storeId,
      checkoutId: crypto.randomUUID(),
      entitlementId,
      orderId: crypto.randomUUID(),
      committedAt: new Date().toISOString(),
      idempotencyKey: idempotencyKey('mismatched-reward-commit'),
    })).toMatchObject({ status: 'REJECTED', code: 'CHECKOUT_MISMATCH' });
    const [stored] = await kit.sql<any[]>`
      select status, revision from loyalty.reward_entitlement where id = ${entitlementId}
    `;
    expect(stored).toEqual({ status: 'RESERVED', revision: 2 });
  });
});
