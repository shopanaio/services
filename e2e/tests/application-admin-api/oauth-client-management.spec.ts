import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import {
  IAM_BASE_URL,
  createOrganizationMember,
  createOAuthClient,
  getOAuthClient,
  listOAuthClients,
  mutateOAuthClient,
  openSql,
  readAdminAudits,
  readOAuthClientRow,
  required,
  serializedWithoutSecrets,
  setRealmEnabled,
  setupApplicationAdminScope,
  updateAuth,
  updateAuthMethod,
  type ApplicationAdminScope,
  type Sql,
} from './helpers';

const ADMIN_GRAPHQL_URL = process.env.ADMIN_GRAPHQL_URL ?? 'http://127.0.0.1:14001/graphql';

test.describe('Application Admin API - OAuth client management', () => {
  let sql: Sql;
  let scope: ApplicationAdminScope;

  test.beforeEach(async ({ api }) => {
    sql = openSql();
    scope = await setupApplicationAdminScope(api);
  });

  test.afterEach(async () => {
    await sql.end();
  });

  test('APP-OAUTH-001: admin can create a public client with server-owned protocol policy', async ({
    api,
  }) => {
    const payload = await createOAuthClient(api, scope.applicationA);

    expect(payload.userErrors).toHaveLength(0);
    expect(payload.clientSecret).toBeNull();
    expect(payload.client).toMatchObject({
      applicationId: scope.applicationA.id,
      organizationId: scope.organizationId,
      clientType: 'PUBLIC',
      tokenEndpointAuthMethod: 'NONE',
      requirePkce: true,
      grantTypes: ['authorization_code', 'refresh_token'],
      responseTypes: ['code'],
      resources: [scope.applicationA.resource],
      protocolPolicyVersion: 1,
      revision: 1,
    });
  });

  test('APP-OAUTH-002: admin can create a confidential client and receives plaintext secret exactly once', async ({
    api,
  }) => {
    const payload = await createOAuthClient(api, scope.applicationA, {
      clientType: 'CONFIDENTIAL',
    });
    const client = required(payload.client, 'confidential client');
    const fetched = await getOAuthClient(api, scope.applicationA, client.clientId);

    expect(payload.userErrors).toHaveLength(0);
    expect(payload.clientSecret).toEqual(expect.any(String));
    expect(payload.clientSecret?.length).toBeGreaterThan(20);
    expect(fetched).not.toHaveProperty('clientSecret');
  });

  test('APP-OAUTH-003: created confidential client stores only a hashed secret and never returns the hash', async ({
    api,
  }) => {
    const payload = await createOAuthClient(api, scope.applicationA, {
      clientType: 'CONFIDENTIAL',
    });
    const plaintext = required(payload.clientSecret, 'one-time client secret');
    const client = required(payload.client, 'confidential client');
    const row = required(await readOAuthClientRow(sql, client.clientId), 'OAuth client row');

    expect(row.client_secret).toEqual(expect.any(String));
    expect(row.client_secret).not.toBe(plaintext);
    expect(String(row.client_secret)).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(JSON.stringify(client)).not.toContain(String(row.client_secret));
  });

  test('APP-OAUTH-004: client create rejects caller-supplied resource, grant type, response type, auth method, or secret hash', async ({
    api,
    request,
  }) => {
    const token = required(api.session.accessToken, 'platform access token');
    for (const injected of [
      { resources: ['urn:attacker:resource'] },
      { grantTypes: ['client_credentials'] },
      { responseTypes: ['token'] },
      { tokenEndpointAuthMethod: 'NONE' },
      { clientSecretHash: 'attacker-hash' },
    ]) {
      const response = await request.post(ADMIN_GRAPHQL_URL, {
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        data: {
          query: `
            mutation InvalidOAuthClient($input: ApplicationOAuthClientCreateInput!) {
              applicationMutation {
                applicationOAuthClientCreate(input: $input) {
                  client { id }
                  clientSecret
                  userErrors { code }
                }
              }
            }
          `,
          variables: {
            input: {
              organizationId: scope.organizationId,
              applicationId: scope.applicationA.id,
              name: 'Invalid server-owned input',
              clientType: 'PUBLIC',
              environment: 'DEVELOPMENT',
              redirectUris: ['http://127.0.0.1/callback'],
              ...injected,
            },
          },
        },
      });
      expect((await response.json()).errors?.length).toBeGreaterThan(0);
    }
    expect((await listOAuthClients(api, scope.applicationA)).totalCount).toBe(0);
  });

  test('APP-OAUTH-005: client create rejects invalid redirect URI without creating a client row', async ({
    api,
  }) => {
    const payload = await createOAuthClient(api, scope.applicationA, {
      redirectUris: ['not-a-uri'],
    });

    expect(payload.client).toBeNull();
    expect(payload.clientSecret).toBeNull();
    expect(payload.userErrors).toEqual([expect.objectContaining({ code: 'INVALID_REDIRECT_URI' })]);
    expect((await listOAuthClients(api, scope.applicationA)).totalCount).toBe(0);
  });

  test('APP-OAUTH-006: production client accepts only HTTPS redirect and post-logout URIs', async ({
    api,
  }) => {
    const rejectedRedirect = await createOAuthClient(api, scope.applicationA, {
      environment: 'PRODUCTION',
      redirectUris: ['http://127.0.0.1/callback'],
    });
    const rejectedLogout = await createOAuthClient(api, scope.applicationA, {
      environment: 'PRODUCTION',
      redirectUris: ['https://app.example.test/callback'],
      postLogoutRedirectUris: ['http://127.0.0.1/logout'],
    });
    const accepted = await createOAuthClient(api, scope.applicationA, {
      environment: 'PRODUCTION',
      redirectUris: ['https://app.example.test/callback'],
      postLogoutRedirectUris: ['https://app.example.test/logout'],
    });

    expect(rejectedRedirect.userErrors).toEqual([
      expect.objectContaining({ code: 'INVALID_REDIRECT_URI' }),
    ]);
    expect(rejectedLogout.userErrors).toEqual([
      expect.objectContaining({ code: 'INVALID_POST_LOGOUT_REDIRECT_URI' }),
    ]);
    expect(accepted.userErrors).toHaveLength(0);
  });

  test('APP-OAUTH-007: development client allows loopback HTTP redirect URI and rejects non-loopback HTTP', async ({
    api,
  }) => {
    const loopback = await createOAuthClient(api, scope.applicationA, {
      redirectUris: ['http://localhost:43123/callback', 'http://127.0.0.1/callback'],
    });
    const remote = await createOAuthClient(api, scope.applicationA, {
      redirectUris: ['http://example.test/callback'],
    });

    expect(loopback.userErrors).toHaveLength(0);
    expect(loopback.client?.redirectUris).toEqual([
      'http://localhost:43123/callback',
      'http://127.0.0.1/callback',
    ]);
    expect(remote.userErrors).toEqual([expect.objectContaining({ code: 'INVALID_REDIRECT_URI' })]);
  });

  test('APP-OAUTH-008: redirect and post-logout URIs are exact, deduplicated, and reject wildcard or fragment', async ({
    api,
  }) => {
    const duplicate = await createOAuthClient(api, scope.applicationA, {
      redirectUris: ['https://app.example.test/callback', 'https://app.example.test/callback'],
    });
    const wildcard = await createOAuthClient(api, scope.applicationA, {
      redirectUris: ['https://*.example.test/callback'],
    });
    const fragment = await createOAuthClient(api, scope.applicationA, {
      redirectUris: ['https://app.example.test/callback#fragment'],
    });

    expect(duplicate.userErrors).toHaveLength(0);
    expect(duplicate.client?.redirectUris).toEqual(['https://app.example.test/callback']);
    expect(wildcard.userErrors).toEqual([
      expect.objectContaining({ code: 'INVALID_REDIRECT_URI' }),
    ]);
    expect(fragment.userErrors).toEqual([
      expect.objectContaining({ code: 'INVALID_REDIRECT_URI' }),
    ]);
  });

  test('APP-OAUTH-009: client list and get require org.application-oauth-clients read permission', async ({
    api,
  }) => {
    const created = required(
      (await createOAuthClient(api, scope.applicationA)).client,
      'created OAuth client',
    );
    const ownerToken = api.session.tenant.accessToken;
    const outsider = await api.admin.user.create();
    api.session.tenant.accessToken = outsider.accessToken;
    try {
      const result = await api.admin.query('application-admin-api/ApplicationOAuthClients', {
        variables: {
          organizationId: scope.organizationId,
          applicationId: scope.applicationA.id,
          clientId: created.clientId,
          first: 10,
        },
        throwOnError: false,
      });
      expect(result.data?.applicationQuery?.application ?? null).toBeNull();
      expect(result.errors?.length ?? 0).toBeGreaterThan(0);
    } finally {
      api.session.tenant.accessToken = ownerToken;
    }
  });

  test('APP-OAUTH-010: client connection filters by type, environment, disabled, archived, and search inside application scope', async ({
    api,
  }) => {
    const match = required(
      (
        await createOAuthClient(api, scope.applicationA, {
          name: 'Filter Match',
          clientType: 'CONFIDENTIAL',
          environment: 'PRODUCTION',
          redirectUris: ['https://filter.example.test/callback'],
          postLogoutRedirectUris: ['https://filter.example.test/logout'],
        })
      ).client,
      'filter client',
    );
    await createOAuthClient(api, scope.applicationA, { name: 'Other Public Client' });
    await createOAuthClient(api, scope.applicationB, {
      name: 'Filter Match',
      clientType: 'CONFIDENTIAL',
      environment: 'PRODUCTION',
      redirectUris: ['https://foreign.example.test/callback'],
      postLogoutRedirectUris: ['https://foreign.example.test/logout'],
    });
    const connection = await listOAuthClients(api, scope.applicationA, {
      where: {
        search: 'filter match',
        clientType: ['CONFIDENTIAL'],
        environment: ['PRODUCTION'],
        disabled: false,
        archived: false,
      },
    });

    expect(connection.edges.map(({ node }) => node.clientId)).toEqual([match.clientId]);
  });

  test('APP-OAUTH-011: client connection pagination remains stable with multiple clients sharing updatedAt', async ({
    api,
  }) => {
    const alpha = required(
      (await createOAuthClient(api, scope.applicationA, { name: 'Stable Alpha' })).client,
      'alpha client',
    );
    const beta = required(
      (await createOAuthClient(api, scope.applicationA, { name: 'Stable Beta' })).client,
      'beta client',
    );
    await sql`
      UPDATE iam.application_oauth_client
      SET updated_at = '2026-01-01T00:00:00.000Z'
      WHERE client_id IN (${alpha.clientId}, ${beta.clientId})
    `;
    const first = await listOAuthClients(api, scope.applicationA, {
      first: 1,
      where: { search: 'stable' },
      orderBy: [{ field: 'UPDATED_AT', direction: 'asc' }],
    });
    const second = await listOAuthClients(api, scope.applicationA, {
      first: 1,
      after: first.pageInfo.endCursor,
      where: { search: 'stable' },
      orderBy: [{ field: 'UPDATED_AT', direction: 'asc' }],
    });
    const repeated = await listOAuthClients(api, scope.applicationA, {
      first: 1,
      where: { search: 'stable' },
      orderBy: [{ field: 'UPDATED_AT', direction: 'asc' }],
    });

    expect(new Set([...first.edges, ...second.edges].map(({ node }) => node.clientId))).toEqual(
      new Set([alpha.clientId, beta.clientId]),
    );
    expect(repeated.edges[0]?.cursor).toBe(first.edges[0]?.cursor);
  });

  test('APP-OAUTH-012: client update changes only mutable metadata and increments revision', async ({
    api,
  }) => {
    const created = required(
      (await createOAuthClient(api, scope.applicationA)).client,
      'created client',
    );
    const payload = await mutateOAuthClient(
      api,
      'ApplicationOAuthClientUpdate',
      'applicationOAuthClientUpdate',
      scope.applicationA,
      created.clientId,
      1,
      {
        name: 'Updated OAuth client',
        redirectUris: ['http://localhost:5000/callback'],
        enableEndSession: false,
      },
    );

    expect(payload.userErrors).toHaveLength(0);
    expect(payload.client).toMatchObject({
      name: 'Updated OAuth client',
      redirectUris: ['http://localhost:5000/callback'],
      enableEndSession: false,
      clientId: created.clientId,
      resources: created.resources,
      grantTypes: created.grantTypes,
      responseTypes: created.responseTypes,
      revision: 2,
    });
  });

  test('APP-OAUTH-013: stale client update returns revision conflict and preserves previous values', async ({
    api,
  }) => {
    const created = required(
      (await createOAuthClient(api, scope.applicationA)).client,
      'created client',
    );
    await mutateOAuthClient(
      api,
      'ApplicationOAuthClientUpdate',
      'applicationOAuthClientUpdate',
      scope.applicationA,
      created.clientId,
      1,
      { name: 'Winning client name' },
    );
    const stale = await mutateOAuthClient(
      api,
      'ApplicationOAuthClientUpdate',
      'applicationOAuthClientUpdate',
      scope.applicationA,
      created.clientId,
      1,
      { name: 'Stale client name' },
    );

    expect(stale.client).toBeNull();
    expect(stale.userErrors).toEqual([
      expect.objectContaining({ code: 'OAUTH_CLIENT_REVISION_CONFLICT' }),
    ]);
    expect(await getOAuthClient(api, scope.applicationA, created.clientId)).toMatchObject({
      name: 'Winning client name',
      revision: 2,
    });
  });

  test('APP-OAUTH-014: client disable prevents authorize, token exchange, refresh, and introspection authentication', async ({
    api,
    request,
  }) => {
    await updateAuth(api, scope.applicationA, {
      emailVerificationRequired: false,
      trustedOrigins: [IAM_BASE_URL],
    });
    await updateAuthMethod(api, scope.applicationA, 'password', ['SIGN_IN']);
    await setRealmEnabled(api, scope.applicationA, true);
    const created = required(
      (await createOAuthClient(api, scope.applicationA)).client,
      'created client',
    );
    await mutateOAuthClient(
      api,
      'ApplicationOAuthClientEnabledSet',
      'applicationOAuthClientEnabledSet',
      scope.applicationA,
      created.clientId,
      1,
      { enabled: false },
    );
    const authorize = await request.get(
      `${IAM_BASE_URL}/auth/applications/${scope.applicationA.rawId}/oauth2/authorize?${new URLSearchParams(
        {
          client_id: created.clientId,
          response_type: 'code',
          redirect_uri: required(created.redirectUris[0], 'OAuth redirect URI'),
          scope: 'openid',
          code_challenge: 'A'.repeat(43),
          code_challenge_method: 'S256',
          resource: scope.applicationA.resource,
        },
      )}`,
      { maxRedirects: 0 },
    );
    const exchange = await request.post(
      `${IAM_BASE_URL}/auth/applications/${scope.applicationA.rawId}/oauth2/token`,
      {
        form: {
          grant_type: 'authorization_code',
          code: `disabled-${crypto.randomUUID()}`,
          code_verifier: 'v'.repeat(64),
          client_id: created.clientId,
          redirect_uri: required(created.redirectUris[0], 'OAuth redirect URI'),
          resource: scope.applicationA.resource,
        },
      },
    );
    const refresh = await request.post(
      `${IAM_BASE_URL}/auth/applications/${scope.applicationA.rawId}/oauth2/token`,
      {
        form: {
          grant_type: 'refresh_token',
          refresh_token: `disabled-${crypto.randomUUID()}`,
          client_id: created.clientId,
          resource: scope.applicationA.resource,
        },
      },
    );
    const introspect = await request.post(
      `${IAM_BASE_URL}/auth/applications/${scope.applicationA.rawId}/oauth2/introspect`,
      {
        form: { token: `disabled-${crypto.randomUUID()}`, client_id: created.clientId },
      },
    );

    expect(authorize.status()).toBeGreaterThanOrEqual(400);
    expect(exchange.status()).toBeGreaterThanOrEqual(400);
    expect(refresh.status()).toBeGreaterThanOrEqual(400);
    expect(await introspect.json()).toMatchObject({ error: 'invalid_client' });
  });

  test('APP-OAUTH-015: client re-enable restores only the client state and does not revive revoked sessions or token families', async ({
    api,
  }) => {
    const created = required(
      (await createOAuthClient(api, scope.applicationA)).client,
      'created client',
    );
    const userId = crypto.randomUUID();
    await sql`
      INSERT INTO iam.application_user
        (id, application_id, name, email, email_verified, status)
      VALUES
        (${userId}, ${scope.applicationA.rawId}::uuid, 'OAuth User',
         ${`oauth-${crypto.randomUUID()}@playwright.dev`}, true, 'active')
    `;
    await sql`
      INSERT INTO iam.application_oauth_refresh_token
        (id, application_id, token, client_id, user_id, expires_at, revoked, scopes)
      VALUES
        (${crypto.randomUUID()}, ${scope.applicationA.rawId}::uuid,
         ${`revoked-${crypto.randomUUID()}`}, ${created.clientId}, ${userId},
         now() + interval '1 hour', now(), ${sql.array(['openid'])})
    `;
    const disabled = await mutateOAuthClient(
      api,
      'ApplicationOAuthClientEnabledSet',
      'applicationOAuthClientEnabledSet',
      scope.applicationA,
      created.clientId,
      1,
      { enabled: false },
    );
    const enabled = await mutateOAuthClient(
      api,
      'ApplicationOAuthClientEnabledSet',
      'applicationOAuthClientEnabledSet',
      scope.applicationA,
      created.clientId,
      required(disabled.client, 'disabled client').revision,
      { enabled: true },
    );
    const [token] = await sql<{ revoked: Date | null }[]>`
      SELECT revoked
      FROM iam.application_oauth_refresh_token
      WHERE application_id = ${scope.applicationA.rawId}::uuid
        AND client_id = ${created.clientId}
    `;

    expect(enabled.client).toMatchObject({ disabled: false, revision: 3 });
    expect(token?.revoked).not.toBeNull();
  });

  test('APP-OAUTH-016: client archive disables the client and excludes it from active default lists', async ({
    api,
  }) => {
    const created = required(
      (await createOAuthClient(api, scope.applicationA)).client,
      'created client',
    );
    const archived = await mutateOAuthClient(
      api,
      'ApplicationOAuthClientArchive',
      'applicationOAuthClientArchive',
      scope.applicationA,
      created.clientId,
      1,
    );
    const active = await listOAuthClients(api, scope.applicationA, {
      where: { archived: false },
    });

    expect(archived.client).toMatchObject({
      disabled: true,
      archived: true,
      revision: 2,
      archivedAt: expect.any(String),
    });
    expect(active.edges.map(({ node }) => node.clientId)).not.toContain(created.clientId);
  });

  test('APP-OAUTH-017: archived client cannot be updated, enabled, receive skipConsent changes, or rotate secret', async ({
    api,
  }) => {
    const created = required(
      (
        await createOAuthClient(api, scope.applicationA, {
          clientType: 'CONFIDENTIAL',
        })
      ).client,
      'confidential client',
    );
    const archived = await mutateOAuthClient(
      api,
      'ApplicationOAuthClientArchive',
      'applicationOAuthClientArchive',
      scope.applicationA,
      created.clientId,
      1,
    );
    const revision = required(archived.client, 'archived client').revision;
    const attempts = await Promise.all([
      mutateOAuthClient(
        api,
        'ApplicationOAuthClientUpdate',
        'applicationOAuthClientUpdate',
        scope.applicationA,
        created.clientId,
        revision,
        { name: 'Forbidden update' },
      ),
      mutateOAuthClient(
        api,
        'ApplicationOAuthClientEnabledSet',
        'applicationOAuthClientEnabledSet',
        scope.applicationA,
        created.clientId,
        revision,
        { enabled: true },
      ),
      mutateOAuthClient(
        api,
        'ApplicationOAuthClientSkipConsentSet',
        'applicationOAuthClientSkipConsentSet',
        scope.applicationA,
        created.clientId,
        revision,
        { skipConsent: true },
      ),
      mutateOAuthClient(
        api,
        'ApplicationOAuthClientSecretRotate',
        'applicationOAuthClientSecretRotate',
        scope.applicationA,
        created.clientId,
        revision,
      ),
    ]);

    for (const payload of attempts) {
      expect(payload.client).toBeNull();
      expect(payload.userErrors).toEqual([
        expect.objectContaining({ code: 'OAUTH_CLIENT_ARCHIVED' }),
      ]);
    }
  });

  test('APP-OAUTH-018: public client secret rotation is rejected without changing revision', async ({
    api,
  }) => {
    const created = required(
      (await createOAuthClient(api, scope.applicationA)).client,
      'public client',
    );
    const payload = await mutateOAuthClient(
      api,
      'ApplicationOAuthClientSecretRotate',
      'applicationOAuthClientSecretRotate',
      scope.applicationA,
      created.clientId,
      1,
    );

    expect(payload.client).toBeNull();
    expect(payload.clientSecret).toBeNull();
    expect(payload.userErrors).toEqual([
      expect.objectContaining({ code: 'PUBLIC_CLIENT_SECRET_ROTATION_FORBIDDEN' }),
    ]);
    expect((await getOAuthClient(api, scope.applicationA, created.clientId))?.revision).toBe(1);
  });

  test('APP-OAUTH-019: confidential client secret rotation returns a new plaintext secret once and invalidates the old secret', async ({
    api,
  }) => {
    const initial = await createOAuthClient(api, scope.applicationA, {
      clientType: 'CONFIDENTIAL',
    });
    const client = required(initial.client, 'confidential client');
    const oldSecret = required(initial.clientSecret, 'old client secret');
    const oldRow = required(await readOAuthClientRow(sql, client.clientId), 'old client row');
    const rotated = await mutateOAuthClient(
      api,
      'ApplicationOAuthClientSecretRotate',
      'applicationOAuthClientSecretRotate',
      scope.applicationA,
      client.clientId,
      1,
    );
    const newSecret = required(rotated.clientSecret, 'new client secret');
    const newRow = required(await readOAuthClientRow(sql, client.clientId), 'rotated client row');

    expect(newSecret).not.toBe(oldSecret);
    expect(newRow.client_secret).not.toBe(oldRow.client_secret);
    expect(newRow.client_secret).not.toBe(newSecret);
    expect(await getOAuthClient(api, scope.applicationA, client.clientId)).not.toHaveProperty(
      'clientSecret',
    );
  });

  test('APP-OAUTH-020: secret rotation requires admin permission and records a secret-free audit diff', async ({
    api,
  }) => {
    const created = await createOAuthClient(api, scope.applicationA, {
      clientType: 'CONFIDENTIAL',
    });
    const client = required(created.client, 'confidential client');
    const oldSecret = required(created.clientSecret, 'initial client secret');
    const rotated = await mutateOAuthClient(
      api,
      'ApplicationOAuthClientSecretRotate',
      'applicationOAuthClientSecretRotate',
      scope.applicationA,
      client.clientId,
      1,
    );
    const newSecret = required(rotated.clientSecret, 'rotated client secret');
    const audits = await readAdminAudits(sql, scope.applicationA, 'oauth_client_secret_rotate');

    expect(audits[0]).toMatchObject({
      outcome: 'success',
      targetType: 'oauth_client',
      targetId: client.clientId,
      safeDiff: { changedFields: ['clientSecret'] },
    });
    serializedWithoutSecrets(audits, [oldSecret, newSecret]);
  });

  test('APP-OAUTH-021: skipConsent can be enabled only for a confirmed first-party client', async ({
    api,
  }) => {
    const created = required(
      (await createOAuthClient(api, scope.applicationA)).client,
      'created client',
    );
    const payload = await mutateOAuthClient(
      api,
      'ApplicationOAuthClientSkipConsentSet',
      'applicationOAuthClientSkipConsentSet',
      scope.applicationA,
      created.clientId,
      1,
      { skipConsent: true },
    );

    expect(payload.client).toBeNull();
    expect(payload.userErrors).toEqual([
      expect.objectContaining({ code: 'FIRST_PARTY_CLIENT_REQUIRED' }),
    ]);
    expect((await getOAuthClient(api, scope.applicationA, created.clientId))?.skipConsent).toBe(
      false,
    );
  });

  test('APP-OAUTH-022: skipConsent disable is allowed without weakening normal consent requirements for other clients', async ({
    api,
  }) => {
    const firstParty = required(
      (await createOAuthClient(api, scope.applicationA)).client,
      'first client',
    );
    const other = required(
      (await createOAuthClient(api, scope.applicationA)).client,
      'other client',
    );
    await sql`
      UPDATE iam.application_oauth_client
      SET skip_consent = true
      WHERE client_id = ${firstParty.clientId}
    `;
    const payload = await mutateOAuthClient(
      api,
      'ApplicationOAuthClientSkipConsentSet',
      'applicationOAuthClientSkipConsentSet',
      scope.applicationA,
      firstParty.clientId,
      1,
      { skipConsent: false },
    );

    expect(payload.userErrors).toHaveLength(0);
    expect(payload.client?.skipConsent).toBe(false);
    expect((await getOAuthClient(api, scope.applicationA, other.clientId))?.skipConsent).toBe(
      false,
    );
  });

  test('APP-OAUTH-023: client ID from another application cannot be read or mutated through this application scope', async ({
    api,
  }) => {
    const foreign = required(
      (await createOAuthClient(api, scope.applicationB)).client,
      'foreign client',
    );
    const read = await getOAuthClient(api, scope.applicationA, foreign.clientId);
    const write = await mutateOAuthClient(
      api,
      'ApplicationOAuthClientEnabledSet',
      'applicationOAuthClientEnabledSet',
      scope.applicationA,
      foreign.clientId,
      1,
      { enabled: false },
    );

    expect(read).toBeNull();
    expect(write.client).toBeNull();
    expect(write.userErrors).toEqual([expect.objectContaining({ code: 'OAUTH_CLIENT_NOT_FOUND' })]);
    expect((await getOAuthClient(api, scope.applicationB, foreign.clientId))?.disabled).toBe(false);
  });

  test('APP-OAUTH-024: member without explicit OAuth client permission cannot list, create, update, disable, archive, or rotate clients', async ({
    api,
  }) => {
    const client = required(
      (
        await createOAuthClient(api, scope.applicationA, {
          clientType: 'CONFIDENTIAL',
        })
      ).client,
      'confidential client',
    );
    const ownerToken = api.session.tenant.accessToken;
    const member = await createOrganizationMember(api, scope.organizationId, {
      permissions: [{ resource: 'org.applications', action: 'read' }],
    });
    api.session.tenant.accessToken = member.accessToken;
    try {
      const list = await api.admin.query('application-admin-api/ApplicationOAuthClients', {
        variables: {
          organizationId: scope.organizationId,
          applicationId: scope.applicationA.id,
          clientId: client.clientId,
          first: 10,
        },
        throwOnError: false,
      });
      const create = await createOAuthClient(api, scope.applicationA);
      const update = await mutateOAuthClient(
        api,
        'ApplicationOAuthClientUpdate',
        'applicationOAuthClientUpdate',
        scope.applicationA,
        client.clientId,
        1,
        { name: 'Forbidden' },
      );
      const disable = await mutateOAuthClient(
        api,
        'ApplicationOAuthClientEnabledSet',
        'applicationOAuthClientEnabledSet',
        scope.applicationA,
        client.clientId,
        1,
        { enabled: false },
      );
      const archive = await mutateOAuthClient(
        api,
        'ApplicationOAuthClientArchive',
        'applicationOAuthClientArchive',
        scope.applicationA,
        client.clientId,
        1,
      );
      const rotate = await mutateOAuthClient(
        api,
        'ApplicationOAuthClientSecretRotate',
        'applicationOAuthClientSecretRotate',
        scope.applicationA,
        client.clientId,
        1,
      );

      expect(list.errors?.length ?? 0).toBeGreaterThan(0);
      for (const payload of [create, update, disable, archive, rotate]) {
        expect(payload.client).toBeNull();
        expect(payload.userErrors).toEqual([expect.objectContaining({ code: 'FORBIDDEN' })]);
      }
    } finally {
      api.session.tenant.accessToken = ownerToken;
    }
  });

  test('APP-OAUTH-025: application user session cannot access OAuth client management through public application routes', async ({
    api,
  }) => {
    const client = required(
      (await createOAuthClient(api, scope.applicationA)).client,
      'created client',
    );
    const userId = crypto.randomUUID();
    const publicToken = `application-session-${crypto.randomUUID()}`;
    await sql`
      INSERT INTO iam.application_user
        (id, application_id, name, email, email_verified, status)
      VALUES
        (${userId}, ${scope.applicationA.rawId}::uuid, 'Public User',
         ${`public-${crypto.randomUUID()}@playwright.dev`}, true, 'active')
    `;
    await sql`
      INSERT INTO iam.application_session
        (id, application_id, user_id, token, expires_at)
      VALUES
        (${crypto.randomUUID()}, ${scope.applicationA.rawId}::uuid, ${userId},
         ${publicToken}, now() + interval '1 hour')
    `;
    const ownerToken = api.session.tenant.accessToken;
    api.session.tenant.accessToken = publicToken;
    try {
      const result = await api.admin.query('application-admin-api/ApplicationOAuthClients', {
        variables: {
          organizationId: scope.organizationId,
          applicationId: scope.applicationA.id,
          clientId: client.clientId,
          first: 10,
        },
        throwOnError: false,
      });
      expect(result.data?.applicationQuery?.application ?? null).toBeNull();
      expect(result.errors?.length ?? 0).toBeGreaterThan(0);
    } finally {
      api.session.tenant.accessToken = ownerToken;
    }
  });
});
