import { expect, type APIRequestContext } from '@playwright/test';
import type { ApiFixtures } from '@fixtures/api/api';
import { decodeGlobalId } from '@utils/globalid';

const SMS_PROXY_URL =
  process.env.TEST_ACTION_PROXY_URL ??
  `http://127.0.0.1:${process.env.TEST_ACTION_PROXY_PORT ?? '15000'}`;

interface TestSmsMessage {
  storeId: string;
  to: string;
  text: string;
  deliveryId: string;
  receivedAt: string;
}

interface SmsProxyResponse {
  ok: boolean;
  result?: {
    data?: {
      channels?: string[];
      messages?: TestSmsMessage[];
    };
  };
  error?: { code?: string; message?: string };
}

export async function installTestTwilioSmsProxy(
  api: ApiFixtures['api'],
): Promise<string> {
  const install = await api.admin.mutation('apps-admin-api/AppInstall', {
    variables: {
      input: {
        appCode: 'test-twilio',
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
        message: 'Test Twilio SMS application did not become active',
        timeout: 20_000,
      },
    )
    .toBe('ACTIVE');

  return decodeGlobalId(payload.installation!.id).id;
}

export async function waitForSmsOtp(
  request: APIRequestContext,
  input: {
    storeId: string;
    installationId: string;
    recipient: string;
  },
  timeoutMs = 20_000,
): Promise<{ otp: string; message: TestSmsMessage }> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const response = await request.post(`${SMS_PROXY_URL}/__test/actions/call`, {
      data: {
        action: 'apps.executeCapability',
        params: {
          storeId: input.storeId,
          capability: 'notifications',
          operation: 'getCapabilities',
          installationId: input.installationId,
          input: {
            includeMessages: true,
            to: input.recipient,
          },
        },
      },
    });
    if (!response.ok()) {
      throw new Error(
        `SMS proxy returned ${response.status()}: ${await response.text()}`,
      );
    }

    const body = (await response.json()) as SmsProxyResponse;
    if (!body.ok) {
      throw new Error(
        `SMS proxy failed: ${body.error?.code ?? 'UNKNOWN'} ${body.error?.message ?? ''}`,
      );
    }
    const message = body.result?.data?.messages?.at(-1);
    const otp = message?.text.match(/\b\d{6}\b/u)?.[0];
    if (message && otp) return { otp, message };

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`OTP SMS for ${input.recipient} was not received`);
}
