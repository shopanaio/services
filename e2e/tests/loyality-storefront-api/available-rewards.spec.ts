import { test } from '@fixtures/base.extend';

test.describe('Loyalty Storefront API available rewards', () => {
  test('presents every supported reward kind', () => {
    // Cover POINTS, CASHBACK, STORE_CREDIT, VOUCHER, FIXED_DISCOUNT, PERCENTAGE_DISCOUNT, FREE_SHIPPING, FREE_PRODUCT, and MEMBER_BENEFIT.
  });

  test('returns only issued rewards currently inside their validity window', () => {
    // Mix future, issued, reserved, redeemed, expired, and revoked entitlements and verify server filtering.
  });

  test('treats validFrom as inclusive and validUntil as exclusive', () => {
    // Query immediately around both time boundaries and verify exact availability transitions.
  });

  test('multiplies structured reward values by entitlement quantity', () => {
    // Verify points, money, and free-product quantities while preserving non-quantitative reward data.
  });

  test('uses entitlement external reference for a concrete voucher code', () => {
    // Verify the issued external code overrides a generic definition code without leaking internal references.
  });

  test('returns localized presentation and structured reward copy consistently', () => {
    // Verify presentation and reward.copy contain the same localized merchant-authored content.
  });

  test('paginates available rewards with nodes and edges in identical order', () => {
    // Traverse pages and verify nodes, edges, cursors, totalCount, and pageInfo remain consistent.
  });

  test('changes the opaque revision on entitlement state or validity changes', () => {
    // Transition or reschedule an entitlement and verify clients can invalidate a cached reward.
  });

  test('cannot expose another customer or store reward', () => {
    // Query with foreign account and entitlement references and verify empty/not-found results.
  });
});
