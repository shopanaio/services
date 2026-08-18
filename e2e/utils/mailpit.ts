import { expect } from '@playwright/test';
import type { ApiFixtures } from '@fixtures/api/api';

const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://127.0.0.1:18025';

export async function installMailpitSmtp(api: ApiFixtures['api']): Promise<void> {
  const install = await api.admin.mutation('apps-admin-api/AppInstall', {
    variables: {
      input: {
        appCode: 'shopana-smtp',
        configuration: {
          host: '127.0.0.1',
          port: 11025,
          security: 'NONE',
        },
        clientMutationId: crypto.randomUUID(),
      },
    },
  });
  const payload = install.data.appsMutation.appInstall;
  expect(payload.userErrors).toEqual([]);
  expect(payload.installation).not.toBeNull();
  await expect
    .poll(
      async () => {
        const response = await api.admin.query('apps-admin-api/AppInstallation', {
          variables: { id: payload.installation!.id },
        });
        return response.data.appsQuery.appInstallation?.status;
      },
      {
        message: 'Mailpit SMTP application did not become active',
        timeout: 20_000,
      },
    )
    .toBe('ACTIVE');

  const connection = await api.admin.mutation('apps-smtp-admin/SmtpConnectionCreate', {
    variables: {
      input: {
        displayName: 'E2E Mailpit',
        provider: 'CUSTOM',
        host: '127.0.0.1',
        port: 11025,
        security: 'NONE',
      },
    },
  });
  const connectionPayload = connection.data.smtpAppMutation.smtpConnectionCreate;
  expect(connectionPayload.userErrors).toEqual([]);
  expect(connectionPayload.connection?.status).toBe('ACTIVE');
}

export async function waitForEmailVerificationLink(
  recipient: string,
  timeoutMs = 30_000,
  previousLink?: string | null,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const verificationUrl = await latestEmailVerificationLink(recipient);
    if (verificationUrl && verificationUrl !== previousLink) return verificationUrl;

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Email verification link for ${recipient} was not received`);
}

export async function latestEmailVerificationLink(recipient: string): Promise<string | null> {
  const query = encodeURIComponent(`to:"${recipient}"`);
  const response = await fetch(`${MAILPIT_URL}/view/latest.txt?query=${query}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Mailpit returned ${response.status}: ${await response.text()}`);
  }
  const email = await response.text();
  const link = email.match(/https?:\/\/[^\s<>"']+\/verify-email\?[^\s<>"']+/u)?.[0];
  return link
    ? link.replaceAll('&amp;', '&').replace(/&#(?:x3d|61);/giu, '=')
    : null;
}

export async function waitForEmailOtp(
  recipient: string,
  timeoutMs = 10_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  const query = encodeURIComponent(`to:"${recipient}"`);

  while (Date.now() < deadline) {
    const response = await fetch(
      `${MAILPIT_URL}/view/latest.txt?query=${query}`,
    );

    if (response.ok) {
      const email = await response.text();
      const otp = email.match(/\b\d{6}\b/)?.[0];

      if (otp) {
        return otp;
      }
    } else if (response.status !== 404) {
      throw new Error(
        `Mailpit returned ${response.status}: ${await response.text()}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`OTP email for ${recipient} was not received`);
}

export async function expectNoEmailOtp(
  recipient: string,
  quietPeriodMs = 5_000,
): Promise<void> {
  const deadline = Date.now() + quietPeriodMs;
  const query = encodeURIComponent(`to:"${recipient}"`);

  while (Date.now() < deadline) {
    const response = await fetch(
      `${MAILPIT_URL}/view/latest.txt?query=${query}`,
    );
    if (response.ok) {
      throw new Error(`Unexpected OTP email was delivered to ${recipient}`);
    }
    if (response.status !== 404) {
      throw new Error(
        `Mailpit returned ${response.status}: ${await response.text()}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}
