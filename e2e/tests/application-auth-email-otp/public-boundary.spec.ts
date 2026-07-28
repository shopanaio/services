import { test } from '@fixtures/base.extend';

test.describe('Application email OTP auth — public boundary', () => {
  test.fixme('an active realm exposes only enabled email OTP routes', async () => {});

  test.fixme('a disabled email OTP method returns not found', async () => {});

  test.fixme('a disabled realm rejects OTP request and verification endpoints', async () => {});

  test.fixme('unsupported email OTP purposes remain inaccessible', async () => {});

  test.fixme('malformed OTP payloads fail without reflecting email or code', async () => {});
});
