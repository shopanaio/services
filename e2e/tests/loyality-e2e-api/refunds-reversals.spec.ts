import { test } from '@fixtures/base.extend';

test.describe('Loyalty refunds and reversals end to end', () => {
  test('reverses earned points proportionally for a partial refund', () => {
    // Refund one line/quantity and verify immutable incremental fact, debit, lot allocation, and storefront adjustment.
  });

  test('reverses all earned points under full-reversal policy', () => {
    // Issue a qualifying refund and verify FULL_REVERSAL removes the original award exactly once.
  });

  test('uses the original eligible-spend basis and modifier snapshot for reversal', () => {
    // Change prices, discounts, catalog membership, segments, and policy after order then verify historical math.
  });

  test('restores redeemed points proportionally after a refund', () => {
    // Refund an order paid partly with points and verify RESTORE_REDEEM, lots, balance, and storefront REFUNDED entry.
  });

  test('restores points with ORIGINAL_EXPIRY policy', () => {
    // Reverse before and after original lot expiry and verify the defined expiry/debt behavior.
  });

  test('restores points with RESET_FROM_RESTORE policy', () => {
    // Verify a fresh expiration derived from restoration time and published version policy.
  });

  test('tracks debt when spent points make an earning reversal underfunded', () => {
    // Spend the award before refund and verify available stays non-negative while debt records the shortfall.
  });

  test('rejects an underfunded reversal under REJECT_REVERSAL policy', () => {
    // Attempt the same refund and verify explicit failure without partial ledger changes.
  });

  test('processes multiple incremental refunds without exceeding original economics', () => {
    // Refund in parts including final remainder and verify cumulative earning/redemption reversal caps.
  });

  test('rejects duplicate excessive and out-of-order reversal facts safely', () => {
    // Replay IDs, exceed purchased/refunded amounts, and reorder revisions without double restoration.
  });

  test('attributes every reversal to the original immutable program version', () => {
    // Activate a successor before refund and verify old version IDs and snapshots remain in all audit rows.
  });
});
