import { test } from '@fixtures/base.extend';

test.describe('Application email OTP auth — delivery and observability', () => {
  test.fixme('an OTP request uses the configured target delivery profile and template', async () => {});

  test.fixme('the delivered OTP is six digits and is not stored in plaintext', async () => {});

  test.fixme('delivery failure returns a generic temporarily-unavailable response', async () => {});

  test.fixme('responses, logs, traces, and metrics do not expose the OTP', async () => {});

  test.fixme('Mailpit receives only the email addressed to the target recipient', async () => {});
});
