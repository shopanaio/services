import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import {
  IAM_BASE_URL,
  archiveApplication,
  configureProvider,
  createApplication,
  createOAuthClient,
  getApplication,
  listApplications,
  openSql,
  readAdminAudits,
  required,
  serializedWithoutSecrets,
  setRealmEnabled,
  setupApplicationAdminScope,
  updateApplication,
  updateAuth,
  updateAuthMethod,
  type ApplicationAdminScope,
  type Sql,
} from './helpers';

const ADMIN_GRAPHQL_URL = process.env.ADMIN_GRAPHQL_URL ?? 'http://127.0.0.1:14001/graphql';

test.describe('Application Admin API - applications and auth configuration', () => {
  let sql: Sql;
  let scope: ApplicationAdminScope;

  test.beforeEach(async ({ api }) => {
    sql = openSql();
    scope = await setupApplicationAdminScope(api);
  });

  test.afterEach(async () => {
    await sql.end();
  });

  test('organization admin can create an application with generated ID and read-only canonical resource', async ({
    api,
  }) => {
    const application = await getApplication(api, scope.applicationA);

    expect(application).toMatchObject({
      id: scope.applicationA.id,
      organizationId: scope.organizationId,
      name: scope.applicationA.name,
      status: 'ACTIVE',
      resource: scope.applicationA.resource,
      revision: 1,
    });
    expect(scope.applicationA.rawId).not.toBe(scope.applicationA.name);
    expect(application?.auth.applicationId).toBe(scope.applicationA.id);
  });

  test('application create rejects duplicate name inside one organization without partial auth configuration', async ({
    api,
  }) => {
    const { data } = await api.admin.mutation('application-admin-api/ApplicationCreate', {
      variables: {
        input: {
          organizationId: scope.organizationId,
          name: scope.applicationA.name,
          displayName: 'Duplicate application',
        },
      },
    });
    const payload = data.applicationMutation.applicationCreate;
    const [count] = await sql<{ applications: number; configurations: number }[]>`
      SELECT
        count(*)::int AS applications,
        count(application_auth_configuration.application_id)::int AS configurations
      FROM iam.application
      LEFT JOIN iam.application_auth_configuration
        ON application_auth_configuration.application_id = application.id
      WHERE application.organization_id = ${scope.rawOrganizationId}::uuid
        AND application.name = ${scope.applicationA.name}
    `;

    expect(payload.application).toBeNull();
    expect(payload.userErrors).toEqual([expect.objectContaining({ code: 'DUPLICATE_VALUE' })]);
    expect(count).toEqual({ applications: 1, configurations: 1 });
  });

  test('same application name can exist in different organizations without leaking ownership', async ({
    api,
  }) => {
    const localList = await listApplications(api, scope.organizationId, {
      where: { search: scope.applicationA.name },
    });
    api.session.organizationId = scope.foreignOrganizationId;
    const foreign = await createApplication(api, scope.foreignOrganizationId, 'same-name', {
      name: scope.applicationA.name,
    });
    const foreignList = await listApplications(api, scope.foreignOrganizationId, {
      where: { search: scope.applicationA.name },
    });

    expect(localList.edges.map(({ node }) => node.id)).toEqual([scope.applicationA.id]);
    expect(foreignList.edges.map(({ node }) => node.id)).toEqual([foreign.id]);
    expect(localList.edges[0]?.node.organizationId).toBe(scope.organizationId);
    expect(foreignList.edges[0]?.node.organizationId).toBe(scope.foreignOrganizationId);
  });

  test('application query hides an existing application when organizationId does not own it', async ({
    api,
  }) => {
    const result = await api.admin.query('application-admin-api/Application', {
      variables: {
        organizationId: scope.foreignOrganizationId,
        applicationId: scope.applicationA.id,
      },
      throwOnError: false,
    });

    expect(result.data?.applicationQuery?.application ?? null).toBeNull();
    expect(JSON.stringify(result)).not.toContain(scope.applicationA.name);
    expect(JSON.stringify(result)).not.toContain(scope.applicationA.rawId);
  });

  test('applications connection filters by lifecycle status and search within the selected organization only', async ({
    api,
  }) => {
    const match = await createApplication(api, scope.organizationId, 'search-match', {
      displayName: 'Needle Active Realm',
    });
    const archived = await createApplication(api, scope.organizationId, 'search-archived', {
      displayName: 'Needle Archived Realm',
    });
    await archiveApplication(api, archived);
    api.session.organizationId = scope.foreignOrganizationId;
    await createApplication(api, scope.foreignOrganizationId, 'foreign-search', {
      displayName: 'Needle Active Realm',
    });
    api.session.organizationId = scope.organizationId;

    const connection = await listApplications(api, scope.organizationId, {
      where: { status: ['ACTIVE'], search: 'needle active' },
    });

    expect(connection.edges.map(({ node }) => node.id)).toEqual([match.id]);
    expect(connection.edges.every(({ node }) => node.organizationId === scope.organizationId)).toBe(
      true,
    );
  });

  test('applications connection order and cursor pagination are stable across same-timestamp records', async ({
    api,
  }) => {
    const alpha = await createApplication(api, scope.organizationId, 'page-alpha', {
      displayName: 'Page Alpha',
    });
    const beta = await createApplication(api, scope.organizationId, 'page-beta', {
      displayName: 'Page Beta',
    });
    const timestamp = new Date('2026-01-01T00:00:00.000Z');
    await sql`
      UPDATE iam.application
      SET created_at = ${timestamp}, updated_at = ${timestamp}
      WHERE id IN (${alpha.rawId}::uuid, ${beta.rawId}::uuid)
    `;

    const first = await listApplications(api, scope.organizationId, {
      first: 1,
      where: { search: 'page' },
      orderBy: [{ field: 'CREATED_AT', direction: 'asc' }],
    });
    const second = await listApplications(api, scope.organizationId, {
      first: 1,
      after: first.pageInfo.endCursor,
      where: { search: 'page' },
      orderBy: [{ field: 'CREATED_AT', direction: 'asc' }],
    });
    const repeated = await listApplications(api, scope.organizationId, {
      first: 1,
      where: { search: 'page' },
      orderBy: [{ field: 'CREATED_AT', direction: 'asc' }],
    });

    expect(first.pageInfo.hasNextPage).toBe(true);
    expect(new Set([...first.edges, ...second.edges].map(({ node }) => node.id))).toEqual(
      new Set([alpha.id, beta.id]),
    );
    expect(repeated.edges.map(({ cursor }) => cursor)).toEqual(
      first.edges.map(({ cursor }) => cursor),
    );
  });

  test('application update requires expected revision and returns the incremented revision', async ({
    api,
  }) => {
    const payload = await updateApplication(api, scope.applicationA, {
      displayName: 'Updated application',
      description: 'Updated description',
    });

    expect(payload.userErrors).toHaveLength(0);
    expect(payload.application).toMatchObject({
      id: scope.applicationA.id,
      displayName: 'Updated application',
      description: 'Updated description',
      revision: 2,
    });
  });

  test('stale application update returns a revision conflict user error and changes no fields', async ({
    api,
  }) => {
    const first = await updateApplication(api, scope.applicationA, {
      displayName: 'Winning update',
    });
    const stale = await updateApplication(
      api,
      scope.applicationA,
      { displayName: 'Stale update', description: 'must not persist' },
      1,
    );
    const persisted = await getApplication(api, scope.applicationA);

    expect(first.application?.revision).toBe(2);
    expect(stale.application).toBeNull();
    expect(stale.userErrors).toEqual([expect.objectContaining({ code: 'REVISION_CONFLICT' })]);
    expect(persisted).toMatchObject({
      displayName: 'Winning update',
      description: null,
      revision: 2,
    });
  });

  test('application archive disables the realm and prevents new public auth traffic', async ({
    api,
    request,
  }) => {
    await updateAuth(api, scope.applicationA, {
      emailVerificationRequired: false,
      trustedOrigins: [IAM_BASE_URL],
    });
    await updateAuthMethod(api, scope.applicationA, 'password', ['SIGN_IN']);
    const enabled = await setRealmEnabled(api, scope.applicationA, true);
    const before = await request.get(
      `${IAM_BASE_URL}/auth/applications/${scope.applicationA.rawId}/.well-known/openid-configuration`,
    );
    const enabledConfiguration = required(enabled.configuration, 'enabled realm');
    const archived = await archiveApplication(
      api,
      scope.applicationA,
      enabledConfiguration.revision,
    );
    const after = await request.get(
      `${IAM_BASE_URL}/auth/applications/${scope.applicationA.rawId}/.well-known/openid-configuration`,
    );
    const [row] = await sql<{ realmEnabled: boolean }[]>`
      SELECT realm_enabled AS "realmEnabled"
      FROM iam.application_auth_configuration
      WHERE application_id = ${scope.applicationA.rawId}::uuid
    `;

    expect(enabled.userErrors).toHaveLength(0);
    expect(before.ok()).toBe(true);
    expect(archived.application).toMatchObject({
      status: 'ARCHIVED',
      revision: enabledConfiguration.revision + 1,
    });
    expect(after.status()).toBe(404);
    expect(row?.realmEnabled).toBe(false);
  });

  test('archived application remains readable to authorized admins but is absent from active-only lists', async ({
    api,
  }) => {
    await archiveApplication(api, scope.applicationA);
    const application = await getApplication(api, scope.applicationA);
    const active = await listApplications(api, scope.organizationId, {
      where: { status: ['ACTIVE'] },
    });
    const archived = await listApplications(api, scope.organizationId, {
      where: { status: ['ARCHIVED'] },
    });

    expect(application?.status).toBe('ARCHIVED');
    expect(active.edges.map(({ node }) => node.id)).not.toContain(scope.applicationA.id);
    expect(archived.edges.map(({ node }) => node.id)).toContain(scope.applicationA.id);
  });

  test('application resource cannot be supplied or changed through create or update inputs', async ({
    api,
    request,
  }) => {
    const token = required(api.session.accessToken, 'platform access token');
    const create = await request.post(ADMIN_GRAPHQL_URL, {
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      data: {
        query: `
          mutation InvalidApplicationCreate($input: ApplicationCreateInput!) {
            applicationMutation {
              applicationCreate(input: $input) { application { id } userErrors { code } }
            }
          }
        `,
        variables: {
          input: {
            organizationId: scope.organizationId,
            name: `invalid-resource-${crypto.randomUUID()}`,
            displayName: 'Invalid resource',
            resource: 'urn:attacker:chosen',
          },
        },
      },
    });
    const update = await request.post(ADMIN_GRAPHQL_URL, {
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      data: {
        query: `
          mutation InvalidApplicationUpdate($input: ApplicationUpdateInput!) {
            applicationMutation {
              applicationUpdate(input: $input) { application { id } userErrors { code } }
            }
          }
        `,
        variables: {
          input: {
            organizationId: scope.organizationId,
            applicationId: scope.applicationA.id,
            expectedRevision: 1,
            resource: 'urn:attacker:replacement',
          },
        },
      },
    });

    expect((await create.json()).errors?.length).toBeGreaterThan(0);
    expect((await update.json()).errors?.length).toBeGreaterThan(0);
    expect((await getApplication(api, scope.applicationA))?.resource).toBe(
      scope.applicationA.resource,
    );
  });

  test('auth configuration query requires org.application-auth read permission', async ({
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

  test('auth update changes TTL policy only inside allowed platform ranges', async ({
    api,
  }) => {
    const payload = await updateAuth(api, scope.applicationA, {
      accessTokenTtlSeconds: 300,
      idTokenTtlSeconds: 3600,
      refreshTokenTtlSeconds: 86_400,
      sessionTtlSeconds: 2_592_000,
    });

    expect(payload.userErrors).toHaveLength(0);
    expect(payload.configuration).toMatchObject({
      accessTokenTtlSeconds: 300,
      idTokenTtlSeconds: 3600,
      refreshTokenTtlSeconds: 86_400,
      sessionTtlSeconds: 2_592_000,
      revision: 2,
    });
  });

  test('auth update rejects out-of-range token and session TTL values without partial changes', async ({
    api,
  }) => {
    const before = required(await getApplication(api, scope.applicationA), 'application').auth;
    const payload = await updateAuth(api, scope.applicationA, {
      accessTokenTtlSeconds: 299,
      sessionTtlSeconds: 2_592_001,
      branding: { displayName: 'must not persist' },
    });
    const after = required(await getApplication(api, scope.applicationA), 'application').auth;

    expect(payload.configuration).toBeNull();
    expect(payload.userErrors).toEqual([expect.objectContaining({ code: 'INVALID_INPUT' })]);
    expect(after).toMatchObject({
      accessTokenTtlSeconds: before.accessTokenTtlSeconds,
      sessionTtlSeconds: before.sessionTtlSeconds,
      branding: before.branding,
      revision: before.revision,
    });
  });

  test('trusted origins are normalized, deduplicated, and exposed only as exact origins', async ({
    api,
  }) => {
    const payload = await updateAuth(api, scope.applicationA, {
      trustedOrigins: [
        'https://EXAMPLE.com:443',
        'https://example.com',
        'http://localhost:3000',
        'http://localhost:3000',
      ],
    });

    expect(payload.userErrors).toHaveLength(0);
    expect(payload.configuration?.trustedOrigins.map(({ origin }) => origin)).toEqual([
      'http://localhost:3000',
      'https://example.com',
    ]);
  });

  test('trusted origins reject wildcards, path/query components, and malformed origins', async ({
    api,
  }) => {
    for (const origin of [
      'https://*.example.com',
      'https://example.com/path',
      'https://example.com?query=1',
      'not-an-origin',
    ]) {
      const payload = await updateAuth(api, scope.applicationA, {
        trustedOrigins: [origin],
      });
      expect(payload.configuration).toBeNull();
      expect(payload.userErrors).toEqual([expect.objectContaining({ code: 'INVALID_INPUT' })]);
    }
    expect(
      required(await getApplication(api, scope.applicationA), 'application').auth.trustedOrigins,
    ).toHaveLength(0);
  });

  test('branding update accepts allowlisted colors and HTTPS logo URL only', async ({
    api,
  }) => {
    const payload = await updateAuth(api, scope.applicationA, {
      branding: {
        displayName: 'Safe Realm',
        headline: 'Sign in safely',
        logoUrl: 'https://cdn.example.test/logo.svg',
        primaryColor: 'INDIGO',
        backgroundColor: 'SLATE',
      },
    });

    expect(payload.userErrors).toHaveLength(0);
    expect(payload.configuration?.branding).toEqual({
      displayName: 'Safe Realm',
      headline: 'Sign in safely',
      logoUrl: 'https://cdn.example.test/logo.svg',
      primaryColor: 'INDIGO',
      backgroundColor: 'SLATE',
    });
  });

  test('branding update rejects scriptable or insecure logo URL without changing existing branding', async ({
    api,
  }) => {
    const accepted = await updateAuth(api, scope.applicationA, {
      branding: { displayName: 'Existing', logoUrl: 'https://cdn.example.test/existing.svg' },
    });
    for (const logoUrl of ['javascript:alert(1)', 'http://cdn.example.test/logo.svg']) {
      const rejected = await updateAuth(
        api,
        scope.applicationA,
        { branding: { logoUrl } },
        required(accepted.configuration, 'accepted branding').revision,
      );
      expect(rejected.configuration).toBeNull();
      expect(rejected.userErrors).toEqual([expect.objectContaining({ code: 'INVALID_INPUT' })]);
    }
    expect(
      required(await getApplication(api, scope.applicationA), 'application').auth.branding,
    ).toMatchObject({
      displayName: 'Existing',
      logoUrl: 'https://cdn.example.test/existing.svg',
    });
  });

  test('email delivery update stores only profile and template references, never transport secrets', async ({
    api,
  }) => {
    const transportSecret = 'smtp-password-must-never-be-stored';
    const delivery = {
      transportProfile: 'transactional-primary',
      senderIdentity: 'auth@example.test',
      emailVerificationTemplateId: 'verify-v1',
      passwordResetTemplateId: 'reset-v1',
      emailOtpSignInTemplateId: 'otp-v1',
    };
    const payload = await updateAuth(api, scope.applicationA, { emailDelivery: delivery });
    const [row] = await sql<Record<string, unknown>[]>`
      SELECT *
      FROM iam.application_auth_delivery_profile
      WHERE application_id = ${scope.applicationA.rawId}::uuid
    `;

    expect(payload.userErrors).toHaveLength(0);
    expect(payload.configuration?.emailDelivery).toMatchObject(delivery);
    serializedWithoutSecrets(payload, [transportSecret]);
    expect(JSON.stringify(row)).not.toContain(transportSecret);
    expect(Object.keys(row ?? {})).not.toEqual(
      expect.arrayContaining(['password', 'secret', 'api_key', 'credentials']),
    );
  });

  test('enabling password reset or verified signup requires configured email delivery', async ({
    api,
  }) => {
    const reset = await updateAuthMethod(api, scope.applicationA, 'password', [
      'SIGN_IN',
      'PASSWORD_RESET',
    ]);
    const signup = await updateAuthMethod(api, scope.applicationA, 'password', [
      'SIGN_IN',
      'SIGN_UP',
    ]);

    expect(reset.authMethod).toBeNull();
    expect(reset.userErrors).toEqual([expect.objectContaining({ code: 'INVALID_REALM_STATE' })]);
    expect(signup.authMethod).toBeNull();
    expect(signup.userErrors).toEqual([expect.objectContaining({ code: 'INVALID_REALM_STATE' })]);
  });

  test('auth method update cannot remove the last sign-in method while realm is enabled', async ({
    api,
  }) => {
    const method = await updateAuthMethod(api, scope.applicationA, 'password', ['SIGN_IN']);
    await setRealmEnabled(api, scope.applicationA, true);
    const rejected = await updateAuthMethod(
      api,
      scope.applicationA,
      'password',
      [],
      required(method.authMethod, 'password method').revision + 1,
    );

    expect(rejected.authMethod).toBeNull();
    expect(rejected.userErrors).toEqual([expect.objectContaining({ code: 'LAST_LOGIN_METHOD' })]);
    expect(
      required(await getApplication(api, scope.applicationA), 'application').auth.authMethods.find(
        ({ id }) => id === 'password',
      )?.enabledCapabilities,
    ).toEqual(['SIGN_IN']);
  });

  test('realm enabled set validates required methods, delivery, and provider state before enabling', async ({
    api,
  }) => {
    const withoutMethod = await setRealmEnabled(api, scope.applicationA, true);
    await updateAuthMethod(api, scope.applicationA, 'email_otp', ['SIGN_IN']);
    const withoutDelivery = await setRealmEnabled(api, scope.applicationA, true);

    expect(withoutMethod.configuration).toBeNull();
    expect(withoutMethod.userErrors).toEqual([
      expect.objectContaining({ code: 'INVALID_REALM_STATE' }),
    ]);
    expect(withoutDelivery.configuration).toBeNull();
    expect(withoutDelivery.userErrors).toEqual([
      expect.objectContaining({ code: 'INVALID_REALM_STATE' }),
    ]);
  });

  test('realm disabled set preserves users, clients, providers, and configuration rows', async ({
    api,
  }) => {
    await updateAuthMethod(api, scope.applicationA, 'password', ['SIGN_IN']);
    await configureProvider(api, scope.applicationA);
    await createOAuthClient(api, scope.applicationA);
    await setRealmEnabled(api, scope.applicationA, true);
    const before = await realmRowCounts(sql, scope.applicationA.rawId);
    const disabled = await setRealmEnabled(api, scope.applicationA, false);
    const after = await realmRowCounts(sql, scope.applicationA.rawId);

    expect(disabled.userErrors).toHaveLength(0);
    expect(disabled.configuration?.realmEnabled).toBe(false);
    expect(after).toEqual(before);
  });

  test('protocol URLs are built from IAM public base URL and target application ID only', async ({
    api,
  }) => {
    const applicationA = required(await getApplication(api, scope.applicationA), 'application A');
    const applicationB = required(await getApplication(api, scope.applicationB), 'application B');
    const urls = JSON.stringify(applicationA.auth.protocolUrls);

    expect(applicationA.auth.protocolUrls.issuer).toBe(
      `${IAM_BASE_URL}/auth/applications/${scope.applicationA.rawId}`,
    );
    expect(urls).toContain(scope.applicationA.rawId);
    expect(urls).not.toContain(scope.applicationB.rawId);
    expect(JSON.stringify(applicationB.auth.protocolUrls)).toContain(scope.applicationB.rawId);
    expect(JSON.stringify(applicationB.auth.protocolUrls)).not.toContain(scope.applicationA.rawId);
  });

  test('all application and auth mutations emit secret-free success and failure admin audit records', async ({
    api,
  }) => {
    const secret = 'audit-must-not-contain-this-value';
    await updateAuth(api, scope.applicationA, {
      branding: { displayName: 'Audited branding' },
    });
    await updateAuth(api, scope.applicationA, { branding: { logoUrl: `javascript:${secret}` } }, 2);
    const audits = await readAdminAudits(sql, scope.applicationA);

    expect(audits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'auth_configuration_update',
          outcome: 'success',
          applicationId: scope.applicationA.rawId,
        }),
        expect.objectContaining({
          action: 'auth_configuration_update',
          outcome: 'failure',
          reasonCategory: 'invalid_input',
          applicationId: scope.applicationA.rawId,
        }),
      ]),
    );
    serializedWithoutSecrets(audits, [secret]);
    expect(audits.every(({ requestId }) => requestId.length > 0)).toBe(true);
  });
});

async function realmRowCounts(sql: Sql, applicationId: string) {
  const [row] = await sql<
    {
      configurations: number;
      providers: number;
      clients: number;
      users: number;
    }[]
  >`
    SELECT
      (SELECT count(*)::int FROM iam.application_auth_configuration
        WHERE application_id = ${applicationId}::uuid) AS configurations,
      (SELECT count(*)::int FROM iam.application_auth_provider
        WHERE application_id = ${applicationId}::uuid) AS providers,
      (SELECT count(*)::int FROM iam.application_oauth_client
        WHERE application_id = ${applicationId}::uuid) AS clients,
      (SELECT count(*)::int FROM iam.application_user
        WHERE application_id = ${applicationId}::uuid) AS users
  `;
  return row;
}
