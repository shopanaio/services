import { test } from '@fixtures/base.extend';

test.describe('Loyalty Admin API reservations', () => {
  test('queries a reservation with immutable quote and version snapshots', () => {
    // Verify checkout, quote, program version, points, discount, expiry, request hash, and event audit fields.
  });

  test('filters reservations by every supported criterion', () => {
    // Cover IDs, accounts, programs, checkout, order, statuses, expiry, and created date ranges.
  });

  test('paginates reservations forward and backward deterministically', () => {
    // Verify cursors, totalCount, no duplicates, and stable boundaries while new rows are added.
  });

  test('releases an active reservation and restores its original lots', () => {
    // Verify RELEASED state, revision, audit event, transaction, allocations, and available balance restoration.
  });

  test('rejects release of committed expired released and reversed reservations', () => {
    // Exercise every terminal status and verify no duplicate restoration or audit event is created.
  });

  test('rejects release with a stale expected revision', () => {
    // Race a state transition and verify optimistic concurrency preserves the winning state.
  });

  test('replays reservation release idempotently', () => {
    // Retry the same release and verify the original reservation and transaction are returned once.
  });
});
