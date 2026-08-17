import { test } from '@fixtures/base.extend';

test.describe('Customers E2E API — lifecycle synchronization', () => {
  test('admin blocking an enrolled customer immediately denies storefront self-service', () => {
    // Enroll and authenticate a customer, set BLOCKED through Admin API, and verify that existing
    // and newly issued storefront tokens cannot resolve or mutate the customer.
  });

  test('admin disabling an enrolled customer denies storefront access', () => {
    // Set DISABLED through Admin API and verify that Storefront API returns no customer and rejects
    // all customer-owned mutations even when the IAM access token itself is still valid.
  });

  test('admin reactivation restores storefront access for the linked principal', () => {
    // Reactivate a previously disabled linked customer through Admin API, obtain or reuse a valid
    // storefront identity session according to cache rules, and resolve the same customer again.
  });

  test('IAM block and unblock are projected to admin lifecycle and storefront access', () => {
    // Block and unblock the enrolled IAM application user, then verify the corresponding Admin API
    // lifecycle projection and Storefront API access decision without changing customer ownership.
  });

  test('admin deletion invalidates storefront access and owned entity reads', () => {
    // Delete an enrolled customer through Admin API, retry storefront customer and child-entity
    // queries with the old token, and verify that no deleted aggregate data is returned.
  });

  test('admin merge moves supported data and prevents the source storefront identity from resolving', () => {
    // Merge an enrolled source into a target through Admin API, verify reconciled owned data on the
    // target, and verify that the source session cannot expose either source or target customer data.
  });

  test('storefront session cache cannot bypass a newer admin lifecycle restriction', () => {
    // Warm authenticated storefront context, block or delete the customer through Admin API, and
    // verify that subsequent requests fail closed rather than serving stale active customer state.
  });
});
