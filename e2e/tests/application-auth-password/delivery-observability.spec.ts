import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import {
  configureDelivery,
  count,
  createRealm,
  createRealmMatrix,
  endpoint,
  expectSecretFree,
  expectSignUp,
  formHeaders,
  requestPasswordReset,
  signIn,
  uniqueEmail,
  withDb,
} from './application-auth-test-kit';

test.describe('Application password auth — delivery and observability', () => {
  test('signin failure response contains no raw credentials or foreign-realm side effect', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const email = uniqueEmail('signin-audit');
    const password = 'Audit-password-123!';
    await expectSignUp(request, realms.a, email, password);
    const response = await signIn(request, realms.a, email, 'Wrong-password-123!');
    expect(response.status()).toBe(401);
    expectSecretFree(await response.text(), [email, password, 'Wrong-password-123!']);
    await withDb(async (sql) => {
      expect(await count(sql, 'application_session', realms.b.applicationId)).toBe(0);
    });
  });

  test('reset response contains no recipient, link, token, or payload', async ({
    api,
    request,
  }) => {
    const realm = await deliveryRealm(api, request);
    const email = uniqueEmail('delivery-redaction');
    await expectSignUp(request, realm, email);
    const response = await requestPasswordReset(request, realm, email);
    expect(response.ok()).toBe(true);
    expectSecretFree(await response.text(), [email]);
    expect(response.headers()['location'] ?? '').not.toContain(email);
  });

  test('protocol failure response exposes only a safe OAuth error', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const code = `malformed-${crypto.randomUUID()}`;
    const response = await request.post(endpoint(realm, '/oauth2/token'), {
      headers: formHeaders(),
      form: {
        grant_type: 'authorization_code',
        code,
        client_id: realm.clientId,
        resource: realm.resource,
      },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expectSecretFree(await response.text(), [code]);
  });

  test('cross-tenant rejection response does not disclose either tenant artifact', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const foreignCode = `foreign-${crypto.randomUUID()}`;
    const response = await request.post(endpoint(realms.b, '/oauth2/token'), {
      headers: formHeaders(),
      form: {
        grant_type: 'authorization_code',
        code: foreignCode,
        client_id: realms.a.clientId,
        resource: realms.a.resource,
      },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expectSecretFree(await response.text(), [
      foreignCode,
      realms.a.applicationId,
      realms.a.organizationId,
    ]);
  });

  test('rate-limit response contains no raw identity or credential', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail('rate-redaction');
    const password = 'Telemetry-password-123!';
    await expectSignUp(request, realm, email, password);
    let limited;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      limited = await signIn(request, realm, email, 'Wrong-password-123!');
    }
    expect(limited!.status()).toBe(429);
    expectSecretFree(await limited!.text(), [email, password, 'Wrong-password-123!']);
  });

  test('error responses contain no stack, SQL, hash, secret, or tenant configuration', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const secret = `response-secret-${crypto.randomUUID()}`;
    const response = await signIn(request, realm, uniqueEmail(), secret);
    expect(response.status()).toBeGreaterThanOrEqual(400);
    const body = await response.text();
    expectSecretFree(body, [secret, realm.organizationId]);
    expect(body).not.toMatch(/stack|node_modules|select\s|postgres|password_hash/iu);
  });

  test('logs, traces, and metrics contain no password, code, token, cookie, link, or client secret', async () => {
    test.fixme(
      true,
      'E2E runtime needs queryable log, trace, and metric capture sinks before this contract is observable',
    );
  });

  test('delivery profile configures distinct server-controlled templates', async ({
    api,
    request,
  }) => {
    const realm = await deliveryRealm(api, request);
    await withDb(async (sql) => {
      const [profile] = await sql<{ verify: string; reset: string; otp: string }[]>`
        select email_verification_template_id as verify,
               password_reset_template_id as reset,
               email_otp_sign_in_template_id as otp
        from iam.application_auth_delivery_profile
        where application_id = ${realm.applicationId}
      `;
      expect(profile).toEqual({
        verify: 'observability-verify',
        reset: 'observability-reset',
        otp: 'observability-otp',
      });
      expect(new Set(Object.values(profile!)).size).toBe(3);
    });
  });

  test('parallel reset requests leave exactly one active verification artifact', async ({
    api,
    request,
  }) => {
    const realm = await deliveryRealm(api, request);
    const email = uniqueEmail('idempotency');
    await expectSignUp(request, realm, email);
    const responses = await Promise.all(
      Array.from({ length: 4 }, () => requestPasswordReset(request, realm, email)),
    );
    expect(responses.every((response) => response.ok() || response.status() === 429)).toBe(true);
    await withDb(async (sql) => {
      const rows = await sql<{ identifier: string; value: string }[]>`
        select identifier, value
        from iam.application_verification
        where application_id = ${realm.applicationId}
      `;
      expect(rows).toHaveLength(1);
      expect(JSON.stringify(rows)).not.toContain(email);
    });
  });

  test('observability sink failure follows contract without exposing secrets', async () => {
    test.fixme(
      true,
      'E2E runtime needs a controllable operational audit sink and durable failure counter',
    );
  });
});

async function deliveryRealm(
  api: Parameters<typeof createRealm>[0],
  request: Parameters<typeof createRealm>[1],
) {
  const realm = await createRealm(api, request, undefined, 'observability', {
    passwordResetEnabled: true,
  });
  await configureDelivery(realm, 'observability');
  return realm;
}
