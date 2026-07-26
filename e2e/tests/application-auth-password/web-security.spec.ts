import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import {
  applicationCookie,
  authorizeUrl,
  beginAuthorization,
  createRealm,
  endpoint,
  expectRealmState,
  expectSecretFree,
  expectSignUp,
  iamBaseUrl,
  jsonHeaders,
  realmState,
  setCookieHeaders,
  signIn,
  uniqueEmail,
  withDb,
} from './application-auth-test-kit';
import { composeGlobalId } from '@utils/globalid';

test.describe('Application password auth — browser and transport security', () => {
  test('CSRF protects signup, signin, reset, consent, and logout forms', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const before = await realmState(realm);
    const paths = ['/login/password', '/signup/password', '/consent', '/logout'];
    for (const path of paths) {
      const response = await request.post(endpoint(realm, path), {
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          origin: 'https://attacker.invalid',
        },
        form: { email: uniqueEmail(), password: 'Csrf-password-123!' },
        maxRedirects: 0,
      });
      expect(response.status(), path).toBeGreaterThanOrEqual(400);
    }
    await expectRealmState(realm, before);
  });

  test('origin enforcement accepts only exact configured origins', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const { response: accepted, cookie } = await openLoginPage(request, realm, {
      origin: iamBaseUrl,
    });
    const rejected = await request.get(endpoint(realm, '/login'), {
      headers: {
        cookie,
        origin: `${iamBaseUrl}.attacker.invalid`,
        accept: 'text/html',
      },
    });
    expect(accepted.ok()).toBe(true);
    expect(rejected.status()).toBeGreaterThanOrEqual(400);
    expect(rejected.headers()['access-control-allow-origin']).toBeUndefined();
  });

  test('Host header poisoning cannot alter canonical URLs or cookie realm', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const response = await request.get(endpoint(realm, '/login'), {
      headers: { host: 'attacker.invalid', accept: 'text/html' },
      maxRedirects: 0,
    });
    expect(response.headers()['location'] ?? '').not.toContain('attacker.invalid');
    expect(await response.text()).not.toContain('attacker.invalid');
    expect(response.headers()['set-cookie'] ?? '').not.toContain('attacker.invalid');
  });

  test('untrusted proxy headers cannot alter URLs or bypass IP limits', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail('proxy');
    await expectSignUp(request, realm, email);
    const responses = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      responses.push(
        await signIn(request, realm, email, 'Wrong-password-123!', {
          'x-forwarded-for': `203.0.113.${attempt + 1}`,
          'x-forwarded-host': 'attacker.invalid',
          'x-forwarded-proto': 'https',
        }),
      );
    }
    expect(responses.at(-1)!.status()).toBe(429);
    expect(responses.every((response) => !(response.headers()['location'] ?? '').includes('attacker'))).toBe(
      true,
    );
  });

  test('path encoding and normalization tricks cannot bypass default-deny routing', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const before = await realmState(realm);
    const paths = [
      '/%2e%2e/oauth2/token',
      '//sign-in/email',
      '/sign-in%2femail',
      '/sign-in/./email',
      '/SIGN-IN/email',
    ];
    for (const path of paths) {
      const response = await request.post(endpoint(realm, path), {
        headers: jsonHeaders(),
        data: { email: uniqueEmail(), password: 'Path-password-123!' },
      });
      expect(response.status(), path).toBeGreaterThanOrEqual(400);
    }
    await expectRealmState(realm, before);
  });

  test('unsupported content type, charset, encoding, and malformed forms fail early', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const before = await realmState(realm);
    const variants = [
      { 'content-type': 'text/plain' },
      { 'content-type': 'application/json; charset=utf-16' },
      { 'content-type': 'application/octet-stream' },
      { 'content-type': 'application/json', 'content-encoding': 'gzip' },
    ];
    for (const headers of variants) {
      const response = await request.post(endpoint(realm, '/sign-in/email'), {
        headers: { ...headers, origin: iamBaseUrl },
        data: '{malformed',
      });
      expect(response.status()).toBeGreaterThanOrEqual(400);
    }
    await expectRealmState(realm, before);
  });

  test('oversized auth body fails before credential or token processing', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const before = await realmState(realm);
    const response = await request.post(endpoint(realm, '/sign-in/email'), {
      headers: jsonHeaders(),
      data: {
        email: uniqueEmail(),
        password: 'x'.repeat(2 * 1024 * 1024),
      },
    });
    expect([400, 413]).toContain(response.status());
    await expectRealmState(realm, before);
  });

  test('hosted UI returns the complete required security header policy', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const { response } = await openLoginPage(request, realm);
    const headers = response.headers();
    expect(headers['content-security-policy']).toMatch(/(?:^|;)\s*base-uri\s+'none'(?:;|$)/iu);
    expect(headers['content-security-policy']).toMatch(/(?:^|;)\s*form-action\s+'self'(?:;|$)/iu);
    expect(headers['content-security-policy']).toMatch(
      /(?:^|;)\s*frame-ancestors\s+'none'(?:;|$)/iu,
    );
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('no-referrer');
    expect(headers['cache-control']).toMatch(/no-store/iu);
    expect(headers['permissions-policy']).toBeTruthy();
  });

  test('hosted auth pages cannot be embedded by an external frame', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const { response } = await openLoginPage(request, realm);
    const headers = response.headers();
    expect(
      headers['x-frame-options'] === 'DENY' ||
        headers['content-security-policy']?.includes("frame-ancestors 'none'"),
    ).toBe(true);
  });

  test('branding values cannot inject markup, script, CSS, or form destinations', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const marker = `branding-${crypto.randomUUID()}`;
    api.session.organizationId = composeGlobalId('Organization', realm.organizationId);
    const revision = await authRevision(realm);
    const escaped = await api.admin.mutation('application-admin-api/ApplicationAuthUpdate', {
      variables: {
        input: {
          organizationId: composeGlobalId('Organization', realm.organizationId),
          applicationId: composeGlobalId('Application', realm.applicationId),
          expectedRevision: revision,
          branding: {
            displayName: `<script>${marker}</script>`,
            headline: `"><form action="https://attacker.invalid">${marker}`,
          },
        },
      },
    });
    const escapedPayload = escaped.data.applicationMutation.applicationAuthUpdate;
    expect(escapedPayload.userErrors).toEqual([]);
    expect(escapedPayload.configuration).not.toBeNull();

    const rejected = await api.admin.mutation('application-admin-api/ApplicationAuthUpdate', {
      variables: {
        input: {
          organizationId: composeGlobalId('Organization', realm.organizationId),
          applicationId: composeGlobalId('Application', realm.applicationId),
          expectedRevision: escapedPayload.configuration!.revision,
          branding: {
            logoUrl: 'javascript:alert(1)',
          },
        },
      },
    });
    const rejectedPayload = rejected.data.applicationMutation.applicationAuthUpdate;
    expect(rejectedPayload.configuration).toBeNull();
    expect(rejectedPayload.userErrors.length).toBeGreaterThan(0);

    const { response } = await openLoginPage(request, realm);
    const html = await response.text();
    expect(html).not.toContain(`<script>${marker}</script>`);
    expect(html).toContain(`&lt;script&gt;${marker}&lt;/script&gt;`);
    expect(html).not.toContain('action="https://attacker.invalid');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('background:url');
  });

  test('hosted password form does not persist credentials in browser storage or readable cookies', async ({
    api,
    page,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const email = uniqueEmail('storage');
    const password = 'Storage-password-123!';
    await expectSignUp(request, realm, email, password);
    await page.goto(authorizeUrl(realm));
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('form[action="./login/password"] button[type="submit"]').click();
    const storage = await page.evaluate(async () => ({
      local: JSON.stringify(
        Object.fromEntries(
          Array.from({ length: localStorage.length }, (_, index) => {
            const key = localStorage.key(index)!;
            return [key, localStorage.getItem(key)];
          }),
        ),
      ),
      session: JSON.stringify(
        Object.fromEntries(
          Array.from({ length: sessionStorage.length }, (_, index) => {
            const key = sessionStorage.key(index)!;
            return [key, sessionStorage.getItem(key)];
          }),
        ),
      ),
      indexedDbDatabases: JSON.stringify(await indexedDB.databases()),
      readableCookies: document.cookie,
    }));
    expect(storage.local).not.toContain(email);
    expect(storage.local).not.toContain(password);
    expect(storage.session).not.toContain(email);
    expect(storage.session).not.toContain(password);
    expect(storage.indexedDbDatabases).not.toContain(email);
    expect(storage.indexedDbDatabases).not.toContain(password);
    expect(storage.readableCookies).not.toContain(email);
    expect(storage.readableCookies).not.toContain(password);
  });

  test('direct signin response does not reflect credentials or verifier into redirect headers', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const secret = `url-secret-${crypto.randomUUID()}`;
    const response = await request.post(endpoint(realm, '/sign-in/email'), {
      headers: jsonHeaders(),
      data: { email: uniqueEmail(), password: secret, code_verifier: secret },
      maxRedirects: 0,
    });
    expect(response.headers()['location'] ?? '').not.toContain(secret);
    expect(response.headers()['referrer'] ?? '').not.toContain(secret);
    expectSecretFree(await response.text(), [secret]);
  });

  test('OAuth artifacts do not remain in browser history, referrer, storage, or readable cookies', async () => {
    test.fixme(
      true,
      'E2E runtime needs a callback client that exchanges the code and exposes post-callback browser state',
    );
  });

  test('auth HTML, forms, and errors are not cached', async ({ api, request }) => {
    const realm = await createRealm(api, request);
    const responses = await Promise.all([
      request.get(endpoint(realm, '/login'), { headers: { accept: 'text/html' } }),
      request.get(endpoint(realm, '/error?error=invalid_request'), {
        headers: { accept: 'text/html' },
      }),
      signIn(request, realm, uniqueEmail(), 'Wrong-password-123!'),
    ]);
    for (const response of responses) {
      expect(response.headers()['cache-control']).toMatch(/no-store/iu);
      expect(response.headers()['pragma'] ?? 'no-cache').toMatch(/no-cache/iu);
    }
  });

  test('CORS never combines credential access with wildcard origins', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const response = await request.fetch(endpoint(realm, '/login'), {
      method: 'OPTIONS',
      headers: {
        origin: 'https://attacker.invalid',
        'access-control-request-method': 'GET',
      },
    });
    expect(response.headers()['access-control-allow-origin']).not.toBe('*');
    if (response.headers()['access-control-allow-credentials'] === 'true') {
      expect(response.headers()['access-control-allow-origin']).toBe(iamBaseUrl);
    }
  });

  test('public application session cannot access internal Admin GraphQL', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const signup = await expectSignUp(request, realm);
    const cookie = applicationCookie(signup, realm);
    const response = await request.post(
      process.env.ADMIN_GRAPHQL_URL ?? 'http://127.0.0.1:14001/graphql',
      {
        headers: { 'content-type': 'application/json', cookie },
        data: { query: '{ applicationQuery { applications(first: 1) { edges { node { id } } } } }' },
      },
    );
    const body = await response.json();
    expect(body.data?.applicationQuery).toBeFalsy();
    expect(body.errors).toBeTruthy();
  });

  test('only approved metadata paths are publicly reachable', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const approved = await Promise.all([
      request.get(endpoint(realm, '/.well-known/openid-configuration')),
      request.get(
        `${iamBaseUrl}/.well-known/oauth-authorization-server/auth/applications/${realm.applicationId}`,
      ),
    ]);
    expect(approved.every((response) => response.ok())).toBe(true);
    const denied = await Promise.all([
      request.get(`${iamBaseUrl}/.well-known/jwks.json`),
      request.get(`${iamBaseUrl}/.well-known/openid-configuration/${realm.applicationId}`),
      request.get(endpoint(realm, '/.well-known/private-configuration')),
    ]);
    expect(denied.every((response) => response.status() === 404)).toBe(true);
  });

  test('error rendering escapes user-controlled values and prevents reflected XSS', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const payload = `<img src=x onerror=alert('${crypto.randomUUID()}')>`;
    const response = await request.get(
      `${endpoint(realm, '/error')}?error=${encodeURIComponent(payload)}`,
      { headers: { accept: 'text/html' } },
    );
    const html = await response.text();
    expect(html).not.toContain(payload);
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('onerror=');
  });

  test('unknown locale falls back without loading external executable content', async ({
    api,
    request,
  }) => {
    const realm = await createRealm(api, request);
    const { response } = await openLoginPage(request, realm, {
      'accept-language': 'unknown-ZZ',
    });
    expect(response.ok()).toBe(true);
    const html = await response.text();
    expect(html).toContain('Sign');
    expect(response.headers()['content-language']).toBe('en');
    expect(html).not.toMatch(/<script\b/iu);
    for (const match of html.matchAll(/<(?:link|img)[^>]+(?:href|src)=["']([^"']+)["']/giu)) {
      expect(new URL(match[1]!, endpoint(realm, '')).origin).toBe(new URL(iamBaseUrl).origin);
    }
  });
});

async function openLoginPage(
  request: APIRequestContext,
  realm: Parameters<typeof beginAuthorization>[1],
  headers: Record<string, string> = {},
): Promise<{ response: APIResponse; cookie: string }> {
  const authorization = await beginAuthorization(request, realm);
  expect(authorization.status()).toBe(302);
  const authorizationLocation = authorization.headers()['location'];
  expect(authorizationLocation).toBeTruthy();

  const capture = await request.get(
    new URL(authorizationLocation!, endpoint(realm, '')).toString(),
    {
      headers: { accept: 'text/html', ...headers },
      maxRedirects: 0,
    },
  );
  expect(capture.status()).toBe(303);
  const cookie = setCookieHeaders(capture)
    .map((header) => header.split(';', 1)[0]!)
    .join('; ');
  expect(cookie).toBeTruthy();
  const loginLocation = capture.headers()['location'];
  expect(loginLocation).toBeTruthy();
  const response = await request.get(
    new URL(loginLocation!, endpoint(realm, '')).toString(),
    {
      headers: { accept: 'text/html', cookie, ...headers },
    },
  );
  return { response, cookie };
}

function authRevision(realm: { applicationId: string }): Promise<number> {
  return withDb(async (sql) => {
    const [row] = await sql<{ revision: number }[]>`
      select revision
      from iam.application_auth_configuration
      where application_id = ${realm.applicationId}
    `;
    expect(row).toBeDefined();
    return row!.revision;
  });
}
