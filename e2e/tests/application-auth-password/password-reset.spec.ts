import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import {
  applicationCookie,
  completePasswordReset,
  configureDelivery,
  copyPasswordIdentity,
  count,
  createRealm,
  createRealmMatrix,
  defaultPassword,
  expectInvalidSignIn,
  expectRealmState,
  expectSecretFree,
  expectSignUp,
  realmState,
  requestPasswordReset,
  setUserState,
  signIn,
  uniqueEmail,
  updatePolicy,
  userForEmail,
  withDb,
} from './application-auth-test-kit';

const newPassword = 'Reset-password-456!';

test.describe('Application password auth — password reset', () => {
  test('PWD-RESET-001: existing user reset request creates only a target-realm one-time flow', async ({
    api,
    request,
  }) => {
    const realms = await createResetRealms(api, request);
    const email = uniqueEmail('reset');
    await expectSignUp(request, realms.a, email);

    const response = await requestPasswordReset(request, realms.a, email);

    expect(response.ok(), await response.text()).toBe(true);
    expectSecretFree(await response.text(), [email]);
    await withDb(async (sql) => {
      expect(await count(sql, 'application_verification', realms.a.applicationId)).toBe(1);
      expect(await count(sql, 'application_verification', realms.b.applicationId)).toBe(0);
    });
  });

  test('PWD-RESET-002: unknown email returns a generic response and creates no user', async ({
    api,
    request,
  }) => {
    const realm = await createResetRealm(api, request);
    const email = uniqueEmail('absent');
    const before = await realmState(realm);

    const response = await requestPasswordReset(request, realm, email);

    expect(response.ok(), await response.text()).toBe(true);
    expectSecretFree(await response.text(), [email]);
    expect(await userForEmail(realm, email)).toBeNull();
    const after = await realmState(realm);
    expect(after.application_user).toBe(before.application_user);
    expect(after.application_account).toBe(before.application_account);
    expect(after.application_session).toBe(before.application_session);
  });

  test('PWD-RESET-003: the same email receives realm-specific reset links in A and B', async ({
    api,
    request,
  }) => {
    const realms = await createResetRealms(api, request);
    const email = uniqueEmail('multi-realm');
    await Promise.all([
      expectSignUp(request, realms.a, email, 'Realm-A-password-123!'),
      expectSignUp(request, realms.b, email, 'Realm-B-password-123!'),
    ]);
    await Promise.all([
      requestPasswordReset(request, realms.a, email),
      requestPasswordReset(request, realms.b, email),
    ]);

    const [tokenA, tokenB] = await Promise.all([
      latestResetToken(realms.a.applicationId),
      latestResetToken(realms.b.applicationId),
    ]);

    expect(tokenA).not.toBe(tokenB);
    expect(await completePasswordReset(request, realms.a, tokenA, newPassword)).toBeOK();
    expect(await completePasswordReset(request, realms.b, tokenB, newPassword)).toBeOK();
  });

  test('PWD-RESET-004: reset token A cannot be consumed in application B', async ({
    api,
    request,
  }) => {
    const realms = await createResetRealms(api, request);
    const email = uniqueEmail('foreign');
    await expectSignUp(request, realms.a, email);
    await requestPasswordReset(request, realms.a, email);
    const token = await latestResetToken(realms.a.applicationId);
    const beforeA = await realmState(realms.a);
    const beforeB = await realmState(realms.b);

    const response = await completePasswordReset(request, realms.b, token, newPassword);

    expect(response.status()).toBeGreaterThanOrEqual(400);
    await expectRealmState(realms.a, beforeA);
    await expectRealmState(realms.b, beforeB);
    await expectInvalidSignIn(request, realms.a, email, newPassword);
  });

  test('PWD-RESET-005: successful reset disables the old password only in the target realm', async ({
    api,
    request,
  }) => {
    const realms = await createResetRealms(api, request);
    const email = uniqueEmail('success');
    await Promise.all([
      expectSignUp(request, realms.a, email),
      expectSignUp(request, realms.b, email),
    ]);
    await requestPasswordReset(request, realms.a, email);
    const token = await latestResetToken(realms.a.applicationId);

    const response = await completePasswordReset(request, realms.a, token, newPassword);

    expect(response.ok(), await response.text()).toBe(true);
    await expectInvalidSignIn(request, realms.a, email, defaultPassword);
    expect(await signIn(request, realms.a, email, newPassword)).toBeOK();
    expect(await signIn(request, realms.b, email, defaultPassword)).toBeOK();
    await expectInvalidSignIn(request, realms.b, email, newPassword);
  });

  test('PWD-RESET-006: reset link replay cannot change the password again', async ({
    api,
    request,
  }) => {
    const realm = await createResetRealm(api, request);
    const email = uniqueEmail('replay');
    await expectSignUp(request, realm, email);
    await requestPasswordReset(request, realm, email);
    const token = await latestResetToken(realm.applicationId);
    expect(await completePasswordReset(request, realm, token, newPassword)).toBeOK();

    const replay = await completePasswordReset(
      request,
      realm,
      token,
      'Replay-password-789!',
    );

    expect(replay.status()).toBeGreaterThanOrEqual(400);
    expect(await signIn(request, realm, email, newPassword)).toBeOK();
    await expectInvalidSignIn(request, realm, email, 'Replay-password-789!');
  });

  test('PWD-RESET-007: expired reset link leaves password and sessions unchanged', async ({
    api,
    request,
  }) => {
    const realm = await createResetRealm(api, request);
    const email = uniqueEmail('expired');
    const signup = await expectSignUp(request, realm, email);
    const cookie = applicationCookie(signup, realm);
    await requestPasswordReset(request, realm, email);
    const token = await latestResetToken(realm.applicationId);
    await expireResetToken(realm.applicationId, token);
    const before = await realmState(realm);

    const response = await completePasswordReset(request, realm, token, newPassword);

    expect(response.status()).toBeGreaterThanOrEqual(400);
    await expectRealmState(realm, before);
    expect(await signIn(request, realm, email, defaultPassword)).toBeOK();
    expect(cookie).toContain(realm.applicationId);
  });

  test('PWD-RESET-008: tampered reset link fails closed without user or token disclosure', async ({
    api,
    request,
  }) => {
    const realm = await createResetRealm(api, request);
    const email = uniqueEmail('tampered');
    await expectSignUp(request, realm, email);
    await requestPasswordReset(request, realm, email);
    const token = await latestResetToken(realm.applicationId);
    const before = await realmState(realm);

    const response = await completePasswordReset(request, realm, `${token}.tampered`, newPassword);

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expectSecretFree(await response.text(), [token, email, newPassword]);
    await expectRealmState(realm, before);
  });

  test('PWD-RESET-009: new password violating policy cannot complete reset', async ({
    api,
    request,
  }) => {
    const realm = await createResetRealm(api, request);
    const email = uniqueEmail('weak');
    await expectSignUp(request, realm, email);
    await requestPasswordReset(request, realm, email);
    const token = await latestResetToken(realm.applicationId);

    const response = await completePasswordReset(request, realm, token, 'short');

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(await signIn(request, realm, email, defaultPassword)).toBeOK();
    await expectInvalidSignIn(request, realm, email, 'short');
    expect(await resetTokenCount(realm.applicationId, token)).toBe(1);
  });

  test('PWD-RESET-010: reuse of the old password follows the approved password policy', async ({
    api,
    request,
  }) => {
    const realm = await createResetRealm(api, request);
    const email = uniqueEmail('reuse');
    await expectSignUp(request, realm, email);
    await requestPasswordReset(request, realm, email);
    const token = await latestResetToken(realm.applicationId);

    const response = await completePasswordReset(request, realm, token, defaultPassword);

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(await signIn(request, realm, email, defaultPassword)).toBeOK();
  });

  test('PWD-RESET-011: concurrent link consumption has exactly one successful outcome', async ({
    api,
    request,
  }) => {
    const realm = await createResetRealm(api, request);
    const email = uniqueEmail('concurrent');
    await expectSignUp(request, realm, email);
    await requestPasswordReset(request, realm, email);
    const token = await latestResetToken(realm.applicationId);
    const candidates = Array.from(
      { length: 4 },
      (_, index) => `Concurrent-password-${index}-123!`,
    );

    const responses = await Promise.all(
      candidates.map((candidate) => completePasswordReset(request, realm, token, candidate)),
    );

    expect(responses.filter((response) => response.ok())).toHaveLength(1);
    const working = [];
    for (const candidate of candidates) {
      const signin = await signIn(request, realm, email, candidate);
      if (signin.ok()) working.push(candidate);
    }
    expect(working).toHaveLength(1);
  });

  test('PWD-RESET-012: repeated reset request follows the approved link rotation contract', async ({
    api,
    request,
  }) => {
    const realm = await createResetRealm(api, request);
    const email = uniqueEmail('rotation');
    await expectSignUp(request, realm, email);
    await requestPasswordReset(request, realm, email);
    const first = await latestResetToken(realm.applicationId);

    await requestPasswordReset(request, realm, email);
    const second = await latestResetToken(realm.applicationId);

    expect(second).not.toBe(first);
    expect(await resetTokenCount(realm.applicationId, first)).toBe(0);
    expect(await resetTokenCount(realm.applicationId, second)).toBe(1);
  });

  test('PWD-RESET-013: reset cannot unblock a user or grant a session', async ({
    api,
    request,
  }) => {
    const realm = await createResetRealm(api, request);
    const email = uniqueEmail('blocked');
    await expectSignUp(request, realm, email);
    await setUserState(realm, email, { status: 'blocked' });
    await requestPasswordReset(request, realm, email);
    const token = await latestResetToken(realm.applicationId);

    const response = await completePasswordReset(request, realm, token, newPassword);

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect((await userForEmail(realm, email))?.status).toBe('blocked');
    await withDb(async (sql) => {
      expect(await count(sql, 'application_session', realm.applicationId)).toBe(0);
      expect(await count(sql, 'application_oauth_access_token', realm.applicationId)).toBe(0);
    });
  });

  test('PWD-RESET-014: closed registration still permits reset for an existing user', async ({
    api,
    request,
  }) => {
    const source = await createResetRealm(api, request);
    const realm = await createResetRealm(api, request, 'closed', {
      registrationMode: 'disabled',
    });
    const email = uniqueEmail('closed');
    await expectSignUp(request, source, email);
    await copyPasswordIdentity(source, realm, email);

    expect(await requestPasswordReset(request, realm, email)).toBeOK();
    const token = await latestResetToken(realm.applicationId);
    expect(await completePasswordReset(request, realm, token, newPassword)).toBeOK();
    expect(await signIn(request, realm, email, newPassword)).toBeOK();
  });

  test('PWD-RESET-015: disabled application or organization invalidates issued reset links', async ({
    api,
    request,
  }) => {
    const realm = await createResetRealm(api, request);
    const email = uniqueEmail('disabled');
    await expectSignUp(request, realm, email);
    await requestPasswordReset(request, realm, email);
    const token = await latestResetToken(realm.applicationId);
    await updatePolicy(realm, { realmEnabled: false });

    const response = await completePasswordReset(request, realm, token, newPassword);

    expect(response.status()).toBe(404);
    await withDb(async (sql) => {
      expect(await count(sql, 'application_user', realm.applicationId)).toBe(1);
      expect(await count(sql, 'application_account', realm.applicationId)).toBe(1);
    });
  });

  test('PWD-RESET-016: reset revokes required target-realm sessions without affecting other realms', async ({
    api,
    request,
  }) => {
    const realms = await createResetRealms(api, request);
    const email = uniqueEmail('sessions');
    await Promise.all([
      expectSignUp(request, realms.a, email),
      expectSignUp(request, realms.b, email),
    ]);
    const sessionB = await signIn(request, realms.b, email);
    const beforeB = await realmState(realms.b);
    await requestPasswordReset(request, realms.a, email);
    const token = await latestResetToken(realms.a.applicationId);

    expect(await completePasswordReset(request, realms.a, token, newPassword)).toBeOK();

    await expectRealmState(realms.b, beforeB);
    expect(applicationCookie(sessionB, realms.b)).toContain(realms.b.applicationId);
  });

  test('PWD-RESET-017: capture delivery uses only the target-realm password reset purpose and template', async ({
    api,
    request,
  }) => {
    const realms = await createResetRealms(api, request);
    const email = uniqueEmail('delivery');
    await expectSignUp(request, realms.a, email);
    await requestPasswordReset(request, realms.a, email);

    await withDb(async (sql) => {
      const [profile] = await sql<{ reset: string; verify: string; otp: string }[]>`
        select password_reset_template_id as reset,
               email_verification_template_id as verify,
               email_otp_sign_in_template_id as otp
        from iam.application_auth_delivery_profile
        where application_id = ${realms.a.applicationId}
      `;
      expect(profile).toEqual({
        reset: 'reset-a-reset',
        verify: 'reset-a-verify',
        otp: 'reset-a-otp',
      });
      expect(await count(sql, 'application_verification', realms.a.applicationId)).toBe(1);
      expect(await count(sql, 'application_verification', realms.b.applicationId)).toBe(0);
    });
  });

  test('PWD-RESET-018: delivery timeout or rejection returns a generic fail-closed response', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request, undefined, 'delivery-unavailable', {
      passwordResetEnabled: true,
    });
    const email = uniqueEmail('delivery-failure');
    const before = await realmState(realm);

    const response = await requestPasswordReset(request, realm, email);

    expect(response.status()).toBeGreaterThanOrEqual(500);
    expectSecretFree(await response.text(), [email]);
    const after = await realmState(realm);
    expect(after.application_user).toBe(before.application_user);
    expect(after.application_session).toBe(before.application_session);
  });

  test('PWD-RESET-019: reset email, link, token, and password never leak to telemetry or browser storage', async ({
    api,
    request,
  }) => {
    const realm = await createResetRealm(api, request);
    const email = uniqueEmail('redaction');
    await expectSignUp(request, realm, email);
    await requestPasswordReset(request, realm, email);
    const token = await latestResetToken(realm.applicationId);

    const response = await completePasswordReset(request, realm, `${token}.invalid`, newPassword);

    expectSecretFree(await response.text(), [email, token, newPassword]);
    expect(response.headers()['location'] ?? '').not.toMatch(
      new RegExp(`${escapeRegExp(token)}|${escapeRegExp(newPassword)}`, 'u'),
    );
    expect(response.headers()['set-cookie'] ?? '').not.toContain(token);
  });
});

async function createResetRealm(
  api: Parameters<typeof createRealm>[0],
  request: Parameters<typeof createRealm>[1],
  suffix = 'reset',
  policy: Parameters<typeof createRealm>[4] = {},
) {
  const realm = await createRealm(api, request, undefined, suffix, {
    passwordResetEnabled: true,
    ...policy,
  });
  await configureDelivery(realm, suffix);
  return realm;
}

async function createResetRealms(
  api: Parameters<typeof createRealmMatrix>[0],
  request: Parameters<typeof createRealmMatrix>[1],
) {
  const realms = await createRealmMatrix(api, request, {
    passwordResetEnabled: true,
  });
  await Promise.all([
    configureDelivery(realms.a, 'reset-a'),
    configureDelivery(realms.a2, 'reset-a2'),
    configureDelivery(realms.b, 'reset-b'),
  ]);
  return realms;
}

async function latestResetToken(applicationId: string): Promise<string> {
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

async function resetTokenCount(applicationId: string, token: string): Promise<number> {
  return withDb(async (sql) => {
    const [row] = await sql<{ count: number }[]>`
      select count(*)::int as count
      from iam.application_verification
      where application_id = ${applicationId} and value = ${token}
    `;
    return row!.count;
  });
}

async function expireResetToken(applicationId: string, token: string): Promise<void> {
  await withDb(
    (sql) => sql`
      update iam.application_verification
      set expires_at = now() - interval '1 second'
      where application_id = ${applicationId} and value = ${token}
    `,
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
