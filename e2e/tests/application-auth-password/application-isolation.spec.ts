import { createHash } from 'node:crypto';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import type { ApiFixtures } from '@fixtures/api/api';
import { decodeGlobalId } from '@utils/globalid';
import postgres from 'postgres';

type Api = ApiFixtures['api'];
type Sql = ReturnType<typeof postgres>;

interface Realm {
  applicationId: string;
  clientId: string;
  organizationId: string;
  resource: string;
}

interface RealmMatrix {
  a: Realm;
  a2: Realm;
  b: Realm;
}

interface ApplicationCreateResponse {
  data?: {
    applicationMutation: {
      applicationCreate: {
        application: {
          id: string;
          resource: string;
        } | null;
        userErrors: Array<{ code: string; message: string }>;
      };
    };
  };
  errors?: Array<{ message: string }>;
}

const databaseUrl =
  process.env.E2E_DATABASE_URL ??
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:15432/portal';
const adminGraphqlUrl = process.env.ADMIN_GRAPHQL_URL ?? 'http://127.0.0.1:14001/graphql';
const iamBaseUrl = process.env.IAM_HTTP_URL ?? 'http://127.0.0.1:11010';
const password = 'Isolation-password-123!';
const isolationTables = [
  'application_user',
  'application_account',
  'application_session',
  'application_verification',
  'application_authorization_context',
  'application_oauth_access_token',
  'application_oauth_refresh_token',
  'application_oauth_consent',
] as const;
type IsolationTable = (typeof isolationTables)[number];

test.describe('Application password auth — application isolation', () => {
  test('user identifier substitution cannot cross application boundaries', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const email = uniqueEmail();
    await expectSignUp(request, realms.a, email);

    await withDb(async (sql) => {
      const [user] = await sql<{ id: string }[]>`
        select id
        from iam.application_user
        where application_id = ${realms.a.applicationId} and email = ${email}
      `;
      expect(user).toBeDefined();
      const foreign = await sql`
        select id
        from iam.application_user
        where application_id = ${realms.b.applicationId} and id = ${user!.id}
      `;
      expect(foreign).toHaveLength(0);
    });
  });

  test('password account identifier substitution cannot cross application boundaries', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const email = uniqueEmail();
    await expectSignUp(request, realms.a, email);

    await withDb(async (sql) => {
      const [account] = await sql<{ id: string; user_id: string }[]>`
        select id, user_id
        from iam.application_account
        where application_id = ${realms.a.applicationId}
      `;
      expect(account).toBeDefined();
      await expectSqlRejected(
        () => sql`
        update iam.application_account
        set application_id = ${realms.b.applicationId}
        where application_id = ${realms.a.applicationId} and id = ${account!.id}
      `,
      );
      expect(await count(sql, 'application_account', realms.a.applicationId)).toBe(1);
      expect(await count(sql, 'application_account', realms.b.applicationId)).toBe(0);
    });
  });

  test('session identifier and cookie substitution cannot cross application boundaries', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const signup = await expectSignUp(request, realms.a, uniqueEmail());
    const cookie = applicationCookie(signup, realms.a.applicationId);
    const before = await realmCounts(realms);

    const local = await request.get(endpoint(realms.a, '/account/connections'), {
      headers: { cookie, accept: 'text/html' },
      maxRedirects: 0,
    });
    const response = await request.get(endpoint(realms.b, '/account/connections'), {
      headers: { cookie, accept: 'text/html' },
      maxRedirects: 0,
    });

    expect(local.ok(), await local.text()).toBe(true);
    expect(response.ok()).toBe(false);
    await expectRealmCounts(realms, before);
  });

  test('password-reset artifacts cannot cross application boundaries', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const email = uniqueEmail();
    await Promise.all([
      enablePasswordReset(realms.a),
      enablePasswordReset(realms.b),
      configurePresentation(realms.a, 'Reset A', 'reset-a'),
      configurePresentation(realms.b, 'Reset B', 'reset-b'),
    ]);
    await expectSignUp(request, realms.a, email);
    const requestReset = await request.post(endpoint(realms.a, '/request-password-reset'), {
      headers: jsonHeaders(),
      data: { email, redirectTo: endpoint(realms.a, '/password/reset') },
    });
    expect(requestReset.ok(), await requestReset.text()).toBe(true);
    const token = await withDb(async (sql) => {
      const [row] = await sql<{ value: string }[]>`
        select value from iam.application_verification
        where application_id = ${realms.a.applicationId}
        order by created_at desc limit 1
      `;
      return row!.value;
    });
    const before = await realmCounts(realms);

    const response = await request.post(endpoint(realms.b, '/reset-password'), {
      headers: jsonHeaders(),
      data: { token, newPassword: 'Foreign-reset-password-456!' },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
    await expectRealmCounts(realms, before);
  });

  test('authorization context cannot be read or continued in another application', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const authorize = await beginAuthorization(request, realms.a);
    const contextCookie = headerCookie(authorize, 'authorization_context');
    expect(contextCookie).toContain(realms.a.applicationId);
    const before = await contextCounts(realms);

    const foreignCookie = contextCookie.replace(realms.a.applicationId, realms.b.applicationId);
    const response = await request.post(endpoint(realms.b, '/oauth2/continue'), {
      headers: formHeaders(foreignCookie),
      form: {},
      maxRedirects: 0,
    });

    expect(response.ok()).toBe(false);
    expect(await contextCounts(realms)).toEqual(before);
  });

  test('authorization code cannot be exchanged in another application or client', async ({
    api,
    request,
    page,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const email = uniqueEmail();
    await expectSignUp(request, realms.a, email);
    const authorization = await obtainAuthorizationCode(page, realms.a, email);
    const before = await realmCounts(realms);

    const response = await request.post(endpoint(realms.b, '/oauth2/token'), {
      headers: formHeaders(),
      form: {
        grant_type: 'authorization_code',
        code: authorization.code,
        client_id: realms.a.clientId,
        redirect_uri: redirectUri(realms.a),
        code_verifier: authorization.verifier,
        resource: realms.a.resource,
      },
    });

    await expectOAuthFailure(response);
    await expectRealmCounts(realms, before);
    const validExchange = await exchangeAuthorizationCode(
      request,
      realms.a,
      authorization,
    );
    expect(validExchange.ok(), await validExchange.text()).toBe(true);
  });

  test('access token A is inactive for expected application or audience B', async ({
    api,
    request,
    page,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const email = uniqueEmail();
    await expectSignUp(request, realms.a, email);
    const tokens = await issueTokens(page, request, realms.a, email);
    const response = await request.post(endpoint(realms.b, '/oauth2/introspect'), {
      headers: formHeaders(),
      form: {
        token: tokens.access_token,
        token_type_hint: 'access_token',
        client_id: realms.b.clientId,
      },
    });

    expect(response.ok()).toBe(true);
    expect(await response.json()).toMatchObject({ active: false });
  });

  test('refresh family cannot be used or revoked from another application', async ({
    api,
    request,
    page,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const email = uniqueEmail();
    await expectSignUp(request, realms.a, email);
    const tokens = await issueTokens(page, request, realms.a, email);
    const before = await realmCounts(realms);

    const refresh = await request.post(endpoint(realms.b, '/oauth2/token'), {
      headers: formHeaders(),
      form: {
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token,
        client_id: realms.a.clientId,
        resource: realms.a.resource,
      },
    });
    const revoke = await request.post(endpoint(realms.b, '/oauth2/revoke'), {
      headers: formHeaders(),
      form: {
        token: tokens.refresh_token,
        token_type_hint: 'refresh_token',
        client_id: realms.a.clientId,
      },
    });

    await expectOAuthFailure(refresh);
    expect([200, 400, 401]).toContain(revoke.status());
    await expectRealmCounts(realms, before);
    const validRefresh = await request.post(endpoint(realms.a, '/oauth2/token'), {
      headers: formHeaders(),
      form: {
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token,
        client_id: realms.a.clientId,
        resource: realms.a.resource,
      },
    });
    expect(validRefresh.ok(), await validRefresh.text()).toBe(true);
  });

  test('consent cannot transfer scopes or approval to another realm or client', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    await withDb(async (sql) => {
      const user = await seedApplicationUser(sql, realms.a);
      await sql`
        insert into iam.application_oauth_consent
          (id, application_id, client_id, user_id, reference_id, scopes)
        values
          (${crypto.randomUUID()}, ${realms.a.applicationId}, ${realms.a.clientId},
           ${user}, ${crypto.randomUUID()}, ${sql.array(['openid', 'email'])})
      `;
      await expectSqlRejected(
        () => sql`
        update iam.application_oauth_consent
        set application_id = ${realms.b.applicationId}
        where application_id = ${realms.a.applicationId} and user_id = ${user}
      `,
      );
      expect(await count(sql, 'application_oauth_consent', realms.a.applicationId)).toBe(1);
      expect(await count(sql, 'application_oauth_consent', realms.b.applicationId)).toBe(0);
    });
  });

  test('OAuth client cannot be substituted across application issuers', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const response = await request.get(
      authorizeUrl(realms.b, {
        clientId: realms.a.clientId,
        resource: realms.b.resource,
      }),
      { maxRedirects: 0 },
    );

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(await contextCount(realms.b)).toBe(0);
  });

  test('applications publish distinct signing keys', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const [jwksA, jwksB] = await Promise.all([
      getJson<{ keys: Array<{ kid: string; n?: string; x?: string }> }>(
        request,
        endpoint(realms.a, '/jwks'),
      ),
      getJson<{ keys: Array<{ kid: string; n?: string; x?: string }> }>(
        request,
        endpoint(realms.b, '/jwks'),
      ),
    ]);

    expect(jwksA.keys.length).toBeGreaterThan(0);
    expect(jwksB.keys.length).toBeGreaterThan(0);
    expect(new Set(jwksA.keys.map((key) => `${key.kid}:${key.n ?? key.x}`))).not.toEqual(
      new Set(jwksB.keys.map((key) => `${key.kid}:${key.n ?? key.x}`)),
    );
  });

  test('canonical resource is unique and rejected outside its application', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    expect(new Set([realms.a.resource, realms.a2.resource, realms.b.resource]).size).toBe(3);

    const response = await request.get(
      authorizeUrl(realms.b, {
        clientId: realms.b.clientId,
        resource: realms.a.resource,
      }),
      { maxRedirects: 0 },
    );
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(await contextCount(realms.b)).toBe(0);
  });

  test('route, client, redirect, and resource disagreement fails closed', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const before = await realmCounts(realms);
    const response = await request.post(endpoint(realms.b, '/oauth2/token'), {
      headers: formHeaders(),
      form: {
        grant_type: 'authorization_code',
        code: `foreign-${crypto.randomUUID()}`,
        client_id: realms.a.clientId,
        redirect_uri: redirectUri(realms.a),
        code_verifier: 'x'.repeat(64),
        resource: realms.a.resource,
      },
    });

    await expectOAuthFailure(response);
    await expectRealmCounts(realms, before);
  });

  test('positive and negative auth caches are application-scoped', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const email = uniqueEmail();
    await expectSignUp(request, realms.a, email);
    await expectInvalidSignIn(request, realms.b, email, password);
    await expectSignUp(request, realms.b, email);
    const response = await signIn(request, realms.b, email, password);
    expect(response.ok()).toBe(true);
    expect(applicationCookie(response, realms.b.applicationId)).toContain(realms.b.applicationId);
  });

  test('identity rate limits are realm-scoped', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const email = uniqueEmail();
    await expectSignUp(request, realms.a, email);

    const attemptsA = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      attemptsA.push(await signIn(request, realms.a, email, 'wrong-password'));
    }
    const b = await signIn(request, realms.b, email, 'wrong-password');

    expect(attemptsA.at(-1)!.status()).toBe(429);
    expect(b.headers()['retry-after']).toBeUndefined();
    expect(b.status()).toBe(401);
  });

  test('branding and configured delivery profiles remain application-scoped', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    await configurePresentation(realms.a, 'Realm Alpha', 'alpha-reset');
    await configurePresentation(realms.b, 'Realm Beta', 'beta-reset');

    const [pageA, pageB] = await Promise.all([
      request.get(endpoint(realms.a, '/login'), { headers: { accept: 'text/html' } }),
      request.get(endpoint(realms.b, '/login'), { headers: { accept: 'text/html' } }),
    ]);
    const [htmlA, htmlB] = await Promise.all([pageA.text(), pageB.text()]);
    expect(htmlA).toContain('Realm Alpha');
    expect(htmlA).not.toContain('Realm Beta');
    expect(htmlB).toContain('Realm Beta');
    expect(htmlB).not.toContain('Realm Alpha');

    await withDb(async (sql) => {
      const profiles = await sql<{ application_id: string; password_reset_template_id: string }[]>`
        select application_id, password_reset_template_id
        from iam.application_auth_delivery_profile
        where application_id in (${realms.a.applicationId}, ${realms.b.applicationId})
        order by application_id
      `;
      expect(profiles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            application_id: realms.a.applicationId,
            password_reset_template_id: 'alpha-reset',
          }),
          expect.objectContaining({
            application_id: realms.b.applicationId,
            password_reset_template_id: 'beta-reset',
          }),
        ]),
      );
    });
  });

  test('administrative provisioning audits retain the correct realm and actor bindings', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    await withDb(async (sql) => {
      const rows = await sql<
        {
          application_id: string;
          organization_id: string;
          actor_id: string | null;
        }[]
      >`
        select application_id, organization_id, actor_id
        from iam.application_auth_admin_audit
        where application_id in (
          ${realms.a.applicationId}, ${realms.a2.applicationId}, ${realms.b.applicationId}
        )
      `;
      expect(rows.length).toBeGreaterThanOrEqual(3);
      for (const row of rows) {
        const realm = [realms.a, realms.a2, realms.b].find(
          (candidate) => candidate.applicationId === row.application_id,
        );
        expect(realm).toBeDefined();
        expect(row.organization_id).toBe(realm!.organizationId);
        expect(row.actor_id).toBe(api.session.user.userId);
      }
    });
  });

  test('all isolation rules hold between applications in the same organization', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    expect(realms.a.organizationId).toBe(realms.a2.organizationId);
    const email = uniqueEmail();
    const signup = await expectSignUp(request, realms.a, email);
    const cookie = applicationCookie(signup, realms.a.applicationId);

    await expectInvalidSignIn(request, realms.a2, email, password);
    const local = await request.get(endpoint(realms.a, '/account/connections'), {
      headers: { cookie, accept: 'text/html' },
      maxRedirects: 0,
    });
    const foreign = await request.get(endpoint(realms.a2, '/account/connections'), {
      headers: { cookie: cookie.replace(realms.a.applicationId, realms.a2.applicationId) },
      maxRedirects: 0,
    });
    expect(local.ok(), await local.text()).toBe(true);
    expect(foreign.ok()).toBe(false);
    expect(await contextCount(realms.a2)).toBe(0);
  });

  test('repository or cache failure cannot trigger an unscoped permissive fallback', async () => {
    test.fixme(
      true,
      'E2E runtime needs controllable scoped repository and cache failures',
    );
  });

  test('parallel activity in A and B keeps cookies and authorization contexts isolated', async ({
    api,
    request,
  }) => {
    const realms = await createRealmMatrix(api, request);
    const email = uniqueEmail();
    const [signupA, signupB, authorizeA, authorizeB] = await Promise.all([
      expectSignUp(request, realms.a, email),
      expectSignUp(request, realms.b, email),
      beginAuthorization(request, realms.a),
      beginAuthorization(request, realms.b),
    ]);

    const cookieA = applicationCookie(signupA, realms.a.applicationId);
    const cookieB = applicationCookie(signupB, realms.b.applicationId);
    expect(cookieA).not.toBe(cookieB);
    expect(cookieA).not.toContain(realms.b.applicationId);
    expect(cookieB).not.toContain(realms.a.applicationId);
    expect(headerCookie(authorizeA, 'authorization_context')).not.toBe(
      headerCookie(authorizeB, 'authorization_context'),
    );

    await withDb(async (sql) => {
      expect(await count(sql, 'application_user', realms.a.applicationId)).toBe(1);
      expect(await count(sql, 'application_user', realms.b.applicationId)).toBe(1);
      expect(await count(sql, 'application_authorization_context', realms.a.applicationId)).toBe(1);
      expect(await count(sql, 'application_authorization_context', realms.b.applicationId)).toBe(1);
      const crossBoundArtifacts = await sql`
        select c.id
        from iam.application_authorization_context c
        join iam.application_oauth_client client on client.client_id = c.client_id
        where c.application_id <> client.application_id
      `;
      expect(crossBoundArtifacts).toHaveLength(0);
    });
  });
});

async function createRealmMatrix(api: Api, request: APIRequestContext): Promise<RealmMatrix> {
  await api.session.setupUser();
  const organizationA = await api.session.setupOrganization({
    displayName: 'Isolation organization A',
  });
  const a = await createRealm(api, request, organizationA.id, 'a');
  const a2 = await createRealm(api, request, organizationA.id, 'a2');
  const organizationB = await api.session.setupOrganization({
    displayName: 'Isolation organization B',
  });
  const b = await createRealm(api, request, organizationB.id, 'b');
  return { a, a2, b };
}

async function createRealm(
  api: Api,
  request: APIRequestContext,
  organizationGlobalId: string,
  suffix: string,
): Promise<Realm> {
  const response = await request.post(adminGraphqlUrl, {
    headers: {
      authorization: `Bearer ${api.session.accessToken}`,
      'content-type': 'application/json',
      'x-organization-id': organizationGlobalId,
    },
    data: {
      query: `
        mutation CreateIsolationApplication($input: ApplicationCreateInput!) {
          applicationMutation {
            applicationCreate(input: $input) {
              application { id resource }
              userErrors { code message }
            }
          }
        }
      `,
      variables: {
        input: {
          organizationId: organizationGlobalId,
          name: `isolation-${suffix}-${crypto.randomUUID().slice(0, 8)}`,
          displayName: `Isolation ${suffix.toUpperCase()}`,
        },
      },
    },
  });
  expect(response.ok()).toBe(true);
  const json = (await response.json()) as ApplicationCreateResponse;
  expect(json.errors).toBeUndefined();
  const payload = json.data?.applicationMutation.applicationCreate;
  expect(payload?.userErrors).toEqual([]);
  expect(payload?.application).not.toBeNull();

  const applicationGlobalId = payload!.application!.id;
  const applicationId = decodeGlobalId(applicationGlobalId).id;
  const organizationId = decodeGlobalId(organizationGlobalId).id;
  const resource = payload!.application!.resource;
  const provisionalRealm = { applicationId, clientId: '', organizationId, resource };
  await withDb(async (sql) => {
    await sql`
      update iam.application_auth_configuration
      set realm_enabled = true,
          registration_mode = 'open',
          password_sign_in_enabled = true,
          password_sign_up_enabled = true,
          password_reset_enabled = false,
          email_verification_required = false,
          revision = revision + 1,
          updated_at = now()
      where application_id = ${applicationId}
    `;
    await sql`
      insert into iam.application_auth_origin (application_id, origin)
      values (${applicationId}, ${iamBaseUrl})
      on conflict (application_id, origin) do nothing
    `;
  });
  const { data } = await api.admin.mutation('application-admin-api/ApplicationOAuthClientCreate', {
    variables: {
      input: {
        organizationId: organizationGlobalId,
        applicationId: applicationGlobalId,
        name: `Isolation ${suffix}`,
        clientType: 'PUBLIC',
        environment: 'DEVELOPMENT',
        redirectUris: [redirectUri(provisionalRealm)],
        postLogoutRedirectUris: [
          `${iamBaseUrl}/e2e/oauth/signed-out/${provisionalRealm.applicationId}`,
        ],
        enableEndSession: true,
        skipConsent: false,
      },
    },
  });
  const clientPayload = data.applicationMutation.applicationOAuthClientCreate;
  expect(clientPayload.userErrors).toEqual([]);
  expect(clientPayload.client).not.toBeNull();
  return {
    ...provisionalRealm,
    clientId: clientPayload.client!.clientId,
  };
}

async function expectSignUp(
  request: APIRequestContext,
  realm: Realm,
  email: string,
): Promise<APIResponse> {
  const response = await request.post(endpoint(realm, '/sign-up/email'), {
    headers: jsonHeaders(),
    data: { name: 'Isolation User', email, password },
  });
  expect(response.ok(), await response.text()).toBe(true);
  expect(applicationCookie(response, realm.applicationId)).toContain(realm.applicationId);
  return response;
}

function signIn(
  request: APIRequestContext,
  realm: Realm,
  email: string,
  candidatePassword: string,
): Promise<APIResponse> {
  return request.post(endpoint(realm, '/sign-in/email'), {
    headers: jsonHeaders(),
    data: { email, password: candidatePassword },
  });
}

async function expectInvalidSignIn(
  request: APIRequestContext,
  realm: Realm,
  email: string,
  candidatePassword: string,
): Promise<void> {
  const response = await signIn(request, realm, email, candidatePassword);
  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({
    error: 'invalid_credentials',
    error_description: 'Email or password is invalid',
  });
}

function beginAuthorization(request: APIRequestContext, realm: Realm): Promise<APIResponse> {
  return request.get(authorizeUrl(realm), {
    headers: { accept: 'text/html' },
    maxRedirects: 0,
  });
}

function authorizeUrl(
  realm: Realm,
  overrides: { clientId?: string; resource?: string; codeChallenge?: string } = {},
): string {
  const params = new URLSearchParams({
    client_id: overrides.clientId ?? realm.clientId,
    response_type: 'code',
    redirect_uri: redirectUri(realm),
    scope: 'openid profile email offline_access',
    state: crypto.randomUUID(),
    nonce: crypto.randomUUID(),
    code_challenge: overrides.codeChallenge ?? 'A'.repeat(43),
    code_challenge_method: 'S256',
    resource: overrides.resource ?? realm.resource,
  });
  return `${endpoint(realm, '/oauth2/authorize')}?${params}`;
}

interface AuthorizationResult {
  code: string;
  verifier: string;
}

interface TokenSet {
  access_token: string;
  refresh_token: string;
}

async function obtainAuthorizationCode(
  page: Page,
  realm: Realm,
  email: string,
): Promise<AuthorizationResult> {
  const verifier = crypto.randomUUID().replaceAll('-', '').repeat(2);
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  await page.context().clearCookies();
  await page.goto(authorizeUrl(realm, { codeChallenge: challenge }));
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('form[action="./login/password"] button[type="submit"]').click();
  if (await page.locator('form[action="./consent"]').isVisible().catch(() => false)) {
    await page.locator('button[name="decision"][value="allow"]').click();
  }
  await page.waitForURL((url) => url.searchParams.has('code'));
  const code = new URL(page.url()).searchParams.get('code');
  expect(code).toBeTruthy();
  return { code: code!, verifier };
}

function exchangeAuthorizationCode(
  request: APIRequestContext,
  realm: Realm,
  authorization: AuthorizationResult,
): Promise<APIResponse> {
  return request.post(endpoint(realm, '/oauth2/token'), {
    headers: formHeaders(),
    form: {
      grant_type: 'authorization_code',
      code: authorization.code,
      client_id: realm.clientId,
      redirect_uri: redirectUri(realm),
      code_verifier: authorization.verifier,
      resource: realm.resource,
    },
  });
}

async function issueTokens(
  page: Page,
  request: APIRequestContext,
  realm: Realm,
  email: string,
): Promise<TokenSet> {
  const authorization = await obtainAuthorizationCode(page, realm, email);
  const response = await exchangeAuthorizationCode(request, realm, authorization);
  expect(response.ok(), await response.text()).toBe(true);
  return response.json() as Promise<TokenSet>;
}

function endpoint(realm: Pick<Realm, 'applicationId'>, path: string): string {
  return `${iamBaseUrl}/auth/applications/${realm.applicationId}${path}`;
}

function redirectUri(realm: Pick<Realm, 'applicationId'>): string {
  return `${iamBaseUrl}/e2e/oauth/callback/${realm.applicationId}`;
}

function jsonHeaders(): Record<string, string> {
  return {
    accept: 'application/json',
    'content-type': 'application/json',
    origin: iamBaseUrl,
  };
}

function formHeaders(cookie?: string): Record<string, string> {
  return {
    accept: 'application/json',
    'content-type': 'application/x-www-form-urlencoded',
    origin: iamBaseUrl,
    ...(cookie ? { cookie } : {}),
  };
}

function applicationCookie(response: APIResponse, applicationId: string): string {
  return headerCookie(response, `shopana_application_${applicationId}`);
}

function headerCookie(response: APIResponse, fragment: string): string {
  const value = response
    .headersArray()
    .filter(({ name }) => name.toLowerCase() === 'set-cookie')
    .map(({ value: header }) => header.split(';', 1)[0]!)
    .find((cookie) => cookie.includes(fragment));
  expect(value, `Set-Cookie containing "${fragment}"`).toBeDefined();
  return value!;
}

async function expectOAuthFailure(response: APIResponse): Promise<void> {
  expect(response.status()).toBeGreaterThanOrEqual(400);
  const body = await response.json();
  expect(body).toEqual(expect.objectContaining({ error: expect.any(String) }));
  expect(JSON.stringify(body)).not.toMatch(
    /(?:application_id|organization_id|postgres|select\s|stack|node_modules)/iu,
  );
}

async function getJson<T>(request: APIRequestContext, url: string): Promise<T> {
  const response = await request.get(url, { headers: { accept: 'application/json' } });
  expect(response.ok(), await response.text()).toBe(true);
  return response.json() as Promise<T>;
}

function uniqueEmail(): string {
  return `isolation-${crypto.randomUUID()}@playwright.dev`;
}

async function withDb<T>(callback: (sql: Sql) => Promise<T>): Promise<T> {
  const sql = postgres(databaseUrl, { max: 1 });
  try {
    return await callback(sql);
  } finally {
    await sql.end();
  }
}

async function count(sql: Sql, table: IsolationTable, applicationId: string): Promise<number> {
  const query = {
    application_user: () => sql<{ count: number }[]>`
      select count(*)::int as count from iam.application_user
      where application_id = ${applicationId}
    `,
    application_account: () => sql<{ count: number }[]>`
      select count(*)::int as count from iam.application_account
      where application_id = ${applicationId}
    `,
    application_session: () => sql<{ count: number }[]>`
      select count(*)::int as count from iam.application_session
      where application_id = ${applicationId}
    `,
    application_verification: () => sql<{ count: number }[]>`
      select count(*)::int as count from iam.application_verification
      where application_id = ${applicationId}
    `,
    application_authorization_context: () => sql<{ count: number }[]>`
      select count(*)::int as count from iam.application_authorization_context
      where application_id = ${applicationId}
    `,
    application_oauth_access_token: () => sql<{ count: number }[]>`
      select count(*)::int as count from iam.application_oauth_access_token
      where application_id = ${applicationId}
    `,
    application_oauth_refresh_token: () => sql<{ count: number }[]>`
      select count(*)::int as count from iam.application_oauth_refresh_token
      where application_id = ${applicationId}
    `,
    application_oauth_consent: () => sql<{ count: number }[]>`
      select count(*)::int as count from iam.application_oauth_consent
      where application_id = ${applicationId}
    `,
  }[table];
  const [row] = await query();
  return row!.count;
}

async function realmCounts(realms: RealmMatrix): Promise<Record<string, number[]>> {
  return withDb(async (sql) => {
    const result: Record<string, number[]> = {};
    for (const realm of [realms.a, realms.a2, realms.b]) {
      result[realm.applicationId] = await Promise.all(
        isolationTables.map((table) => count(sql, table, realm.applicationId)),
      );
    }
    return result;
  });
}

async function expectRealmCounts(
  realms: RealmMatrix,
  expected: Record<string, number[]>,
): Promise<void> {
  expect(await realmCounts(realms)).toEqual(expected);
}

function contextCounts(realms: RealmMatrix): Promise<number[]> {
  return Promise.all([contextCount(realms.a), contextCount(realms.a2), contextCount(realms.b)]);
}

function contextCount(realm: Realm): Promise<number> {
  return withDb((sql) => count(sql, 'application_authorization_context', realm.applicationId));
}

async function expectSqlRejected(operation: () => Promise<unknown>): Promise<void> {
  let rejected = false;
  try {
    await operation();
  } catch {
    rejected = true;
  }
  expect(rejected).toBe(true);
}

async function seedApplicationUser(sql: Sql, realm: Realm): Promise<string> {
  const id = crypto.randomUUID();
  await sql`
    insert into iam.application_user
      (id, application_id, name, email, email_verified, status)
    values
      (${id}, ${realm.applicationId}, 'Consent User', ${uniqueEmail()}, true, 'active')
  `;
  return id;
}

async function configurePresentation(
  realm: Realm,
  displayName: string,
  resetTemplate: string,
): Promise<void> {
  await withDb(async (sql) => {
    await sql`
      update iam.application_auth_configuration
      set branding_json = ${JSON.stringify({ displayName })}::jsonb,
          revision = revision + 1,
          updated_at = now()
      where application_id = ${realm.applicationId}
    `;
    await sql`
      insert into iam.application_auth_delivery_profile (
        application_id, transport_profile, sender_identity,
        email_verification_template_id, password_reset_template_id,
        email_otp_sign_in_template_id, updated_by
      )
      values (
        ${realm.applicationId}, ${`transport-${realm.applicationId}`},
        ${`auth+${realm.applicationId}@playwright.dev`},
        ${`verify-${realm.applicationId}`}, ${resetTemplate},
        ${`otp-${realm.applicationId}`}, 'e2e'
      )
      on conflict (application_id) do update set
        transport_profile = excluded.transport_profile,
        sender_identity = excluded.sender_identity,
        email_verification_template_id = excluded.email_verification_template_id,
        password_reset_template_id = excluded.password_reset_template_id,
        email_otp_sign_in_template_id = excluded.email_otp_sign_in_template_id,
        updated_by = excluded.updated_by,
        updated_at = now()
    `;
  });
}

async function enablePasswordReset(realm: Realm): Promise<void> {
  await withDb(
    (sql) => sql`
      update iam.application_auth_configuration
      set password_reset_enabled = true,
          revision = revision + 1,
          updated_at = now()
      where application_id = ${realm.applicationId}
    `,
  );
}
