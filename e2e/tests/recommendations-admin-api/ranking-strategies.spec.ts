import { test } from '@fixtures/base.extend';

test('builds CURATED_ONLY results from active manual PIN BOOST and EXCLUDE actions', () => {
  // Verify automated candidates never fill this strategy.
});

test('builds CURATED_FIRST results with manual ranks before automated candidates', () => {
  // Verify duplicates collapse and exclusions win.
});

test('builds BLENDED results from normalized manual and automated scores', () => {
  // Verify weighting ordering and deterministic tie breakers.
});

test('builds AUTOMATED_ONLY results while still enforcing explicit exclusions', () => {
  // Verify PIN and BOOST do not force inclusion under this strategy.
});

test('applies minimum maximum and fallback chain policy in order', () => {
  // Verify cold-start fill stops at maximumResults and preserves source provenance.
});

test('keeps placements independent for the same anchor product', () => {
  // Verify related and FBT policies snapshots and manual actions never cross-contaminate.
});
