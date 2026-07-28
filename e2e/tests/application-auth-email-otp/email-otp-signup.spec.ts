import { test } from '@fixtures/base.extend';

test.describe('Application email OTP auth — signup', () => {
  test.fixme('a valid OTP creates a verified user and application session', async () => {});

  test.fixme('signup-disabled realm does not create a user for an unknown email', async () => {});

  test.fixme('OTP signup normalizes email before creating the identity', async () => {});

  test.fixme('replaying a signup OTP cannot create another user or session', async () => {});
});
