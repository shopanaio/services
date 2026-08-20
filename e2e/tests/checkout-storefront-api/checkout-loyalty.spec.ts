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

  test('shows no loyalty redemption for an anonymous customer', async () => {
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
    const capped = kit.expectSuccess(payload);
    expect(capped.loyaltyRedemption).toMatchObject({
      redeemablePoints: '300',
      availablePoints: '300',
    });
    expect(capped.loyaltyRedemption!.discount.amount).toBe(300);
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
    const [reservation] = await kit.sql<{ status: string; checkoutId: string | null }[]>`
      select status, reserved_for_checkout_id as "checkoutId"
      from loyalty.reward_entitlement where id = ${reward.rawId}
    `;
    expect(reservation).toEqual({ status: 'RESERVED', checkoutId: kit.rawId(after.id) });
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
    expect(after.loyaltyRedemption?.discount).toEqual({ amount: 100, currencyCode: 'USD' });
    expect(await kit.loyaltyBalance(fixture.account.id)).toMatchObject({
      availablePoints: '900',
      reservedPoints: '100',
    });
    const [rewardReservation] = await kit.sql<{ status: string; checkoutId: string | null }[]>`
      select status, reserved_for_checkout_id as "checkoutId"
      from loyalty.reward_entitlement where id = ${reward.rawId}
    `;
    expect(rewardReservation).toEqual({
      status: 'RESERVED',
      checkoutId: kit.rawId(after.id),
    });
  });

  test('rejects expired and unknown reward entitlements', async () => {
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
      const rejected = kit.expectSuccess(
        await redeem(kit, checkout.id, { redeemPoints: false, rewardEntitlementId }),
      );
      expect(rejected).toMatchObject({ valid: false, status: 'OPEN' });
      expect(rejected.issues).toContainEqual(
        expect.objectContaining({
          code: 'ENTITLEMENT_NOT_AVAILABLE',
          severity: 'ERROR',
          effect: 'STOP',
          retryable: false,
        }),
      );
      expect(rejected.loyaltyRewardEntitlementId).toBeNull();
      expect(await kit.read(checkout.id)).toEqual(rejected);
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

    const eligibilityUpdated = await kit.withActionOverrides(
      [{ action: 'customers.resolveCheckoutBuyerEligibility', mode: 'PASS' }],
      async () => {
        const result = kit.expectSuccess(
          await kit.mutation(
            'checkoutCustomerIdentityUpdate',
            'CheckoutCustomerIdentityUpdateInput',
            { checkoutId: checkout.id, countryCode: 'UA' },
          ),
        );
        expect(await kit.actionCalls('customers.resolveCheckoutBuyerEligibility')).toBe(1);
        return result;
      },
    );
    expect(eligibilityUpdated.loyaltyRedemption!.revision).not.toBe(
      updated.loyaltyRedemption!.revision,
    );
    expect(eligibilityUpdated.loyaltyRedemption!.payableAfterLoyalty.amount).toBe(1_500);
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
    const expiredAt = new Date(Date.now() - 1_000).toISOString();
    await kit.sql`
      update checkout.checkout_current_snapshots
      set snapshot = jsonb_set(snapshot, '{result,loyalty,data,quote,expiresAt}', to_jsonb(${expiredAt}::text))
      where checkout_id = ${kit.rawId(selected.id)}
    `;

    const result = await place(kit, selected);

    expect(result.orderId).toBeNull();
    expect(result.userErrors).toContainEqual(
      expect.objectContaining({ code: 'LOYALTY_QUOTE_EXPIRED', retryable: false }),
    );
    expect(await kit.loyaltyBalance(fixture.account.id)).toMatchObject({
      availablePoints: '500',
      reservedPoints: '0',
    });
  });

  test('rejects a malformed loyalty quote without committing the checkout', async () => {
    const { fixture } = await kit.fundLoyalty();
    const checkout = await payable(kit);
    const payload = await kit.withActionOverrides(
      [{ action: 'loyalty.quoteCheckoutLoyaltyRedemption', mode: 'RETURN', result: {} }],
      () => redeem(kit, checkout.id, { requestedPoints: '100', programId: fixture.program.id }),
    );
    kit.expectUserError(payload, 'CHECKOUT_PIPELINE_BOUNDARY_VIOLATION');
    expect(await kit.read(checkout.id)).toEqual(checkout);
  });

  test('commits redeemed points exactly once after placement replay', async () => {
    const { fixture } = await kit.fundLoyalty('1000');
    const checkout = await payable(kit);
    const selected = kit.expectSuccess(
      await redeem(kit, checkout.id, {
        requestedPoints: '1000',
        programId: fixture.program.id,
      }),
    );
    const idempotencyKey = crypto.randomUUID();
    const first = await place(kit, selected, idempotencyKey);
    const afterFirst = await kit.loyaltyBalance(fixture.account.id);
    const replay = await place(kit, selected, idempotencyKey);

    expect(first).toMatchObject({ status: 'PAYMENT_NOT_REQUIRED', orderId: expect.any(String) });
    expect(replay).toEqual(first);
    expect(afterFirst).toMatchObject({ availablePoints: '0', reservedPoints: '0' });
    expect(await kit.loyaltyBalance(fixture.account.id)).toMatchObject({
      availablePoints: '0',
      reservedPoints: '0',
    });
  });

  test('releases a loyalty reservation when order creation fails', async () => {
    const { fixture } = await kit.fundLoyalty('1000');
    const checkout = await payable(kit);
    const selected = kit.expectSuccess(
      await redeem(kit, checkout.id, { requestedPoints: '1000', programId: fixture.program.id }),
    );
    const result = await kit.withActionFault('order.createOrderFromCheckoutPlacement', () =>
      place(kit, selected),
    );

    expect(result.orderId).toBeNull();
    expect(result.userErrors).toContainEqual(
      expect.objectContaining({
        code: 'Scoped e2e fault for order.createOrderFromCheckoutPlacement',
        retryable: false,
      }),
    );
    expect(await kit.loyaltyBalance(fixture.account.id)).toMatchObject({
      availablePoints: '1000',
      reservedPoints: '0',
    });
    const [placement] = await kit.sql<{ status: string; loyaltyReservation: unknown }[]>`
      select status, loyalty_reservation as "loyaltyReservation"
      from checkout.checkout_placements where checkout_id = ${kit.rawId(selected.id)}
    `;
    expect(placement).toMatchObject({ status: 'FAILED', loyaltyReservation: expect.anything() });
  });

  test('rejects zero, negative, disabled, and non-numeric redemption input without committing', async () => {
    const checkout = await payable(kit);
    for (const [input, expectedCode] of [
      [{ redeemPoints: true, requestedPoints: '0' }, 'LOYALTY_POINTS_INVALID'],
      [{ redeemPoints: true, requestedPoints: '-1' }, 'LOYALTY_POINTS_INVALID'],
      [{ redeemPoints: false }, 'LOYALTY_SELECTION_REQUIRED'],
      [{ redeemPoints: true, requestedPoints: 'not-a-number' }, 'LOYALTY_POINTS_INVALID'],
    ] as const) {
      const response = await redeemRaw(kit, checkout.id, input);
      expect(response.data ?? null).toBeNull();
      expect(response.errors).toEqual([
        expect.objectContaining({
          extensions: expect.objectContaining({ code: expectedCode, retryable: false }),
        }),
      ]);
      kit.expectSafe(response.errors);
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
    kit.expectUserError(payload, 'LOYALTY_CUSTOMER_MISMATCH');
  });

  test('revokes anonymous access to a customer-owned checkout after sign-out', async () => {
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

type Placement = {
  placementId: string | null;
  placementState: string | null;
  orderId: string | null;
  status: string | null;
  userErrors: Array<{ field: string[] | null; code: string; message: string; retryable: boolean }>;
};

async function place(
  kit: CheckoutStorefrontTestKit,
  checkout: Checkout,
  idempotencyKey = crypto.randomUUID(),
): Promise<Placement> {
  const response = await kit.graphql<{ placeOrder: Placement }>(
    `mutation PlaceLoyalty($input: PlaceOrderInput!) { placeOrder(input: $input) {
      placementId placementState orderId status
      userErrors { field code message retryable }
    } }`,
    {
      input: {
        checkoutId: checkout.id,
        expectedResultRevision: checkout.resultRevision,
        idempotencyKey,
      },
    },
  );
  expect(response.errors).toBeUndefined();
  return response.data!.placeOrder;
}
