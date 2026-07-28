import { test } from '@fixtures/base.extend';

test.describe('Application email OTP auth — live validation', () => {
  test.fixme('disabling the realm stops an in-flight OTP flow', async () => {});

  test.fixme('disabling email OTP invalidates an already-issued challenge', async () => {});

  test.fixme('changing the delivery profile is observed by the next OTP request', async () => {});

  test.fixme('archiving the application rejects OTP request and verification', async () => {});
});
