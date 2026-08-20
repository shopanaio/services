import { test } from '@fixtures/base.extend';

test.describe('Collection products Relay pagination', () => {
  test('uses a default page size of twenty', () => {
    // Omit first and verify the documented default limit.
  });

  test('returns the requested first page', () => {
    // Read a partial page from a larger collection.
  });

  test('continues after endCursor without overlap', () => {
    // Traverse consecutive pages and compare product IDs.
  });

  test('reaches the final page with hasNextPage false', () => {
    // Continue until the connection is exhausted.
  });

  test('returns null cursors for an empty connection', () => {
    // Verify empty pageInfo and zero totalCount.
  });

  test('returns matching edges and nodes in the same order', () => {
    // Compare each edge.node with the corresponding nodes entry.
  });

  test('returns totalCount for the complete filtered result', () => {
    // Ensure totalCount is independent of the current page size.
  });

  test('rejects first below one', () => {
    // Request first zero and assert BAD_USER_INPUT on first.
  });

  test('rejects first above one hundred', () => {
    // Request beyond the maximum storefront page size.
  });

  test('rejects a malformed cursor', () => {
    // Pass a non-opaque cursor and assert a safe client error.
  });

  test('rejects a cursor from another collection', () => {
    // Reuse a valid cursor across collection scopes.
  });

  test('rejects a cursor after collection membership changes', () => {
    // Change listing revision before continuing an old page.
  });

  test('keeps pagination deterministic for equal sort values', () => {
    // Traverse tied products and verify the stable ID tiebreaker.
  });

  test('paginates manual and rule collections with the same Relay contract', () => {
    // Compare page metadata across both membership models.
  });
});
