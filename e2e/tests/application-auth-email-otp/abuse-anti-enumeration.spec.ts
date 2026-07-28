import { test } from '@fixtures/base.extend';

test.describe('Application email OTP auth — abuse and anti-enumeration', () => {
  test.fixme('OTP requests use the same public response for known and unknown emails', async () => {});

  test.fixme('OTP request cooldown is scoped to the application and normalized identity', async () => {});

  test.fixme('OTP request identity and IP limits are enforced', async () => {});

  test.fixme('OTP verification attempt limits invalidate the challenge', async () => {});

  test.fixme('parallel verification accepts a valid OTP at most once', async () => {});
});
