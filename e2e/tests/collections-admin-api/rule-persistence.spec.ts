import { test } from '@fixtures/base.extend';

test('saves a category rule with IN semantics', () => {
  // Verify typed output, global IDs, sort index, and VALID references.
});

test('saves a category rule with ALL semantics', () => {
  // Verify every selected category is retained in canonical order.
});

test('saves tag rules with IN and ALL semantics', () => {
  // Verify both supported tag operators round-trip.
});

test('saves a vendor rule with implicit IN semantics', () => {
  // Verify vendor output omits an operator and retains all alternatives.
});

test('saves feature rules with IN and ALL semantics', () => {
  // Verify stable source and value handle pairs round-trip.
});

test('saves option rules with IN and ALL semantics', () => {
  // Verify stable source and value handle pairs round-trip.
});

test('saves every price comparison operator', () => {
  // Verify EQ, GT, GTE, LT, and LTE typed output.
});

test('saves an inclusive price range rule', () => {
  // Verify currency and both minor-unit bounds round-trip.
});

test('saves true and false in-stock rules', () => {
  // Verify Boolean equality semantics and typed output.
});

test('saves every created-at comparison operator', () => {
  // Verify EQ, GT, GTE, LT, and LTE typed output.
});

test('saves an inclusive created-at range rule', () => {
  // Verify from and to values round-trip canonically.
});

test('persists multiple rules in presentation order', () => {
  // Verify input order maps to contiguous zero-based sortIndex values.
});

test('replaces the complete rule set atomically', () => {
  // Verify old rule rows disappear and new rows use fresh IDs.
});

test('clears rules from a draft rule collection', () => {
  // Verify an unpublished rule collection may have no rules.
});

test('rejects clearing rules from a published rule collection', () => {
  // Verify RULES_REQUIRED preserves the previous rule set.
});

test('rejects saving rules on a manual collection', () => {
  // Verify rule persistence is restricted to RULE collections.
});

test('returns not found when saving rules for an unknown collection', () => {
  // Verify NOT_FOUND and no orphan rule rows.
});

test('rejects a malformed collection ID when saving rules', () => {
  // Verify INVALID_ID targets input.collectionId.
});

test('increments revision and listingRevision for changed rules', () => {
  // Verify Listing-visible rule changes advance both revisions once.
});

test('keeps listingRevision unchanged for canonically equivalent rules', () => {
  // Verify semantic no-op detection uses the canonical rule hash.
});

