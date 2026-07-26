import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import {
  count,
  createRealm,
  createRealmMatrix,
  defaultPassword,
  expectRealmState,
  expectSecretFree,
  expectSignUp,
  minimumPassword,
  realmState,
  signUp,
  uniqueEmail,
  userForEmail,
  withDb,
} from './application-auth-test-kit';

test.describe('Application password auth — signup', () => {
  test('PWD-SIGNUP-001: valid signup creates a user and password account only in the target realm', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const email = uniqueEmail();
    const response = await expectSignUp(request, realms.a, email);
    expectSecretFree(await response.json(), [defaultPassword]);
    await withDb(async (sql) => {
      const [account] = await sql<{ password: string | null }[]>`
        select account.password
        from iam.application_account account
        join iam.application_user app_user
          on app_user.application_id = account.application_id and app_user.id = account.user_id
        where account.application_id = ${realms.a.applicationId} and app_user.email = ${email}
      `;
      expect(account?.password).toBeTruthy();
      expect(account?.password).not.toBe(defaultPassword);
      expect(await count(sql, 'application_user', realms.a.applicationId)).toBe(1);
      expect(await count(sql, 'application_account', realms.a.applicationId)).toBe(1);
      expect(await count(sql, 'application_user', realms.b.applicationId)).toBe(0);
      expect(await count(sql, 'application_account', realms.b.applicationId)).toBe(0);
    });
  });

  test('PWD-SIGNUP-002: minimum allowed password length is accepted', async ({ api, request }) => {
    const realm = await createRealm(api, request);
    const response = await expectSignUp(request, realm, uniqueEmail(), minimumPassword);
    expect(response.ok()).toBe(true);
  });

  test('PWD-SIGNUP-003: password below the minimum creates no identity state', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const before = await realmState(realm);
    const response = await signUp(request, realm, uniqueEmail(), minimumPassword.slice(1));
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expectSecretFree(await response.text(), [minimumPassword.slice(1)]);
    await expectRealmState(realm, before);
  });

  test('PWD-SIGNUP-004: password above the maximum is rejected without truncation', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const password = `Too-long-${'x'.repeat(200)}`;
    const before = await realmState(realm);
    const response = await signUp(request, realm, uniqueEmail(), password);
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expectSecretFree(await response.text(), [password]);
    await expectRealmState(realm, before);
  });

  test('PWD-SIGNUP-005: missing required fields create no partial state', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const before = await realmState(realm);
    for (const body of [
      {},
      { name: 'Missing email', password: defaultPassword },
      { name: 'Missing password', email: uniqueEmail() },
      { email: uniqueEmail(), password: defaultPassword },
    ]) {
      const response = await request.post(
        `http://127.0.0.1:11010/auth/applications/${realm.applicationId}/sign-up/email`,
        {
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            origin: 'http://127.0.0.1:11010',
          },
          data: body,
        },
      );
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expectSecretFree(await response.text(), [defaultPassword]);
    }
    await expectRealmState(realm, before);
  });

  test('PWD-SIGNUP-006: malformed email is rejected before identity creation', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const before = await realmState(realm);
    for (const email of ['not-an-email', '@playwright.dev', 'user@', 'user @playwright.dev']) {
      const response = await signUp(request, realm, email);
      expect(response.status()).toBeGreaterThanOrEqual(400);
    }
    await expectRealmState(realm, before);
  });

  test('PWD-SIGNUP-007: equivalent normalized emails cannot create duplicates in one realm', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const local = `Normalize-${crypto.randomUUID()}`;
    const canonical = `${local.toLowerCase()}@playwright.dev`;
    await expectSignUp(request, realm, `  ${local}@PLAYWRIGHT.DEV  `);
    const duplicate = await signUp(request, realm, canonical);
    expect(duplicate.status()).toBeGreaterThanOrEqual(400);
    await withDb(async (sql) => {
      expect(await count(sql, 'application_user', realm.applicationId)).toBe(1);
      expect(await count(sql, 'application_account', realm.applicationId)).toBe(1);
    });
  });

  test('PWD-SIGNUP-008: duplicate email does not create a second user or disclose account details', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail();
    await expectSignUp(request, realm, email);
    const before = await realmState(realm);
    const duplicate = await signUp(request, realm, email, 'Different-password-123!');
    expect(duplicate.status()).toBeGreaterThanOrEqual(400);
    expectSecretFree(await duplicate.text(), [email, defaultPassword, 'Different-password-123!']);
    await expectRealmState(realm, before);
  });

  test('PWD-SIGNUP-009: the same email creates independent users in applications A and B', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const email = uniqueEmail();
    await Promise.all([
      expectSignUp(request, realms.a, email, 'Realm-A-password-123!'),
      expectSignUp(request, realms.b, email, 'Realm-B-password-123!'),
    ]);
    const [userA, userB] = await Promise.all([
      userForEmail(realms.a, email),
      userForEmail(realms.b, email),
    ]);
    expect(userA).not.toBeNull();
    expect(userB).not.toBeNull();
    expect(userA!.id).not.toBe(userB!.id);
  });

  test('PWD-SIGNUP-010: the same email stays isolated across applications in one organization', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    expect(realms.a.organizationId).toBe(realms.a2.organizationId);
    const email = uniqueEmail();
    await Promise.all([
      expectSignUp(request, realms.a, email),
      expectSignUp(request, realms.a2, email),
    ]);
    const [userA, userA2] = await Promise.all([
      userForEmail(realms.a, email),
      userForEmail(realms.a2, email),
    ]);
    expect(userA!.id).not.toBe(userA2!.id);
  });

  test('PWD-SIGNUP-011: foreign application or client context cannot receive signup state', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const beforeA = await realmState(realms.a);
    const beforeB = await realmState(realms.b);
    const response = await signUp(request, realms.a, uniqueEmail(), defaultPassword, 'Password User', {
      headers: {
        'x-application-id': realms.b.applicationId,
        'x-oauth-client-id': realms.b.clientId,
      },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
    await expectRealmState(realms.a, beforeA);
    await expectRealmState(realms.b, beforeB);
  });

  test('PWD-SIGNUP-012: repeated identical signup does not duplicate users, accounts, or sessions', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail();
    const first = await signUp(request, realm, email);
    expect(first.ok()).toBe(true);
    const repeated = await signUp(request, realm, email);
    expect(repeated.status()).toBeGreaterThanOrEqual(400);
    await withDb(async (sql) => {
      expect(await count(sql, 'application_user', realm.applicationId)).toBe(1);
      expect(await count(sql, 'application_account', realm.applicationId)).toBe(1);
      expect(await count(sql, 'application_session', realm.applicationId)).toBeLessThanOrEqual(1);
    });
  });

  test('PWD-SIGNUP-013: concurrent signup creates exactly one consistent identity per realm', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail();
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => signUp(request, realm, email)),
    );
    expect(responses.filter((response) => response.ok())).toHaveLength(1);
    await withDb(async (sql) => {
      expect(await count(sql, 'application_user', realm.applicationId)).toBe(1);
      expect(await count(sql, 'application_account', realm.applicationId)).toBe(1);
      expect(await count(sql, 'application_session', realm.applicationId)).toBeLessThanOrEqual(1);
    });
  });

  test('PWD-SIGNUP-014: required verification prevents a full session or tokens before verification', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request, undefined, 'verify-required', {
      emailVerificationRequired: true,
    });
    const response = await signUp(request, realm, uniqueEmail());
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.headers()['set-cookie']).toBeUndefined();
    await withDb(async (sql) => {
      expect(await count(sql, 'application_session', realm.applicationId)).toBe(0);
      expect(await count(sql, 'application_oauth_access_token', realm.applicationId)).toBe(0);
      expect(await count(sql, 'application_oauth_refresh_token', realm.applicationId)).toBe(0);
    });
  });

  test('PWD-SIGNUP-015: optional verification does not weaken OAuth and PKCE requirements', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request, undefined, 'verify-optional', {
      emailVerificationRequired: false,
    });
    await expectSignUp(request, realm);
    const response = await request.get(
      `http://127.0.0.1:11010/auth/applications/${realm.applicationId}/oauth2/authorize?client_id=${realm.clientId}&response_type=code&redirect_uri=${encodeURIComponent(`http://127.0.0.1:11010/e2e/oauth/callback/${realm.applicationId}`)}&scope=openid&resource=${encodeURIComponent(realm.resource)}`,
      { maxRedirects: 0 },
    );
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(await countForRealm(realm, 'application_authorization_context')).toBe(0);
  });

  test('PWD-SIGNUP-016: verification delivery failure cannot grant a full authorized session', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request, undefined, 'delivery-failure', {
      emailVerificationRequired: true,
    });
    const response = await signUp(request, realm, uniqueEmail());
    expect(response.status()).toBeGreaterThanOrEqual(500);
    expect(response.headers()['set-cookie']).toBeUndefined();
    await withDb(async (sql) => {
      expect(await count(sql, 'application_session', realm.applicationId)).toBe(0);
      expect(await count(sql, 'application_oauth_access_token', realm.applicationId)).toBe(0);
      expect(await count(sql, 'application_oauth_refresh_token', realm.applicationId)).toBe(0);
    });
  });
});

async function countForRealm(
  realm: { applicationId: string },
  table: 'application_authorization_context',
): Promise<number> {
  return withDb((sql) => count(sql, table, realm.applicationId));
}
