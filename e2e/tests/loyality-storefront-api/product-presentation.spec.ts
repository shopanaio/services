import { test } from '@fixtures/base.extend';

test.describe('Loyalty Storefront API product and variant presentation', () => {
  test('returns a purchase opportunity for a published eligible product', () => {
    // Verify primary, purchase list, estimated points range, copy, timestamps, and revision.
  });

  test('returns a concrete purchase opportunity for an available variant', () => {
    // Query ProductVariant.loyalty and verify quantity-one calculation from the variant price.
  });

  test('returns minimum and maximum across purchasable product variants', () => {
    // Seed different variant prices and verify the product range includes only available priced variants.
  });

  test('returns null for unpublished products and unavailable variants', () => {
    // Exercise draft/deleted products and unavailable/out-of-stock variants without leaking loyalty config.
  });

  test('returns null when no active earning-enabled version exists', () => {
    // Query before publication, while paused, after expiry, and with earning disabled.
  });

  test('returns null when the storefront currency has no product price', () => {
    // Query a valid product under another currency and verify no fabricated conversion.
  });

  test('returns AUTHENTICATION_REQUIRED to an anonymous eligible viewer', () => {
    // Query public product loyalty and verify value/copy are visible without customer-specific usage.
  });

  test('returns AVAILABLE to an authenticated eligible active account', () => {
    // Enroll the viewer and verify the same opportunity becomes currently available.
  });

  test('separates purchase and review opportunities', () => {
    // Configure ORDER and REVIEW rules and verify dedicated fields and list classifications.
  });

  test('selects primary purchase and review opportunities by server priority', () => {
    // Create competing rules and verify clients receive deterministic server ranking.
  });

  test('changes revision when catalog price availability policy or viewer state changes', () => {
    // Mutate each authoritative input and verify the opaque presentation revision invalidates.
  });

  test('batches a product listing without changing per-product results', () => {
    // Query many products together and compare each projection with its standalone query.
  });
});
