import { test } from '@fixtures/base.extend';

test.describe('Application email OTP auth — application isolation', () => {
  test.fixme('an OTP issued by application A is rejected by application B', async () => {});

  test.fixme('the same email creates independent identities in different applications', async () => {});

  test.fixme('requesting an OTP in one application does not mutate another application', async () => {});

  test.fixme('parallel OTP flows remain isolated across organizations', async () => {});
});
