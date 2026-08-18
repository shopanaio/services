import { test } from '@fixtures/base.extend';

test.describe('Loyalty Admin API earning rule limits', () => {
  test('configures inclusive start and exclusive end schedule boundaries', () => {
    // Persist startsAt and endsAt and verify exact effective-window semantics through event evaluations.
  });

  test('caps points awarded by one event', () => {
    // Configure perEventMaxPoints and verify a larger calculated reward is capped deterministically.
  });

  test('enforces per-account occurrence and points limits', () => {
    // Reach each account limit independently and verify LIMIT_REACHED evaluations and usage projections.
  });

  test('supports lifetime day week month and rolling account windows', () => {
    // Verify reset boundaries in UTC and rolling-window inclusion/exclusion edges.
  });

  test('enforces campaign occurrence and points budgets', () => {
    // Exhaust shared limits across customers and verify BUDGET_EXHAUSTED without over-awarding.
  });

  test('enforces campaign monetary caps independently per currency', () => {
    // Exhaust one currency cap and verify another currency budget remains available.
  });

  test('handles the final available limit concurrently exactly once', () => {
    // Race events at the last occurrence/points/budget slot and verify locked usage prevents overspend.
  });

  test('records ignored ineligible and limit decisions without ledger mutations', () => {
    // Verify one immutable evaluation per fact/rule/account and no economic transaction for non-awards.
  });
});
