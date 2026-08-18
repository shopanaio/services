import { test } from '@fixtures/base.extend';

test.describe('Loyalty purchase earning across Checkout Orders and Storefront', () => {
  test('awards standard purchase points after an eligible paid order', () => {
    // Compare product estimate, checkout snapshot, Orders fact, Admin ledger, and Storefront balance/history.
  });

  test('uses merchandise spend after product discounts when configured', () => {
    // Apply product and order discounts and verify AFTER_PRODUCT_DISCOUNTS selects the correct immutable basis.
  });

  test('uses merchandise spend after all discounts when configured', () => {
    // Repeat the order under AFTER_ALL_DISCOUNTS and verify the different authoritative amount.
  });

  test('excludes delivery tax and loyalty tender from eligible merchandise spend', () => {
    // Build a checkout with shipping/tax/redemption and verify none inflate purchase earning.
  });

  test('enforces the minimum eligible amount per order line', () => {
    // Place lines below, equal to, and above the threshold and compare estimate to awarded line snapshots.
  });

  test('applies HIGHEST ADD and MULTIPLY modifiers to actual line rewards', () => {
    // Publish each stacking mode and verify exact ledger points and modifier IDs for matching lines.
  });

  test('applies segment-scoped and scheduled modifiers at order occurrence time', () => {
    // Exercise segment/schedule boundaries and preserve the chosen modifier snapshot after later changes.
  });

  test('uses DOWN NEAREST and UP rounding without floating point', () => {
    // Place fractional-ratio orders around half boundaries and verify exact BigInt outcomes end to end.
  });

  test('holds earned points pending until activation delay elapses', () => {
    // Verify pending storefront balance immediately, maintenance activation, available balance, and hidden transfer.
  });

  test('assigns point-lot expiry from the published version', () => {
    // Earn with and without expiry and verify Admin lots plus Storefront upcoming expiration projection.
  });

  test('does not award for failed cancelled or unpaid orders', () => {
    // Exercise terminal checkout/payment failures and verify no eligible Orders fact or loyalty ledger credit.
  });

  test('processes duplicate order reward events exactly once', () => {
    // Redeliver the same event and verify one event fact, evaluation, transaction, lot, and balance change.
  });

  test('processes one corrected order revision as an auditable delta', () => {
    // Publish a valid correction and verify no mutation of the original calculation or double award.
  });
});
