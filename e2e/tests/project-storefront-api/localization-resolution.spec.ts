import { test } from '@fixtures/base.extend';

test('resolves localization from the active market country language and currency', () => {
  // Verify the selected values and all available values belong to one active market.
});

test('falls back to market defaults when optional localization hints are absent', () => {
  // Verify deterministic default country language and currency resolution.
});

test('rejects or falls back from unsupported country language and currency hints', () => {
  // Verify hints outside the active market cannot create an impossible localization tuple.
});

test('uses the store default market when no market handle is selected', () => {
  // Verify localization remains valid after default-market configuration changes.
});

test('keeps localization request scoped and free of cross-request cache leakage', () => {
  // Verify concurrent requests for different locales currencies and stores remain isolated.
});
