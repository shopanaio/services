import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import {
  applicationCookie,
  configureDelivery,
  count,
  createRealm,
  createRealmMatrix,
  endpoint,
  expectRealmState,
  expectSecretFree,
  formHeaders,
  iamBaseUrl,
  jsonHeaders,
  realmState,
  setUserState,
  signIn,
  signUp,
  uniqueEmail,
  userForEmail,
  withDb,
} from './application-auth-test-kit';

test.describe('Application password auth — email verification', () => {
  test('a valid link verifies only its target user', async ({
    api,
    request,
  }) => {
    const realms = await createVerificationRealms(api, request);
    const email = uniqueEmail('verify');
    await signUpExpectingVerification(request, realms.a, email);
    const token = await latestVerificationToken(request, realms.a, email);

    const response = await verifyEmail(request, realms.a, token);

    expect(response.status()).toBeLessThan(400);
    expect((await userForEmail(realms.a, email))?.emailVerified).toBe(true);
    expect(await userForEmail(realms.b, email)).toBeNull();
  });

  test('verification link replay is idempotent and cannot create authorization', async ({
    api,
    request,
  }) => {
    const realm = await createVerificationRealm(api, request);
    const email = uniqueEmail('replay');
    await signUpExpectingVerification(request, realm, email);
    const token = await latestVerificationToken(request, realm, email);
    const first = await verifyEmail(request, realm, token);
    expect(first.status()).toBeLessThan(400);
    const before = await realmState(realm);

    const replay = await verifyEmail(request, realm, token);

    expect(replay.status()).toBeLessThan(400);
    expect((await userForEmail(realm, email))?.emailVerified).toBe(true);
    await expectRealmState(realm, before);
  });

  test('expired verification link leaves the user unverified', async () => {
    test.fixme(
      true,
      'Better Auth email verification uses a signed JWT; E2E needs an injectable clock or configurable short verification TTL',
    );
  });

  test('tampered verification link fails closed', async ({ api, request }) => {
    const realm = await createVerificationRealm(api, request);
    const email = uniqueEmail('tampered');
    await signUpExpectingVerification(request, realm, email);
    const token = await latestVerificationToken(request, realm, email);
    const before = await realmState(realm);

    const response = await verifyEmail(request, realm, `${token}.tampered`);

    expectVerificationErrorRedirect(response, realm);
    expect((await userForEmail(realm, email))?.emailVerified).toBe(false);
    await expectRealmState(realm, before);
  });

  test('verification token from application A is rejected in B', async ({
    api,
    request,
  }) => {
    const realms = await createVerificationRealms(api, request);
    const email = uniqueEmail('foreign');
    await signUpExpectingVerification(request, realms.a, email);
    const token = await latestVerificationToken(request, realms.a, email);
    const beforeA = await realmState(realms.a);
    const beforeB = await realmState(realms.b);

    const response = await verifyEmail(request, realms.b, token);

    expectVerificationErrorRedirect(response, realms.b);
    expect((await userForEmail(realms.a, email))?.emailVerified).toBe(false);
    await expectRealmState(realms.a, beforeA);
    await expectRealmState(realms.b, beforeB);
  });

  test('trusted callback cannot transfer verification or authorization to a foreign realm', async ({
    api,
    request,
  }) => {
    const realms = await createVerificationRealms(api, request);
    const email = uniqueEmail('context');
    await signUpExpectingVerification(request, realms.a, email);
    const token = await latestVerificationToken(request, realms.a, email);
    const beforeA = await realmState(realms.a);
    const beforeB = await realmState(realms.b);

    const response = await request.get(
      `${endpoint(realms.a, '/verify-email')}?token=${encodeURIComponent(token)}&callbackURL=${encodeURIComponent(endpoint(realms.b, '/verified'))}&client_id=${encodeURIComponent(realms.b.clientId)}`,
      { maxRedirects: 0 },
    );

    expect(response.status()).toBeGreaterThanOrEqual(300);
    expect(response.status()).toBeLessThan(400);
    expect(response.headers()['location']).toBe(endpoint(realms.b, '/verified'));
    expect(response.headers()['set-cookie']).toBeUndefined();
    expect((await userForEmail(realms.a, email))?.emailVerified).toBe(true);
    expect(await userForEmail(realms.b, email)).toBeNull();
    await expectRealmState(realms.a, beforeA);
    await expectRealmState(realms.b, beforeB);
    await expectNoAuthorizedArtifacts(realms.b.applicationId);
  });

  test('verification resend dispatches through the configured target delivery profile', async ({
    api,
    request,
  }) => {
    const realm = await createVerificationRealm(api, request);
    const email = uniqueEmail('resend');
    await signUpExpectingVerification(request, realm, email);
    const firstDelivery = await latestVerificationDelivery(request, realm, email);

    const response = await request.post(endpoint(realm, '/send-verification-email'), {
      headers: jsonHeaders(),
      data: { email, callbackURL: endpoint(realm, '/verified') },
    });

    expect(response.ok(), await response.text()).toBe(true);
    const deliveries = await verificationDeliveries(request, realm, email, 2);
    const secondDelivery = deliveries.at(-1)!;
    expect(secondDelivery).toMatchObject({
      applicationId: realm.applicationId,
      recipient: email,
      templateId: 'verify-verify',
      purpose: 'email_verification_link',
    });
    expect(secondDelivery.payload.url).toContain(endpoint(realm, '/verify-email'));
    expect(secondDelivery.idempotencyKey).toBeTruthy();
    expect(firstDelivery.payload.url).toContain(endpoint(realm, '/verify-email'));
  });

  test('verification of an already verified user is safe and non-destructive', async ({
    api,
    request,
  }) => {
    const realm = await createVerificationRealm(api, request);
    const email = uniqueEmail('already');
    await signUpExpectingVerification(request, realm, email);
    const token = await latestVerificationToken(request, realm, email);
    await setUserState(realm, email, { emailVerified: true });
    const before = await realmState(realm);

    const response = await verifyEmail(request, realm, token);

    expect(response.status()).toBeLessThan(500);
    expect((await userForEmail(realm, email))?.emailVerified).toBe(true);
    const after = await realmState(realm);
    expect(after.application_user).toBe(before.application_user);
    expect(after.application_account).toBe(before.application_account);
    expect(after.application_session).toBe(before.application_session);
  });

  test('unverified user cannot receive a full session or tokens when verification is required', async ({
    api,
    request,
  }) => {
    const realm = await createVerificationRealm(api, request);
    const email = uniqueEmail('unverified');
    const signup = await signUpExpectingVerification(request, realm, email);
    expect(signup.headers()['set-cookie']).toBeUndefined();

    const signin = await signIn(request, realm, email);

    expect(signin.status()).toBeGreaterThanOrEqual(400);
    expect(signin.headers()['set-cookie']).toBeUndefined();
    await expectNoAuthorizedArtifacts(realm.applicationId);
  });

  test('verified user passes the verification gate on subsequent signin', async ({
    api,
    request,
  }) => {
    const realm = await createVerificationRealm(api, request);
    const email = uniqueEmail('verified');
    await signUpExpectingVerification(request, realm, email);
    const token = await latestVerificationToken(request, realm, email);
    const verification = await verifyEmail(request, realm, token);
    expect(verification.status()).toBeLessThan(400);

    const signin = await signIn(request, realm, email);

    expect(signin.ok(), await signin.text()).toBe(true);
    expect(applicationCookie(signin, realm)).toContain(realm.applicationId);
  });

  test('target realm has an isolated email-verification delivery profile and captured delivery', async ({
    api,
    request,
  }) => {
    const realms = await createVerificationRealms(api, request);
    const email = uniqueEmail('delivery');
    await signUpExpectingVerification(request, realms.a, email);

    await withDb(async (sql) => {
      const [profile] = await sql<
        { verify: string; reset: string; otp: string }[]
      >`
        select email_verification_template_id as verify,
               password_reset_template_id as reset,
               email_otp_sign_in_template_id as otp
        from iam.application_auth_delivery_profile
        where application_id = ${realms.a.applicationId}
      `;
      expect(profile).toEqual({
        verify: 'verify-a-verify',
        reset: 'verify-a-reset',
        otp: 'verify-a-otp',
      });
    });
    const delivery = await latestVerificationDelivery(request, realms.a, email);
    expect(delivery).toMatchObject({
      applicationId: realms.a.applicationId,
      recipient: email,
      templateId: 'verify-a-verify',
      purpose: 'email_verification_link',
    });
    expect(await capturedDeliveries(request, realms.b)).toEqual([]);
  });

  test('verification token is absent from the public error response, redirect, and cookies', async ({
    api,
    request,
  }) => {
    const realm = await createVerificationRealm(api, request);
    const email = uniqueEmail('secret');
    await signUpExpectingVerification(request, realm, email);
    const token = await latestVerificationToken(request, realm, email);

    const response = await verifyEmail(request, realm, `${token}.invalid`);

    expectVerificationErrorRedirect(response, realm);
    expectSecretFree(await response.text(), [token, email]);
    expect(response.headers()['location'] ?? '').not.toContain(token);
    expect(response.headers()['set-cookie'] ?? '').not.toContain(token);
  });
});

async function createVerificationRealm(
  api: Parameters<typeof createRealm>[0],
  request: Parameters<typeof createRealm>[1],
) {
  const realm = await createRealm(api, request, undefined, 'verify', {
    emailVerificationRequired: true,
  });
  await configureDelivery(realm, 'verify');
  return realm;
}

async function createVerificationRealms(
  api: Parameters<typeof createRealmMatrix>[0],
  request: Parameters<typeof createRealmMatrix>[1],
) {
  const realms = await createRealmMatrix(api, request, {
    emailVerificationRequired: true,
  });
  await Promise.all([
    configureDelivery(realms.a, 'verify-a'),
    configureDelivery(realms.a2, 'verify-a2'),
    configureDelivery(realms.b, 'verify-b'),
  ]);
  return realms;
}

async function signUpExpectingVerification(
  request: Parameters<typeof signUp>[0],
  realm: Parameters<typeof signUp>[1],
  email: string,
) {
  const response = await signUp(request, realm, email);
  expect(response.ok(), await response.text()).toBe(true);
  expect((await userForEmail(realm, email))?.emailVerified).toBe(false);
  return response;
}

interface CapturedEmailDelivery {
  idempotencyKey: string;
  applicationId: string;
  deliveryProfileId: string;
  purpose: 'email_verification_link' | 'password_reset_link' | 'email_otp_sign_in';
  recipient: string;
  templateId: string;
  payload: { url: string } | { otp: string };
}

async function latestVerificationToken(
  request: Parameters<typeof signUp>[0],
  realm: Parameters<typeof signUp>[1],
  email: string,
): Promise<string> {
  const delivery = await latestVerificationDelivery(request, realm, email);
  expect('url' in delivery.payload).toBe(true);
  const token = new URL((delivery.payload as { url: string }).url).searchParams.get('token');
  expect(token).toBeTruthy();
  return token!;
}

async function latestVerificationDelivery(
  request: Parameters<typeof signUp>[0],
  realm: Parameters<typeof signUp>[1],
  email: string,
): Promise<CapturedEmailDelivery & { payload: { url: string } }> {
  const deliveries = await verificationDeliveries(request, realm, email, 1);
  return deliveries.at(-1)!;
}

async function verificationDeliveries(
  request: Parameters<typeof signUp>[0],
  realm: Parameters<typeof signUp>[1],
  email: string,
  minimum: number,
): Promise<Array<CapturedEmailDelivery & { payload: { url: string } }>> {
  let matches: Array<CapturedEmailDelivery & { payload: { url: string } }> = [];
  await expect
    .poll(async () => {
      matches = (await capturedDeliveries(request, realm)).filter(
        (delivery): delivery is CapturedEmailDelivery & { payload: { url: string } } =>
          delivery.purpose === 'email_verification_link' &&
          delivery.recipient === email &&
          'url' in delivery.payload,
      );
      return matches.length;
    })
    .toBeGreaterThanOrEqual(minimum);
  return matches;
}

async function capturedDeliveries(
  request: Parameters<typeof signUp>[0],
  realm: Parameters<typeof signUp>[1],
): Promise<CapturedEmailDelivery[]> {
  const response = await request.get(
    `${iamBaseUrl}/e2e/application-auth/email-deliveries?applicationId=${encodeURIComponent(realm.applicationId)}`,
  );
  expect(response.ok(), await response.text()).toBe(true);
  const body = (await response.json()) as { deliveries: CapturedEmailDelivery[] };
  return body.deliveries;
}

async function verifyEmail(
  request: Parameters<typeof signUp>[0],
  realm: Parameters<typeof signUp>[1],
  token: string,
) {
  return request.get(
    `${endpoint(realm, '/verify-email')}?token=${encodeURIComponent(token)}&callbackURL=${encodeURIComponent(endpoint(realm, '/verified'))}`,
    { headers: formHeaders(), maxRedirects: 0 },
  );
}

function expectVerificationErrorRedirect(
  response: Awaited<ReturnType<typeof verifyEmail>>,
  realm: Parameters<typeof verifyEmail>[1],
): void {
  expect(response.status()).toBeGreaterThanOrEqual(300);
  expect(response.status()).toBeLessThan(400);
  const location = response.headers()['location'];
  expect(location).toBeTruthy();
  const target = new URL(location!);
  expect(`${target.origin}${target.pathname}`).toBe(endpoint(realm, '/verified'));
  expect(target.searchParams.get('error')).toBeTruthy();
}

async function expectNoAuthorizedArtifacts(applicationId: string): Promise<void> {
  await withDb(async (sql) => {
    expect(await count(sql, 'application_session', applicationId)).toBe(0);
    expect(await count(sql, 'application_oauth_access_token', applicationId)).toBe(0);
    expect(await count(sql, 'application_oauth_refresh_token', applicationId)).toBe(0);
  });
}
