import { test } from '@fixtures/base.extend';

test.describe('Customers E2E API — marketing consent synchronization', () => {
  test('admin-created consent state is visible through storefront', () => {
    // Set EMAIL, SMS, WHATSAPP, and PUSH consent states through Admin API and verify that Storefront
    // API exposes the same current states, opt-in levels, and public timestamps for the customer.
  });

  test('storefront consent transition is visible with evidence through admin', () => {
    // Subscribe and unsubscribe through Storefront API, then verify through Admin API that current
    // consent and ordered immutable evidence events represent both transitions.
  });

  test('admin and storefront consent writes share one customer revision', () => {
    // Change consent through Admin API and attempt a Storefront API transition with the stale
    // revision, verifying that the second write fails and no extra evidence event is appended.
  });

  test('contact changes affect storefront consent eligibility consistently', () => {
    // Add or remove email and phone contact points through Admin-owned flows, then verify that
    // Storefront API accepts or rejects channel subscription according to the resulting contact data.
  });

  test('consent for the same contact remains isolated across stores', () => {
    // Enroll the same normalized contact in two stores, change consent through Admin and Storefront
    // APIs in one store, and verify that the other store's current state and evidence never change.
  });
});
