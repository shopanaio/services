import { createHash } from 'node:crypto';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import {
  authorizeUrl,
  beginAuthorization,
  count,
  createRealm,
  createRealmMatrix,
  defaultPassword,
  endpoint,
  expectOAuthError,
  expectSignUp,
  formHeaders,
  redirectUri,
  setClientDisabled,
  setUserState,
  tokenRequest,
  uniqueEmail,
  withDb,
} from './application-auth-test-kit';

test.describe('Application password auth — OAuth Authorization Code', () => {
  test('public client completes password signin and Authorization Code with S256 PKCE', async ({
    api,
    request,
    page,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail('oauth-public');
    await expectSignUp(request, realm, email);

    const tokens = await completeAuthorizationCodeFlow(page, request, realm, email);

    expect(tokens.access_token).toBeTruthy();
    expect(tokens.id_token).toBeTruthy();
    expect(tokens.refresh_token).toBeTruthy();
    expect(tokens.token_type).toMatch(/^Bearer$/iu);
  });

  test('confidential client requires both client authentication and S256 PKCE', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const secret = `client-secret-${crypto.randomUUID()}`;
    await makeClientConfidential(realm.applicationId, realm.clientId, secret);
    const response = await tokenRequest(request, realm, {
      grant_type: 'authorization_code',
      code: `invalid-${crypto.randomUUID()}`,
      client_id: realm.clientId,
      code_verifier: 'v'.repeat(64),
      redirect_uri: redirectUri(realm),
      resource: realm.resource,
    });
    expect(response.status()).toBe(401);
    const authenticated = await tokenRequest(
      request,
      realm,
      {
        grant_type: 'authorization_code',
        code: `invalid-${crypto.randomUUID()}`,
        client_id: realm.clientId,
        code_verifier: 'v'.repeat(64),
        redirect_uri: redirectUri(realm),
        resource: realm.resource,
      },
      { authorization: `Basic ${Buffer.from(`${realm.clientId}:${secret}`).toString('base64')}` },
    );
    expect(authenticated.status()).not.toBe(401);
  });

  test('missing PKCE challenge cannot produce an authorization code', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const url = new URL(authorizeUrl(realm));
    url.searchParams.delete('code_challenge');
    const response = await request.get(url.toString(), { maxRedirects: 0 });
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(await authorizationContextCount(realm.applicationId)).toBe(0);
  });

  test('PKCE method other than S256 is rejected', async ({ api, request }) => {
    const realm = await createRealm(api, request);
    const response = await beginAuthorization(request, realm, {
      codeChallengeMethod: 'plain',
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(await authorizationContextCount(realm.applicationId)).toBe(0);
  });

  test('missing or invalid verifier cannot exchange the code', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    for (const verifier of ['', 'short', 'wrong'.repeat(12)]) {
      const response = await tokenRequest(request, realm, {
        grant_type: 'authorization_code',
        code: `invalid-${crypto.randomUUID()}`,
        client_id: realm.clientId,
        redirect_uri: redirectUri(realm),
        code_verifier: verifier,
        resource: realm.resource,
      });
      await expectOAuthError(response);
    }
  });

  test('authorization code replay is rejected', async ({
    api,
    request,
    page,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail('code-replay');
    await expectSignUp(request, realm, email);
    const authorization = await obtainAuthorizationCode(page, realm, email);
    const first = await exchangeCode(request, realm, authorization);
    expect(first.ok(), await first.text()).toBe(true);

    const replay = await exchangeCode(request, realm, authorization);

    await expectOAuthError(replay);
  });

  test('code from A cannot be exchanged through issuer or client B', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const response = await tokenRequest(request, realms.b, {
      grant_type: 'authorization_code',
      code: `code-a-${crypto.randomUUID()}`,
      client_id: realms.a.clientId,
      redirect_uri: redirectUri(realms.a),
      code_verifier: 'v'.repeat(64),
      resource: realms.a.resource,
    });
    await expectOAuthError(response);
    expect(await accessTokenCount(realms.a.applicationId)).toBe(0);
    expect(await accessTokenCount(realms.b.applicationId)).toBe(0);
  });

  test('client A cannot authorize through issuer B', async ({ api, request }) => {
    const realms = await createRealmMatrix(api, request);
    const response = await beginAuthorization(request, realms.b, {
      clientId: realms.a.clientId,
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(await authorizationContextCount(realms.b.applicationId)).toBe(0);
  });

  test('redirect URI requires an exact registered match', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    for (const redirect of [
      `${redirectUri(realm)}/`,
      redirectUri(realm).replace('http://', 'https://'),
      `${redirectUri(realm)}?extra=1`,
    ]) {
      const response = await beginAuthorization(request, realm, { redirectUri: redirect });
      expect(response.status()).toBeGreaterThanOrEqual(400);
    }
    expect(await authorizationContextCount(realm.applicationId)).toBe(0);
  });

  test('authorization errors never redirect to an untrusted URI', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const response = await beginAuthorization(request, realm, {
      redirectUri: 'https://attacker.invalid/callback',
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.headers()['location'] ?? '').not.toContain('attacker.invalid');
  });

  test('state is preserved and mismatch is rejected by the client flow', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const state = crypto.randomUUID();
    const response = await beginAuthorization(request, realm, { state });
    expect(response.status()).toBeLessThan(400);
    await withDb(async (sql) => {
      const [context] = await sql<{ state: string }[]>`
        select state from iam.application_authorization_context
        where application_id = ${realm.applicationId}
      `;
      expect(context?.state).toBe(state);
    });
  });

  test('ID token nonce is bound to the authorization request', async ({
    api,
    request,
    page,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail('nonce');
    await expectSignUp(request, realm, email);
    const nonce = crypto.randomUUID();
    const tokens = await completeAuthorizationCodeFlow(page, request, realm, email, { nonce });
    expect(decodeJwt(tokens.id_token).nonce).toBe(nonce);
  });

  test('authorize, exchange, and refresh require the exact canonical resource', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const authorize = await beginAuthorization(request, realms.a, {
      resource: realms.b.resource,
    });
    expect(authorize.status()).toBeGreaterThanOrEqual(400);
    const exchange = await tokenRequest(request, realms.a, {
      grant_type: 'authorization_code',
      code: `invalid-${crypto.randomUUID()}`,
      client_id: realms.a.clientId,
      redirect_uri: redirectUri(realms.a),
      code_verifier: 'v'.repeat(64),
      resource: realms.b.resource,
    });
    await expectOAuthError(exchange, 'invalid_target');
  });

  test('missing, empty, duplicate, or foreign resource returns invalid_target', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const urls = [
      (() => {
        const url = new URL(authorizeUrl(realms.a));
        url.searchParams.delete('resource');
        return url.toString();
      })(),
      authorizeUrl(realms.a, { resource: '' }),
      `${authorizeUrl(realms.a)}&resource=${encodeURIComponent(realms.a.resource)}`,
      authorizeUrl(realms.a, { resource: realms.b.resource }),
    ];
    for (const url of urls) {
      const response = await request.get(url, { maxRedirects: 0 });
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(await response.text()).toContain('invalid_target');
    }
  });

  test('resource A cannot produce an audience through issuer or client B', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const response = await tokenRequest(request, realms.b, {
      grant_type: 'refresh_token',
      refresh_token: `refresh-${crypto.randomUUID()}`,
      client_id: realms.b.clientId,
      resource: realms.a.resource,
    });
    await expectOAuthError(response, 'invalid_target');
    expect(await accessTokenCount(realms.b.applicationId)).toBe(0);
  });

  test('tokens contain only granted and approved scopes and claims', async ({
    api,
    request,
    page,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail('scope');
    await expectSignUp(request, realm, email);
    const tokens = await completeAuthorizationCodeFlow(page, request, realm, email, {
      scope: 'openid email',
    });
    const access = decodeJwt(tokens.access_token);
    expect(new Set(String(access.scope).split(' '))).toEqual(new Set(['openid', 'email']));
  });

  test('unknown scope cannot silently expand privileges', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const response = await beginAuthorization(request, realm, {
      scope: 'openid email platform:admin',
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(await authorizationContextCount(realm.applicationId)).toBe(0);
  });

  test('client_credentials never issues a userless token', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const response = await tokenRequest(request, realm, {
      grant_type: 'client_credentials',
      client_id: realm.clientId,
      resource: realm.resource,
    });
    await expectOAuthError(response, 'unsupported_grant_type');
    expect(await accessTokenCount(realm.applicationId)).toBe(0);
  });

  test('password and implicit grants are unavailable', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    for (const grantType of ['password', 'implicit']) {
      const response = await tokenRequest(request, realm, {
        grant_type: grantType,
        client_id: realm.clientId,
        username: uniqueEmail(),
        password: defaultPassword,
        resource: realm.resource,
      });
      await expectOAuthError(response, 'unsupported_grant_type');
    }
  });

  test('ID token has valid signature, issuer, audience, subject, times, nonce, and email claims', async ({
    api,
    request,
    page,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail('id-claims');
    await expectSignUp(request, realm, email);
    const nonce = crypto.randomUUID();
    const tokens = await completeAuthorizationCodeFlow(page, request, realm, email, { nonce });
    const claims = decodeJwt(tokens.id_token);
    expect(claims).toMatchObject({
      iss: endpoint(realm, ''),
      aud: realm.clientId,
      nonce,
      email,
    });
    expect(claims.sub).toBeTruthy();
    expect(Number(claims.exp)).toBeGreaterThan(Number(claims.iat));
  });

  test('access token has exact realm, resource, user, client, scope, and actor claims', async ({
    api,
    request,
    page,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail('access-claims');
    await expectSignUp(request, realm, email);
    const tokens = await completeAuthorizationCodeFlow(page, request, realm, email);
    const claims = decodeJwt(tokens.access_token);
    expect(claims.iss).toBe(endpoint(realm, ''));
    expect(claims.aud).toBe(realm.resource);
    expect(claims.client_id ?? claims.azp).toBe(realm.clientId);
    expect(claims.sub).toBeTruthy();
    expect(String(claims.scope)).toContain('openid');
  });

  test('tokens contain no password secrets, provider tokens, or platform roles', async ({
    api,
    request,
    page,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail('token-secret');
    await expectSignUp(request, realm, email);
    const tokens = await completeAuthorizationCodeFlow(page, request, realm, email);
    const serialized = JSON.stringify(tokens);
    expect(serialized).not.toContain(defaultPassword);
    expect(serialized).not.toMatch(/provider_token|platform_role|client_secret/iu);
  });

  test('JWKS from issuer A cannot validate a token as issuer B', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const [jwksA, jwksB] = await Promise.all([
      request.get(endpoint(realms.a, '/jwks')),
      request.get(endpoint(realms.b, '/jwks')),
    ]);
    expect(jwksA.ok()).toBe(true);
    expect(jwksB.ok()).toBe(true);
    expect(await jwksA.json()).not.toEqual(await jwksB.json());
  });

  test('consent is bound to exact user, application, client, scopes, and resource', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const email = uniqueEmail('consent');
    await expectSignUp(request, realms.a, email);
    await beginAuthorization(request, realms.a, { scope: 'openid email' });
    await withDb(async (sql) => {
      const rows = await sql`
        select application_id, client_id, scopes, resource
        from iam.application_authorization_context
        where application_id = ${realms.a.applicationId}
      `;
      expect(rows).toEqual([
        expect.objectContaining({
          application_id: realms.a.applicationId,
          client_id: realms.a.clientId,
          scopes: ['openid', 'email'],
          resource: realms.a.resource,
        }),
      ]);
    });
  });

  test('expired authorization context cannot issue a code', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const response = await beginAuthorization(request, realm);
    expect(response.status()).toBeLessThan(400);
    await withDb(
      (sql) => sql`
        update iam.application_authorization_context
        set expires_at = now() - interval '1 second',
            created_at = now() - interval '10 minutes 1 second'
        where application_id = ${realm.applicationId}
      `,
    );
    const continuation = await request.post(endpoint(realm, '/oauth2/continue'), {
      headers: formHeaders(),
      form: {},
      maxRedirects: 0,
    });
    expect(continuation.status()).toBeGreaterThanOrEqual(400);
    expect(await accessTokenCount(realm.applicationId)).toBe(0);
  });

  test('authorization context is single-use', async ({ api, request }) => {
    const realm = await createRealm(api, request);
    await beginAuthorization(request, realm);
    await withDb(
      (sql) => sql`
        update iam.application_authorization_context
        set consumed_at = now()
        where application_id = ${realm.applicationId}
      `,
    );
    const response = await request.post(endpoint(realm, '/oauth2/continue'), {
      headers: formHeaders(),
      form: {},
      maxRedirects: 0,
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('context substitution across browser, client, or application is rejected', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const response = await beginAuthorization(request, realms.a);
    const contextCookie = response
      .headersArray()
      .find(({ name }) => name.toLowerCase() === 'set-cookie')?.value;
    expect(contextCookie).toBeTruthy();
    const substituted = await request.post(endpoint(realms.b, '/oauth2/continue'), {
      headers: { ...formHeaders(), cookie: contextCookie! },
      form: {},
      maxRedirects: 0,
    });
    expect(substituted.status()).toBeGreaterThanOrEqual(400);
    expect(await accessTokenCount(realms.b.applicationId)).toBe(0);
  });

  test('application or client disable after code issuance prevents token exchange', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    await setClientDisabled(realm, true);
    const response = await tokenRequest(request, realm, {
      grant_type: 'authorization_code',
      code: `issued-before-disable-${crypto.randomUUID()}`,
      client_id: realm.clientId,
      redirect_uri: redirectUri(realm),
      code_verifier: 'v'.repeat(64),
      resource: realm.resource,
    });
    await expectOAuthError(response);
    expect(await accessTokenCount(realm.applicationId)).toBe(0);
  });

  test('user block after code issuance prevents token exchange', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail('blocked-code');
    await expectSignUp(request, realm, email);
    await setUserState(realm, email, { status: 'blocked' });
    const response = await tokenRequest(request, realm, {
      grant_type: 'authorization_code',
      code: `issued-before-block-${crypto.randomUUID()}`,
      client_id: realm.clientId,
      redirect_uri: redirectUri(realm),
      code_verifier: 'v'.repeat(64),
      resource: realm.resource,
    });
    await expectOAuthError(response);
    expect(await accessTokenCount(realm.applicationId)).toBe(0);
  });

  test('ambiguous or malformed protocol request cannot issue tokens', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const response = await request.post(endpoint(realm, '/oauth2/token'), {
      headers: formHeaders(),
      data: `grant_type=authorization_code&grant_type=refresh_token&client_id=${realm.clientId}&resource=${encodeURIComponent(realm.resource)}`,
    });
    await expectOAuthError(response);
    expect(await accessTokenCount(realm.applicationId)).toBe(0);
  });
});

interface AuthorizationResult {
  code: string;
  verifier: string;
}

interface TokenResponse {
  access_token: string;
  id_token: string;
  refresh_token: string;
  token_type: string;
}

async function obtainAuthorizationCode(
  page: Page,
  realm: Parameters<typeof authorizeUrl>[0],
  email: string,
  options: Partial<{ nonce: string; scope: string }> = {},
): Promise<AuthorizationResult> {
  const verifier = crypto.randomUUID().replaceAll('-', '').repeat(2);
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  await page.goto(
    authorizeUrl(realm, {
      codeChallenge: challenge,
      nonce: options.nonce,
      scope: options.scope,
    }),
  );
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(defaultPassword);
  await page.locator('form[action="./login/password"] button[type="submit"]').click();
  if (await page.locator('form[action="./consent"]').isVisible().catch(() => false)) {
    await page.locator('button[name="decision"][value="allow"]').click();
  }
  await page.waitForURL((url) => url.searchParams.has('code'));
  const code = new URL(page.url()).searchParams.get('code');
  expect(code).toBeTruthy();
  return { code: code!, verifier };
}

async function exchangeCode(
  request: Parameters<typeof tokenRequest>[0],
  realm: Parameters<typeof tokenRequest>[1],
  authorization: AuthorizationResult,
) {
  return tokenRequest(request, realm, {
    grant_type: 'authorization_code',
    code: authorization.code,
    client_id: realm.clientId,
    redirect_uri: redirectUri(realm),
    code_verifier: authorization.verifier,
    resource: realm.resource,
  });
}

async function completeAuthorizationCodeFlow(
  page: Page,
  request: Parameters<typeof tokenRequest>[0],
  realm: Parameters<typeof tokenRequest>[1],
  email: string,
  options: Partial<{ nonce: string; scope: string }> = {},
): Promise<TokenResponse> {
  const authorization = await obtainAuthorizationCode(page, realm, email, options);
  const response = await exchangeCode(request, realm, authorization);
  expect(response.ok(), await response.text()).toBe(true);
  return response.json() as Promise<TokenResponse>;
}

function decodeJwt(token: string): Record<string, unknown> {
  const payload = token.split('.')[1];
  expect(payload).toBeTruthy();
  return JSON.parse(Buffer.from(payload!, 'base64url').toString('utf8')) as Record<
    string,
    unknown
  >;
}

async function authorizationContextCount(applicationId: string): Promise<number> {
  return withDb((sql) => count(sql, 'application_authorization_context', applicationId));
}

async function accessTokenCount(applicationId: string): Promise<number> {
  return withDb((sql) => count(sql, 'application_oauth_access_token', applicationId));
}

async function makeClientConfidential(
  applicationId: string,
  clientId: string,
  secret: string,
): Promise<void> {
  await withDb(
    (sql) => sql`
      update iam.application_oauth_client
      set public = false,
          client_secret = ${secret},
          token_endpoint_auth_method = 'client_secret_basic',
          revision = revision + 1
      where application_id = ${applicationId} and client_id = ${clientId}
    `,
  );
}
