import { test } from '@fixtures/base.extend';

test.describe('Loyalty Admin to Storefront program publication', () => {
  test('publishes an admin draft and exposes it on the storefront at effectiveFrom', () => {
    // Create/configure/publish through Admin, then verify customer and product projections before and at activation.
  });

  test('keeps draft rules and policy JSON completely hidden from storefront clients', () => {
    // Query all storefront loyalty surfaces before publication and verify no admin-only configuration leaks.
  });

  test('switches storefront presentation atomically to a scheduled successor version', () => {
    // Publish two versions and verify one coherent old/new snapshot around the effective boundary.
  });

  test('pauses and archives a program without rewriting historical customer economics', () => {
    // Change program state in Admin, verify storefront suppression, and preserve prior ledger/transaction audit.
  });

  test('propagates admin copy and locale changes only through a new published version', () => {
    // Verify immutable published copy, draft isolation, and localized storefront output after successor activation.
  });

  test('invalidates storefront revisions when the effective program version changes', () => {
    // Compare account/product revisions before and after rollout while stable inputs keep stable revisions.
  });

  test('keeps two stores with different active programs fully isolated', () => {
    // Publish distinct policies in two stores and verify each admin/storefront pair sees only its own values.
  });
});
