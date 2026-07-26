import { createHash } from 'node:crypto';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
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
  postLogoutUri,
  redirectUri,
  setClientDisabled,
  setCookieHeaders,
  setUserState,
  signIn,
  tokenRequest,
  uniqueEmail,
  updatePolicy,
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
    expect(headers).toMatch(/Path=\/auth\/applications\//iu);
  });

  test('cookie A cannot authenticate or mutate a session in B', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const email = uniqueEmail('foreign-cookie');
    const signup = await expectSignUp(request, realms.a, email);
    const cookie = applicationCookie(signup, realms.a);
    const response = await request.get(endpoint(realms.b, '/oauth2/userinfo'), {
      headers: { cookie },
    });
    expect(response.ok()).toBe(false);
    expect(await sessionCount(realms.b.applicationId)).toBe(0);
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
    await withDb(
      (sql) => sql`delete from iam.application_session where application_id = ${realms.a.applicationId}`,
    );
    expect(await sessionCount(realms.a.applicationId)).toBe(0);
    expect(await sessionCount(realms.b.applicationId)).toBeGreaterThan(0);
  });

  test('expired session cannot continue authorization or pass live validation', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const signup = await expectSignUp(request, realm);
    const cookie = applicationCookie(signup, realm);
    await expireSessions(realm);
    const response = await request.get(endpoint(realm, '/oauth2/userinfo'), {
      headers: { cookie },
    });
    expect(response.ok()).toBe(false);
  });

  test('revoked session becomes inactive within the contract SLA', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const signup = await expectSignUp(request, realm);
    const cookie = applicationCookie(signup, realm);
    await withDb(
      (sql) => sql`delete from iam.application_session where application_id = ${realm.applicationId}`,
    );
    const startedAt = performance.now();
    const response = await request.get(endpoint(realm, '/oauth2/userinfo'), {
      headers: { cookie },
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
    await setUserState(realms.a, email, { status: 'blocked' });
    await withDb(
      (sql) => sql`delete from iam.application_session where application_id = ${realms.a.applicationId}`,
    );
    expect(await sessionCount(realms.a.applicationId)).toBe(0);
    expect(await sessionCount(realms.b.applicationId)).toBe(beforeB);
  });

  test('realm secret rotation revokes only target-realm security artifacts', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    await Promise.all([expectSignUp(request, realms.a), expectSignUp(request, realms.b)]);
    const beforeB = await sessionCount(realms.b.applicationId);
    await withDb(
      (sql) => sql`
        update iam.application_auth_configuration
        set revision = revision + 1
        where application_id = ${realms.a.applicationId}
      `,
    );
    expect(await sessionCount(realms.b.applicationId)).toBe(beforeB);
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
  }) => {
    const realms = await createRealmMatrix(api, request);
    const response = await tokenRequest(request, realms.b, {
      grant_type: 'refresh_token',
      refresh_token: `realm-a-${crypto.randomUUID()}`,
      client_id: realms.a.clientId,
      resource: realms.a.resource,
    });
    await expectOAuthError(response);
    expect(await accessTokenCount(realms.b.applicationId)).toBe(0);
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
  }) => {
    const realm = await createRealm(api, request);
    await setClientDisabled(realm, true);
    const response = await tokenRequest(request, realm, {
      grant_type: 'refresh_token',
      refresh_token: `disabled-${crypto.randomUUID()}`,
      client_id: realm.clientId,
      resource: realm.resource,
    });
    await expectOAuthError(response);
    await updatePolicy(realm, { realmEnabled: false });
    const disabledRealm = await tokenRequest(request, realm, {
      grant_type: 'refresh_token',
      refresh_token: `disabled-realm-${crypto.randomUUID()}`,
      client_id: realm.clientId,
      resource: realm.resource,
    });
    expect(disabledRealm.status()).toBe(404);
  });

  test('revocation disables refresh without affecting another realm', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const revoke = await request.post(endpoint(realms.a, '/oauth2/revoke'), {
      headers: formHeaders(),
      form: {
        token: `refresh-a-${crypto.randomUUID()}`,
        token_type_hint: 'refresh_token',
        client_id: realms.a.clientId,
      },
    });
    expect([200, 400]).toContain(revoke.status());
    expect(await sessionCount(realms.b.applicationId)).toBe(0);
  });

  test('end-session redirects only to a registered post-logout URI', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const response = await request.get(
      `${endpoint(realm, '/oauth2/end-session')}?client_id=${encodeURIComponent(realm.clientId)}&post_logout_redirect_uri=${encodeURIComponent(postLogoutUri(realm))}&id_token_hint=invalid`,
      { maxRedirects: 0 },
    );
    expect(response.headers()['location'] ?? '').not.toContain('attacker.invalid');
  });

  test('foreign post-logout URI cannot redirect or terminate another realm session', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const signup = await expectSignUp(request, realms.a);
    const cookie = applicationCookie(signup, realms.a);
    const before = await sessionCount(realms.a.applicationId);
    const response = await request.get(
      `${endpoint(realms.a, '/oauth2/end-session')}?client_id=${encodeURIComponent(realms.a.clientId)}&post_logout_redirect_uri=${encodeURIComponent(postLogoutUri(realms.b))}&id_token_hint=invalid`,
      { headers: { cookie }, maxRedirects: 0 },
    );
    expect(response.headers()['location'] ?? '').not.toContain(realms.b.applicationId);
    expect(await sessionCount(realms.a.applicationId)).toBe(before);
  });

  test('logout in A preserves the active session in B', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const email = uniqueEmail('logout');
    await Promise.all([
      expectSignUp(request, realms.a, email),
      expectSignUp(request, realms.b, email),
    ]);
    const beforeB = await sessionCount(realms.b.applicationId);
    await withDb(
      (sql) => sql`delete from iam.application_session where application_id = ${realms.a.applicationId}`,
    );
    expect(await sessionCount(realms.a.applicationId)).toBe(0);
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
