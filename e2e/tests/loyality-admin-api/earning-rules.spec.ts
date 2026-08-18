import { test } from '@fixtures/base.extend';

test.describe('Loyalty Admin API universal earning rules', () => {
  test('creates rules for every supported trigger type', () => {
    // Cover ORDER, SIGNUP, REVIEW, REFERRAL, BIRTHDAY, ANNIVERSARY, LOGIN, SUBSCRIPTION_RENEWAL, and CUSTOM_EVENT.
  });

  test('evaluates ALL ANY and NOT condition expression trees', () => {
    // Persist nested boolean expressions and verify their canonical JSON and schema versions.
  });

  test('supports SEGMENT conditions with ANY and ALL matching', () => {
    // Configure both segment modes and validate included references and nested condition placement.
  });

  test('supports CHANNEL PAYMENT_METHOD FIRST_PURCHASE and SCHEDULE conditions', () => {
    // Persist each non-catalog condition and boundary data without losing type information.
  });

  test('supports CATALOG conditions for every applies-to selector type', () => {
    // Cover ALL, PRODUCT, VARIANT, CATEGORY, TAG, FEATURE, and OPTION_VALUE condition selectors.
  });

  test('supports every EVENT_FIELD comparison operator', () => {
    // Cover EQ, NE, IN, GTE, GT, LTE, and LT with nested paths and typed JSON values.
  });

  test('creates AWARD_FIXED_POINTS and AWARD_SPEND_RATIO actions', () => {
    // Verify decimal-string operands, schema versions, and action-type consistency.
  });

  test('creates point and monetary AWARD_CASHBACK actions', () => {
    // Cover POINTS and MONETARY settlement including explicit and default currency behavior.
  });

  test('creates APPLY_MULTIPLIER and ISSUE_REWARD actions', () => {
    // Verify multiplier boundaries and reward-definition code references.
  });

  test('orders matching rules deterministically by priority and stable identity', () => {
    // Create ties and verify deterministic ordering independent of insertion order.
  });

  test('honors stopProcessing after the first awarded rule', () => {
    // Configure later matching rules and verify the persisted flag controls evaluation order.
  });

  test('updates and deletes rules only on draft versions', () => {
    // Exercise all mutable fields, deletion, version revision behavior, and published immutability.
  });

  test('rejects unsupported schema versions and malformed policy JSON', () => {
    // Cover trigger, condition, action, and limit schema/version mismatches with atomic user errors.
  });

  test('keeps rule codes unique within one program version', () => {
    // Create duplicate codes in one version and equal codes in separate versions to verify scope.
  });
});
