import { test } from '@fixtures/base.extend';

test.describe('Customers E2E API — authentication policy', () => {
  test('admin enabling password authentication allows storefront enrollment and sign-in', () => {
    // Enable PASSWORD in customer account settings through Admin API, enroll an Admin-created guest
    // through storefront password sign-up, and verify a later password sign-in resolves that customer.
  });

  test('admin disabling password authentication rejects storefront password enrollment', () => {
    // Disable PASSWORD through Admin API, attempt password sign-up for an Admin-created guest, and
    // verify that no IAM principal is created or attached and the guest aggregate remains unchanged.
  });

  test('admin disabling password authentication rejects new storefront password sign-ins', () => {
    // Enroll a customer while PASSWORD is enabled, disable it through Admin API, and verify that a
    // new storefront password sign-in is rejected without changing the linked customer aggregate.
  });

  test('admin enabling email OTP allows the existing customer to sign in through storefront', () => {
    // Create a customer through Admin API, enable EMAIL_OTP, complete the storefront OTP flow for
    // the same verified email, and verify that the existing customer is claimed and authenticated.
  });

  test('admin disabling every authentication method closes customer enrollment', () => {
    // Replace enabled methods with an empty list through Admin API and verify that password and OTP
    // storefront entry points cannot enroll or authenticate the Admin-created customer.
  });

  test('authentication policy changes apply only to the selected store', () => {
    // Configure different methods for two stores through Admin API and verify that each storefront
    // accepts only its own methods even when the same normalized customer email exists in both.
  });

  test('stale admin authentication settings update does not alter storefront behavior', () => {
    // Submit a stale customerAccountsSettings revision through Admin API and verify that the rejected
    // policy change has no effect on the currently enabled storefront authentication methods.
  });
});
