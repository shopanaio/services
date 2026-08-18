import { test } from '@fixtures/base.extend';

test.describe('Loyalty customer eligibility across Admin and Storefront', () => {
  test('applies ALL eligibility to every non-excluded customer', () => {
    // Publish ALL in Admin and verify earning, redemption, account opportunities, and product presentation agree.
  });

  test('applies SEGMENTS ANY when at least one included segment matches', () => {
    // Compare zero/one/many matches across earning, redemption, and both storefront projection families.
  });

  test('applies SEGMENTS ALL only when every included segment matches', () => {
    // Compare partial/full membership and verify no surface implements looser matching.
  });

  test('gives excluded segments precedence across all loyalty paths', () => {
    // Match included and excluded segments simultaneously and verify no presentation, earning, or redemption.
  });

  test('applies eligible channel codes consistently to earning and redemption', () => {
    // Use the same customer/order on allowed and denied channels and verify canonical ineligibility codes.
  });

  test('uses immutable eligibility snapshots after customer segments change', () => {
    // Change memberships after checkout/order capture and verify historical calculation/audit uses the old revision.
  });

  test('uses current segment membership for a new storefront presentation', () => {
    // Change customer segments and verify new presentation revisions and opportunities reflect current membership.
  });

  test('rejects redemption when customer eligibility revision changes after quote', () => {
    // Quote, mutate membership, reserve/place order, and verify the stale eligibility snapshot cannot commit.
  });

  test('returns identical eligibility decisions under concurrent event delivery', () => {
    // Deliver matching events in parallel and verify one canonical account/evaluation outcome without limit drift.
  });
});
