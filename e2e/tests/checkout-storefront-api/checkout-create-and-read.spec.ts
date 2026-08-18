import { test } from '@fixtures/base.extend';

test.describe('Storefront checkout creation and reads', () => {
  test('creates an empty checkout with the requested channel, locale, and currency', () => {
    // TODO: Verify the initial invalid CART_EMPTY snapshot.
  });

  test('creates a checkout with initial lines in one pipeline execution', () => {
    // TODO: Verify no second add-lines recalculation occurs.
  });

  test('creates a checkout with external source and external ID', () => {
    // TODO: Verify external attribution is persisted.
  });

  test('creates a checkout with initial tag definitions and line assignments', () => {
    // TODO: Verify tag projections are returned.
  });

  test('rejects a non-variant global ID as purchasableId', () => {
    // TODO: Verify trusted merchandise snapshots cannot be submitted.
  });

  test('rejects an invalid purchase configuration', () => {
    // TODO: Cover ONE_TIME and SUBSCRIPTION validation.
  });

  test('replays checkout creation idempotently for the same caller and request', () => {
    // TODO: Verify checkout ID and revision stay identical.
  });

  test('rejects reuse of a checkout creation idempotency key with different input', () => {
    // TODO: Verify the pipeline is not invoked again.
  });

  test('reads the committed checkout snapshot after creation', () => {
    // TODO: Verify query and mutation projections match.
  });

  test('does not expose a checkout to a different storefront visitor', () => {
    // TODO: Verify ownership isolation.
  });

  test('does not expose a checkout to a different storefront connection', () => {
    // TODO: Verify connection isolation.
  });

  test('does not replay a create idempotency key across storefront connections', () => {
    // TODO: Verify connectionId is part of the create idempotency identity.
  });

  test('rejects malformed or wrong-type global IDs without disclosing checkout existence', () => {
    // TODO: Cover checkout query and every checkoutId transport boundary.
  });

  test('returns ordered issues, notifications, lines, groups, and methods from the committed snapshot', () => {
    // TODO: Verify canonical projection ordering.
  });
});
