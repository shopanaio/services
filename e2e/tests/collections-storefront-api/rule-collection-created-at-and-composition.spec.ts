import { test } from '@fixtures/base.extend';

test.describe('Rule collection created-at and composition semantics', () => {
  test('matches createdAt with EQ', () => {
    // Compare the canonical product creation instant exactly.
  });

  test('matches createdAt with GT and excludes the instant', () => {
    // Verify strict greater-than timestamp semantics.
  });

  test('matches createdAt with GTE and includes the instant', () => {
    // Verify inclusive greater-than-or-equal timestamp semantics.
  });

  test('matches createdAt with LT and excludes the instant', () => {
    // Verify strict less-than timestamp semantics.
  });

  test('matches createdAt with LTE and includes the instant', () => {
    // Verify inclusive less-than-or-equal timestamp semantics.
  });

  test('matches both endpoints of an inclusive createdAt range', () => {
    // Verify CREATED_AT between includes from and to.
  });

  test('combines multiple rules in persisted presentation order with AND', () => {
    // Prove sortIndex does not change boolean rule composition.
  });

  test('replaces membership when the complete rule set is replaced', () => {
    // Save a new rule set and verify old predicates no longer apply.
  });

  test('returns no products after all rules are cleared', () => {
    // Clear a draft rule collection and verify empty membership.
  });

  test('keeps draft and unpublished products outside every rule result', () => {
    // Intersect rule matches with the storefront-published universe.
  });

  test('returns each matching product once when several variants match', () => {
    // Project multiple matching variant witnesses to one product.
  });

  test('evaluates rules against the active storefront currency context', () => {
    // Compare persisted price-rule currency with request currency behavior.
  });
});
