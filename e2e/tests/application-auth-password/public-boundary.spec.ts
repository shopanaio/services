import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import {
  applicationCookie,
  beginAuthorization,
  completePasswordReset,
  configureDelivery,
  copyPasswordIdentity,
  count,
  createRealm,
  endpoint,
  expectRealmState,
  expectSignUp,
  iamBaseUrl,
  jsonHeaders,
  realmState,
  requestPasswordReset,
  signIn,
  signUp,
  uniqueEmail,
  updatePolicy,
  withDb,
} from './application-auth-test-kit';

test.describe('Application password auth — public boundary', () => {
  test('active realm exposes only enabled password capabilities', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const response = await openLoginPage(request, realm);
    expect(response.ok()).toBe(true);
    const html = await response.text();
    expect(html).toContain('password');
    expect(html).toContain('signup');
    expect(html).not.toMatch(/email.?otp|google|facebook|passkey/iu);
  });

  test('disabled signup is absent from UI and direct HTTP contract', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request, undefined, 'no-signup', {
      passwordSignUpEnabled: false,
    });
    const page = await openLoginPage(request, realm);
    expect(page.ok(), await page.text()).toBe(true);
    expect(await page.text()).not.toContain('signup');
    const before = await realmState(realm);
    const direct = await signUp(request, realm, uniqueEmail());
    expect(direct.status()).toBe(404);
    await expectRealmState(realm, before);
  });

  test('disabled signin cannot create an application session', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request, undefined, 'no-signin', {
      passwordSignInEnabled: false,
    });
    const email = uniqueEmail();
    await expectSignUp(request, realm, email);
    const before = await realmState(realm);
    const response = await signIn(request, realm, email);
    expect(response.status()).toBe(404);
    await expectRealmState(realm, before);
  });

  test('disabled reset has no UI, delivery, or verification side effect', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request, undefined, 'no-reset', {
      passwordResetEnabled: false,
    });
    const page = await openLoginPage(request, realm);
    expect(page.ok(), await page.text()).toBe(true);
    expect(await page.text()).not.toMatch(/forgot|reset/iu);
    const before = await realmState(realm);
    const [requestReset, complete] = await Promise.all([
      requestPasswordReset(request, realm, uniqueEmail()),
      request.post(endpoint(realm, '/reset-password'), {
        headers: jsonHeaders(),
        data: { token: crypto.randomUUID(), newPassword: 'Another-password-123!' },
      }),
    ]);
    expect(requestReset.status()).toBe(404);
    expect(complete.status()).toBe(404);
    await expectRealmState(realm, before);
  });

  test('signup enabled with signin disabled creates no session', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request, undefined, 'signup-only', {
      passwordSignInEnabled: false,
    });
    const response = await expectSignUp(request, realm);
    expect(response.headers()['set-cookie']).toBeUndefined();
    await withDb(async (sql) => {
      expect(await count(sql, 'application_user', realm.applicationId)).toBe(1);
      expect(await count(sql, 'application_account', realm.applicationId)).toBe(1);
      expect(await count(sql, 'application_session', realm.applicationId)).toBe(0);
    });
  });

  test('signin enabled with signup disabled authenticates only existing users', async ({
    api,
    request,
  }) => {
    const source = await createRealm(api, request);
    const realm = await createRealm(api, request, undefined, 'signin-only', {
      passwordSignUpEnabled: false,
    });
    const email = uniqueEmail();
    await expectSignUp(request, source, email);
    await copyPasswordIdentity(source, realm, email);
    const signin = await signIn(request, realm, email);
    expect(signin.ok(), await signin.text()).toBe(true);
    expect(applicationCookie(signin, realm)).toContain(realm.applicationId);
    const signup = await signUp(request, realm, uniqueEmail());
    expect(signup.status()).toBe(404);
  });

  test('closed registration blocks new users server-side', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request, undefined, 'closed', {
      registrationMode: 'disabled',
    });
    const before = await realmState(realm);
    const response = await signUp(request, realm, uniqueEmail());
    expect(response.status()).toBe(404);
    await expectRealmState(realm, before);
  });

  test('closed registration preserves allowed signin and reset for existing users', async ({
    api,
    request,
  }) => {
    const source = await createRealm(api, request);
    const realm = await createRealm(api, request, undefined, 'closed-existing', {
      registrationMode: 'disabled',
      passwordResetEnabled: true,
    });
    await configureDelivery(realm, 'closed-existing');
    const email = uniqueEmail();
    await expectSignUp(request, source, email);
    await copyPasswordIdentity(source, realm, email);
    const response = await signIn(request, realm, email);
    expect(response.ok(), await response.text()).toBe(true);
    expect(applicationCookie(response, realm)).toContain(realm.applicationId);
    expect(await requestPasswordReset(request, realm, email)).toBeOK();
    const token = await withDb(async (sql) => {
      const [row] = await sql<{ identifier: string }[]>`
        select identifier from iam.application_verification
        where application_id = ${realm.applicationId}
          and identifier like 'reset-password:%'
        order by created_at desc limit 1
      `;
      expect(row).toBeDefined();
      return row!.identifier.slice('reset-password:'.length);
    });
    expect(
      await completePasswordReset(request, realm, token, 'Closed-reset-password-456!'),
    ).toBeOK();
    expect(await signIn(request, realm, email, 'Closed-reset-password-456!')).toBeOK();
    expect(await countForRealm(realm, 'application_user')).toBe(1);
  });

  test('unknown auth path fails before auth processing', async ({ api, request }) => {
    const realm = await createRealm(api, request);
    const before = await realmState(realm);
    const response = await request.post(endpoint(realm, '/not-a-real-auth-operation'), {
      headers: jsonHeaders(),
      data: { email: uniqueEmail(), password: 'must-not-be-processed' },
    });
    expect(response.status()).toBe(404);
    await expectRealmState(realm, before);
  });

  test('known path with a disallowed HTTP method fails without side effects', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const before = await realmState(realm);
    const response = await request.get(
      `${endpoint(realm, '/sign-in/email')}?email=${encodeURIComponent(uniqueEmail())}`,
    );
    expect(response.status()).toBe(404);
    await expectRealmState(realm, before);
  });

  test('application sessions cannot access OAuth client management endpoints', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const signup = await expectSignUp(request, realm);
    const cookie = applicationCookie(signup, realm);
    for (const path of ['/oauth2/get-clients', '/oauth2/create-client', '/oauth2/client/rotate-secret']) {
      const response = await request.fetch(endpoint(realm, path), {
        method: path === '/oauth2/get-clients' ? 'GET' : 'POST',
        headers: { ...jsonHeaders(), cookie },
        data: {},
      });
      expect(response.status(), path).toBe(404);
    }
  });

  test('disabled OTP and social endpoints remain unreachable', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const before = await realmState(realm);
    const responses = await Promise.all([
      request.post(endpoint(realm, '/sign-in/email-otp'), {
        headers: jsonHeaders(),
        data: { email: uniqueEmail(), otp: '123456' },
      }),
      request.post(endpoint(realm, '/sign-in/social'), {
        headers: jsonHeaders(),
        data: { provider: 'google' },
        maxRedirects: 0,
      }),
      request.get(endpoint(realm, '/callback/google'), { maxRedirects: 0 }),
    ]);
    expect(responses.map((response) => response.status())).toEqual([404, 404, 404]);
    await expectRealmState(realm, before);
  });

  test('disabled application stops hosted, authorize, signin, and reset flows without deleting rows', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request, undefined, 'disabled-realm', {
      passwordResetEnabled: true,
    });
    await configureDelivery(realm, 'disabled-realm');
    const email = uniqueEmail();
    await expectSignUp(request, realm, email);
    const before = await realmState(realm);
    await updatePolicy(realm, { realmEnabled: false });
    const responses = await Promise.all([
      request.get(endpoint(realm, '/login')),
      request.get(endpoint(realm, '/.well-known/openid-configuration')),
      beginAuthorization(request, realm),
      signIn(request, realm, email),
      requestPasswordReset(request, realm, email),
    ]);
    expect(responses.every((response) => response.status() === 404)).toBe(true);
    await expectRealmState(realm, before);
  });

  test('disabled organization stops hosted, authorize, signin, and reset flows', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request, undefined, 'disabled-organization', {
      passwordResetEnabled: true,
    });
    await configureDelivery(realm, 'disabled-organization');
    const before = await realmState(realm);
    await withDb(
      (sql) => sql`
        update iam.organization set deleted_at = now()
        where id = ${realm.organizationId}
      `,
    );
    const [login, authorize, signin, reset] = await Promise.all([
      request.get(endpoint(realm, '/login')),
      beginAuthorization(request, realm),
      signIn(request, realm, uniqueEmail()),
      requestPasswordReset(request, realm, uniqueEmail()),
    ]);
    expect([login.status(), authorize.status(), signin.status(), reset.status()]).toEqual([
      404, 404, 404, 404,
    ]);
    await expectRealmState(realm, before);
  });

  test('invalid or unknown application identifier fails without realm disclosure', async ({
    request,
  }) => {
    const paths = [
      `${iamBaseUrl}/auth/applications/not-a-uuid/login`,
      `${iamBaseUrl}/auth/applications/${crypto.randomUUID()}/login`,
    ];
    const responses = await Promise.all(paths.map((url) => request.get(url)));
    expect(responses.map((response) => response.status())).toEqual([404, 404]);
    const bodies = await Promise.all(
      responses.map(async (response) => (await response.json()) as {
        error: string;
        error_description: string;
        request_id: string;
      }),
    );
    expect(bodies.map(({ request_id: _requestId, ...body }) => body)).toEqual([
      {
        error: 'not_found',
        error_description: 'Application auth endpoint was not found',
      },
      {
        error: 'not_found',
        error_description: 'Application auth endpoint was not found',
      },
    ]);
    expect(bodies[0]!.request_id).toBeTruthy();
    expect(bodies[1]!.request_id).toBeTruthy();
    expect(bodies[0]!.request_id).not.toBe(bodies[1]!.request_id);
    expect(JSON.stringify(bodies)).not.toMatch(
      /organization|configuration|database|realm/iu,
    );
  });
});

async function openLoginPage(
  request: Parameters<typeof beginAuthorization>[0],
  realm: Parameters<typeof beginAuthorization>[1],
) {
  const authorization = await beginAuthorization(request, realm);
  expect(authorization.status()).toBe(302);
  const location = authorization.headers()['location'];
  expect(location).toBeTruthy();
  return request.get(new URL(location!, endpoint(realm, '')).toString(), {
    headers: { accept: 'text/html' },
  });
}

async function countForRealm(
  realm: { applicationId: string },
  table: 'application_user' | 'application_session',
): Promise<number> {
  return withDb((sql) => count(sql, table, realm.applicationId));
}
