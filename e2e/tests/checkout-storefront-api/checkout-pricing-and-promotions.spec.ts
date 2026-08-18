import { test } from '@fixtures/base.extend';

test.describe('Storefront checkout pricing and promotions', () => {
  test('calculates subtotal, shipping, discount, tax, and total in store currency', () => {
    // TODO: Verify checkout cost arithmetic.
  });

  test('applies an automatic product discount', () => {
    // TODO: Verify line allocation and total discount.
  });

  test('applies an automatic order discount after product discounts', () => {
    // TODO: Verify discount ordering and remaining amount.
  });

  test('applies a Buy X Get Y discount with deterministic benefit selection', () => {
    // TODO: Verify eligible and benefit line allocations.
  });

  test('applies an eligible promo code and exposes its applied intent', () => {
    // TODO: Verify code resolution and discount projection.
  });

  test('retains an unknown, disabled, inactive, or ineligible promo code as a warning', () => {
    // TODO: Verify rejection does not become a transport error.
  });

  test('recalculates promo allocations after lines are added, updated, deleted, or cleared', () => {
    // TODO: Verify no stale discount remains.
  });

  test('removes a promo code and restores applicable totals', () => {
    // TODO: Verify other code intents remain intact.
  });

  test('keeps a shipping promo pending until delivery is selected', () => {
    // TODO: Verify pending code state before final pricing.
  });

  test('applies or rejects a shipping promo after delivery selection', () => {
    // TODO: Verify shipping discount eligibility.
  });

  test('honors discount caps, minimum spend, limits, and no-negative-total rules', () => {
    // TODO: Verify final monetary invariants.
  });

  test('normalizes every quoted amount and allocation to the store currency', () => {
    // TODO: Verify subtotal, tax, shipping, discount, payable amount, and order snapshot use one canonical currency.
  });

  test('rejects malformed pricing allocations and totals without committing a partial checkout', () => {
    // TODO: Verify boundary containment for inconsistent line totals, currencies, and negative monetary values.
  });

  test('runs Pricing preliminary and final stages once after a required mutation', () => {
    // TODO: Verify the canonical five-stage order.
  });

  test('rejects stale pricing provenance and leaves the prior snapshot intact', () => {
    // TODO: Verify stale quotes cannot be committed.
  });
});
