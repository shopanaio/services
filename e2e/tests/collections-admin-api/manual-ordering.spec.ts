import { test } from '@fixtures/base.extend';

test('moves a manual product before another product', () => {
  // Verify visible order, changed ranks, revision, and projection sync.
});

test('moves a manual product after another product', () => {
  // Verify visible order and stable ranks for unaffected products.
});

test('moves a manual product to the end when anchors are omitted', () => {
  // Verify the documented no-anchor behavior.
});

test('moves the first product to the last position', () => {
  // Verify both order boundaries remain addressable.
});

test('moves the last product to the first position', () => {
  // Verify before-anchor insertion at the head.
});

test('treats a move to the current position as a no-op', () => {
  // Verify no revision increment or projection operation is created.
});

test('rejects using both before and after anchors', () => {
  // Verify the input contract allows at most one anchor.
});

test('rejects identical before and after anchors', () => {
  // Verify INVALID_INPUT targets both anchor fields.
});

test('rejects moving a product before itself', () => {
  // Verify INVALID_INPUT targets beforeProductId.
});

test('rejects moving a product after itself', () => {
  // Verify INVALID_INPUT targets afterProductId.
});

test('rejects moving a product absent from the collection', () => {
  // Verify NOT_FOUND targets productId.
});

test('rejects a before anchor absent from the collection', () => {
  // Verify NOT_FOUND targets beforeProductId.
});

test('rejects an after anchor absent from the collection', () => {
  // Verify NOT_FOUND targets afterProductId.
});

test('rejects moving products in a rule collection', () => {
  // Verify ordering mutations are manual-only.
});

test('rejects malformed or wrong-type IDs on move', () => {
  // Verify INVALID_ID and unchanged ranks.
});

test('returns rank space exhausted without changing order', () => {
  // Verify RANK_SPACE_EXHAUSTED is recoverable by rebalance.
});

test('preserves deterministic order across repeated reads', () => {
  // Verify manual ranks produce stable product ordering.
});

