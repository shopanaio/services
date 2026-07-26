import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import {
  applicationCookie,
  beginAuthorization,
  count,
  createRealm,
  createRealmMatrix,
  endpoint,
  expectInvalidSignIn,
  expectRealmState,
  expectSecretFree,
  expectSignUp,
  invalidCredentials,
  jsonHeaders,
  realmState,
  setUserState,
  signIn,
  uniqueEmail,
  updatePolicy,
  withDb,
} from './application-auth-test-kit';

test.describe('Application password auth — signin', () => {
  test('valid credentials create a session only in the target application', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const email = uniqueEmail();
    await expectSignUp(request, realms.a, email);
    const beforeB = await realmState(realms.b);
    const response = await signIn(request, realms.a, email);
    expect(response.ok(), await response.text()).toBe(true);
    expect(applicationCookie(response, realms.a)).toContain(realms.a.applicationId);
    await withDb(async (sql) => {
      expect(await count(sql, 'application_session', realms.a.applicationId)).toBeGreaterThan(0);
    });
    await expectRealmState(realms.b, beforeB);
  });

  test('wrong password creates no session, code, or token', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail();
    await expectSignUp(request, realm, email);
    const before = await realmState(realm);
    await expectInvalidSignIn(request, realm, email, 'Wrong-password-123!');
    await expectRealmState(realm, before);
  });

  test('unknown email is indistinguishable from a wrong password by public contract', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail();
    await expectSignUp(request, realm, email);
    const [wrong, unknown] = await Promise.all([
      signIn(request, realm, email, 'Wrong-password-123!'),
      signIn(request, realm, uniqueEmail(), 'Wrong-password-123!'),
    ]);
    expect(wrong.status()).toBe(unknown.status());
    expect(await wrong.json()).toEqual(invalidCredentials);
    expect(await unknown.json()).toEqual(invalidCredentials);
  });

  test('email normalization cannot duplicate identity or bypass rate limits', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const local = `SignIn-${crypto.randomUUID()}`;
    const email = `${local.toLowerCase()}@playwright.dev`;
    await expectSignUp(request, realm, email);
    const response = await signIn(request, realm, `  ${local}@PLAYWRIGHT.DEV  `);
    expect(response.ok(), await response.text()).toBe(true);
    await withDb(async (sql) => {
      expect(await count(sql, 'application_user', realm.applicationId)).toBe(1);
    });
  });

  test('application A credentials cannot authenticate the same email in B', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const email = uniqueEmail();
    await Promise.all([
      expectSignUp(request, realms.a, email, 'Realm-A-password-123!'),
      expectSignUp(request, realms.b, email, 'Realm-B-password-123!'),
    ]);
    const beforeB = await realmState(realms.b);
    await expectInvalidSignIn(request, realms.b, email, 'Realm-A-password-123!');
    await expectRealmState(realms.b, beforeB);
  });

  test('matching credentials in A and B create independent sessions', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const email = uniqueEmail();
    await Promise.all([
      expectSignUp(request, realms.a, email),
      expectSignUp(request, realms.b, email),
    ]);
    const [a, b] = await Promise.all([
      signIn(request, realms.a, email),
      signIn(request, realms.b, email),
    ]);
    const cookieA = applicationCookie(a, realms.a);
    const cookieB = applicationCookie(b, realms.b);
    expect(cookieA).not.toBe(cookieB);
    expect(cookieA).not.toContain(realms.b.applicationId);
    expect(cookieB).not.toContain(realms.a.applicationId);
  });

  test('blocked user cannot create a new session', async ({ api, request }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail();
    await expectSignUp(request, realm, email);
    await setUserState(realm, email, { status: 'blocked' });
    const before = await realmState(realm);
    const response = await signIn(request, realm, email);
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual(invalidCredentials);
    await expectRealmState(realm, before);
  });

  test('blocking a user during signin prevents authorization completion', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail();
    await expectSignUp(request, realm, email);
    const authorization = await beginAuthorization(request, realm);
    expect(authorization.status()).toBeLessThan(400);
    await setUserState(realm, email, { status: 'blocked' });
    const response = await signIn(request, realm, email);
    expect(response.status()).toBe(401);
    await withDb(async (sql) => {
      expect(await count(sql, 'application_oauth_access_token', realm.applicationId)).toBe(0);
      expect(await count(sql, 'application_oauth_refresh_token', realm.applicationId)).toBe(0);
    });
  });

  test('live application disable stops an in-flight flow', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail();
    await expectSignUp(request, realm, email);
    await beginAuthorization(request, realm);
    await updatePolicy(realm, { realmEnabled: false });
    const response = await signIn(request, realm, email);
    expect(response.status()).toBe(404);
    await withDb(async (sql) => {
      expect(await count(sql, 'application_oauth_access_token', realm.applicationId)).toBe(0);
      expect(await count(sql, 'application_oauth_refresh_token', realm.applicationId)).toBe(0);
    });
  });

  test('malformed credential payload fails without reflecting secrets', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const secret = `malformed-${crypto.randomUUID()}`;
    const before = await realmState(realm);
    for (const data of [null, [], { email: 7, password: secret }, { email: uniqueEmail() }]) {
      const response = await request.post(
        endpoint(realm, '/sign-in/email'),
        { headers: jsonHeaders(), data: JSON.stringify(data) },
      );
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expectSecretFree(await response.text(), [secret]);
    }
    await expectRealmState(realm, before);
  });

  test('duplicate credential or context fields are rejected as ambiguous', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const before = await realmState(realm);
    const body = `email=${encodeURIComponent(uniqueEmail())}&email=${encodeURIComponent(uniqueEmail())}&password=a&password=b`;
    const response = await request.post(
      endpoint(realm, '/sign-in/email'),
      {
        headers: {
          accept: 'application/json',
          'content-type': 'application/x-www-form-urlencoded',
          origin: new URL(endpoint(realm, '')).origin,
        },
        data: body,
      },
    );
    expect(response.status()).toBeGreaterThanOrEqual(400);
    await expectRealmState(realm, before);
  });

  test('parallel standalone signin creates only bounded sessions and no OAuth tokens', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail();
    await expectSignUp(request, realm, email);
    const responses = await Promise.all(
      Array.from({ length: 4 }, () => signIn(request, realm, email)),
    );
    expect(responses.every((response) => response.ok())).toBe(true);
    await withDb(async (sql) => {
      expect(await count(sql, 'application_session', realm.applicationId)).toBeLessThanOrEqual(5);
      expect(await count(sql, 'application_oauth_access_token', realm.applicationId)).toBe(0);
      expect(await count(sql, 'application_oauth_refresh_token', realm.applicationId)).toBe(0);
    });
  });

  test('standalone signin can create only a session and never OAuth tokens directly', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail();
    await expectSignUp(request, realm, email);
    const response = await signIn(request, realm, email);
    expect(response.ok()).toBe(true);
    expect(applicationCookie(response, realm)).toBeTruthy();
    const body = await response.text();
    expect(body).not.toMatch(/access_token|refresh_token|id_token/iu);
    await withDb(async (sql) => {
      expect(await count(sql, 'application_oauth_access_token', realm.applicationId)).toBe(0);
      expect(await count(sql, 'application_oauth_refresh_token', realm.applicationId)).toBe(0);
    });
  });

  test('platform admin session is not accepted as an application user session', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const before = await realmState(realm);
    const [userinfo, consent] = await Promise.all([
      request.get(
        endpoint(realm, '/oauth2/userinfo'),
        { headers: { authorization: `Bearer ${api.session.accessToken}` } },
      ),
      request.post(
        endpoint(realm, '/oauth2/consent'),
        {
          headers: {
            ...jsonHeaders(),
            authorization: `Bearer ${api.session.accessToken}`,
          },
          data: { accept: true },
        },
      ),
    ]);
    expect(userinfo.ok()).toBe(false);
    expect(consent.ok()).toBe(false);
    await expectRealmState(realm, before);
  });
});
