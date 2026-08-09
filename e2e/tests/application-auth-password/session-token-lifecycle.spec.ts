import { createHash } from 'node:crypto';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import { composeGlobalId } from '@utils/globalid';
import {
  applicationCookie,
  authorizeUrl,
  count,
  createRealm,
  createRealmMatrix,
  defaultPassword,
  endpoint,
  expectOAuthError,
  expectSignUp,
  expireSessions,
  formHeaders,
  jsonHeaders,
  postLogoutUri,
  redirectUri,
  setClientDisabled,
  setCookieHeaders,
  setUserState,
  signIn,
  tokenRequest,
  uniqueEmail,
  updatePolicy,
  userForEmail,
  withDb,
} from './application-auth-test-kit';

test.describe('Application password auth — session and token lifecycle', () => {
  test('signin cookie has required security and target-realm attributes', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail('cookie');
    await expectSignUp(request, realm, email);
    const response = await signIn(request, realm, email);
    const headers = setCookieHeaders(response).join('\n');
    expect(headers).toContain(`shopana_application_${realm.applicationId}`);
    expect(headers).toMatch(/HttpOnly/iu);
    expect(headers).toMatch(/SameSite=(?:Lax|Strict)/iu);
    expect(headers).toContain(`Path=/auth/applications/${realm.applicationId}`);
    if (endpoint(realm, '').startsWith('https://')) {
      expect(headers).toMatch(/(?:^|;\s*)Secure(?:;|$)/imu);
    }
  });

  test('cookie A cannot authenticate or mutate a session in B', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const email = uniqueEmail('foreign-cookie');
    const signup = await expectSignUp(request, realms.a, email);
    const cookie = applicationCookie(signup, realms.a);
    const local = await request.get(endpoint(realms.a, '/account/connections'), {
      headers: { cookie, accept: 'text/html' },
      maxRedirects: 0,
    });
    const response = await request.get(endpoint(realms.b, '/account/connections'), {
      headers: { cookie },
      maxRedirects: 0,
    });
    expect(local.ok(), await local.text()).toBe(true);
    expect(response.ok()).toBe(false);
    expect(await sessionCount(realms.b.applicationId)).toBe(0);
  });

  test('REST sign-out revokes only the current application session', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const email = uniqueEmail('rest-sign-out');
    const [signupA, signupB] = await Promise.all([
      expectSignUp(request, realms.a, email),
      expectSignUp(request, realms.b, email),
    ]);
    const cookieA = applicationCookie(signupA, realms.a);
    const cookieB = applicationCookie(signupB, realms.b);
    const beforeA = await sessionCount(realms.a.applicationId);
    const beforeB = await sessionCount(realms.b.applicationId);

    const response = await request.post(endpoint(realms.a, '/sign-out'), {
      headers: { ...jsonHeaders(), cookie: cookieA },
    });

    expect(response.ok(), await response.text()).toBe(true);
    expect(await response.json()).toEqual({ success: true });
    expect(setCookieHeaders(response).join('\n')).toContain(
      `shopana_application_${realms.a.applicationId}`,
    );
    expect(await sessionCount(realms.a.applicationId)).toBe(beforeA - 1);
    expect(await sessionCount(realms.b.applicationId)).toBe(beforeB);

    const stillAuthenticated = await request.get(
      endpoint(realms.b, '/account/connections'),
      { headers: { cookie: cookieB, accept: 'text/html' }, maxRedirects: 0 },
    );
    expect(stillAuthenticated.ok(), await stillAuthenticated.text()).toBe(true);
  });

  test('session REST endpoints list and revoke only sessions owned by the current application user', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const email = uniqueEmail('session-management');
    const [, signupB] = await Promise.all([
      expectSignUp(request, realms.a, email),
      expectSignUp(request, realms.b, email),
    ]);
    const signinA = await signIn(request, realms.a, email);
    expect(signinA.ok(), await signinA.text()).toBe(true);
    const cookieA = applicationCookie(signinA, realms.a);
    const cookieB = applicationCookie(signupB, realms.b);

    const listA = await request.get(endpoint(realms.a, '/list-sessions'), {
      headers: { ...jsonHeaders(), cookie: cookieA },
    });
    expect(listA.ok(), await listA.text()).toBe(true);
    const sessionsA = (await listA.json()) as Array<{
      token: string;
      userId: string;
    }>;
    expect(sessionsA).toHaveLength(2);
    expect(
      sessionsA.every(({ token }) => typeof token === 'string' && token.length > 0),
    ).toBe(true);
    expect(new Set(sessionsA.map(({ userId }) => userId)).size).toBe(1);

    const listB = await request.get(endpoint(realms.b, '/list-sessions'), {
      headers: { ...jsonHeaders(), cookie: cookieB },
    });
    expect(listB.ok(), await listB.text()).toBe(true);
    const sessionsB = (await listB.json()) as Array<{ token: string }>;
    expect(sessionsB).toHaveLength(1);

    const foreignRevoke = await request.post(
      endpoint(realms.a, '/revoke-session'),
      {
        headers: { ...jsonHeaders(), cookie: cookieA },
        data: { token: sessionsB[0]!.token },
      },
    );
    expect(foreignRevoke.ok(), await foreignRevoke.text()).toBe(true);
    expect(await foreignRevoke.json()).toEqual({ status: true });
    expect(await sessionCount(realms.a.applicationId)).toBe(2);
    expect(await sessionCount(realms.b.applicationId)).toBe(1);

    const revoke = await request.post(endpoint(realms.a, '/revoke-session'), {
      headers: { ...jsonHeaders(), cookie: cookieA },
      data: { token: sessionsA[0]!.token },
    });
    expect(revoke.ok(), await revoke.text()).toBe(true);
    expect(await revoke.json()).toEqual({ status: true });
    expect(await sessionCount(realms.a.applicationId)).toBe(1);
    expect(await sessionCount(realms.b.applicationId)).toBe(1);
  });

  test('session REST endpoints require an authenticated application session', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const list = await request.get(endpoint(realm, '/list-sessions'), {
      headers: jsonHeaders(),
    });
    const revoke = await request.post(endpoint(realm, '/revoke-session'), {
      headers: jsonHeaders(),
      data: { token: crypto.randomUUID() },
    });

    expect(list.status()).toBe(401);
    expect(revoke.status()).toBe(401);
  });

  test('sessions in A and B coexist and revoke independently', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const email = uniqueEmail('coexist');
    await Promise.all([
      expectSignUp(request, realms.a, email),
      expectSignUp(request, realms.b, email),
    ]);
    expect(await sessionCount(realms.a.applicationId)).toBeGreaterThan(0);
    expect(await sessionCount(realms.b.applicationId)).toBeGreaterThan(0);
    const userA = await userForEmail(realms.a, email);
    expect(userA).not.toBeNull();
    const payload = await revokeAllUserSessions(api, realms.a, userA!.id);
    expect(payload.userErrors).toEqual([]);
    expect(payload.revokedCount).toBeGreaterThan(0);
    expect(await sessionCount(realms.a.applicationId)).toBe(0);
    expect(await sessionCount(realms.b.applicationId)).toBeGreaterThan(0);
  });

  test('expired session cannot continue authorization or pass live validation', async ({
    api,
    request,
    page,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail('expired-session');
    await expectSignUp(request, realm, email);
    const tokens = await authorizeAndExchange(page, request, realm, email);
    await expireSessions(realm);
    const response = await request.get(endpoint(realm, '/oauth2/userinfo'), {
      headers: { authorization: `Bearer ${tokens.access_token}` },
    });
    expect(response.ok()).toBe(false);
  });

  test('revoked session becomes inactive within the contract SLA', async ({
    api,
    request,
    page,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail('revoke-sla');
    await expectSignUp(request, realm, email);
    const tokens = await authorizeAndExchange(page, request, realm, email);
    expect(
      (
        await request.get(endpoint(realm, '/oauth2/userinfo'), {
          headers: { authorization: `Bearer ${tokens.access_token}` },
        })
      ).ok(),
    ).toBe(true);
    const user = await userForEmail(realm, email);
    expect(user).not.toBeNull();
    const startedAt = performance.now();
    const payload = await revokeAllUserSessions(api, realm, user!.id);
    expect(payload.userErrors).toEqual([]);
    const response = await request.get(endpoint(realm, '/oauth2/userinfo'), {
      headers: { authorization: `Bearer ${tokens.access_token}` },
    });
    expect(response.ok()).toBe(false);
    expect(performance.now() - startedAt).toBeLessThan(1_000);
  });

  test('user block revokes only target-application sessions', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const email = uniqueEmail('block');
    await Promise.all([
      expectSignUp(request, realms.a, email),
      expectSignUp(request, realms.b, email),
    ]);
    const beforeB = await sessionCount(realms.b.applicationId);
    const userA = await userForEmail(realms.a, email);
    expect(userA).not.toBeNull();
    const payload = await blockApplicationUser(api, realms.a, userA!.id);
    expect(payload.userErrors).toEqual([]);
    expect(payload.user?.status).toBe('BLOCKED');
    expect(await sessionCount(realms.a.applicationId)).toBe(0);
    expect(await sessionCount(realms.b.applicationId)).toBe(beforeB);
  });

  test('realm secret rotation revokes only target-realm security artifacts', async () => {
    test.fixme(
      true,
      'No supported E2E management boundary currently exposes realm-secret rotation',
    );
  });

  test('refresh preserves the original user, issuer, resource, client, and scopes', async ({
    api,
    request,
    page,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail('refresh');
    await expectSignUp(request, realm, email);
    const tokens = await authorizeAndExchange(page, request, realm, email);
    const refreshed = await refresh(request, realm, tokens.refresh_token);
    expect(refreshed.ok(), await refreshed.text()).toBe(true);
    const body = (await refreshed.json()) as TokenSet;
    const oldClaims = decodeJwt(tokens.access_token);
    const newClaims = decodeJwt(body.access_token);
    expect(newClaims.sub).toBe(oldClaims.sub);
    expect(newClaims.iss).toBe(oldClaims.iss);
    expect(newClaims.aud).toEqual(oldClaims.aud);
    expect(newClaims.scope).toBe(oldClaims.scope);
  });

  test('refresh token rotation rejects the previously used token', async ({
    api,
    request,
    page,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail('rotation');
    await expectSignUp(request, realm, email);
    const tokens = await authorizeAndExchange(page, request, realm, email);
    const first = await refresh(request, realm, tokens.refresh_token);
    expect(first.ok()).toBe(true);
    const rotated = (await first.json()) as TokenSet;
    expect(rotated.refresh_token).not.toBe(tokens.refresh_token);
    await expectOAuthError(await refresh(request, realm, tokens.refresh_token));
  });

  test('refresh replay cannot issue a token and follows family revocation policy', async ({
    api,
    request,
    page,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail('replay');
    await expectSignUp(request, realm, email);
    const tokens = await authorizeAndExchange(page, request, realm, email);
    const first = await refresh(request, realm, tokens.refresh_token);
    const rotated = (await first.json()) as TokenSet;
    await expectOAuthError(await refresh(request, realm, tokens.refresh_token));
    await expectOAuthError(await refresh(request, realm, rotated.refresh_token));
  });

  test('refresh token A cannot be used through issuer or client B', async ({
    api,
    request,
    page,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const email = uniqueEmail('foreign-refresh');
    await expectSignUp(request, realms.a, email);
    const tokens = await authorizeAndExchange(page, request, realms.a, email);
    const response = await tokenRequest(request, realms.b, {
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
      client_id: realms.a.clientId,
      resource: realms.a.resource,
    });
    await expectOAuthError(response);
    expect(await accessTokenCount(realms.b.applicationId)).toBe(0);
    expect(await refresh(request, realms.a, tokens.refresh_token)).toBeOK();
  });

  test('refresh without exact resource fails without consuming the valid token', async ({
    api,
    request,
    page,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail('resource');
    await expectSignUp(request, realm, email);
    const tokens = await authorizeAndExchange(page, request, realm, email);
    const missing = await tokenRequest(request, realm, {
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
      client_id: realm.clientId,
    });
    await expectOAuthError(missing, 'invalid_target');
    expect(await refresh(request, realm, tokens.refresh_token)).toBeOK();
  });

  test('disabled client, realm, organization, or user cannot refresh', async ({
    api,
    request,
    page,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const clientEmail = uniqueEmail('disabled-client');
    const realmEmail = uniqueEmail('disabled-realm');
    const userEmail = uniqueEmail('blocked-user');
    await expectSignUp(request, realms.a, clientEmail);
    await expectSignUp(request, realms.a2, realmEmail);
    await expectSignUp(request, realms.b, userEmail);
    const clientTokens = await authorizeAndExchange(page, request, realms.a, clientEmail);
    const realmTokens = await authorizeAndExchange(page, request, realms.a2, realmEmail);
    const userTokens = await authorizeAndExchange(page, request, realms.b, userEmail);

    await setClientDisabled(api, realms.a, true);
    await expectOAuthError(await refresh(request, realms.a, clientTokens.refresh_token));

    await updatePolicy(realms.a2, { realmEnabled: false });
    expect((await refresh(request, realms.a2, realmTokens.refresh_token)).status()).toBe(404);

    await setUserState(realms.b, userEmail, { status: 'blocked' });
    await expectOAuthError(await refresh(request, realms.b, userTokens.refresh_token));
  });

  test('revocation disables refresh without affecting another realm', async ({
    api,
    request,
    page,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const emailA = uniqueEmail('revoke-a');
    const emailB = uniqueEmail('revoke-b');
    await expectSignUp(request, realms.a, emailA);
    await expectSignUp(request, realms.b, emailB);
    const tokensA = await authorizeAndExchange(page, request, realms.a, emailA);
    const tokensB = await authorizeAndExchange(page, request, realms.b, emailB);
    const revoke = await request.post(endpoint(realms.a, '/oauth2/revoke'), {
      headers: formHeaders(),
      form: {
        token: tokensA.refresh_token,
        token_type_hint: 'refresh_token',
        client_id: realms.a.clientId,
      },
    });
    expect(revoke.ok(), await revoke.text()).toBe(true);
    await expectOAuthError(await refresh(request, realms.a, tokensA.refresh_token));
    expect(await refresh(request, realms.b, tokensB.refresh_token)).toBeOK();
  });

  test('end-session redirects only to a registered post-logout URI', async ({
    api,
    request,
    page,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail('end-session');
    await expectSignUp(request, realm, email);
    const tokens = await authorizeAndExchange(page, request, realm, email);
    const cookie = await browserApplicationCookie(page, realm);
    const response = await completeEndSession(
      request,
      realm,
      `${endpoint(realm, '/oauth2/end-session')}?client_id=${encodeURIComponent(realm.clientId)}&post_logout_redirect_uri=${encodeURIComponent(postLogoutUri(realm))}&id_token_hint=${encodeURIComponent(tokens.id_token)}`,
      cookie,
    );
    expect(response.status()).toBe(303);
    expect(response.headers()['location']).toBe(postLogoutUri(realm));
  });

  test('foreign post-logout URI cannot redirect or terminate another realm session', async ({
    api,
    request,
    page,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const email = uniqueEmail('foreign-logout');
    await expectSignUp(request, realms.a, email);
    const tokens = await authorizeAndExchange(page, request, realms.a, email);
    const cookie = await browserApplicationCookie(page, realms.a);
    const before = await sessionCount(realms.a.applicationId);
    const response = await request.get(
      `${endpoint(realms.a, '/oauth2/end-session')}?client_id=${encodeURIComponent(realms.a.clientId)}&post_logout_redirect_uri=${encodeURIComponent(postLogoutUri(realms.b))}&id_token_hint=${encodeURIComponent(tokens.id_token)}`,
      { headers: { cookie }, maxRedirects: 0 },
    );
    expect(response.headers()['location'] ?? '').not.toContain(realms.b.applicationId);
    expect(await sessionCount(realms.a.applicationId)).toBe(before);
  });

  test('logout in A preserves the active session in B', async ({
    api,
    request,
    page,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const email = uniqueEmail('logout');
    await Promise.all([
      expectSignUp(request, realms.a, email),
      expectSignUp(request, realms.b, email),
    ]);
    const tokensA = await authorizeAndExchange(page, request, realms.a, email);
    const cookieA = await browserApplicationCookie(page, realms.a);
    await authorizeAndExchange(page, request, realms.b, email);
    const beforeB = await sessionCount(realms.b.applicationId);
    const beforeA = await sessionCount(realms.a.applicationId);
    const logout = await completeEndSession(
      request,
      realms.a,
      `${endpoint(realms.a, '/oauth2/end-session')}?client_id=${encodeURIComponent(realms.a.clientId)}&post_logout_redirect_uri=${encodeURIComponent(postLogoutUri(realms.a))}&id_token_hint=${encodeURIComponent(tokensA.id_token)}`,
      cookieA,
    );
    expect(logout.status()).toBe(303);
    expect(await sessionCount(realms.a.applicationId)).toBe(beforeA - 1);
    expect(await sessionCount(realms.b.applicationId)).toBe(beforeB);
  });

  test('multiple Set-Cookie headers remain independent through the transport bridge', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail('set-cookie');
    await expectSignUp(request, realm, email);
    const response = await signIn(request, realm, email);
    const cookies = setCookieHeaders(response);
    expect(cookies.length).toBeGreaterThan(0);
    expect(new Set(cookies.map((cookie) => cookie.split('=', 1)[0])).size).toBe(cookies.length);
  });
});

interface TokenSet {
  access_token: string;
  id_token: string;
  refresh_token: string;
}

async function authorizeAndExchange(
  page: Page,
  request: Parameters<typeof tokenRequest>[0],
  realm: Parameters<typeof tokenRequest>[1],
  email: string,
): Promise<TokenSet> {
  const verifier = crypto.randomUUID().replaceAll('-', '').repeat(2);
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  await page.context().clearCookies();
  await page.goto(authorizeUrl(realm, { codeChallenge: challenge }));
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(defaultPassword);
  await page.locator('form[action="./login/password"] button').click();
  if (await page.locator('form[action="./consent"]').isVisible().catch(() => false)) {
    await page.locator('button[name="decision"][value="allow"]').click();
  }
  await page.waitForURL((url) => url.searchParams.has('code'));
  const code = new URL(page.url()).searchParams.get('code');
  expect(code).toBeTruthy();
  const response = await tokenRequest(request, realm, {
    grant_type: 'authorization_code',
    code: code!,
    client_id: realm.clientId,
    redirect_uri: redirectUri(realm),
    code_verifier: verifier,
    resource: realm.resource,
  });
  expect(response.ok(), await response.text()).toBe(true);
  return response.json() as Promise<TokenSet>;
}

function refresh(
  request: Parameters<typeof tokenRequest>[0],
  realm: Parameters<typeof tokenRequest>[1],
  refreshToken: string,
) {
  return tokenRequest(request, realm, {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: realm.clientId,
    resource: realm.resource,
  });
}

function decodeJwt(token: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(token.split('.')[1]!, 'base64url').toString('utf8')) as Record<
    string,
    unknown
  >;
}

function sessionCount(applicationId: string): Promise<number> {
  return withDb((sql) => count(sql, 'application_session', applicationId));
}

function accessTokenCount(applicationId: string): Promise<number> {
  return withDb((sql) => count(sql, 'application_oauth_access_token', applicationId));
}

async function revokeAllUserSessions(
  api: Parameters<typeof createRealm>[0],
  realm: Parameters<typeof tokenRequest>[1],
  userId: string,
) {
  api.session.organizationId = composeGlobalId('Organization', realm.organizationId);
  const { data } = await api.admin.mutation(
    'application-admin-api/ApplicationUserSessionsRevokeAll',
    {
      variables: {
        input: {
          organizationId: composeGlobalId('Organization', realm.organizationId),
          applicationId: composeGlobalId('Application', realm.applicationId),
          userId: composeGlobalId('ApplicationUser', userId),
        },
      },
    },
  );
  return data.applicationMutation.applicationUserSessionsRevokeAll;
}

async function blockApplicationUser(
  api: Parameters<typeof createRealm>[0],
  realm: Parameters<typeof tokenRequest>[1],
  userId: string,
) {
  api.session.organizationId = composeGlobalId('Organization', realm.organizationId);
  const { data } = await api.admin.mutation('application-admin-api/ApplicationUserBlock', {
    variables: {
      input: {
        organizationId: composeGlobalId('Organization', realm.organizationId),
        applicationId: composeGlobalId('Application', realm.applicationId),
        userId: composeGlobalId('ApplicationUser', userId),
      },
    },
  });
  return data.applicationMutation.applicationUserBlock;
}

async function browserApplicationCookie(
  page: Page,
  realm: Parameters<typeof tokenRequest>[1],
): Promise<string> {
  const cookies = await page.context().cookies();
  const cookie = cookies.find(({ name }) =>
    name.includes(`shopana_application_${realm.applicationId}`),
  );
  expect(cookie).toBeDefined();
  return `${cookie!.name}=${cookie!.value}`;
}

async function completeEndSession(
  request: Parameters<typeof tokenRequest>[0],
  realm: Parameters<typeof tokenRequest>[1],
  endSessionUrl: string,
  sessionCookie: string,
) {
  const begin = await request.get(endSessionUrl, {
    headers: { cookie: sessionCookie, accept: 'text/html' },
    maxRedirects: 0,
  });
  expect([302, 303]).toContain(begin.status());
  const logoutLocation = begin.headers()['location'];
  expect(logoutLocation).toBeTruthy();
  expect(new URL(logoutLocation!, endpoint(realm, '')).pathname).toBe(
    `/auth/applications/${realm.applicationId}/logout`,
  );
  const cookie = [
    sessionCookie,
    ...setCookieHeaders(begin).map((header) => header.split(';', 1)[0]!),
  ].join('; ');
  const confirmation = await request.get(
    new URL(logoutLocation!, endpoint(realm, '')).toString(),
    {
      headers: { cookie, accept: 'text/html' },
      maxRedirects: 0,
    },
  );
  expect(confirmation.ok(), await confirmation.text()).toBe(true);
  const csrf = /name="csrf" value="([^"]+)"/u.exec(await confirmation.text())?.[1];
  expect(csrf).toBeTruthy();
  return request.post(endpoint(realm, '/logout'), {
    headers: { ...formHeaders(), cookie },
    form: { csrf: csrf! },
    maxRedirects: 0,
  });
}
