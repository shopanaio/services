import { test } from '@fixtures/base.extend';

test.describe('Customers E2E API — tax synchronization', () => {
  test('admin-created tax identifier is visible through storefront', () => {
    // Create and normalize a customer tax identifier through Admin API and verify that Storefront
    // API exposes the same public identifier, status, validity dates, and primary flag.
  });

  test('storefront-created tax identifier is visible through admin', () => {
    // Create an unverified identifier through Storefront API and verify through Admin API that the
    // same global ID belongs to the enrolled customer and has no forged verification metadata.
  });

  test('admin verification of a tax identifier is reflected in storefront', () => {
    // Verify or reject a Storefront-created identifier through Admin API and confirm that Storefront
    // API exposes the resulting status and allowed timestamps without exposing internal evidence.
  });

  test('admin-created tax exemption and certificate are readable but immutable in storefront', () => {
    // Create an exemption with its certificate through Admin API, read it through Storefront API,
    // and verify that no storefront mutation can create, update, or delete merchant approval data.
  });

  test('primary tax identifier changes remain consistent across both APIs', () => {
    // Switch the primary identifier through each API in turn and verify from the opposite API that
    // exactly one identifier is primary after every committed aggregate revision.
  });

  test('admin and storefront tax writes reject stale shared revisions', () => {
    // Commit a tax change through one API, issue a write through the other with the previous revision,
    // and verify that identifiers, exemptions, and primary selection remain atomic.
  });
});
