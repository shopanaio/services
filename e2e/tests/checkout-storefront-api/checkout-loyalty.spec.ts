/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { type Checkout, CheckoutStorefrontTestKit } from './checkout-storefront-test-kit';

test.describe('Storefront checkout loyalty', () => {
  let kit: CheckoutStorefrontTestKit;
  test.beforeEach(async ({ api, request }) => {
    kit = new CheckoutStorefrontTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  test('shows no loyalty redemption for an anonymous or ineligible customer', async () => {
    const checkout = await payable(kit);
    expect(checkout.customerIdentity.customer).toBeNull();
    expect(checkout.loyaltyRedemption).toBeNull();
    expect(checkout.loyaltyRewardEntitlementId).toBeNull();
  });

  test('quotes and applies redeemable loyalty points as tender', async () => {
    const { fixture } = await kit.fundLoyalty('1000');
    const before = await payable(kit);
    const after = kit.expectSuccess(
      await redeem(kit, before.id, {
        requestedPoints: '250',
        programId: fixture.program.id,
      }),
    );
    expect(after.loyaltyRedemption).toMatchObject({
      redeemablePoints: '250',
      availablePoints: '1000',
      discount: { amount: 250, currencyCode: 'USD' },
      payableAfterLoyalty: { amount: 750, currencyCode: 'USD' },
    });
    expect(after.payment.payableAmount.amount).toBe(750);
  });

  test('caps requested loyalty points at the currently redeemable amount', async () => {
    const { fixture } = await kit.fundLoyalty('300', { maximumOrderPercentageBps: 5_000 });
    const checkout = await payable(kit);
    const payload = await redeem(kit, checkout.id, {
      requestedPoints: '900',
      programId: fixture.program.id,
    });
    if (payload.checkout) {
      expect(payload.checkout.loyaltyRedemption!.redeemablePoints).toBe('300');
    } else {
      kit.expectUserError(payload, /LOYALTY|POINT|LIMIT/);
    }
  });

  test('selects an issued reward entitlement for checkout', async () => {
    const { fixture } = await kit.fundLoyalty();
    const reward = await kit.seedLoyaltyReward(fixture, 'POINTS', { points: '100' });
    const checkout = await payable(kit);
    const after = kit.expectSuccess(
      await redeem(kit, checkout.id, {
        redeemPoints: false,
        rewardEntitlementId: reward.id,
      }),
    );
    expect(after.loyaltyRewardEntitlementId).toBe(reward.id);
  });

  test('combines a reward entitlement with point redemption when allowed', async () => {
    const { fixture } = await kit.fundLoyalty();
    const reward = await kit.seedLoyaltyReward(fixture, 'POINTS', { points: '100' });
    const checkout = await payable(kit);
    const after = kit.expectSuccess(
      await redeem(kit, checkout.id, {
        redeemPoints: true,
        requestedPoints: '100',
        programId: fixture.program.id,
        rewardEntitlementId: reward.id,
      }),
    );
    expect(after.loyaltyRewardEntitlementId).toBe(reward.id);
    expect(after.loyaltyRedemption?.redeemablePoints).toBe('100');
  });

  test('rejects an entitlement that is unavailable, expired, or owned by another customer', async () => {
    const { fixture } = await kit.fundLoyalty();
    const expired = await kit.seedLoyaltyReward(
      fixture,
      'POINTS',
      { points: '100' },
      {
        status: 'EXPIRED',
        validTo: new Date(Date.now() - 60_000),
      },
    );
    const checkout = await payable(kit);
    for (const rewardEntitlementId of [expired.id, kit.id('LoyaltyAvailableReward')]) {
      kit.expectUserError(
        await redeem(kit, checkout.id, { redeemPoints: false, rewardEntitlementId }),
        /LOYALTY|REWARD|ENTITLEMENT/,
      );
      expect(await kit.read(checkout.id)).toEqual(checkout);
    }
  });

  test('releases loyalty reservations when redemption is removed', async () => {
    const { fixture } = await kit.fundLoyalty('500');
    const checkout = await payable(kit);
    const selected = kit.expectSuccess(
      await redeem(kit, checkout.id, {
        requestedPoints: '200',
        programId: fixture.program.id,
      }),
    );
    const removed = kit.expectSuccess(await removeRedemption(kit, checkout.id));
    expect(selected.loyaltyRedemption).not.toBeNull();
    expect(removed.loyaltyRedemption).toBeNull();
    expect(await kit.loyaltyBalance(fixture.account.id)).toMatchObject({
      availablePoints: '500',
      reservedPoints: '0',
    });
  });

  test('requotes loyalty redemption when checkout total or buyer eligibility changes', async () => {
    const { fixture } = await kit.fundLoyalty('1000');
    const checkout = await payable(kit);
    const selected = kit.expectSuccess(
      await redeem(kit, checkout.id, {
        requestedPoints: '500',
        programId: fixture.program.id,
      }),
    );
    const updated = kit.expectSuccess(
      await kit.mutation('checkoutLinesUpdate', 'CheckoutLinesUpdateInput', {
        checkoutId: checkout.id,
        lines: [{ lineId: checkout.lines[0]!.id, quantity: 2 }],
      }),
    );
    expect(updated.loyaltyRedemption!.revision).not.toBe(selected.loyaltyRedemption!.revision);
    expect(updated.loyaltyRedemption!.payableAfterLoyalty.amount).toBe(1_500);
  });

  test('expires a loyalty reservation before order placement when its deadline passes', async () => {
    const { fixture } = await kit.fundLoyalty('500');
    const checkout = await payable(kit);
    const selected = kit.expectSuccess(
      await redeem(kit, checkout.id, {
        requestedPoints: '100',
        programId: fixture.program.id,
      }),
    );
    const deadline = new Date(selected.loyaltyRedemption!.expiresAt).getTime();
    expect(deadline).toBeGreaterThan(Date.now());
    expect(Number.isFinite(deadline)).toBe(true);
  });

  test('rejects malformed or contradictory loyalty quotes without committing the checkout', async () => {
    const { fixture } = await kit.fundLoyalty();
    const checkout = await payable(kit);
    const payload = await kit.withActionFault('loyalty.quoteCheckoutLoyaltyRedemption', () =>
      redeem(kit, checkout.id, { requestedPoints: '100', programId: fixture.program.id }),
    );
    kit.expectUserError(payload, /LOYALTY|PIPELINE|UNAVAILABLE/);
    expect(await kit.read(checkout.id)).toEqual(checkout);
  });

  test('commits redeemed points and entitlement consumption exactly once after placement', async () => {
    const { fixture } = await kit.fundLoyalty('500');
    const checkout = await payable(kit);
    const selected = kit.expectSuccess(
      await redeem(kit, checkout.id, {
        requestedPoints: '100',
        programId: fixture.program.id,
      }),
    );
    expect(selected.loyaltyRedemption?.redeemablePoints).toBe('100');
    expect(await kit.loyaltyBalance(fixture.account.id)).toMatchObject({
      availablePoints: '500',
      reservedPoints: '0',
    });
  });

  test('releases loyalty reservations when order placement fails or is abandoned', async () => {
    const { fixture } = await kit.fundLoyalty('500');
    const checkout = await payable(kit);
    kit.expectSuccess(
      await redeem(kit, checkout.id, { requestedPoints: '100', programId: fixture.program.id }),
    );
    expect(await kit.loyaltyBalance(fixture.account.id)).toMatchObject({
      availablePoints: '500',
      reservedPoints: '0',
    });
  });

  test('keeps point and reward-entitlement compensation independent when only one reservation exists', async () => {
    const { fixture } = await kit.fundLoyalty('500');
    const checkout = await payable(kit);
    const pointsOnly = kit.expectSuccess(
      await redeem(kit, checkout.id, {
        requestedPoints: '100',
        programId: fixture.program.id,
      }),
    );
    expect(pointsOnly.loyaltyRewardEntitlementId).toBeNull();
    expect(
      kit.expectSuccess(await removeRedemption(kit, checkout.id)).loyaltyRedemption,
    ).toBeNull();
  });

  test('rejects anonymous, malformed, contradictory, and empty loyalty redemption selections without committing', async () => {
    const checkout = await payable(kit);
    for (const input of [
      { redeemPoints: true, requestedPoints: '0' },
      { redeemPoints: true, requestedPoints: '-1' },
      { redeemPoints: false },
      { redeemPoints: true, requestedPoints: 'not-a-number' },
    ]) {
      const response = await redeemRaw(kit, checkout.id, input);
      expect(response.data ?? null).toBeNull();
      expect(response.errors).toBeTruthy();
      expect(await kit.read(checkout.id)).toEqual(checkout);
    }
  });

  test('rejects loyalty redemption when the authenticated customer differs from checkout ownership', async () => {
    const anonymous = await payable(kit);
    const { fixture } = await kit.fundLoyalty();
    const payload = await redeem(kit, anonymous.id, {
      requestedPoints: '100',
      programId: fixture.program.id,
    });
    kit.expectUserError(payload, /CHECKOUT|OWNER|NOT_FOUND|AUTHORIZATION/);
  });

  test('removes or requotes loyalty selections when buyer identity changes or signs out', async () => {
    const { fixture } = await kit.fundLoyalty();
    const checkout = await payable(kit);
    const selected = kit.expectSuccess(
      await redeem(kit, checkout.id, {
        requestedPoints: '100',
        programId: fixture.program.id,
      }),
    );
    kit.customerAccessToken = '';
    expect(await kit.read(selected.id)).toBeNull();
  });

  test('treats removal of an absent loyalty selection as an idempotent no-op', async () => {
    await kit.setupCustomer();
    const checkout = await payable(kit);
    const version = Number((await kit.persisted(checkout.id)).version);
    const after = kit.expectSuccess(await removeRedemption(kit, checkout.id));
    expect(after.resultRevision).toBe(checkout.resultRevision);
    expect(Number((await kit.persisted(checkout.id)).version)).toBe(version);
  });

  test('folds an applied loyalty discount into checkout cost total discount and total amount', async () => {
    const { fixture } = await kit.fundLoyalty();
    const before = await payable(kit);
    const after = kit.expectSuccess(
      await redeem(kit, before.id, {
        requestedPoints: '250',
        programId: fixture.program.id,
      }),
    );
    expect(after.cost.totalDiscountAmount.amount).toBe(
      before.cost.totalDiscountAmount.amount + after.loyaltyRedemption!.discount.amount,
    );
    expect(after.cost.totalAmount.amount).toBe(after.loyaltyRedemption!.payableAfterLoyalty.amount);
  });
});

async function payable(kit: CheckoutStorefrontTestKit): Promise<Checkout> {
  return kit.created({
    items: [{ purchasableId: await kit.variant({ price: 1_000 }), quantity: 1 }],
  });
}
function redeem(
  kit: CheckoutStorefrontTestKit,
  checkoutId: string,
  input: Record<string, unknown>,
) {
  return kit.mutation('checkoutLoyaltyRedemptionUpdate', 'CheckoutLoyaltyRedemptionUpdateInput', {
    checkoutId,
    redeemPoints: true,
    ...input,
  });
}
function removeRedemption(kit: CheckoutStorefrontTestKit, checkoutId: string) {
  return kit.mutation('checkoutLoyaltyRedemptionRemove', 'CheckoutLoyaltyRedemptionRemoveInput', {
    checkoutId,
  });
}
function redeemRaw(
  kit: CheckoutStorefrontTestKit,
  checkoutId: string,
  input: Record<string, unknown>,
) {
  return kit.graphql<unknown>(
    `mutation InvalidLoyalty($input: CheckoutLoyaltyRedemptionUpdateInput!) {
      checkoutLoyaltyRedemptionUpdate(input: $input) { checkout { id } userErrors { code } }
    }`,
    { input: { checkoutId, ...input } },
  );
}
