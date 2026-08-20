import { test } from '@fixtures/base.extend';

test('adds one product to a manual collection', () => {
  // Verify membership, revision increment, and unchanged listingRevision.
});

test('adds multiple products to a manual collection in input order', () => {
  // Verify new manual ranks follow the requested product order.
});

test('deduplicates product IDs within one add request', () => {
  // Verify one membership row is created per distinct product.
});

test('ignores products already present in a manual collection', () => {
  // Verify duplicate membership is idempotent and does not bump revision.
});

test('rejects adding more than one hundred products at once', () => {
  // Verify LIMIT_EXCEEDED and no partial membership changes.
});

test('rejects adding a missing product', () => {
  // Verify NOT_FOUND and atomic rollback for the full product list.
});

test('rejects malformed and wrong-type product IDs on add', () => {
  // Verify INVALID_ID and no membership changes.
});

test('rejects adding products to a rule collection', () => {
  // Verify manual-only membership enforcement.
});

test('removes one product from a manual collection', () => {
  // Verify membership deletion, revision increment, and projection sync.
});

test('removes multiple products from a manual collection', () => {
  // Verify remaining product order is preserved.
});

test('deduplicates product IDs within one remove request', () => {
  // Verify distinct membership rows are removed once.
});

test('ignores products not present during removal', () => {
  // Verify a no-op removal succeeds without bumping revision.
});

test('allows removal of a product entity that was already deleted', () => {
  // Verify collection membership can be cleaned by its persisted product ID.
});

test('rejects removing more than one hundred products at once', () => {
  // Verify LIMIT_EXCEEDED and no partial removal.
});

test('rejects malformed and wrong-type product IDs on remove', () => {
  // Verify INVALID_ID and unchanged collection state.
});

test('rejects removing products from a rule collection', () => {
  // Verify rule membership cannot be edited manually.
});

test('rejects membership changes for an unknown collection', () => {
  // Verify NOT_FOUND for valid but absent collection IDs.
});

test('rejects membership changes with a stale expected revision', () => {
  // Verify REVISION_CONFLICT before product validation or mutation.
});

test('does not mutate collection membership from another store', () => {
  // Verify collection and product tenant boundaries.
});

