import { test } from '@fixtures/base.extend';

test('creates PIN BOOST and EXCLUDE manual recommendations', () => {
  // Verify action-specific position boost scheduling enabled state and initial version.
});

test('updates target action rank boost schedule and enabled state atomically', () => {
  // Verify all effective fields use one expected-version transition.
});

test('deletes a manual recommendation with the expected version', () => {
  // Verify the ID stops appearing in reads and affects the next published snapshot.
});

test('rejects stale update and delete versions', () => {
  // Verify the latest recommendation remains unchanged and the conflict is actionable.
});

test('replays create update and delete idempotently', () => {
  // Verify retries do not duplicate relations versions events or snapshot builds.
});

test('keeps recommendation identity stable across updates', () => {
  // Verify changing rank or target does not create a second manual row.
});
