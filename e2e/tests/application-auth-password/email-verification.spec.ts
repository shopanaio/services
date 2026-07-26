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
  test('a valid link verifies only its target user and is consumed once', async ({
    api,
    request,
  }) => {
    const realms = await createVerificationRealms(api, request);
    const email = uniqueEmail('verify');
    await signUpExpectingVerification(request, realms.a, email);
    const token = await latestVerificationToken(realms.a.applicationId);

    const response = await verifyEmail(request, realms.a, token);

    expect(response.status()).toBeLessThan(400);
    expect((await userForEmail(realms.a, email))?.emailVerified).toBe(true);
    expect(await userForEmail(realms.b, email)).toBeNull();
    expect(await verificationCount(realms.a.applicationId, token)).toBe(0);
  });

  test('verification link replay cannot change state or create authorization', async ({
    api,
    request,
  }) => {
    const realm = await createVerificationRealm(api, request);
    const email = uniqueEmail('replay');
    await signUpExpectingVerification(request, realm, email);
    const token = await latestVerificationToken(realm.applicationId);
    const first = await verifyEmail(request, realm, token);
    expect(first.status()).toBeLessThan(400);
    const before = await realmState(realm);

    const replay = await verifyEmail(request, realm, token);

    expect(replay.status()).toBeGreaterThanOrEqual(400);
    await expectRealmState(realm, before);
  });

  test('expired verification link leaves the user unverified', async ({
    api,
    request,
  }) => {
    const realm = await createVerificationRealm(api, request);
    const email = uniqueEmail('expired');
    await signUpExpectingVerification(request, realm, email);
    const token = await latestVerificationToken(realm.applicationId);
    await expireVerification(realm.applicationId, token);
    const before = await realmState(realm);

    const response = await verifyEmail(request, realm, token);

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect((await userForEmail(realm, email))?.emailVerified).toBe(false);
    await expectRealmState(realm, before);
  });

  test('tampered verification link fails closed', async ({ api, request }) => {
    const realm = await createVerificationRealm(api, request);
    const email = uniqueEmail('tampered');
    await signUpExpectingVerification(request, realm, email);
    const token = await latestVerificationToken(realm.applicationId);
    const before = await realmState(realm);

    const response = await verifyEmail(request, realm, `${token}.tampered`);

    expect(response.status()).toBeGreaterThanOrEqual(400);
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
    const token = await latestVerificationToken(realms.a.applicationId);
    const beforeA = await realmState(realms.a);
    const beforeB = await realmState(realms.b);

    const response = await verifyEmail(request, realms.b, token);

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect((await userForEmail(realms.a, email))?.emailVerified).toBe(false);
    await expectRealmState(realms.a, beforeA);
    await expectRealmState(realms.b, beforeB);
  });

  test('foreign client or authorization context cannot capture verification', async ({
    api,
    request,
  }) => {
    const realms = await createVerificationRealms(api, request);
    const email = uniqueEmail('context');
    await signUpExpectingVerification(request, realms.a, email);
    const token = await latestVerificationToken(realms.a.applicationId);
    const beforeA = await realmState(realms.a);
    const beforeB = await realmState(realms.b);

    const response = await request.get(
      `${endpoint(realms.a, '/verify-email')}?token=${encodeURIComponent(token)}&callbackURL=${encodeURIComponent(endpoint(realms.b, '/verified'))}&client_id=${encodeURIComponent(realms.b.clientId)}`,
      { maxRedirects: 0 },
    );

    expect(response.status()).toBeGreaterThanOrEqual(400);
    await expectRealmState(realms.a, beforeA);
    await expectRealmState(realms.b, beforeB);
  });

  test('verification resend follows the configured link rotation contract', async ({
    api,
    request,
  }) => {
    const realm = await createVerificationRealm(api, request);
    const email = uniqueEmail('resend');
    await signUpExpectingVerification(request, realm, email);
    const firstToken = await latestVerificationToken(realm.applicationId);

    const response = await request.post(endpoint(realm, '/send-verification-email'), {
      headers: jsonHeaders(),
      data: { email, callbackURL: endpoint(realm, '/verified') },
    });

    expect(response.ok(), await response.text()).toBe(true);
    const secondToken = await latestVerificationToken(realm.applicationId);
    expect(secondToken).not.toBe(firstToken);
    expect(await verificationCount(realm.applicationId, firstToken)).toBe(0);
    expect(await verificationCount(realm.applicationId, secondToken)).toBe(1);
  });

  test('verification of an already verified user is safe and non-destructive', async ({
    api,
    request,
  }) => {
    const realm = await createVerificationRealm(api, request);
    const email = uniqueEmail('already');
    await signUpExpectingVerification(request, realm, email);
    const token = await latestVerificationToken(realm.applicationId);
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
    const token = await latestVerificationToken(realm.applicationId);
    const verification = await verifyEmail(request, realm, token);
    expect(verification.status()).toBeLessThan(400);

    const signin = await signIn(request, realm, email);

    expect(signin.ok(), await signin.text()).toBe(true);
    expect(applicationCookie(signin, realm)).toContain(realm.applicationId);
  });

  test('capture delivery uses only the target realm email verification purpose and template', async ({
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
      expect(await count(sql, 'application_verification', realms.a.applicationId)).toBe(1);
      expect(await count(sql, 'application_verification', realms.b.applicationId)).toBe(0);
    });
  });

  test('verification links and tokens are absent from errors, telemetry, and browser storage', async ({
    api,
    request,
  }) => {
    const realm = await createVerificationRealm(api, request);
    const email = uniqueEmail('secret');
    await signUpExpectingVerification(request, realm, email);
    const token = await latestVerificationToken(realm.applicationId);

    const response = await verifyEmail(request, realm, `${token}.invalid`);

    expect(response.status()).toBeGreaterThanOrEqual(400);
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

async function latestVerificationToken(applicationId: string): Promise<string> {
  return withDb(async (sql) => {
    const [row] = await sql<{ value: string }[]>`
      select value
      from iam.application_verification
      where application_id = ${applicationId}
      order by created_at desc
      limit 1
    `;
    expect(row).toBeDefined();
    return row!.value;
  });
}

async function verificationCount(applicationId: string, value: string): Promise<number> {
  return withDb(async (sql) => {
    const [row] = await sql<{ count: number }[]>`
      select count(*)::int as count
      from iam.application_verification
      where application_id = ${applicationId} and value = ${value}
    `;
    return row!.count;
  });
}

async function expireVerification(applicationId: string, value: string): Promise<void> {
  await withDb(
    (sql) => sql`
      update iam.application_verification
      set expires_at = now() - interval '1 second'
      where application_id = ${applicationId} and value = ${value}
    `,
  );
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

async function expectNoAuthorizedArtifacts(applicationId: string): Promise<void> {
  await withDb(async (sql) => {
    expect(await count(sql, 'application_session', applicationId)).toBe(0);
    expect(await count(sql, 'application_oauth_access_token', applicationId)).toBe(0);
    expect(await count(sql, 'application_oauth_refresh_token', applicationId)).toBe(0);
  });
}
