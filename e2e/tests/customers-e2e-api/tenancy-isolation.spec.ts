import { test } from '@fixtures/base.extend';

test.describe('Customers E2E API — tenancy isolation', () => {
  test('an admin-created customer can enroll only in the matching store application', () => {
    // Create the same email in two stores, enroll in Store A, and verify that only Store A customer
    // is claimed while Store B remains a guest with no IAM principal link.
  });

  test('storefront token from one store cannot resolve an admin customer from another store', () => {
    // Enroll a customer in Store A, send its token and Store B channel credential together, and
    // verify that Storefront API returns no customer and leaks no foreign profile fields.
  });

  test('global IDs cannot bridge admin and storefront store boundaries', () => {
    // Capture customer-owned IDs in Store A, use them in Admin and Storefront requests scoped to
    // Store B, and verify safe null or not-found results for every shared entity type.
  });

  test('cross-store admin lifecycle changes do not affect storefront access', () => {
    // Block or delete the same-email customer in Store B through Admin API and verify that the
    // independently linked Store A customer can still authenticate and use Storefront API.
  });

  test('same-email customers keep profiles addresses consents and tax data isolated', () => {
    // Populate different data for equal normalized emails in two stores through both APIs and verify
    // that every Admin and Storefront read returns only the current store's aggregate.
  });

  test('untrusted store and identity headers cannot retarget a cross-api customer flow', () => {
    // Combine valid credentials with forged store and customer headers on Admin and Storefront API
    // requests and verify that trusted gateway context remains authoritative for all operations.
  });
});
