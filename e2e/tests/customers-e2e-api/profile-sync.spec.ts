import { test } from '@fixtures/base.extend';

test.describe('Customers E2E API — profile synchronization', () => {
  test('admin profile update is visible in the next storefront customer query', () => {
    // Enroll a customer, update every storefront-visible profile field through Admin API, and
    // verify that the next authenticated Storefront API query returns the committed values.
  });

  test('storefront profile update is visible in the next admin customer query', () => {
    // Update every customer-editable profile field through Storefront API and verify through Admin
    // API that the same aggregate, values, timestamps, and incremented revision were persisted.
  });

  test('admin and storefront writes share one optimistic revision sequence', () => {
    // Read one revision from both APIs, update through Admin API, then prove that a Storefront API
    // write using the stale revision fails without overwriting the administrator's change.
  });

  test('storefront and admin concurrent updates allow one aggregate revision winner', () => {
    // Race Admin API and Storefront API profile updates from the same expected revision and verify
    // that one succeeds, one reports a revision conflict, and the aggregate is never partially mixed.
  });

  test('admin-only customer fields never appear in storefront schema or responses', () => {
    // Populate note, moderation note, blocked reason, IAM principal, source, and statistics through
    // Admin API, then verify that Storefront API cannot select or infer those protected fields.
  });

  test('IAM email verification state is projected consistently to both APIs', () => {
    // Complete storefront email verification and verify that Storefront emailAddress.verified and
    // Admin customer.emailVerified describe the same identity state without exposing IAM details.
  });

  test('storefront identity data does not overwrite newer merchant-managed profile changes', () => {
    // Update customer names through Admin API after enrollment, refresh the storefront session,
    // and verify that identity synchronization follows the declared ownership rules for each field.
  });
});
