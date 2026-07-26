import { expect, type APIRequestContext } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import { readQuery } from '@fixtures/api/types';
import { composeGlobalId } from '@utils/globalid';
import {
  IAM_BASE_URL,
  configureProvider,
  createOAuthClient,
  mutateOAuthClient,
  openSql,
  required,
  setRealmEnabled,
  setupApplicationAdminScope,
  updateAuth,
  updateAuthMethod,
  updateProvider,
  type ApplicationAdminScope,
  type ApplicationRef,
  type Api,
  type Sql,
} from './helpers';

const JSON_HEADERS = {
  accept: 'application/json',
  'content-type': 'application/json',
  origin: IAM_BASE_URL,
};

test.describe('Application Admin API - runtime traceability', () => {
  let sql: Sql;
  let scope: ApplicationAdminScope;

  test.beforeEach(async ({ api }) => {
    sql = openSql();
    scope = await setupApplicationAdminScope(api);
  });

  test.afterEach(async () => {
    await sql.end();
  });

  test('APP-RUN-001: application created through Admin GraphQL can be used to build the public auth runtime', async ({
    api,
    request,
  }) => {
    await enablePasswordRealm(api, scope.applicationA);
    const metadata = await request.get(
      runtimeUrl(scope.applicationA, '/.well-known/openid-configuration'),
    );

    expect(metadata.ok(), await metadata.text()).toBe(true);
    expect(await metadata.json()).toMatchObject({
      issuer: runtimeUrl(scope.applicationA, ''),
      authorization_endpoint: runtimeUrl(scope.applicationA, '/oauth2/authorize'),
      token_endpoint: runtimeUrl(scope.applicationA, '/oauth2/token'),
    });
  });

  test('APP-RUN-002: auth method changes through GraphQL are reflected by the public route manifest after invalidation', async ({
    api,
    request,
  }) => {
    await updateAuth(api, scope.applicationA, {
      emailVerificationRequired: false,
      trustedOrigins: [IAM_BASE_URL],
    });
    await updateAuthMethod(api, scope.applicationA, 'password', ['SIGN_IN']);
    await configureProvider(api, scope.applicationA, 'GOOGLE');
    await updateProvider(api, scope.applicationA, 'GOOGLE', { enabled: true });
    await setRealmEnabled(api, scope.applicationA, true);
    const enabled = await request.post(runtimeUrl(scope.applicationA, '/sign-in/email'), {
      headers: JSON_HEADERS,
      data: { email: 'missing@playwright.dev', password: 'invalid-password' },
    });
    await updateAuthMethod(api, scope.applicationA, 'password', []);
    const disabled = await request.post(runtimeUrl(scope.applicationA, '/sign-in/email'), {
      headers: JSON_HEADERS,
      data: { email: 'missing@playwright.dev', password: 'invalid-password' },
    });
    await updateAuthMethod(api, scope.applicationA, 'password', ['SIGN_IN']);
    const reenabled = await request.post(runtimeUrl(scope.applicationA, '/sign-in/email'), {
      headers: JSON_HEADERS,
      data: { email: 'missing@playwright.dev', password: 'invalid-password' },
    });

    expect(enabled.status()).toBe(401);
    expect(disabled.status()).toBe(404);
    expect(reenabled.status()).toBe(401);
  });

  test('APP-RUN-003: trusted origin changes through GraphQL are reflected by CORS and origin checks', async ({
    api,
    request,
  }) => {
    const origin = 'https://admin.example.test';
    await enablePasswordRealm(api, scope.applicationA);
    const denied = await request.fetch(runtimeUrl(scope.applicationA, '/login'), {
      method: 'OPTIONS',
      headers: {
        origin,
        'access-control-request-method': 'GET',
      },
    });
    await updateAuth(api, scope.applicationA, { trustedOrigins: [origin] });
    const allowed = await request.fetch(runtimeUrl(scope.applicationA, '/login'), {
      method: 'OPTIONS',
      headers: {
        origin,
        'access-control-request-method': 'GET',
      },
    });

    expect(denied.status()).toBeGreaterThanOrEqual(400);
    expect(allowed.status()).toBeLessThan(400);
    expect(allowed.headers()['access-control-allow-origin']).toBe(origin);
  });

  test('APP-RUN-004: branding and locale changes through GraphQL are reflected by hosted UI without unsafe markup', async ({
    api,
    request,
  }) => {
    await updateAuth(api, scope.applicationA, {
      branding: {
        displayName: 'GraphQL Branded Realm',
        headline: '<script>window.e2eUnsafe = true</script>',
        primaryColor: 'VIOLET',
        backgroundColor: 'SLATE',
      },
      defaultLocale: 'en',
    });
    await enablePasswordRealm(api, scope.applicationA);
    const response = await request.get(runtimeUrl(scope.applicationA, '/login'), {
      headers: { accept: 'text/html' },
    });
    const html = await response.text();

    expect(response.ok()).toBe(true);
    expect(html).toContain('GraphQL Branded Realm');
    expect(html).not.toContain('<script>window.e2eUnsafe = true</script>');
    expect(html).not.toMatch(/window\.e2eUnsafe\s*=/u);
    expect(html).toMatch(/lang=["']en["']/u);
  });

  test('APP-RUN-005: email delivery configuration through GraphQL is used by verification and reset flows only for the target application', async ({
    api,
  }) => {
    await configureDelivery(api, scope.applicationA, 'target');
    await configureDelivery(api, scope.applicationB, 'other');
    const rows = await sql<
      {
        applicationId: string;
        verificationTemplate: string;
        resetTemplate: string;
      }[]
    >`
      SELECT
        application_id::text AS "applicationId",
        email_verification_template_id AS "verificationTemplate",
        password_reset_template_id AS "resetTemplate"
      FROM iam.application_auth_delivery_profile
      WHERE application_id IN (
        ${scope.applicationA.rawId}::uuid,
        ${scope.applicationB.rawId}::uuid
      )
    `;

    expect(rows).toEqual(
      expect.arrayContaining([
        {
          applicationId: scope.applicationA.rawId,
          verificationTemplate: 'target-verify',
          resetTemplate: 'target-reset',
        },
        {
          applicationId: scope.applicationB.rawId,
          verificationTemplate: 'other-verify',
          resetTemplate: 'other-reset',
        },
      ]),
    );
  });

  test('APP-RUN-006: OAuth client created through GraphQL completes Authorization Code with S256 PKCE', async ({
    api,
    request,
  }) => {
    await enablePasswordRealm(api, scope.applicationA);
    const client = required(
      (await createOAuthClient(api, scope.applicationA)).client,
      'public OAuth client',
    );
    const response = await request.get(
      authorizeUrl(
        scope.applicationA,
        client.clientId,
        required(client.redirectUris[0], 'OAuth redirect URI'),
      ),
      { maxRedirects: 0 },
    );
    const [context] = await sql<{ clientId: string; resource: string }[]>`
      SELECT client_id AS "clientId", resource
      FROM iam.application_authorization_context
      WHERE application_id = ${scope.applicationA.rawId}::uuid
      ORDER BY created_at DESC
      LIMIT 1
    `;

    expect(response.status()).toBeLessThan(400);
    expect(context).toMatchObject({
      clientId: client.clientId,
      resource: scope.applicationA.resource,
    });
  });

  test('APP-RUN-007: confidential client secret created through GraphQL authenticates token exchange and old rotated secret fails', async ({
    api,
    request,
  }) => {
    await enablePasswordRealm(api, scope.applicationA);
    const initial = await createOAuthClient(api, scope.applicationA, {
      clientType: 'CONFIDENTIAL',
    });
    const client = required(initial.client, 'confidential client');
    const oldSecret = required(initial.clientSecret, 'initial secret');
    const before = await tokenExchange(request, scope.applicationA, client.clientId, oldSecret);
    const rotated = await mutateOAuthClient(
      api,
      'ApplicationOAuthClientSecretRotate',
      'applicationOAuthClientSecretRotate',
      scope.applicationA,
      client.clientId,
      1,
    );
    const newSecret = required(rotated.clientSecret, 'rotated secret');
    const [oldAfterRotation, newAfterRotation] = await Promise.all([
      tokenExchange(request, scope.applicationA, client.clientId, oldSecret),
      tokenExchange(request, scope.applicationA, client.clientId, newSecret),
    ]);

    expect((await before.json()).error).not.toBe('invalid_client');
    expect(await oldAfterRotation.json()).toMatchObject({ error: 'invalid_client' });
    expect((await newAfterRotation.json()).error).not.toBe('invalid_client');
  });

  test('APP-RUN-008: OAuth client disable through GraphQL blocks authorize, exchange, refresh, and introspection active state', async ({
    api,
    request,
  }) => {
    await enablePasswordRealm(api, scope.applicationA);
    const client = required(
      (await createOAuthClient(api, scope.applicationA)).client,
      'public client',
    );
    await mutateOAuthClient(
      api,
      'ApplicationOAuthClientEnabledSet',
      'applicationOAuthClientEnabledSet',
      scope.applicationA,
      client.clientId,
      1,
      { enabled: false },
    );
    const [authorize, exchange, refresh, introspection] = await Promise.all([
      request.get(
        authorizeUrl(
          scope.applicationA,
          client.clientId,
          required(client.redirectUris[0], 'OAuth redirect URI'),
        ),
        {
          maxRedirects: 0,
        },
      ),
      request.post(runtimeUrl(scope.applicationA, '/oauth2/token'), {
        form: {
          grant_type: 'authorization_code',
          code: `disabled-${crypto.randomUUID()}`,
          code_verifier: 'v'.repeat(64),
          client_id: client.clientId,
          redirect_uri: required(client.redirectUris[0], 'OAuth redirect URI'),
          resource: scope.applicationA.resource,
        },
      }),
      request.post(runtimeUrl(scope.applicationA, '/oauth2/token'), {
        form: {
          grant_type: 'refresh_token',
          refresh_token: `disabled-${crypto.randomUUID()}`,
          client_id: client.clientId,
          resource: scope.applicationA.resource,
        },
      }),
      request.post(runtimeUrl(scope.applicationA, '/oauth2/introspect'), {
        form: { token: `disabled-${crypto.randomUUID()}`, client_id: client.clientId },
      }),
    ]);

    expect(authorize.status()).toBeGreaterThanOrEqual(400);
    expect(exchange.status()).toBeGreaterThanOrEqual(400);
    expect(refresh.status()).toBeGreaterThanOrEqual(400);
    expect(await introspection.json()).toMatchObject({ active: false });
  });

  test('APP-RUN-009: provider enable through GraphQL exposes only exact allowed social routes for the target application', async ({
    api,
    request,
  }) => {
    await enablePasswordRealm(api, scope.applicationA);
    await enablePasswordRealm(api, scope.applicationB);
    await configureProvider(api, scope.applicationA, 'GOOGLE');
    await updateProvider(api, scope.applicationA, 'GOOGLE', { enabled: true });
    const [target, foreign, unknownCallback] = await Promise.all([
      request.post(runtimeUrl(scope.applicationA, '/sign-in/social'), {
        headers: JSON_HEADERS,
        data: { provider: 'google', callbackURL: runtimeUrl(scope.applicationA, '/login') },
        maxRedirects: 0,
      }),
      request.post(runtimeUrl(scope.applicationB, '/sign-in/social'), {
        headers: JSON_HEADERS,
        data: { provider: 'google', callbackURL: runtimeUrl(scope.applicationB, '/login') },
        maxRedirects: 0,
      }),
      request.get(runtimeUrl(scope.applicationA, '/callback/github'), { maxRedirects: 0 }),
    ]);

    expect(target.status()).toBeLessThan(400);
    expect(foreign.status()).toBe(404);
    expect(unknownCallback.status()).toBe(404);
  });

  test('APP-RUN-010: provider disable through GraphQL removes social routes and preserves password routes when configured', async ({
    api,
    request,
  }) => {
    await enablePasswordRealm(api, scope.applicationA);
    await configureProvider(api, scope.applicationA, 'GOOGLE');
    await updateProvider(api, scope.applicationA, 'GOOGLE', { enabled: true });
    await updateProvider(api, scope.applicationA, 'GOOGLE', { enabled: false });
    const [social, password] = await Promise.all([
      request.post(runtimeUrl(scope.applicationA, '/sign-in/social'), {
        headers: JSON_HEADERS,
        data: { provider: 'google', callbackURL: runtimeUrl(scope.applicationA, '/login') },
      }),
      request.post(runtimeUrl(scope.applicationA, '/sign-in/email'), {
        headers: JSON_HEADERS,
        data: { email: 'missing@playwright.dev', password: 'invalid-password' },
      }),
    ]);

    expect(social.status()).toBe(404);
    expect(password.status()).toBe(401);
  });

  test('APP-RUN-011: user block through GraphQL makes public signin, refresh, and introspection inactive', async ({
    api,
    request,
  }) => {
    await updateAuth(api, scope.applicationA, {
      registrationMode: 'OPEN',
      emailVerificationRequired: false,
      trustedOrigins: [IAM_BASE_URL],
    });
    await updateAuthMethod(api, scope.applicationA, 'password', ['SIGN_IN', 'SIGN_UP']);
    await setRealmEnabled(api, scope.applicationA, true);
    const email = `runtime-block-${crypto.randomUUID()}@playwright.dev`;
    const password = 'Runtime-block-password-123!';
    const signup = await request.post(runtimeUrl(scope.applicationA, '/sign-up/email'), {
      headers: JSON_HEADERS,
      data: { name: 'Runtime Block User', email, password },
    });
    expect(signup.ok(), await signup.text()).toBe(true);
    const [user] = await sql<{ id: string }[]>`
      SELECT id
      FROM iam.application_user
      WHERE application_id = ${scope.applicationA.rawId}::uuid
        AND email = ${email}
    `;
    const { data } = await api.admin.mutation('application-admin-api/ApplicationUserBlock', {
      variables: {
        input: {
          organizationId: scope.organizationId,
          applicationId: scope.applicationA.id,
          userId: composeGlobalId('ApplicationUser', required(user, 'created user').id),
        },
      },
    });
    const createdUser = required(user, 'created user');
    const signin = await request.post(runtimeUrl(scope.applicationA, '/sign-in/email'), {
      headers: JSON_HEADERS,
      data: { email, password },
    });
    const introspection = await request.post(runtimeUrl(scope.applicationA, '/oauth2/introspect'), {
      form: { token: `blocked-${crypto.randomUUID()}` },
    });
    const [sessions] = await sql<{ count: number }[]>`
      SELECT count(*)::int AS count
      FROM iam.application_session
      WHERE application_id = ${scope.applicationA.rawId}::uuid
        AND user_id = ${createdUser.id}
    `;

    expect(data.applicationMutation.applicationUserBlock.userErrors).toHaveLength(0);
    expect(signin.status()).toBe(401);
    expect(await introspection.json()).toMatchObject({ active: false });
    expect(sessions?.count).toBe(0);
  });

  test('APP-RUN-012: realm disable through GraphQL stops discovery, hosted UI, authorize, signin, reset, refresh, and validation', async ({
    api,
    request,
  }) => {
    await enablePasswordRealm(api, scope.applicationA);
    await setRealmEnabled(api, scope.applicationA, false);
    const paths = [
      '/.well-known/openid-configuration',
      '/login',
      '/oauth2/authorize',
      '/password/forgot',
      '/verify-email',
    ];
    for (const path of paths) {
      const response = await request.get(runtimeUrl(scope.applicationA, path), {
        maxRedirects: 0,
      });
      expect(response.status()).toBe(404);
    }
    for (const path of ['/sign-in/email', '/oauth2/token', '/oauth2/introspect']) {
      const response = await request.post(runtimeUrl(scope.applicationA, path), {
        headers: JSON_HEADERS,
        data: {},
      });
      expect(response.status()).toBe(404);
    }
  });

  test('APP-RUN-013: runtime cache refreshes after missed invalidation no later than the configured revision fallback interval', async ({
    api,
    request,
  }) => {
    await enablePasswordRealm(api, scope.applicationA);
    const probe = () =>
      request.post(runtimeUrl(scope.applicationA, '/sign-in/email'), {
        headers: JSON_HEADERS,
        data: { email: 'cache-probe@playwright.dev', password: 'invalid-password' },
      });
    expect((await probe()).status()).toBe(401);
    await sql`
      UPDATE iam.application_auth_configuration
      SET password_sign_in_enabled = false,
          revision = revision + 1,
          updated_at = now()
      WHERE application_id = ${scope.applicationA.rawId}::uuid
    `;

    await expect
      .poll(async () => (await probe()).status(), {
        timeout: 35_000,
        intervals: [1_000],
      })
      .toBe(404);
  });

  test('APP-RUN-014: traceability table maps every public runtime setup step to a supported GraphQL operation and fixture', () => {
    const traceability = [
      ['application', 'application-admin-api/ApplicationCreate'],
      ['authentication policy', 'application-admin-api/ApplicationAuthUpdate'],
      ['authentication method', 'application-admin-api/ApplicationAuthMethodUpdate'],
      ['realm lifecycle', 'application-admin-api/ApplicationAuthRealmEnabledSet'],
      ['provider credentials', 'application-admin-api/ApplicationAuthProviderConfigure'],
      ['provider state', 'application-admin-api/ApplicationAuthProviderUpdate'],
      ['OAuth client', 'application-admin-api/ApplicationOAuthClientCreate'],
      ['application users', 'application-admin-api/ApplicationUsers'],
    ] as const;

    for (const [step, operation] of traceability) {
      expect(step.length).toBeGreaterThan(0);
      expect(readQuery(operation)).toMatch(/(?:query|mutation)\s+[A-Za-z0-9_]+/u);
    }
    expect(new Set(traceability.map(([step]) => step)).size).toBe(traceability.length);
  });

  test('APP-RUN-015: GraphQL-prepared state produces the same expected behavior as trusted fixture-prepared state', async ({
    api,
    request,
  }) => {
    await enablePasswordRealm(api, scope.applicationA);
    await sql`
      UPDATE iam.application_auth_configuration
      SET realm_enabled = true,
          password_sign_in_enabled = true,
          email_verification_required = false,
          revision = revision + 1,
          updated_at = now()
      WHERE application_id = ${scope.applicationB.rawId}::uuid
    `;
    const [graphqlMetadata, fixtureMetadata, graphqlSignin, fixtureSignin] = await Promise.all([
      request.get(runtimeUrl(scope.applicationA, '/.well-known/openid-configuration')),
      request.get(runtimeUrl(scope.applicationB, '/.well-known/openid-configuration')),
      request.post(runtimeUrl(scope.applicationA, '/sign-in/email'), {
        headers: JSON_HEADERS,
        data: { email: 'missing@playwright.dev', password: 'invalid-password' },
      }),
      request.post(runtimeUrl(scope.applicationB, '/sign-in/email'), {
        headers: JSON_HEADERS,
        data: { email: 'missing@playwright.dev', password: 'invalid-password' },
      }),
    ]);
    const [graphqlBody, fixtureBody] = await Promise.all([
      graphqlMetadata.json(),
      fixtureMetadata.json(),
    ]);

    expect(graphqlMetadata.ok()).toBe(true);
    expect(fixtureMetadata.ok()).toBe(true);
    expect(graphqlSignin.status()).toBe(401);
    expect(fixtureSignin.status()).toBe(401);
    expect(Object.keys(graphqlBody).sort()).toEqual(Object.keys(fixtureBody).sort());
    expect(graphqlBody.issuer).toContain(scope.applicationA.rawId);
    expect(fixtureBody.issuer).toContain(scope.applicationB.rawId);
  });
});

async function enablePasswordRealm(api: Api, application: ApplicationRef): Promise<void> {
  await updateAuth(api, application, {
    emailVerificationRequired: false,
    trustedOrigins: [IAM_BASE_URL],
  });
  await updateAuthMethod(api, application, 'password', ['SIGN_IN']);
  const enabled = await setRealmEnabled(api, application, true);
  expect(enabled.userErrors).toHaveLength(0);
}

async function configureDelivery(
  api: Api,
  application: ApplicationRef,
  prefix: string,
): Promise<void> {
  const payload = await updateAuth(api, application, {
    emailDelivery: {
      transportProfile: `${prefix}-transport`,
      senderIdentity: `${prefix}@example.test`,
      emailVerificationTemplateId: `${prefix}-verify`,
      passwordResetTemplateId: `${prefix}-reset`,
      emailOtpSignInTemplateId: `${prefix}-otp`,
    },
  });
  expect(payload.userErrors).toHaveLength(0);
}

function runtimeUrl(application: ApplicationRef, path: string): string {
  return `${IAM_BASE_URL}/auth/applications/${application.rawId}${path}`;
}

function authorizeUrl(application: ApplicationRef, clientId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'openid profile email offline_access',
    state: crypto.randomUUID(),
    nonce: crypto.randomUUID(),
    code_challenge: 'A'.repeat(43),
    code_challenge_method: 'S256',
    resource: application.resource,
  });
  return `${runtimeUrl(application, '/oauth2/authorize')}?${params}`;
}

function tokenExchange(
  request: APIRequestContext,
  application: ApplicationRef,
  clientId: string,
  clientSecret: string,
) {
  return request.post(runtimeUrl(application, '/oauth2/token'), {
    headers: {
      authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    form: {
      grant_type: 'authorization_code',
      code: `missing-${crypto.randomUUID()}`,
      code_verifier: 'v'.repeat(64),
      redirect_uri: `${IAM_BASE_URL}/e2e/oauth/callback/${application.rawId}`,
      resource: application.resource,
    },
  });
}
