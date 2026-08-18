import { test } from '@fixtures/base.extend';

test.describe('Loyalty Storefront API account opportunities', () => {
  test('returns account opportunities for every non-purchase trigger', () => {
    // Cover SIGNUP, REVIEW, REFERRAL, BIRTHDAY, ANNIVERSARY, LOGIN, SUBSCRIPTION_RENEWAL, and CUSTOM.
  });

  test('excludes ORDER opportunities from the account-level projection', () => {
    // Configure purchase and account actions together and verify purchase remains product scoped.
  });

  test('selects primaryOpportunity using server priority order', () => {
    // Create competing eligible rules and verify stable primary selection and ranked list ordering.
  });

  test('returns AVAILABLE for an eligible active account', () => {
    // Query a matching authenticated account with remaining limits and verify current availability.
  });

  test('returns COMPLETED for a one-time completed action', () => {
    // Consume a one-occurrence non-order rule and verify completed state and zero remaining uses.
  });

  test('returns LIMIT_REACHED for exhausted account limits', () => {
    // Exhaust occurrence, points, and reward per-account caps independently.
  });

  test('returns BUDGET_EXHAUSTED for exhausted campaign limits', () => {
    // Exhaust occurrence, point, monetary, and definition issuance budgets independently.
  });

  test('omits opportunities outside rule reward or version schedules', () => {
    // Query before start, at start, before end, and at end for each relevant configuration boundary.
  });

  test('evaluates segment ANY ALL exclusion and nested boolean conditions', () => {
    // Cover positive and negative audience paths and verify excluded segments always suppress presentation.
  });

  test('returns exact reward values for fixed account actions', () => {
    // Verify points and issued reward presentations are exact rather than estimated.
  });

  test('returns localized merchant copy with deterministic fallbacks', () => {
    // Query exact locale, language fallback, default copy, badge, terms, and accessibility label.
  });

  test('returns evaluatedAt validUntil and an opaque revision that changes with inputs', () => {
    // Change usage, account revision, rules, and schedule boundaries and verify cache diagnostics.
  });
});
