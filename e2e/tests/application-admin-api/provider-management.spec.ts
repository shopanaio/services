import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import {
  IAM_BASE_URL,
  configureProvider,
  createOAuthClient,
  createOrganizationMember,
  deleteProviderCredentials,
  getApplication,
  openSql,
  readAdminAudits,
  readProviderRow,
  required,
  rotateProviderCredentials,
  serializedWithoutSecrets,
  setRealmEnabled,
  setupApplicationAdminScope,
  updateAuth,
  updateAuthMethod,
  updateProvider,
  validateProvider,
  type ApplicationAdminScope,
  type Sql,
} from './helpers';

const ADMIN_GRAPHQL_URL = process.env.ADMIN_GRAPHQL_URL ?? 'http://127.0.0.1:14001/graphql';

test.describe('Application Admin API - social provider management', () => {
  let sql: Sql;
  let scope: ApplicationAdminScope;

  test.beforeEach(async ({ api }) => {
    sql = openSql();
    scope = await setupApplicationAdminScope(api);
  });

  test.afterEach(async () => {
    await sql.end();
  });

  test('APP-PROV-001: provider catalog exposes only supported closed enum values', async ({
    api,
  }) => {
    const application = required(await getApplication(api, scope.applicationA), 'application');

    expect(application.auth.providers.map(({ provider }) => provider)).toEqual([
      'GOOGLE',
      'FACEBOOK',
    ]);
    expect(application.auth.providers.every(({ supported }) => supported)).toBe(true);
  });

  test('APP-PROV-002: unconfigured provider status is readable without secret fields', async ({
    api,
  }) => {
    const provider = required(
      required(await getApplication(api, scope.applicationA), 'application').auth.providers.find(
        ({ provider }) => provider === 'GOOGLE',
      ),
      'Google provider',
    );

    expect(provider).toMatchObject({
      applicationId: scope.applicationA.id,
      provider: 'GOOGLE',
      supported: true,
      configured: false,
      enabled: false,
      maskedClientId: null,
      scopes: [],
    });
    expect(Object.keys(provider)).not.toEqual(
      expect.arrayContaining(['clientId', 'clientSecret', 'encryptedClientId']),
    );
  });

  test('APP-PROV-003: provider configure stores encrypted credentials and returns only masked client ID', async ({
    api,
  }) => {
    const clientId = `google-client-${crypto.randomUUID()}`;
    const clientSecret = `google-secret-${crypto.randomUUID()}`;
    const payload = await configureProvider(api, scope.applicationA, 'GOOGLE', {
      clientId,
      clientSecret,
    });
    const persisted = await readProviderRow(sql, scope.applicationA, 'google');

    expect(payload.userErrors).toHaveLength(0);
    expect(payload.provider).toMatchObject({
      configured: true,
      enabled: false,
      scopes: ['openid', 'profile', 'email'],
    });
    expect(payload.provider?.maskedClientId).not.toBe(clientId);
    expect(payload.provider?.maskedClientId).toContain(clientId.slice(-4));
    expect(persisted?.encryptedClientId).toMatch(/^iam-auth-keyring\.v1\./u);
    expect(persisted?.encryptedClientSecret).toMatch(/^iam-auth-keyring\.v1\./u);
    serializedWithoutSecrets(payload, [clientId, clientSecret]);
  });

  test('APP-PROV-004: provider configure rejects unsupported scopes before storing credentials', async ({
    api,
  }) => {
    const secret = `unsupported-scope-secret-${crypto.randomUUID()}`;
    const payload = await configureProvider(api, scope.applicationA, 'GOOGLE', {
      clientSecret: secret,
      scopes: ['openid', 'admin.everything'],
    });

    expect(payload.provider).toBeNull();
    expect(payload.userErrors).toEqual([expect.objectContaining({ code: 'INVALID_INPUT' })]);
    expect(await readProviderRow(sql, scope.applicationA, 'google')).toBeNull();
    serializedWithoutSecrets(payload, [secret]);
  });

  test('APP-PROV-005: provider configure rejects unknown provider before repository mutation', async ({
    api,
    request,
  }) => {
    const token = required(api.session.accessToken, 'platform access token');
    const response = await request.post(ADMIN_GRAPHQL_URL, {
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      data: {
        query: `
          mutation UnknownProvider($input: ApplicationAuthProviderConfigureInput!) {
            applicationMutation {
              applicationAuthProviderConfigure(input: $input) {
                provider { provider }
                userErrors { code message }
              }
            }
          }
        `,
        variables: {
          input: {
            organizationId: scope.organizationId,
            applicationId: scope.applicationA.id,
            provider: 'UNKNOWN',
            clientId: 'unknown-client',
            clientSecret: 'unknown-secret',
            scopes: ['openid'],
            expectedRevision: 1,
          },
        },
      },
    });
    const body = await response.json();

    expect(body.errors?.length).toBeGreaterThan(0);
    expect(await readProviderRow(sql, scope.applicationA, 'google')).toBeNull();
    expect(await readProviderRow(sql, scope.applicationA, 'facebook')).toBeNull();
  });

  test('APP-PROV-006: provider cannot be configured twice without explicit credential rotation', async ({
    api,
  }) => {
    await configureProvider(api, scope.applicationA);
    const revision = required(await getApplication(api, scope.applicationA), 'application').auth
      .revision;
    const duplicateSecret = `duplicate-secret-${crypto.randomUUID()}`;
    const duplicate = await configureProvider(api, scope.applicationA, 'GOOGLE', {
      clientId: 'duplicate-client',
      clientSecret: duplicateSecret,
      expectedRevision: revision,
    });

    expect(duplicate.provider).toBeNull();
    expect(duplicate.userErrors).toEqual([
      expect.objectContaining({ code: 'PROVIDER_ALREADY_CONFIGURED' }),
    ]);
    serializedWithoutSecrets(duplicate, [duplicateSecret]);
  });

  test('APP-PROV-007: provider enable requires stored credentials and catalog-approved scopes', async ({
    api,
  }) => {
    const missing = await updateProvider(api, scope.applicationA, 'GOOGLE', { enabled: true });
    await configureProvider(api, scope.applicationA);
    const enabled = await updateProvider(api, scope.applicationA, 'GOOGLE', {
      enabled: true,
      scopes: ['openid', 'email'],
    });

    expect(missing.provider).toBeNull();
    expect(missing.userErrors).toEqual([
      expect.objectContaining({ code: 'PROVIDER_NOT_CONFIGURED' }),
    ]);
    expect(enabled.userErrors).toHaveLength(0);
    expect(enabled.provider).toMatchObject({
      configured: true,
      enabled: true,
      scopes: ['openid', 'email'],
    });
  });

  test('APP-PROV-008: provider disable cannot remove the last sign-in method while realm is enabled', async ({
    api,
  }) => {
    await configureProvider(api, scope.applicationA);
    await updateProvider(api, scope.applicationA, 'GOOGLE', { enabled: true });
    await setRealmEnabled(api, scope.applicationA, true);
    const rejected = await updateProvider(api, scope.applicationA, 'GOOGLE', {
      enabled: false,
    });

    expect(rejected.provider).toBeNull();
    expect(rejected.userErrors).toEqual([expect.objectContaining({ code: 'LAST_LOGIN_METHOD' })]);
    expect((await readProviderRow(sql, scope.applicationA, 'google'))?.enabled).toBe(true);
  });

  test('APP-PROV-009: provider credentials rotate updates encrypted credentials without exposing secret values', async ({
    api,
  }) => {
    await configureProvider(api, scope.applicationA);
    const before = required(
      await readProviderRow(sql, scope.applicationA, 'google'),
      'configured Google provider',
    );
    const clientId = `rotated-client-${crypto.randomUUID()}`;
    const clientSecret = `rotated-secret-${crypto.randomUUID()}`;
    const payload = await rotateProviderCredentials(
      api,
      scope.applicationA,
      'GOOGLE',
      clientId,
      clientSecret,
    );
    const after = required(
      await readProviderRow(sql, scope.applicationA, 'google'),
      'rotated Google provider',
    );

    expect(payload.userErrors).toHaveLength(0);
    expect(after.encryptedClientId).not.toBe(before.encryptedClientId);
    expect(after.encryptedClientSecret).not.toBe(before.encryptedClientSecret);
    serializedWithoutSecrets(payload, [clientId, clientSecret]);
  });

  test('APP-PROV-010: provider credentials delete is allowed only after provider is disabled', async ({
    api,
  }) => {
    await configureProvider(api, scope.applicationA);
    await updateProvider(api, scope.applicationA, 'GOOGLE', { enabled: true });
    const whileEnabled = await deleteProviderCredentials(api, scope.applicationA, 'GOOGLE');
    await updateProvider(api, scope.applicationA, 'GOOGLE', { enabled: false });
    const deleted = await deleteProviderCredentials(api, scope.applicationA, 'GOOGLE');

    expect(whileEnabled.provider).toBeNull();
    expect(whileEnabled.userErrors).toEqual([
      expect.objectContaining({ code: 'PROVIDER_MUST_BE_DISABLED' }),
    ]);
    expect(deleted.userErrors).toHaveLength(0);
    expect(deleted.provider).toMatchObject({ configured: false, enabled: false });
    expect(await readProviderRow(sql, scope.applicationA, 'google')).toBeNull();
  });

  test('APP-PROV-011: provider credentials delete removes runtime availability without deleting unrelated provider audit history', async ({
    api,
  }) => {
    await configureProvider(api, scope.applicationA);
    await rotateProviderCredentials(
      api,
      scope.applicationA,
      'GOOGLE',
      'history-client',
      'history-secret',
    );
    await deleteProviderCredentials(api, scope.applicationA, 'GOOGLE');
    const audits = await readAdminAudits(sql, scope.applicationA);

    expect(await readProviderRow(sql, scope.applicationA, 'google')).toBeNull();
    expect(audits.map(({ action }) => action)).toEqual(
      expect.arrayContaining([
        'provider_configure',
        'provider_credentials_rotate',
        'provider_credentials_delete',
      ]),
    );
  });

  test('APP-PROV-012: provider validation returns VALID with safe metadata for a valid external configuration', async ({
    api,
  }) => {
    const secret = 'e2e-provider-valid-secret';
    await configureProvider(api, scope.applicationA, 'GOOGLE', {
      clientId: 'e2e-provider-valid',
      clientSecret: secret,
    });
    const payload = await validateProvider(api, scope.applicationA, 'GOOGLE');

    expect(payload.userErrors).toHaveLength(0);
    expect(payload.validation).toMatchObject({
      provider: 'GOOGLE',
      status: 'VALID',
      reasonCode: null,
    });
    serializedWithoutSecrets(payload, [secret]);
  });

  test('APP-PROV-013: provider validation returns INVALID reason code without exposing upstream response or secret', async ({
    api,
  }) => {
    const secret = 'e2e-provider-invalid-secret';
    await configureProvider(api, scope.applicationA, 'GOOGLE', {
      clientId: 'e2e-provider-invalid',
      clientSecret: secret,
    });
    const payload = await validateProvider(api, scope.applicationA, 'GOOGLE');

    expect(payload.userErrors).toHaveLength(0);
    expect(payload.validation).toMatchObject({
      provider: 'GOOGLE',
      status: 'INVALID',
      reasonCode: expect.any(String),
    });
    serializedWithoutSecrets(payload, [secret, 'upstream response']);
  });

  test('APP-PROV-014: provider validation returns UNAVAILABLE without changing stored provider state', async ({
    api,
  }) => {
    await configureProvider(api, scope.applicationA, 'GOOGLE', {
      clientId: 'e2e-provider-unavailable',
      clientSecret: 'e2e-provider-unavailable-secret',
    });
    const before = await readProviderRow(sql, scope.applicationA, 'google');
    const payload = await validateProvider(api, scope.applicationA, 'GOOGLE');
    const after = await readProviderRow(sql, scope.applicationA, 'google');

    expect(payload.userErrors).toHaveLength(0);
    expect(payload.validation).toMatchObject({
      provider: 'GOOGLE',
      status: 'UNAVAILABLE',
      reasonCode: expect.any(String),
    });
    expect(after).toEqual(before);
  });

  test('APP-PROV-015: provider callback URL is exact, application-scoped, and uses IAM public base URL', async ({
    api,
  }) => {
    const application = required(await getApplication(api, scope.applicationA), 'application');
    const google = required(
      application.auth.providers.find(({ provider }) => provider === 'GOOGLE'),
      'Google provider',
    );

    expect(google.callbackUrl).toBe(
      `${IAM_BASE_URL}/auth/applications/${scope.applicationA.rawId}/callback/google`,
    );
    expect(google.callbackUrl).not.toContain(scope.applicationB.rawId);
    expect(application.auth.protocolUrls.providerCallbackUrls).toContainEqual({
      provider: 'GOOGLE',
      url: google.callbackUrl,
    });
  });

  test('APP-PROV-016: provider query requires org.application-auth-providers read permission', async ({
    api,
  }) => {
    const ownerToken = api.session.tenant.accessToken;
    const outsider = await api.admin.user.create();
    api.session.tenant.accessToken = outsider.accessToken;
    try {
      const result = await api.admin.query('application-admin-api/Application', {
        variables: {
          organizationId: scope.organizationId,
          applicationId: scope.applicationA.id,
        },
        throwOnError: false,
      });
      expect(result.data?.applicationQuery?.application ?? null).toBeNull();
      expect(result.errors?.length ?? 0).toBeGreaterThan(0);
    } finally {
      api.session.tenant.accessToken = ownerToken;
    }
  });

  test('APP-PROV-017: provider write and credential mutations enforce write versus admin permission split', async ({
    api,
  }) => {
    await configureProvider(api, scope.applicationA);
    const configuredRevision = required(
      await getApplication(api, scope.applicationA),
      'configured application',
    ).auth.revision;
    const owner = {
      token: api.session.tenant.accessToken,
      userId: api.session.tenant.userId,
    };
    const writer = await createOrganizationMember(api, scope.organizationId, {
      permissions: [
        {
          resource: 'org.application-auth-providers',
          action: 'write',
        },
      ],
    });
    api.session.tenant.accessToken = writer.accessToken;
    api.session.tenant.userId = writer.userId;
    try {
      const write = await updateProvider(
        api,
        scope.applicationA,
        'GOOGLE',
        {
          scopes: ['openid', 'email'],
        },
        configuredRevision,
      );
      const rotate = await rotateProviderCredentials(
        api,
        scope.applicationA,
        'GOOGLE',
        'forbidden-client',
        'forbidden-secret',
        configuredRevision + 1,
      );
      expect(write.userErrors).toHaveLength(0);
      expect(write.provider).toMatchObject({ scopes: ['openid', 'email'] });
      expect(rotate.provider).toBeNull();
      expect(rotate.userErrors).toEqual([expect.objectContaining({ code: 'FORBIDDEN' })]);
    } finally {
      api.session.tenant.accessToken = owner.token;
      api.session.tenant.userId = owner.userId;
    }
  });

  test('APP-PROV-018: provider mutation with organizationId of another owner returns safe not-found or forbidden behavior', async ({
    api,
  }) => {
    const { data } = await api.admin.mutation(
      'application-admin-api/ApplicationAuthProviderConfigure',
      {
        variables: {
          input: {
            organizationId: scope.foreignOrganizationId,
            applicationId: scope.applicationA.id,
            provider: 'GOOGLE',
            clientId: 'cross-owner-client',
            clientSecret: 'cross-owner-secret',
            scopes: ['openid'],
            expectedRevision: 1,
          },
        },
      },
    );
    const payload = data.applicationMutation.applicationAuthProviderConfigure;

    expect(payload.provider).toBeNull();
    expect(payload.userErrors).toEqual([
      expect.objectContaining({ code: expect.stringMatching(/NOT_FOUND|FORBIDDEN/u) }),
    ]);
    expect(await readProviderRow(sql, scope.applicationA, 'google')).toBeNull();
  });

  test('APP-PROV-019: provider state change invalidates the target application runtime and not another application', async ({
    api,
    request,
  }) => {
    await updateAuth(api, scope.applicationA, {
      emailVerificationRequired: false,
      trustedOrigins: [IAM_BASE_URL],
    });
    await updateAuth(api, scope.applicationB, {
      emailVerificationRequired: false,
      trustedOrigins: [IAM_BASE_URL],
    });
    await updateAuthMethod(api, scope.applicationA, 'password', ['SIGN_IN']);
    await updateAuthMethod(api, scope.applicationB, 'password', ['SIGN_IN']);
    await configureProvider(api, scope.applicationA);
    await updateProvider(api, scope.applicationA, 'GOOGLE', { enabled: true });
    await setRealmEnabled(api, scope.applicationA, true);
    await setRealmEnabled(api, scope.applicationB, true);
    const clientA = required(
      (await createOAuthClient(api, scope.applicationA)).client,
      'application A OAuth client',
    );
    const clientB = required(
      (await createOAuthClient(api, scope.applicationB)).client,
      'application B OAuth client',
    );

    const [enabledA, beforeB] = await Promise.all([
      openProviderLogin(request, scope.applicationA, clientA),
      openProviderLogin(request, scope.applicationB, clientB),
    ]);
    await updateProvider(api, scope.applicationA, 'GOOGLE', { enabled: false });
    const [disabledA, afterB] = await Promise.all([
      openProviderLogin(request, scope.applicationA, clientA),
      openProviderLogin(request, scope.applicationB, clientB),
    ]);

    expect(enabledA.ok()).toBe(true);
    expect(await enabledA.text()).toContain('/login/social');
    expect(disabledA.ok()).toBe(true);
    expect(await disabledA.text()).not.toContain('/login/social');
    expect(beforeB.ok()).toBe(true);
    expect(await beforeB.text()).not.toContain('/login/social');
    expect(afterB.ok()).toBe(true);
    expect(await afterB.text()).not.toContain('/login/social');
  });

  test('APP-PROV-020: provider admin audit safeDiff never includes client secret, full client ID, tokens, or upstream payload', async ({
    api,
  }) => {
    const clientId = `audit-client-${crypto.randomUUID()}`;
    const clientSecret = `audit-secret-${crypto.randomUUID()}`;
    await configureProvider(api, scope.applicationA, 'GOOGLE', { clientId, clientSecret });
    const audits = await readAdminAudits(sql, scope.applicationA, 'provider_configure');

    expect(audits[0]).toMatchObject({
      action: 'provider_configure',
      outcome: 'success',
      targetType: 'provider',
      targetId: 'google',
      safeDiff: {
        provider: 'google',
        scopeCount: 3,
        enabled: false,
        changedFields: ['credentials', 'scopes'],
      },
    });
    serializedWithoutSecrets(audits, [
      clientId,
      clientSecret,
      'access_token',
      'refresh_token',
      'upstream',
    ]);
  });
});

async function openProviderLogin(
  request: APIRequestContext,
  application: ApplicationAdminScope['applicationA'],
  client: {
    clientId: string;
    redirectUris: readonly string[];
  },
): Promise<APIResponse> {
  const redirectUri = required(client.redirectUris[0], 'OAuth redirect URI');
  const params = new URLSearchParams({
    client_id: client.clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'openid',
    state: crypto.randomUUID(),
    nonce: crypto.randomUUID(),
    code_challenge: 'A'.repeat(43),
    code_challenge_method: 'S256',
    resource: application.resource,
  });
  const authorize = await request.get(
    `${IAM_BASE_URL}/auth/applications/${application.rawId}/oauth2/authorize?${params}`,
    {
      headers: { accept: 'text/html' },
      maxRedirects: 0,
    },
  );
  expect(authorize.status()).toBe(302);
  const loginLocation = required(authorize.headers().location, 'hosted UI login redirect');
  return request.get(new URL(loginLocation, IAM_BASE_URL).toString());
}
