import { test } from '@fixtures/base.extend';

test.describe('Customers E2E API — account enrollment', () => {
  test('admin-created guest claims the existing customer during storefront sign-up', () => {
    // Create a guest customer through Admin API, sign up through the matching storefront with
    // the same verified normalized email, and verify that the existing customer becomes REGISTERED.
  });

  test('admin-created customer can sign in through storefront after account enrollment', () => {
    // Create the customer through Admin API, complete storefront enrollment, sign out, sign in
    // with the enrolled password, and verify that Storefront API resolves the same customer ID.
  });

  test('claiming an admin-created guest preserves merchant-managed profile data', () => {
    // Seed the full customer profile and merchant notes through Admin API, claim the profile from
    // storefront, and verify that public profile fields survive while admin-only fields stay hidden.
  });

  test('storefront sign-up matches an admin-created guest by normalized email', () => {
    // Create a mixed-case email through Admin API, sign up with an equivalent trimmed email, and
    // verify that Customers links one IAM principal without creating a duplicate customer row.
  });

  test('an unverified storefront identity cannot claim an admin-created guest', () => {
    // Create a guest through Admin API, attempt enrollment before email verification, and verify
    // that the guest remains unlinked and inaccessible as an authenticated storefront customer.
  });

  test('a storefront identity cannot claim an inactive admin-created customer', () => {
    // Create and disable or block a guest through Admin API, attempt storefront enrollment with
    // the same email, and verify that no IAM principal is attached to the inactive customer.
  });

  test('an email already linked to another principal cannot be claimed again', () => {
    // Enroll the admin-created customer once, attempt enrollment from a second IAM principal, and
    // verify that the original link remains authoritative and no second customer is exposed.
  });

  test('concurrent storefront enrollment claims an admin-created guest exactly once', () => {
    // Race equivalent storefront enrollment requests for one Admin-created guest and verify that
    // exactly one principal owns the customer and no duplicate customer aggregate is created.
  });
});
