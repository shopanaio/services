import { test } from '@fixtures/base.extend';

test.describe('Storefront checkout tags', () => {
  test('creates a checkout tag after checkout creation', () => {
    // TODO: Verify tag metadata is projected.
  });

  test('updates a checkout tag slug and uniqueness setting', () => {
    // TODO: Verify tag definition persistence.
  });

  test('deletes a tag and atomically clears its line assignments', () => {
    // TODO: Verify no pipeline recalculation is required.
  });

  test('allows non-unique tags on multiple lines', () => {
    // TODO: Verify repeated assignments are preserved.
  });

  test('enforces unique tags across checkout lines', () => {
    // TODO: Verify duplicate assignments are rejected.
  });

  test('rejects making a tag unique while assigned to multiple lines', () => {
    // TODO: Verify existing assignments remain unchanged.
  });

  test('rejects duplicate or invalid tag slugs', () => {
    // TODO: Verify input validation errors are storefront-safe.
  });
});
