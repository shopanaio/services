import { test } from '@fixtures/base.extend';

test.describe('Customers E2E API — privacy data request synchronization', () => {
  test('storefront-created privacy request is visible through admin', () => {
    // Create ACCESS, EXPORT, CORRECTION, and ERASURE requests through Storefront API and verify that
    // Admin API resolves the same customer-owned requests with their submitted public details.
  });

  test('admin processing status is visible through storefront', () => {
    // Advance a storefront-created request through Admin API and verify that Storefront API observes
    // pending, processing, and terminal statuses with consistent timestamps.
  });

  test('admin-produced export result is downloadable by the owning storefront customer', () => {
    // Complete an EXPORT request through Admin API with a customer-owned result file and verify that
    // the authenticated Storefront API customer can resolve it while another customer cannot.
  });

  test('storefront cancellation is visible and terminal through admin', () => {
    // Cancel a pending request through Storefront API and verify through Admin API that its status,
    // reason, and timestamps are terminal and cannot be processed afterward.
  });

  test('admin-completed correction is reflected in the next storefront profile query', () => {
    // Submit an allowed correction through Storefront API, complete it through Admin API, and verify
    // that the corrected profile and aggregate revision are visible in Storefront API.
  });

  test('admin-completed erasure revokes storefront access and redacts admin data', () => {
    // Complete ERASURE through Admin API, retry the existing storefront session, and verify that
    // self-service access ends while Admin API retains only the required redacted audit record.
  });
});
