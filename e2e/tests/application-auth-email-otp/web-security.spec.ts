import { test } from '@fixtures/base.extend';

test.describe('Application email OTP auth — web security', () => {
  test.fixme('cross-origin OTP requests are rejected unless the origin is trusted', async () => {});

  test.fixme('duplicate email or OTP fields are rejected as ambiguous', async () => {});

  test.fixme('OTP responses use application-scoped secure cookie attributes', async () => {});

  test.fixme('hosted OTP forms enforce CSRF and authorization-context binding', async () => {});
});
