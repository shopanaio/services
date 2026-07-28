import { test } from '@fixtures/base.extend';

test.describe('Application email OTP auth — signin', () => {
  test.fixme('a valid OTP signs in an existing user only in the target application', async () => {});

  test.fixme('an invalid OTP creates no session or token', async () => {});

  test.fixme('a consumed OTP cannot be replayed', async () => {});

  test.fixme('a blocked user cannot create a new session with a valid OTP', async () => {});
});
