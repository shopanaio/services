import { test } from '@fixtures/base.extend';

test.describe('Application email OTP auth — session and token lifecycle', () => {
  test.fixme('standalone OTP signin creates a session without OAuth tokens', async () => {});

  test.fixme('signout revokes only the authenticated application session', async () => {});

  test.fixme('an expired application session cannot access protected endpoints', async () => {});

  test.fixme('disabling the user invalidates sessions created through OTP signin', async () => {});
});
