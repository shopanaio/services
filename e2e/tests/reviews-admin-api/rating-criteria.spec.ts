import { test } from '@fixtures/base.extend';

test('creates a rating criterion with definitions translations and assignments', () => {
  // Verify target type scale required state ordering and initial timestamps.
});

test('updates criterion properties translations applicability and assignments atomically', () => {
  // Verify expectedUpdatedAt guards every nested operation.
});

test('deletes an unused criterion and removes it from Storefront rating requirements', () => {
  // Verify deletion leaves historical review ratings readable.
});

test('rejects deletion or incompatible edits while active content depends on a criterion', () => {
  // Verify historical rating semantics cannot be corrupted.
});

test('validates unique handles localized labels scale and assignment precedence', () => {
  // Verify duplicate and impossible criterion definitions return field-level errors.
});

test('lists filters sorts and paginates criteria with stable Relay cursors', () => {
  // Verify edges nodes pageInfo totalCount and deterministic tie breakers.
});

test('isolates product category and global criterion assignments by store', () => {
  // Verify foreign targets cannot enter applicability rules.
});
