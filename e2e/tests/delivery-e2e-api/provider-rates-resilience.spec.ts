import { test } from '@fixtures/base.extend';

test('aggregates eligible carrier rates from every active provider account', () => {
  // Verify route capabilities packages currencies and provider policy snapshots are honored.
});

test('validates provider rate responses before exposing checkout options', () => {
  // Verify malformed oversized deeply nested or currency-mismatched payloads are rejected.
});

test('uses the rate cache only for the same route cart and configuration revision', () => {
  // Verify material checkout or provider changes cannot reuse stale rates.
});

test('expires cached rates and refreshes provider results', () => {
  // Verify TTL boundaries and concurrent refresh behavior.
});

test('omits one failed provider when its failure policy allows partial results', () => {
  // Verify healthy providers and manual methods remain available.
});

test('fails the delivery group when a required provider rate fails', () => {
  // Verify FAIL_GROUP policy returns a stable retryable error without partial commitment.
});

test('records provider execution correlation and duration without secrets or customer PII', () => {
  // Verify observability is complete and safe.
});
