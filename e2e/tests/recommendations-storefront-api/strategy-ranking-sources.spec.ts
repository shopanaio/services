import { test } from '@fixtures/base.extend';

test('presents manual pinned products before automated results under curated-first policy', () => {
  // Verify merchant order is preserved after storefront eligibility filtering.
});

test('omits manually excluded products under every recommendation strategy', () => {
  // Verify exclusions override automated and fallback sources.
});

test('presents blended products in the exact published rank order', () => {
  // Verify Storefront does not recalculate or resort internal scores.
});

test('labels recommendations with MANUAL FBT SIMILARITY POPULARITY or FALLBACK source', () => {
  // Verify only public provenance is exposed and internal scores remain private.
});

test('fills cold-start results through the configured fallback chain', () => {
  // Verify minimum and maximum result policy under missing association facts.
});

test('keeps related and FBT source pools independent', () => {
  // Verify an FBT fact cannot surface in related placement without configured blending.
});
