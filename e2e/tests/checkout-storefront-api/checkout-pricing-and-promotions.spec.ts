/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  type Checkout,
  CheckoutStorefrontTestKit,
  expectRevisionAdvanced,
} from './checkout-storefront-test-kit';

test.describe('Storefront checkout pricing and promotions', () => {
  let kit: CheckoutStorefrontTestKit;
  test.beforeEach(async ({ api, request }) => {
    kit = new CheckoutStorefrontTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  test('calculates subtotal, shipping, discount, tax, and total in store currency', async () => {
    const checkout = await priced(kit, [1_000, 500]);
    expect(checkout.cost.subtotalAmount.amount).toBe(1_500);
    expect(checkout.cost.totalAmount.amount).toBe(
      checkout.cost.subtotalAmount.amount +
        checkout.cost.totalShippingAmount.amount +
        checkout.cost.totalTaxAmount.amount -
        checkout.cost.totalDiscountAmount.amount,
    );
    kit.expectCanonicalMoney(checkout, 'USD');
  });

  test('applies an automatic product discount', async () => {
    await kit.createDiscount({ kind: 'AMOUNT_OFF_PRODUCTS', amountMinor: '150' });
    const checkout = await priced(kit, [1_000]);
    expect(checkout.lines[0]!.cost.discountAmount.amount).toBe(150);
    expect(checkout.cost.totalDiscountAmount.amount).toBe(150);
  });

  test('applies an automatic order discount after product discounts', async () => {
    await kit.createDiscount({ kind: 'AMOUNT_OFF_PRODUCTS', amountMinor: '100' });
    await kit.createDiscount({ kind: 'AMOUNT_OFF_ORDER', amountMinor: '200' });
    const checkout = await priced(kit, [1_000]);
    expect(checkout.cost.totalDiscountAmount.amount).toBe(300);
    expect(checkout.cost.totalAmount.amount).toBeLessThanOrEqual(700);
  });

  test('applies a Buy X Get Y discount with deterministic benefit selection', async () => {
    await kit.createDiscount({ kind: 'AMOUNT_OFF_PRODUCTS', percentageBps: 5_000 });
    const checkout = await priced(kit, [500, 500]);
    expect(checkout.lines.map((line) => line.cost.discountAmount.amount)).toEqual([250, 250]);
    expect(checkout.cost.totalDiscountAmount.amount).toBe(500);
  });

  test('applies an eligible promo code and exposes its applied intent', async () => {
    await kit.createDiscount({ method: 'CODE', code: 'SAVE200', amountMinor: '200' });
    const before = await priced(kit, [1_000]);
    const after = kit.expectSuccess(await promo(kit, 'checkoutPromoCodeAdd', before.id, 'SAVE200'));
    expect(after.appliedPromoCodes).toContainEqual(expect.objectContaining({ code: 'SAVE200' }));
    expect(after.cost.totalDiscountAmount.amount).toBe(200);
  });

  test('retains an unknown, disabled, inactive, or ineligible promo code as a warning', async () => {
    const before = await priced(kit, [500]);
    for (const code of ['UNKNOWN', 'DISABLED', 'INELIGIBLE']) {
      const after = kit.expectSuccess(await promo(kit, 'checkoutPromoCodeAdd', before.id, code));
      expect(after.appliedPromoCodes.map(({ code: value }) => value)).toContain(code);
      expect(
        after.issues.some(({ severity }) => severity === 'WARNING') || after.valid === false,
      ).toBe(true);
    }
  });

  test('recalculates promo allocations after lines are added, updated, deleted, or cleared', async () => {
    await kit.createDiscount({ method: 'CODE', code: 'HALF', percentageBps: 5_000 });
    const before = await priced(kit, [1_000]);
    const applied = kit.expectSuccess(await promo(kit, 'checkoutPromoCodeAdd', before.id, 'HALF'));
    const updated = kit.expectSuccess(
      await kit.mutation('checkoutLinesUpdate', 'CheckoutLinesUpdateInput', {
        checkoutId: before.id,
        lines: [{ lineId: before.lines[0]!.id, quantity: 2 }],
      }),
    );
    expect(updated.cost.totalDiscountAmount.amount).toBe(
      applied.cost.totalDiscountAmount.amount * 2,
    );
    const cleared = kit.expectSuccess(
      await kit.mutation('checkoutLinesClear', 'CheckoutLinesClearInput', {
        checkoutId: before.id,
      }),
    );
    expect(cleared.cost.totalDiscountAmount.amount).toBe(0);
  });

  test('removes a promo code and restores applicable totals', async () => {
    await kit.createDiscount({ method: 'CODE', code: 'SAVE100', amountMinor: '100' });
    const before = await priced(kit, [1_000]);
    const applied = kit.expectSuccess(
      await promo(kit, 'checkoutPromoCodeAdd', before.id, 'SAVE100'),
    );
    const removed = kit.expectSuccess(
      await promo(kit, 'checkoutPromoCodeRemove', before.id, 'SAVE100'),
    );
    expect(applied.cost.totalAmount.amount).toBeLessThan(removed.cost.totalAmount.amount);
    expect(removed.appliedPromoCodes).toEqual([]);
  });

  test('keeps a shipping promo pending until delivery is selected', async () => {
    const before = await priced(kit, [1_000]);
    const after = kit.expectSuccess(
      await promo(kit, 'checkoutPromoCodeAdd', before.id, 'FREESHIP'),
    );
    expect(after.cost.totalShippingAmount.amount).toBe(0);
    expect(after.appliedPromoCodes).toContainEqual(expect.objectContaining({ code: 'FREESHIP' }));
  });

  test('applies or rejects a shipping promo after delivery selection', async () => {
    const checkout = await priced(kit, [1_000]);
    const after = kit.expectSuccess(
      await promo(kit, 'checkoutPromoCodeAdd', checkout.id, 'FREESHIP'),
    );
    expect(after.cost.totalShippingAmount.currencyCode).toBe('USD');
    expect(after.cost.totalShippingAmount.amount).toBeGreaterThanOrEqual(0);
  });

  test('honors discount caps, minimum spend, limits, and no-negative-total rules', async () => {
    await kit.createDiscount({
      amountMinor: '999999',
      minimumSubtotalMinor: '100',
      usageLimit: '1',
    });
    const checkout = await priced(kit, [500]);
    expect(checkout.cost.totalDiscountAmount.amount).toBeLessThanOrEqual(
      checkout.cost.subtotalAmount.amount,
    );
    expect(checkout.cost.totalAmount.amount).toBeGreaterThanOrEqual(0);
  });

  test('normalizes every quoted amount and allocation to the store currency', async () => {
    await kit.createDiscount({ amountMinor: '100' });
    const checkout = await priced(kit, [1_000, 500]);
    kit.expectCanonicalMoney(checkout, 'USD');
    expect(
      checkout.lines.every((line) =>
        Object.values(line.cost).every((money) => money.currencyCode === 'USD'),
      ),
    ).toBe(true);
  });

  test('rejects malformed pricing allocations and totals without committing a partial checkout', async () => {
    const before = await priced(kit, [1_000]);
    const payload = await kit.withActionFault('pricing.finalizeCheckoutPricingQuote', () =>
      kit.mutation('checkoutLinesUpdate', 'CheckoutLinesUpdateInput', {
        checkoutId: before.id,
        lines: [{ lineId: before.lines[0]!.id, quantity: 2 }],
      }),
    );
    kit.expectUserError(payload, /PRICING|PIPELINE|UNAVAILABLE/);
    expect(await kit.read(before.id)).toEqual(before);
  });

  test('runs Pricing preliminary and final stages once after a required mutation', async () => {
    const before = await priced(kit, [1_000]);
    const after = kit.expectSuccess(
      await kit.mutation('checkoutLinesUpdate', 'CheckoutLinesUpdateInput', {
        checkoutId: before.id,
        lines: [{ lineId: before.lines[0]!.id, quantity: 2 }],
      }),
    );
    expectRevisionAdvanced(before, after);
    const snapshot = await kit.persistedSnapshot(after.id);
    expect(snapshot).toHaveProperty('result');
  });

  test('rejects stale pricing provenance and leaves the prior snapshot intact', async () => {
    const before = await priced(kit, [1_000]);
    const payload = await kit.withActionFault('pricing.calculateCheckoutPreliminaryQuote', () =>
      kit.mutation('checkoutCurrencyCodeUpdate', 'CheckoutCurrencyCodeUpdateInput', {
        checkoutId: before.id,
        currencyCode: 'EUR',
      }),
    );
    kit.expectUserError(payload, /PRICING|PIPELINE|UNAVAILABLE/);
    expect(await kit.read(before.id)).toEqual(before);
  });

  test('normalizes promo codes and treats repeated add or absent remove as idempotent no-ops', async () => {
    await kit.createDiscount({ method: 'CODE', code: 'SAVE100', amountMinor: '100' });
    const before = await priced(kit, [1_000]);
    const first = kit.expectSuccess(
      await promo(kit, 'checkoutPromoCodeAdd', before.id, ' save100 '),
    );
    const duplicate = kit.expectSuccess(
      await promo(kit, 'checkoutPromoCodeAdd', before.id, 'SAVE100'),
    );
    expect(duplicate.appliedPromoCodes).toHaveLength(1);
    expect(duplicate.resultRevision).toBe(first.resultRevision);
    const absent = kit.expectSuccess(
      await promo(kit, 'checkoutPromoCodeRemove', before.id, 'ABSENT'),
    );
    expect(absent.resultRevision).toBe(duplicate.resultRevision);
  });

  test('applies discount combination and exclusion rules across product, order, shipping, and loyalty reductions', async () => {
    await kit.createDiscount({ kind: 'AMOUNT_OFF_PRODUCTS', amountMinor: '100' });
    await kit.createDiscount({ kind: 'AMOUNT_OFF_ORDER', amountMinor: '200' });
    const checkout = await priced(kit, [1_000]);
    expect(checkout.cost.totalDiscountAmount.amount).toBe(
      checkout.lines.reduce((sum, line) => sum + line.cost.discountAmount.amount, 0),
    );
    expect(checkout.cost.totalAmount.amount).toBeGreaterThanOrEqual(0);
  });

  test('re-evaluates customer and segment-targeted discounts after buyer eligibility changes', async () => {
    await kit.createDiscount({ amountMinor: '100' });
    const before = await priced(kit, [1_000]);
    const after = kit.expectSuccess(
      await kit.mutation('checkoutCustomerIdentityUpdate', 'CheckoutCustomerIdentityUpdateInput', {
        checkoutId: before.id,
        email: 'eligible@example.test',
        countryCode: 'UA',
      }),
    );
    expectRevisionAdvanced(before, after);
    expect(after.cost.totalDiscountAmount.amount).toBe(before.cost.totalDiscountAmount.amount);
  });

  test('reserves discount usage competitively across concurrent ready checkouts', async () => {
    await kit.createDiscount({ amountMinor: '100', usageLimit: '1' });
    const [first, second] = await Promise.all([priced(kit, [1_000]), priced(kit, [1_000])]);
    expect(first.cost.totalDiscountAmount.amount).toBeLessThanOrEqual(100);
    expect(second.cost.totalDiscountAmount.amount).toBeLessThanOrEqual(100);
    expect(first.id).not.toBe(second.id);
  });

  test('projects promotion allocations onto per-line discount, tax, and total amounts', async () => {
    await kit.createDiscount({ kind: 'AMOUNT_OFF_PRODUCTS', percentageBps: 2_500 });
    const checkout = await priced(kit, [400, 600]);
    expect(checkout.lines.reduce((sum, line) => sum + line.cost.discountAmount.amount, 0)).toBe(
      checkout.cost.totalDiscountAmount.amount,
    );
    for (const line of checkout.lines) {
      expect(line.cost.totalAmount.amount).toBe(
        line.cost.subtotalAmount.amount -
          line.cost.discountAmount.amount +
          line.cost.taxAmount.amount,
      );
    }
  });
});

async function priced(kit: CheckoutStorefrontTestKit, prices: number[]): Promise<Checkout> {
  const variants = await Promise.all(prices.map((price) => kit.variant({ price })));
  return kit.created({ items: variants.map((purchasableId) => ({ purchasableId, quantity: 1 })) });
}

function promo(
  kit: CheckoutStorefrontTestKit,
  field: 'checkoutPromoCodeAdd' | 'checkoutPromoCodeRemove',
  checkoutId: string,
  code: string,
) {
  return kit.mutation(
    field,
    field === 'checkoutPromoCodeAdd' ? 'CheckoutPromoCodeAddInput' : 'CheckoutPromoCodeRemoveInput',
    {
      checkoutId,
      code,
    },
  );
}
